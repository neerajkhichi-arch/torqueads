"""② Nightly audience sync: Torque cohort -> Google Customer Match list + Meta Custom Audience.

    python audience_sync.py suv_15_20l ev_10_20l      # sync specific cohorts
    python audience_sync.py --all                     # every cohort in cohort_membership

Only users who (a) are in the cohort within the lookback window, (b) gave off-site consent
and (c) have a hashed email or phone are sent. Each run uploads only the difference from
the previous run, so opt-outs and users who left the cohort are removed within a day.
"""
import sys
from datetime import datetime, timedelta

import db
from config import COHORT_LOOKBACK_DAYS, GOOGLE_AUDIENCE_SOURCE, MIN_MATCHABLE_USERS
from destinations import google_ads, google_dm, meta

# Google uses GA4 audiences by default (ga4_audiences.py); Customer Match upload is opt-in.
PLATFORMS = ("google", "meta") if GOOGLE_AUDIENCE_SOURCE == "customer_match" else ("meta",)

MEMBERS_SQL = """
SELECT DISTINCT i.user_id, i.email_sha256, i.phone_sha256, i.phone_meta_sha256
FROM cohort_membership cm
JOIN identity i ON i.user_id = cm.user_id
JOIN consent  c ON c.user_id = cm.user_id
WHERE cm.cohort_id = ?
  AND cm.last_seen >= ?
  AND c.offsite_personalisation = 1
  AND (i.email_sha256 IS NOT NULL OR i.phone_sha256 IS NOT NULL)
"""


def member_key(m):
    return f"{m['email_sha256'] or ''}|{m['phone_sha256'] or ''}"


def current_members(conn, cohort_id):
    since = (datetime.utcnow() - timedelta(days=COHORT_LOOKBACK_DAYS)).isoformat(" ")
    return [dict(r) for r in conn.execute(MEMBERS_SQL, (cohort_id, since))]


def ensure_destination(conn, cohort_id, platform):
    row = conn.execute("SELECT * FROM platform_audience_map WHERE cohort_id=? AND platform=?",
                       (cohort_id, platform)).fetchone()
    if row and row["platform_audience_id"]:
        return row["platform_audience_id"]
    desc = f"Torque first-party cohort {cohort_id}; consented users only; managed by Torque"
    aud_id = google_ads.create_user_list(cohort_id, desc) if platform == "google" else meta.create_audience(cohort_id, desc)
    acct = google_ads.cid() if platform == "google" else meta.ACT
    conn.execute("""INSERT INTO platform_audience_map (cohort_id, platform, platform_account_id, platform_audience_id, status)
                    VALUES (?,?,?,?, 'syncing')
                    ON CONFLICT(cohort_id, platform) DO UPDATE SET platform_audience_id=excluded.platform_audience_id""",
                 (cohort_id, platform, acct, aud_id))
    conn.commit()
    return aud_id


def sync_cohort(conn, cohort_id):
    members = current_members(conn, cohort_id)
    print(f"\n● {cohort_id}: {len(members):,} consented users with a hashed email/phone")
    if len(members) < MIN_MATCHABLE_USERS:
        print(f"  skipped — below the {MIN_MATCHABLE_USERS:,}-user minimum for off-site activation")
        for p in PLATFORMS:
            conn.execute("""INSERT INTO platform_audience_map (cohort_id, platform, platform_account_id, status)
                            VALUES (?,?,'-','too_small') ON CONFLICT(cohort_id, platform) DO UPDATE SET status='too_small'""",
                         (cohort_id, p))
        conn.commit()
        return
    now_keys = {member_key(m): m for m in members}
    for platform in PLATFORMS:
        aud_id = ensure_destination(conn, cohort_id, platform)
        prev = {r["member_key"] for r in conn.execute(
            "SELECT member_key FROM sync_snapshot WHERE cohort_id=? AND platform=?", (cohort_id, platform))}
        adds = [now_keys[k] for k in now_keys.keys() - prev]
        removes = [dict(zip(("email_sha256", "phone_sha256"), k.split("|"))) for k in prev - now_keys.keys()]
        for r in removes:  # restore None and the Meta phone key for removal rows
            r["email_sha256"] = r["email_sha256"] or None
            r["phone_sha256"] = r["phone_sha256"] or None
            r["phone_meta_sha256"] = conn.execute("SELECT phone_meta_sha256 FROM identity WHERE phone_sha256=?",
                                                  (r["phone_sha256"],)).fetchone()[0] if r["phone_sha256"] else None
        print(f"  {platform}: +{len(adds):,} / -{len(removes):,} → audience {aud_id}")
        dest = google_dm if platform == "google" else meta
        if adds:
            dest.add_members(aud_id, adds)
        if removes:
            dest.remove_members(aud_id, removes)
        # snapshot what the platform now holds
        conn.execute("DELETE FROM sync_snapshot WHERE cohort_id=? AND platform=?", (cohort_id, platform))
        conn.executemany("INSERT INTO sync_snapshot VALUES (?,?,?)", [(cohort_id, platform, k) for k in now_keys])
        conn.execute("""UPDATE platform_audience_map SET uploaded_count=?, status='ready', last_synced_at=?
                        WHERE cohort_id=? AND platform=?""", (len(now_keys), datetime.utcnow().isoformat(" "), cohort_id, platform))
        conn.execute("INSERT INTO sync_log (cohort_id, platform, added, removed, status, created_at) VALUES (?,?,?,?,?,?)",
                     (cohort_id, platform, len(adds), len(removes), "ok", datetime.utcnow().isoformat(" ")))
        conn.commit()


def main(args):
    conn = db.connect()
    db.init(conn)
    cohorts = ([r[0] for r in conn.execute("SELECT DISTINCT cohort_id FROM cohort_membership")]
               if args == ["--all"] else args)
    for c in cohorts:
        sync_cohort(conn, c)


if __name__ == "__main__":
    main(sys.argv[1:] or ["--all"])

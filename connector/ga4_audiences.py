"""②b Find-or-create GA4 audiences for Torque cohorts, and track when they're ready on YouTube.

    python ga4_audiences.py ensure car.suv.10_20l.price.30d   # what the wizard calls when a cohort is picked
    python ga4_audiences.py prebuild                          # keep the popular cohorts warm
    python ga4_audiences.py refresh                           # hourly: link + size check -> status
    python ga4_audiences.py archive-stale                     # nightly: free GA4 slots
    python ga4_audiences.py status

Status of each (cohort, site):
  creating → linking (made in GA4, not yet visible in Google Ads)
           → filling (visible, under the YouTube minimum) → ready
"""
import sys
from datetime import datetime, timedelta

import cohorts
import db
from config import (GA4_ARCHIVE_AFTER_DAYS, GA4_AUDIENCE_HEADROOM, GA4_AUDIENCE_LIMIT, YOUTUBE_MIN_LIST_SIZE)
from destinations import ga4, google_ads


def _now():
    return datetime.utcnow().isoformat(" ", "seconds")


def ensure(conn, cohort_key):
    """Idempotent: returns registry rows for every site of the cohort, creating missing GA4 audiences."""
    c = cohorts.parse(cohort_key)
    key = c["key"]
    rows = []
    for site in cohorts.sites_for(c):
        row = conn.execute("SELECT * FROM ga4_audience WHERE cohort_key=? AND site=?", (key, site)).fetchone()
        if row and row["status"] != "archived":
            conn.execute("UPDATE ga4_audience SET last_used_at=? WHERE cohort_key=? AND site=?", (_now(), key, site))
            rows.append(dict(row)); continue
        prop = cohorts.SITE_RULES[site]["property_id"]
        try:
            _make_room(conn, prop)
            name = ga4.create_audience(prop, ga4.build_audience(key, site))
            status, detail = "linking", None
        except Exception as e:     # keep going for other sites; surface the reason in the wizard
            name, status, detail = None, "error", str(e)[:400]
        conn.execute("""INSERT INTO ga4_audience (cohort_key, site, property_id, ga4_name, display_name, status, detail,
                        created_at, last_used_at) VALUES (?,?,?,?,?,?,?,?,?)
                        ON CONFLICT(cohort_key, site) DO UPDATE SET ga4_name=excluded.ga4_name, status=excluded.status,
                        detail=excluded.detail, created_at=excluded.created_at, last_used_at=excluded.last_used_at,
                        ads_user_list_id=NULL, size_display=NULL""",
                     (key, site, prop, name, ga4.display_name(key), status, detail, _now(), _now()))
        print(f"  {key} @ {site}: {'created ' + name if name else 'ERROR ' + detail}")
        rows.append(dict(conn.execute("SELECT * FROM ga4_audience WHERE cohort_key=? AND site=?", (key, site)).fetchone()))
    conn.commit()
    return rows


def _make_room(conn, property_id):
    """Archive Torque's least-recently-used audiences if the property is near its audience cap."""
    existing = ga4.list_audiences(property_id)
    if len(existing) < GA4_AUDIENCE_LIMIT - GA4_AUDIENCE_HEADROOM:
        return
    stale = conn.execute("""SELECT * FROM ga4_audience WHERE property_id=? AND status!='archived'
                            ORDER BY COALESCE(last_used_at, created_at) LIMIT 5""", (property_id,)).fetchall()
    if not stale:
        raise RuntimeError(f"GA4 property {property_id} is at its audience limit and Torque has none to archive")
    for r in stale:
        _archive(conn, r)


def _archive(conn, r):
    if r["ga4_name"]:
        ga4.archive_audience(r["ga4_name"])
    conn.execute("UPDATE ga4_audience SET status='archived' WHERE cohort_key=? AND site=?", (r["cohort_key"], r["site"]))
    print(f"  archived {r['cohort_key']} @ {r['site']}")


def refresh(conn):
    """Look each audience up in Google Ads: has the GA4 link shared it, and is it big enough for YouTube?"""
    for r in conn.execute("SELECT * FROM ga4_audience WHERE status IN ('linking','filling','ready')").fetchall():
        ul, size = google_ads.find_user_list(r["display_name"])
        status = "linking" if not ul else ("ready" if (size or 0) >= YOUTUBE_MIN_LIST_SIZE else "filling")
        conn.execute("UPDATE ga4_audience SET ads_user_list_id=?, size_display=?, status=? WHERE cohort_key=? AND site=?",
                     (ul, size, status, r["cohort_key"], r["site"]))
    conn.commit()


def archive_stale(conn):
    cutoff = (datetime.utcnow() - timedelta(days=GA4_ARCHIVE_AFTER_DAYS)).isoformat(" ")
    prebuilt = {cohorts.parse(k)["key"] for k in cohorts.PREBUILD}
    live = {r[0] for r in conn.execute("""SELECT DISTINCT cohort_id FROM line_item
                                          WHERE channel='youtube' AND status IN ('in_review','launched','live','paused')""")}
    live = {cohorts.parse(k)["key"] for k in live}
    for r in conn.execute("SELECT * FROM ga4_audience WHERE status!='archived' AND COALESCE(last_used_at, created_at) < ?",
                          (cutoff,)).fetchall():
        if r["cohort_key"] not in prebuilt | live:
            _archive(conn, r)
    conn.commit()


def ready_lists(conn, cohort_key):
    """User list ids a YouTube campaign can target now, plus a readable reason if none are ready."""
    rows = ensure(conn, cohort_key)
    refresh(conn)
    rows = [dict(conn.execute("SELECT * FROM ga4_audience WHERE cohort_key=? AND site=?",
                              (r["cohort_key"], r["site"])).fetchone()) for r in rows]
    ready = [r["ads_user_list_id"] for r in rows if r["status"] == "ready"]
    why = "; ".join(f"{r['site']}: {r['status']}" + (f" ({r['size_display']:,} users)" if r["size_display"] else "")
                    for r in rows if r["status"] != "ready")
    return ready, why


def status(conn):
    for r in conn.execute("SELECT cohort_key, site, status, size_display, ads_user_list_id FROM ga4_audience ORDER BY 1,2"):
        size = f"{r['size_display']:,}" if r["size_display"] else "-"
        print(f"  {r['cohort_key']:<28} {r['site']:<15} {r['status']:<9} size {size:>8}  list {r['ads_user_list_id'] or '-'}")


if __name__ == "__main__":
    conn = db.connect(); db.init(conn)
    cmd, *args = sys.argv[1:] or ["status"]
    if cmd == "ensure":
        for k in args:
            ensure(conn, k)
    elif cmd == "prebuild":
        for k in cohorts.PREBUILD:
            ensure(conn, k)
    elif cmd == "refresh":
        refresh(conn)
    elif cmd == "archive-stale":
        archive_stale(conn)
    status(conn)

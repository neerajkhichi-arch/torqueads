"""③ Launch a Torque line item on YouTube (Demand Gen) or Meta, targeting the synced cohort.

    python launcher.py C-1041-youtube
    python launcher.py C-1041-meta --activate     # create and switch on in one go

Everything is created PAUSED first; `--activate` (or monitor.py after Torque-side checks)
turns it on. The platform IDs are stored in line_item_external so monitor.py can find them.
"""
import sys

import db
from config import MGMT_FEE
from destinations import google_ads, meta


def media_budget(li):
    """Advertiser budget includes Torque's fee; the platform gets the media part only."""
    return float(li["budget_total"]) / (1 + MGMT_FEE)


def launch(conn, line_item_id, activate=False):
    li = conn.execute("SELECT * FROM line_item WHERE line_item_id=?", (line_item_id,)).fetchone()
    if not li:
        raise SystemExit(f"No line item {line_item_id}")
    li = dict(li)
    platform = "google" if li["channel"] == "youtube" else "meta"
    m = conn.execute("SELECT * FROM platform_audience_map WHERE cohort_id=? AND platform=?",
                     (li["cohort_id"], platform)).fetchone()
    if not m or m["status"] != "ready":
        raise SystemExit(f"Cohort {li['cohort_id']} isn't synced to {platform} yet "
                         f"(status: {m['status'] if m else 'missing'}). Run audience_sync.py first — "
                         "matching takes a few hours on Google and up to ~24 h on Meta.")
    budget = media_budget(li)
    print(f"\n▶ Launching {line_item_id} on {li['channel']} · cohort {li['cohort_id']} → audience {m['platform_audience_id']}"
          f" · media budget ₹{budget:,.0f} (of ₹{float(li['budget_total']):,.0f})")
    if li["channel"] == "youtube":
        if not li["youtube_video_id"]:
            raise SystemExit("YouTube needs the video uploaded to the Torque channel first (youtube_video_id).")
        ids = google_ads.launch(li, m["platform_audience_id"], budget)
    else:
        ids = meta.launch(li, m["platform_audience_id"], budget)
    conn.executemany("INSERT OR REPLACE INTO line_item_external VALUES (?,?,?,?)",
                     [(line_item_id, platform, k, v) for k, v in ids.items()])
    conn.execute("UPDATE line_item SET status='in_review' WHERE line_item_id=?", (line_item_id,))
    conn.commit()
    if activate:
        if platform == "google":
            google_ads.set_campaign_status(ids["campaign"], "ENABLED")
        else:
            for obj in ("campaign", "ad_set", "ad"):
                meta.set_status(ids[obj], "ACTIVE")
        conn.execute("UPDATE line_item SET status='launched' WHERE line_item_id=?", (line_item_id,))
        conn.commit()
    print(f"  saved platform IDs: {ids}")
    return ids


if __name__ == "__main__":
    conn = db.connect(); db.init(conn)
    launch(conn, sys.argv[1], activate="--activate" in sys.argv)

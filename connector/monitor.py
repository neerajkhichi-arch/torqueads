"""④ Hourly sync back: review status, spend, results, and the budget guard.

    python monitor.py            # all launched line items, today's date

- Writes daily stats into line_item_stats (Torque reports read from here).
- Pauses the platform campaign once Torque-side spend reaches the line item's media budget,
  so Torque's budget rules hold off-site too.
"""
from datetime import date

import db
from destinations import google_ads, meta
from launcher import media_budget


def run(conn, day=None):
    day = day or date.today().isoformat()
    items = conn.execute("SELECT * FROM line_item WHERE status IN ('in_review','launched','live')").fetchall()
    for li in items:
        li = dict(li)
        ext = {r["object_type"]: r["external_id"] for r in conn.execute(
            "SELECT object_type, external_id FROM line_item_external WHERE line_item_id=?", (li["line_item_id"],))}
        print(f"\n◆ {li['line_item_id']} ({li['channel']})")
        if li["channel"] == "youtube":
            s = google_ads.stats(ext["campaign"], day)
            row = (s.get("impressions"), s.get("views"), s.get("clicks"), s.get("conversions"), s.get("spend"), s.get("review"))
        else:
            review = meta.ad_review_status(ext["ad"])
            s = meta.insights(ext["campaign"], day)
            row = (int(s.get("impressions", 0) or 0), None, int(s.get("clicks", 0) or 0), None, float(s.get("spend", 0) or 0), review)
        conn.execute("INSERT OR REPLACE INTO line_item_stats VALUES (?,?,?,?,?,?,?,?)", (li["line_item_id"], day, *row))
        spent = conn.execute("SELECT COALESCE(SUM(spend),0) FROM line_item_stats WHERE line_item_id=?",
                             (li["line_item_id"],)).fetchone()[0]
        cap = media_budget(li)
        print(f"  spend to date ₹{spent:,.0f} of ₹{cap:,.0f} media budget")
        if spent >= cap:
            print("  budget reached → pausing on platform")
            if li["channel"] == "youtube":
                google_ads.set_campaign_status(ext["campaign"], "PAUSED")
            else:
                meta.set_status(ext["campaign"], "PAUSED")
            conn.execute("UPDATE line_item SET status='done' WHERE line_item_id=?", (li["line_item_id"],))
        conn.commit()


if __name__ == "__main__":
    conn = db.connect(); db.init(conn); run(conn)

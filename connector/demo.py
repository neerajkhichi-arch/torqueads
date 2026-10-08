"""End-to-end demo with synthetic users, no credentials needed (DRY_RUN=1).

    python demo.py

Day 1: builds identities + consent + cohorts, syncs audiences, launches YouTube and Meta.
Day 2: some users opt out / leave the cohort -> the sync sends only removals and new joiners.
Then the monitor reads results back.
"""
import os
import random
from datetime import datetime, timedelta

import tempfile

os.environ.setdefault("DRY_RUN", "1")
_DB = os.path.join(tempfile.gettempdir(), "torque_connector_demo.db")   # scratch DB outside the project
if os.path.exists(_DB):
    os.remove(_DB)
os.environ.setdefault("DATABASE_URL", f"sqlite:///{_DB}")

import audience_sync
import db
import ga4_audiences
import launcher
import monitor
from hashing import hash_email, hash_phone, hash_phone_meta

rnd = random.Random(7)
conn = db.connect(); db.init(conn)
now = datetime.utcnow()

print("① Building identity + consent for 60,000 synthetic users (emails/phones are fake, hashed immediately)")
ids, cons, members = [], [], []
for n in range(60000):
    uid = f"u{n:06d}"
    email = f"user{n}@example.com" if rnd.random() < 0.55 else None
    phone = f"9{rnd.randint(100000000, 999999999)}" if rnd.random() < 0.8 else None
    ids.append((uid, hash_email(email), hash_phone(phone), hash_phone_meta(phone), "lead" if phone else "login", now.isoformat(" ")))
    cons.append((uid, 1, 1 if rnd.random() < 0.58 else 0, now.isoformat(" ")))
    r = rnd.random()
    if r < 0.45:
        members.append(("suv_15_20l", uid, (now - timedelta(days=rnd.randint(0, 25))).isoformat(" ")))
    if 0.40 < r < 0.62:
        members.append(("ev_10_20l", uid, (now - timedelta(days=rnd.randint(0, 25))).isoformat(" ")))
    if r > 0.985:
        members.append(("luxury_50l_plus", uid, now.isoformat(" ")))
conn.executemany("INSERT INTO identity (user_id,email_sha256,phone_sha256,phone_meta_sha256,source,updated_at) VALUES (?,?,?,?,?,?)", ids)
conn.executemany("INSERT INTO consent VALUES (?,?,?,?)", cons)
conn.executemany("INSERT INTO cohort_membership VALUES (?,?,?)", members)
conn.commit()

print("\n② DAY 1 — nightly audience sync (Meta: hashed upload)")
audience_sync.main(["--all"])

print("\n②b Google: Torque keeps popular cohorts warm as GA4 audiences (no upload — the GA4 link shares them)")
ga4_audiences.ensure(conn, "car.suv.10_20l.any.30d")
ga4_audiences.ensure(conn, "car.ev.any.any.30d")
print("   …an advertiser then picks a cohort nobody has used before → created on the spot:")
ga4_audiences.ensure(conn, "car.suv.10_20l.price.30d")
ga4_audiences.refresh(conn)
ga4_audiences.status(conn)

print("\n③ Advertiser launches 'Apex Terrain SUV' on YouTube + Meta")
start = now.date().isoformat(); end = (now.date() + timedelta(days=29)).isoformat()
conn.executemany("""INSERT INTO line_item (line_item_id,campaign_id,channel,cohort_id,name,objective,budget_total,start_date,end_date,
                     landing_url,headline,description,cta,youtube_video_id,image_url) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""", [
    ("C-1041-youtube", "C-1041", "youtube", "suv_15_20l", "Apex Terrain SUV — Launch", "awareness", 350000, start, end,
     "https://example.com/terrain", "The Terrain. Built for every road.", "Ex-showroom from ₹21.9L*", "BOOK_NOW", "dQw4w9WgXcQ", None),
    ("C-1041-meta", "C-1041", "meta", "suv_15_20l", "Apex Terrain SUV — Launch", "traffic", 200000, start, end,
     "https://example.com/terrain", "The Terrain. Built for every road.", "Book a test drive at your nearest dealer.", "LEARN_MORE", None,
     "https://example.com/terrain.jpg"),
])
conn.commit()
launcher.launch(conn, "C-1041-youtube", activate=True)
launcher.launch(conn, "C-1041-meta", activate=True)

print("\n② DAY 2 — 1,500 users withdraw off-site consent, 800 new users join the SUV cohort")
optouts = rnd.sample([m[1] for m in members if m[0] == "suv_15_20l"], 1500)
conn.executemany("UPDATE consent SET offsite_personalisation=0 WHERE user_id=?", [(u,) for u in optouts])
joined = [u for (u, *_ ) in ids if rnd.random() < 0.03][:800]
conn.executemany("INSERT OR IGNORE INTO cohort_membership VALUES ('suv_15_20l',?,?)", [(u, now.isoformat(" ")) for u in joined])
conn.executemany("UPDATE consent SET offsite_personalisation=1 WHERE user_id=?", [(u,) for u in joined])
conn.commit()
audience_sync.main(["suv_15_20l"])

print("\n④ Hourly monitor — review status, spend, budget guard")
monitor.run(conn)

print("\nplatform_audience_map (the table that connects the dots):")
for r in conn.execute("SELECT cohort_id, platform, platform_audience_id, uploaded_count, status FROM platform_audience_map ORDER BY 1,2"):
    print("  ", dict(r))
print("\nline_item_external (platform IDs Torque keeps per line item):")
for r in conn.execute("SELECT * FROM line_item_external ORDER BY 1,2,3"):
    print("  ", dict(r))

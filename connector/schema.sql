-- Torque connector schema (Postgres; the demo runs the same tables on SQLite)

-- ① IDENTITY: who a browser/user is, joined from logins, leads, OTP
CREATE TABLE IF NOT EXISTS identity (
  user_id        TEXT PRIMARY KEY,          -- Torque internal user id
  email_sha256   TEXT,                      -- normalised + SHA-256, never raw
  phone_sha256   TEXT,                      -- E.164 (+91...) + SHA-256  (Google format)
  phone_meta_sha256 TEXT,                   -- 91XXXXXXXXXX + SHA-256     (Meta format)
  source         TEXT,                      -- login | lead | otp | app
  updated_at     TIMESTAMP NOT NULL
);

-- consent captured by the CMP; offsite is its own purpose
CREATE TABLE IF NOT EXISTS consent (
  user_id        TEXT PRIMARY KEY REFERENCES identity(user_id),
  onsite_personalisation  BOOLEAN NOT NULL DEFAULT FALSE,
  offsite_personalisation BOOLEAN NOT NULL DEFAULT FALSE,   -- "ads on other platforms"
  updated_at     TIMESTAMP NOT NULL
);

-- output of the audience engine (one row per user per cohort)
CREATE TABLE IF NOT EXISTS cohort_membership (
  cohort_id      TEXT NOT NULL,             -- e.g. suv_15_20l
  user_id        TEXT NOT NULL,
  last_seen      TIMESTAMP NOT NULL,
  PRIMARY KEY (cohort_id, user_id)
);

-- ② AUDIENCE SYNC: the table that connects the two dots
CREATE TABLE IF NOT EXISTS platform_audience_map (
  cohort_id            TEXT NOT NULL,
  platform             TEXT NOT NULL,       -- google | meta
  platform_account_id  TEXT NOT NULL,       -- Google Ads customer id / Meta act id
  platform_audience_id TEXT,                -- Google user list id / Meta custom audience id
  uploaded_count       INTEGER DEFAULT 0,
  matched_count        INTEGER,             -- read back from the platform
  status               TEXT DEFAULT 'new',  -- new | syncing | ready | too_small | error
  last_synced_at       TIMESTAMP,
  PRIMARY KEY (cohort_id, platform)
);

-- what we sent last time, so each night only adds/removes are uploaded
CREATE TABLE IF NOT EXISTS sync_snapshot (
  cohort_id      TEXT NOT NULL,
  platform       TEXT NOT NULL,
  member_key     TEXT NOT NULL,             -- email_sha256|phone_sha256
  PRIMARY KEY (cohort_id, platform, member_key)
);

CREATE TABLE IF NOT EXISTS sync_log (
  id             INTEGER PRIMARY KEY,
  cohort_id TEXT, platform TEXT, added INTEGER, removed INTEGER, status TEXT, detail TEXT,
  created_at     TIMESTAMP NOT NULL
);

-- ③ CAMPAIGN LAUNCH: one line item per channel of a Torque campaign
CREATE TABLE IF NOT EXISTS line_item (
  line_item_id   TEXT PRIMARY KEY,          -- e.g. C-1041-youtube
  campaign_id    TEXT NOT NULL,             -- Torque campaign id
  channel        TEXT NOT NULL,             -- youtube | meta
  cohort_id      TEXT NOT NULL,
  name           TEXT NOT NULL,
  objective      TEXT NOT NULL,             -- awareness | traffic | leads
  budget_total   NUMERIC NOT NULL,          -- INR
  start_date     DATE NOT NULL,
  end_date       DATE NOT NULL,
  geo            TEXT DEFAULT 'IN',
  landing_url    TEXT NOT NULL,
  headline       TEXT, description TEXT, cta TEXT,
  youtube_video_id TEXT,                    -- video must already be on YouTube (Torque channel, unlisted)
  image_url      TEXT,                      -- for Meta image ads
  status         TEXT DEFAULT 'draft'       -- draft | launched | in_review | live | paused | done | error
);

-- IDs the platforms gave us, so reporting and budget control can find them
CREATE TABLE IF NOT EXISTS line_item_external (
  line_item_id   TEXT NOT NULL REFERENCES line_item(line_item_id),
  platform       TEXT NOT NULL,
  object_type    TEXT NOT NULL,             -- campaign | ad_group | ad_set | ad | creative | budget | asset
  external_id    TEXT NOT NULL,
  PRIMARY KEY (line_item_id, object_type)
);

-- ④ SYNC BACK: hourly platform results
CREATE TABLE IF NOT EXISTS line_item_stats (
  line_item_id   TEXT NOT NULL,
  stat_date      DATE NOT NULL,
  impressions    INTEGER, views INTEGER, clicks INTEGER, conversions NUMERIC, spend NUMERIC,
  review_status  TEXT,
  PRIMARY KEY (line_item_id, stat_date)
);

# Torque connector: Torque cohorts → live campaigns on YouTube and Meta

This service connects the two halves: **our audience base** (cohorts built on CarDekho / BikeDekho / ZigWheels) and **a campaign created in Torque**, which goes live on YouTube (Google Demand Gen) and Meta (Facebook / Instagram).

```
① identity + consent ─► ② audience_sync.py ─► platform_audience_map ─► ③ launcher.py ─► ④ monitor.py
  (who is who,           (nightly: hashed,       (cohort → Google list   (Demand Gen / Meta   (hourly: review,
   who opted in)          consented, diff only)   id / Meta audience id)  campaign → ad set)   spend, budget stop)
```

| Step | File | Platform APIs |
|---|---|---|
| ① Identity join | `schema.sql` (`identity`, `consent`, `cohort_membership`) | none, internal |
| ② Audience sync | `audience_sync.py` | Google **Data Manager API** `audienceMembers:ingest` / `:remove` · Meta **Marketing API** `/{audience_id}/users` |
| ③ Launch | `launcher.py` | Google **Ads API**: Demand Gen campaign, ad group targeting the list, video ad · Meta **Marketing API**: campaign → ad set (`custom_audiences`) → creative → ad |
| ④ Sync back | `monitor.py` | Google Ads API reporting · Meta Insights API |

## Try it now (no credentials needed)

```bash
cd connector
python3 demo.py
```

The demo creates 60,000 synthetic users. Their emails and phones are fake and hashed immediately. It then:

1. syncs three cohorts (two are too small and get skipped);
2. launches an SUV campaign on YouTube and Meta;
3. simulates day 2, where 1,500 people opt out and new users join, and shows that only the changes are uploaded;
4. runs the monitor.

Every API call is printed, not sent (`DRY_RUN=1`).

## Going live

1. `pip install -r requirements.txt`
2. Set these environment variables (never commit them):
   * **Meta:** `META_ACCESS_TOKEN` (a system-user token with `ads_management`), `META_AD_ACCOUNT_ID`, `META_PAGE_ID`, `META_API_VERSION`
   * **Google:**
     * `GOOGLE_ADS_CUSTOMER_ID` — the account that runs the ads
     * `GOOGLE_ADS_LOGIN_CUSTOMER_ID` — Torque's manager account
     * `GOOGLE_APPLICATION_CREDENTIALS` — a service account with Data Manager API access
     * `GOOGLE_ADS_YAML` — developer token and OAuth
   * `DATABASE_URL` — Postgres in production (edit `db.connect()` to use psycopg)
   * `DRY_RUN=0`
3. Feed `identity`, `consent` and `cohort_membership` from the data warehouse. The audience engine writes cohorts; logins, leads and OTP write identity; the consent platform writes consent.
4. Schedule the jobs:
   * `audience_sync.py --all` nightly
   * `monitor.py` hourly
   * `launcher.py <line_item_id>` from the Torque campaign service when an advertiser launches

## Rules built in

* Only users with **off-site consent** and a hashed email or phone are uploaded. Raw PII never leaves Torque.
* Emails are lowercased and trimmed. Phones are normalised to E.164 (+91…) for Google and to digits with the country code for Meta. Both are SHA-256 hashed.
* Lists under `MIN_MATCHABLE_USERS` (default 10,000) are not activated.
* Each nightly run sends only additions and removals. Withdrawn consent is removed within 24 hours.
* Campaigns are created **PAUSED** and switched on only after Torque-side checks (`--activate`).
* The platform gets the media budget. Torque's management fee (`MGMT_FEE`) is kept back. `monitor.py` pauses the platform campaign when Torque's budget is reached.
* Audiences and campaigns live in **Torque-owned** Google and Meta accounts. Meta doesn't allow customer-file data from one ad account to be used in another, and advertisers never see the lists.

## Known gaps before production

* **YouTube video hosting:** the ad needs the video on YouTube first. Add an uploader (YouTube Data API) that puts advertiser videos on the Torque channel as *unlisted* and saves `youtube_video_id`.
* **Demand Gen audience targeting:** `destinations/google_ads.py` targets the list with an ad group user-list criterion. Demand Gen may require an `Audience` resource instead. Confirm against the current Google Ads API version (marked `TODO`).
* **Match-rate readback:** `google_ads.user_list_size()` and `meta.audience_size()` exist, but nothing calls them yet. Schedule them to fill `matched_count`.
* **Meta special ad categories:** loans and insurance advertisers may need `special_ad_categories`, which limits targeting. Set it per advertiser.
* **Retries and rate limits:** wrap `destinations/http.call` with exponential backoff and idempotency keys before production.
* **Meta images:** upload them via `/adimages` rather than passing a `picture` URL, for reliability.

## References

* [Google Data Manager API: send audience members](https://developers.google.com/data-manager/api/devguides/audiences/send-audience-members)
* [Google Ads API: Customer Match changes (Mar 2026)](https://ads-developers.googleblog.com/2026/03/changes-to-customer-match-support-in.html)
* [Google Ads API: Demand Gen](https://developers.google.com/google-ads/api/docs/demand-gen/overview) · [Video campaigns are read-only](https://developers.google.com/google-ads/api/docs/video/overview)
* [Meta Marketing API: Customer File Custom Audiences](https://developers.facebook.com/docs/marketing-api/audiences/guides/custom-audiences/)

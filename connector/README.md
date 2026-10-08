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
| ②a Google audience | `ga4_audiences.py`, `cohorts.py`, `destinations/ga4.py` | **GA4 Admin API** (v1alpha) `properties.audiences.create`; the GA4 → Google Ads link shares it; **Google Ads API** finds the shared list |
| ②b Meta audience | `audience_sync.py` | Meta **Marketing API** `/{audience_id}/users` (hashed, consented). Google Customer Match via the **Data Manager API** is optional: `GOOGLE_AUDIENCE_SOURCE=customer_match` |
| ③ Launch | `launcher.py` | Google **Ads API**: Demand Gen campaign, ad group targeting the list, video ad · Meta **Marketing API**: campaign → ad set (`custom_audiences`) → creative → ad |
| ④ Sync back | `monitor.py` | Google Ads API reporting · Meta Insights API |

## Google: cohorts become GA4 audiences automatically

CarDekho, BikeDekho and ZigWheels already send every visit to GA4 360, and GA4 is linked to Google Ads.
So for YouTube, Torque doesn't upload anyone. When an advertiser picks a cohort:

1. `ga4_audiences.ensure(cohort)` looks it up in the `ga4_audience` registry. If it's new, it builds the GA4
   audience from the cohort's building blocks (`cohorts.py`) and creates it on each site's GA4 property.
2. The GA4 → Google Ads link shares it to the Torque Google Ads account as a list named `Torque | <cohort>`.
3. `ga4_audiences.py refresh` (hourly) finds the list in Google Ads and moves it
   `linking → filling → ready` once it passes the YouTube minimum (~1,000 users).
4. `launcher.py` targets the ready lists, one per site, in the YouTube ad group.

Cohort keys are `vertical.category.price_band.intent.<days>d`, e.g. `car.suv.10_20l.price.30d`.
Fixed building blocks mean identical picks reuse one GA4 audience. `prebuild` keeps popular cohorts warm,
and `archive-stale` frees slots so a property never hits its audience cap.

**Setup:** add the connector's service account to each GA4 property (Editor or Marketer), and set
`GA4_PROP_ZIGWHEELS`. Price bands use model-page lists until a `price_bucket` event parameter is registered
in GA4. Then set `GA4_PRICE_PARAM_<SITE>=price_bucket` and price matching becomes exact.

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
* **GA4 audience API is alpha:** `properties.audiences` lives in Admin API v1alpha. Pin the version and re-test when Google promotes it.
* **GA4 audiences fill from creation:** a brand-new cohort can take 24–48 h to pass the YouTube minimum. The wizard should show "Building" until `refresh` marks it ready.
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

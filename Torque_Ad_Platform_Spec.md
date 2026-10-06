# Torque — First-Party Automotive Ad Platform
## Product & Technical Specification (v0.1)

**Properties:** CarDekho · BikeDekho · ZigWheels
**Companion prototype:** "Torque Ad Platform" artifact (clickable, sample data)
**Status:** Draft for engineering and business review · 23 Sep 2026

---

## 1. What we are building

A publisher-owned, self-serve advertising platform that turns first-party automotive intent on our three sites into privacy-safe audience cohorts that advertisers can buy on our own premium inventory. It is not a banner manager. The value chain it has to protect:

> Traffic → automotive intent signals → price/category cohorts → owned inventory → advertiser campaigns → measurable performance

**Design principles**

1. **Cohorts, never people.** Advertisers target and report on aggregated cohorts only. No PII or row-level data ever leaves the platform.
2. **Context is the strongest signal.** The vehicle on the page (model → price, body, fuel, brand) is known deterministically from our catalogue. Classification should lean on this before any behavioural modelling.
3. **Decide at the edge.** Ad decisions must complete in single-digit milliseconds, so the decision path uses only in-memory data.
4. **Extensible taxonomy.** Price segment is the primary dimension. Every other cohort is a new dimension in the same registry, with no schema change needed.
5. **Explainable automation.** Pacing, ranking and AI recommendations must always show why they made a decision.

---

## 2. Users and roles

| Role | Console | Can do | Cannot do |
|---|---|---|---|
| Advertiser admin | Advertiser | Manage users, billing, all campaigns in own account | See other accounts; export user-level data |
| Advertiser user | Advertiser | Create/edit campaigns, audiences, creatives; view reports | Change billing |
| Agency user | Advertiser | Act on several client accounts it is linked to | Cross-client reporting unless allowed |
| Ad Ops | Admin | Inventory, floors, creative review, campaign overrides | Change governance controls |
| Sales / Yield | Admin | Rate card, packages, sponsorship booking | Edit inventory definitions |
| Data Governance (DPO) | Admin | k-thresholds, retention, consent rules, taxonomy approval | Create campaigns |
| Finance | Admin | Invoices, credit lines, wallet adjustments | Change targeting |

All access goes through SSO/OIDC with RBAC, and every write is recorded in an append-only audit log.

---

## 3. Module map

| Module | Responsibility | Store / tech (proposed) |
|---|---|---|
| Advertiser Management | Accounts, users, KYC (GST/PAN), wallets, credit lines | Postgres |
| Campaign Management | Campaign → line item → creative hierarchy, targeting, flights | Postgres |
| Audience Engine | Signal ingestion, classification, cohort membership, size estimation | Kafka → Flink → Aerospike/Redis; ClickHouse for sizing |
| Inventory Management | Sites, page types, placements, formats, floors, availability | Postgres |
| Ad Server | Decision API: filter, pace, cap, rank, respond | Go or Rust service at edge PoPs; in-memory campaign index |
| Creative Management | Upload, transcode (video), policy review, CDN delivery | Object storage + CDN; review queue |
| Budget & Pacing | Spend counters, throttle computation every 5 min | Redis counters + pacing worker |
| Frequency Capping | Per hashed ID × campaign × window counters | Redis with TTL |
| Tracking & Attribution | Impression/viewability/click/conversion beacons, IVT filtering | Edge collectors → Kafka |
| Reporting | Aggregated rollups by cohort, site, device, geo, day | ClickHouse |
| Forecasting | Available users/impressions for a targeting spec | Precomputed cubes + sampling in ClickHouse |
| Billing | Metering, invoices, GST, wallet debits, credit notes | Postgres ledger |
| Admin Console | Yield, delivery, inventory, governance | Web app |

Frontend: one responsive web app (React + TypeScript) with Advertiser and Admin shells sharing a component library. Backend services expose REST/JSON for the consoles. The decision path uses a compact binary or JSON API.

---

## 4. Core data model

```
advertiser(id, name, type, gstin, pan, kyc_status, wallet_balance, credit_limit, status, owner_id)
user(id, advertiser_id?, email, role, sso_subject, status)
campaign(id, advertiser_id, name, objective, status, start_at, end_at,
         budget_total, budget_daily, pricing_model[CPM|CPC|CPL|SPONSORSHIP|PACKAGE],
         bid_amount, priority, freq_cap_n, freq_cap_window[day|week|flight],
         audience_id?, package_id?, created_by, approved_at)
campaign_targeting(campaign_id, sites[], page_types[], devices[], geos[], formats[], placement_ids[]?)
audience(id, advertiser_id?, name, definition_json, est_users, approved, created_by)
package(id, name, sites[], audience_definition_json, rate_cpm, active)
placement(id, site, page_type, device, position, format, floor_cpm, premium_multiplier, active)
creative(id, campaign_id, format, asset_url, headline, cta, landing_url, review_status, reviewer_id)
conversion_event(id, advertiser_id, name, type, value, window_days, source)
ledger_entry(id, advertiser_id, campaign_id, date, units, unit_type, amount, gst, invoice_id)
audit_log(id, ts, actor, role, action, entity, before_json, after_json, ip_hash)
```

### Audience definition (stored as JSON)

```json
{ "groups": [
    { "rules": [ {"dim":"body_car","vals":["SUV"]},
                 {"dim":"price_car","vals":["15-20"]},
                 {"dim":"recency","vals":["30d"]} ] },
    { "rules": [ {"dim":"fuel","vals":["EV"]},
                 {"dim":"price_car","vals":["10-15","15-20"]},
                 {"dim":"market","vals":["used"],"neg":true} ] } ] }
```

Semantics: rules within a group are joined with **AND**, groups are joined with **OR**, and `neg:true` means **NOT**. This covers the brief's examples, and any boolean expression can be rewritten into this form.

---

## 5. Audience engine

### 5.1 Dimension registry

Each dimension is a row in a registry: `key, label, scope(car|bike|any), values[], multi_valued, lookback_default, approved_by`. New cohorts are added as registry entries, so no code change is needed.

| Dimension | Values | Source |
|---|---|---|
| Car price segment | <₹5L, 5–10, 10–15, 15–20, 20–30, 30–50, ₹50L+ | Ex-showroom price of models viewed |
| Bike price segment | <₹1L, 1–2, 2–3, 3–5, ₹5L+ | Same, bike catalogue |
| ZigWheels | Car or bike segments, chosen by the vehicle being viewed | Catalogue vehicle type |
| Car body type | SUV, Hatchback, Sedan, MUV/MPV, Luxury, Pickup | Catalogue |
| Bike category | Commuter, Scooter, Sports, Cruiser, Adventure, Premium | Catalogue |
| Fuel | EV, Petrol, Diesel, CNG, Hybrid | Catalogue |
| Market | New, Used | Page type / section |
| Brand, Model | Catalogue IDs | Page context |
| Competitor consideration | Model sets | ≥2 models, different brands, same segment, 14 days |
| Research activity | On-road price, compare, EMI/finance, offers, dealer locator, test drive, lead, reviews | Page type + UI events |
| Intent level | High / Medium / Low | Rule on activity (below) |
| Visitor | New / Repeat | ≥2 sessions in 30 days |
| Recency | 7 / 14 / 30 days | Last qualifying event |
| City tier / geo | Metro, Tier 1, Tier 2+; city list | Coarse IP geo (city level only) |

**Intent level rule (v1):** High = ≥2 of {on-road price, EMI, offers, dealer locator, test drive, lead}, or 1 of these plus a repeat visit. Medium = any research activity. Low = page views only.

**Price-segment membership:** a user can hold up to 3 price segments at once, weighted by recency and view count, so users cross-shopping ₹15–20L and ₹20–30L qualify for both.

### 5.2 Pipeline

`Page view → vehicle context → audience classification → cohort → eligible campaign → ad impression → click → conversion`

1. **Collect.** A first-party tag (consent-gated) emits `page_view` with `site, page_type, model_id, device, coarse_geo, session_id, hashed_uid`. UI events (EMI calculator used, compare added, lead submitted flag) are also sent.
2. **Enrich.** Join `model_id` to the catalogue to add price, body, fuel and brand.
3. **Classify.** A Flink job updates each hashed ID's cohort bitset and per-dimension recency within about 2 seconds.
4. **Store.** Cohort bitsets (about 200 bytes per profile) sit in a low-latency KV store replicated to edge PoPs, with a 30-day TTL (the recency window).
5. **Size.** A daily job writes HyperLogLog sketches per dimension-value × site × day into ClickHouse. Audience-size estimates union and intersect sketches, so we never scan raw rows.

### 5.3 Size estimation and privacy floor

* Reach = HLL estimate over the audience expression, de-duplicated across the selected sites.
* Eligible impressions = reach × average ad opportunities per user on the selected inventory.
* **Minimum audience of 1,000 users** (configurable). Below this, the audience cannot be saved or targeted.
* Estimates shown to advertisers are rounded to 2 significant figures.

The prototype uses an analytic approximation (dimension shares, a correlation lift for intent signals, and an OR-union), which is enough to demonstrate the UX before sketches exist.

---

## 6. Ad server

### 6.1 Decision API

```
POST /v1/decide
{ "site":"cd", "page":"model", "slot":"cd-model-m-300x250",
  "ctx":{"model_id":"creta-2026","price_lakh":18},
  "device":"mobile", "geo":"Delhi NCR", "uid":"u_9c1e…" }

200 { "campaign":"C-1041", "creative":"cr_88…", "html|asset_url":"…",
      "imp_url":"/i?t=<signed>", "view_url":"/v?t=…", "click_url":"/c?t=…" }
204 (no fill → publisher falls back to programmatic / house)
```

Both server-side (SSR) and client-side (JS tag) calls are supported. The response token signs the campaign, creative, placement, cohort bucket and timestamp, and it is what billing and attribution use later.

### 6.2 Decision algorithm (as in the simulator)

For each request:

1. Classify context. Merge page-context attributes (price segment of the model on the page, body, fuel, brand, model) with the stored profile's cohort bitset.
2. Look up candidates in an **inverted index** keyed by `site × page_type × device × format`. This removes most campaigns before any per-campaign work.
3. For each candidate, apply filters in order of cost, cheapest first: status → flight dates → geo → audience match (bitset AND/OR) → total budget → daily budget → frequency cap → pacing throttle (random draw < throttle).
4. Rank survivors by `score = eCPM × (1 + priority/10)`. Sponsorships and guaranteed deals (priority 10) outrank everything within their booked placements.
   eCPM: CPM = bid; CPC = bid × pCTR × 1000; CPL = bid × pCTR × pCVR × 1000; Sponsorship = fee ÷ booked impressions × 1000.
5. Return the winner and increment the frequency counter and spend asynchronously.
6. Log the decision with the reason code of the first failed check for each filtered campaign. This powers delivery diagnostics ("why isn't my campaign spending?").

### 6.3 Latency budget (p99 at edge ≤ 15 ms)

| Step | Target |
|---|---|
| Receive and parse | 2 ms |
| Profile + frequency lookup (single batched KV read) | 3 ms |
| Candidate lookup (in-memory index) | 1 ms |
| Filter, pace, rank | 2 ms |
| Response + tracking URLs | 2 ms |

The campaign index is rebuilt from Postgres change events and pushed to every ad-server node every 30 seconds. Budget and pacing state refresh every 60 seconds.

---

## 7. Budget pacing

Every 5 minutes, per campaign:

```
remaining_budget = budget_total − spend_to_date
remaining_days   = flight_end − now
target_daily     = min(budget_daily, remaining_budget / remaining_days)
available_daily  = forecast_unsold_matching_imps_per_day × eCPM / 1000
throttle         = clamp(target_daily / available_daily, 0.02, 1.0)
```

* An intraday curve that follows the site traffic shape spreads `target_daily` across hours, so spend doesn't exhaust by noon.
* If spend is behind the curve, the throttle rises; if ahead, it falls.
* **Hard stops:** spend ≥ budget_total, or today's spend ≥ budget_daily. Both are enforced with atomic counters on the decision path, allowing at most one in-flight overshoot per node.
* The pacing state shown to advertisers is On pace, Ahead, Behind, or "Behind — daily cap limits catch-up".
* Phase 2 adds performance-aware pacing, which shifts throttle toward hours and placements with higher CTR while still hitting `target_daily`.

---

## 8. Frequency management

* Key: `hash(uid) | campaign_id | window_bucket` in Redis, with a TTL of the window plus 24 hours.
* `uid` is a rotating first-party identifier (salted SHA-256, salt rotated every 90 days). It is never an email or phone number.
* Caps offered: 1, 3 or 5 per day, or a custom N per day, week or flight.
* When a user is capped, the campaign is filtered and the next eligible campaign wins, so the impression is not wasted.
* Users without an identifier (no consent or no cookie) get contextual-only targeting. Frequency for them is capped per page-view session.

---

## 9. Tracking and attribution

| Event | Trigger | Notes |
|---|---|---|
| `ad_request` | Decision call | Includes no-fill |
| `impression` | Creative rendered | Billable only if viewable |
| `viewable` | ≥50% in view for ≥1 s (display) or ≥2 s (video) | MRC-style standard |
| `click` | Click redirect `/c` | IVT-filtered before billing |
| `landing_visit` | Advertiser pixel `page` event with click ID | Post-click |
| `lead` / `conversion` | Advertiser pixel or Torque lead form | De-duplicated per click ID and event |
| `video_quartiles` | 25/50/75/100% | Used for VTR |

* **UTM:** The click redirect appends `utm_source=torque&utm_medium=display&utm_campaign=<slug>&utm_content={placement}_{size}`. Advertisers can override every field.
* **Conversion definitions:** the advertiser defines the name, type, value and attribution window (1–30 days post-click, optional 1-day post-view).
* **Attribution:** last Torque click within the window. View-through is reported separately and never billed.
* **Invalid traffic:** data-center IPs, known bots, abnormal click rates and duplicate clicks within 30 seconds are filtered before billing and reporting.

---

## 10. Reporting

* ClickHouse rollups at `day × campaign × creative × site × page_type × device × geo × price_segment × category × intent_level × visitor_type`.
* **Report k-threshold:** any row under 100 impressions is suppressed and shown as "hidden to keep reporting aggregated".
* Metrics: impressions, viewable impressions, reach (HLL), clicks, CTR, spend, eCPM, CPC, video views, VTR, conversions, leads, CVR, CPL.
* The admin view adds fill rate, sell-through, unsold inventory by page type, eCPM by site and placement, revenue by pricing model, and delivery risk.
* Exports are CSV of aggregated rows only. A scheduled email report ships in Phase 2.

---

## 11. Inventory forecasting

Inputs: audience definition, sites, page types, devices, formats, geo, flight, frequency cap, and budget.

```
available_users       = HLL(audience ∩ sites ∩ geo)
available_monthly_imp = Σ placement_imps × audience_share × geo_share
unsold                = available × (1 − booked_share for the flight)
cap_limited_imps      = reachable_users × cap × days × cap_utilisation(≈0.35)
deliverable           = min(unsold, cap_limited_imps)
estimated_imps        = min(deliverable, budget_imps)
```

The output card matches the brief: selected audience, available users, available monthly impressions, selected inventory, estimated reach, and estimated impressions. It also gives a delivery verdict and suggestions when the campaign is at risk.

Phase 2 replaces the analytic model with a 1% sampled request log replay: past requests are replayed against the proposed campaign plus existing bookings.

---

## 12. Commercial models and billing

| Model | Billing unit | Notes |
|---|---|---|
| CPM | 1,000 viewable impressions | Default |
| CPC | Valid click | After IVT |
| CPA / CPL | De-duplicated lead or defined conversion | Needs pixel or Torque form |
| Fixed sponsorship | Flat fee per day or flight | Priority 10, guaranteed placement |
| Package | Package rate-card CPM | e.g. Auto Intent, EV, Luxury |
| Premium placement | Floor × multiplier | Masthead 2.4×, video 3.0×, billboard 1.6×, finance pages 1.4× |

* **Prepaid wallet** with daily auto-debit, or a **credit line** on net-30 terms for verified accounts.
* Monthly GST invoices (18%) come from the ledger. Credit notes cover IVT or delivery shortfalls on guaranteed deals.
* Launch-ready audience packages: Mass Auto, Entry Car (<₹10L), Premium Car (>₹20L), Luxury (>₹50L), EV, SUV, Premium Bike (>₹3L), Used Car, and Auto Intent High.

---

## 13. Privacy and data governance

This section is non-negotiable and needs sign-off from Legal and the DPO before any build starts.

* **Lawful basis:** use a consent management platform aligned to India's Digital Personal Data Protection Act, 2023 and its Rules, with notice and consent for ad personalisation. Without consent, only contextual targeting is used.
* **Withdrawal:** a user's cohort flags are purged within 24 hours of withdrawal.
* **Advertisers never receive** names, phone numbers, emails, individual browsing histories, user IDs, or row-level logs.
* **Advertisers only target** predefined or DPO-approved cohorts. A custom audience is a boolean combination of approved dimensions and must pass the 1,000-user floor.
* **Sensitive inference block:** no cohorts on health, religion, caste, political views, or financial status beyond vehicle budget.
* **Lead data isolation:** the "submitted a lead" flag is a boolean in the cohort store. Lead contents stay in the existing lead system under its own access controls.
* **Retention:** raw events 90 days, hashed profiles 30 days rolling, aggregates 25 months, audit log 7 years. All are configurable by the DPO role.
* **Access controls:** RBAC and SSO, least privilege, and quarterly access reviews.
* **Audit log:** append-only, covering every targeting, pricing, governance and access change, plus report views.

---

## 14. AI layer (Phase 3, designed for now)

The prototype's rule-based suggestions define the contract that later models will fill.

```
Recommendation { type, target(campaign/cohort/placement), action, expected_impact,
                 evidence{metric, segment_value, baseline, n}, confidence }
```

Planned recommenders:

* best cohort
* best site and placement
* best creative (bandit)
* budget reallocation
* frequency tuning
* pacing curve
* audience expansion (lookalike on cohort vectors, consent permitting)
* underperforming-inventory flags
* automated floor pricing and real-time yield

Example: "The ₹15–20L SUV audience has 1.6× higher CTR than the campaign average. Consider increasing delivery to this cohort. (CTR 1.4% vs 0.87%, 1.2M impressions)"

Every recommendation carries its evidence and is one-click reversible. Nothing is auto-applied without the advertiser opting in.

---

## 15. Non-functional requirements

| Area | Target |
|---|---|
| Decision latency | p50 ≤ 5 ms, p99 ≤ 15 ms at edge |
| Throughput | Peak ~20K decisions/s (sized from ~275M monthly page views × ~2.6 slots, with 5× peak headroom). Confirm with real traffic data. |
| Availability | Decision API 99.95%. On failure, the page falls back to programmatic backfill within 50 ms. |
| Event loss | < 0.1% for billable events. Exactly-once billing through idempotent event IDs. |
| Reporting freshness | ≤ 15 min for delivery, T+1 for reach and conversions |
| Security | OWASP ASVS L2, encryption at rest and in transit, secrets in a vault, signed tracking URLs |

---

## 16. Delivery plan

### Phase 1 — MVP (≈ 12–14 weeks)

1. Advertiser login (SSO + email OTP) and accounts
2. Campaign creation wizard (objective → sites → audience → inventory → budget → frequency → creative → review)
3. Website and inventory selection
4. Price-based audience cohorts (car and bike segments) plus packages
5. Creative upload for display sizes, with policy review
6. Ad serving (decision API, inverted index, ranking)
7. Impression, viewability and click tracking
8. Budget control (total and daily hard stops, even pacing)
9. Frequency capping
10. Basic reporting (campaign, site, device, price segment)

**Exit criteria:** 3 pilot advertisers live on CarDekho model and compare pages; p99 ≤ 15 ms; spend within ±5% of plan; zero PII in any advertiser-facing surface (verified by DPO).

### Phase 2 (≈ 10 weeks)

Advanced audience builder (AND/OR/NOT, all dimensions), inventory forecasting, native and video formats, conversion pixel and events, billing and invoicing, performance-aware pacing.

### Phase 3

AI optimisation, dynamic audience creation, consent-permitted lookalikes, automated pricing, real-time yield optimisation, cross-site audience targeting.

---

## 17. Open decisions for the business

1. **Backfill:** does unsold inventory keep going to the current programmatic partners (via a header-bidding floor), and what floor protects direct-sold CPMs?
2. **Sales channel:** is this fully self-serve from day one, or are self-serve and managed service run in parallel (sales books sponsorships in the Admin console)?
3. **Lead-gen products:** does CPL/test-drive use our existing lead forms (and their pricing), or only advertiser pixels?
4. **Identity:** one hashed ID shared across the three sites (requires a shared consent notice), or per-site IDs with cross-site targeting deferred to Phase 3?
5. **OEM exclusivity:** can a brand buy "Competitor consideration" audiences built on a rival's model pages? This needs a policy decision.
6. **Real traffic baselines:** the prototype's figures are samples. The actual monthly UVs, page views and slot counts per page type are needed to size capacity and packages.

---

## 18. Channels beyond our own sites (added 23 Sep 2026)

Torque sells one audience across four channels. The cohort is always built on our own traffic; what changes is where the ad runs.

| Channel | How the cohort gets there | Who runs the buy | Pricing to advertiser |
|---|---|---|---|
| **Torque sites** (CarDekho, BikeDekho, ZigWheels) | Cohort bitset read by our ad server | Torque ad server | CPM / CPC / CPL / sponsorship (sections 12–13) |
| **YouTube** | Consented users' SHA-256 hashed email/phone uploaded as Customer Match lists via Google's **Data Manager API**; bought as **Demand Gen** campaigns | Torque-owned Google Ads manager account (managed service) | Media at cost + management fee + audience data fee (sample ₹40 CPM) |
| **Meta** (Facebook, Instagram) | Same hashed IDs uploaded as Custom Audiences via the Marketing API | Torque-owned Business Manager (managed service) | Media at cost + management fee + audience data fee |
| **Publisher network** | Torque tag on partner sites calls the same decision API; cohort users recognised via consented Torque ID sync, everyone else by page context | Torque ad server | Network CPM; publisher keeps 60–72% |
| **Open exchange** | Torque bids as a DSP seat over OpenRTB 2.6 into SSPs/exchanges | Torque bidder | Clearing price + margin + audience fee |

### 18.1 Off-site activation (YouTube, Meta)

* **Separate consent purpose.** "Personalised ads on other platforms" is its own opt-in. A user can be in on-site cohorts but excluded from off-site lists.
* **Only hashed identifiers leave Torque.** Emails and phones are normalised, SHA-256 hashed, and matched inside Google/Meta. Raw PII never leaves.
* **Lists stay in Torque-owned accounts.** They are never shared into advertiser ad accounts. Advertisers get aggregated reach, views, clicks and conversions only.
* **Minimum list size:** 10,000 matched users per platform (Torque policy, configurable).
* **Refresh:** daily. Withdrawn consent is purged within 24 hours. Lists are deleted from the platform 30 days after their last use.
* **Special categories:** loans, insurance and similar ads may fall under platform special-ad-category rules that restrict custom audiences. Check these before launch.
* **Reach model (prototype):** cohort users × off-site consent share × identifiable share × platform match rate. Replace these with measured rates once the pilot syncs run.

### 18.2 Publisher network

* **Onboarding:** invite → ads.txt line → Torque tag install → content and brand-safety review → live.
  * The publisher portal shows earnings and monthly payouts (bank transfer, revenue share).
* **Targeting on partner sites:** Torque cohorts (via consented ID sync) plus contextual categories (Auto, Finance, Tech, Travel, Lifestyle, News, Sports, Parenting).
  * Brand-safety levels: Strict and Standard.
* **The same engine everywhere.** The decision API, frequency caps and pacing are shared, so a user capped on CarDekho is also capped on partner blogs.
* **Open exchange:** an OpenRTB 2.6 bidder (under 80 ms bid timeout) into exchanges such as Google Ad Manager (Authorized Buyers), PubMatic, Magnite and InMobi.
  * This is how "every blog on the internet" becomes buyable without signing each one individually.
  * Pre-bid brand-safety and invalid-traffic filtering apply.

### 18.3 Campaign model changes

* `campaign.channels[]` and `campaign.split{channel: %}`.
  * A channel router creates one line item per channel with its own budget.
  * Phase 2 re-balances the split daily toward the best cost per result.
* Channel-specific settings:
  * YouTube formats: in-stream, bumper, Shorts, in-feed.
  * Meta platforms and placements.
  * Network content categories, open-exchange opt-in and brand-safety level.
* Unified reporting normalises platform metrics into one schema, and "Channel" becomes a report breakdown.

### 18.4 New services

Channel router · Activation service (Google Data Manager API / Meta Marketing API) · Off-site buyer (Google Ads API Demand Gen / Meta Marketing API) · Reporting sync (Google Ads API / Meta Insights API) · Publisher tag and portal · DSP bidder · Unified reporting.

### 18.5 How off-site delivery actually works (APIs)

Torque does not serve ads on YouTube or Meta; the platforms do. Torque's job is to (1) send the audience, (2) create and run the campaign, and (3) pull results back, each through the platform's API.

| Job | YouTube / Google | Meta (Facebook, Instagram) |
|---|---|---|
| **1. Send the audience** (daily) | **Data Manager API** for Customer Match. Since 1 Apr 2026, new integrations cannot upload Customer Match through the Google Ads API (`OfflineUserDataJobService` / `UserDataService` return `CUSTOMER_NOT_ALLOWLISTED_FOR_THIS_FEATURE`). | **Marketing API**: create a Custom Audience, then `POST /{audience_id}/users` (or `/usersreplace`). SHA-256 on normalised values, max 10,000 records per call, matching takes up to ~24 h. |
| **2. Create and run the campaign** | **Google Ads API** with **Demand Gen** campaigns. Classic Video campaigns are read-only in the API, so they can't be created or edited there. Demand Gen covers YouTube in-stream, Shorts and feeds, targeted at the Customer Match list. | **Marketing API**: campaign → ad set (targeting the Custom Audience) → ad and creative. |
| **3. Report** (hourly) | Google Ads API reporting (impressions, views, clicks, cost, conversions) | Insights API |

**End-to-end flow:**

1. A user on CarDekho consents to off-site personalisation and falls into the "SUV ₹15–20L" cohort.
2. Nightly, the Activation service takes cohort members that have a hashed email or phone and uploads them to Google (Data Manager API) and Meta (Marketing API).
3. An advertiser launches a campaign in Torque.
4. The Off-site buyer creates the Demand Gen campaign and the Meta ad set in Torque-owned accounts.
5. Google and Meta serve the ads.
6. The Reporting sync writes platform results into ClickHouse, and the advertiser sees one report by channel.

**Why Torque-owned accounts:** Meta does not allow customer-file values from one ad account to be used in any other ad account, even within the same business. Running the buys in Torque's own accounts keeps the lists in one place and never exposes them to advertisers.

**Optional pixel route (no email needed):**
* On Torque pages, fire cohort events (e.g. `viewed_suv_15_20L`) through the Meta Pixel / Conversions API and the Google tag. The platforms then build website-visitor audiences themselves.
* Pro: usually much larger reach, because it doesn't depend on logged-in users.
* Con: it shares on-site behaviour with the platforms. It needs explicit consent and a Legal/DPO decision.
* Many publishers run both routes.

**Prerequisites:**
* **Google:** a Google Ads manager account, an approved developer token, Data Manager API access, and Customer Match eligibility for the account.
* **Meta:** a verified Business account, an app approved for ads management, and the Custom Audience terms accepted.
* **Both:** a separate "ads on other platforms" consent purpose.

**Sources:**
* [Google Ads Developer Blog: Changes to Customer Match support (Mar 2026)](https://ads-developers.googleblog.com/2026/03/changes-to-customer-match-support-in.html)
* [Google Ads API: Video campaigns are read-only](https://developers.google.com/google-ads/api/docs/video/overview)
* [Google Ads API: Demand Gen](https://developers.google.com/google-ads/api/docs/demand-gen/overview)
* [Meta Marketing API: Customer File Custom Audiences](https://developers.facebook.com/docs/marketing-api/audiences/guides/custom-audiences/)

### 18.6 Open decisions

1. Do we have enough consented, logged-in or lead-verified users to make off-site lists worthwhile? This needs a real count of hashed IDs per cohort.
2. Do we stay a managed service (Torque runs the YouTube/Meta buys), or allow audience sharing into agency accounts? Sharing needs platform partnership terms and legal review.
3. Publisher revenue share and payment terms, and whether to use an existing SSP instead of building the publisher side ourselves.
4. Which exchange seat to start with, and the margin policy on open-exchange buys.

---

## 19. Publisher programme: self-serve onboarding, AdSense-style (added 23 Sep 2026)

Any blog or site can join the Torque Publisher Network on its own, then earn a share of what Torque advertisers pay. The network uses the same ad server, audiences, frequency caps and pacing as CarDekho, BikeDekho and ZigWheels.

### 19.1 Publisher journey

| Step | Publisher does | Torque does |
|---|---|---|
| 1. Sign up | Creates an account and adds a site URL, topic and traffic estimate | Issues a publisher ID (`pub-…`) |
| 2. Verify ownership | Adds a `<meta name="torque-site-verification">` tag or a DNS TXT record | Checks for it and marks the site verified |
| 3. ads.txt | Adds `torque-ads.example, pub-…, DIRECT, <cert-id>` to `/ads.txt` | Crawls it daily; a missing line blocks serving |
| 4. Torque code | Pastes one `<script>` in `<head>` (Auto ads) | Tag loads and calls `/v1/decide` for each slot |
| 5. Review | Waits, target 2–3 days | Automated scan plus a human decision (19.3) |
| 6. Ad units (optional) | Creates manual units (display, in-article, sticky, video) and copies an `<ins>` snippet per unit | Unit IDs map to placements in inventory |
| 7. Controls | Blocks advertiser categories or specific advertisers | Applied as filters in the decision engine |
| 8. Earnings and payment | Sees earnings, page RPM, fill rate and reports; adds PAN, GSTIN and bank details | Monthly statement; payout on the 21st above a ₹1,000 threshold |
| 9. Policy | Fixes issues and requests a re-review | Warning → ad serving limited → suspended |

### 19.2 What we build vs buy

* **Build:** the Publisher console, the verification and ads.txt crawler, the tag and ad-unit generator, the review queue, the policy workflow, the earnings ledger and statements. This is the product.
* **Buy or plug in:**
  * an invalid-traffic and brand-safety vendor for the site scan and ongoing monitoring;
  * a bulk-payout provider (e.g. RazorpayX) for NEFT, TDS and bank-account verification;
  * optionally Prebid.js in the tag, so partner sites can also run header bidding.

### 19.3 Site review (automated scan plus reviewer)

* **The scan covers:**
  * a crawl of about 50 pages: content length, originality, prohibited content;
  * a 14-day traffic sample: bots, data-centre IPs and paid or incentivised traffic sources;
  * a brand-safety classifier;
  * ads.txt present, and the tag firing.
* **Suggested thresholds** (tune them on real data):
  * *Recommend approve:* traffic ≥ 75, content ≥ 75, policy ≥ 90, invalid traffic ≤ 5%.
  * *Needs a closer look:* content or traffic below 75.
  * *Recommend reject:* invalid traffic above 5% or policy below 90.
* **Decisions:** Approve, or reject with a reason (low-value content, invalid traffic, policy). Each decision goes to the audit log and is emailed to the publisher.

### 19.4 Money

* **Revenue share:** 60–72% to the publisher (default 70%), calculated on what advertisers pay for impressions on that site.
* **Month end:** earnings are finalised on the 3rd, after invalid-traffic deductions. Withheld amounts are returned to advertisers.
* **Tax:** TDS is deducted as applicable to the publisher's entity type. The section and rates need confirming with finance. Publishers can add a GSTIN to receive GST on their earnings.
* **Payment:** the threshold is ₹1,000; smaller balances roll over. Bank accounts are verified with a ₹1 test deposit. Bank changes pause payouts for 48 hours.

### 19.5 Data model additions

```
publisher(id, legal_name, pan_masked, gstin, bank_ref, tds_rate, rev_share, status, kyc_status)
publisher_site(id, publisher_id, domain, category, status[verify|adstxt|review|ready|limited|rejected],
               verified_at, adstxt_last_seen, scan_json, approved_by, approved_at)
ad_unit(id, site_id, name, format, size, auto_ads)
publisher_block(publisher_id, type[category|advertiser], value)
policy_issue(id, site_id, type, severity[warning|limited|suspended], detail, status, opened_at, resolved_at)
publisher_ledger(publisher_id, month, gross, ivt_deducted, tds, net, payout_status, paid_at, utr)
```

### 19.6 In the prototype

* **Publisher console** (switch console → Publisher):
  * Overview, Reports
  * Sites, Add a site (the 5-step flow)
  * Ad units with copyable code, Blocking controls
  * Payments, Payment profile
  * Policy center
* **Admin:** Supply › Publisher review queue (scan scores, approve/reject) and Supply › Publisher payouts (monthly run with TDS and invalid-traffic deductions).

---

## Appendix — Prototype coverage

| Brief section | Where to see it in the prototype |
|---|---|
| Campaign creation (steps 1–7) | Advertiser › Create campaign, with a live forecast panel |
| Audience builder, estimated reach | Advertiser › Audiences (AND/OR/NOT groups, size by site and price segment) |
| Audience packages | Advertiser › Audience packages |
| Inventory forecasting | Advertiser › Inventory & forecast; also the side panel in the wizard |
| Creatives, desktop/mobile preview | Wizard step 7; Advertiser › Creatives |
| Reporting and audience metrics | Advertiser › Reports (7 breakdowns, suppression, suggestions) |
| Tracking, UTM, conversions | Advertiser › Tracking & conversions |
| Billing | Advertiser › Billing |
| Admin dashboard | Admin › Network overview |
| Pacing | Admin › Delivery & pacing |
| Ad server, frequency capping | Admin › Ad server simulator (single request, 5× repeat, 10,000-request run) |
| Audience engine | Admin › Audience engine |
| Inventory management | Admin › Inventory management (editable floors, on/off) |
| Revenue models | Admin › Rate card & pricing |
| Privacy and audit | Admin › Privacy & audit log |
| Reach across channels | Advertiser › Channels › Reach planner |
| YouTube and Meta line items | Advertiser › Channels › YouTube & Meta; wizard step 2 "Channels" |
| Publisher network (advertiser) | Advertiser › Channels › Publisher network |
| Publisher onboarding, exchanges | Admin › Supply › Publisher network |
| Off-site list syncs | Admin › Engine › Audience activation |

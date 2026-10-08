"""Settings come from environment variables so no secret ever sits in code.

DRY_RUN=1 (the default) prints every API request instead of sending it,
so the whole flow can be exercised without any platform credentials.
"""
import os

DRY_RUN = os.getenv("DRY_RUN", "1") != "0"
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///torque_connector.db")

# Privacy rules
MIN_MATCHABLE_USERS = int(os.getenv("MIN_MATCHABLE_USERS", "10000"))  # don't activate smaller lists
COHORT_LOOKBACK_DAYS = int(os.getenv("COHORT_LOOKBACK_DAYS", "30"))

# --- Meta (Marketing API) -------------------------------------------------
META_API_VERSION = os.getenv("META_API_VERSION", "v23.0")   # set to the latest version you have access to
META_ACCESS_TOKEN = os.getenv("META_ACCESS_TOKEN", "")      # system-user token with ads_management
META_AD_ACCOUNT_ID = os.getenv("META_AD_ACCOUNT_ID", "")    # numeric, without "act_"
META_PAGE_ID = os.getenv("META_PAGE_ID", "")                # Page the ads run from
META_BATCH = 10_000                                         # Marketing API limit per /users call

# --- Google: Data Manager API (Customer Match uploads) ---------------------
DM_ENDPOINT = "https://datamanager.googleapis.com/v1"
DM_SCOPE = "https://www.googleapis.com/auth/datamanager"   # confirm in "Set up API access" docs
GOOGLE_ADS_CUSTOMER_ID = os.getenv("GOOGLE_ADS_CUSTOMER_ID", "")        # account that runs the ads
GOOGLE_ADS_LOGIN_CUSTOMER_ID = os.getenv("GOOGLE_ADS_LOGIN_CUSTOMER_ID", "")  # Torque manager (MCC)
GOOGLE_CREDENTIALS_FILE = os.getenv("GOOGLE_APPLICATION_CREDENTIALS", "")
DM_BATCH = 10_000                                           # Data Manager limit per request

# --- Google Ads API (Demand Gen campaigns + reporting) ---------------------
GOOGLE_ADS_YAML = os.getenv("GOOGLE_ADS_YAML", "google-ads.yaml")  # developer token, OAuth, login-customer-id

# Commercial
MGMT_FEE = float(os.getenv("MGMT_FEE", "0.15"))   # Torque fee on top of platform media

# --- GA4 (audiences built from on-site behaviour, shared to Google Ads via the GA4 link) ---
GA4_ADMIN_ENDPOINT = "https://analyticsadmin.googleapis.com/v1alpha"
GOOGLE_AUDIENCE_SOURCE = os.getenv("GOOGLE_AUDIENCE_SOURCE", "ga4")   # ga4 (default) | customer_match
GA4_AUDIENCE_LIMIT = int(os.getenv("GA4_AUDIENCE_LIMIT", "400"))       # per property; GA4 360 allows more than standard
GA4_AUDIENCE_HEADROOM = int(os.getenv("GA4_AUDIENCE_HEADROOM", "20"))  # leave room for the analytics team
GA4_ARCHIVE_AFTER_DAYS = int(os.getenv("GA4_ARCHIVE_AFTER_DAYS", "60"))
YOUTUBE_MIN_LIST_SIZE = int(os.getenv("YOUTUBE_MIN_LIST_SIZE", "1000"))  # Google won't serve smaller lists

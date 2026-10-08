"""GA4 Admin API: create / list / archive audiences on our GA4 360 properties.

Torque creates the GA4 audience when an advertiser picks a cohort; the GA4 → Google Ads link
shares it to the Torque Google Ads account automatically, where the YouTube campaign targets it.
No user data is uploaded: Google already sees these visits through the Google tag.

Audiences are in the Admin API's v1alpha surface. Docs:
https://developers.google.com/analytics/devguides/config/admin/v1/rest/v1alpha/properties.audiences
Auth: a service account added to each property with the Editor (or Marketer) role, scope analytics.edit.
"""
import cohorts
from config import DRY_RUN, GA4_ADMIN_ENDPOINT, GOOGLE_CREDENTIALS_FILE
from destinations.http import call

SCOPE = "https://www.googleapis.com/auth/analytics.edit"
NAME_PREFIX = "Torque | "


def _headers():
    if DRY_RUN:
        return {}
    import google.auth
    import google.auth.transport.requests
    from google.oauth2 import service_account
    creds = (service_account.Credentials.from_service_account_file(GOOGLE_CREDENTIALS_FILE, scopes=[SCOPE])
             if GOOGLE_CREDENTIALS_FILE else google.auth.default(scopes=[SCOPE])[0])
    creds.refresh(google.auth.transport.requests.Request())
    return {"Authorization": f"Bearer {creds.token}"}


def display_name(cohort_key: str) -> str:
    return NAME_PREFIX + cohort_key            # stable: Google Ads finds the shared list by this name


# ---------- filter building ----------
def _str(field, value, match="CONTAINS"):
    return {"dimensionOrMetricFilter": {"fieldName": field,
                                        "stringFilter": {"matchType": match, "value": value, "caseSensitive": False}}}


def _or(exprs):
    return {"orGroup": {"filterExpressions": exprs}}


def _page_view_any(urls, rules):
    """page_view whose URL contains any of the patterns (an OR inside one event filter)."""
    prefix = rules.get("path_prefix", "")
    patterns = [u if u.startswith(prefix) or not u.startswith("/") else prefix + u for u in urls]
    return {"eventFilter": {"eventName": "page_view", "eventParameterFilterExpression": {
        "andGroup": {"filterExpressions": [_or([_str("page_location", p) for p in patterns])]}}}}


def build_audience(cohort_key: str, site: str) -> dict:
    """GA4 Audience resource for one cohort on one site.

    Shape required by the API: filterExpression = andGroup → orGroup → (event / dimension filter).
    Each orGroup below is one condition that must hold (category, price band, intent).
    """
    c = cohorts.parse(cohort_key)
    rules = cohorts.SITE_RULES[site]
    category = _or([_page_view_any(rules["category_url"][c["category"]], rules)])
    conditions = [category]

    if c["band"] != "any":
        if rules.get("price_param"):
            conditions.append(_or([{"eventFilter": {"eventName": "page_view", "eventParameterFilterExpression": {
                "andGroup": {"filterExpressions": [_or([_str(rules["price_param"], c["band"], "EXACT")])]}}}}]))
        else:
            models = cohorts.MODELS_BY_BAND.get((c["category"], c["band"]))
            if not models:
                raise ValueError(f"No price data for {cohort_key} on {site}: register a price parameter in GA4 "
                                 f"or add MODELS_BY_BAND[({c['category']!r}, {c['band']!r})]")
            # the model pages already imply the category, so they replace the category condition
            conditions = [_or([_page_view_any(["/" + m for m in models], rules)])]

    intent = cohorts.INTENTS[c["intent"]]
    if intent and "url" in intent:
        conditions.append(_or([_page_view_any(intent["url"], rules)]))
    if intent and "event" in intent:
        conditions.append(_or([{"eventFilter": {"eventName": e}} for e in intent["event"]]))

    return {
        "displayName": display_name(cohort_key),
        "description": f"{cohorts.label(c)} on {rules['host']}. Created by Torque Ads for off-site targeting; "
                       "do not edit by hand.",
        "membershipDurationDays": c["days"],
        "filterClauses": [{
            "clauseType": "INCLUDE",
            "simpleFilter": {"scope": "AUDIENCE_FILTER_SCOPE_ACROSS_ALL_SESSIONS",
                             "filterExpression": {"andGroup": {"filterExpressions": conditions}}},
        }],
    }


# ---------- API calls ----------
def create_audience(property_id: str, body: dict) -> str:
    r = call("POST", f"{GA4_ADMIN_ENDPOINT}/properties/{property_id}/audiences", json_body=body,
             headers=_headers(), label=f"GA4 create audience · property {property_id}")
    return r.get("name") or f"properties/{property_id}/audiences/{r['id']}"


def list_audiences(property_id: str):
    if DRY_RUN:
        return []
    out, token = [], None
    while True:
        r = call("GET", f"{GA4_ADMIN_ENDPOINT}/properties/{property_id}/audiences",
                 params={"pageSize": 200, **({"pageToken": token} if token else {})}, headers=_headers())
        out += r.get("audiences", [])
        token = r.get("nextPageToken")
        if not token:
            return out


def archive_audience(name: str):
    call("POST", f"{GA4_ADMIN_ENDPOINT}/{name}:archive", json_body={}, headers=_headers(),
         label="GA4 archive audience")

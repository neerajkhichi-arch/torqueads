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


def _param_any(param, values, event="page_view"):
    """An event whose parameter CONTAINS any of the values, e.g. vehicleSegment contains "suv"."""
    return {"eventFilter": {"eventName": event, "eventParameterFilterExpression": {
        "andGroup": {"filterExpressions": [_or([_str(param, v) for v in values])]}}}}


def _models_any(models):
    return _param_any("page_location", ["/" + m for m in models])


def build_audience(cohort_key: str, site: str) -> dict:
    """GA4 Audience resource for one cohort on one site.

    Category, price band and page intent are matched on the SAME page_view (one event filter whose
    parameter conditions are ANDed), so "SUV · ₹10–20L · price intent" means a visitor opened the price
    page of a ₹10–20L SUV, not three unrelated pages. Lead intent is a separate event condition.
    Shape required by the API: andGroup → orGroup → event filter (→ andGroup → orGroup → parameter filter).
    """
    c = cohorts.parse(cohort_key)
    rules = cohorts.SITE_RULES[site]
    param, values = rules["category"][c["category"]]
    page = [_or([_str(param, v) for v in values])]            # parameter conditions on one page_view

    if c["band"] != "any":
        price_param, bands = rules["price"]
        if bands.get(c["band"]):
            page.append(_or([_str(price_param, v) for v in bands[c["band"]]]))
        elif cohorts.MODELS_BY_BAND.get((c["category"], c["band"])):
            page = [_or([_str("page_location", "/" + m) for m in cohorts.MODELS_BY_BAND[(c["category"], c["band"])]])]
        else:
            raise ValueError(f"No GA4 mapping for price band {c['band']} on {site}: add it to SITE_RULES['{site}']['price']")

    lead = None
    if c["intent"] == "lead":
        lead = _or([{"eventFilter": {"eventName": e}} for e in cohorts.INTENTS["lead"]["event"]])
    elif c["intent"] != "any":
        iparam, imap = rules["intent"]
        page.append(_or([_str(iparam, v) for v in imap[c["intent"]]]))

    conditions = [_or([{"eventFilter": {"eventName": "page_view",
                                        "eventParameterFilterExpression": {"andGroup": {"filterExpressions": page}}}}])]
    if lead:
        conditions.append(lead)

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

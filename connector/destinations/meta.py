"""Meta Marketing API: audiences, campaign -> ad set -> creative -> ad, insights.

Docs: https://developers.facebook.com/docs/marketing-api/audiences/guides/custom-audiences/
All budgets are in the account currency's smallest unit (paise for INR).
"""
import json

from config import META_ACCESS_TOKEN, META_AD_ACCOUNT_ID, META_API_VERSION, META_BATCH, META_PAGE_ID
from destinations.http import call

BASE = f"https://graph.facebook.com/{META_API_VERSION}"
ACT = f"act_{META_AD_ACCOUNT_ID or 'DRYRUN'}"


def _p(extra=None):
    p = {"access_token": META_ACCESS_TOKEN}
    p.update(extra or {})
    return p


# ---------- ② audience ----------
def create_audience(cohort_id: str, description: str) -> str:
    r = call("POST", f"{BASE}/{ACT}/customaudiences", params=_p({
        "name": f"Torque | {cohort_id}",
        "subtype": "CUSTOM",
        "description": description,
        "customer_file_source": "USER_PROVIDED_ONLY",
    }), label="create Custom Audience")
    return r["id"]


def _rows(members):
    # multi-key rows improve match rate; "" is allowed when one key is missing
    return [[m["email_sha256"] or "", m["phone_meta_sha256"] or ""] for m in members]


def add_members(audience_id: str, members: list[dict]):
    for i in range(0, len(members), META_BATCH):
        batch = members[i:i + META_BATCH]
        payload = {"schema": ["EMAIL", "PHONE"], "data": _rows(batch)}
        call("POST", f"{BASE}/{audience_id}/users", params=_p({"payload": json.dumps(payload)}),
             label=f"add {len(batch)} members")


def remove_members(audience_id: str, members: list[dict]):
    for i in range(0, len(members), META_BATCH):
        batch = members[i:i + META_BATCH]
        payload = {"schema": ["EMAIL", "PHONE"], "data": _rows(batch)}
        call("DELETE", f"{BASE}/{audience_id}/users", params=_p({"payload": json.dumps(payload)}),
             label=f"remove {len(batch)} members")


def audience_size(audience_id: str):
    r = call("GET", f"{BASE}/{audience_id}", params=_p({
        "fields": "approximate_count_lower_bound,approximate_count_upper_bound,operation_status"}),
        label="read matched size")
    return r.get("approximate_count_lower_bound")


# ---------- ③ launch ----------
OBJECTIVE = {"awareness": ("OUTCOME_AWARENESS", "REACH", "IMPRESSIONS"),
             "traffic":   ("OUTCOME_TRAFFIC", "LINK_CLICKS", "IMPRESSIONS"),
             "leads":     ("OUTCOME_LEADS", "LEAD_GENERATION", "IMPRESSIONS")}


def launch(li: dict, audience_id: str, media_budget_inr: float) -> dict:
    """Creates everything PAUSED; activate() flips it live after Torque-side approval."""
    objective, goal, billing = OBJECTIVE.get(li["objective"], OBJECTIVE["awareness"])
    ids = {}
    ids["campaign"] = call("POST", f"{BASE}/{ACT}/campaigns", params=_p({
        "name": f"Torque | {li['line_item_id']} | {li['name']}",
        "objective": objective,
        "status": "PAUSED",
        "special_ad_categories": json.dumps(li.get("special_ad_categories", [])),  # e.g. ["FINANCIAL_PRODUCTS_SERVICES"] for loans
        "lifetime_budget": int(round(media_budget_inr * 100)),   # paise
        "bid_strategy": "LOWEST_COST_WITHOUT_CAP",
        "start_time": f"{li['start_date']}T00:00:00+0530",
        "stop_time": f"{li['end_date']}T23:59:00+0530",
    }), label="create campaign")["id"]

    ids["ad_set"] = call("POST", f"{BASE}/{ACT}/adsets", params=_p({
        "name": f"{li['line_item_id']} | {li['cohort_id']}",
        "campaign_id": ids["campaign"],
        "optimization_goal": goal,
        "billing_event": billing,
        "status": "PAUSED",
        "start_time": f"{li['start_date']}T00:00:00+0530",
        "end_time": f"{li['end_date']}T23:59:00+0530",
        "targeting": json.dumps({
            "custom_audiences": [{"id": audience_id}],       # <-- the Torque cohort
            "geo_locations": {"countries": [li.get("geo") or "IN"]},
        }),
    }), label="create ad set targeting the cohort")["id"]

    link_data = {"link": li["landing_url"], "message": li.get("description") or "",
                 "name": li.get("headline") or "", "call_to_action": {"type": li.get("cta") or "LEARN_MORE"}}
    if li.get("image_url"):
        link_data["picture"] = li["image_url"]
    ids["creative"] = call("POST", f"{BASE}/{ACT}/adcreatives", params=_p({
        "name": f"{li['line_item_id']} creative",
        "object_story_spec": json.dumps({"page_id": META_PAGE_ID or "PAGE_ID", "link_data": link_data}),
    }), label="create ad creative")["id"]

    ids["ad"] = call("POST", f"{BASE}/{ACT}/ads", params=_p({
        "name": f"{li['line_item_id']} ad",
        "adset_id": ids["ad_set"],
        "creative": json.dumps({"creative_id": ids["creative"]}),
        "status": "PAUSED",
    }), label="create ad")["id"]
    return ids


def set_status(object_id: str, status: str):   # ACTIVE | PAUSED
    call("POST", f"{BASE}/{object_id}", params=_p({"status": status}), label=f"set {status}")


# ---------- ④ sync back ----------
def ad_review_status(ad_id: str):
    r = call("GET", f"{BASE}/{ad_id}", params=_p({"fields": "effective_status,ad_review_feedback"}),
             label="ad review status")
    return r.get("effective_status", "PENDING_REVIEW")


def insights(campaign_id: str, day: str):
    r = call("GET", f"{BASE}/{campaign_id}/insights", params=_p({
        "fields": "impressions,clicks,spend,actions,video_play_actions",
        "time_range": json.dumps({"since": day, "until": day})}), label="insights")
    rows = r.get("data") or [{}]
    return rows[0]

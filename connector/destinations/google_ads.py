"""Google Ads API: create the Customer Match list, Demand Gen campaign on YouTube, reporting.

YouTube buys are Demand Gen campaigns: classic Video campaigns are read-only in the API.
Docs: https://developers.google.com/google-ads/api/docs/demand-gen/overview
Field names follow the Google Ads API (v2x) python client; confirm against the version you
install, since Demand Gen fields are still evolving.
"""
import itertools

from config import DRY_RUN, GOOGLE_ADS_CUSTOMER_ID, GOOGLE_ADS_YAML

_fake = itertools.count(700000001)


def _client():
    from google.ads.googleads.client import GoogleAdsClient
    return GoogleAdsClient.load_from_storage(GOOGLE_ADS_YAML)


def _dry(label, fields):
    print(f"  [dry-run] Google Ads API · {label}")
    for k, v in fields.items():
        print(f"            {k} = {v}")
    return str(next(_fake))


def cid():
    return (GOOGLE_ADS_CUSTOMER_ID or "DRYRUN").replace("-", "")


# ---------- ② audience container ----------
def create_user_list(cohort_id: str, description: str) -> str:
    fields = {"name": f"Torque | {cohort_id}", "description": description,
              "crm_based_user_list.upload_key_type": "CONTACT_INFO",
              "crm_based_user_list.data_source_type": "FIRST_PARTY",
              "membership_life_span": 30}
    if DRY_RUN:
        return _dry("UserListService.mutate_user_lists (create Customer Match list)", fields)
    client = _client()
    op = client.get_type("UserListOperation")
    ul = op.create
    ul.name, ul.description = fields["name"], description
    ul.crm_based_user_list.upload_key_type = client.enums.CustomerMatchUploadKeyTypeEnum.CONTACT_INFO
    ul.crm_based_user_list.data_source_type = client.enums.UserListCrmDataSourceTypeEnum.FIRST_PARTY
    ul.membership_life_span = 30
    res = client.get_service("UserListService").mutate_user_lists(customer_id=cid(), operations=[op])
    return res.results[0].resource_name.split("/")[-1]


def user_list_size(user_list_id: str):
    q = f"SELECT user_list.size_for_display, user_list.size_for_search FROM user_list WHERE user_list.id = {user_list_id}"
    if DRY_RUN:
        _dry("GoogleAdsService.search (matched size)", {"query": q})
        return None
    rows = _client().get_service("GoogleAdsService").search(customer_id=cid(), query=q)
    for r in rows:
        return r.user_list.size_for_display
    return None


def find_user_list(name: str):
    """A GA4 audience shared through the GA4 link shows up here as a user list with the same name.
    Returns (user_list_id, size_for_display) or (None, None) if it hasn't arrived yet."""
    safe = name.replace("'", "")
    q = ("SELECT user_list.id, user_list.size_for_display, user_list.type FROM user_list "
         f"WHERE user_list.name = '{safe}'")
    if DRY_RUN:
        _dry("GoogleAdsService.search (find GA4-shared list)", {"query": q})
        return str(next(_fake)), 48000          # pretend it's shared and filled
    for r in _client().get_service("GoogleAdsService").search(customer_id=cid(), query=q):
        return str(r.user_list.id), r.user_list.size_for_display
    return None, None


# ---------- ③ Demand Gen launch ----------
def launch(li: dict, user_list_ids, media_budget_inr: float) -> dict:
    """Budget -> Demand Gen campaign (paused) -> ad group (YouTube channels, targets the list)
    -> video asset -> Demand Gen video responsive ad.
    user_list_ids: one list per site (e.g. CarDekho + ZigWheels GA4 audiences); the ad group targets all of them."""
    if isinstance(user_list_ids, str):
        user_list_ids = [user_list_ids]
    plan = {
        "campaign_budget": {"total_amount_micros": int(media_budget_inr * 1_000_000), "period": "CUSTOM",
                            "explicitly_shared": False},
        "campaign": {"name": f"Torque | {li['line_item_id']} | {li['name']}",
                     "advertising_channel_type": "DEMAND_GEN", "status": "PAUSED",
                     "bidding": "maximize_conversions" if li["objective"] == "leads" else "target_cpm / maximize_clicks",
                     "start_date": li["start_date"], "end_date": li["end_date"]},
        "ad_group": {"name": f"{li['line_item_id']} | {li['cohort_id']}",
                     "demand_gen_ad_group_settings.channel_controls": "YouTube in-stream, in-feed, Shorts only",
                     "audience": f"user lists {', '.join(user_list_ids)}  <-- the Torque cohort"},
        "asset": {"youtube_video_asset.youtube_video_id": li.get("youtube_video_id") or "VIDEO_ID"},
        "ad": {"demand_gen_video_responsive_ad": {
            "headlines": [li.get("headline")], "long_headlines": [li.get("headline")],
            "descriptions": [li.get("description")], "business_name": li.get("advertiser", "Advertiser"),
            "call_to_actions": [li.get("cta") or "LEARN_MORE"]}, "final_urls": [li["landing_url"]]},
    }
    if DRY_RUN:
        ids = {}
        for k in ("campaign_budget", "campaign", "ad_group", "asset", "ad"):
            ids[k] = _dry(f"create {k}", plan[k])
        return ids
    return _launch_live(li, user_list_ids, plan)


def _launch_live(li, user_list_ids, plan):  # pragma: no cover - needs live credentials
    client = _client()
    c = cid()
    ga = client.get_service("GoogleAdsService")
    # A single atomic mutate with temporary resource names keeps partial launches from happening.
    budget_rn = client.get_service("CampaignBudgetService").campaign_budget_path(c, "-1")
    campaign_rn = client.get_service("CampaignService").campaign_path(c, "-2")
    ad_group_rn = client.get_service("AdGroupService").ad_group_path(c, "-3")
    asset_rn = client.get_service("AssetService").asset_path(c, "-4")
    ops = []

    op = client.get_type("MutateOperation"); b = op.campaign_budget_operation.create
    b.resource_name = budget_rn; b.name = plan["campaign"]["name"] + " budget"
    b.total_amount_micros = plan["campaign_budget"]["total_amount_micros"]
    b.period = client.enums.BudgetPeriodEnum.CUSTOM_PERIOD; b.explicitly_shared = False
    ops.append(op)

    op = client.get_type("MutateOperation"); cp = op.campaign_operation.create
    cp.resource_name = campaign_rn; cp.name = plan["campaign"]["name"]
    cp.advertising_channel_type = client.enums.AdvertisingChannelTypeEnum.DEMAND_GEN
    cp.status = client.enums.CampaignStatusEnum.PAUSED
    cp.campaign_budget = budget_rn
    if li["objective"] == "leads":
        cp.maximize_conversions.target_cpa_micros = 0
    else:
        cp.maximize_clicks.cpc_bid_ceiling_micros = 0   # TODO: confirm allowed strategy for awareness
    cp.start_date = li["start_date"].replace("-", ""); cp.end_date = li["end_date"].replace("-", "")
    ops.append(op)

    op = client.get_type("MutateOperation"); ag = op.ad_group_operation.create
    ag.resource_name = ad_group_rn; ag.name = plan["ad_group"]["name"]; ag.campaign = campaign_rn
    ag.status = client.enums.AdGroupStatusEnum.ENABLED
    cc = ag.demand_gen_ad_group_settings.channel_controls          # YouTube surfaces only
    cc.selected_channels.youtube_in_stream = True
    cc.selected_channels.youtube_in_feed = True
    cc.selected_channels.youtube_shorts = True
    cc.selected_channels.discover = False; cc.selected_channels.gmail = False; cc.selected_channels.display = False
    ops.append(op)

    for ul in user_list_ids:   # TODO: Demand Gen may require an Audience resource instead; see Demand Gen audience docs
        op = client.get_type("MutateOperation"); crit = op.ad_group_criterion_operation.create
        crit.ad_group = ad_group_rn
        crit.user_list.user_list = client.get_service("UserListService").user_list_path(c, ul)
        ops.append(op)

    op = client.get_type("MutateOperation"); a = op.asset_operation.create
    a.resource_name = asset_rn; a.youtube_video_asset.youtube_video_id = li["youtube_video_id"]
    ops.append(op)

    op = client.get_type("MutateOperation"); ada = op.ad_group_ad_operation.create
    ada.ad_group = ad_group_rn; ada.status = client.enums.AdGroupAdStatusEnum.ENABLED
    ad = ada.ad; ad.final_urls.append(li["landing_url"])
    dg = ad.demand_gen_video_responsive_ad
    for fld, val in (("headlines", li["headline"]), ("long_headlines", li["headline"]), ("descriptions", li["description"])):
        t = client.get_type("AdTextAsset"); t.text = val; getattr(dg, fld).append(t)
    dg.business_name.text = li.get("advertiser", "Advertiser")
    v = client.get_type("AdVideoAsset"); v.asset = asset_rn; dg.videos.append(v)
    ops.append(op)

    res = ga.mutate(customer_id=c, mutate_operations=ops)
    names = [r for r in res.mutate_operation_responses]
    return {"campaign_budget": names[0].campaign_budget_result.resource_name,
            "campaign": names[1].campaign_result.resource_name.split("/")[-1],
            "ad_group": names[2].ad_group_result.resource_name.split("/")[-1],
            "ad": names[-1].ad_group_ad_result.resource_name.split("~")[-1]}


def set_campaign_status(campaign_id: str, status: str):  # ENABLED | PAUSED
    if DRY_RUN:
        return _dry("CampaignService.mutate_campaigns (status)", {"campaign": campaign_id, "status": status})
    client = _client()
    op = client.get_type("CampaignOperation")
    op.update.resource_name = client.get_service("CampaignService").campaign_path(cid(), campaign_id)
    op.update.status = getattr(client.enums.CampaignStatusEnum, status)
    op.update_mask.paths.append("status")
    client.get_service("CampaignService").mutate_campaigns(customer_id=cid(), operations=[op])


# ---------- ④ sync back ----------
def stats(campaign_id: str, day: str):
    q = ("SELECT metrics.impressions, metrics.video_trueview_views, metrics.clicks, metrics.conversions, "
         f"metrics.cost_micros, ad_group_ad.policy_summary.approval_status FROM ad_group_ad "
         f"WHERE campaign.id = {campaign_id} AND segments.date = '{day}'")
    if DRY_RUN:
        _dry("GoogleAdsService.search (daily stats + review status)", {"query": q})
        return {}
    out = {"impressions": 0, "views": 0, "clicks": 0, "conversions": 0.0, "spend": 0.0, "review": None}
    for r in _client().get_service("GoogleAdsService").search(customer_id=cid(), query=q):
        m = r.metrics
        out["impressions"] += m.impressions; out["views"] += m.video_trueview_views
        out["clicks"] += m.clicks; out["conversions"] += m.conversions; out["spend"] += m.cost_micros / 1e6
        out["review"] = r.ad_group_ad.policy_summary.approval_status.name
    return out

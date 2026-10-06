"""Google Data Manager API: upload / remove Customer Match members.

Since 1 Apr 2026 new integrations can't upload Customer Match through the Google Ads API;
the Data Manager API is the supported path.
Docs: https://developers.google.com/data-manager/api/devguides/audiences/send-audience-members
"""
from config import (DM_BATCH, DM_ENDPOINT, DM_SCOPE, DRY_RUN, GOOGLE_ADS_CUSTOMER_ID,
                    GOOGLE_ADS_LOGIN_CUSTOMER_ID, GOOGLE_CREDENTIALS_FILE)
from destinations.http import call


def _headers():
    if DRY_RUN:
        return {}
    import google.auth.transport.requests
    from google.oauth2 import service_account
    creds = service_account.Credentials.from_service_account_file(GOOGLE_CREDENTIALS_FILE, scopes=[DM_SCOPE])
    creds.refresh(google.auth.transport.requests.Request())
    return {"Authorization": f"Bearer {creds.token}"}


def _destination(user_list_id: str):
    d = {"operatingAccount": {"accountType": "GOOGLE_ADS", "accountId": GOOGLE_ADS_CUSTOMER_ID or "DRYRUN"},
         "productDestinationId": str(user_list_id)}
    if GOOGLE_ADS_LOGIN_CUSTOMER_ID:
        d["loginAccount"] = {"accountType": "GOOGLE_ADS", "accountId": GOOGLE_ADS_LOGIN_CUSTOMER_ID}
    return d


def _members(members):
    out = []
    for m in members:
        ids = []
        if m["email_sha256"]:
            ids.append({"emailAddress": m["email_sha256"]})
        if m["phone_sha256"]:
            ids.append({"phoneNumber": m["phone_sha256"]})
        if ids:
            out.append({"userData": {"userIdentifiers": ids}})
    return out


def _send(method: str, user_list_id: str, members: list[dict], validate_only=False):
    for i in range(0, len(members), DM_BATCH):
        batch = _members(members[i:i + DM_BATCH])
        body = {
            "destinations": [_destination(user_list_id)],
            "audienceMembers": batch,
            "encoding": "HEX",
            # every member in the list already passed Torque's off-site consent filter
            "consent": {"adUserData": "CONSENT_GRANTED", "adPersonalization": "CONSENT_GRANTED"},
            "validateOnly": validate_only,
        }
        if method == "ingest":
            body["termsOfService"] = {"customerMatchTermsOfServiceStatus": "ACCEPTED"}
        call("POST", f"{DM_ENDPOINT}/audienceMembers:{method}", json_body=body, headers=_headers(),
             label=f"{method} {len(batch)} members -> user list {user_list_id}")


def add_members(user_list_id, members):
    _send("ingest", user_list_id, members)


def remove_members(user_list_id, members):
    _send("remove", user_list_id, members)

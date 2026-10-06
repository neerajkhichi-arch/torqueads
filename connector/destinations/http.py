"""One place that either sends a request or, in DRY_RUN, prints it and returns a fake id."""
import itertools
import json

import requests

from config import DRY_RUN

_fake = itertools.count(900000001)


def call(method: str, url: str, *, params=None, json_body=None, headers=None, label=""):
    if DRY_RUN:
        shown = dict(params or {})
        if "access_token" in shown:
            shown["access_token"] = "***"
        body = json_body if json_body is not None else shown
        preview = json.dumps(body, ensure_ascii=False)
        if len(preview) > 600:
            preview = preview[:600] + " …"
        print(f"  [dry-run] {method} {url}  {label}\n            {preview}")
        return {"id": str(next(_fake)), "dry_run": True, "num_received": _count_rows(body)}
    r = requests.request(method, url, params=params, json=json_body, headers=headers, timeout=60)
    if r.status_code >= 400:
        raise RuntimeError(f"{method} {url} -> {r.status_code}: {r.text[:500]}")
    return r.json() if r.content else {}


def _count_rows(body):
    if isinstance(body, dict):
        p = body.get("payload")
        if isinstance(p, str):
            try:
                p = json.loads(p)
            except ValueError:
                p = None
        if isinstance(p, dict) and "data" in p:
            return len(p["data"])
        if "audienceMembers" in body:
            return len(body["audienceMembers"])
    return None

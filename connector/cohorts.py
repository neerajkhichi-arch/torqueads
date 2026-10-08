"""Torque cohort catalog: the building blocks an advertiser can pick, and how each one
is expressed as a GA4 audience on each of our sites.

A cohort is  vertical · category · price band · intent · recency, e.g.
    car.suv.10_20l.price.30d   = car SUV pages, ₹10–20L models, looked at on-road price, last 30 days

Fixed building blocks (instead of free-form rules) keep identical picks on one GA4 audience,
which matters because each GA4 property can hold a limited number of audiences.

SITE_RULES says how each block maps to GA4 data on each property. URL patterns are the
fallback; once a `price_bucket` event parameter is registered as a custom dimension,
set price_param and price bands match on it directly instead of on model lists.
"""
import os

# ---- the building blocks --------------------------------------------------------------
VERTICALS = {"car": ["cardekho", "zigwheels_car"], "bike": ["bikedekho", "zigwheels_bike"]}
CATEGORIES = {
    "car":  ["suv", "sedan", "hatchback", "muv", "ev", "luxury"],
    "bike": ["commuter", "sports", "scooter", "cruiser", "ev"],
}
PRICE_BANDS = {
    "car":  ["under_5l", "5_10l", "10_20l", "20_50l", "50l_plus"],
    "bike": ["under_1l", "1_2l", "2l_plus"],
}
INTENTS = {   # what the visitor did, beyond viewing pages in the category
    "any":      None,
    "price":    {"url": ["on-road-price", "/price-in-"]},
    "compare":  {"url": ["/compare/", "-vs-"]},
    "reviews":  {"url": ["/reviews", "/user-reviews"]},
    "lead":     {"event": ["generate_lead", "lead_submit", "test_drive_request"]},
}
RECENCY_DAYS = [7, 30, 90]

# ---- how blocks map to GA4 on each site -------------------------------------------------
# property ids from the GA4 360 accounts (Girnar Software Private Limited org)
SITE_RULES = {
    "cardekho": {
        "property_id": os.getenv("GA4_PROP_CARDEKHO", "151299973"),
        "host": "www.cardekho.com",
        "category_url": {"suv": ["/suv", "body-type/suv"], "sedan": ["/sedan"], "hatchback": ["/hatchback"],
                          "muv": ["/muv"], "ev": ["/electric-cars", "/ev"], "luxury": ["/luxury"]},
        "price_param": os.getenv("GA4_PRICE_PARAM_CARDEKHO", ""),   # e.g. price_bucket, once registered
    },
    "zigwheels_car": {
        "property_id": os.getenv("GA4_PROP_ZIGWHEELS", ""),        # TODO: main ZigWheels GA4 property id
        "host": "www.zigwheels.com",
        "category_url": {"suv": ["/suv"], "sedan": ["/sedan"], "hatchback": ["/hatchback"], "muv": ["/muv"],
                          "ev": ["/electric-cars"], "luxury": ["/luxury"]},
        "price_param": os.getenv("GA4_PRICE_PARAM_ZIGWHEELS", ""),
        "path_prefix": "/newcars",
    },
    "bikedekho": {
        "property_id": os.getenv("GA4_PROP_BIKEDEKHO", "346078998"),
        "host": "www.bikedekho.com",
        "category_url": {"commuter": ["/commuter"], "sports": ["/sports"], "scooter": ["/scooters"],
                          "cruiser": ["/cruiser"], "ev": ["/electric-bikes", "/electric-scooters"]},
        "price_param": os.getenv("GA4_PRICE_PARAM_BIKEDEKHO", ""),
    },
    "zigwheels_bike": {
        "property_id": os.getenv("GA4_PROP_ZIGWHEELS", ""),
        "host": "www.zigwheels.com",
        "category_url": {"commuter": ["/commuter"], "sports": ["/sports"], "scooter": ["/scooters"],
                          "cruiser": ["/cruiser"], "ev": ["/electric-bikes"]},
        "price_param": os.getenv("GA4_PRICE_PARAM_ZIGWHEELS", ""),
        "path_prefix": "/newbikes",
    },
}

# Until a price parameter exists in GA4, a price band = "viewed one of these models".
# Kept short (GA4 limits filter size); refresh from the Torque model catalog.
MODELS_BY_BAND = {
    ("suv", "10_20l"): ["hyundai/creta", "kia/seltos", "maruti/grand-vitara", "toyota/hyryder", "tata/harrier",
                        "mahindra/xuv700", "mahindra/scorpio-n", "mg/astor", "honda/elevate", "skoda/kushaq",
                        "volkswagen/taigun", "tata/curvv"],
    ("suv", "5_10l"):  ["tata/punch", "hyundai/exter", "maruti/brezza", "tata/nexon", "kia/sonet", "hyundai/venue",
                        "mahindra/xuv-3xo", "nissan/magnite", "renault/kiger", "maruti/fronx"],
    ("suv", "20_50l"): ["toyota/fortuner", "mahindra/xuv700", "jeep/meridian", "mg/gloster", "skoda/kodiaq",
                        "hyundai/tucson", "jeep/compass"],
}

# Cohorts we keep warm in GA4 so the most-picked choices are ready instantly.
PREBUILD = [
    "car.suv.10_20l.any.30d", "car.suv.10_20l.price.30d", "car.suv.5_10l.any.30d", "car.suv.20_50l.any.30d",
    "car.ev.any.any.30d", "car.sedan.any.any.30d", "car.hatchback.any.any.30d", "car.luxury.any.any.30d",
    "bike.commuter.any.any.30d", "bike.scooter.any.any.30d", "bike.sports.any.any.30d", "bike.ev.any.any.30d",
]

# legacy ids used by the prototype / demo
ALIASES = {"suv_15_20l": "car.suv.10_20l.any.30d", "ev_10_20l": "car.ev.any.any.30d",
           "luxury_50l_plus": "car.luxury.any.any.30d"}


def parse(key: str) -> dict:
    key = ALIASES.get(key, key)
    try:
        vertical, category, band, intent, rec = key.split(".")
        days = int(rec.rstrip("d"))
    except ValueError:
        raise ValueError(f"Bad cohort key {key!r}; expected vertical.category.band.intent.<n>d")
    if vertical not in VERTICALS or category not in CATEGORIES[vertical]:
        raise ValueError(f"Unknown category in {key}")
    if band != "any" and band not in PRICE_BANDS[vertical]:
        raise ValueError(f"Unknown price band in {key}")
    if intent not in INTENTS or days not in RECENCY_DAYS:
        raise ValueError(f"Unknown intent/recency in {key}")
    return {"key": key, "vertical": vertical, "category": category, "band": band, "intent": intent, "days": days}


def label(c: dict) -> str:
    band = "" if c["band"] == "any" else " · ₹" + c["band"].replace("_", "–").replace("l", "L").replace("under–", "under ")
    intent = "" if c["intent"] == "any" else f" · {c['intent']} intent"
    return f"{c['category'].upper() if len(c['category']) <= 3 else c['category'].title()}{band}{intent} · {c['days']}d"


def sites_for(c: dict):
    """Sites this cohort runs on that have a GA4 property configured."""
    return [s for s in VERTICALS[c["vertical"]] if SITE_RULES[s]["property_id"]]

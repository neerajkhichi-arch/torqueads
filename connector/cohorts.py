"""Torque cohort catalog: the building blocks an advertiser can pick, and how each one
is expressed as a GA4 audience on each of our sites, using the event parameters our sites
already send to GA4 (vehicleSegment, vehiclePrice, pageTemplates …).

A cohort is  vertical · category · price band · intent · recency, e.g.
    car.suv.10_20l.price.30d   = car SUV pages, ₹10–20L models, looked at on-road price, last 30 days

Fixed building blocks (instead of free-form rules) keep identical picks on one GA4 audience,
which matters because each GA4 property can hold a limited number of audiences.

SITE_RULES says how each block maps to GA4 event parameters on each property.
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
# Each rule is (event parameter, [values it CONTAINS]) — OR across the values.
# Parameter names and values were read from the live sites' GA4 hits (Oct 2026):
#   cardekho  : vehicleSegment="suv cars", vehiclePrice="10lakh-15lakh, 15lakh-20lakh, 20lakh-35lakh",
#               pageTemplates="model overviewtab" | "model pricetab" | "compare resultpage", fuelType="diesel, petrol"
#   bikedekho : vehicleSegment="scooters", vehiclePrice="80K - 1.2L", same pageTemplates/fuelType names
#   zigwheels : body_type_new="suv cars", price_segment_new="10lakh-20lakh, 20lakh-40lakh", template_name_new
# Values marked "confirm" follow the same pattern but weren't seen yet; check them in GA4 before relying on them.
SITE_RULES = {
    "cardekho": {
        "property_id": os.getenv("GA4_PROP_CARDEKHO", "151299973"),
        "host": "www.cardekho.com",
        "category": {"suv": ("vehicleSegment", ["suv"]), "sedan": ("vehicleSegment", ["sedan"]),
                     "hatchback": ("vehicleSegment", ["hatchback"]), "muv": ("vehicleSegment", ["muv"]),
                     "ev": ("fuelType", ["electric"]), "luxury": ("vehicleSegment", ["luxury"])},   # sedan..luxury: confirm
        "price": ("vehiclePrice", {"5_10l": ["5lakh-10lakh"],                                    # confirm
                                   "10_20l": ["10lakh-15lakh", "15lakh-20lakh"],
                                   "20_50l": ["20lakh-35lakh", "35lakh-50lakh"]}),               # 35-50: confirm
        "intent": ("pageTemplates", {"price": ["pricetab"], "compare": ["compare"], "reviews": ["review"]}),
    },
    "zigwheels_car": {
        "property_id": os.getenv("GA4_PROP_ZIGWHEELS", ""),        # TODO: main ZigWheels GA4 property (stream G-NNM7DKZYPC)
        "host": "www.zigwheels.com",
        "category": {"suv": ("body_type_new", ["suv"]), "sedan": ("body_type_new", ["sedan"]),
                     "hatchback": ("body_type_new", ["hatchback"]), "muv": ("body_type_new", ["muv"]),
                     "ev": ("fuel_type_new", ["electric"]), "luxury": ("body_type_new", ["luxury"])},
        "price": ("price_segment_new", {"10_20l": ["10lakh-20lakh"], "20_50l": ["20lakh-40lakh"]}),
        "intent": ("template_name_new", {"price": ["pricetab"], "compare": ["compare"], "reviews": ["review"]}),
    },
    "bikedekho": {
        "property_id": os.getenv("GA4_PROP_BIKEDEKHO", "346078998"),
        "host": "www.bikedekho.com",
        "category": {"commuter": ("vehicleSegment", ["commuter"]), "sports": ("vehicleSegment", ["sports"]),
                     "scooter": ("vehicleSegment", ["scooter"]), "cruiser": ("vehicleSegment", ["cruiser"]),
                     "ev": ("fuelType", ["electric"])},
        "price": ("vehiclePrice", {"under_1l": ["80K - 1.2L"]}),   # BikeDekho buckets differ; map the rest after a GA4 check
        "intent": ("pageTemplates", {"price": ["pricetab"], "compare": ["compare"], "reviews": ["review"]}),
    },
    "zigwheels_bike": {
        "property_id": os.getenv("GA4_PROP_ZIGWHEELS", ""),
        "host": "www.zigwheels.com",
        "category": {"commuter": ("body_type_new", ["commuter"]), "sports": ("body_type_new", ["sports"]),
                     "scooter": ("body_type_new", ["scooter"]), "cruiser": ("body_type_new", ["cruiser"]),
                     "ev": ("fuel_type_new", ["electric"])},
        "price": ("price_segment_new", {}),
        "intent": ("template_name_new", {"price": ["pricetab"], "compare": ["compare"], "reviews": ["review"]}),
    },
}

# Fallback only: if a site has no price parameter for a band, a band = "viewed one of these models".
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

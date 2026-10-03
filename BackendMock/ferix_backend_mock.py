# /// script
# requires-python = "==3.11.*"
# dependencies = [
#   "codewords-client==0.4.11",
#   "fastapi==0.116.1"
# ]
# [tool.env-checker]
# env_vars = [
#   "PORT=8000",
#   "LOGLEVEL=INFO",
#   "CODEWORDS_API_KEY",
#   "CODEWORDS_RUNTIME_URI"
# ]
# ///

import hashlib
import json
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from codewords_client import logger, redis_client, run_service
from fastapi import FastAPI, Header, HTTPException, Query, Request
from pydantic import BaseModel, Field

SESSION_TTL = 60 * 60 * 24 * 30
FREE_SHIPPING_OVER = 120.0
TAX_RATE = 0.075
STANDARD_SHIPPING = 6.5
EXPRESS_SHIPPING = 14.0
DEMO_EMAIL = "demo@ferixas.com"
DEMO_PASSWORD = "Ferixas123"

app = FastAPI(
    title="Ferixas Commerce API",
    description=(
        "The Ferixas commerce platform API. Serves the customer, merchant and admin "
        "systems from one catalogue, one cart and one checkout."
    ),
    version="1.0.0",
)


@app.middleware("http")
async def carry_credentials(request: Request, call_next):
    """Let the caller send the session token and cart id with the request itself.

    The runtime proxy does not forward custom headers, so credentials arrive in
    the query string (reads) or the JSON body (writes). They are lifted onto the
    internal request headers here, where every endpoint already reads them.
    """
    token = request.query_params.get("session")
    cart = request.query_params.get("cartId")
    if request.method in {"POST", "PATCH", "PUT", "DELETE"}:
        raw = await request.body()
        if raw:
            try:
                data = json.loads(raw)
            except (ValueError, TypeError):
                data = None
            if isinstance(data, dict):
                token = data.get("session") or token
                cart = data.get("cartId") or cart
    headers = list(request.scope["headers"])
    if token:
        headers.append((b"x-ferix-session", str(token).encode()))
    if cart:
        headers.append((b"x-ferix-cart", str(cart).encode()))
    request.scope["headers"] = headers
    return await call_next(request)

# ---------------------------------------------------------------------------
# Catalogue — stands in for the platform database
# ---------------------------------------------------------------------------

CATEGORIES: List[Dict[str, Any]] = [
    {"slug": "electronics", "name": "Electronics", "glyph": "Cpu", "blurb": "Everyday tech that earns its place"},
    {"slug": "audio", "name": "Audio", "glyph": "Headphones", "blurb": "Headphones, speakers and studio gear"},
    {"slug": "computing", "name": "Computing", "glyph": "Laptop", "blurb": "Laptops, keyboards and desks"},
    {"slug": "gaming", "name": "Gaming", "glyph": "Gamepad2", "blurb": "Controllers, monitors and precision gear"},
    {"slug": "phones", "name": "Phones", "glyph": "Smartphone", "blurb": "Handsets, cases and charging"},
    {"slug": "fashion", "name": "Fashion", "glyph": "Shirt", "blurb": "Tailoring, knitwear and footwear"},
    {"slug": "home", "name": "Home", "glyph": "Sofa", "blurb": "Furniture, lighting and textiles"},
    {"slug": "beauty", "name": "Beauty", "glyph": "Sparkles", "blurb": "Skincare and everyday rituals"},
    {"slug": "sports", "name": "Sports", "glyph": "Dumbbell", "blurb": "Training and recovery"},
    {"slug": "pantry", "name": "Pantry", "glyph": "ShoppingBasket", "blurb": "Coffee, oils and store-cupboard staples"},
]

COLLECTIONS: List[Dict[str, Any]] = [
    {"slug": "autumn-edit", "name": "The Autumn Edit", "blurb": "Warm layers, lighting and slow mornings"},
    {"slug": "work-from-anywhere", "name": "Work From Anywhere", "blurb": "Desk kit that travels"},
    {"slug": "audio-upgrade", "name": "Audio Upgrade", "blurb": "Everything that plays"},
    {"slug": "gift-guide", "name": "Gift Guide", "blurb": "Highly rated, easy to give"},
    {"slug": "under-100", "name": "Under $100", "blurb": "Small things, real quality"},
]

MERCHANTS: List[Dict[str, Any]] = [
    {
        "id": "abc-electronics", "slug": "abc-electronics", "name": "ABC Electronics",
        "tagline": "Computing, audio and everyday tech that lasts",
        "about": "ABC Electronics has supplied Lagos with dependable hardware since 2023. Every unit is bench-tested before it ships, and the support line is answered by the people who pack the boxes.",
        "domain": "abc.ferixas.com", "customDomain": "abcelectronics.com", "plan": "Scale",
        "status": "active", "verified": True, "location": "Lagos, Nigeria", "since": "2023-04-11",
        "rating": 4.7, "reviewCount": 1284, "followers": 8420, "commissionPct": 8.0,
        "balance": 18422.4, "pendingPayout": 2310.8, "marketplaceEnabled": True,
        "responseRate": 97, "fulfilmentRate": 98,
        "brand": {"template": "FERRUM", "canvas": "#f5f2ec", "surface": "#ffffff", "ink": "#14110e",
                  "muted": "#6b635a", "accent": "#e4572e", "accentInk": "#ffffff",
                  "displayFont": "Bricolage Grotesque", "radius": 3, "hero": "split"},
    },
    {
        "id": "aurasound", "slug": "aurasound", "name": "AuraSound Audio",
        "tagline": "Tuned by ear in Cape Town",
        "about": "AuraSound builds audio for people who listen closely. Drivers are measured in-house and every model is tuned against a reference pair before release.",
        "domain": "aurasound.ferixas.com", "customDomain": "aurasound.co.za", "plan": "Growth",
        "status": "active", "verified": True, "location": "Cape Town, South Africa", "since": "2023-09-02",
        "rating": 4.8, "reviewCount": 902, "followers": 12140, "commissionPct": 7.5,
        "balance": 24180.1, "pendingPayout": 4180.0, "marketplaceEnabled": True,
        "responseRate": 98, "fulfilmentRate": 99,
        "brand": {"template": "GRID", "canvas": "#0b0d11", "surface": "#131821", "ink": "#e9ecf1",
                  "muted": "#8b95a6", "accent": "#2f6f8f", "accentInk": "#ffffff",
                  "displayFont": "Bricolage Grotesque", "radius": 3, "hero": "banner"},
    },
    {
        "id": "nova-fashion", "slug": "nova-fashion", "name": "Nova Fashion",
        "tagline": "Quiet tailoring, made to be worn",
        "about": "Nova Fashion cuts small runs in Accra. Natural fibres, generous seams and a repair service on everything they sell.",
        "domain": "nova.ferixas.com", "customDomain": None, "plan": "Growth",
        "status": "active", "verified": True, "location": "Accra, Ghana", "since": "2024-01-19",
        "rating": 4.6, "reviewCount": 640, "followers": 6180, "commissionPct": 9.0,
        "balance": 9310.6, "pendingPayout": 1420.3, "marketplaceEnabled": True,
        "responseRate": 94, "fulfilmentRate": 96,
        "brand": {"template": "ATELIER", "canvas": "#f5f2ec", "surface": "#ebe6dc", "ink": "#14110e",
                  "muted": "#6b635a", "accent": "#6b4a5c", "accentInk": "#ffffff",
                  "displayFont": "Bricolage Grotesque", "radius": 0, "hero": "centered"},
    },
    {
        "id": "sahel-supply", "slug": "sahel-supply", "name": "Sahel Supply",
        "tagline": "Store-cupboard staples done properly",
        "about": "Sahel Supply works directly with growers across the Sahel. Single-origin lots, cold-pressed oils and spice blends milled to order.",
        "domain": "sahel.ferixas.com", "customDomain": None, "plan": "Starter",
        "status": "active", "verified": True, "location": "Kano, Nigeria", "since": "2024-03-08",
        "rating": 4.9, "reviewCount": 512, "followers": 5320, "commissionPct": 10.0,
        "balance": 6120.9, "pendingPayout": 880.4, "marketplaceEnabled": True,
        "responseRate": 96, "fulfilmentRate": 97,
        "brand": {"template": "HEARTH", "canvas": "#f5f2ec", "surface": "#ffffff", "ink": "#14110e",
                  "muted": "#6b635a", "accent": "#1f4b43", "accentInk": "#ffffff",
                  "displayFont": "Bricolage Grotesque", "radius": 6, "hero": "split"},
    },
    {
        "id": "lumen-home", "slug": "lumen-home", "name": "Lumen Home",
        "tagline": "Light, linen and stoneware",
        "about": "Lumen Home makes domestic objects in Nairobi with a long life in mind. Replaceable parts, honest materials, no seasonal churn.",
        "domain": "lumen.ferixas.com", "customDomain": None, "plan": "Growth",
        "status": "active", "verified": True, "location": "Nairobi, Kenya", "since": "2023-11-27",
        "rating": 4.7, "reviewCount": 388, "followers": 4110, "commissionPct": 9.5,
        "balance": 7840.2, "pendingPayout": 990.7, "marketplaceEnabled": True,
        "responseRate": 95, "fulfilmentRate": 95,
        "brand": {"template": "HEARTH", "canvas": "#ebe6dc", "surface": "#ffffff", "ink": "#14110e",
                  "muted": "#6b635a", "accent": "#c9a24d", "accentInk": "#14110e",
                  "displayFont": "Bricolage Grotesque", "radius": 8, "hero": "centered"},
    },
    {
        "id": "pixel-gaming", "slug": "pixel-gaming", "name": "PixelForge Gaming",
        "tagline": "Precision gear for long sessions",
        "about": "PixelForge tests every switch, sensor and panel before it goes on sale. Built for people who notice the difference.",
        "domain": "pixelforge.ferixas.com", "customDomain": None, "plan": "Growth",
        "status": "active", "verified": True, "location": "Lagos, Nigeria", "since": "2024-02-14",
        "rating": 4.6, "reviewCount": 456, "followers": 6880, "commissionPct": 8.5,
        "balance": 11260.5, "pendingPayout": 1730.9, "marketplaceEnabled": True,
        "responseRate": 93, "fulfilmentRate": 96,
        "brand": {"template": "CIRCUIT", "canvas": "#0b0d11", "surface": "#131821", "ink": "#e9ecf1",
                  "muted": "#8b95a6", "accent": "#c9f24d", "accentInk": "#0b0d11",
                  "displayFont": "Bricolage Grotesque", "radius": 2, "hero": "split"},
    },
    {
        "id": "verdant-beauty", "slug": "verdant-beauty", "name": "Verdant Beauty",
        "tagline": "Short ingredient lists that work",
        "about": "Verdant Beauty formulates in Abuja with clinically studied actives and no filler. Batch dates are printed on every bottle.",
        "domain": "verdant.ferixas.com", "customDomain": None, "plan": "Starter",
        "status": "active", "verified": True, "location": "Abuja, Nigeria", "since": "2024-05-06",
        "rating": 4.8, "reviewCount": 274, "followers": 3640, "commissionPct": 11.0,
        "balance": 4380.3, "pendingPayout": 640.1, "marketplaceEnabled": True,
        "responseRate": 92, "fulfilmentRate": 94,
        "brand": {"template": "ATELIER", "canvas": "#f5f2ec", "surface": "#ebe6dc", "ink": "#14110e",
                  "muted": "#6b635a", "accent": "#2f6f8f", "accentInk": "#ffffff",
                  "displayFont": "Bricolage Grotesque", "radius": 4, "hero": "centered"},
    },
    {
        "id": "ferixas-official", "slug": "ferixas-official", "name": "Ferixas Official Store",
        "tagline": "Sold by the platform, on the same terms as everyone else",
        "about": "The platform sells its own hardware through exactly the same catalogue, the same channels and the same checkout as every other tenant. Nothing special-cased, nothing privileged.",
        "domain": "ferixas.com", "customDomain": None, "plan": "Platform",
        "status": "active", "verified": True, "location": "Lagos, Nigeria", "since": "2023-01-04",
        "rating": 4.5, "reviewCount": 986, "followers": 15420, "commissionPct": 0.0,
        "balance": 0.0, "pendingPayout": 0.0, "marketplaceEnabled": True,
        "responseRate": 99, "fulfilmentRate": 99,
        "brand": {"template": "FERRUM", "canvas": "#f5f2ec", "surface": "#ffffff", "ink": "#14110e",
                  "muted": "#6b635a", "accent": "#c9a24d", "accentInk": "#14110e",
                  "displayFont": "Bricolage Grotesque", "radius": 3, "hero": "banner"},
    },
]

MERCHANT_BY_ID = {m["id"]: m for m in MERCHANTS}
MERCHANT_BY_SLUG = {m["slug"]: m for m in MERCHANTS}

# slug, title, merchant, category, price, compareAt, sku, stock, rating, reviewCount, sold30d, views30d
_PRODUCT_ROWS = [
    ("aurasound-pro-anc-headphones", "AuraSound Pro ANC Headphones", "aurasound", "audio", 249.0, 299.0, "AUR-PRO-ANC", 42, 4.8, 412, 318, 9120),
    ("aurasound-studio-monitor-pair", "AuraSound Studio Monitor Pair", "aurasound", "audio", 389.0, None, "AUR-STM-PR", 18, 4.9, 96, 74, 2140),
    ("aurasound-go-mini-speaker", "AuraSound Go Mini Speaker", "aurasound", "audio", 59.0, 79.0, "AUR-GO-MINI", 140, 4.5, 268, 612, 15380),
    ("abc-ultrabook-14-pro", "ABC Ultrabook 14 Pro", "abc-electronics", "computing", 1299.0, 1449.0, "ABC-UB14-PRO", 23, 4.7, 182, 96, 7420),
    ("abc-mechanical-keyboard-k87", "ABC Mechanical Keyboard K87", "abc-electronics", "computing", 129.0, None, "ABC-K87", 64, 4.6, 240, 410, 11240),
    ("abc-4k-webcam-studio", "ABC 4K Webcam Studio", "abc-electronics", "electronics", 119.0, 139.0, "ABC-CAM-4K", 88, 4.4, 150, 286, 8010),
    ("abc-noise-cancelling-earbuds", "ABC Noise-Cancelling Earbuds", "abc-electronics", "audio", 89.0, 109.0, "ABC-NC-BUD", 210, 4.3, 520, 940, 21100),
    ("abc-smart-thermostat-h1", "ABC Smart Thermostat H1", "abc-electronics", "home", 179.0, None, "ABC-THRM-H1", 37, 4.5, 88, 142, 3980),
    ("abc-usb-c-dock-12", "ABC USB-C Dock 12", "abc-electronics", "computing", 159.0, 189.0, "ABC-DOCK-12", 54, 4.5, 176, 232, 6410),
    ("nova-linen-overshirt", "Nova Linen Overshirt", "nova-fashion", "fashion", 96.0, 120.0, "NOV-LIN-OVR", 54, 4.7, 164, 238, 6240),
    ("nova-tailored-wool-coat", "Nova Tailored Wool Coat", "nova-fashion", "fashion", 289.0, None, "NOV-WOOL-CT", 21, 4.8, 74, 62, 2980),
    ("nova-everyday-sneaker", "Nova Everyday Sneaker", "nova-fashion", "fashion", 118.0, 145.0, "NOV-SNK-EV", 132, 4.6, 392, 566, 14280),
    ("nova-silk-scarf", "Nova Silk Scarf", "nova-fashion", "fashion", 48.0, None, "NOV-SLK-SCF", 88, 4.4, 120, 190, 4120),
    ("nova-cotton-tee-heavy", "Nova Heavy Cotton Tee", "nova-fashion", "fashion", 38.0, 45.0, "NOV-TEE-HV", 210, 4.5, 480, 890, 20400),
    ("sahel-cold-pressed-oil-trio", "Sahel Cold-Pressed Oil Trio", "sahel-supply", "pantry", 42.0, None, "SAH-OIL-TRIO", 180, 4.9, 310, 705, 16900),
    ("sahel-single-origin-coffee", "Sahel Single-Origin Coffee", "sahel-supply", "pantry", 24.0, 29.0, "SAH-COF-1KG", 260, 4.8, 470, 1120, 24800),
    ("sahel-spice-cellar-set", "Sahel Spice Cellar Set", "sahel-supply", "pantry", 58.0, None, "SAH-SPC-SET", 74, 4.7, 164, 206, 5320),
    ("sahel-wild-honey-raw", "Sahel Raw Wild Honey", "sahel-supply", "pantry", 32.0, 38.0, "SAH-HNY-RAW", 140, 4.8, 240, 480, 11800),
    ("lumen-woven-floor-lamp", "Lumen Woven Floor Lamp", "lumen-home", "home", 229.0, 279.0, "LUM-FLR-WV", 26, 4.6, 98, 132, 4280),
    ("lumen-stoneware-dinner-set", "Lumen Stoneware Dinner Set", "lumen-home", "home", 148.0, None, "LUM-DIN-ST", 48, 4.7, 142, 221, 6180),
    ("lumen-linen-bedding-king", "Lumen Linen Bedding King", "lumen-home", "home", 319.0, 369.0, "LUM-BED-K", 19, 4.8, 88, 54, 2040),
    ("pixelforge-precision-mouse", "PixelForge Precision Mouse", "pixel-gaming", "gaming", 79.0, 99.0, "PXF-MSE-PR", 118, 4.6, 264, 470, 13840),
    ("pixelforge-240hz-monitor", "PixelForge 240Hz Monitor", "pixel-gaming", "gaming", 449.0, 499.0, "PXF-MON-240", 31, 4.7, 120, 158, 5620),
    ("pixelforge-elite-controller", "PixelForge Elite Controller", "pixel-gaming", "gaming", 149.0, None, "PXF-CTL-EL", 72, 4.5, 186, 340, 9840),
    ("pixelforge-headset-pro", "PixelForge Pro Headset", "pixel-gaming", "gaming", 119.0, 139.0, "PXF-HST-PRO", 94, 4.4, 210, 396, 10720),
    ("verdant-vitamin-c-serum", "Verdant Vitamin C Serum", "verdant-beauty", "beauty", 38.0, 46.0, "VER-SER-C", 240, 4.8, 410, 880, 19200),
    ("verdant-clay-mask-duo", "Verdant Clay Mask Duo", "verdant-beauty", "beauty", 32.0, None, "VER-MSK-DUO", 196, 4.6, 220, 520, 12400),
    ("verdant-barrier-cream", "Verdant Barrier Cream", "verdant-beauty", "beauty", 44.0, 52.0, "VER-CRM-BAR", 168, 4.7, 296, 610, 14600),
    ("ferixas-power-bank-20k", "Ferixas 20K Power Bank", "ferixas-official", "electronics", 69.0, 84.0, "FRX-PWR-20K", 320, 4.5, 300, 760, 18600),
    ("ferixas-usb-c-hub-8", "Ferixas 8-in-1 USB-C Hub", "ferixas-official", "electronics", 89.0, None, "FRX-HUB-8", 150, 4.6, 240, 430, 11240),
    ("ferixas-travel-adapter", "Ferixas Universal Travel Adapter", "ferixas-official", "electronics", 34.0, 42.0, "FRX-ADP-UNI", 410, 4.4, 410, 1080, 26400),
    ("ferixas-cable-set-braided", "Ferixas Braided Cable Set", "ferixas-official", "electronics", 29.0, None, "FRX-CBL-SET", 520, 4.5, 520, 1340, 31200),
]

_CATEGORY_BULLETS = {
    "audio": ["Tuned in-house against a reference pair", "Up to 40 hours of playback", "Memory-foam tips in three sizes", "Two-year warranty"],
    "computing": ["Machined aluminium chassis", "Rated for 12 hours of real work", "Silent under sustained load", "Three-year warranty"],
    "electronics": ["Bench-tested before dispatch", "Works with USB-C and USB-A", "Compact enough for a laptop bag", "Two-year warranty"],
    "gaming": ["Tested over 500 hours of play", "Low-latency wired or wireless", "Replaceable switches and pads", "Two-year warranty"],
    "phones": ["Fits with a case fitted", "Fast-charge compatible", "Braided, tangle-resistant cable", "One-year warranty"],
    "fashion": ["Natural fibre, no blends", "Generous seams for alteration", "Free repairs for two years", "Pre-washed, true to size"],
    "home": ["Replaceable parts, not disposable", "Made from honest materials", "Wipe-clean surface", "Five-year warranty"],
    "beauty": ["Short ingredient list", "Clinically studied actives", "Batch date printed on the bottle", "Dermatologist tested"],
    "sports": ["Built for daily training", "Wipe-down finish", "Ships with a carry strap", "Two-year warranty"],
    "pantry": ["Sourced directly from growers", "Milled or pressed to order", "Recyclable packaging", "Best-before 18 months"],
}

_VARIANTS = {
    "audio": [{"name": "Colour", "values": ["Ink", "Bone"]}],
    "computing": [{"name": "Storage", "values": ["512GB", "1TB"]}, {"name": "Memory", "values": ["16GB", "32GB"]}],
    "electronics": [{"name": "Colour", "values": ["Ink", "Chalk"]}],
    "gaming": [{"name": "Colour", "values": ["Void", "Lime"]}],
    "phones": [{"name": "Colour", "values": ["Ink", "Bone"]}],
    "fashion": [{"name": "Size", "values": ["XS", "S", "M", "L", "XL"]}, {"name": "Colour", "values": ["Bone", "Ink"]}],
    "home": [{"name": "Finish", "values": ["Natural", "Charcoal"]}],
    "beauty": [{"name": "Size", "values": ["30ml", "50ml"]}],
    "sports": [{"name": "Size", "values": ["Standard", "Large"]}],
    "pantry": [{"name": "Size", "values": ["250g", "500g", "1kg"]}],
}

_REVIEW_AUTHORS = [
    "Amara Obi", "Tunde Balogun", "Zainab Yusuf", "Kofi Mensah",
    "Lerato Dube", "Chidi Nwosu", "Fatima Bello", "Naledi Molefe",
]
_REVIEW_LINES = [
    ("Exactly as described", "Arrived two days early and packed properly. No notes."),
    ("Worth the money", "I hesitated at the price and I would buy it again tomorrow."),
    ("Better in person", "Photographs do not do it justice. Build quality is obvious."),
    ("Solid, small niggle", "Does everything it claims. The manual is thin, the product is not."),
    ("Second one I have bought", "Bought one for the office and one for home. Consistent both times."),
    ("Great after a few weeks", "Daily use for a month now with no complaints at all."),
]


def _collection_membership(category: str, price: float, rating: float) -> List[str]:
    out: List[str] = []
    if price < 100:
        out.append("under-100")
    if category in {"computing", "electronics"}:
        out.append("work-from-anywhere")
    if category == "audio":
        out.append("audio-upgrade")
    if category in {"fashion", "home", "pantry"}:
        out.append("autumn-edit")
    if rating >= 4.6:
        out.append("gift-guide")
    return out


def _rating_breakdown(rating: float, count: int) -> Dict[str, int]:
    weights = {5: 0.68, 4: 0.22, 3: 0.06, 2: 0.025, 1: 0.015}
    shift = (rating - 4.5) * 0.35
    weights[5] = max(0.4, min(0.85, weights[5] + shift))
    weights[4] = max(0.08, weights[4] - shift)
    total = sum(weights.values())
    out = {}
    for stars in (5, 4, 3, 2, 1):
        out[str(stars)] = int(round(count * weights[stars] / total))
    return out


def _seed_reviews_for(product: Dict[str, Any]) -> List[Dict[str, Any]]:
    count = max(2, min(6, product["reviewCount"] // 90))
    reviews = []
    for i in range(count):
        title, body = _REVIEW_LINES[(hash(product["slug"]) + i) % len(_REVIEW_LINES)]
        reviews.append({
            "id": f"rev_{product['slug']}_{i}",
            "productId": product["id"],
            "author": _REVIEW_AUTHORS[(hash(product["slug"]) + i * 3) % len(_REVIEW_AUTHORS)],
            "rating": 5 if i % 3 == 0 else 4,
            "title": title,
            "body": body,
            "date": (datetime.now(timezone.utc) - timedelta(days=8 + i * 11)).isoformat(),
            "helpful": 4 + (i * 7) % 23,
            "verified": True,
        })
    return reviews


def _build_catalogue() -> List[Dict[str, Any]]:
    products = []
    for index, row in enumerate(_PRODUCT_ROWS):
        slug, title, merchant_id, category, price, compare_at, sku, stock, rating, reviews, sold, views = row
        merchant = MERCHANT_BY_ID[merchant_id]
        products.append({
            "id": f"prd_{slug}",
            "slug": slug,
            "title": title,
            "merchantId": merchant_id,
            "merchantName": merchant["name"],
            "merchantSlug": merchant["slug"],
            "category": category,
            "collections": _collection_membership(category, price, rating),
            "description": (
                f"{title} by {merchant['name']}. "
                f"{next((c['blurb'] for c in CATEGORIES if c['slug'] == category), '')}. "
                f"Dispatched from {merchant['location']} within one working day."
            ),
            "bullets": _CATEGORY_BULLETS.get(category, [])[:4],
            "price": price,
            "compareAt": compare_at,
            "discount": int(round((1 - price / compare_at) * 100)) if compare_at else None,
            "cost": round(price * 0.62, 2),
            "sku": sku,
            "stock": stock,
            "lowStockAt": 25,
            "rating": rating,
            "reviewCount": reviews,
            "ratingBreakdown": _rating_breakdown(rating, reviews),
            "variants": _VARIANTS.get(category, []),
            "plates": (index % 4) + 1,
            "status": "active",
            "channels": {"store": True, "marketplace": merchant["marketplaceEnabled"]},
            "seo": {"title": f"{title} | Ferixas", "description": title, "handle": slug},
            "tags": sorted({category, merchant["slug"], "sale" if compare_at else "new"}),
            "createdAt": (datetime.now(timezone.utc) - timedelta(days=6 + index * 3)).isoformat(),
            "sold30d": sold,
            "views30d": views,
        })
    return products


PRODUCTS = _build_catalogue()
PRODUCT_BY_ID = {p["id"]: p for p in PRODUCTS}
PRODUCT_BY_SLUG = {p["slug"]: p for p in PRODUCTS}

ALL_REVIEWS = {p["id"]: _seed_reviews_for(p) for p in PRODUCTS}

BANNERS: List[Dict[str, Any]] = [
    {
        "id": "bnr_launch", "kind": "image", "eyebrow": "Autumn on Ferixas",
        "headline": "Seven merchants.\nOne cart. One checkout.",
        "body": "Audio, tailoring, home, gaming and pantry goods — bought together from seven independent stores, delivered separately.",
        "ctaLabel": "Shop the marketplace", "ctaHref": "/browse",
        "secondaryLabel": "Meet the stores", "secondaryHref": "/stores",
        "accent": "#e4572e", "hue": 18, "mediaUrl": "/banners/autumn.svg",
        "posterNote": "Marketplace hero artwork", "duration": 7000, "active": True, "order": 0,
        "audience": "All shoppers", "startsAt": "2026-09-23T08:00:00+00:00", "endsAt": "2026-10-23T23:00:00+00:00",
        "impressions": 486210, "clicks": 31480,
        "overlay": {"enabled": True, "align": "left", "vertical": "middle", "scrim": 58,
                     "tone": "light", "width": 40, "showText": True, "showButtons": True},
    },
    {
        "id": "bnr_audio", "kind": "video", "eyebrow": "Product spotlight",
        "headline": "AuraSound Pro ANC",
        "body": "Forty hours of battery, tuned by ear. Now $249 across every store that stocks it.",
        "ctaLabel": "View the product", "ctaHref": "/product/aurasound-pro-anc-headphones",
        "secondaryLabel": "More audio", "secondaryHref": "/browse?category=audio",
        "accent": "#2f6f8f", "hue": 202, "mediaUrl": "/banners/audio.svg",
        "posterNote": "Product spotlight artwork", "duration": 9000, "active": True, "order": 1,
        "audience": "Audio buyers", "startsAt": "2026-09-28T08:00:00+00:00", "endsAt": "2026-10-12T23:00:00+00:00",
        "impressions": 291440, "clicks": 22810,
        "overlay": {"enabled": True, "align": "left", "vertical": "middle", "scrim": 54,
                     "tone": "light", "width": 36, "showText": True, "showButtons": True},
    },
    {
        "id": "bnr_delivery", "kind": "image", "eyebrow": "Delivery",
        "headline": "Free delivery over $120",
        "body": "Tracked across seven countries, dispatched within one working day by the seller who packs it.",
        "ctaLabel": "Start shopping", "ctaHref": "/browse?sort=best",
        "secondaryLabel": "Delivery and returns", "secondaryHref": "/account/orders",
        "accent": "#1f4b43", "hue": 168, "mediaUrl": "/banners/delivery.svg",
        "posterNote": "Platform message artwork", "duration": 6000, "active": True, "order": 2,
        "audience": "All shoppers", "startsAt": "2026-09-02T08:00:00+00:00", "endsAt": "2026-11-01T23:00:00+00:00",
        "impressions": 512900, "clicks": 18940,
        "overlay": {"enabled": True, "align": "center", "vertical": "middle", "scrim": 58,
                     "tone": "light", "width": 34, "showText": True, "showButtons": True},
    },
    {
        "id": "bnr_official", "kind": "video", "eyebrow": "Ferixas Official Store",
        "headline": "Built by the platform",
        "body": "Hardware and essentials sold by Ferixas through the same catalogue, channels and checkout as every other merchant.",
        "ctaLabel": "Open the official store", "ctaHref": "/store/ferixas-official",
        "secondaryLabel": "How the platform works", "secondaryHref": "/stores",
        "accent": "#c9a24d", "hue": 42, "mediaUrl": "/banners/official.svg",
        "posterNote": "Brand film poster", "duration": 8000, "active": True, "order": 3,
        "audience": "All shoppers", "startsAt": "2026-09-30T08:00:00+00:00", "endsAt": "2026-10-30T23:00:00+00:00",
        "impressions": 158320, "clicks": 9410,
        "overlay": {"enabled": True, "align": "left", "vertical": "bottom", "scrim": 68,
                     "tone": "light", "width": 40, "showText": True, "showButtons": True},
    },
]

SHIPPING_OPTIONS = [
    {"id": "standard", "label": "Standard delivery", "eta": "2-5 working days", "price": STANDARD_SHIPPING},
    {"id": "express", "label": "Express delivery", "eta": "1-2 working days", "price": EXPRESS_SHIPPING},
    {"id": "pickup", "label": "Collect from seller", "eta": "Ready in 24 hours", "price": 0.0},
]

PAYMENT_METHODS = [
    {"id": "card", "label": "Card ending 4242", "detail": "Visa · saved"},
    {"id": "wallet", "label": "Ferixas wallet", "detail": "Balance applied at checkout"},
    {"id": "transfer", "label": "Bank transfer", "detail": "Order ships once cleared"},
]


# ---------------------------------------------------------------------------
# Storage helpers
# ---------------------------------------------------------------------------


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _hash_password(password: str, salt: Optional[str] = None) -> Any:
    salt = salt or secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 120_000).hex()
    return salt, digest


def _verify_password(password: str, salt: str, digest: str) -> bool:
    _, candidate = _hash_password(password, salt)
    return secrets.compare_digest(candidate, digest)


async def _get_json(redis: Any, ns: str, key: str, default: Any) -> Any:
    raw = await redis.get(f"{ns}:{key}")
    if raw is None:
        return default
    try:
        return json.loads(raw)
    except (ValueError, TypeError):
        return default


async def _set_json(redis: Any, ns: str, key: str, value: Any) -> None:
    await redis.set(f"{ns}:{key}", json.dumps(value))


async def _user_from_session(redis: Any, ns: str, session: Optional[str]) -> Optional[Dict[str, Any]]:
    if not session:
        return None
    user_id = await redis.get(f"{ns}:session:{session}")
    if not user_id:
        return None
    return await _get_json(redis, ns, f"user:{user_id}", None)


async def _public_user(user: Dict[str, Any]) -> Dict[str, Any]:
    return {k: v for k, v in user.items() if k not in {"passwordHash", "passwordSalt"}}


async def _require_user(redis: Any, ns: str, session: Optional[str]) -> Dict[str, Any]:
    user = await _user_from_session(redis, ns, session)
    if not user:
        raise HTTPException(status_code=401, detail="Sign in to continue")
    return user


def _merchant_card(merchant: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "id": merchant["id"], "slug": merchant["slug"], "name": merchant["name"],
        "tagline": merchant["tagline"], "location": merchant["location"],
        "rating": merchant["rating"], "reviewCount": merchant["reviewCount"],
        "followers": merchant["followers"], "verified": merchant["verified"],
        "brand": merchant["brand"], "domain": merchant["domain"],
        "customDomain": merchant["customDomain"], "plan": merchant["plan"],
        "since": merchant["since"], "marketplaceEnabled": merchant["marketplaceEnabled"],
    }


def _public_product(product: Dict[str, Any]) -> Dict[str, Any]:
    return product


async def _cart_id_for(
    redis: Any, ns: str, session: Optional[str], cart_id: Optional[str], create: bool = True
) -> Any:
    user = await _user_from_session(redis, ns, session)
    if user:
        stored = await redis.get(f"{ns}:user:{user['id']}:cart")
        if stored:
            if cart_id and cart_id != stored:
                await _merge_carts(redis, ns, cart_id, stored)
            return stored, user
        if not create:
            return None, user
        new_id = cart_id or f"cart_{uuid.uuid4().hex[:12]}"
        if cart_id:
            payload = await _get_json(redis, ns, f"cart:{cart_id}", {"lines": []})
            await _set_json(redis, ns, f"cart:{new_id}", payload)
        await redis.set(f"{ns}:user:{user['id']}:cart", new_id)
        return new_id, user
    if not create and not cart_id:
        return None, None
    return (cart_id or f"cart_{uuid.uuid4().hex[:12]}"), None


async def _merge_carts(redis: Any, ns: str, guest_id: str, target_id: str) -> None:
    guest = await _get_json(redis, ns, f"cart:{guest_id}", {"lines": []})
    target = await _get_json(redis, ns, f"cart:{target_id}", {"lines": []})
    for line in guest.get("lines", []):
        match = next(
            (l for l in target["lines"]
             if l["productId"] == line["productId"] and l.get("variant") == line.get("variant")),
            None,
        )
        if match:
            match["qty"] += line["qty"]
        else:
            target["lines"].append(line)
    await _set_json(redis, ns, f"cart:{target_id}", target)


async def _cart_payload(redis: Any, ns: str, cart_id: str) -> Dict[str, Any]:
    raw = await _get_json(redis, ns, f"cart:{cart_id}", {"lines": []})
    lines: List[Dict[str, Any]] = []
    for line in raw.get("lines", []):
        product = PRODUCT_BY_ID.get(line["productId"])
        if not product:
            continue
        merchant = MERCHANT_BY_ID[product["merchantId"]]
        lines.append({
            "key": f"{product['id']}::{line.get('variant') or ''}",
            "product": product,
            "variant": line.get("variant"),
            "qty": line["qty"],
            "lineTotal": round(product["price"] * line["qty"], 2),
            "merchant": _merchant_card(merchant),
            "inStock": product["stock"] >= line["qty"],
        })
    grouped: Dict[str, List[Dict[str, Any]]] = {}
    for line in lines:
        grouped.setdefault(line["product"]["merchantId"], []).append(line)
    merchants_out = []
    for merchant_id, items in grouped.items():
        merchant = MERCHANT_BY_ID[merchant_id]
        subtotal = round(sum(i["lineTotal"] for i in items), 2)
        shipping = 0.0 if subtotal >= FREE_SHIPPING_OVER else STANDARD_SHIPPING
        merchants_out.append({
            "merchant": _merchant_card(merchant), "items": items,
            "subtotal": subtotal, "shipping": shipping,
            "freeShipping": subtotal >= FREE_SHIPPING_OVER,
        })
    subtotal = round(sum(g["subtotal"] for g in merchants_out), 2)
    shipping = round(sum(g["shipping"] for g in merchants_out), 2)
    tax = round(subtotal * TAX_RATE, 2)
    return {
        "cartId": cart_id,
        "lines": lines,
        "merchants": merchants_out,
        "count": sum(l["qty"] for l in lines),
        "distinctItems": len(lines),
        "subtotal": subtotal,
        "shipping": shipping,
        "tax": tax,
        "total": round(subtotal + shipping + tax, 2),
        "freeShippingOver": FREE_SHIPPING_OVER,
    }


async def _ensure_demo_user(redis: Any, ns: str) -> None:
    existing = await redis.get(f"{ns}:users:email:{DEMO_EMAIL}")
    if existing:
        return
    salt, digest = _hash_password(DEMO_PASSWORD)
    user_id = "usr_demo"
    user = {
        "id": user_id, "name": "Ferixas Demo Shopper", "email": DEMO_EMAIL,
        "phone": "+234 803 411 2290", "passwordSalt": salt, "passwordHash": digest,
        "createdAt": (datetime.now(timezone.utc) - timedelta(days=214)).isoformat(),
        "segment": "vip", "avatarInitials": "FD",
        "settings": {"language": "English", "currency": "USD", "marketingEmails": True,
                     "orderEmails": True, "smsUpdates": False, "profilePublic": False},
    }
    await _set_json(redis, ns, f"user:{user_id}", user)
    await redis.set(f"{ns}:users:email:{DEMO_EMAIL}", user_id)
    await redis.sadd(f"{ns}:users:all", user_id)

    addresses = [
        {"id": "adr_demo_1", "label": "Home", "name": "Ferixas Demo Shopper", "phone": "+234 803 411 2290",
         "line1": "14 Bourdillon Road", "line2": "Flat 6", "city": "Lagos", "region": "Lagos State",
         "postcode": "101233", "country": "Nigeria", "isDefault": True},
        {"id": "adr_demo_2", "label": "Work", "name": "Ferixas Demo Shopper", "phone": "+234 803 411 2290",
         "line1": "1 Adeola Odeku Street", "line2": "Floor 9", "city": "Lagos", "region": "Lagos State",
         "postcode": "101241", "country": "Nigeria", "isDefault": False},
    ]
    await _set_json(redis, ns, f"user:{user_id}:addresses", addresses)

    wishlist = ["prd_nova-linen-overshirt", "prd_lumen-woven-floor-lamp",
                "prd_sahel-single-origin-coffee", "prd_pixelforge-240hz-monitor"]
    await _set_json(redis, ns, f"user:{user_id}:wishlist", wishlist)
    await _set_json(redis, ns, f"user:{user_id}:follows", ["aurasound", "nova-fashion"])

    reviews = [
        {"id": "rev_demo_1", "productId": "prd_abc-noise-cancelling-earbuds", "rating": 5,
         "title": "Daily commute sorted", "body": "Paired in seconds and the case survives a bag. Very happy.",
         "date": (datetime.now(timezone.utc) - timedelta(days=41)).isoformat(), "helpful": 12, "verified": True},
        {"id": "rev_demo_2", "productId": "prd_sahel-single-origin-coffee", "rating": 4,
         "title": "Excellent, wish it were bigger", "body": "Roast date on the bag, which I appreciate. Runs out fast.",
         "date": (datetime.now(timezone.utc) - timedelta(days=17)).isoformat(), "helpful": 5, "verified": True},
    ]
    await _set_json(redis, ns, f"user:{user_id}:reviews", reviews)

    seeded_orders = []
    order_plan = [
        ("ord_demo_1", [("prd_aurasound-pro-anc-headphones", None, 1), ("prd_aurasound-go-mini-speaker", "Ink", 1)], 96, "delivered", "marketplace", "DHL", "FX-TRK-4820"),
        ("ord_demo_2", [("prd_nova-everyday-sneaker", "M", 1), ("prd_nova-cotton-tee-heavy", "L", 2)], 38, "shipped", "marketplace", "GIG Logistics", "FX-TRK-5133"),
        ("ord_demo_3", [("prd_sahel-single-origin-coffee", "1kg", 3)], 9, "processing", "marketplace", None, None),
    ]
    for order_id, items_plan, days_ago, fulfilment, channel, carrier, tracking in order_plan:
        items = []
        for product_id, variant, qty in items_plan:
            product = PRODUCT_BY_ID.get(product_id)
            if not product:
                continue
            items.append({"productId": product_id, "title": product["title"], "variant": variant,
                          "qty": qty, "price": product["price"],
                          "merchantId": product["merchantId"],
                          "merchantName": MERCHANT_BY_ID[product["merchantId"]]["name"]})
        subtotal = round(sum(i["price"] * i["qty"] for i in items), 2)
        shipping = 0.0 if subtotal >= FREE_SHIPPING_OVER else STANDARD_SHIPPING
        tax = round(subtotal * TAX_RATE, 2)
        commission = round(sum(
            i["price"] * i["qty"] * MERCHANT_BY_ID[i["merchantId"]]["commissionPct"] / 100 for i in items
        ), 2)
        placed = datetime.now(timezone.utc) - timedelta(days=days_ago)
        seeded_orders.append({
            "id": order_id, "number": f"FX-{4800 + len(seeded_orders)}",
            "placedAt": placed.isoformat(), "channel": channel,
            "items": items,
            "merchantIds": sorted({i["merchantId"] for i in items}),
            "subtotal": subtotal, "shipping": shipping, "tax": tax,
            "total": round(subtotal + shipping + tax, 2), "commission": commission,
            "payment": "paid", "fulfillment": fulfilment,
            "carrier": carrier, "tracking": tracking,
            "address": addresses[0], "note": None,
            "timeline": [
                {"label": "Order placed", "at": placed.isoformat()},
                {"label": "Payment confirmed", "at": (placed + timedelta(hours=1)).isoformat()},
                {"label": "Packed by seller", "at": (placed + timedelta(days=1)).isoformat()},
                {"label": "In transit", "at": (placed + timedelta(days=2)).isoformat()},
            ],
        })
    await _set_json(redis, ns, f"user:{user_id}:orders", seeded_orders)
    logger.info("Seeded the demo shopper account")


# ---------------------------------------------------------------------------
# Request models
# ---------------------------------------------------------------------------


class RegisterIn(BaseModel):
    name: str = Field(..., min_length=2, max_length=80, description="The shopper's full name")
    email: str = Field(..., min_length=5, max_length=160, description="Email address used to sign in")
    password: str = Field(..., min_length=8, max_length=120, description="Account password, at least 8 characters")


class LoginIn(BaseModel):
    email: str = Field(..., min_length=5, max_length=160, description="Email address on the account")
    password: str = Field(..., min_length=1, max_length=120, description="Account password")


class CartItemIn(BaseModel):
    productId: str = Field(..., description="Product being added to the cart")
    variant: Optional[str] = Field(default=None, description="Selected variant, e.g. a size or colour")
    qty: int = Field(default=1, ge=1, le=99, description="How many to add")
    cartId: Optional[str] = Field(default=None, description="Guest cart to add to when not signed in")


class CartQtyIn(BaseModel):
    key: str
    qty: int = Field(ge=0, le=99)
    cartId: Optional[str] = None


class CartRemoveIn(BaseModel):
    key: str
    cartId: Optional[str] = None


class CartClearIn(BaseModel):
    cartId: Optional[str] = None


class AddressIn(BaseModel):
    label: str = "Home"
    name: str
    phone: str
    line1: str
    line2: Optional[str] = None
    city: str
    region: str
    postcode: str
    country: str
    isDefault: bool = False


class AddressPatchIn(BaseModel):
    id: str
    label: Optional[str] = None
    name: Optional[str] = None
    phone: Optional[str] = None
    line1: Optional[str] = None
    line2: Optional[str] = None
    city: Optional[str] = None
    region: Optional[str] = None
    postcode: Optional[str] = None
    country: Optional[str] = None
    isDefault: Optional[bool] = None


class AddressIdIn(BaseModel):
    id: str


class WishlistIn(BaseModel):
    productId: str


class ReviewIn(BaseModel):
    productId: str
    rating: int = Field(ge=1, le=5)
    title: str = Field(..., min_length=2, max_length=120)
    body: str = Field(..., min_length=4, max_length=1200)


class ReviewPatchIn(BaseModel):
    id: str
    rating: Optional[int] = Field(default=None, ge=1, le=5)
    title: Optional[str] = None
    body: Optional[str] = None


class ReviewIdIn(BaseModel):
    id: str


class SettingsIn(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    language: Optional[str] = None
    currency: Optional[str] = None
    marketingEmails: Optional[bool] = None
    orderEmails: Optional[bool] = None
    smsUpdates: Optional[bool] = None
    profilePublic: Optional[bool] = None


class CheckoutIn(BaseModel):
    cartId: Optional[str] = Field(default=None, description="Cart being checked out")
    addressId: str = Field(..., description="Delivery address on the account")
    shippingMethod: str = Field(default="standard", description="standard, express or pickup")
    paymentMethod: str = Field(default="card", description="card, wallet or transfer")
    note: Optional[str] = Field(default=None, description="Optional delivery note for the seller")


class ReorderIn(BaseModel):
    orderId: str = Field(..., description="Order whose items go back into the cart")
    cartId: Optional[str] = Field(default=None, description="Cart to add the items to")


class InfoRequest(BaseModel):
    """Health check for the Ferixas commerce API."""

    check: bool = Field(default=True, description="Confirm the API is answering")


class InfoResponse(BaseModel):
    service: str = Field(..., description="Service name")
    version: str = Field(..., description="Service version")
    products: int = Field(..., description="Products in the catalogue")
    merchants: int = Field(..., description="Merchant stores on the platform")
    categories: int = Field(..., description="Departments in the catalogue")
    endpoints: List[str] = Field(..., description="Routes this API exposes")


# ---------------------------------------------------------------------------
# Service info
# ---------------------------------------------------------------------------


@app.get("/", response_model=InfoResponse)
async def service_info() -> Dict[str, Any]:
    """Catalogue sizes and the full route list for this API."""
    return {
        "service": "ferixas-commerce-api",
        "version": "1.0.0",
        "products": len(PRODUCTS),
        "merchants": len(MERCHANTS),
        "categories": len(CATEGORIES),
        "endpoints": [
            "GET /catalog/home", "GET /catalog/products", "GET /catalog/product",
            "GET /catalog/categories", "GET /catalog/category", "GET /catalog/collections",
            "GET /catalog/collection", "GET /catalog/stores", "GET /catalog/store",
            "GET /search", "GET /cart", "POST /auth/register", "POST /auth/login",
            "POST /auth/logout", "GET /auth/me", "GET /account", "GET /account/orders",
            "GET /account/addresses", "GET /account/wishlist", "GET /account/reviews",
            "GET /account/settings", "GET /shipping/options", "POST /checkout/quote",
            "POST /checkout/place",
        ],
    }


@app.post("/", response_model=InfoResponse)
async def service_info_post(request: InfoRequest) -> Dict[str, Any]:
    """Confirm the API is answering."""
    logger.info("Service info requested", check=request.check)
    return await service_info()


# ---------------------------------------------------------------------------
# Catalogue
# ---------------------------------------------------------------------------


def _visible_products() -> List[Dict[str, Any]]:
    return [p for p in PRODUCTS if p["status"] == "active" and p["channels"]["marketplace"]]


def _store_card(merchant: Dict[str, Any]) -> Dict[str, Any]:
    card = _merchant_card(merchant)
    card["productCount"] = sum(
        1 for p in PRODUCTS if p["merchantId"] == merchant["id"] and p["status"] == "active"
    )
    card["categories"] = sorted({p["category"] for p in PRODUCTS if p["merchantId"] == merchant["id"]})
    return card


@app.get("/catalog/home")
async def catalog_home() -> Dict[str, Any]:
    feed = _visible_products()
    categories = []
    for category in CATEGORIES:
        categories.append({
            **category,
            "count": sum(1 for p in feed if p["category"] == category["slug"]),
        })
    collections = []
    for collection in COLLECTIONS:
        members = [p for p in feed if collection["slug"] in p["collections"]]
        collections.append({**collection, "count": len(members),
                            "products": members[:4]})
    return {
        "banners": [b for b in BANNERS if b["active"]],
        "categories": categories,
        "collections": collections,
        "featured": sorted(feed, key=lambda p: p["rating"], reverse=True)[:8],
        "trending": sorted(feed, key=lambda p: p["sold30d"], reverse=True)[:8],
        "newArrivals": sorted(feed, key=lambda p: p["createdAt"], reverse=True)[:8],
        "under100": [p for p in feed if p["price"] < 100][:8],
        "official": [p for p in feed if p["merchantId"] == "ferixas-official"][:4],
        "stores": [_store_card(m) for m in MERCHANTS if m["marketplaceEnabled"]][:6],
        "stats": {
            "products": len(feed),
            "merchants": len([m for m in MERCHANTS if m["marketplaceEnabled"]]),
            "categories": len(CATEGORIES),
        },
    }


@app.get("/catalog/products")
async def catalog_products(
    search: Optional[str] = None,
    category: Optional[str] = None,
    collection: Optional[str] = None,
    store: Optional[str] = None,
    minPrice: Optional[float] = None,
    maxPrice: Optional[float] = None,
    rating: Optional[float] = None,
    inStock: Optional[bool] = None,
    onSale: Optional[bool] = None,
    sort: str = "relevance",
    page: int = 1,
    perPage: int = 24,
) -> Dict[str, Any]:
    items = _visible_products()
    if search:
        needle = search.lower()
        items = [p for p in items if needle in p["title"].lower()
                 or needle in p["description"].lower()
                 or any(needle in t.lower() for t in p["tags"])
                 or needle in p["category"].lower()]
    if category:
        items = [p for p in items if p["category"] == category]
    if collection:
        items = [p for p in items if collection in p["collections"]]
    if store:
        merchant = MERCHANT_BY_SLUG.get(store) or MERCHANT_BY_ID.get(store)
        items = [p for p in items if merchant and p["merchantId"] == merchant["id"]]
    if minPrice is not None:
        items = [p for p in items if p["price"] >= minPrice]
    if maxPrice is not None:
        items = [p for p in items if p["price"] <= maxPrice]
    if rating is not None:
        items = [p for p in items if p["rating"] >= rating]
    if inStock:
        items = [p for p in items if p["stock"] > 0]
    if onSale:
        items = [p for p in items if p["compareAt"]]

    sorters = {
        "price-asc": lambda p: p["price"],
        "price-desc": lambda p: -p["price"],
        "new": lambda p: p["createdAt"],
        "best": lambda p: -p["sold30d"],
        "rating": lambda p: -p["rating"],
        "relevance": lambda p: -(p["rating"] * 100 + p["sold30d"] / 10),
    }
    items = sorted(items, key=sorters.get(sort, sorters["relevance"]), reverse=sort in {"new"})

    total = len(items)
    per_page = max(1, min(60, perPage))
    start = max(0, (page - 1) * per_page)
    window = items[start:start + per_page]

    return {
        "items": window,
        "total": total,
        "page": page,
        "perPage": per_page,
        "pages": max(1, (total + per_page - 1) // per_page),
        "facets": {
            "categories": [
                {"slug": c["slug"], "name": c["name"],
                 "count": sum(1 for p in _visible_products() if p["category"] == c["slug"])}
                for c in CATEGORIES
            ],
            "stores": [
                {"slug": m["slug"], "name": m["name"],
                 "count": sum(1 for p in _visible_products() if p["merchantId"] == m["id"])}
                for m in MERCHANTS if m["marketplaceEnabled"]
            ],
            "priceBuckets": [
                {"id": "under-50", "label": "Under $50", "count": sum(1 for p in _visible_products() if p["price"] < 50)},
                {"id": "50-150", "label": "$50 - $150", "count": sum(1 for p in _visible_products() if 50 <= p["price"] < 150)},
                {"id": "150-400", "label": "$150 - $400", "count": sum(1 for p in _visible_products() if 150 <= p["price"] < 400)},
                {"id": "400-plus", "label": "$400 and up", "count": sum(1 for p in _visible_products() if p["price"] >= 400)},
            ],
        },
    }


@app.get("/catalog/product")
async def catalog_product(slug: str = Query(...)) -> Dict[str, Any]:
    product = PRODUCT_BY_SLUG.get(slug)
    if not product:
        raise HTTPException(status_code=404, detail="That product is not available")
    merchant = MERCHANT_BY_ID[product["merchantId"]]
    related = [
        p for p in _visible_products()
        if p["id"] != product["id"]
        and (p["merchantId"] == product["merchantId"] or p["category"] == product["category"])
    ][:8]
    return {
        "product": product,
        "merchant": _merchant_card(merchant),
        "reviews": ALL_REVIEWS.get(product["id"], []),
        "related": related,
        "shipping": [
            {"label": "Standard", "detail": "2-5 working days, tracked end to end"},
            {"label": "Express", "detail": "1-2 working days where the carrier allows"},
            {"label": "International", "detail": "4-9 working days, duties shown at checkout"},
        ],
        "returns": "30-day returns. Free on orders above $120.",
    }


@app.get("/catalog/categories")
async def catalog_categories() -> Dict[str, Any]:
    feed = _visible_products()
    return {
        "categories": [
            {**c, "count": sum(1 for p in feed if p["category"] == c["slug"])}
            for c in CATEGORIES
        ]
    }


@app.get("/catalog/category")
async def catalog_category(slug: str = Query(...), sort: str = "relevance") -> Dict[str, Any]:
    category = next((c for c in CATEGORIES if c["slug"] == slug), None)
    if not category:
        raise HTTPException(status_code=404, detail="That category does not exist")
    result = await catalog_products(category=slug, sort=sort)
    return {"category": category, **result}


@app.get("/catalog/collections")
async def catalog_collections() -> Dict[str, Any]:
    feed = _visible_products()
    return {
        "collections": [
            {**c, "count": sum(1 for p in feed if c["slug"] in p["collections"]),
             "products": [p for p in feed if c["slug"] in p["collections"]][:3]}
            for c in COLLECTIONS
        ]
    }


@app.get("/catalog/collection")
async def catalog_collection(slug: str = Query(...), sort: str = "relevance") -> Dict[str, Any]:
    collection = next((c for c in COLLECTIONS if c["slug"] == slug), None)
    if not collection:
        raise HTTPException(status_code=404, detail="That collection does not exist")
    result = await catalog_products(collection=slug, sort=sort, perPage=48)
    return {"collection": collection, **result}


@app.get("/catalog/stores")
async def catalog_stores(search: Optional[str] = None, sort: str = "top") -> Dict[str, Any]:
    stores = [_store_card(m) for m in MERCHANTS if m["marketplaceEnabled"]]
    if search:
        needle = search.lower()
        stores = [s for s in stores if needle in s["name"].lower() or needle in s["tagline"].lower()]
    if sort == "products":
        stores = sorted(stores, key=lambda s: -s["productCount"])
    elif sort == "new":
        stores = sorted(stores, key=lambda s: s["since"], reverse=True)
    else:
        stores = sorted(stores, key=lambda s: -s["rating"])
    return {"stores": stores, "total": len(stores)}


@app.get("/catalog/store")
async def catalog_store(slug: str = Query(...)) -> Dict[str, Any]:
    merchant = MERCHANT_BY_SLUG.get(slug) or MERCHANT_BY_ID.get(slug)
    if not merchant:
        raise HTTPException(status_code=404, detail="No store at that address")
    catalog = [p for p in PRODUCTS if p["merchantId"] == merchant["id"] and p["status"] == "active"]
    categories = sorted({p["category"] for p in catalog})
    return {
        "store": _store_card(merchant),
        "about": merchant["about"],
        "responseRate": merchant["responseRate"],
        "fulfilmentRate": merchant["fulfilmentRate"],
        "products": catalog,
        "categories": [
            {**c, "count": sum(1 for p in catalog if p["category"] == c["slug"])}
            for c in CATEGORIES if c["slug"] in categories
        ],
        "stats": {
            "products": len(catalog),
            "rating": merchant["rating"],
            "reviewCount": merchant["reviewCount"],
            "followers": merchant["followers"],
        },
    }


@app.get("/search")
async def search(q: str = Query("", max_length=120)) -> Dict[str, Any]:
    needle = q.strip().lower()
    if not needle:
        return {"query": q, "products": [], "stores": [], "categories": [], "suggestions": []}
    feed = _visible_products()
    products = [p for p in feed if needle in p["title"].lower() or needle in p["description"].lower()
                or any(needle in t.lower() for t in p["tags"])][:24]
    stores = [s for s in (_store_card(m) for m in MERCHANTS if m["marketplaceEnabled"])
              if needle in s["name"].lower() or needle in s["tagline"].lower()]
    categories = [c for c in CATEGORIES if needle in c["name"].lower() or needle in c["blurb"].lower()]
    suggestions = sorted({p["title"].split(" ")[0] for p in products})[:6]
    return {"query": q, "products": products, "stores": stores,
            "categories": categories, "suggestions": suggestions}


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------


@app.post("/auth/register")
async def auth_register(
    payload: RegisterIn,
    session: Optional[str] = Header(default=None, alias="X-Ferix-Session"),
    cart_id: Optional[str] = Header(default=None, alias="X-Ferix-Cart"),
) -> Dict[str, Any]:
    email = payload.email.strip().lower()
    if "@" not in email or "." not in email.split("@")[-1]:
        raise HTTPException(status_code=422, detail="Enter a valid email address")
    async with redis_client() as (redis, ns):
        await _ensure_demo_user(redis, ns)
        existing = await redis.get(f"{ns}:users:email:{email}")
        if existing:
            raise HTTPException(status_code=409, detail="An account already uses that email")
        salt, digest = _hash_password(payload.password)
        user_id = f"usr_{uuid.uuid4().hex[:12]}"
        name = payload.name.strip()
        user = {
            "id": user_id, "name": name, "email": email, "phone": "",
            "passwordSalt": salt, "passwordHash": digest, "createdAt": _now(),
            "segment": "new",
            "avatarInitials": "".join(part[0].upper() for part in name.split()[:2]) or "F",
            "settings": {"language": "English", "currency": "USD", "marketingEmails": True,
                         "orderEmails": True, "smsUpdates": False, "profilePublic": False},
        }
        await _set_json(redis, ns, f"user:{user_id}", user)
        await redis.set(f"{ns}:users:email:{email}", user_id)
        await redis.sadd(f"{ns}:users:all", user_id)
        await _set_json(redis, ns, f"user:{user_id}:addresses", [])
        await _set_json(redis, ns, f"user:{user_id}:wishlist", [])
        await _set_json(redis, ns, f"user:{user_id}:reviews", [])
        await _set_json(redis, ns, f"user:{user_id}:orders", [])
        await _set_json(redis, ns, f"user:{user_id}:follows", [])
        token = secrets.token_urlsafe(32)
        await redis.setex(f"{ns}:session:{token}", SESSION_TTL, user_id)
        cart_key, _ = await _cart_id_for(redis, ns, None, cart_id)
        await redis.set(f"{ns}:user:{user_id}:cart", cart_key)
        logger.info("Registered a shopper", user_id=user_id)
        return {"token": token, "user": await _public_user(user), "cartId": cart_key}


@app.post("/auth/login")
async def auth_login(
    payload: LoginIn,
    cart_id: Optional[str] = Header(default=None, alias="X-Ferix-Cart"),
) -> Dict[str, Any]:
    email = payload.email.strip().lower()
    async with redis_client() as (redis, ns):
        await _ensure_demo_user(redis, ns)
        user_id = await redis.get(f"{ns}:users:email:{email}")
        if not user_id:
            raise HTTPException(status_code=401, detail="Email or password is incorrect")
        user = await _get_json(redis, ns, f"user:{user_id}", None)
        if not user or not _verify_password(payload.password, user["passwordSalt"], user["passwordHash"]):
            raise HTTPException(status_code=401, detail="Email or password is incorrect")
        token = secrets.token_urlsafe(32)
        await redis.setex(f"{ns}:session:{token}", SESSION_TTL, user_id)
        stored_cart = await redis.get(f"{ns}:user:{user_id}:cart")
        if not stored_cart:
            stored_cart = cart_id or f"cart_{uuid.uuid4().hex[:12]}"
            await redis.set(f"{ns}:user:{user_id}:cart", stored_cart)
        elif cart_id and cart_id != stored_cart:
            await _merge_carts(redis, ns, cart_id, stored_cart)
        logger.info("Shopper signed in", user_id=user_id)
        return {"token": token, "user": await _public_user(user), "cartId": stored_cart}


@app.post("/auth/logout")
async def auth_logout(session: Optional[str] = Header(default=None, alias="X-Ferix-Session")) -> Dict[str, Any]:
    async with redis_client() as (redis, ns):
        if session:
            await redis.delete(f"{ns}:session:{session}")
    return {"ok": True}


@app.get("/auth/me")
async def auth_me(session: Optional[str] = Header(default=None, alias="X-Ferix-Session")) -> Dict[str, Any]:
    async with redis_client() as (redis, ns):
        user = await _user_from_session(redis, ns, session)
        if not user:
            return {"user": None}
        return {"user": await _public_user(user)}


# ---------------------------------------------------------------------------
# Cart
# ---------------------------------------------------------------------------


@app.get("/cart")
async def cart_get(
    session: Optional[str] = Header(default=None, alias="X-Ferix-Session"),
    cart_id: Optional[str] = Header(default=None, alias="X-Ferix-Cart"),
) -> Dict[str, Any]:
    async with redis_client() as (redis, ns):
        resolved, _ = await _cart_id_for(redis, ns, session, cart_id, create=bool(cart_id))
        if not resolved:
            return {"cartId": None, "lines": [], "merchants": [], "count": 0,
                    "distinctItems": 0, "subtotal": 0.0, "shipping": 0.0,
                    "tax": 0.0, "total": 0.0, "freeShippingOver": FREE_SHIPPING_OVER}
        return await _cart_payload(redis, ns, resolved)


@app.post("/cart/items")
async def cart_add(
    payload: CartItemIn,
    session: Optional[str] = Header(default=None, alias="X-Ferix-Session"),
    cart_id: Optional[str] = Header(default=None, alias="X-Ferix-Cart"),
) -> Dict[str, Any]:
    product = PRODUCT_BY_ID.get(payload.productId)
    if not product:
        raise HTTPException(status_code=404, detail="That product is not available")
    if product["stock"] <= 0:
        raise HTTPException(status_code=409, detail="That product is out of stock")
    async with redis_client() as (redis, ns):
        resolved, _ = await _cart_id_for(redis, ns, session, payload.cartId or cart_id)
        cart = await _get_json(redis, ns, f"cart:{resolved}", {"lines": []})
        key_match = next((l for l in cart["lines"] if l["productId"] == payload.productId
                          and l.get("variant") == payload.variant), None)
        if key_match:
            key_match["qty"] = min(99, key_match["qty"] + payload.qty)
        else:
            cart["lines"].append({"productId": payload.productId,
                                  "variant": payload.variant, "qty": payload.qty})
        await _set_json(redis, ns, f"cart:{resolved}", cart)
        return await _cart_payload(redis, ns, resolved)


@app.patch("/cart/items")
async def cart_set_qty(
    payload: CartQtyIn,
    session: Optional[str] = Header(default=None, alias="X-Ferix-Session"),
    cart_id: Optional[str] = Header(default=None, alias="X-Ferix-Cart"),
) -> Dict[str, Any]:
    async with redis_client() as (redis, ns):
        resolved, _ = await _cart_id_for(redis, ns, session, payload.cartId or cart_id)
        cart = await _get_json(redis, ns, f"cart:{resolved}", {"lines": []})
        updated = []
        for line in cart["lines"]:
            key = f"{line['productId']}::{line.get('variant') or ''}"
            if key == payload.key:
                if payload.qty > 0:
                    line["qty"] = payload.qty
                    updated.append(line)
            else:
                updated.append(line)
        cart["lines"] = updated
        await _set_json(redis, ns, f"cart:{resolved}", cart)
        return await _cart_payload(redis, ns, resolved)


@app.delete("/cart/items")
async def cart_remove(
    payload: CartRemoveIn,
    session: Optional[str] = Header(default=None, alias="X-Ferix-Session"),
    cart_id: Optional[str] = Header(default=None, alias="X-Ferix-Cart"),
) -> Dict[str, Any]:
    async with redis_client() as (redis, ns):
        resolved, _ = await _cart_id_for(redis, ns, session, payload.cartId or cart_id)
        cart = await _get_json(redis, ns, f"cart:{resolved}", {"lines": []})
        cart["lines"] = [
            l for l in cart["lines"]
            if f"{l['productId']}::{l.get('variant') or ''}" != payload.key
        ]
        await _set_json(redis, ns, f"cart:{resolved}", cart)
        return await _cart_payload(redis, ns, resolved)


@app.post("/cart/clear")
async def cart_clear(
    payload: CartClearIn,
    session: Optional[str] = Header(default=None, alias="X-Ferix-Session"),
    cart_id: Optional[str] = Header(default=None, alias="X-Ferix-Cart"),
) -> Dict[str, Any]:
    async with redis_client() as (redis, ns):
        resolved, _ = await _cart_id_for(redis, ns, session, payload.cartId or cart_id)
        await _set_json(redis, ns, f"cart:{resolved}", {"lines": []})
        return await _cart_payload(redis, ns, resolved)


@app.post("/cart/save-for-later")
async def cart_save_for_later(
    payload: CartRemoveIn,
    session: Optional[str] = Header(default=None, alias="X-Ferix-Session"),
    cart_id: Optional[str] = Header(default=None, alias="X-Ferix-Cart"),
) -> Dict[str, Any]:
    async with redis_client() as (redis, ns):
        resolved, user = await _cart_id_for(redis, ns, session, payload.cartId or cart_id)
        product_id = payload.key.split("::")[0]
        if user:
            wishlist = await _get_json(redis, ns, f"user:{user['id']}:wishlist", [])
            if product_id not in wishlist:
                wishlist.append(product_id)
            await _set_json(redis, ns, f"user:{user['id']}:wishlist", wishlist)
        cart = await _get_json(redis, ns, f"cart:{resolved}", {"lines": []})
        cart["lines"] = [
            l for l in cart["lines"]
            if f"{l['productId']}::{l.get('variant') or ''}" != payload.key
        ]
        await _set_json(redis, ns, f"cart:{resolved}", cart)
        return await _cart_payload(redis, ns, resolved)


# ---------------------------------------------------------------------------
# Account
# ---------------------------------------------------------------------------


@app.get("/account")
async def account_dashboard(session: Optional[str] = Header(default=None, alias="X-Ferix-Session")) -> Dict[str, Any]:
    async with redis_client() as (redis, ns):
        user = await _require_user(redis, ns, session)
        orders = await _get_json(redis, ns, f"user:{user['id']}:orders", [])
        wishlist = await _get_json(redis, ns, f"user:{user['id']}:wishlist", [])
        addresses = await _get_json(redis, ns, f"user:{user['id']}:addresses", [])
        reviews = await _get_json(redis, ns, f"user:{user['id']}:reviews", [])
        follows = await _get_json(redis, ns, f"user:{user['id']}:follows", [])
        spent = round(sum(o["total"] for o in orders), 2)
        return {
            "user": await _public_user(user),
            "orders": orders[:5],
            "activeOrders": sum(1 for o in orders if o["fulfillment"] not in {"delivered", "cancelled"}),
            "wishlist": [PRODUCT_BY_ID[i] for i in wishlist if i in PRODUCT_BY_ID],
            "addresses": addresses,
            "reviews": reviews,
            "follows": follows,
            "stats": {
                "orderCount": len(orders), "spent": spent,
                "averageOrder": round(spent / len(orders), 2) if orders else 0.0,
                "wishlistCount": len(wishlist), "addressCount": len(addresses),
                "reviewCount": len(reviews), "since": user["createdAt"],
            },
        }


@app.get("/account/orders")
async def account_orders(
    status: Optional[str] = None,
    session: Optional[str] = Header(default=None, alias="X-Ferix-Session"),
) -> Dict[str, Any]:
    async with redis_client() as (redis, ns):
        user = await _require_user(redis, ns, session)
        orders = await _get_json(redis, ns, f"user:{user['id']}:orders", [])
        if status and status != "all":
            orders = [o for o in orders if o["fulfillment"] == status]
        orders = sorted(orders, key=lambda o: o["placedAt"], reverse=True)
        return {
            "orders": orders,
            "counts": {
                "all": len(await _get_json(redis, ns, f"user:{user['id']}:orders", [])),
                "processing": sum(1 for o in orders if o["fulfillment"] == "processing"),
                "shipped": sum(1 for o in orders if o["fulfillment"] == "shipped"),
                "delivered": sum(1 for o in orders if o["fulfillment"] == "delivered"),
            },
        }


@app.get("/account/orders/detail")
async def account_order_detail(
    orderId: str = Query(...),
    session: Optional[str] = Header(default=None, alias="X-Ferix-Session"),
) -> Dict[str, Any]:
    async with redis_client() as (redis, ns):
        user = await _require_user(redis, ns, session)
        orders = await _get_json(redis, ns, f"user:{user['id']}:orders", [])
        order = next(((o) for o in orders if o["id"] == orderId or o["number"] == orderId), None)
        if not order:
            raise HTTPException(status_code=404, detail="We could not find that order")
        carrier_merchants = [
            {**_merchant_card(MERCHANT_BY_ID[m]), "items": [i for i in order["items"] if i["merchantId"] == m]}
            for m in order["merchantIds"] if m in MERCHANT_BY_ID
        ]
        return {"order": order, "merchants": carrier_merchants}


@app.post("/account/orders/reorder")
async def account_reorder(
    payload: ReorderIn,
    session: Optional[str] = Header(default=None, alias="X-Ferix-Session"),
) -> Dict[str, Any]:
    async with redis_client() as (redis, ns):
        user = await _require_user(redis, ns, session)
        orders = await _get_json(redis, ns, f"user:{user['id']}:orders", [])
        order = next((o for o in orders if o["id"] == payload.orderId), None)
        if not order:
            raise HTTPException(status_code=404, detail="We could not find that order")
        resolved, _ = await _cart_id_for(redis, ns, session, payload.cartId, create=True)
        cart = await _get_json(redis, ns, f"cart:{resolved}", {"lines": []})
        added = 0
        for item in order["items"]:
            if item["productId"] not in PRODUCT_BY_ID:
                continue
            match = next((l for l in cart["lines"] if l["productId"] == item["productId"]
                          and l.get("variant") == item["variant"]), None)
            if match:
                match["qty"] = min(99, match["qty"] + item["qty"])
            else:
                cart["lines"].append({"productId": item["productId"],
                                      "variant": item["variant"], "qty": item["qty"]})
            added += 1
        await _set_json(redis, ns, f"cart:{resolved}", cart)
        return {"added": added, "cart": await _cart_payload(redis, ns, resolved)}


@app.get("/account/addresses")
async def account_addresses(session: Optional[str] = Header(default=None, alias="X-Ferix-Session")) -> Dict[str, Any]:
    async with redis_client() as (redis, ns):
        user = await _require_user(redis, ns, session)
        addresses = await _get_json(redis, ns, f"user:{user['id']}:addresses", [])
        return {"addresses": addresses}


@app.post("/account/addresses")
async def account_address_add(
    payload: AddressIn,
    session: Optional[str] = Header(default=None, alias="X-Ferix-Session"),
) -> Dict[str, Any]:
    async with redis_client() as (redis, ns):
        user = await _require_user(redis, ns, session)
        addresses = await _get_json(redis, ns, f"user:{user['id']}:addresses", [])
        address = {**payload.model_dump(), "id": f"adr_{uuid.uuid4().hex[:10]}"}
        if address["isDefault"] or not addresses:
            address["isDefault"] = True
            for existing in addresses:
                existing["isDefault"] = False
        addresses.append(address)
        await _set_json(redis, ns, f"user:{user['id']}:addresses", addresses)
        return {"addresses": addresses, "address": address}


@app.patch("/account/addresses")
async def account_address_patch(
    payload: AddressPatchIn,
    session: Optional[str] = Header(default=None, alias="X-Ferix-Session"),
) -> Dict[str, Any]:
    async with redis_client() as (redis, ns):
        user = await _require_user(redis, ns, session)
        addresses = await _get_json(redis, ns, f"user:{user['id']}:addresses", [])
        target = next((a for a in addresses if a["id"] == payload.id), None)
        if not target:
            raise HTTPException(status_code=404, detail="That address is not on your account")
        patch = {k: v for k, v in payload.model_dump().items() if k != "id" and v is not None}
        target.update(patch)
        if patch.get("isDefault"):
            for existing in addresses:
                existing["isDefault"] = existing["id"] == payload.id
        await _set_json(redis, ns, f"user:{user['id']}:addresses", addresses)
        return {"addresses": addresses, "address": target}


@app.delete("/account/addresses")
async def account_address_delete(
    payload: AddressIdIn,
    session: Optional[str] = Header(default=None, alias="X-Ferix-Session"),
) -> Dict[str, Any]:
    async with redis_client() as (redis, ns):
        user = await _require_user(redis, ns, session)
        addresses = await _get_json(redis, ns, f"user:{user['id']}:addresses", [])
        remaining = [a for a in addresses if a["id"] != payload.id]
        if remaining and not any(a["isDefault"] for a in remaining):
            remaining[0]["isDefault"] = True
        await _set_json(redis, ns, f"user:{user['id']}:addresses", remaining)
        return {"addresses": remaining}


@app.get("/account/wishlist")
async def account_wishlist(session: Optional[str] = Header(default=None, alias="X-Ferix-Session")) -> Dict[str, Any]:
    async with redis_client() as (redis, ns):
        user = await _require_user(redis, ns, session)
        ids = await _get_json(redis, ns, f"user:{user['id']}:wishlist", [])
        return {"wishlist": [PRODUCT_BY_ID[i] for i in ids if i in PRODUCT_BY_ID]}


@app.post("/account/wishlist/toggle")
async def account_wishlist_toggle(
    payload: WishlistIn,
    session: Optional[str] = Header(default=None, alias="X-Ferix-Session"),
) -> Dict[str, Any]:
    async with redis_client() as (redis, ns):
        user = await _require_user(redis, ns, session)
        if payload.productId not in PRODUCT_BY_ID:
            raise HTTPException(status_code=404, detail="That product is not available")
        ids = await _get_json(redis, ns, f"user:{user['id']}:wishlist", [])
        if payload.productId in ids:
            ids = [i for i in ids if i != payload.productId]
            saved = False
        else:
            ids.append(payload.productId)
            saved = True
        await _set_json(redis, ns, f"user:{user['id']}:wishlist", ids)
        return {"saved": saved, "wishlist": [PRODUCT_BY_ID[i] for i in ids if i in PRODUCT_BY_ID]}


@app.get("/account/reviews")
async def account_reviews(session: Optional[str] = Header(default=None, alias="X-Ferix-Session")) -> Dict[str, Any]:
    async with redis_client() as (redis, ns):
        user = await _require_user(redis, ns, session)
        reviews = await _get_json(redis, ns, f"user:{user['id']}:reviews", [])
        enriched = [
            {**r, "product": PRODUCT_BY_ID.get(r["productId"])} for r in reviews
        ]
        return {"reviews": enriched}


@app.post("/account/reviews")
async def account_review_create(
    payload: ReviewIn,
    session: Optional[str] = Header(default=None, alias="X-Ferix-Session"),
) -> Dict[str, Any]:
    async with redis_client() as (redis, ns):
        user = await _require_user(redis, ns, session)
        product = PRODUCT_BY_ID.get(payload.productId)
        if not product:
            raise HTTPException(status_code=404, detail="That product is not available")
        reviews = await _get_json(redis, ns, f"user:{user['id']}:reviews", [])
        existing = next((r for r in reviews if r["productId"] == payload.productId), None)
        if existing:
            existing.update({"rating": payload.rating, "title": payload.title,
                             "body": payload.body, "date": _now()})
        else:
            reviews.append({"id": f"rev_{uuid.uuid4().hex[:10]}", "productId": payload.productId,
                            "rating": payload.rating, "title": payload.title, "body": payload.body,
                            "date": _now(), "helpful": 0, "verified": True})
        await _set_json(redis, ns, f"user:{user['id']}:reviews", reviews)
        return {"reviews": reviews}


@app.patch("/account/reviews")
async def account_review_patch(
    payload: ReviewPatchIn,
    session: Optional[str] = Header(default=None, alias="X-Ferix-Session"),
) -> Dict[str, Any]:
    async with redis_client() as (redis, ns):
        user = await _require_user(redis, ns, session)
        reviews = await _get_json(redis, ns, f"user:{user['id']}:reviews", [])
        target = next((r for r in reviews if r["id"] == payload.id), None)
        if not target:
            raise HTTPException(status_code=404, detail="That review is not on your account")
        for field in ("rating", "title", "body"):
            value = getattr(payload, field)
            if value is not None:
                target[field] = value
        target["date"] = _now()
        await _set_json(redis, ns, f"user:{user['id']}:reviews", reviews)
        return {"reviews": reviews}


@app.delete("/account/reviews")
async def account_review_delete(
    payload: ReviewIdIn,
    session: Optional[str] = Header(default=None, alias="X-Ferix-Session"),
) -> Dict[str, Any]:
    async with redis_client() as (redis, ns):
        user = await _require_user(redis, ns, session)
        reviews = await _get_json(redis, ns, f"user:{user['id']}:reviews", [])
        remaining = [r for r in reviews if r["id"] != payload.id]
        await _set_json(redis, ns, f"user:{user['id']}:reviews", remaining)
        return {"reviews": remaining}


@app.get("/account/settings")
async def account_settings(session: Optional[str] = Header(default=None, alias="X-Ferix-Session")) -> Dict[str, Any]:
    async with redis_client() as (redis, ns):
        user = await _require_user(redis, ns, session)
        return {"user": await _public_user(user), "settings": user.get("settings", {})}


@app.patch("/account/settings")
async def account_settings_patch(
    payload: SettingsIn,
    session: Optional[str] = Header(default=None, alias="X-Ferix-Session"),
) -> Dict[str, Any]:
    async with redis_client() as (redis, ns):
        user = await _require_user(redis, ns, session)
        data = payload.model_dump()
        settings = user.get("settings", {})
        for field in ("language", "currency", "marketingEmails", "orderEmails", "smsUpdates", "profilePublic"):
            if data.get(field) is not None:
                settings[field] = data[field]
        if data.get("name"):
            user["name"] = data["name"]
            user["avatarInitials"] = "".join(p[0].upper() for p in data["name"].split()[:2]) or user["avatarInitials"]
        if data.get("phone") is not None:
            user["phone"] = data["phone"]
        user["settings"] = settings
        await _set_json(redis, ns, f"user:{user['id']}", user)
        return {"user": await _public_user(user), "settings": settings}


# ---------------------------------------------------------------------------
# Checkout
# ---------------------------------------------------------------------------


@app.get("/shipping/options")
async def shipping_options() -> Dict[str, Any]:
    return {"options": SHIPPING_OPTIONS, "paymentMethods": PAYMENT_METHODS,
            "freeShippingOver": FREE_SHIPPING_OVER, "taxRate": TAX_RATE}


@app.post("/checkout/quote")
async def checkout_quote(
    payload: CheckoutIn,
    session: Optional[str] = Header(default=None, alias="X-Ferix-Session"),
    cart_id: Optional[str] = Header(default=None, alias="X-Ferix-Cart"),
) -> Dict[str, Any]:
    async with redis_client() as (redis, ns):
        resolved, user = await _cart_id_for(redis, ns, session, payload.cartId or cart_id, create=False)
        if not resolved:
            raise HTTPException(status_code=409, detail="Your cart is empty")
        cart = await _cart_payload(redis, ns, resolved)
        if not cart["lines"]:
            raise HTTPException(status_code=409, detail="Your cart is empty")
        address = None
        if user:
            addresses = await _get_json(redis, ns, f"user:{user['id']}:addresses", [])
            address = next((a for a in addresses if a["id"] == payload.addressId), None)
        option = next((o for o in SHIPPING_OPTIONS if o["id"] == payload.shippingMethod),
                      SHIPPING_OPTIONS[0])
        groups = []
        for group in cart["merchants"]:
            group_shipping = group["shipping"] if option["id"] == "standard" else round(
                option["price"] / max(1, len(cart["merchants"])), 2
            )
            groups.append({**group, "shipping": group_shipping})
        shipping = round(sum(g["shipping"] for g in groups), 2)
        tax = round(cart["subtotal"] * TAX_RATE, 2)
        commission = round(sum(
            line["lineTotal"] * MERCHANT_BY_ID[line["product"]["merchantId"]]["commissionPct"] / 100
            for line in cart["lines"]
        ), 2)
        return {
            "cart": cart, "groups": groups, "address": address,
            "shippingOption": option,
            "totals": {"subtotal": cart["subtotal"], "shipping": shipping, "tax": tax,
                       "total": round(cart["subtotal"] + shipping + tax, 2),
                       "commission": commission, "itemCount": cart["count"]},
            "freeShippingOver": FREE_SHIPPING_OVER,
        }


@app.post("/checkout/place")
async def checkout_place(
    payload: CheckoutIn,
    session: Optional[str] = Header(default=None, alias="X-Ferix-Session"),
    cart_id: Optional[str] = Header(default=None, alias="X-Ferix-Cart"),
) -> Dict[str, Any]:
    async with redis_client() as (redis, ns):
        user = await _require_user(redis, ns, session)
        resolved, _ = await _cart_id_for(redis, ns, session, payload.cartId or cart_id, create=False)
        if not resolved:
            raise HTTPException(status_code=409, detail="Your cart is empty")
        quote = await checkout_quote(payload, session, cart_id)
        if not quote["cart"]["lines"]:
            raise HTTPException(status_code=409, detail="Your cart is empty")
        addresses = await _get_json(redis, ns, f"user:{user['id']}:addresses", [])
        address = next((a for a in addresses if a["id"] == payload.addressId), None)
        if not address:
            raise HTTPException(status_code=422, detail="Choose a delivery address")
        orders = await _get_json(redis, ns, f"user:{user['id']}:orders", [])
        items = [{
            "productId": line["product"]["id"], "title": line["product"]["title"],
            "variant": line["variant"], "qty": line["qty"], "price": line["product"]["price"],
            "merchantId": line["product"]["merchantId"],
            "merchantName": MERCHANT_BY_ID[line["product"]["merchantId"]]["name"],
        } for line in quote["cart"]["lines"]]
        placed = _now()
        order = {
            "id": f"ord_{uuid.uuid4().hex[:10]}",
            "number": f"FX-{4800 + len(orders)}",
            "placedAt": placed,
            "channel": "marketplace",
            "items": items,
            "merchantIds": sorted({i["merchantId"] for i in items}),
            "subtotal": quote["totals"]["subtotal"],
            "shipping": quote["totals"]["shipping"],
            "tax": quote["totals"]["tax"],
            "total": quote["totals"]["total"],
            "commission": quote["totals"]["commission"],
            "payment": "paid" if payload.paymentMethod != "transfer" else "pending",
            "fulfillment": "processing",
            "carrier": None, "tracking": None,
            "address": address, "note": payload.note,
            "shippingMethod": payload.shippingMethod,
            "paymentMethod": payload.paymentMethod,
            "timeline": [{"label": "Order placed", "at": placed},
                         {"label": "Payment confirmed", "at": placed if payload.paymentMethod != "transfer" else None}],
        }
        orders.insert(0, order)
        await _set_json(redis, ns, f"user:{user['id']}:orders", orders)
        await redis.incr(f"{ns}:stats:orders")
        await _set_json(redis, ns, f"cart:{resolved}", {"lines": []})
        logger.info("Order placed", order=order["number"], total=order["total"])
        return {"order": order}


if __name__ == "__main__":
    run_service(app)

"""Ferixas commerce API.

One backend serves three surfaces:

* the shopper marketplace      (/catalog, /auth, /cart, /account, /checkout)
* the seller workspace         (/merchant/*)
* the platform console         (/admin/*) — including the marketplace CMS

Neon PostgreSQL is the source of truth. Cloudinary and Resend are optional
adapters enabled by environment variables.
"""
from __future__ import annotations

import json
import os
import secrets
import uuid
from datetime import timedelta
from typing import Optional

from fastapi import FastAPI, Header, HTTPException, Query, Request
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select
from starlette.exceptions import HTTPException as StarletteHTTPException

from core import (
    Address, Cart, Catalog, ContentDocument, FlashSale, FlashSaleItem, FREE_SHIPPING_OVER,
    Order, Review, SESSION_DAYS, SessionLocal, SessionToken, TAX_RATE, User, Wishlist,
    backfill_catalogue_media,
    cart_for as _cart_for, cart_payload, categories as category_rows, brands as brand_rows,
    collections as collection_rows, decorate, find_merchant, find_product, get_user,
    hash_password, iso, line_key, merchants as merchant_rows, now, product_rows,
    public_product_fields, public_products, public_review_data, public_user, put_row,
    record_merchant_follow_activity, require_user, sale_status, seed, store_card,
    is_seller_product, marketplace_product_available, paid_marketplace_product_units,
    verify_password, Base, engine, banners as banner_rows, MEDIA_ROOT, UPLOAD_ROOT, sync_pending_media,
    merchant_follower_count,
)

from routers import admin as admin_router
from routers import merchant as merchant_router
from notifications import order_confirmation, welcome

# ── Request models ─────────────────────────────────────────────────────────

class RegisterIn(BaseModel):
    name: str = Field(min_length=2, max_length=160)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class CartItemIn(BaseModel):
    productId: str
    variant: Optional[str] = None
    qty: int = Field(default=1, ge=1, le=99)
    cartId: Optional[str] = None


class CartQtyIn(BaseModel):
    key: str
    qty: int = Field(ge=0, le=99)
    cartId: Optional[str] = None


class CartKeyIn(BaseModel):
    key: str
    cartId: Optional[str] = None


class AddressIn(BaseModel):
    id: Optional[str] = None
    label: str = "Home"
    name: str
    phone: str = ""
    line1: str
    line2: Optional[str] = None
    city: str
    region: str = ""
    postcode: str = ""
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


class IdIn(BaseModel):
    id: str


class ProductIn(BaseModel):
    productId: str


class ReorderIn(BaseModel):
    orderId: str
    cartId: Optional[str] = None


class SettingsIn(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    language: Optional[str] = None
    currency: Optional[str] = None
    marketingEmails: Optional[bool] = None
    orderEmails: Optional[bool] = None
    smsUpdates: Optional[bool] = None
    profilePublic: Optional[bool] = None


class ReviewIn(BaseModel):
    productId: str
    rating: int = Field(ge=1, le=5)
    title: str = ""
    body: str = ""


class ReviewPatchIn(BaseModel):
    id: str
    rating: Optional[int] = Field(default=None, ge=1, le=5)
    title: Optional[str] = None
    body: Optional[str] = None


class CheckoutIn(BaseModel):
    # addressId is a saved address, which only a signed-in shopper has. A guest sends the
    # address inline instead, and an email so the order can be confirmed.
    addressId: str = ""
    shippingMethod: str = "standard"
    paymentMethod: str = "card"
    note: Optional[str] = None
    cartId: Optional[str] = None
    email: Optional[str] = None
    name: Optional[str] = None
    phone: Optional[str] = None
    line1: Optional[str] = None
    line2: Optional[str] = None
    city: Optional[str] = None
    region: Optional[str] = None
    postcode: Optional[str] = None
    country: Optional[str] = None


# ── App ────────────────────────────────────────────────────────────────────

class CompatibleMediaFiles(StaticFiles):
    """Serve bundled /media assets and legacy local upload URLs together."""

    def __init__(self, directory: str, upload_directory: str):
        super().__init__(directory=directory)
        self.upload_fallback = StaticFiles(directory=upload_directory)

    async def get_response(self, path: str, scope):
        if "/" not in path.strip("/"):
            try:
                return await super().get_response(path, scope)
            except (HTTPException, StarletteHTTPException) as exc:
                if exc.status_code != 404:
                    raise
                return await self.upload_fallback.get_response(path, scope)
        return await super().get_response(path, scope)


from contextlib import asynccontextmanager


@asynccontextmanager
async def lifespan(_: FastAPI):
    """Prepare the database before the first request is served.

    This is the modern equivalent of the startup event below, and it is the one
    FastAPI guarantees to run. The event handler is kept as well because running
    both is harmless - create_all, migrate and the seed are each idempotent - but
    on a fresh deployment the tables, the migrations and the seed must happen, and
    relying on a deprecated hook is how they ended up being run by hand.
    """
    Base.metadata.create_all(engine)
    from core import migrate

    migrate()
    with SessionLocal() as db:
        # Only seed a database that has nothing in it. Restarting a live platform
        # must never write the starter content over real data.
        if not db.scalar(select(Catalog.key).limit(1)):
            seed(db)
    print("[ferixas] startup: tables ready, migrations applied, content in place")
    yield


app = FastAPI(title="Ferixas Commerce API", version="3.0.0", lifespan=lifespan)
app.mount("/media", CompatibleMediaFiles(str(MEDIA_ROOT), str(UPLOAD_ROOT)), name="media")
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_ROOT)), name="uploads")
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "*").split(","),
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def carry_frontend_credentials(request: Request, call_next):
    """Accept the credential transport every Ferixas frontend uses.

    Reads carry the session in query parameters; writes carry it in the JSON
    body. Both are normalised into the header the route handlers read, so the
    same handlers work behind a plain proxy that drops custom headers.
    """
    session = request.query_params.get("session")
    cart_id = request.query_params.get("cartId")
    if request.method in {"POST", "PATCH", "PUT", "DELETE"}:
        raw = await request.body()
        if raw:
            try:
                payload = json.loads(raw)
            except (TypeError, ValueError):
                payload = {}
            if isinstance(payload, dict):
                session = payload.get("session") or session
                cart_id = payload.get("cartId") or cart_id

        async def receive():
            return {"type": "http.request", "body": raw, "more_body": False}

        request._receive = receive
    headers = list(request.scope["headers"])
    if session:
        headers.append((b"x-ferix-session", str(session).encode()))
    if cart_id:
        headers.append((b"x-ferix-cart", str(cart_id).encode()))
    request.scope["headers"] = headers
    return await call_next(request)


@app.on_event("startup")
def startup():
    print("[ferixas] startup event fired")
    Base.metadata.create_all(engine)
    # create_all creates missing TABLES and never alters an existing one, so a
    # database provisioned before a column was added would break the moment that
    # column is queried. startup used to call create_all alone and never reached
    # the migration that lives in core, which is why this is called here now.
    from core import migrate

    migrate()
    with SessionLocal() as db:
        seed(db)
        backfill_catalogue_media(db)
        db.commit()
        sync_pending_media(db)


# ── Service ────────────────────────────────────────────────────────────────

@app.get("/")
def info():
    with SessionLocal() as db:
        return {
            "service": "ferixas-commerce-api", "version": "3.0.0", "database": "connected",
            "products": len(product_rows(db)), "merchants": len(merchant_rows(db)),
            "categories": len(category_rows(db)), "collections": len(collection_rows(db)),
            "surfaces": ["marketplace", "merchant", "admin"], "status": "ready",
        }


@app.get("/health")
def health():
    with SessionLocal() as db:
        db.execute(select(Catalog.key).limit(1))
        return {
            "ok": True, "database": "ok",
            "storage": "cloudinary-configured" if os.getenv("CLOUDINARY_URL") else "local-mvp",
            "mail": "resend-configured" if os.getenv("RESEND_API_KEY") else "pending-configuration",
            "payments": "configured" if os.getenv("PAYMENT_PROVIDER_KEY") else "pending-configuration",
        }


# ── Catalogue (shoppers) ───────────────────────────────────────────────────

@app.get("/catalog/categories")
def categories():
    with SessionLocal() as db:
        rows = [p for p in product_rows(db) if marketplace_product_available(db, p)]
        return {"categories": sorted(
            [{**c, "count": sum(p.get("category") == c.get("slug") for p in rows)}
             for c in category_rows(db) if c.get("visible", True)],
            key=lambda c: c.get("position", 0))}


@app.get("/catalog/brands")
def brands():
    """Public brand directory: only visible brands, in editorial order."""
    with SessionLocal() as db:
        rows = [b for b in brand_rows(db) if b.get("visible", True)]
        rows.sort(key=lambda b: (int(b.get("position", 0)), str(b.get("name", "")).lower()))
        return {"brands": rows}



def brand_facets(catalogue: list) -> list:
    """Every brand present in the catalogue, with how many products it holds."""
    names = {}
    counts = {}
    for product in catalogue:
        slug = brand_of(product)
        if not slug:
            continue
        counts[slug] = counts.get(slug, 0) + 1
        names.setdefault(slug, product.get("brandName") or product.get("merchantName") or slug)
    return [
        {"slug": slug, "name": names.get(slug, slug), "count": counts[slug]}
        for slug in sorted(counts, key=lambda s: (-counts[s], s))
    ]


def spec_facets(catalogue: list) -> list:
    """Specifications a shopper can filter on, taken from the product variants."""
    index = {}
    for product in catalogue:
        for name, value in specs_of(product):
            index.setdefault(name, {}).setdefault(value, 0)
            index[name][value] += 1
    return [
        {"name": name,
         "values": [{"value": value, "count": count} for value, count in sorted(values.items())]}
        for name, values in sorted(index.items())
    ]


PRICE_BANDS = [
    {"id": "under-50", "label": "Under 50", "min": None, "max": 50.0},
    {"id": "50-150", "label": "50 - 150", "min": 50.0, "max": 150.0},
    {"id": "150-400", "label": "150 - 400", "min": 150.0, "max": 400.0},
    {"id": "400-plus", "label": "400 and up", "min": 400.0, "max": None},
]


def as_list(value):
    """One value or many, as a clean list. Repeatable filters arrive as a list."""
    if value is None:
        return []
    if isinstance(value, str):
        return [value] if value.strip() else []
    return [item for item in value if item]


def brand_of(product: dict) -> str:
    """The brand a product belongs to.

    Products may carry an explicit brand once the catalogue sets one; where they
    do not, the seller is the brand, which is exactly how the storefront already
    presents them. This is why a brand filter works today without a migration.
    """
    return str(
        product.get("brandSlug")
        or product.get("brandId")
        or product.get("merchantSlug")
        or product.get("merchantId")
        or ""
    )


def specs_of(product: dict) -> list:
    """Filterable attributes a product already carries: its variant values."""
    pairs = []
    for variant in product.get("variants") or []:
        name = (variant or {}).get("name")
        for value in (variant or {}).get("values") or []:
            if name and value:
                pairs.append((str(name), str(value)))
    return pairs


@app.get("/catalog/products")
def products(search: Optional[str] = None,
             category: Optional[list[str]] = Query(None),
             brand: Optional[list[str]] = Query(None),
             collection: Optional[str] = None,
             store: Optional[list[str]] = Query(None),
             spec: Optional[list[str]] = Query(None),
             minPrice: Optional[float] = None, maxPrice: Optional[float] = None,
             rating: Optional[float] = None, inStock: Optional[bool] = None, onSale: Optional[bool] = None,
             sort: str = "relevance", page: int = 1, perPage: int = 24):
    with SessionLocal() as db:
        # Only what has been approved belongs in the shop. A seller's listing sits in this table
        # while it is being reviewed, and a draft was reaching the public catalogue and its counts.
        # STRICT FILTER: Only approved products appear in public catalogs
        catalogue = decorate(db, [
            row for row in product_rows(db)
            if marketplace_product_available(db, row)
        ])
        public_by_id = {item["id"]: item for item in public_products(db, catalogue)}
        paid_units = paid_marketplace_product_units(db, days=30)
        items = list(catalogue)
        q = (search or "").lower()
        if q:
            items = [p for p in items if q in json.dumps(public_product_fields(p)).lower()]
        chosen_categories = as_list(category)
        if chosen_categories:
            items = [p for p in items if p.get("category") in chosen_categories]
        chosen_brands = as_list(brand)
        if chosen_brands:
            items = [p for p in items if brand_of(p) in chosen_brands]
        if collection:
            items = [p for p in items if collection in (p.get("collections") or [])]
        chosen_stores = as_list(store)
        if chosen_stores:
            items = [p for p in items if p.get("merchantSlug") in chosen_stores
                     or p.get("merchantId") in chosen_stores]
        wanted_specs = []
        for raw in as_list(spec):
            if ":" in raw:
                name, value = raw.split(":", 1)
                wanted_specs.append((name.strip(), value.strip()))
        if wanted_specs:
            items = [p for p in items if all(pair in specs_of(p) for pair in wanted_specs)]
        if minPrice is not None:
            items = [p for p in items if p["price"] >= minPrice]
        if maxPrice is not None:
            items = [p for p in items if p["price"] <= maxPrice]
        if rating is not None:
            items = [p for p in items if (public_by_id.get(p["id"], {}).get("rating") or 0) >= rating]
        if inStock:
            items = [p for p in items if p["stock"] > 0]
        if onSale:
            items = [p for p in items if p.get("compareAt") or p.get("promotion")]
        if sort == "price-asc":
            items.sort(key=lambda p: p["price"])
        elif sort == "price-desc":
            items.sort(key=lambda p: -p["price"])
        elif sort == "new":
            items.sort(key=lambda p: p.get("createdAt", ""), reverse=True)
        elif sort == "best":
            items.sort(key=lambda p: -paid_units.get(p["id"], 0))
        else:
            items.sort(key=lambda p: -((public_by_id.get(p["id"], {}).get("rating") or 0) * 100
                                       + public_by_id.get(p["id"], {}).get("reviewCount", 0) / 10
                                       + paid_units.get(p["id"], 0) / 10))
        total = len(items)
        per_page = max(1, min(60, perPage))
        start = (page - 1) * per_page
        return {
            "items": [public_by_id[p["id"]] for p in items[start:start + per_page]], "total": total, "page": page,
            "perPage": per_page, "pages": max(1, (total + per_page - 1) // per_page),
            "facets": {
                "categories": [
                    {"slug": c["slug"], "name": c.get("name", c["slug"]),
                     "count": sum(1 for p in catalogue if p.get("category") == c["slug"])}
                    for c in sorted(category_rows(db), key=lambda c: c.get("position", 0))
                ],
                "stores": [
                    {"slug": m["slug"], "name": m.get("name", m["slug"]),
                     "count": sum(1 for p in catalogue if p.get("merchantId") == m["id"])}
                    for m in sorted(merchant_rows(db), key=lambda m: m.get("name", ""))
                ],
                "brands": brand_facets(catalogue),
                "priceBuckets": [
                    {"id": band["id"], "label": band["label"],
                     "count": sum(1 for p in catalogue
                                  if (band["min"] is None or p.get("price", 0) >= band["min"])
                                  and (band["max"] is None or p.get("price", 0) <= band["max"]))}
                    for band in PRICE_BANDS
                ],
                "specs": spec_facets(catalogue),
            },
        }


@app.get("/catalog/product")
def product(slug: str):
    with SessionLocal() as db:
        found = find_product(db, slug)
        if not found or not marketplace_product_available(db, found):
            raise HTTPException(404, "That product is not available")
        merchant = find_merchant(db, found["merchantId"])
        related = [p for p in product_rows(db)
                   if marketplace_product_available(db, p) and p["id"] != found["id"]
                   and (p.get("merchantId") == found.get("merchantId") or p.get("category") == found.get("category"))][:8]
        reviews = db.scalars(select(Review).where(Review.product_id == found["id"])).all()
        return {
            "product": public_products(db, decorate(db, [found]))[0],
            "merchant": store_card(db, merchant) if merchant else {},
            "reviews": [public_review_data(review) for review in reviews],
            "related": public_products(db, decorate(db, related)),
            "shipping": [
                {"label": "Standard", "detail": "2-5 working days, tracked end to end"},
                {"label": "Express", "detail": "1-2 working days where available"},
            ],
            "returns": "30-day returns. Free on orders above $120.",
        }


@app.get("/catalog/home")
def home():
    """The marketplace homepage. Everything here is CMS-managed."""
    with SessionLocal() as db:
        # STRICT FILTER: Only approved products appear on homepage
        all_items = product_rows(db)
        items = [p for p in all_items if marketplace_product_available(db, p)]
        decorated = decorate(db, items)
        public_by_id = {item["id"]: item for item in public_products(db, decorated)}
        paid_units = paid_marketplace_product_units(db, days=30)
        def safe_products(rows: list[dict]) -> list[dict]:
            return [public_by_id[row["id"]] for row in rows if row.get("id") in public_by_id]
        cats = category_rows(db)
        cols = collection_rows(db)
        ms = merchant_rows(db)
        brands = sorted(
            [b for b in brand_rows(db) if b.get("visible", True)],
            key=lambda b: (int(b.get("position", 0)), str(b.get("name", "")).lower()),
        )

        doc = db.get(ContentDocument, "doc_marketplace_home")
        content = (doc.data if doc and doc.status == "published" else None) or {"sections": []}

        live_banners = [b for b in banner_rows(db) if b.get("active", True)]
        sale = next((s for s in db.scalars(select(FlashSale)).all() if sale_status(s) == "live"), None)
        flash_items = []
        if sale:
            ids = [i.product_id for i in db.scalars(select(FlashSaleItem).where(FlashSaleItem.sale_id == sale.id)).all()]
            flash_items = [p for p in decorated if p["id"] in ids]

        return {
            "banners": sorted(live_banners, key=lambda b: b.get("position", 0)),
            "content": content,
            "categories": sorted([{**c, "count": sum(p.get("category") == c.get("slug") for p in items)}
                                  for c in cats if c.get("visible", True)], key=lambda c: c.get("position", 0)),
            "collections": [{**c, "count": sum(c["slug"] in (p.get("collections") or []) for p in items),
                             "products": safe_products([p for p in decorated if c["slug"] in (p.get("collections") or [])][:4])}
                            for c in cols if c.get("visible", True)],
            "featured": safe_products(sorted(decorated, key=lambda p: -((public_by_id[p["id"]].get("rating") or 0)
                                                                         * 100 + public_by_id[p["id"]].get("reviewCount", 0)))[:8]),
            "trending": safe_products(sorted(decorated, key=lambda p: -paid_units.get(p["id"], 0))[:8]),
            "newArrivals": safe_products(sorted(decorated, key=lambda p: p.get("createdAt", ""), reverse=True)[:8]),
            "under100": safe_products([p for p in decorated if p["price"] < 100][:8]),
            "official": safe_products([p for p in decorated if p.get("merchantId") == "ferixas-official"][:4]),
            "flashSale": ({"id": sale.id, "name": sale.name, "headline": sale.headline,
                           "endsAt": iso(sale.ends_at), "bannerUrl": sale.banner_url,
                           "products": safe_products(flash_items[:8])} if sale else None),
            "stores": [store_card(db, m) for m in ms],
            # Hook for a future CMS `featured_brands` section. The existing
            # document contract remains untouched; clients can opt into this
            # data without requiring a schema migration.
            "brands": brands,
            "stats": {"products": len(items), "merchants": len(ms), "categories": len(cats)},
        }


@app.get("/catalog/category")
def category(slug: str, sort: str = "relevance"):
    with SessionLocal() as db:
        found = next((c for c in category_rows(db) if c["slug"] == slug), None)
        if not found:
            raise HTTPException(404, "That category does not exist")
    return {"category": found, **products(category=slug, sort=sort)}


@app.get("/catalog/collections")
def collections():
    with SessionLocal() as db:
        items = decorate(db, [p for p in product_rows(db) if marketplace_product_available(db, p)])
        return {"collections": [{**c, "count": sum(c["slug"] in (p.get("collections") or []) for p in items),
                                 "products": public_products(db, [p for p in items if c["slug"] in (p.get("collections") or [])][:3])}
                                for c in collection_rows(db) if c.get("visible", True)]}


@app.get("/catalog/collection")
def collection(slug: str, sort: str = "relevance"):
    with SessionLocal() as db:
        found = next((c for c in collection_rows(db) if c["slug"] == slug), None)
        if not found:
            raise HTTPException(404, "That collection does not exist")
    return {"collection": found, **products(collection=slug, sort=sort, perPage=48)}


@app.get("/catalog/stores")
def stores(search: Optional[str] = None, sort: str = "top"):
    with SessionLocal() as db:
        rows = [store_card(db, m) for m in merchant_rows(db)
                if m.get("status", "active") == "active" and m.get("marketplaceEnabled", True)]
        q = (search or "").lower()
        rows = [m for m in rows if not q or q in m["name"].lower() or q in (m.get("tagline") or "").lower()]
        if sort == "new":
            rows.sort(key=lambda m: m.get("since", ""), reverse=True)
        else:
            rows.sort(key=lambda m: -((m.get("rating") or 0) * 100 + (m.get("followers") or 0) / 100))
        return {"stores": rows, "total": len(rows)}


@app.get("/catalog/store")
def store(slug: str):
    with SessionLocal() as db:
        merchant = find_merchant(db, slug)
        if not merchant or merchant.get("status", "active") != "active" or not merchant.get("marketplaceEnabled", True):
            raise HTTPException(404, "No store at that address")
        
        # STRICT CATALOG ISOLATION: Only display APPROVED products belonging to this specific merchant_id.
        # Platform products must NOT mix in.
        owned = decorate(db, [
            p for p in product_rows(db)
            if is_seller_product(p, merchant["id"])
            and marketplace_product_available(db, p)
        ])
        
        public_profile = store_card(db, merchant)
        followers = merchant_follower_count(db, merchant["id"])
        stats = {
            "products": len(owned),
            "rating": public_profile.get("rating"),
            "reviewCount": public_profile.get("reviewCount", 0),
            "followers": followers,
            "follower_count": followers,
            "total_reviews": public_profile.get("reviewCount", 0),
            "average_rating": public_profile.get("rating"),
        }
        return {
            "store": public_profile,
            "about": merchant.get("about", ""),
            "location": merchant.get("location", ""),
            "responseRate": merchant.get("responseRate") if merchant.get("responseRateVerified") else None,
            "fulfilmentRate": merchant.get("fulfilmentRate") if merchant.get("fulfilmentRateVerified") else None,
            "products": public_products(db, owned),
            "categories": [
                {"slug": c["slug"], "name": c.get("name", c["slug"]),
                 "count": sum(1 for p in owned if p.get("category") == c["slug"])}
                for c in sorted(category_rows(db), key=lambda c: c.get("position", 0))
                if any(p.get("category") == c["slug"] for p in owned)
            ],
            "stats": stats,
        }


@app.get("/search")
def search(q: str = ""):
    with SessionLocal() as db:
        needle = q.lower()
        items = decorate(db, [p for p in product_rows(db)
                              if marketplace_product_available(db, p)
                              and needle in json.dumps(public_product_fields(p)).lower()])
        found_stores = [store_card(db, m) for m in merchant_rows(db) if needle in m["name"].lower()]
        return {"query": q, "products": public_products(db, items[:24]), "stores": found_stores,
                "categories": [c for c in category_rows(db) if needle in c.get("name", "").lower()],
                "suggestions": []}


# ── Seller Follow System ───────────────────────────────────────────────────

@app.post("/sellers/{merchant_id}/follow")
def follow_seller(merchant_id: str, x_session: Optional[str] = Header(None, alias="X-Ferix-Session")):
    """Follow a seller to get updates about their products."""
    with SessionLocal() as db:
        user = require_user(db, x_session)
        user = db.scalar(select(User).where(User.id == user.id).with_for_update()) or user
        merchant = find_merchant(db, merchant_id)
        if not merchant or merchant.get("status", "active") != "active" or not merchant.get("marketplaceEnabled", True):
            raise HTTPException(404, "Seller not found")
        
        raw_followed = (user.settings or {}).get("followed_sellers", [])
        followed = list(dict.fromkeys(str(item) for item in raw_followed)) if isinstance(raw_followed, list) else []
        if merchant["id"] not in followed:
            followed.append(merchant["id"])
            user.settings = {**(user.settings or {}), "followed_sellers": followed}
            record_merchant_follow_activity(db, merchant, "follow")
            db.commit()
            return {"following": True, "follower_count": merchant_follower_count(db, merchant["id"])}
        
        return {"following": True, "message": "Already following this seller"}


@app.delete("/sellers/{merchant_id}/follow")
def unfollow_seller(merchant_id: str, x_session: Optional[str] = Header(None, alias="X-Ferix-Session")):
    """Unfollow a seller."""
    with SessionLocal() as db:
        user = require_user(db, x_session)
        user = db.scalar(select(User).where(User.id == user.id).with_for_update()) or user
        merchant = find_merchant(db, merchant_id)
        if not merchant or merchant.get("status", "active") != "active" or not merchant.get("marketplaceEnabled", True):
            raise HTTPException(404, "Seller not found")
        
        raw_followed = (user.settings or {}).get("followed_sellers", [])
        followed = list(dict.fromkeys(str(item) for item in raw_followed)) if isinstance(raw_followed, list) else []
        if merchant["id"] in followed:
            followed.remove(merchant["id"])
            user.settings = {**(user.settings or {}), "followed_sellers": followed}
            record_merchant_follow_activity(db, merchant, "unfollow")
            db.commit()
            return {"following": False, "follower_count": merchant_follower_count(db, merchant["id"])}
        
        return {"following": False, "message": "Not following this seller"}


@app.get("/sellers/{merchant_id}/following")
def check_following(merchant_id: str, x_session: Optional[str] = Header(None, alias="X-Ferix-Session")):
    """Check if current user is following a seller."""
    with SessionLocal() as db:
        user = get_user(db, x_session)
        if not user:
            return {"following": False}
        
        merchant = find_merchant(db, merchant_id)
        if not merchant or merchant.get("status", "active") != "active" or not merchant.get("marketplaceEnabled", True):
            raise HTTPException(404, "Seller not found")
        followed = (user.settings or {}).get("followed_sellers", [])
        followed = followed if isinstance(followed, list) else []
        return {"following": merchant["id"] in followed}


# ── Shopper session ────────────────────────────────────────────────────────

@app.post("/auth/register")
def register(p: RegisterIn, x_cart: Optional[str] = Header(None, alias="X-Ferix-Cart")):
    with SessionLocal() as db:
        email = str(p.email).lower()
        if db.scalar(select(User).where(User.email == email)):
            raise HTTPException(409, "An account already uses that email")
        user = User(id="usr_" + uuid.uuid4().hex[:12], name=p.name.strip(), email=email,
                    password_hash=hash_password(p.password),
                    settings={"language": "English", "currency": "USD", "marketingEmails": True,
                              "orderEmails": True, "smsUpdates": False, "profilePublic": False})
        db.add(user)
        db.add(Wishlist(id="wish_" + uuid.uuid4().hex[:10], user_id=user.id, product_ids=[]))
        token = secrets.token_urlsafe(32)
        db.add(SessionToken(token=token, user_id=user.id, expires_at=now() + timedelta(days=SESSION_DAYS)))
        db.commit()
        welcome(to=user.email, name=user.name)
        return {"token": token, "user": public_user(user), "cartId": x_cart or "cart_" + uuid.uuid4().hex[:12]}


@app.post("/auth/login")
def login(p: LoginIn, x_cart: Optional[str] = Header(None, alias="X-Ferix-Cart")):
    with SessionLocal() as db:
        user = db.scalar(select(User).where(User.email == str(p.email).lower()))
        if not user or not verify_password(p.password, user.password_hash):
            raise HTTPException(401, "Email or password is incorrect")
        token = secrets.token_urlsafe(32)
        db.add(SessionToken(token=token, user_id=user.id, expires_at=now() + timedelta(days=SESSION_DAYS)))
        db.commit()
        return {"token": token, "user": public_user(user), "cartId": x_cart or "cart_" + uuid.uuid4().hex[:12]}


@app.post("/auth/logout")
def logout(session: Optional[str] = Header(None, alias="X-Ferix-Session")):
    with SessionLocal() as db:
        if session and (row := db.get(SessionToken, session)):
            db.delete(row)
            db.commit()
    return {"ok": True}


@app.get("/auth/me")
def me(session: Optional[str] = Header(None, alias="X-Ferix-Session")):
    with SessionLocal() as db:
        user = get_user(db, session)
        return {"user": public_user(user) if user else None}


# ── Cart ───────────────────────────────────────────────────────────────────

def cart_for(db, user_id, cart_id):
    return _cart_for(db, user_id, cart_id) or Cart(id=cart_id or "cart_empty", lines=[])


@app.get("/cart")
def get_cart(session: Optional[str] = Query(None), cartId: Optional[str] = Query(None),
             x_session: Optional[str] = Header(None, alias="X-Ferix-Session"),
             x_cart: Optional[str] = Header(None, alias="X-Ferix-Cart")):
    with SessionLocal() as db:
        user = get_user(db, session or x_session)
        return cart_payload(db, cart_for(db, user.id if user else None, cartId or x_cart))


@app.post("/cart/items")
def add_cart(p: CartItemIn, session: Optional[str] = Header(None, alias="X-Ferix-Session"),
             x_cart: Optional[str] = Header(None, alias="X-Ferix-Cart")):
    with SessionLocal() as db:
        user = require_user(db, session) if session else None
        cart = cart_for(db, user.id if user else None, p.cartId or x_cart)
        product = find_product(db, p.productId)
        if not product or not marketplace_product_available(db, product):
            raise HTTPException(404, "That product is not available")
        raw = next((x for x in cart.lines if x["productId"] == p.productId and x.get("variant") == p.variant), None)
        if raw:
            raw["qty"] = min(99, raw["qty"] + p.qty)
        else:
            cart.lines = (cart.lines or []) + [{"productId": p.productId, "variant": p.variant, "qty": p.qty}]
        db.commit()
        return cart_payload(db, cart)


@app.patch("/cart/items")
def set_cart(p: CartQtyIn, session: Optional[str] = Header(None, alias="X-Ferix-Session")):
    with SessionLocal() as db:
        user = require_user(db, session)
        cart = cart_for(db, user.id, None)
        cart.lines = [x for x in cart.lines if line_key(x) != p.key or p.qty == 0]
        for line in cart.lines:
            if line_key(line) == p.key:
                line["qty"] = p.qty
        db.commit()
        return cart_payload(db, cart)


@app.delete("/cart/items")
def remove_cart(p: CartKeyIn, session: Optional[str] = Header(None, alias="X-Ferix-Session")):
    with SessionLocal() as db:
        user = require_user(db, session)
        cart = cart_for(db, user.id, None)
        cart.lines = [x for x in cart.lines if line_key(x) != p.key]
        db.commit()
        return cart_payload(db, cart)


@app.post("/cart/clear")
def clear_cart(session: Optional[str] = Header(None, alias="X-Ferix-Session")):
    with SessionLocal() as db:
        user = require_user(db, session)
        cart = cart_for(db, user.id, None)
        cart.lines = []
        db.commit()
        return cart_payload(db, cart)


@app.post("/cart/save-for-later")
def save_for_later(p: CartKeyIn, session: Optional[str] = Header(None, alias="X-Ferix-Session")):
    with SessionLocal() as db:
        user = require_user(db, session)
        cart = cart_for(db, user.id, None)
        product_id = p.key.split("::", 1)[0]
        wish = db.scalar(select(Wishlist).where(Wishlist.user_id == user.id))
        if wish and product_id not in (wish.product_ids or []):
            wish.product_ids = (wish.product_ids or []) + [product_id]
        cart.lines = [x for x in cart.lines if line_key(x) != p.key]
        db.commit()
        return cart_payload(db, cart)


# ── Account ────────────────────────────────────────────────────────────────

def user_reviews(db, user_id: str) -> list[dict]:
    """Every review a shopper has written, each carrying its product for the UI."""
    by_id = {p["id"]: p for p in product_rows(db)}
    rows_out = []
    for r in db.scalars(select(Review).where(Review.user_id == user_id)).all():
        data = dict(r.data or {})
        data["id"] = r.id
        data["productId"] = r.product_id
        data["product"] = by_id.get(r.product_id)
        rows_out.append(data)
    return rows_out


@app.get("/account")
def account(session: Optional[str] = Header(None, alias="X-Ferix-Session")):
    with SessionLocal() as db:
        user = require_user(db, session)
        wish = db.scalar(select(Wishlist).where(Wishlist.user_id == user.id))
        addresses = db.scalars(select(Address).where(Address.user_id == user.id)).all()
        orders = [o for o in db.scalars(select(Order).where(Order.user_id == user.id).order_by(Order.placed_at.desc())).all()
                  if str((o.data or {}).get("channel") or "").lower() == "marketplace"]
        by_id = {p["id"]: p for p in product_rows(db)}
        wishlist = [by_id[x] for x in (wish.product_ids if wish else []) if x in by_id]
        rows = [o.data for o in orders]
        settled = [o for o in rows if str(o.get("payment") or "").lower() in {"paid", "captured", "succeeded", "settled"}
                   and o.get("fulfillment") != "cancelled"]
        spent = round(sum(o.get("total", 0) for o in settled), 2)
        reviews = user_reviews(db, user.id)
        # Follow relationships store canonical seller IDs; the marketplace resolves them to cards.
        followed = (user.settings or {}).get("followed_sellers", [])
        return {
            "user": public_user(user), "orders": rows[:5],
            "activeOrders": sum(o.get("fulfillment") not in {"delivered", "cancelled"} for o in rows),
            "wishlist": wishlist, "addresses": [a.data for a in addresses],
            "reviews": reviews, "follows": followed,
            "stats": {"orderCount": len(rows), "spent": spent,
                      "averageOrder": round(spent / len(settled), 2) if settled else 0,
                      "wishlistCount": len(wishlist), "addressCount": len(addresses),
                      "reviewCount": len(reviews), "since": iso(user.created_at)},
        }


@app.get("/account/orders")
def account_orders(status: Optional[str] = None, session: Optional[str] = Header(None, alias="X-Ferix-Session")):
    with SessionLocal() as db:
        user = require_user(db, session)
        everything = [o.data for o in db.scalars(select(Order).where(Order.user_id == user.id).order_by(Order.placed_at.desc())).all()
                      if str((o.data or {}).get("channel") or "").lower() == "marketplace"]
        rows = everything
        if status and status != "all":
            rows = [o for o in everything if o.get("fulfillment") == status]
        return {"orders": rows, "counts": {
            "all": len(everything),
            "processing": sum(o.get("fulfillment") == "processing" for o in everything),
            "shipped": sum(o.get("fulfillment") == "shipped" for o in everything),
            "delivered": sum(o.get("fulfillment") == "delivered" for o in everything)}}


@app.get("/account/orders/detail")
def order_detail(orderId: str, session: Optional[str] = Header(None, alias="X-Ferix-Session")):
    with SessionLocal() as db:
        user = require_user(db, session)
        row = next((o for o in db.scalars(select(Order).where(Order.user_id == user.id)).all()
                    if str((o.data or {}).get("channel") or "").lower() == "marketplace"
                    and (o.id == orderId or (o.data or {}).get("number") == orderId)), None)
        if not row:
            raise HTTPException(404, "We could not find that order")
        order = row.data or {}
        by_id = {p["id"]: p for p in product_rows(db)}
        seen: list[str] = []
        for item in order.get("items", []):
            found = by_id.get(item.get("productId"))
            if found and found.get("merchantId") and found["merchantId"] not in seen:
                seen.append(found["merchantId"])
        merchants = [store_card(db, m) for m in (find_merchant(db, mid) for mid in seen) if m]
        return {"order": order, "merchants": merchants}


@app.post("/account/orders/reorder")
def reorder(p: ReorderIn, session: Optional[str] = Header(None, alias="X-Ferix-Session")):
    with SessionLocal() as db:
        user = require_user(db, session)
        row = db.get(Order, p.orderId)
        order_data = row.data or {} if row else {}
        if (not row or row.user_id != user.id
                or str(order_data.get("channel") or "").lower() != "marketplace"
                or str(order_data.get("payment") or "").lower() not in {"paid", "captured", "succeeded", "settled"}
                or order_data.get("fulfillment") == "cancelled"):
            raise HTTPException(404, "We could not find that order")
        cart = cart_for(db, user.id, None)
        added = 0
        for item in (row.data or {}).get("items", []):
            raw = next((x for x in cart.lines if x["productId"] == item["productId"] and x.get("variant") == item.get("variant")), None)
            if raw:
                raw["qty"] = min(99, raw["qty"] + item["qty"])
            else:
                cart.lines = (cart.lines or []) + [{"productId": item["productId"], "variant": item.get("variant"), "qty": item["qty"]}]
            added += 1
        db.commit()
        return {"added": added, "cart": cart_payload(db, cart)}


@app.get("/account/addresses")
def addresses(session: Optional[str] = Header(None, alias="X-Ferix-Session")):
    with SessionLocal() as db:
        user = require_user(db, session)
        return {"addresses": [a.data for a in db.scalars(select(Address).where(Address.user_id == user.id)).all()]}


@app.post("/account/addresses")
def add_address(p: AddressIn, session: Optional[str] = Header(None, alias="X-Ferix-Session")):
    with SessionLocal() as db:
        user = require_user(db, session)
        data = p.model_dump()
        address_id = data.pop("id", None) or "addr_" + uuid.uuid4().hex[:10]
        data["id"] = address_id
        db.add(Address(id=address_id, user_id=user.id, data=data))
        db.commit()
        return {"addresses": [a.data for a in db.scalars(select(Address).where(Address.user_id == user.id)).all()], "address": data}


@app.patch("/account/addresses")
def update_address(p: AddressPatchIn, session: Optional[str] = Header(None, alias="X-Ferix-Session")):
    with SessionLocal() as db:
        user = require_user(db, session)
        row = db.get(Address, p.id)
        if not row or row.user_id != user.id:
            raise HTTPException(404, "That address is not on your account")
        row.data = {**row.data, **p.model_dump(exclude_none=True)}
        db.commit()
        return {"addresses": [a.data for a in db.scalars(select(Address).where(Address.user_id == user.id)).all()], "address": row.data}


@app.delete("/account/addresses")
def delete_address(p: IdIn, session: Optional[str] = Header(None, alias="X-Ferix-Session")):
    with SessionLocal() as db:
        user = require_user(db, session)
        row = db.get(Address, p.id)
        if row and row.user_id == user.id:
            db.delete(row)
            db.commit()
        return {"addresses": [a.data for a in db.scalars(select(Address).where(Address.user_id == user.id)).all()]}


@app.patch("/account/settings")
def settings(p: SettingsIn, session: Optional[str] = Header(None, alias="X-Ferix-Session")):
    with SessionLocal() as db:
        user = require_user(db, session)
        data = p.model_dump(exclude_none=True)
        user.settings = {**(user.settings or {}), **{k: v for k, v in data.items() if k not in {"name", "phone"}}}
        user.name = data.get("name", user.name)
        user.phone = data.get("phone", user.phone)
        db.commit()
        return {"user": public_user(user), "settings": user.settings}


@app.get("/account/settings")
def get_settings(session: Optional[str] = Header(None, alias="X-Ferix-Session")):
    with SessionLocal() as db:
        user = require_user(db, session)
        return {"user": public_user(user), "settings": user.settings}


@app.get("/account/wishlist")
def wishlist(session: Optional[str] = Header(None, alias="X-Ferix-Session")):
    with SessionLocal() as db:
        user = require_user(db, session)
        wish = db.scalar(select(Wishlist).where(Wishlist.user_id == user.id))
        ids = wish.product_ids if wish else []
        return {"wishlist": [p for p in product_rows(db) if p["id"] in ids and marketplace_product_available(db, p)]}


@app.post("/account/wishlist/toggle")
def toggle_wishlist(p: ProductIn, session: Optional[str] = Header(None, alias="X-Ferix-Session")):
    with SessionLocal() as db:
        user = require_user(db, session)
        product = find_product(db, p.productId)
        if not product or not marketplace_product_available(db, product):
            raise HTTPException(404, "That product is not available")
        wish = db.scalar(select(Wishlist).where(Wishlist.user_id == user.id))
        if not wish:
            wish = Wishlist(id="wish_" + uuid.uuid4().hex[:10], user_id=user.id, product_ids=[])
            db.add(wish)
        ids = list(wish.product_ids or [])
        saved = p.productId not in ids
        ids.append(p.productId) if saved else ids.remove(p.productId)
        wish.product_ids = ids
        db.commit()
        return {"saved": saved, "wishlist": [x for x in product_rows(db) if x["id"] in ids and marketplace_product_available(db, x)]}


@app.get("/account/reviews")
def reviews(session: Optional[str] = Header(None, alias="X-Ferix-Session")):
    with SessionLocal() as db:
        user = require_user(db, session)
        return {"reviews": user_reviews(db, user.id)}


@app.post("/account/reviews")
def add_review(p: ReviewIn, session: Optional[str] = Header(None, alias="X-Ferix-Session")):
    with SessionLocal() as db:
        user = require_user(db, session)

        # A review is only for a shopper who has received the product. The
        # verified flag used to be hardcoded True here, so every review - from
        # anyone, about anything - was stamped as verified and carried no
        # purchase behind it.
        received = False
        for past in db.scalars(select(Order).where(Order.user_id == user.id)).all():
            order = past.data or {}
            if str(order.get("fulfillment") or "").lower() != "delivered":
                continue
            for item in order.get("items") or []:
                line = item or {}
                if p.productId in (line.get("productId"), line.get("product_id"), line.get("id")):
                    received = True
                    break
            if received:
                break
        if not received:
            raise HTTPException(403, "You can review this once your order has been delivered")
        data = {**p.model_dump(), "id": "rev_" + uuid.uuid4().hex[:10], "date": iso(now()), "verified": True, "helpful": 0}
        db.add(Review(id=data["id"], user_id=user.id, product_id=p.productId, data=data))
        db.commit()
        return {"reviews": user_reviews(db, user.id)}


@app.patch("/account/reviews")
def update_review(p: ReviewPatchIn, session: Optional[str] = Header(None, alias="X-Ferix-Session")):
    with SessionLocal() as db:
        user = require_user(db, session)
        row = db.get(Review, p.id)
        if not row or row.user_id != user.id:
            raise HTTPException(404, "That review is not on your account")
        row.data = {**row.data, **p.model_dump(exclude_none=True), "date": iso(now())}
        db.commit()
        return {"reviews": user_reviews(db, user.id)}


@app.delete("/account/reviews")
def delete_review(p: IdIn, session: Optional[str] = Header(None, alias="X-Ferix-Session")):
    with SessionLocal() as db:
        user = require_user(db, session)
        row = db.get(Review, p.id)
        if row and row.user_id == user.id:
            db.delete(row)
            db.commit()
        return {"reviews": user_reviews(db, user.id)}


# ── Checkout ───────────────────────────────────────────────────────────────

SHIPPING_OPTIONS = [
    {"id": "standard", "label": "Standard delivery", "eta": "2-5 working days", "price": 6.5},
    {"id": "express", "label": "Express delivery", "eta": "1-2 working days", "price": 14.0},
]


@app.get("/shipping/options")
def shipping():
    return {
        "options": SHIPPING_OPTIONS,
        "paymentMethods": [
            {"id": "card", "label": "Card", "detail": "Secure card payment"},
            {"id": "transfer", "label": "Bank transfer", "detail": "Confirmed before dispatch"},
        ],
        "freeShippingOver": FREE_SHIPPING_OVER, "taxRate": TAX_RATE,
    }


@app.post("/checkout/quote")
def quote(p: CheckoutIn, session: Optional[str] = Header(None, alias="X-Ferix-Session"),
          x_cart: Optional[str] = Header(None, alias="X-Ferix-Cart")):
    with SessionLocal() as db:
        # A guest may see their totals before committing to buy, and without an account
        # the email is what the total belongs to.
        if session:
            user = require_user(db, session)
        elif p.email and "@" in p.email:
            user = guest_shopper(db, p.email)
        else:
            raise HTTPException(401, "Sign in, or leave an email address to see your total.")
        cart = cart_for(db, user.id, x_cart)
        if cart and any(
            not (candidate := find_product(db, line["productId"])) or not marketplace_product_available(db, candidate)
            for line in cart.lines or []
        ):
            raise HTTPException(409, "A product in your cart is no longer available. Remove it before checkout.")
        payload = cart_payload(db, cart)
        option = next((o for o in SHIPPING_OPTIONS if o["id"] == p.shippingMethod), SHIPPING_OPTIONS[0])
        cost = 0.0 if payload["subtotal"] >= FREE_SHIPPING_OVER else option["price"]
        payload["shipping"] = cost
        payload["total"] = round(payload["subtotal"] + cost + payload["tax"], 2)
        return {
            "cart": payload, "groups": payload["merchants"], "address": None,
            "shippingOption": option,
            "totals": {"subtotal": payload["subtotal"], "shipping": cost, "tax": payload["tax"],
                       "total": payload["total"], "commission": 0, "itemCount": payload["count"]},
            "freeShippingOver": FREE_SHIPPING_OVER,
        }


@app.post("/checkout/place")
def place(p: CheckoutIn, session: Optional[str] = Header(None, alias="X-Ferix-Session"),
          x_cart: Optional[str] = Header(None, alias="X-Ferix-Cart")):
    with SessionLocal() as db:
        # Signing in is one way to check out; giving an email so the order can be confirmed
        # is the other. Without either there is nobody to place the order for.
        if session:
            user = require_user(db, session)
        elif p.email and "@" in p.email:
            user = guest_shopper(db, p.email)
        else:
            raise HTTPException(401, "Sign in, or leave an email address so your order can be confirmed.")
        cart = cart_for(db, user.id, x_cart)
        if cart and any(
            not (candidate := find_product(db, line["productId"])) or not marketplace_product_available(db, candidate)
            for line in cart.lines or []
        ):
            raise HTTPException(409, "A product in your cart is no longer available. Remove it before checkout.")
        payload = cart_payload(db, cart)
        if not payload["lines"]:
            raise HTTPException(409, "Your cart is empty")
        # No payment-provider integration exists yet. Do not create an order,
        # claim a payment, or decrement inventory for an uncollected payment.
        raise HTTPException(503, "Checkout is not available yet because secure payment processing is not configured.")


def guest_shopper(db: Session, email: str) -> User:
    """The account behind a guest checkout.

    A guest's order has to belong to somebody - the order table has no room for an
    anonymous one - so an order placed without signing in gets a shopper record for the
    email that was typed. It carries an unguessable password hash, so nobody can sign in
    as them through this route. If they register with the same address later, the orders
    they placed as a guest are already theirs.
    """
    normalised = email.strip().lower()
    existing = db.scalar(select(User).where(User.email == normalised))
    if existing:
        return existing
    user = User(
        id="usr_" + uuid.uuid4().hex[:10],
        name=(normalised.split("@")[0] or "Guest")[:60],
        email=normalised,
        password_hash=hash_password(secrets.token_urlsafe(32)),
        settings={"language": "English", "currency": "USD", "orderEmails": True, "guest": True},
    )
    db.add(user)
    db.flush()
    return user


# ── Mounted surfaces ───────────────────────────────────────────────────────

app.include_router(merchant_router.router)
app.include_router(admin_router.router)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=int(os.getenv("PORT", "8000")), reload=False)


@app.post("/auth/refresh")
def refresh_session(session: Optional[str] = Header(None, alias="X-Ferix-Session")):
    """Silently rotate a shopper's session.

    The new token INHERITS THE ORIGINAL EXPIRY, so refreshing while someone browses
    never extends how long a session lives - it only shrinks the window in which a
    stolen token is worth anything.
    """
    import secrets

    from core import aware

    with SessionLocal() as db:
        row = db.get(SessionToken, session) if session else None
        if not row:
            raise HTTPException(401, "That session has ended. Please sign in again.")

        if aware(row.expires_at) < now():
            db.delete(row)
            db.commit()
            raise HTTPException(401, "That session has ended. Please sign in again.")

        expires = row.expires_at
        user_id = row.user_id
        token = secrets.token_urlsafe(32)
        db.delete(row)
        db.add(SessionToken(token=token, user_id=user_id, expires_at=expires, last_seen_at=now()))
        db.commit()
        return {"token": token, "expiresAt": iso(expires)}


@app.get("/catalog/adverts")
def adverts(placement: Optional[str] = None):
    """Advertisements running right now, for the slots in a product list.

    Public on purpose: a shopper's page needs them and nothing here is private.
    An advert outside its dates simply does not come back, so a finished campaign
    disappears without anyone remembering to switch it off.
    """
    from core import rows_of

    with SessionLocal() as db:
        stamp = iso(now())
        running = []
        for row in rows_of(db, "advert"):
            if "active" in row and not row.get("active"):
                continue
            start = str(row.get("startsAt") or "")
            end = str(row.get("endsAt") or "")
            if (start and start > stamp) or (end and end < stamp):
                continue
            if placement and str(row.get("placement") or "") not in ("", placement, "both"):
                continue
            running.append(row)
        running.sort(key=lambda row: row.get("position", 0))
        return {"adverts": running, "count": len(running)}


@app.get("/catalog/page")
def catalogue_page(id: Optional[str] = None, type: Optional[str] = None):
    """A published storefront page, for the listing that renders it.

    The homepage already reads its own document. This is the same contract for
    every other page, so Explore can build itself from its sections instead of
    drawing its own layout and ignoring the CMS.
    """
    with SessionLocal() as db:
        document = db.get(ContentDocument, id) if id else None
        if document is None and type:
            document = db.scalar(select(ContentDocument).where(ContentDocument.document_type == type))
        if not document or document.status != "published":
            return {"page": None, "sections": []}
        sections = sorted((document.data or {}).get("sections") or [],
                          key=lambda section: section.get("position", 0))
        return {
            "page": {"id": document.id, "title": document.title, "documentType": document.document_type},
            "sections": sections,
        }

# ── Public Seller Profile & Follow System ──────────────────────────────────

@app.get("/sellers/{merchant_id}")
def public_seller_profile(merchant_id: str):
    """Public Seller Profile: ONLY approved products for that merchant."""
    with SessionLocal() as db:
        merchant = find_merchant(db, merchant_id)
        if not merchant or merchant.get("status", "active") != "active" or not merchant.get("marketplaceEnabled", True):
            raise HTTPException(404, "Seller not found")
        approved_products = [p for p in product_rows(db)
                             if is_seller_product(p, merchant["id"])
                             and marketplace_product_available(db, p)]
        return {
            "merchant": store_card(db, merchant),
            "products": public_products(db, decorate(db, approved_products)),
        }


# ── Public Catalog: strictly approved only ─────────────────────────────────

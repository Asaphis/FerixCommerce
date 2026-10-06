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
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select

from core import (
    Address, Cart, Catalog, ContentDocument, FlashSale, FlashSaleItem, FREE_SHIPPING_OVER,
    Order, Review, SESSION_DAYS, SessionLocal, SessionToken, TAX_RATE, User, Wishlist,
    cart_for as _cart_for, cart_payload, categories as category_rows,
    collections as collection_rows, decorate, find_merchant, find_product, get_user,
    hash_password, iso, line_key, merchants as merchant_rows, now, product_rows,
    public_user, put_row, require_user, sale_status, seed, store_card,
    verify_password, Base, engine, banners as banner_rows,
)

from routers import admin as admin_router
from routers import merchant as merchant_router

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
    addressId: str
    shippingMethod: str = "standard"
    paymentMethod: str = "card"
    note: Optional[str] = None
    cartId: Optional[str] = None


# ── App ────────────────────────────────────────────────────────────────────

app = FastAPI(title="Ferixas Commerce API", version="3.0.0")
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
    Base.metadata.create_all(engine)
    with SessionLocal() as db:
        seed(db)


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
            "storage": "cloudinary-configured" if os.getenv("CLOUDINARY_URL") else "pending-configuration",
            "mail": "resend-configured" if os.getenv("RESEND_API_KEY") else "pending-configuration",
            "payments": "configured" if os.getenv("PAYMENT_PROVIDER_KEY") else "pending-configuration",
        }


# ── Catalogue (shoppers) ───────────────────────────────────────────────────

@app.get("/catalog/categories")
def categories():
    with SessionLocal() as db:
        rows = product_rows(db)
        return {"categories": sorted(
            [{**c, "count": sum(p.get("category") == c.get("slug") for p in rows)}
             for c in category_rows(db) if c.get("visible", True)],
            key=lambda c: c.get("position", 0))}


@app.get("/catalog/products")
def products(search: Optional[str] = None, category: Optional[str] = None, collection: Optional[str] = None,
             store: Optional[str] = None, minPrice: Optional[float] = None, maxPrice: Optional[float] = None,
             rating: Optional[float] = None, inStock: Optional[bool] = None, onSale: Optional[bool] = None,
             sort: str = "relevance", page: int = 1, perPage: int = 24):
    with SessionLocal() as db:
        items = decorate(db, product_rows(db))
        q = (search or "").lower()
        if q:
            items = [p for p in items if q in json.dumps(p).lower()]
        if category:
            items = [p for p in items if p.get("category") == category]
        if collection:
            items = [p for p in items if collection in (p.get("collections") or [])]
        if store:
            items = [p for p in items if p.get("merchantSlug") == store or p.get("merchantId") == store]
        if minPrice is not None:
            items = [p for p in items if p["price"] >= minPrice]
        if maxPrice is not None:
            items = [p for p in items if p["price"] <= maxPrice]
        if rating is not None:
            items = [p for p in items if p["rating"] >= rating]
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
            items.sort(key=lambda p: -p.get("sold30d", 0))
        else:
            items.sort(key=lambda p: -(p.get("rating", 0) * 100 + p.get("sold30d", 0) / 10))
        total = len(items)
        per_page = max(1, min(60, perPage))
        start = (page - 1) * per_page
        return {
            "items": items[start:start + per_page], "total": total, "page": page,
            "perPage": per_page, "pages": max(1, (total + per_page - 1) // per_page),
            "facets": {
                "categories": sorted({p.get("category") for p in items if p.get("category")}),
                "stores": sorted({p.get("merchantName") for p in items if p.get("merchantName")}),
                "priceBuckets": [],
            },
        }


@app.get("/catalog/product")
def product(slug: str):
    with SessionLocal() as db:
        found = find_product(db, slug)
        if not found:
            raise HTTPException(404, "That product is not available")
        merchant = find_merchant(db, found["merchantId"])
        related = [p for p in product_rows(db)
                   if p["id"] != found["id"] and (p.get("merchantId") == found.get("merchantId") or p.get("category") == found.get("category"))][:8]
        reviews = db.scalars(select(Review).where(Review.product_id == found["id"])).all()
        return {
            "product": decorate(db, [found])[0],
            "merchant": store_card(db, merchant) if merchant else {},
            "reviews": [r.data for r in reviews],
            "related": decorate(db, related),
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
        items = product_rows(db)
        decorated = decorate(db, items)
        cats = category_rows(db)
        cols = collection_rows(db)
        ms = merchant_rows(db)

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
                             "products": [p for p in decorated if c["slug"] in (p.get("collections") or [])][:4]}
                            for c in cols if c.get("visible", True)],
            "featured": sorted(decorated, key=lambda p: -p.get("rating", 0))[:8],
            "trending": sorted(decorated, key=lambda p: -p.get("sold30d", 0))[:8],
            "newArrivals": sorted(decorated, key=lambda p: p.get("createdAt", ""), reverse=True)[:8],
            "under100": [p for p in decorated if p["price"] < 100][:8],
            "official": [p for p in decorated if p.get("merchantId") == "ferixas-official"][:4],
            "flashSale": ({"id": sale.id, "name": sale.name, "headline": sale.headline,
                           "endsAt": iso(sale.ends_at), "bannerUrl": sale.banner_url,
                           "products": flash_items[:8]} if sale else None),
            "stores": [store_card(db, m) for m in ms],
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
        items = decorate(db, product_rows(db))
        return {"collections": [{**c, "count": sum(c["slug"] in (p.get("collections") or []) for p in items),
                                 "products": [p for p in items if c["slug"] in (p.get("collections") or [])][:3]}
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
        rows = [store_card(db, m) for m in merchant_rows(db)]
        q = (search or "").lower()
        rows = [m for m in rows if not q or q in m["name"].lower() or q in (m.get("tagline") or "").lower()]
        if sort == "new":
            rows.sort(key=lambda m: m.get("since", ""), reverse=True)
        else:
            rows.sort(key=lambda m: -(m.get("rating", 0) * 100 + m.get("followers", 0) / 100))
        return {"stores": rows, "total": len(rows)}


@app.get("/catalog/store")
def store(slug: str):
    with SessionLocal() as db:
        merchant = find_merchant(db, slug)
        if not merchant:
            raise HTTPException(404, "No store at that address")
        owned = decorate(db, [p for p in product_rows(db) if p.get("merchantId") == merchant["id"]])
        doc = db.get(ContentDocument, f"doc_store_{merchant['id']}")
        return {
            "store": store_card(db, merchant), "about": merchant.get("about", ""),
            "responseRate": merchant.get("responseRate", 0),
            "fulfilmentRate": merchant.get("fulfilmentRate", 0),
            "products": owned,
            "categories": sorted({p.get("category") for p in owned if p.get("category")}),
            "content": (doc.data if doc and doc.status == "published" else None),
            "stats": {"products": len(owned), "rating": merchant.get("rating", 0),
                      "reviewCount": merchant.get("reviewCount", 0), "followers": merchant.get("followers", 0)},
        }


@app.get("/search")
def search(q: str = ""):
    with SessionLocal() as db:
        needle = q.lower()
        items = decorate(db, [p for p in product_rows(db) if needle in json.dumps(p).lower()])
        found_stores = [store_card(db, m) for m in merchant_rows(db) if needle in m["name"].lower()]
        return {"query": q, "products": items[:24], "stores": found_stores,
                "categories": [c for c in category_rows(db) if needle in c.get("name", "").lower()],
                "suggestions": []}


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
        if not product:
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

@app.get("/account")
def account(session: Optional[str] = Header(None, alias="X-Ferix-Session")):
    with SessionLocal() as db:
        user = require_user(db, session)
        wish = db.scalar(select(Wishlist).where(Wishlist.user_id == user.id))
        addresses = db.scalars(select(Address).where(Address.user_id == user.id)).all()
        orders = db.scalars(select(Order).where(Order.user_id == user.id).order_by(Order.placed_at.desc())).all()
        by_id = {p["id"]: p for p in product_rows(db)}
        wishlist = [by_id[x] for x in (wish.product_ids if wish else []) if x in by_id]
        rows = [o.data for o in orders]
        spent = round(sum(o.get("total", 0) for o in rows), 2)
        return {
            "user": public_user(user), "orders": rows[:5],
            "activeOrders": sum(o.get("fulfillment") not in {"delivered", "cancelled"} for o in rows),
            "wishlist": wishlist, "addresses": [a.data for a in addresses], "reviews": [], "follows": [],
            "stats": {"orderCount": len(rows), "spent": spent,
                      "averageOrder": round(spent / len(rows), 2) if rows else 0,
                      "wishlistCount": len(wishlist), "addressCount": len(addresses),
                      "reviewCount": 0, "since": iso(user.created_at)},
        }


@app.get("/account/orders")
def account_orders(session: Optional[str] = Header(None, alias="X-Ferix-Session")):
    with SessionLocal() as db:
        user = require_user(db, session)
        rows = [o.data for o in db.scalars(select(Order).where(Order.user_id == user.id).order_by(Order.placed_at.desc())).all()]
        return {"orders": rows, "counts": {
            "all": len(rows),
            "processing": sum(o.get("fulfillment") == "processing" for o in rows),
            "shipped": sum(o.get("fulfillment") == "shipped" for o in rows),
            "delivered": sum(o.get("fulfillment") == "delivered" for o in rows)}}


@app.get("/account/orders/detail")
def order_detail(orderId: str, session: Optional[str] = Header(None, alias="X-Ferix-Session")):
    with SessionLocal() as db:
        user = require_user(db, session)
        row = next((o for o in db.scalars(select(Order).where(Order.user_id == user.id)).all()
                    if o.id == orderId or (o.data or {}).get("number") == orderId), None)
        if not row:
            raise HTTPException(404, "We could not find that order")
        return {"order": row.data, "merchants": []}


@app.post("/account/orders/reorder")
def reorder(p: ReorderIn, session: Optional[str] = Header(None, alias="X-Ferix-Session")):
    with SessionLocal() as db:
        user = require_user(db, session)
        row = db.get(Order, p.orderId)
        if not row or row.user_id != user.id:
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
        return {"wishlist": [p for p in product_rows(db) if p["id"] in ids]}


@app.post("/account/wishlist/toggle")
def toggle_wishlist(p: ProductIn, session: Optional[str] = Header(None, alias="X-Ferix-Session")):
    with SessionLocal() as db:
        user = require_user(db, session)
        wish = db.scalar(select(Wishlist).where(Wishlist.user_id == user.id))
        if not wish:
            wish = Wishlist(id="wish_" + uuid.uuid4().hex[:10], user_id=user.id, product_ids=[])
            db.add(wish)
        ids = list(wish.product_ids or [])
        saved = p.productId not in ids
        ids.append(p.productId) if saved else ids.remove(p.productId)
        wish.product_ids = ids
        db.commit()
        return {"saved": saved, "wishlist": [x for x in product_rows(db) if x["id"] in ids]}


@app.get("/account/reviews")
def reviews(session: Optional[str] = Header(None, alias="X-Ferix-Session")):
    with SessionLocal() as db:
        user = require_user(db, session)
        return {"reviews": [r.data for r in db.scalars(select(Review).where(Review.user_id == user.id)).all()]}


@app.post("/account/reviews")
def add_review(p: ReviewIn, session: Optional[str] = Header(None, alias="X-Ferix-Session")):
    with SessionLocal() as db:
        user = require_user(db, session)
        data = {**p.model_dump(), "id": "rev_" + uuid.uuid4().hex[:10], "date": iso(now()), "verified": True, "helpful": 0}
        db.add(Review(id=data["id"], user_id=user.id, product_id=p.productId, data=data))
        db.commit()
        return {"reviews": [r.data for r in db.scalars(select(Review).where(Review.user_id == user.id)).all()]}


@app.patch("/account/reviews")
def update_review(p: ReviewPatchIn, session: Optional[str] = Header(None, alias="X-Ferix-Session")):
    with SessionLocal() as db:
        user = require_user(db, session)
        row = db.get(Review, p.id)
        if not row or row.user_id != user.id:
            raise HTTPException(404, "That review is not on your account")
        row.data = {**row.data, **p.model_dump(exclude_none=True), "date": iso(now())}
        db.commit()
        return {"reviews": [r.data for r in db.scalars(select(Review).where(Review.user_id == user.id)).all()]}


@app.delete("/account/reviews")
def delete_review(p: IdIn, session: Optional[str] = Header(None, alias="X-Ferix-Session")):
    with SessionLocal() as db:
        user = require_user(db, session)
        row = db.get(Review, p.id)
        if row and row.user_id == user.id:
            db.delete(row)
            db.commit()
        return {"reviews": [r.data for r in db.scalars(select(Review).where(Review.user_id == user.id)).all()]}


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
def quote(p: CheckoutIn, session: Optional[str] = Header(None, alias="X-Ferix-Session")):
    with SessionLocal() as db:
        user = require_user(db, session)
        cart = cart_for(db, user.id, None)
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
def place(p: CheckoutIn, session: Optional[str] = Header(None, alias="X-Ferix-Session")):
    with SessionLocal() as db:
        user = require_user(db, session)
        cart = cart_for(db, user.id, None)
        payload = cart_payload(db, cart)
        if not payload["lines"]:
            raise HTTPException(409, "Your cart is empty")

        address = db.get(Address, p.addressId)
        option = next((o for o in SHIPPING_OPTIONS if o["id"] == p.shippingMethod), SHIPPING_OPTIONS[0])
        cost = 0.0 if payload["subtotal"] >= FREE_SHIPPING_OVER else option["price"]
        placed = iso(now())
        order = {
            "id": "ord_" + uuid.uuid4().hex[:10],
            "number": "FX-" + str(4800 + len(db.scalars(select(Order)).all())),
            "placedAt": placed, "channel": "marketplace",
            "items": [{"productId": line["productId"], "title": line["product"]["title"],
                       "variant": line.get("variant"), "qty": line["qty"], "price": line["unitPrice"],
                       "merchantId": line["product"]["merchantId"],
                       "merchantName": line["product"]["merchantName"]} for line in payload["lines"]],
            "subtotal": payload["subtotal"], "shipping": cost, "tax": payload["tax"],
            "total": round(payload["subtotal"] + cost + payload["tax"], 2),
            "payment": "paid", "fulfillment": "processing", "carrier": None, "tracking": None,
            "address": (address.data if address else None),
            "note": p.note, "shippingMethod": p.shippingMethod, "paymentMethod": p.paymentMethod,
            "timeline": [{"label": "Order placed", "at": placed}],
        }
        db.add(Order(id=order["id"], user_id=user.id, data=order))

        # A marketplace sale reduces the same stock the seller's storefront shows.
        for line in payload["lines"]:
            product = find_product(db, line["productId"])
            if product:
                updated = dict(product)
                updated["stock"] = max(0, updated.get("stock", 0) - line["qty"])
                updated["sold30d"] = updated.get("sold30d", 0) + line["qty"]
                put_row(db, "product", product["slug"], updated)

        cart.lines = []
        db.commit()
        return {"order": order}


# ── Mounted surfaces ───────────────────────────────────────────────────────

app.include_router(merchant_router.router)
app.include_router(admin_router.router)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=int(os.getenv("PORT", "8000")), reload=False)

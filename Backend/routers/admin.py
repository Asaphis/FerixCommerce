"""Platform console API: /admin/*

Matches WebPhase/admin/lib/api.ts, and adds the operating surface the console
needs next: catalogue, CMS, media, promotions, payments, payouts, roles, audit.
"""
from __future__ import annotations

from datetime import timedelta
from typing import Optional

from fastapi import APIRouter, Body, Header, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select

from core import (
    AuditLog, ContentDocument, ContentVersion, FlashSale, FlashSaleItem, LedgerEntry,
    MediaAsset, Order, Payout, ROLE_PERMISSIONS, SessionLocal, StaffSession, StaffUser, User,
    audit, collections as all_collections, categories as all_categories, find_merchant,
    find_product, iso, issue_staff_session, media_json, merchants as all_merchants,
    new_id, now, permissions_for, placeholder, products as all_products, put_row, drop_row,
    require_permission, require_staff, rows_of, verify_password,
)

router = APIRouter(prefix="/admin", tags=["admin"])

DEFAULT_SETTINGS = {
    "platformName": "Ferixas",
    "supportEmail": "help@ferixas.com",
    "defaultCommissionPct": 10.0,
    "currency": "USD",
    "marketplaceEnabled": True,
    "newMerchantsNeedReview": True,
    "payoutCadence": "Monthly",
    "taxRatePct": 7.5,
    "freeShippingOver": 120.0,
}


# ── Payloads ───────────────────────────────────────────────────────────────

class LoginIn(BaseModel):
    email: str
    password: str


class MerchantPatch(BaseModel):
    id: str
    status: Optional[str] = None
    plan: Optional[str] = None
    commissionPct: Optional[float] = None
    marketplaceEnabled: Optional[bool] = None
    name: Optional[str] = None
    tagline: Optional[str] = None
    location: Optional[str] = None
    about: Optional[str] = None


class SettingsPatch(BaseModel):
    platformName: Optional[str] = None
    supportEmail: Optional[str] = None
    defaultCommissionPct: Optional[float] = None
    currency: Optional[str] = None
    marketplaceEnabled: Optional[bool] = None
    newMerchantsNeedReview: Optional[bool] = None
    payoutCadence: Optional[str] = None
    taxRatePct: Optional[float] = None
    freeShippingOver: Optional[float] = None


class ProductPatch(BaseModel):
    id: Optional[str] = None
    slug: Optional[str] = None
    title: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    compareAt: Optional[float] = None
    stock: Optional[int] = None
    status: Optional[str] = None
    featured: Optional[bool] = None
    store: Optional[bool] = None
    marketplace: Optional[bool] = None
    images: Optional[list[str]] = None
    collections: Optional[list[str]] = None
    tags: Optional[list[str]] = None


class CategoryIn(BaseModel):
    slug: Optional[str] = None
    name: Optional[str] = None
    blurb: Optional[str] = None
    glyph: Optional[str] = None
    image: Optional[str] = None
    showInNav: Optional[bool] = None
    showAsTile: Optional[bool] = None
    showAsText: Optional[bool] = None
    visible: Optional[bool] = None
    position: Optional[int] = None


class CollectionIn(BaseModel):
    slug: Optional[str] = None
    name: Optional[str] = None
    blurb: Optional[str] = None
    image: Optional[str] = None
    visible: Optional[bool] = None
    position: Optional[int] = None


class BannerIn(BaseModel):
    id: Optional[str] = None
    kind: Optional[str] = None
    eyebrow: Optional[str] = None
    headline: Optional[str] = None
    body: Optional[str] = None
    ctaLabel: Optional[str] = None
    ctaHref: Optional[str] = None
    secondaryLabel: Optional[str] = None
    secondaryHref: Optional[str] = None
    mediaUrl: Optional[str] = None
    image: Optional[str] = None
    videoUrl: Optional[str] = None
    accent: Optional[str] = None
    audience: Optional[str] = None
    active: Optional[bool] = None
    order: Optional[int] = None


class MediaIn(BaseModel):
    url: str
    kind: str = "image"
    alt: str = ""
    folder: str = "platform"
    publicId: str = ""
    width: int = 0
    height: int = 0


class DocumentIn(BaseModel):
    id: str
    title: Optional[str] = None
    status: Optional[str] = None
    data: Optional[dict] = None
    note: Optional[str] = None


class PromotionIn(BaseModel):
    id: Optional[str] = None
    name: Optional[str] = None
    headline: Optional[str] = None
    bannerUrl: Optional[str] = None
    startsAt: Optional[str] = None
    endsAt: Optional[str] = None
    status: Optional[str] = None
    items: Optional[list[dict]] = None


class StaffIn(BaseModel):
    id: Optional[str] = None
    name: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None
    subjectType: Optional[str] = "admin"
    subjectId: Optional[str] = "platform"
    permissions: Optional[list[str]] = None
    password: Optional[str] = None


class PayoutPatch(BaseModel):
    id: str
    status: Optional[str] = None


# ── Helpers ────────────────────────────────────────────────────────────────

def _settings(db) -> dict:
    rows = rows_of(db, "setting")
    stored = rows[0] if rows else {}
    return {**DEFAULT_SETTINGS, **stored}


def _save_settings(db, data: dict) -> dict:
    put_row(db, "setting", "platform", data)
    return data


def _date(value) -> str:
    return str(value)[:10]


def _days_between(a: str) -> int:
    from datetime import date
    try:
        return (now().date() - date.fromisoformat(_date(a))).days
    except Exception:
        return 999


def _order_row(db, row: Order) -> dict:
    data = dict(row.data or {})
    user = db.get(User, row.user_id)
    merchant = find_merchant(db, (data.get("items") or [{}])[0].get("merchantId", "")) or {}
    return {
        "id": data.get("id", row.id), "number": data.get("number", row.id),
        "placedAt": data.get("placedAt", iso(row.placed_at)),
        "channel": data.get("channel", "marketplace"),
        "customer": {
            "id": row.user_id, "name": (user.name if user else "Guest"),
            "email": (user.email if user else ""), "phone": (user.phone if user else ""),
            "location": (data.get("address") or {}).get("country", "—"),
        },
        "items": data.get("items", []),
        "subtotal": data.get("subtotal", 0), "shipping": data.get("shipping", 0),
        "tax": data.get("tax", 0), "total": data.get("total", 0),
        "commission": round(sum(i.get("price", 0) * i.get("qty", 0) for i in data.get("items", [])) * merchant.get("commissionPct", 10) / 100, 2),
        "payment": data.get("payment", "paid"),
        "fulfillment": data.get("fulfillment", "processing"),
        "carrier": data.get("carrier"), "tracking": data.get("tracking"),
        "merchantId": merchant.get("id", ""), "merchantName": merchant.get("name", "Ferixas"),
        "merchantSlug": merchant.get("slug", ""),
    }


def _merchant_row(db, merchant: dict) -> dict:
    owned = [p for p in all_products(db) if p.get("merchantId") == merchant["id"]]
    orders = [_order_row(db, r) for r in db.scalars(select(Order)).all() if any(i.get("merchantId") == merchant["id"] for i in (r.data or {}).get("items", []))]
    gmv = round(sum(o["total"] for o in orders), 2)
    commission = round(sum(o["commission"] for o in orders), 2)
    return {
        "id": merchant["id"], "slug": merchant["slug"], "name": merchant["name"],
        "tagline": merchant.get("tagline", ""), "location": merchant.get("location", ""),
        "rating": merchant.get("rating", 0), "reviewCount": merchant.get("reviewCount", 0),
        "followers": merchant.get("followers", 0), "verified": merchant.get("verified", False),
        "brand": merchant.get("brand", {}), "domain": merchant.get("domain", ""),
        "customDomain": merchant.get("customDomain"), "plan": merchant.get("plan", "Starter"),
        "since": merchant.get("since", ""), "status": merchant.get("status", "active"),
        "commissionPct": merchant.get("commissionPct", 10),
        "productCount": len(owned),
        "marketplaceListings": sum((p.get("channels") or {}).get("marketplace") for p in owned),
        "gmv": gmv, "commission": commission, "orders": len(orders),
        "template": (merchant.get("brand") or {}).get("template"),
    }


def _user_row(db, user: User) -> dict:
    orders = [_order_row(db, r) for r in db.scalars(select(Order).where(Order.user_id == user.id)).all()]
    spent = round(sum(o["total"] for o in orders), 2)
    last = max((o["placedAt"] for o in orders), default=None)
    return {
        "id": user.id, "name": user.name, "email": user.email, "phone": user.phone,
        "initials": "".join(p[0].upper() for p in user.name.split()[:2]) or "F",
        "createdAt": iso(user.created_at),
        "location": (user.settings or {}).get("location", "—"),
        "orders": len(orders), "spent": spent,
        "averageOrder": round(spent / len(orders), 2) if orders else 0.0,
        "addresses": 0, "reviews": 0, "saved": 0,
        "segment": "vip" if spent > 600 else ("returning" if len(orders) > 1 else "new"),
        "lastOrderAt": last,
    }


def _sale_json(db, sale: FlashSale) -> dict:
    items = db.scalars(select(FlashSaleItem).where(FlashSaleItem.sale_id == sale.id)).all()
    return {
        "id": sale.id, "name": sale.name, "headline": sale.headline,
        "bannerUrl": sale.banner_url, "startsAt": iso(sale.starts_at), "endsAt": iso(sale.ends_at),
        "status": sale.status, "ownerType": sale.owner_type, "ownerId": sale.owner_id,
        "items": [{"id": i.id, "productId": i.product_id, "merchantId": i.merchant_id,
                   "salePrice": i.sale_price, "quantityLimit": i.quantity_limit,
                   "soldQuantity": i.sold_quantity,
                   "title": (find_product(db, i.product_id) or {}).get("title", i.product_id)} for i in items],
    }


# ── Session ────────────────────────────────────────────────────────────────

@router.post("/login")
def login(payload: LoginIn):
    with SessionLocal() as db:
        email = payload.email.strip().lower()
        staff = db.scalar(select(StaffUser).where(StaffUser.email == email, StaffUser.subject_type == "admin"))
        if not staff or not verify_password(payload.password, staff.password_hash):
            raise HTTPException(401, "Those credentials do not match an operator account")
        token = issue_staff_session(db, staff)
        audit(db, "admin", staff.email, "session.login", "platform", staff.role)
        db.commit()
        return {"token": token, "admin": {"email": staff.email, "platformName": _settings(db)["platformName"], "role": staff.role, "permissions": staff.permissions}}


@router.post("/logout")
def logout(session: Optional[str] = Body(None), x_session: Optional[str] = Header(None, alias="X-Ferix-Session")):
    token = session or x_session
    if token:
        with SessionLocal() as db:
            row = db.get(StaffSession, token)
            if row:
                db.delete(row)
                db.commit()
    return {"ok": True}


@router.get("/me")
def me(session: Optional[str] = Header(None, alias="X-Ferix-Session")):
    with SessionLocal() as db:
        staff = require_staff(db, session, "admin")
        return {"admin": {"email": staff.email, "platformName": _settings(db)["platformName"], "role": staff.role, "permissions": staff.permissions}}


# ── Overview ───────────────────────────────────────────────────────────────

@router.get("/overview")
def overview(session: Optional[str] = Header(None, alias="X-Ferix-Session")):
    with SessionLocal() as db:
        require_staff(db, session, "admin")
        merchants = [_merchant_row(db, m) for m in all_merchants(db)]
        orders = [_order_row(db, r) for r in db.scalars(select(Order).order_by(Order.placed_at.desc())).all()]
        users = db.scalars(select(User)).all()
        products = all_products(db)

        gmv = round(sum(o["total"] for o in orders), 2)
        commission = round(sum(o["commission"] for o in orders), 2)
        statuses: dict[str, int] = {}
        for order in orders:
            statuses[order["fulfillment"]] = statuses.get(order["fulfillment"], 0) + 1

        def window(days: int) -> dict:
            rows = [o for o in orders if _days_between(o["placedAt"]) < days]
            return {"gmv": round(sum(o["total"] for o in rows), 2),
                    "commission": round(sum(o["commission"] for o in rows), 2), "orders": len(rows)}

        return {
            "settings": _settings(db),
            "totals": {
                "gmv": gmv, "commission": commission, "merchantNet": round(gmv - commission, 2),
                "orders": len(orders),
                "averageOrder": round(gmv / len(orders), 2) if orders else 0.0,
                "deliveredRate": round((statuses.get("delivered", 0) / len(orders) * 100) if orders else 0, 1),
                "merchants": len(merchants),
                "activeMerchants": sum(m["status"] == "active" for m in merchants),
                "reviewMerchants": sum(m["status"] == "review" for m in merchants),
                "suspendedMerchants": sum(m["status"] == "suspended" for m in merchants),
                "products": len(products),
                "marketplaceListings": sum((p.get("channels") or {}).get("marketplace") for p in products),
                "soldUnits": sum(p.get("sold30d", 0) for p in products),
            },
            "windows": {"today": window(1), "week": window(7), "month": window(30)},
            "channels": {
                "store": round(sum(o["total"] for o in orders if o["channel"] == "store"), 2),
                "marketplace": round(sum(o["total"] for o in orders if o["channel"] == "marketplace"), 2),
            },
            "statuses": statuses,
            "topMerchants": sorted(
                [{"id": m["id"], "name": m["name"], "slug": m["slug"], "gmv": m["gmv"], "orders": m["orders"]} for m in merchants],
                key=lambda m: -m["gmv"])[:6],
            "needsAttention": [m for m in merchants if m["status"] != "active"][:6],
            "recentOrders": orders[:8],
            "registeredUsers": len(users),
        }


# ── Merchants ──────────────────────────────────────────────────────────────

@router.get("/merchants")
def merchants(session: Optional[str] = Header(None, alias="X-Ferix-Session"),
              search: Optional[str] = None, status: Optional[str] = None, plan: Optional[str] = None):
    with SessionLocal() as db:
        require_staff(db, session, "admin")
        rows = [_merchant_row(db, m) for m in all_merchants(db)]
        counts: dict[str, int] = {"all": len(rows)}
        for row in rows:
            counts[row["status"]] = counts.get(row["status"], 0) + 1
        filtered = rows
        if search:
            q = search.lower()
            filtered = [m for m in filtered if q in m["name"].lower() or q in m["location"].lower()]
        if status and status != "all":
            filtered = [m for m in filtered if m["status"] == status]
        if plan and plan != "all":
            filtered = [m for m in filtered if m["plan"] == plan]
        return {"merchants": filtered, "total": len(filtered), "counts": counts,
                "plans": sorted({m["plan"] for m in rows})}


@router.get("/merchant")
def merchant(session: Optional[str] = Header(None, alias="X-Ferix-Session"), id: str = Query(...)):
    with SessionLocal() as db:
        require_staff(db, session, "admin")
        found = find_merchant(db, id)
        if not found:
            raise HTTPException(404, "Merchant not found")
        row = _merchant_row(db, found)
        orders = [_order_row(db, r) for r in db.scalars(select(Order)).all() if any(i.get("merchantId") == found["id"] for i in (r.data or {}).get("items", []))]
        owned = [p for p in all_products(db) if p.get("merchantId") == found["id"]]
        statuses: dict[str, int] = {}
        for order in orders:
            statuses[order["fulfillment"]] = statuses.get(order["fulfillment"], 0) + 1
        return {
            "merchant": {**row, "responseRate": found.get("responseRate", 92),
                         "fulfilmentRate": found.get("fulfilmentRate", 96),
                         "marketplaceEnabled": found.get("marketplaceEnabled", True)},
            "about": found.get("about", ""),
            "summary": {
                "revenueTotal": row["gmv"],
                "revenue30d": round(sum(o["total"] for o in orders if _days_between(o["placedAt"]) < 30), 2),
                "ordersTotal": len(orders),
                "commission30d": round(sum(o["commission"] for o in orders if _days_between(o["placedAt"]) < 30), 2),
                "averageOrder": round(row["gmv"] / len(orders), 2) if orders else 0.0,
            },
            "statuses": statuses,
            "catalog": [{"id": p["id"], "slug": p["slug"], "title": p["title"], "sku": p.get("sku", ""),
                         "price": p.get("price", 0), "stock": p.get("stock", 0), "status": p.get("status", "active"),
                         "category": p.get("category", ""), "channels": p.get("channels") or {},
                         "sold30d": p.get("sold30d", 0)} for p in owned],
            "orders": orders[:12],
            "commissionEarned": row["commission"],
        }


@router.patch("/merchant")
def update_merchant(session: Optional[str] = Header(None, alias="X-Ferix-Session"), payload: MerchantPatch = Body(...)):
    with SessionLocal() as db:
        staff = require_staff(db, session, "admin")
        require_permission(staff, "merchant.approve")
        found = find_merchant(db, payload.id)
        if not found:
            raise HTTPException(404, "Merchant not found")
        updated = dict(found)
        for field in ("status", "plan", "commissionPct", "marketplaceEnabled", "name", "tagline", "location", "about"):
            value = getattr(payload, field)
            if value is not None:
                updated[field] = value
        put_row(db, "merchant", found["slug"], updated)
        if payload.name and payload.name != found.get("name"):
            for product in all_products(db):
                if product.get("merchantId") == found["id"]:
                    product["merchantName"] = payload.name
                    put_row(db, "product", product["slug"], product)
        audit(db, "admin", staff.email, "merchant.update", found["slug"], f"status={updated.get('status')}")
        db.commit()
        return {"merchant": _merchant_row(db, updated)}


# ── Customers ──────────────────────────────────────────────────────────────

@router.get("/users")
def users(session: Optional[str] = Header(None, alias="X-Ferix-Session"), search: Optional[str] = None, segment: Optional[str] = None):
    with SessionLocal() as db:
        require_staff(db, session, "admin")
        rows = [_user_row(db, u) for u in db.scalars(select(User)).all()]
        rows.sort(key=lambda r: -r["spent"])
        counts: dict[str, int] = {"all": len(rows)}
        for row in rows:
            counts[row["segment"]] = counts.get(row["segment"], 0) + 1
        filtered = rows
        if search:
            q = search.lower()
            filtered = [r for r in filtered if q in r["name"].lower() or q in r["email"].lower()]
        if segment and segment != "all":
            filtered = [r for r in filtered if r["segment"] == segment]
        return {"users": filtered, "total": len(filtered), "counts": counts,
                "lifetime": round(sum(r["spent"] for r in rows), 2),
                "orders": sum(r["orders"] for r in rows)}


@router.get("/user")
def user(session: Optional[str] = Header(None, alias="X-Ferix-Session"), id: str = Query(...)):
    with SessionLocal() as db:
        require_staff(db, session, "admin")
        found = db.get(User, id)
        if not found:
            raise HTTPException(404, "Customer not found")
        row = _user_row(db, found)
        orders = [_order_row(db, r) for r in db.scalars(select(Order).where(Order.user_id == id)).all()]
        from core import Address, Review, Wishlist
        addresses = [a.data for a in db.scalars(select(Address).where(Address.user_id == id)).all()]
        reviews = [r.data for r in db.scalars(select(Review).where(Review.user_id == id)).all()]
        wish = db.scalar(select(Wishlist).where(Wishlist.user_id == id))
        saved = [p for p in all_products(db) if wish and p["id"] in (wish.product_ids or [])]
        return {
            "user": {"id": found.id, "name": found.name, "email": found.email, "phone": found.phone,
                     "initials": row["initials"], "createdAt": iso(found.created_at), "settings": found.settings or {}},
            "orders": orders,
            "addresses": [{"id": a.get("id", ""), "label": a.get("label", "Home"), "name": a.get("name", ""),
                           "line1": a.get("line1", ""), "city": a.get("city", ""),
                           "country": a.get("country", ""), "isDefault": a.get("isDefault", False)} for a in addresses],
            "reviews": [{"id": r.get("id", ""), "productId": r.get("productId", ""), "rating": r.get("rating", 0),
                         "title": r.get("title", ""), "body": r.get("body", ""), "date": r.get("date", "")} for r in reviews],
            "wishlist": [{"id": p["id"], "slug": p["slug"], "title": p["title"], "price": p["price"],
                          "merchantName": p.get("merchantName", "")} for p in saved],
            "follows": [],
            "stats": {"orders": row["orders"], "spent": row["spent"], "averageOrder": row["averageOrder"],
                      "addresses": len(addresses), "reviews": len(reviews), "saved": len(saved), "follows": 0},
        }


# ── Orders ─────────────────────────────────────────────────────────────────

@router.get("/orders")
def orders(session: Optional[str] = Header(None, alias="X-Ferix-Session"),
           search: Optional[str] = None, status: Optional[str] = None, channel: Optional[str] = None,
           merchant: Optional[str] = None):
    with SessionLocal() as db:
        require_staff(db, session, "admin")
        rows = [_order_row(db, r) for r in db.scalars(select(Order).order_by(Order.placed_at.desc())).all()]
        counts: dict[str, int] = {"all": len(rows)}
        for row in rows:
            counts[row["fulfillment"]] = counts.get(row["fulfillment"], 0) + 1
        filtered = rows
        if search:
            q = search.lower()
            filtered = [o for o in filtered if q in o["number"].lower() or q in o["customer"]["name"].lower()
                        or q in o["merchantName"].lower()]
        if status and status != "all":
            filtered = [o for o in filtered if o["fulfillment"] == status]
        if channel and channel != "all":
            filtered = [o for o in filtered if o["channel"] == channel]
        if merchant and merchant != "all":
            filtered = [o for o in filtered if o["merchantId"] == merchant]
        return {"orders": filtered, "total": len(filtered), "counts": counts,
                "gmv": round(sum(o["total"] for o in filtered), 2),
                "commission": round(sum(o["commission"] for o in filtered), 2),
                "merchants": sorted({(o["merchantId"], o["merchantName"]) for o in rows} - {("", "")},
                                    key=lambda pair: pair[1]) and [{"id": i, "name": n} for i, n in sorted({(o["merchantId"], o["merchantName"]) for o in rows}, key=lambda p: p[1])]}


# ── Analytics ──────────────────────────────────────────────────────────────

@router.get("/analytics")
def analytics(session: Optional[str] = Header(None, alias="X-Ferix-Session"), days: int = 30):
    with SessionLocal() as db:
        require_staff(db, session, "admin")
        merchants = [_merchant_row(db, m) for m in all_merchants(db)]
        orders = [_order_row(db, r) for r in db.scalars(select(Order)).all()]
        products = all_products(db)
        span = max(7, min(180, days))

        series = []
        from datetime import date as _date_t
        today = now().date()
        for offset in range(span - 1, -1, -1):
            day = (today - timedelta(days=offset)).isoformat()
            rows = [o for o in orders if _date(o["placedAt"]) == day]
            series.append({"date": day, "gmv": round(sum(o["total"] for o in rows), 2),
                           "commission": round(sum(o["commission"] for o in rows), 2),
                           "orders": len(rows)})

        gmv = round(sum(o["total"] for o in orders), 2)
        commission = round(sum(o["commission"] for o in orders), 2)
        by_category: dict[str, float] = {}
        for order in orders:
            for item in order["items"]:
                product = next((p for p in products if p["id"] == item.get("productId")), None)
                key = (product or {}).get("category", "other")
                by_category[key] = round(by_category.get(key, 0) + item.get("price", 0) * item.get("qty", 0), 2)

        return {
            "series": series,
            "totals": {
                "gmv": gmv, "commission": commission, "merchantNet": round(gmv - commission, 2),
                "orders": len(orders),
                "averageOrder": round(gmv / len(orders), 2) if orders else 0.0,
                "deliveredRate": round((sum(o["fulfillment"] == "delivered" for o in orders) / len(orders) * 100) if orders else 0, 1),
                "merchants": len(merchants), "activeMerchants": sum(m["status"] == "active" for m in merchants),
                "reviewMerchants": sum(m["status"] == "review" for m in merchants),
                "suspendedMerchants": sum(m["status"] == "suspended" for m in merchants),
                "products": len(products),
                "marketplaceListings": sum((p.get("channels") or {}).get("marketplace") for p in products),
                "soldUnits": sum(p.get("sold30d", 0) for p in products),
            },
            "byMerchant": sorted([{"id": m["id"], "name": m["name"], "slug": m["slug"], "gmv": m["gmv"],
                                   "commission": m["commission"], "orders": m["orders"]} for m in merchants],
                                 key=lambda m: -m["gmv"]),
            "byChannel": {"store": round(sum(o["total"] for o in orders if o["channel"] == "store"), 2),
                          "marketplace": round(sum(o["total"] for o in orders if o["channel"] == "marketplace"), 2)},
            "byCategory": [{"category": k, "name": k.title(), "revenue": v} for k, v in sorted(by_category.items(), key=lambda kv: -kv[1])],
            "topProducts": sorted([{"id": p["id"], "slug": p["slug"], "title": p["title"],
                                    "merchantName": p.get("merchantName", ""), "sold30d": p.get("sold30d", 0),
                                    "price": p.get("price", 0), "revenue": round(p.get("price", 0) * p.get("sold30d", 0), 2)}
                                   for p in products], key=lambda p: -p["revenue"])[:10],
            "plans": [{"plan": plan, "merchants": sum(m["plan"] == plan for m in merchants)}
                      for plan in sorted({m["plan"] for m in merchants})],
        }


# ── Settings ───────────────────────────────────────────────────────────────

@router.get("/settings")
def settings(session: Optional[str] = Header(None, alias="X-Ferix-Session")):
    with SessionLocal() as db:
        staff = require_staff(db, session, "admin")
        return {
            "settings": _settings(db),
            "admin": {"email": staff.email, "role": staff.role, "permissions": staff.permissions},
            "admins": [s.email for s in db.scalars(select(StaffUser).where(StaffUser.subject_type == "admin")).all()],
            "counts": {"merchants": len(all_merchants(db)), "categories": len(all_categories(db)),
                       "collections": len(all_collections(db)), "products": len(all_products(db))},
            "defaults": DEFAULT_SETTINGS,
        }


@router.patch("/settings")
def update_settings(session: Optional[str] = Header(None, alias="X-Ferix-Session"), payload: SettingsPatch = Body(...)):
    with SessionLocal() as db:
        staff = require_staff(db, session, "admin")
        require_permission(staff, "settings.manage")
        current = _settings(db)
        for field in DEFAULT_SETTINGS:
            value = getattr(payload, field, None)
            if value is not None:
                current[field] = value
        _save_settings(db, current)
        audit(db, "admin", staff.email, "settings.update", "platform", "Platform settings saved")
        db.commit()
        return {"settings": current}


# ── Catalogue (Ferixas-owned products) ─────────────────────────────────────

@router.get("/catalog/products")
def catalog_products(session: Optional[str] = Header(None, alias="X-Ferix-Session"),
                     search: Optional[str] = None, category: Optional[str] = None,
                     status: Optional[str] = None, owner: Optional[str] = None):
    with SessionLocal() as db:
        require_staff(db, session, "admin")
        rows = all_products(db)
        counts = {"all": len(rows)}
        for row in rows:
            counts[row.get("status", "active")] = counts.get(row.get("status", "active"), 0) + 1
        counts["official"] = sum(p.get("merchantId") == "ferixas-official" for p in rows)
        counts["seller"] = len(rows) - counts["official"]
        filtered = rows
        if search:
            q = search.lower()
            filtered = [p for p in filtered if q in p["title"].lower() or q in p.get("sku", "").lower()]
        if category and category != "all":
            filtered = [p for p in filtered if p.get("category") == category]
        if status and status != "all":
            filtered = [p for p in filtered if p.get("status") == status]
        if owner == "official":
            filtered = [p for p in filtered if p.get("merchantId") == "ferixas-official"]
        elif owner == "seller":
            filtered = [p for p in filtered if p.get("merchantId") != "ferixas-official"]
        return {
            "products": [{"id": p["id"], "slug": p["slug"], "title": p["title"], "sku": p.get("sku", ""),
                          "price": p.get("price", 0), "compareAt": p.get("compareAt"), "stock": p.get("stock", 0),
                          "status": p.get("status", "active"), "category": p.get("category", ""),
                          "merchantId": p.get("merchantId", ""), "merchantName": p.get("merchantName", ""),
                          "image": (p.get("images") or [placeholder(p["slug"])])[0],
                          "channels": p.get("channels") or {}, "featured": p.get("featured", False),
                          "collections": p.get("collections", []), "sold30d": p.get("sold30d", 0),
                          "updatedAt": p.get("updatedAt", "")} for p in filtered],
            "total": len(filtered), "counts": counts,
            "categories": sorted({p.get("category") for p in rows if p.get("category")}),
            "collections": [{"slug": c["slug"], "name": c["name"]} for c in all_collections(db)],
        }


@router.post("/catalog/product")
def catalog_create(session: Optional[str] = Header(None, alias="X-Ferix-Session"), payload: dict = Body(...)):
    with SessionLocal() as db:
        staff = require_staff(db, session, "admin")
        require_permission(staff, "catalog.manage")
        title = (payload.get("title") or "").strip()
        if not title:
            raise HTTPException(400, "A product needs a title")
        slug = payload.get("slug") or "".join(c.lower() if c.isalnum() else "-" for c in title).strip("-")
        if find_product(db, slug):
            slug = f"{slug}-{new_id('x', 4)}"
        owner_id = payload.get("merchantId") or "ferixas-official"
        owner = find_merchant(db, owner_id) or {"id": owner_id, "name": "Ferixas Official", "slug": "ferixas-official"}
        price = float(payload.get("price") or 0)
        product = {
            "id": new_id("prd"), "slug": slug, "title": title,
            "merchantId": owner["id"], "merchantName": owner["name"], "merchantSlug": owner["slug"],
            "category": payload.get("category") or "home",
            "description": payload.get("description") or "",
            "bullets": payload.get("bullets") or [], "tags": payload.get("tags") or [],
            "collections": payload.get("collections") or [],
            "images": payload.get("images") or [placeholder(f"{slug}-{i}") for i in (1, 2, 3)],
            "plates": [], "price": price, "compareAt": payload.get("compareAt"), "discount": None,
            "cost": round(price * 0.6, 2),
            "sku": payload.get("sku") or f"FX-{new_id('', 5).upper()}",
            "stock": int(payload.get("stock") or 0), "lowStockAt": 8,
            "rating": 0.0, "ratingBreakdown": {}, "reviewCount": 0,
            "variants": payload.get("variants") or [], "status": payload.get("status") or "draft",
            "channels": {"store": bool(payload.get("store", True)), "marketplace": bool(payload.get("marketplace", True))},
            "featured": bool(payload.get("featured")),
            "createdAt": iso(now()), "updatedAt": iso(now()), "sold30d": 0, "views30d": 0,
            "seoTitle": payload.get("seoTitle") or title,
            "seoDescription": payload.get("seoDescription") or (payload.get("description") or "")[:155],
            "origin": "platform",
        }
        put_row(db, "product", slug, product)
        audit(db, "admin", staff.email, "catalog.create", slug, title)
        db.commit()
        return {"product": product}


@router.patch("/catalog/product")
def catalog_update(session: Optional[str] = Header(None, alias="X-Ferix-Session"), payload: ProductPatch = Body(...)):
    with SessionLocal() as db:
        staff = require_staff(db, session, "admin")
        require_permission(staff, "catalog.manage")
        target = find_product(db, payload.id or payload.slug or "")
        if not target:
            raise HTTPException(404, "Product not found")
        updated = dict(target)
        for field in ("title", "category", "description", "status", "images", "collections", "tags", "compareAt", "featured"):
            value = getattr(payload, field, None)
            if value is not None:
                updated[field] = value
        if payload.price is not None:
            updated["price"] = float(payload.price)
        if payload.stock is not None:
            updated["stock"] = int(payload.stock)
        if payload.store is not None or payload.marketplace is not None:
            channels = dict(updated.get("channels") or {})
            if payload.store is not None:
                channels["store"] = payload.store
            if payload.marketplace is not None:
                channels["marketplace"] = payload.marketplace
            updated["channels"] = channels
        updated["updatedAt"] = iso(now())
        put_row(db, "product", target["slug"], updated)
        audit(db, "admin", staff.email, "catalog.update", target["slug"], updated.get("title", ""))
        db.commit()
        return {"product": updated}


@router.delete("/catalog/product")
def catalog_delete(session: Optional[str] = Header(None, alias="X-Ferix-Session"), payload: dict = Body(...)):
    with SessionLocal() as db:
        staff = require_staff(db, session, "admin")
        require_permission(staff, "catalog.manage")
        target = find_product(db, str(payload.get("id") or payload.get("slug") or ""))
        if not target:
            raise HTTPException(404, "Product not found")
        drop_row(db, "product", target["slug"])
        audit(db, "admin", staff.email, "catalog.delete", target["slug"], target.get("title", ""))
        db.commit()
        return {"removed": target["id"]}


# ── Categories ─────────────────────────────────────────────────────────────

@router.get("/catalog/categories")
def catalog_categories(session: Optional[str] = Header(None, alias="X-Ferix-Session")):
    with SessionLocal() as db:
        require_staff(db, session, "admin")
        rows = all_categories(db)
        products = all_products(db)
        return {"categories": sorted([{**c, "count": sum(p.get("category") == c["slug"] for p in products)} for c in rows],
                                     key=lambda c: c.get("position", 0))}


@router.post("/catalog/category")
def catalog_category(session: Optional[str] = Header(None, alias="X-Ferix-Session"), payload: CategoryIn = Body(...)):
    with SessionLocal() as db:
        staff = require_staff(db, session, "admin")
        require_permission(staff, "catalog.manage")
        slug = payload.slug or "".join(c.lower() if c.isalnum() else "-" for c in (payload.name or "")).strip("-")
        if not slug:
            raise HTTPException(400, "A category needs a name")
        existing = next((c for c in all_categories(db) if c["slug"] == slug), {})
        row = {
            **existing, "id": existing.get("id", slug), "slug": slug,
            "name": payload.name or existing.get("name", slug.title()),
            "blurb": payload.blurb if payload.blurb is not None else existing.get("blurb", ""),
            "glyph": payload.glyph or existing.get("glyph", "Tag"),
            "image": payload.image if payload.image is not None else existing.get("image") or placeholder(f"cat-{slug}"),
            "imageUrl": payload.image if payload.image is not None else existing.get("imageUrl") or placeholder(f"cat-{slug}"),
            "showInNav": payload.showInNav if payload.showInNav is not None else existing.get("showInNav", True),
            "showAsTile": payload.showAsTile if payload.showAsTile is not None else existing.get("showAsTile", True),
            "showAsText": payload.showAsText if payload.showAsText is not None else existing.get("showAsText", False),
            "visible": payload.visible if payload.visible is not None else existing.get("visible", True),
            "position": payload.position if payload.position is not None else existing.get("position", 0),
        }
        put_row(db, "category", slug, row)
        audit(db, "admin", staff.email, "category.save", slug, row["name"])
        db.commit()
        return {"category": row}


@router.delete("/catalog/category")
def catalog_category_delete(session: Optional[str] = Header(None, alias="X-Ferix-Session"), payload: dict = Body(...)):
    with SessionLocal() as db:
        staff = require_staff(db, session, "admin")
        require_permission(staff, "catalog.manage")
        slug = str(payload.get("slug") or "")
        if not drop_row(db, "category", slug):
            raise HTTPException(404, "Category not found")
        audit(db, "admin", staff.email, "category.delete", slug, "")
        db.commit()
        return {"removed": slug}


# ── Collections ────────────────────────────────────────────────────────────

@router.get("/catalog/collections")
def catalog_collections(session: Optional[str] = Header(None, alias="X-Ferix-Session")):
    with SessionLocal() as db:
        require_staff(db, session, "admin")
        products = all_products(db)
        return {"collections": sorted([{**c, "count": sum(c["slug"] in (p.get("collections") or []) for p in products)}
                                       for c in all_collections(db)], key=lambda c: c.get("position", 0))}


@router.post("/catalog/collection")
def catalog_collection(session: Optional[str] = Header(None, alias="X-Ferix-Session"), payload: CollectionIn = Body(...)):
    with SessionLocal() as db:
        staff = require_staff(db, session, "admin")
        require_permission(staff, "catalog.manage")
        slug = payload.slug or "".join(c.lower() if c.isalnum() else "-" for c in (payload.name or "")).strip("-")
        if not slug:
            raise HTTPException(400, "A collection needs a name")
        existing = next((c for c in all_collections(db) if c["slug"] == slug), {})
        row = {
            **existing, "id": existing.get("id", slug), "slug": slug,
            "name": payload.name or existing.get("name", slug.title()),
            "blurb": payload.blurb if payload.blurb is not None else existing.get("blurb", ""),
            "image": payload.image if payload.image is not None else existing.get("image") or placeholder(f"col-{slug}"),
            "visible": payload.visible if payload.visible is not None else existing.get("visible", True),
            "position": payload.position if payload.position is not None else existing.get("position", 0),
        }
        put_row(db, "collection", slug, row)
        audit(db, "admin", staff.email, "collection.save", slug, row["name"])
        db.commit()
        return {"collection": row}


@router.delete("/catalog/collection")
def catalog_collection_delete(session: Optional[str] = Header(None, alias="X-Ferix-Session"), payload: dict = Body(...)):
    with SessionLocal() as db:
        staff = require_staff(db, session, "admin")
        require_permission(staff, "catalog.manage")
        slug = str(payload.get("slug") or "")
        if not drop_row(db, "collection", slug):
            raise HTTPException(404, "Collection not found")
        audit(db, "admin", staff.email, "collection.delete", slug, "")
        db.commit()
        return {"removed": slug}


# ── Banners ────────────────────────────────────────────────────────────────

@router.get("/cms/banners")
def cms_banners(session: Optional[str] = Header(None, alias="X-Ferix-Session")):
    with SessionLocal() as db:
        require_staff(db, session, "admin")
        rows = rows_of(db, "banner")
        return {"banners": sorted(rows, key=lambda b: b.get("position", 0))}


@router.post("/cms/banner")
def cms_banner(session: Optional[str] = Header(None, alias="X-Ferix-Session"), payload: BannerIn = Body(...)):
    with SessionLocal() as db:
        staff = require_staff(db, session, "admin")
        require_permission(staff, "cms.manage")
        banner_id = payload.id or new_id("bnr")
        existing = next((b for b in rows_of(db, "banner") if b.get("id") == banner_id), {})
        media = payload.mediaUrl or payload.image or payload.videoUrl or existing.get("mediaUrl") or placeholder(banner_id)
        row = {
            **existing, "id": banner_id,
            "kind": payload.kind or existing.get("kind", "image"),
            "eyebrow": payload.eyebrow if payload.eyebrow is not None else existing.get("eyebrow", ""),
            "headline": payload.headline if payload.headline is not None else existing.get("headline", ""),
            "body": payload.body if payload.body is not None else existing.get("body", ""),
            "ctaLabel": payload.ctaLabel if payload.ctaLabel is not None else existing.get("ctaLabel", "Shop now"),
            "ctaHref": payload.ctaHref if payload.ctaHref is not None else existing.get("ctaHref", "/browse"),
            "secondaryLabel": payload.secondaryLabel if payload.secondaryLabel is not None else existing.get("secondaryLabel"),
            "secondaryHref": payload.secondaryHref if payload.secondaryHref is not None else existing.get("secondaryHref"),
            "mediaUrl": media, "image": media, "imageUrl": media,
            "videoUrl": payload.videoUrl if payload.videoUrl is not None else (media if (payload.kind == "video") else existing.get("videoUrl")),
            "accent": payload.accent if payload.accent is not None else existing.get("accent", "#c8ff3d"),
            "audience": payload.audience if payload.audience is not None else existing.get("audience", "everyone"),
            "active": payload.active if payload.active is not None else existing.get("active", True),
            "position": payload.order if payload.order is not None else existing.get("position", 99),
            "status": "published" if (payload.active if payload.active is not None else True) else "draft",
        }
        put_row(db, "banner", banner_id, row)
        audit(db, "admin", staff.email, "banner.save", banner_id, row.get("headline", ""))
        db.commit()
        return {"banner": row}


@router.delete("/cms/banner")
def cms_banner_delete(session: Optional[str] = Header(None, alias="X-Ferix-Session"), payload: dict = Body(...)):
    with SessionLocal() as db:
        staff = require_staff(db, session, "admin")
        require_permission(staff, "cms.manage")
        banner_id = str(payload.get("id") or "")
        if not drop_row(db, "banner", banner_id):
            raise HTTPException(404, "Banner not found")
        audit(db, "admin", staff.email, "banner.delete", banner_id, "")
        db.commit()
        return {"removed": banner_id}


# ── Content documents (CMS) ────────────────────────────────────────────────

def _document_json(doc: ContentDocument) -> dict:
    return {"id": doc.id, "ownerType": doc.owner_type, "ownerId": doc.owner_id,
            "documentType": doc.document_type, "title": doc.title, "status": doc.status,
            "data": doc.data, "updatedAt": iso(doc.updated_at), "updatedBy": doc.updated_by}


def _ensure_document(db, document_id: str) -> ContentDocument:
    doc = db.get(ContentDocument, document_id)
    if doc:
        return doc
    doc = ContentDocument(id=document_id, owner_type="platform", owner_id="platform",
                          document_type=document_id, title=document_id.replace("doc_", "").replace("_", " ").title(),
                          status="draft", data={"sections": []})
    db.add(doc)
    db.flush()
    return doc


@router.get("/cms/documents")
def cms_documents(session: Optional[str] = Header(None, alias="X-Ferix-Session")):
    with SessionLocal() as db:
        require_staff(db, session, "admin")
        docs = db.scalars(select(ContentDocument).where(ContentDocument.owner_type == "platform")).all()
        return {"documents": [_document_json(d) for d in docs]}


@router.get("/cms/document")
def cms_document(session: Optional[str] = Header(None, alias="X-Ferix-Session"), id: str = Query(...)):
    with SessionLocal() as db:
        require_staff(db, session, "admin")
        doc = _ensure_document(db, id)
        versions = db.scalars(select(ContentVersion).where(ContentVersion.document_id == doc.id)
                              .order_by(ContentVersion.version.desc()).limit(20)).all()
        db.commit()
        return {"document": _document_json(doc),
                "versions": [{"id": v.id, "version": v.version, "status": v.status, "note": v.note,
                              "createdBy": v.created_by, "createdAt": iso(v.created_at)} for v in versions]}


@router.patch("/cms/document")
def cms_save_document(session: Optional[str] = Header(None, alias="X-Ferix-Session"), payload: DocumentIn = Body(...)):
    with SessionLocal() as db:
        staff = require_staff(db, session, "admin")
        require_permission(staff, "cms.manage")
        doc = _ensure_document(db, payload.id)
        if payload.title is not None:
            doc.title = payload.title
        if payload.data is not None:
            doc.data = payload.data
        if payload.status is not None:
            doc.status = payload.status
        doc.updated_at = now()
        doc.updated_by = staff.email
        version = len(db.scalars(select(ContentVersion).where(ContentVersion.document_id == doc.id)).all()) + 1
        db.add(ContentVersion(id=new_id("ver"), document_id=doc.id, version=version,
                              status=doc.status, data=doc.data, note=payload.note or "Saved",
                              created_by=staff.email))
        audit(db, "admin", staff.email, "cms.save", doc.id, doc.status)
        db.commit()
        return {"document": _document_json(doc)}


@router.post("/cms/document/publish")
def cms_publish(session: Optional[str] = Header(None, alias="X-Ferix-Session"), payload: dict = Body(...)):
    with SessionLocal() as db:
        staff = require_staff(db, session, "admin")
        require_permission(staff, "cms.manage")
        doc = _ensure_document(db, str(payload.get("id")))
        doc.status = "published"
        doc.updated_at = now()
        doc.updated_by = staff.email
        version = len(db.scalars(select(ContentVersion).where(ContentVersion.document_id == doc.id)).all()) + 1
        db.add(ContentVersion(id=new_id("ver"), document_id=doc.id, version=version,
                              status="published", data=doc.data, note="Published", created_by=staff.email))
        audit(db, "admin", staff.email, "cms.publish", doc.id, "Published")
        db.commit()
        return {"document": _document_json(doc)}


@router.post("/cms/document/restore")
def cms_restore(session: Optional[str] = Header(None, alias="X-Ferix-Session"), payload: dict = Body(...)):
    with SessionLocal() as db:
        staff = require_staff(db, session, "admin")
        require_permission(staff, "cms.manage")
        version = db.get(ContentVersion, str(payload.get("versionId")))
        if not version:
            raise HTTPException(404, "Version not found")
        doc = _ensure_document(db, version.document_id)
        doc.data = version.data
        doc.updated_at = now()
        doc.updated_by = staff.email
        db.add(ContentVersion(id=new_id("ver"), document_id=doc.id,
                              version=len(db.scalars(select(ContentVersion).where(ContentVersion.document_id == doc.id)).all()) + 1,
                              status=doc.status, data=version.data,
                              note=f"Restored v{version.version}", created_by=staff.email))
        audit(db, "admin", staff.email, "cms.restore", doc.id, f"v{version.version}")
        db.commit()
        return {"document": _document_json(doc)}


# ── Media library ──────────────────────────────────────────────────────────

@router.get("/media")
def media(session: Optional[str] = Header(None, alias="X-Ferix-Session")):
    with SessionLocal() as db:
        require_staff(db, session, "admin")
        rows = db.scalars(select(MediaAsset).where(MediaAsset.owner_type == "platform").order_by(MediaAsset.created_at.desc())).all()
        import os
        return {"assets": [media_json(m) for m in rows],
                "storage": "cloudinary" if os.getenv("CLOUDINARY_URL") else "pending-configuration"}


@router.post("/media")
def add_media(session: Optional[str] = Header(None, alias="X-Ferix-Session"), payload: MediaIn = Body(...)):
    with SessionLocal() as db:
        staff = require_staff(db, session, "admin")
        require_permission(staff, "media.manage")
        asset = MediaAsset(id=new_id("med"), owner_type="platform", owner_id="platform",
                           kind=payload.kind, url=payload.url, alt=payload.alt, folder=payload.folder,
                           public_id=payload.publicId, width=payload.width, height=payload.height)
        db.add(asset)
        audit(db, "admin", staff.email, "media.add", payload.folder, payload.url[:120])
        db.commit()
        return {"asset": media_json(asset)}


@router.delete("/media")
def remove_media(session: Optional[str] = Header(None, alias="X-Ferix-Session"), payload: dict = Body(...)):
    with SessionLocal() as db:
        staff = require_staff(db, session, "admin")
        require_permission(staff, "media.manage")
        asset = db.get(MediaAsset, str(payload.get("id")))
        if not asset:
            raise HTTPException(404, "Media not found")
        db.delete(asset)
        db.commit()
        return {"removed": str(payload.get("id"))}


# ── Promotions ─────────────────────────────────────────────────────────────

@router.get("/promotions")
def promotions(session: Optional[str] = Header(None, alias="X-Ferix-Session")):
    with SessionLocal() as db:
        require_staff(db, session, "admin")
        rows = db.scalars(select(FlashSale).order_by(FlashSale.starts_at.desc())).all()
        return {"sales": [_sale_json(db, s) for s in rows],
                "products": [{"id": p["id"], "title": p["title"], "price": p["price"],
                              "merchantName": p.get("merchantName", "")} for p in all_products(db)[:60]]}


@router.post("/promotions")
def create_promotion(session: Optional[str] = Header(None, alias="X-Ferix-Session"), payload: PromotionIn = Body(...)):
    with SessionLocal() as db:
        staff = require_staff(db, session, "admin")
        require_permission(staff, "promotions.manage")
        if not payload.name:
            raise HTTPException(400, "A promotion needs a name")
        from datetime import datetime as _dt
        def parse(value, fallback):
            if not value:
                return fallback
            try:
                return _dt.fromisoformat(str(value).replace("Z", "+00:00"))
            except Exception:
                return fallback
        sale = FlashSale(
            id=payload.id or new_id("sale"), name=payload.name,
            headline=payload.headline or "",
            banner_url=payload.bannerUrl or placeholder(f"sale-{new_id('', 6)}"),
            starts_at=parse(payload.startsAt, now()),
            ends_at=parse(payload.endsAt, now() + timedelta(days=7)),
            status=payload.status or "draft", owner_type="platform", owner_id="platform",
        )
        if payload.id:
            existing = db.get(FlashSale, payload.id)
            if existing:
                for field in ("name", "headline", "banner_url", "starts_at", "ends_at", "status"):
                    setattr(existing, field, getattr(sale, field))
                db.query(FlashSaleItem).filter(FlashSaleItem.sale_id == sale.id).delete()
                sale = existing
            else:
                db.add(sale)
        else:
            db.add(sale)
        for item in payload.items or []:
            product = find_product(db, str(item.get("productId", "")))
            db.add(FlashSaleItem(id=new_id("fsi"), sale_id=sale.id,
                                 product_id=item.get("productId", ""),
                                 merchant_id=(product or {}).get("merchantId", ""),
                                 sale_price=float(item.get("salePrice", 0)),
                                 quantity_limit=int(item.get("quantityLimit", 0))))
        audit(db, "admin", staff.email, "promotion.save", sale.name, sale.status)
        db.commit()
        return {"sale": _sale_json(db, sale)}


@router.delete("/promotions")
def delete_promotion(session: Optional[str] = Header(None, alias="X-Ferix-Session"), payload: dict = Body(...)):
    with SessionLocal() as db:
        staff = require_staff(db, session, "admin")
        require_permission(staff, "promotions.manage")
        sale = db.get(FlashSale, str(payload.get("id")))
        if not sale:
            raise HTTPException(404, "Promotion not found")
        db.query(FlashSaleItem).filter(FlashSaleItem.sale_id == sale.id).delete()
        db.delete(sale)
        audit(db, "admin", staff.email, "promotion.delete", sale.name, "")
        db.commit()
        return {"removed": str(payload.get("id"))}


# ── Payments and payouts ───────────────────────────────────────────────────

@router.get("/payments")
def payments(session: Optional[str] = Header(None, alias="X-Ferix-Session")):
    with SessionLocal() as db:
        require_staff(db, session, "admin")
        orders = [_order_row(db, r) for r in db.scalars(select(Order).order_by(Order.placed_at.desc())).all()]
        gross = round(sum(o["total"] for o in orders), 2)
        commission = round(sum(o["commission"] for o in orders), 2)
        refunds = round(sum(o["total"] for o in orders if o["fulfillment"] == "cancelled"), 2)
        return {
            "transactions": [{"id": f"txn_{o['id']}", "orderId": o["id"], "number": o["number"],
                              "placedAt": o["placedAt"], "merchantId": o["merchantId"],
                              "merchantName": o["merchantName"], "customer": o["customer"]["name"],
                              "amount": o["total"], "commission": o["commission"], "channel": o["channel"],
                              "status": "refunded" if o["fulfillment"] == "cancelled" else ("settled" if o["fulfillment"] == "delivered" else "authorized"),
                              "method": o["payment"]} for o in orders],
            "totals": {"gross": gross, "commission": commission, "merchantNet": round(gross - commission, 2),
                       "refunds": refunds, "net": round(gross - refunds, 2),
                       "authorized": round(sum(o["total"] for o in orders if o["fulfillment"] == "processing"), 2),
                       "settled": round(sum(o["total"] for o in orders if o["fulfillment"] == "delivered"), 2)},
            "provider": "pending-configuration",
            "message": "Connect a payment provider to move from recorded transactions to live charges.",
        }


@router.get("/payouts")
def payouts(session: Optional[str] = Header(None, alias="X-Ferix-Session")):
    with SessionLocal() as db:
        require_staff(db, session, "admin")
        stored = db.scalars(select(Payout)).all()
        rows = [{"id": p.id, "merchantId": p.merchant_id,
                 "merchantName": (find_merchant(db, p.merchant_id) or {}).get("name", p.merchant_id),
                 "period": p.period, "orders": p.orders, "gross": p.gross, "commission": p.commission,
                 "net": p.net, "status": p.status, "date": p.date, "method": p.method} for p in stored]
        if not rows:
            for merchant in all_merchants(db):
                orders = [_order_row(db, r) for r in db.scalars(select(Order)).all()
                          if any(i.get("merchantId") == merchant["id"] for i in (r.data or {}).get("items", []))]
                buckets: dict[str, dict] = {}
                for order in orders:
                    period = _date(order["placedAt"])[:7]
                    bucket = buckets.setdefault(period, {"orders": 0, "gross": 0.0, "commission": 0.0})
                    bucket["orders"] += 1
                    bucket["gross"] = round(bucket["gross"] + order["total"], 2)
                    bucket["commission"] = round(bucket["commission"] + order["commission"], 2)
                for period, bucket in buckets.items():
                    rows.append({"id": f"pay_{merchant['slug']}_{period}", "merchantId": merchant["id"],
                                 "merchantName": merchant["name"], "period": period,
                                 "orders": bucket["orders"], "gross": bucket["gross"],
                                 "commission": bucket["commission"],
                                 "net": round(bucket["gross"] - bucket["commission"], 2),
                                 "status": "pending", "date": f"{period}-28", "method": "Bank transfer"})
        return {"payouts": rows,
                "totals": {"pending": round(sum(r["net"] for r in rows if r["status"] == "pending"), 2),
                           "paid": round(sum(r["net"] for r in rows if r["status"] == "paid"), 2),
                           "gross": round(sum(r["gross"] for r in rows), 2),
                           "commission": round(sum(r["commission"] for r in rows), 2)},
                "message": "Marking a payout paid records the settlement. Live transfers require a payout provider."}


@router.patch("/payouts")
def update_payout(session: Optional[str] = Header(None, alias="X-Ferix-Session"), payload: PayoutPatch = Body(...)):
    with SessionLocal() as db:
        staff = require_staff(db, session, "admin")
        require_permission(staff, "payouts.view")
        row = db.get(Payout, payload.id)
        if not row:
            row = Payout(id=payload.id, merchant_id=payload.id.split("_")[1] if "_" in payload.id else "",
                         period="", orders=0, gross=0, commission=0, net=0, status="pending",
                         method="Bank transfer", date=_date(iso(now())))
            db.add(row)
        if payload.status:
            row.status = payload.status
        audit(db, "admin", staff.email, "payout.update", payload.id, payload.status or "")
        db.commit()
        return {"payout": {"id": row.id, "status": row.status}}


# ── Roles, staff and audit ─────────────────────────────────────────────────

@router.get("/staff")
def staff_list(session: Optional[str] = Header(None, alias="X-Ferix-Session")):
    with SessionLocal() as db:
        require_staff(db, session, "admin")
        rows = db.scalars(select(StaffUser).where(StaffUser.subject_type == "admin")).all()
        return {"staff": [{"id": s.id, "name": s.name, "email": s.email, "role": s.role,
                           "permissions": s.permissions, "createdAt": iso(s.created_at)} for s in rows],
                "roles": [{"role": role, "permissions": perms} for role, perms in ROLE_PERMISSIONS.items()]}


@router.post("/staff")
def staff_save(session: Optional[str] = Header(None, alias="X-Ferix-Session"), payload: StaffIn = Body(...)):
    with SessionLocal() as db:
        staff = require_staff(db, session, "admin")
        require_permission(staff, "settings.manage")
        if payload.id:
            row = db.get(StaffUser, payload.id)
            if not row:
                raise HTTPException(404, "Team member not found")
        else:
            if not payload.email:
                raise HTTPException(400, "An email is required")
            row = StaffUser(id=new_id("stf"), subject_type="admin", subject_id="platform",
                            name=payload.name or payload.email, email=payload.email.lower(),
                            password_hash="", role=payload.role or "admin", permissions=[])
            db.add(row)
        if payload.name:
            row.name = payload.name
        if payload.role:
            row.role = payload.role
            row.permissions = payload.permissions or permissions_for(payload.role)
        elif payload.permissions is not None:
            row.permissions = payload.permissions
        if payload.password:
            from core import hash_password
            row.password_hash = hash_password(payload.password)
        if not row.password_hash:
            raise HTTPException(400, "Set a password for this team member")
        audit(db, "admin", staff.email, "staff.save", row.email, row.role)
        db.commit()
        return {"staff": {"id": row.id, "name": row.name, "email": row.email, "role": row.role,
                          "permissions": row.permissions}}


@router.delete("/staff")
def staff_delete(session: Optional[str] = Header(None, alias="X-Ferix-Session"), payload: dict = Body(...)):
    with SessionLocal() as db:
        staff = require_staff(db, session, "admin")
        require_permission(staff, "settings.manage")
        row = db.get(StaffUser, str(payload.get("id")))
        if not row:
            raise HTTPException(404, "Team member not found")
        if row.email == staff.email:
            raise HTTPException(400, "You cannot remove your own account")
        db.delete(row)
        audit(db, "admin", staff.email, "staff.delete", row.email, "")
        db.commit()
        return {"removed": str(payload.get("id"))}


@router.get("/audit")
def audit_log(session: Optional[str] = Header(None, alias="X-Ferix-Session"), limit: int = 100):
    with SessionLocal() as db:
        require_staff(db, session, "admin")
        rows = db.scalars(select(AuditLog).order_by(AuditLog.created_at.desc()).limit(max(1, min(500, limit)))).all()
        return {"events": [{"id": r.id, "actorType": r.actor_type, "actorId": r.actor_id,
                            "action": r.action, "target": r.target, "detail": r.detail,
                            "at": iso(r.created_at)} for r in rows]}

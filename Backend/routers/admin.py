"""Platform console API: /admin/*

Matches WebPhase/admin/lib/api.ts, and adds the operating surface the console
needs next: catalogue, CMS, media, promotions, payments, payouts, roles, audit.
"""
from __future__ import annotations

from datetime import timedelta
import re
from typing import Optional

from fastapi import APIRouter, Body, File, Form, Header, HTTPException, Query, Request, UploadFile
from pydantic import BaseModel
from sqlalchemy import select

from core import (
    AuditLog, ContentDocument, ContentVersion, FlashSale, FlashSaleItem, LedgerEntry,
    MediaAsset, MerchantProfileRequest, Order, Payout, ROLE_PERMISSIONS, SessionLocal, StaffSession, StaffUser, User,
    audit, collections as all_collections, categories as all_categories, find_merchant,
    find_product, iso, issue_staff_session, media_json, merchants as all_merchants,
    is_platform_product, is_seller_marketplace_product, marketplace_product_available,
    merchant_follower_count, merchant_review_summary, new_id, now,
    permissions_for, placeholder, product_owner_kind, products as all_products,
    put_row, drop_row, seller_products,
    remove_media_blob, require_permission, require_staff, rows_of, storage_info,
    sync_pending_media, upload_media_blob, validate_media_upload, verify_password,
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
    verified: Optional[bool] = None


class MerchantProfileDecisionIn(BaseModel):
    id: str
    decision: str
    note: Optional[str] = None


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
    showText: Optional[bool] = None
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


class BrandCreate(BaseModel):
    name: str
    slug: str
    description: str = ""
    imageUrl: str = ""
    featured: bool = False
    visible: bool = True
    position: int = 0


class BrandPatch(BaseModel):
    id: str
    name: Optional[str] = None
    slug: Optional[str] = None
    description: Optional[str] = None
    imageUrl: Optional[str] = None
    featured: Optional[bool] = None
    visible: Optional[bool] = None
    position: Optional[int] = None


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


def _brand_fields(data: dict, existing: Optional[dict] = None) -> dict:
    """Normalize and validate the stable cross-surface brand contract."""
    current = existing or {}
    name = str(data.get("name", current.get("name", ""))).strip()
    slug = str(data.get("slug", current.get("slug", ""))).strip().lower()
    description = str(data.get("description", current.get("description", "")) or "").strip()
    image_url = str(data.get("imageUrl", current.get("imageUrl", "")) or "").strip()
    if not 1 <= len(name) <= 120:
        raise HTTPException(422, "Brand name must be between 1 and 120 characters")
    if not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", slug) or len(slug) > 80:
        raise HTTPException(422, "Brand slug must be lowercase kebab-case and at most 80 characters")
    if len(description) > 500:
        raise HTTPException(422, "Brand description must be at most 500 characters")
    if len(image_url) > 2048 or (image_url and not (image_url.startswith("/") or re.match(r"^https?://", image_url, re.I))):
        raise HTTPException(422, "Brand imageUrl must be a relative path or http(s) URL under 2048 characters")
    position = data.get("position", current.get("position", 0))
    if not isinstance(position, int) or position < 0 or position > 100000:
        raise HTTPException(422, "Brand position must be between 0 and 100000")
    return {
        "id": str(data.get("id", current.get("id", ""))),
        "name": name, "slug": slug, "description": description,
        "imageUrl": image_url, "featured": bool(data.get("featured", current.get("featured", False))),
        "visible": bool(data.get("visible", current.get("visible", True))), "position": position,
    }


def _brand_by_id(db, value: str) -> Optional[dict]:
    return next((b for b in rows_of(db, "brand") if b.get("id") == value or b.get("slug") == value), None)


def _assert_unique_brand_slug(db, slug: str, brand_id: Optional[str] = None) -> None:
    duplicate = next((b for b in rows_of(db, "brand") if b.get("slug") == slug and b.get("id") != brand_id), None)
    if duplicate:
        raise HTTPException(409, "A brand with that slug already exists")


PAID_PAYMENT_STATES = {"paid", "captured", "succeeded", "settled"}


def _order_row(db, row: Order) -> dict:
    data = dict(row.data or {})
    user = db.get(User, row.user_id)
    merchant = find_merchant(db, (data.get("items") or [{}])[0].get("merchantId", "")) or {}
    payment = str(data.get("payment") or "pending").lower()
    channel = str(data.get("channel") or "unknown").lower()
    commission = 0.0
    if payment in PAID_PAYMENT_STATES and channel == "marketplace":
        for item in data.get("items", []):
            owner = find_merchant(db, str(item.get("merchantId") or "")) or {}
            try:
                rate = float(owner.get("commissionPct", DEFAULT_SETTINGS["defaultCommissionPct"]))
                commission += float(item.get("price") or 0) * int(item.get("qty") or 0) * rate / 100
            except (TypeError, ValueError):
                continue
    return {
        "id": data.get("id", row.id), "number": data.get("number", row.id),
        "placedAt": data.get("placedAt", iso(row.placed_at)),
        "channel": channel,
        "customer": {
            "id": row.user_id, "name": (user.name if user else "Guest"),
            "email": (user.email if user else ""), "phone": (user.phone if user else ""),
            "location": (data.get("address") or {}).get("country", "—"),
        },
        "items": data.get("items", []),
        "subtotal": data.get("subtotal", 0), "shipping": data.get("shipping", 0),
        "tax": data.get("tax", 0), "total": data.get("total", 0),
        "commission": round(commission, 2),
        "payment": payment,
        "fulfillment": data.get("fulfillment", "processing"),
        "carrier": data.get("carrier"), "tracking": data.get("tracking"),
        "merchantId": merchant.get("id", ""), "merchantName": merchant.get("name", "Ferixas"),
        "merchantSlug": merchant.get("slug", ""),
    }


def _order_product_units(orders: list[dict], days: Optional[int] = None, merchant_id: Optional[str] = None) -> dict[str, int]:
    """Aggregate real non-cancelled order quantities; catalogue seed metadata is not sales."""
    counts: dict[str, int] = {}
    for order in orders:
        if order.get("channel") != "marketplace":
            continue
        if order.get("payment") not in PAID_PAYMENT_STATES or order.get("fulfillment") == "cancelled":
            continue
        if days is not None and _days_between(order.get("placedAt", "")) >= days:
            continue
        for item in order.get("items", []):
            if merchant_id and item.get("merchantId") != merchant_id:
                continue
            product_id = str(item.get("productId", ""))
            if not product_id:
                continue
            try:
                quantity = max(0, int(item.get("qty", 0)))
            except (TypeError, ValueError):
                quantity = 0
            counts[product_id] = counts.get(product_id, 0) + quantity
    return counts


def _merchant_row(db, merchant: dict) -> dict:
    owned = seller_products(db, merchant["id"])
    orders = [_order_row(db, r) for r in db.scalars(select(Order)).all()
              if str((r.data or {}).get("channel") or "").lower() == "marketplace"
              and any(i.get("merchantId") == merchant["id"] for i in (r.data or {}).get("items", []))]
    paid_marketplace = [o for o in orders if o.get("payment") in PAID_PAYMENT_STATES
                        and o.get("channel") == "marketplace" and o.get("fulfillment") != "cancelled"]
    seller_lines = [item for order in paid_marketplace for item in order.get("items", [])
                    if item.get("merchantId") == merchant["id"]]
    gmv = round(sum(float(i.get("price") or 0) * int(i.get("qty") or 0) for i in seller_lines), 2)
    try:
        rate = float(merchant.get("commissionPct", DEFAULT_SETTINGS["defaultCommissionPct"]))
    except (TypeError, ValueError):
        rate = DEFAULT_SETTINGS["defaultCommissionPct"]
    commission = round(gmv * rate / 100, 2)
    reviews = merchant_review_summary(db, merchant["id"])
    return {
        "id": merchant["id"], "slug": merchant["slug"], "name": merchant["name"],
        "tagline": merchant.get("tagline", ""), "location": merchant.get("location", ""),
        "rating": reviews["rating"], "reviewCount": reviews["reviewCount"],
        "followers": merchant_follower_count(db, merchant["id"]), "verified": merchant.get("verified", False),
        "brand": merchant.get("brand", {}), "domain": merchant.get("domain", ""),
        "customDomain": merchant.get("customDomain"), "plan": merchant.get("plan", "Starter"),
        "since": merchant.get("since", ""), "status": merchant.get("status", "active"),
        "commissionPct": merchant.get("commissionPct", 10),
        "productCount": len(owned),
        "marketplaceListings": sum(p.get("status") == "approved" and (p.get("channels") or {}).get("marketplace") is True for p in owned),
        "gmv": gmv, "commission": commission, "orders": len(paid_marketplace),
        "template": (merchant.get("brand") or {}).get("template"),
    }


def _user_row(db, user: User) -> dict:
    orders = [_order_row(db, r) for r in db.scalars(select(Order).where(Order.user_id == user.id)).all()]
    orders = [o for o in orders if o.get("channel") == "marketplace"
              and o.get("payment") in PAID_PAYMENT_STATES and o.get("fulfillment") != "cancelled"]
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
        # A correct password is not the same as permission. An account created
        # without a role, or had one withdrawn, holds no permissions at all - and
        # must be told so rather than signed in to an empty console.
        # The role's definition is authoritative. Permissions are stored on the row,
        # so changing a role in the code would otherwise leave every existing account
        # holding the permissions it was created with - an administrator would keep
        # reaching a destination the role no longer grants.
        from core import ROLE_PERMISSIONS, permissions_for

        if staff.role in ROLE_PERMISSIONS:
            fresh = permissions_for(staff.role)
            if list(staff.permissions or []) != fresh:
                staff.permissions = fresh
                db.commit()

        if not (staff.permissions or []):
            raise HTTPException(403, "That account has no access. Ask an owner to grant it a role.")
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
        orders = [_order_row(db, r) for r in db.scalars(select(Order).order_by(Order.placed_at.desc())).all()
                  if str((r.data or {}).get("channel") or "").lower() == "marketplace"]
        paid_orders = [o for o in orders if o.get("payment") in PAID_PAYMENT_STATES
                       and o.get("fulfillment") != "cancelled"]
        users = db.scalars(select(User)).all()
        products = all_products(db)
        official_products = [p for p in products if is_platform_product(p)]
        marketplace_listings = [p for p in products if marketplace_product_available(db, p)]
        sold_units = _order_product_units(paid_orders)

        gmv = round(sum(o["total"] for o in paid_orders), 2)
        commission = round(sum(o["commission"] for o in paid_orders), 2)
        statuses: dict[str, int] = {}
        for order in orders:
            statuses[order["fulfillment"]] = statuses.get(order["fulfillment"], 0) + 1

        def window(days: int) -> dict:
            rows = [o for o in paid_orders if _days_between(o["placedAt"]) < days]
            return {"gmv": round(sum(o["total"] for o in rows), 2),
                    "commission": round(sum(o["commission"] for o in rows), 2), "orders": len(rows)}

        return {
            "settings": _settings(db),
            "totals": {
                "gmv": gmv, "commission": commission, "merchantNet": round(gmv - commission, 2),
                "orders": len(orders),
                "averageOrder": round(gmv / len(paid_orders), 2) if paid_orders else 0.0,
                "deliveredRate": round((sum(o["fulfillment"] == "delivered" for o in paid_orders) / len(paid_orders) * 100) if paid_orders else 0, 1),
                "merchants": len(merchants),
                "activeMerchants": sum(m["status"] == "active" for m in merchants),
                "reviewMerchants": sum(m["status"] == "review" for m in merchants),
                "suspendedMerchants": sum(m["status"] == "suspended" for m in merchants),
                "products": len(official_products),
                "marketplaceListings": len(marketplace_listings),
                "soldUnits": sum(sold_units.values()),
            },
            "windows": {"today": window(1), "week": window(7), "month": window(30)},
            "channels": {"marketplace": gmv},
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
        staff = require_staff(db, session, "admin")

        require_permission(staff, "merchant.view")
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
        staff = require_staff(db, session, "admin")
        require_permission(staff, "merchant.view")
        found = find_merchant(db, id)
        if not found:
            raise HTTPException(404, "Merchant not found")
        row = _merchant_row(db, found)
        orders = [_order_row(db, r) for r in db.scalars(select(Order)).all()
                  if str((r.data or {}).get("channel") or "").lower() == "marketplace"
                  and any(i.get("merchantId") == found["id"] for i in (r.data or {}).get("items", []))]
        owned = seller_products(db, found["id"])
        sold30 = _order_product_units(orders, days=30, merchant_id=found["id"])
        statuses: dict[str, int] = {}
        for order in orders:
            statuses[order["fulfillment"]] = statuses.get(order["fulfillment"], 0) + 1
        return {
            "merchant": {**row,
                         "responseRate": found.get("responseRate") if found.get("responseRateVerified") else None,
                         "fulfilmentRate": found.get("fulfilmentRate") if found.get("fulfilmentRateVerified") else None,
                         "marketplaceEnabled": found.get("marketplaceEnabled", True)},
            "about": found.get("about", ""),
            "profile": {key: found.get(key, "") for key in (
                "name", "tagline", "about", "location", "logo", "businessName", "businessEmail", "businessPhone",
                "addressLine1", "addressLine2", "city", "region", "postalCode", "country", "website",
                "showBusinessEmail", "showPhone",
            )},
            "profileRequests": [{
                "id": request.id, "profile": request.profile or {}, "status": request.status,
                "note": request.note or "", "submittedBy": request.submitted_by,
                "submittedAt": iso(request.submitted_at), "reviewedBy": request.reviewed_by,
                "reviewedAt": iso(request.reviewed_at) if request.reviewed_at else None,
            } for request in db.scalars(select(MerchantProfileRequest)
                                        .where(MerchantProfileRequest.merchant_id == found["id"])
                                        .order_by(MerchantProfileRequest.submitted_at.desc()).limit(10)).all()],
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
                         "sold30d": sold30.get(p["id"], 0)} for p in owned],
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
        for field in ("status", "plan", "commissionPct", "marketplaceEnabled", "verified"):
            value = getattr(payload, field)
            if value is not None:
                updated[field] = value
        put_row(db, "merchant", found["slug"], updated)
        audit(db, "admin", staff.email, "merchant.update", found["slug"], f"status={updated.get('status')}")
        db.commit()
        return {"merchant": _merchant_row(db, updated)}


@router.post("/merchant/profile-request/decision")
def decide_merchant_profile_request(
    session: Optional[str] = Header(None, alias="X-Ferix-Session"),
    payload: MerchantProfileDecisionIn = Body(...),
):
    with SessionLocal() as db:
        staff = require_staff(db, session, "admin")
        require_permission(staff, "merchant.approve")
        request = db.get(MerchantProfileRequest, payload.id)
        if not request or request.status != "pending_review":
            raise HTTPException(404, "Pending profile request not found")
        decision = payload.decision.strip().lower()
        if decision not in {"approve", "changes", "reject"}:
            raise HTTPException(400, "Decision must be approve, changes, or reject")
        note = (payload.note or "").strip()
        if decision in {"changes", "reject"} and not note:
            raise HTTPException(422, "Add a note so the seller knows what to change")
        merchant = find_merchant(db, request.merchant_id)
        if not merchant:
            raise HTTPException(404, "Seller account no longer exists")
        if decision == "approve":
            before_name = merchant.get("name")
            updated = {**merchant, **(request.profile or {})}
            put_row(db, "merchant", merchant["slug"], updated)
            if updated.get("name") != before_name:
                for product in seller_products(db, merchant["id"]):
                    product["merchantName"] = updated["name"]
                    put_row(db, "product", product["slug"], product)
            request.status = "approved"
        elif decision == "changes":
            request.status = "changes_requested"
        else:
            request.status = "rejected"
        request.note = note
        request.reviewed_by = staff.email
        request.reviewed_at = now()
        audit(db, "admin", staff.email, f"merchant.profile.{decision}", merchant["slug"], note or "Profile approved")
        db.commit()
        return {"request": {"id": request.id, "status": request.status, "note": request.note}}


@router.get("/merchant/profile-requests")
def pending_merchant_profile_requests(session: Optional[str] = Header(None, alias="X-Ferix-Session")):
    """List only pending seller profile snapshots for the dedicated Admin queue."""
    with SessionLocal() as db:
        staff = require_staff(db, session, "admin")
        require_permission(staff, "merchant.approve")
        requests = db.scalars(
            select(MerchantProfileRequest)
            .where(MerchantProfileRequest.status == "pending_review")
            .order_by(MerchantProfileRequest.submitted_at.asc())
        ).all()
        profile_fields = (
            "name", "tagline", "about", "location", "logo", "businessName", "businessEmail", "businessPhone",
            "addressLine1", "addressLine2", "city", "region", "postalCode", "country", "website",
            "showBusinessEmail", "showPhone",
        )
        items = []
        for request in requests:
            merchant = find_merchant(db, request.merchant_id)
            if not merchant:
                continue
            items.append({
                "merchantId": merchant["id"], "merchantName": merchant.get("name", "Seller"),
                "merchantSlug": merchant.get("slug", ""),
                "currentProfile": {key: merchant.get(key, "") for key in profile_fields},
                "request": {
                    "id": request.id, "profile": request.profile or {}, "status": request.status,
                    "note": request.note or "", "submittedBy": request.submitted_by,
                    "submittedAt": iso(request.submitted_at), "reviewedBy": request.reviewed_by,
                    "reviewedAt": iso(request.reviewed_at) if request.reviewed_at else None,
                },
            })
        return {"items": items, "total": len(items)}


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
        orders = [_order_row(db, r) for r in db.scalars(select(Order).where(Order.user_id == id)).all()
                  if str((r.data or {}).get("channel") or "").lower() == "marketplace"]
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
        rows = [_order_row(db, r) for r in db.scalars(select(Order).order_by(Order.placed_at.desc())).all()
                if str((r.data or {}).get("channel") or "").lower() == "marketplace"]
        counts: dict[str, int] = {"all": len(rows)}
        for row in rows:
            counts[row["fulfillment"]] = counts.get(row["fulfillment"], 0) + 1
        counts["paid"] = sum(o.get("payment") in PAID_PAYMENT_STATES for o in rows)
        counts["refunded"] = sum(o.get("payment") == "refunded" for o in rows)
        filtered = rows
        if search:
            q = search.lower()
            filtered = [o for o in filtered if q in o["number"].lower() or q in o["customer"]["name"].lower()
                        or q in o["merchantName"].lower()]
        if status and status != "all":
            filtered = [o for o in filtered if o["fulfillment"] == status]
        if channel and channel not in {"all", "marketplace"}:
            raise HTTPException(400, "The Admin order console covers Ferixas marketplace orders only.")
        if merchant and merchant != "all":
            filtered = [o for o in filtered if o["merchantId"] == merchant]
        return {"orders": filtered, "total": len(filtered), "counts": counts,
                "gmv": round(sum(o["total"] for o in filtered if o.get("payment") in PAID_PAYMENT_STATES
                                 and o.get("fulfillment") != "cancelled"), 2),
                "commission": round(sum(o["commission"] for o in filtered if o.get("payment") in PAID_PAYMENT_STATES
                                         and o.get("fulfillment") != "cancelled"), 2),
                "merchants": sorted({(o["merchantId"], o["merchantName"]) for o in rows} - {("", "")},
                                    key=lambda pair: pair[1]) and [{"id": i, "name": n} for i, n in sorted({(o["merchantId"], o["merchantName"]) for o in rows}, key=lambda p: p[1])]}


# ── Analytics ──────────────────────────────────────────────────────────────

@router.get("/analytics")
def analytics(session: Optional[str] = Header(None, alias="X-Ferix-Session"), days: int = 30):
    with SessionLocal() as db:
        require_staff(db, session, "admin")
        merchants = [_merchant_row(db, m) for m in all_merchants(db)]
        orders = [_order_row(db, r) for r in db.scalars(select(Order)).all()
                  if str((r.data or {}).get("channel") or "").lower() == "marketplace"]
        paid_orders = [o for o in orders if o.get("payment") in PAID_PAYMENT_STATES
                       and o.get("fulfillment") != "cancelled"]
        products = all_products(db)
        official_products = [p for p in products if is_platform_product(p)]
        marketplace_listings = [p for p in products if marketplace_product_available(db, p)]
        span = max(7, min(180, days))
        sold_units = _order_product_units(paid_orders)

        series = []
        from datetime import date as _date_t
        today = now().date()
        for offset in range(span - 1, -1, -1):
            day = (today - timedelta(days=offset)).isoformat()
            rows = [o for o in paid_orders if _date(o["placedAt"]) == day]
            series.append({"date": day, "gmv": round(sum(o["total"] for o in rows), 2),
                           "commission": round(sum(o["commission"] for o in rows), 2),
                           "orders": len(rows)})

        gmv = round(sum(o["total"] for o in paid_orders), 2)
        commission = round(sum(o["commission"] for o in paid_orders), 2)
        by_category: dict[str, float] = {}
        for order in paid_orders:
            for item in order["items"]:
                product = next((p for p in products if p["id"] == item.get("productId")), None)
                key = (product or {}).get("category", "other")
                by_category[key] = round(by_category.get(key, 0) + item.get("price", 0) * item.get("qty", 0), 2)

        product_sales: dict[str, dict] = {}
        for order in paid_orders:
            if _days_between(order.get("placedAt", "")) >= 30:
                continue
            for item in order.get("items", []):
                product_id = str(item.get("productId", ""))
                if not product_id:
                    continue
                record = product_sales.setdefault(product_id, {"sold30d": 0, "revenue": 0.0})
                try:
                    quantity = max(0, int(item.get("qty", 0)))
                    line_price = float(item.get("price", 0) or 0)
                except (TypeError, ValueError):
                    continue
                record["sold30d"] += quantity
                record["revenue"] = round(record["revenue"] + line_price * quantity, 2)
        product_by_id = {product["id"]: product for product in products}
        top_products = []
        for product_id, sales in product_sales.items():
            product = product_by_id.get(product_id)
            if not product:
                continue
            top_products.append({"id": product_id, "slug": product.get("slug", ""), "title": product.get("title", ""),
                                 "merchantName": product.get("merchantName", ""), "sold30d": sales["sold30d"],
                                 "price": product.get("price", 0), "revenue": sales["revenue"]})

        return {
            "series": series,
            "totals": {
                "gmv": gmv, "commission": commission, "merchantNet": round(gmv - commission, 2),
                "orders": len(paid_orders),
                "averageOrder": round(gmv / len(paid_orders), 2) if paid_orders else 0.0,
                "deliveredRate": round((sum(o["fulfillment"] == "delivered" for o in paid_orders) / len(paid_orders) * 100) if paid_orders else 0, 1),
                "merchants": len(merchants), "activeMerchants": sum(m["status"] == "active" for m in merchants),
                "reviewMerchants": sum(m["status"] == "review" for m in merchants),
                "suspendedMerchants": sum(m["status"] == "suspended" for m in merchants),
                "products": len(official_products),
                "marketplaceListings": len(marketplace_listings),
                "soldUnits": sum(sold_units.values()),
            },
            "byMerchant": sorted([{"id": m["id"], "name": m["name"], "slug": m["slug"], "gmv": m["gmv"],
                                   "commission": m["commission"], "orders": m["orders"]} for m in merchants],
                                 key=lambda m: -m["gmv"]),
            "byChannel": {"marketplace": gmv},
            "byCategory": [{"category": k, "name": k.title(), "revenue": v} for k, v in sorted(by_category.items(), key=lambda kv: -kv[1])],
            "topProducts": sorted(top_products, key=lambda product: -product["revenue"])[:10],
            "plans": [{"plan": plan, "merchants": sum(m["plan"] == plan for m in merchants)}
                      for plan in sorted({m["plan"] for m in merchants})],
        }


# ── Settings ───────────────────────────────────────────────────────────────

@router.get("/settings")
def settings(session: Optional[str] = Header(None, alias="X-Ferix-Session")):
    with SessionLocal() as db:
        staff = require_staff(db, session, "admin")

        require_permission(staff, "settings.manage")
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
        scope = (owner or "official").strip().lower()
        if scope != "official":
            raise HTTPException(400, "The platform catalogue contains Ferixas Official products only. Use seller review or merchant records for seller-owned listings.")
        rows = [p for p in all_products(db) if is_platform_product(p)]
        order_rows = [_order_row(db, row) for row in db.scalars(select(Order)).all()]
        sold30 = _order_product_units(order_rows, days=30)
        counts = {"all": len(rows), "official": len(rows)}
        for row in rows:
            counts[row.get("status", "active")] = counts.get(row.get("status", "active"), 0) + 1
        filtered = rows
        if search:
            q = search.lower()
            filtered = [p for p in filtered if q in p["title"].lower() or q in p.get("sku", "").lower()]
        if category and category != "all":
            filtered = [p for p in filtered if p.get("category") == category]
        if status and status != "all":
            filtered = [p for p in filtered if p.get("status") == status]
        return {
            "products": [{"id": p["id"], "slug": p["slug"], "title": p["title"], "sku": p.get("sku", ""),
                          "price": p.get("price", 0), "compareAt": p.get("compareAt"), "stock": p.get("stock", 0),
                          "status": p.get("status", "active"), "category": p.get("category", ""),
                          "merchantId": p.get("merchantId", ""), "merchantName": p.get("merchantName", ""),
                          "image": (p.get("images") or [placeholder(p["slug"])])[0],
                          "channels": p.get("channels") or {}, "featured": p.get("featured", False),
                          "collections": p.get("collections", []), "sold30d": sold30.get(p["id"], 0),
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
        is_platform = (owner_id == "ferixas-official")
        owner = find_merchant(db, owner_id)
        if not owner and is_platform:
            owner = {"id": "ferixas-official", "name": "Ferixas Official", "slug": "ferixas-official"}
        if not owner:
            raise HTTPException(404, "Choose an existing seller for this product")
        price = float(payload.get("price") or 0)
        
        # Seller-owned catalog records always enter the same admin review gate,
        # including products created on a seller's behalf by an operator.
        origin = "platform" if is_platform else "seller"
        default_status = "draft" if is_platform else "pending_review"
        
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
            "variants": payload.get("variants") or [], "status": (payload.get("status") or default_status) if is_platform else "pending_review",
            "reviewStatus": "in_review" if not is_platform else None,
            "channels": {"store": bool(payload.get("store", True)) if is_platform else False,
                         "marketplace": bool(payload.get("marketplace", True)) if is_platform else True},
            "featured": bool(payload.get("featured")),
            "createdAt": iso(now()), "updatedAt": iso(now()), "sold30d": 0, "views30d": 0,
            "seoTitle": payload.get("seoTitle") or title,
            "seoDescription": payload.get("seoDescription") or (payload.get("description") or "")[:155],
            "origin": origin,
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
        if not is_platform_product(target):
            raise HTTPException(403, "Seller-owned products must be managed through the seller review workflow.")
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
        if not is_platform_product(target):
            raise HTTPException(403, "Seller-owned products cannot be removed from the platform catalogue.")
        drop_row(db, "product", target["slug"])
        audit(db, "admin", staff.email, "catalog.delete", target["slug"], target.get("title", ""))
        db.commit()
        return {"removed": target["id"]}


# ── Product Approval Workflow ──────────────────────────────────────────────

@router.get("/catalog/products/pending")
def pending_review_queue(session: Optional[str] = Header(None, alias="X-Ferix-Session")):
    """Get all products awaiting admin review."""
    with SessionLocal() as db:
        staff = require_staff(db, session, "admin")
        require_permission(staff, "merchant.approve")
        from core import pending_products
        pending = pending_products(db)
        return {
            "products": [{
                "id": p["id"], "slug": p["slug"], "title": p["title"],
                "merchantId": p.get("merchantId", ""), "merchantName": p.get("merchantName", ""),
                "category": p.get("category", ""), "price": p.get("price", 0),
                "stock": p.get("stock", 0), "sku": p.get("sku", ""),
                "image": (p.get("images") or [placeholder(p["slug"])])[0],
                "channels": p.get("channels") or {},
                "shipping_amount": p.get("shipping_amount"),
                "estimated_delivery_days": p.get("estimated_delivery_days"),
                "section_tags": p.get("section_tags", []),
                "createdAt": p.get("createdAt", ""),
                "updatedAt": p.get("updatedAt", ""),
            } for p in pending],
            "total": len(pending),
        }


@router.patch("/catalog/products/approve", deprecated=True)
def approve_product(session: Optional[str] = Header(None, alias="X-Ferix-Session"), payload: dict = Body(...)):
    """Block the old approval shortcut; all submissions use the review decision workflow."""
    with SessionLocal() as db:
        staff = require_staff(db, session, "admin")
        require_permission(staff, "merchant.approve")
        raise HTTPException(410, "Use /admin/review/decision so seller ownership and publication rules are enforced.")


@router.patch("/catalog/products/reject", deprecated=True)
def reject_product(session: Optional[str] = Header(None, alias="X-Ferix-Session"), payload: dict = Body(...)):
    """Block the old moderation shortcut; all submissions use the review decision workflow."""
    with SessionLocal() as db:
        staff = require_staff(db, session, "admin")
        require_permission(staff, "merchant.approve")
        raise HTTPException(410, "Use /admin/review/decision so seller ownership and publication rules are enforced.")


# ── Review Queue API (consumed by WebPhase/admin) ─────────────────────────────

@router.get("/review/queue")
def review_queue(session: Optional[str] = Header(None, alias="X-Ferix-Session")):
    """Get the admin review queue for all pending seller submissions."""
    with SessionLocal() as db:
        staff = require_staff(db, session, "admin")
        require_permission(staff, "merchant.approve")
        from core import pending_products
        pending = pending_products(db)
        return {
            "items": [{
                "id": p["id"], "slug": p["slug"], "title": p["title"],
                "merchantId": p.get("merchantId", ""),
                "merchantName": p.get("merchantName", ""),
                "price": p.get("price", 0), "stock": p.get("stock", 0),
                "compareAt": p.get("compareAt"), "description": p.get("description", ""),
                "bullets": p.get("bullets", []), "tags": p.get("tags", []),
                "variants": p.get("variants", []), "images": p.get("images", []),
                "collections": p.get("collections", []),
                "seoTitle": p.get("seoTitle", ""), "seoDescription": p.get("seoDescription", ""),
                "category": p.get("category", ""),
                "brandName": p.get("brandName") or "",
                "image": (p.get("images") or [placeholder(p["slug"])])[0],
                "channels": p.get("channels") or {},
                "shipping_amount": p.get("shipping_amount"),
                "estimated_delivery_days": p.get("estimated_delivery_days"),
                "package_weight": p.get("package_weight"),
                "package_dimensions": p.get("package_dimensions"),
                "shipping_origin": p.get("shipping_origin"),
                "section_tags": p.get("section_tags", []),
                "status": p.get("status", "pending_review"),
                "createdAt": p.get("createdAt", ""),
                "reviewStatus": p.get("reviewStatus") or "in_review",
                "reviewNote": p.get("reviewNote") or "",
                "section_tags": p.get("section_tags") or [],
                "submittedAt": p.get("submittedAt") or "",
                "submittedBy": p.get("submittedBy") or "",
            } for p in pending],
            "counts": {
                "pending_review": sum(p.get("status") == "pending_review" for p in pending),
                "all": len(pending),
            },
        }


@router.post("/review/decision")
def review_decision(session: Optional[str] = Header(None, alias="X-Ferix-Session"), payload: dict = Body(...)):
    """Approve, ask for changes, or reject a pending product."""
    with SessionLocal() as db:
        staff = require_staff(db, session, "admin")
        require_permission(staff, "merchant.approve")
        product_id = str(payload.get("id") or "")
        decision = str(payload.get("decision") or "").strip()
        note = str(payload.get("note") or "").strip()
        placement = payload.get("placement")
        
        if not product_id:
            raise HTTPException(400, "Which product?")
        if decision not in ("approve", "changes", "reject"):
            raise HTTPException(400, "Unrecognised decision")
        
        target = find_product(db, product_id)
        if not target:
            raise HTTPException(404, "Product not found")
        if not is_seller_marketplace_product(target):
            raise HTTPException(409, "Only seller-owned Ferixas marketplace submissions can enter this review workflow.")
        if target.get("status") != "pending_review":
            raise HTTPException(409, "Product is no longer pending review")
        
        updated = dict(target)
        if decision == "approve":
            updated["status"] = "approved"
            updated["reviewStatus"] = "approved"
            updated["reviewNote"] = ""
            updated.pop("rejection_reason", None)
            updated.pop("rejectionReason", None)
            if placement:
                updated["section_tags"] = updated.get("section_tags", []) or []
                if placement not in updated["section_tags"]:
                    updated["section_tags"].append(placement)
            from core import ContentDocument, SectionPlacement
            for request in updated.get("section_tags") or []:
                if "__" not in request:
                    continue
                document_id, section_id = request.split("__", 1)
                document = db.get(ContentDocument, document_id)
                if not document or document.owner_type != "platform":
                    continue
                section = next((item for item in (document.data or {}).get("sections", [])
                                if item.get("id") == section_id
                                and item.get("type") in ("product_grid", "product_carousel")
                                and item.get("visible", True)), None)
                if not section:
                    continue
                existing = db.scalar(select(SectionPlacement).where(
                    SectionPlacement.product_id == target["id"],
                    SectionPlacement.document_id == document_id,
                    SectionPlacement.section_id == section_id,
                ))
                if not existing:
                    db.add(SectionPlacement(
                        id=new_id("plc"), product_id=target["id"], product_slug=target["slug"],
                        document_id=document_id, section_id=section_id, section_type=section.get("type", ""),
                        price=float(target.get("price") or 0), compare_at=float(target.get("compareAt") or 0),
                        quantity=int(target.get("stock") or 0), position=1,
                    ))
        elif decision == "changes":
            updated["reviewStatus"] = "changes_requested"
            updated["reviewNote"] = note
            # stays pending_review so it stays out of the shop
        else:
            updated["status"] = "rejected"
            updated["rejectionReason"] = note or "Admin rejected"
            updated["rejection_reason"] = note or "Admin rejected"
            updated["reviewStatus"] = "rejected"
        
        updated["updatedAt"] = iso(now())
        put_row(db, "product", target["slug"], updated)
        audit(db, "admin", staff.email, f"product.{decision}", target["slug"], note or f"Decision: {decision}")
        db.commit()
        
        return {"product": updated}


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
            "showText": payload.showText if payload.showText is not None else existing.get("showText", True),
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


# ── Brands (CMS) ────────────────────────────────────────────────────────────

@router.get("/cms/brands")
def cms_brands(session: Optional[str] = Header(None, alias="X-Ferix-Session")):
    with SessionLocal() as db:
        staff = require_staff(db, session, "admin")
        require_permission(staff, "cms.manage")
        rows = sorted(rows_of(db, "brand"), key=lambda b: (int(b.get("position", 0)), str(b.get("name", "")).lower()))
        return {"brands": rows}


@router.post("/cms/brand")
def cms_brand_create(session: Optional[str] = Header(None, alias="X-Ferix-Session"), payload: BrandCreate = Body(...)):
    with SessionLocal() as db:
        staff = require_staff(db, session, "admin")
        require_permission(staff, "cms.manage")
        row = _brand_fields(payload.model_dump())
        row["id"] = new_id("brd")
        _assert_unique_brand_slug(db, row["slug"])
        put_row(db, "brand", row["slug"], row)
        audit(db, "admin", staff.email, "brand.create", row["id"], row["name"])
        db.commit()
        return {"brand": row}


@router.patch("/cms/brand")
def cms_brand_update(session: Optional[str] = Header(None, alias="X-Ferix-Session"), payload: BrandPatch = Body(...)):
    with SessionLocal() as db:
        staff = require_staff(db, session, "admin")
        require_permission(staff, "cms.manage")
        existing = _brand_by_id(db, payload.id)
        if not existing:
            raise HTTPException(404, "Brand not found")
        values = {key: value for key, value in payload.model_dump().items() if key != "id" and value is not None}
        row = _brand_fields({**existing, **values, "id": existing["id"]}, existing)
        _assert_unique_brand_slug(db, row["slug"], row["id"])
        if row["slug"] != existing.get("slug"):
            drop_row(db, "brand", existing["slug"])
        put_row(db, "brand", row["slug"], row)
        audit(db, "admin", staff.email, "brand.update", row["id"], row["name"])
        db.commit()
        return {"brand": row}


@router.delete("/cms/brand")
def cms_brand_delete(session: Optional[str] = Header(None, alias="X-Ferix-Session"), payload: dict = Body(...)):
    with SessionLocal() as db:
        staff = require_staff(db, session, "admin")
        require_permission(staff, "cms.manage")
        existing = _brand_by_id(db, str(payload.get("id") or ""))
        if not existing:
            raise HTTPException(404, "Brand not found")
        drop_row(db, "brand", existing["slug"])
        audit(db, "admin", staff.email, "brand.delete", existing["id"], existing["name"])
        db.commit()
        return {"removed": existing["id"]}


# ── Content documents (CMS) ────────────────────────────────────────────────

def _document_json(doc: ContentDocument) -> dict:
    return {"id": doc.id, "ownerType": doc.owner_type, "ownerId": doc.owner_id,
            "documentType": doc.document_type, "title": doc.title, "status": doc.status,
            "data": doc.data, "updatedAt": iso(doc.updated_at), "updatedBy": doc.updated_by}


def _cms_draft(db, document_id: str):
    return db.scalar(select(ContentVersion).where(
        ContentVersion.document_id == document_id, ContentVersion.status == "draft",
    ).order_by(ContentVersion.version.desc()))


def _merge_cms_data(previous: dict, incoming: dict) -> dict:
    """Merge section payloads by ID so controls hidden by an editor survive saves."""
    result = dict(previous or {})
    for key, value in (incoming or {}).items():
        if key == "sections" and isinstance(value, list):
            existing = {str(section.get("id")): section for section in (result.get("sections") or [])
                        if isinstance(section, dict) and section.get("id") is not None}
            result[key] = [{**existing.get(str(section.get("id")), {}), **section}
                           for section in value if isinstance(section, dict)]
        elif isinstance(value, dict) and isinstance(result.get(key), dict):
            result[key] = {**result[key], **value}
        else:
            result[key] = value
    return result


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
        document_data = _document_json(doc)
        draft = _cms_draft(db, doc.id)
        if draft is not None:
            document_data["data"] = draft.data or {}
            document_data["draftStatus"] = "draft"
        db.commit()
        return {"document": document_data,
                "versions": [{"id": v.id, "version": v.version, "status": v.status, "note": v.note,
                              "createdBy": v.created_by, "createdAt": iso(v.created_at)} for v in versions]}


@router.patch("/cms/document")
def cms_save_document(session: Optional[str] = Header(None, alias="X-Ferix-Session"), payload: DocumentIn = Body(...)):
    with SessionLocal() as db:
        staff = require_staff(db, session, "admin")
        require_permission(staff, "cms.manage")
        doc = _ensure_document(db, payload.id)
        draft = _cms_draft(db, doc.id)
        base_data = (draft.data if draft is not None else doc.data) or {}
        draft_data = _merge_cms_data(base_data, payload.data or {})
        for previous_draft in db.scalars(select(ContentVersion).where(
            ContentVersion.document_id == doc.id, ContentVersion.status == "draft",
        )).all():
            previous_draft.status = "superseded"
        doc.updated_at = now()
        doc.updated_by = staff.email
        version = len(db.scalars(select(ContentVersion).where(ContentVersion.document_id == doc.id)).all()) + 1
        db.add(ContentVersion(id=new_id("ver"), document_id=doc.id, version=version,
                              status="draft", data=draft_data, note=payload.note or "Saved as draft",
                              created_by=staff.email))
        audit(db, "admin", staff.email, "cms.save", doc.id, "draft")
        db.commit()
        document_data = _document_json(doc)
        document_data["data"] = draft_data
        document_data["draftStatus"] = "draft"
        return {"document": document_data}


@router.post("/cms/document/publish")
def cms_publish(session: Optional[str] = Header(None, alias="X-Ferix-Session"), payload: dict = Body(...)):
    with SessionLocal() as db:
        staff = require_staff(db, session, "admin")
        require_permission(staff, "cms.manage")
        doc = _ensure_document(db, str(payload.get("id")))
        draft = _cms_draft(db, doc.id)
        if draft is not None:
            doc.data = draft.data or {}
        for previous_draft in db.scalars(select(ContentVersion).where(
            ContentVersion.document_id == doc.id, ContentVersion.status == "draft",
        )).all():
            previous_draft.status = "published" if previous_draft is draft else "superseded"
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
        restored_data = version.data or {}
        doc.updated_at = now()
        doc.updated_by = staff.email
        for previous_draft in db.scalars(select(ContentVersion).where(
            ContentVersion.document_id == doc.id, ContentVersion.status == "draft",
        )).all():
            previous_draft.status = "superseded"
        db.add(ContentVersion(id=new_id("ver"), document_id=doc.id,
                              version=len(db.scalars(select(ContentVersion).where(ContentVersion.document_id == doc.id)).all()) + 1,
                              status="draft", data=restored_data,
                              note=f"Restored v{version.version}", created_by=staff.email))
        audit(db, "admin", staff.email, "cms.restore", doc.id, f"v{version.version}")
        db.commit()
        document_data = _document_json(doc)
        document_data["data"] = restored_data
        document_data["draftStatus"] = "draft"
        return {"document": document_data}


# ── Media library ──────────────────────────────────────────────────────────

@router.get("/media")
def media(session: Optional[str] = Header(None, alias="X-Ferix-Session")):
    with SessionLocal() as db:
        require_staff(db, session, "admin")
        sync_pending_media(db)
        rows = db.scalars(select(MediaAsset).where(MediaAsset.owner_type == "platform").order_by(MediaAsset.created_at.desc())).all()
        return {"assets": [media_json(m) for m in rows],
                "storage": storage_info()["provider"], "storageInfo": storage_info()}


@router.post("/media")
def add_media(session: Optional[str] = Header(None, alias="X-Ferix-Session"), payload: MediaIn = Body(...)):
    with SessionLocal() as db:
        staff = require_staff(db, session, "admin")
        require_permission(staff, "media.manage")
        if payload.kind not in {"image", "video"}:
            raise HTTPException(422, "Media kind must be image or video")
        asset = MediaAsset(id=new_id("med"), owner_type="platform", owner_id="platform",
                           kind=payload.kind, url=payload.url, alt=payload.alt, folder=payload.folder,
                           public_id=payload.publicId, width=payload.width, height=payload.height)
        db.add(asset)
        audit(db, "admin", staff.email, "media.add", payload.folder, payload.url[:120])
        db.commit()
        return {"asset": media_json(asset)}


@router.post("/media/upload")
async def upload_media(
    request: Request,
    session: Optional[str] = Query(None),
    x_session: Optional[str] = Header(None, alias="X-Ferix-Session"),
    file: UploadFile = File(...),
    kind: str = Form("image"),
    alt: str = Form(""),
    folder: str = Form("platform"),
):
    """Local-disk upload fallback for MVP deployments without Cloudinary."""
    with SessionLocal() as db:
        staff = require_staff(db, session or x_session, "admin")
        require_permission(staff, "media.manage")
        if kind not in {"image", "video"}:
            raise HTTPException(422, "Upload kind must be image or video")
        content = await file.read(20 * 1024 * 1024 + 1)
        if not content or len(content) > 20 * 1024 * 1024:
            raise HTTPException(400, "Upload must be between 1 byte and 20 MB")
        validate_media_upload(content, file.filename or "asset", kind)
        url, public_id, storage = upload_media_blob(content, file.filename or "asset", kind)
        if url.startswith("/"):
            url = f"{str(request.base_url).rstrip('/')}{url}"
        asset = MediaAsset(
            id=new_id("med"), owner_type="platform", owner_id="platform",
            kind=kind, url=url,
            public_id=public_id, alt=alt[:300], folder=folder[:80], bytes=len(content),
        )
        db.add(asset)
        audit(db, "admin", staff.email, "media.upload", folder, public_id)
        db.commit()
        return {"asset": media_json(asset), "storage": storage, "storageInfo": storage_info(storage)}


@router.delete("/media")
def remove_media(session: Optional[str] = Header(None, alias="X-Ferix-Session"), payload: dict = Body(...)):
    with SessionLocal() as db:
        staff = require_staff(db, session, "admin")
        require_permission(staff, "media.manage")
        asset = db.get(MediaAsset, str(payload.get("id")))
        if not asset:
            raise HTTPException(404, "Media not found")
        cleanup = remove_media_blob(asset)
        db.delete(asset)
        db.commit()
        return {"removed": str(payload.get("id")), "cleanup": cleanup}


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
        orders = [_order_row(db, r) for r in db.scalars(select(Order).order_by(Order.placed_at.desc())).all()
                  if str((r.data or {}).get("channel") or "").lower() == "marketplace"]
        paid_orders = [o for o in orders if o.get("payment") in PAID_PAYMENT_STATES
                       and o.get("fulfillment") != "cancelled"]
        gross = round(sum(o["total"] for o in paid_orders), 2)
        commission = round(sum(o["commission"] for o in paid_orders), 2)
        return {
            "transactions": [{"id": f"txn_{o['id']}", "orderId": o["id"], "number": o["number"],
                              "placedAt": o["placedAt"], "merchantId": o["merchantId"],
                              "merchantName": o["merchantName"], "customer": o["customer"]["name"],
                              "amount": o["total"], "commission": o["commission"], "channel": o["channel"],
                              "status": o["payment"], "method": "Not connected"} for o in paid_orders],
            "totals": {"gross": gross, "commission": commission, "merchantNet": round(gross - commission, 2),
                       "refunds": 0.0, "net": gross,
                       "authorized": 0.0,
                       "settled": round(sum(o["total"] for o in paid_orders if o["payment"] == "settled"), 2)},
            "provider": "pending-configuration",
            "message": "The payment provider is not connected. Amounts reflect recorded paid marketplace states only; this console does not initiate charges, refunds or transfers.",
        }


@router.get("/payouts")
def payouts(session: Optional[str] = Header(None, alias="X-Ferix-Session")):
    with SessionLocal() as db:
        staff = require_staff(db, session, "admin")

        require_permission(staff, "payouts.view")
        stored = db.scalars(select(Payout)).all()
        rows = [{"id": p.id, "merchantId": p.merchant_id,
                 "merchantName": (find_merchant(db, p.merchant_id) or {}).get("name", p.merchant_id),
                 "period": p.period, "orders": p.orders, "gross": p.gross, "commission": p.commission,
                 "net": p.net, "status": p.status, "date": p.date, "method": p.method} for p in stored]
        return {"payouts": rows,
                "totals": {"pending": round(sum(r["net"] for r in rows if r["status"] == "pending"), 2),
                           "paid": round(sum(r["net"] for r in rows if r["status"] == "paid"), 2),
                           "gross": round(sum(r["gross"] for r in rows), 2),
                           "commission": round(sum(r["commission"] for r in rows), 2)},
                "message": "No payout estimates are generated from orders. A connected payout provider is required to confirm transfers or mark a payout paid."}


@router.patch("/payouts")
def update_payout(session: Optional[str] = Header(None, alias="X-Ferix-Session"), payload: PayoutPatch = Body(...)):
    with SessionLocal() as db:
        staff = require_staff(db, session, "admin")
        require_permission(staff, "payouts.view")
        raise HTTPException(409, "Payout updates require a verified payout-provider flow. No payout record was changed.")


# ── Roles, staff and audit ─────────────────────────────────────────────────

@router.get("/staff")
def staff_list(session: Optional[str] = Header(None, alias="X-Ferix-Session")):
    with SessionLocal() as db:
        staff = require_staff(db, session, "admin")

        require_permission(staff, "settings.manage")
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

# ── CMS: pages of sections ─────────────────────────────────────────────────
# The storefront is a document per page, and each document holds an ordered list
# of sections. These four endpoints are what the CMS reads and writes: the pages
# list, one page with its sections, a save that only ever writes a draft, and a
# publish that is the single moment a shopper can see a change.


class CmsPageIn(BaseModel):
    id: str
    title: Optional[str] = None
    sections: Optional[list] = None


def _section_summary(section: dict, index: int) -> dict:
    return {
        "id": section.get("id"),
        "name": section.get("name") or section.get("type") or "",
        "type": section.get("type"),
        "position": section.get("position", index + 1),
        "visible": bool(section.get("visible", True)),
    }


def _ordered_sections(document) -> list:
    sections = (document.data or {}).get("sections") or []
    return sorted(sections, key=lambda s: s.get("position", 0))


def _page_summary(document) -> dict:
    sections = _ordered_sections(document)
    return {
        "id": document.id,
        "title": document.title,
        "documentType": document.document_type,
        "status": document.status,
        "sectionCount": len(sections),
        "visibleCount": sum(1 for s in sections if s.get("visible", True)),
        "sections": [_section_summary(s, i) for i, s in enumerate(sections)],
    }


@router.get("/cms/pages")
def cms_pages(session: Optional[str] = Header(None, alias="X-Ferix-Session")):
    """Every storefront page, with the sections inside it."""
    from core import ContentDocument

    with SessionLocal() as db:
        staff = require_staff(db, session, "admin")
        require_permission(staff, "cms.manage")
        rows = db.scalars(select(ContentDocument)).all()
        pages = [_page_summary(d) for d in rows]
        pages.sort(key=lambda p: (p["documentType"] != "marketplace_home", p["title"] or ""))
        return {"pages": pages}


@router.get("/cms/page")
def cms_page(session: Optional[str] = Header(None, alias="X-Ferix-Session"), id: str = ""):
    """One page, with its sections exactly as the storefront will read them."""
    from core import ContentDocument

    with SessionLocal() as db:
        staff = require_staff(db, session, "admin")
        require_permission(staff, "cms.manage")
        document = db.get(ContentDocument, id)
        if not document:
            raise HTTPException(404, "That page does not exist")
        summary = _page_summary(document)
        # The editor shows the draft if there is one, because that is what the operator is
        # working on. The document is what the shop is reading meanwhile.
        draft = db.scalar(
            select(ContentVersion)
            .where(ContentVersion.document_id == id, ContentVersion.status == "draft")
            .order_by(ContentVersion.version.desc())
        )
        source = (draft.data if draft is not None else document.data) or {}
        summary["sections"] = sorted(source.get("sections") or [],
                                     key=lambda section: section.get("position", 0))
        return {"page": summary}


@router.patch("/cms/page")
def cms_page_save(session: Optional[str] = Header(None, alias="X-Ferix-Session"), payload: CmsPageIn = Body(...)):
    """Save a page as a draft. Nothing reaches a shopper until it is published."""
    from core import ContentDocument, ContentVersion

    with SessionLocal() as db:
        staff = require_staff(db, session, "admin")
        require_permission(staff, "cms.manage")
        document = db.get(ContentDocument, payload.id)
        if not document:
            raise HTTPException(404, "That page does not exist")

        current_draft = _cms_draft(db, document.id)
        data = dict((current_draft.data if current_draft is not None else document.data) or {})
        if payload.sections is not None:
            cleaned = []
            for index, section in enumerate(payload.sections):
                row = dict(section or {})
                row["position"] = index + 1
                row.setdefault("visible", True)
                cleaned.append(row)
            data = _merge_cms_data(data, {"sections": cleaned})
        if payload.title:
            document.title = payload.title
        # The draft goes to a version and NOT onto the document. The document is what the
        # storefront reads, and only a published one at that: writing the draft into it and
        # marking it a draft took the whole page off the shop the moment anyone pressed Save,
        # which is what emptied banners and promotions out of a live storefront.

        existing = db.scalars(
            select(ContentVersion.id).where(ContentVersion.document_id == document.id)
        ).all()
        for previous_draft in db.scalars(select(ContentVersion).where(
            ContentVersion.document_id == document.id, ContentVersion.status == "draft",
        )).all():
            previous_draft.status = "superseded"
        db.add(ContentVersion(id=new_id("ver"), document_id=document.id, version=len(existing) + 1,
                              status="draft", data=data, note="Edited in the CMS",
                              created_by=staff.email))
        audit(db, "admin", staff.email, "cms.page.save", document.id, staff.role)
        db.commit()
        summary = _page_summary(document)
        summary["sections"] = sorted(data.get("sections") or [], key=lambda section: section.get("position", 0))
        summary["draftStatus"] = "draft"
        return {"page": summary}


@router.post("/cms/page/publish")
def cms_page_publish(session: Optional[str] = Header(None, alias="X-Ferix-Session"), payload: CmsPageIn = Body(...)):
    """Publish the page the storefront reads, and record the version."""
    from core import ContentDocument, ContentVersion

    with SessionLocal() as db:
        staff = require_staff(db, session, "admin")
        require_permission(staff, "cms.manage")
        document = db.get(ContentDocument, payload.id)
        if not document:
            raise HTTPException(404, "That page does not exist")

        # Publishing is the moment the draft becomes the page. Until this runs the shop
        # keeps reading whatever the document already held.
        draft = db.scalar(
            select(ContentVersion)
            .where(ContentVersion.document_id == document.id, ContentVersion.status == "draft")
            .order_by(ContentVersion.version.desc())
        )
        if draft is not None and (draft.data or {}).get("sections") is not None:
            document.data = draft.data
        for previous_draft in db.scalars(select(ContentVersion).where(
            ContentVersion.document_id == document.id, ContentVersion.status == "draft",
        )).all():
            previous_draft.status = "published" if previous_draft is draft else "superseded"
        document.status = "published"

        existing = db.scalars(
            select(ContentVersion.id).where(ContentVersion.document_id == document.id)
        ).all()
        db.add(ContentVersion(id=new_id("ver"), document_id=document.id, version=len(existing) + 1,
                              status="published", data=document.data, note="Published",
                              created_by=staff.email))
        audit(db, "admin", staff.email, "cms.page.publish", document.id, staff.role)
        db.commit()
        return {"page": _page_summary(document)}

@router.post("/auth/refresh")
def auth_refresh(session: Optional[str] = Header(None, alias="X-Ferix-Session")):
    """Silently rotate the operator session. Nothing is extended: the new token carries
    the original expiry, so the session still ends seven days after signing in."""
    from core import refresh_staff_session

    with SessionLocal() as db:
        result = refresh_staff_session(db, session, "admin")
        if not result:
            raise HTTPException(401, "That session has ended. Please sign in again.")
        return {"token": result["token"], "expiresAt": iso(result["expiresAt"]),
                "role": result["staff"].role, "permissions": result["staff"].permissions}

# ── Advertisements ─────────────────────────────────────────────────────────
# A record type of its own, because an advert is not a banner: it has a sponsor,
# a placement and a run of dates.


class AdvertIn(BaseModel):
    id: Optional[str] = None
    name: Optional[str] = None
    headline: Optional[str] = None
    body: Optional[str] = None
    mediaUrl: Optional[str] = None
    kind: Optional[str] = None
    href: Optional[str] = None
    placement: Optional[str] = None
    sponsor: Optional[str] = None
    position: Optional[int] = None
    active: Optional[bool] = None
    startsAt: Optional[str] = None
    endsAt: Optional[str] = None


class AdvertRefIn(BaseModel):
    id: str


def _advert_running(advert: dict, stamp: str) -> bool:
    """Running means active and inside its own dates. ISO stamps compare as text."""
    if "active" in advert and not advert.get("active"):
        return False
    start = str(advert.get("startsAt") or "")
    end = str(advert.get("endsAt") or "")
    if start and start > stamp:
        return False
    if end and end < stamp:
        return False
    return True


@router.get("/cms/adverts")
def cms_adverts(session: Optional[str] = Header(None, alias="X-Ferix-Session")):
    """Every advertisement, and whether it is running right now."""
    with SessionLocal() as db:
        staff = require_staff(db, session, "admin")
        require_permission(staff, "cms.manage")
        stamp = iso(now())
        rows = sorted(rows_of(db, "advert"), key=lambda row: row.get("position", 0))
        items = [{**row, "running": _advert_running(row, stamp)} for row in rows]
        return {
            "adverts": items,
            "counts": {
                "total": len(items),
                "running": sum(1 for item in items if item["running"]),
                "explore": sum(1 for item in items if item.get("placement") == "explore"),
            },
        }


@router.post("/cms/advert")
def cms_advert_save(session: Optional[str] = Header(None, alias="X-Ferix-Session"),
                    payload: AdvertIn = Body(...)):
    """Create or change an advertisement."""
    with SessionLocal() as db:
        staff = require_staff(db, session, "admin")
        require_permission(staff, "cms.manage")

        advert_id = payload.id or new_id("adv")
        existing = next((row for row in rows_of(db, "advert") if row.get("id") == advert_id), {})
        sent = {key: value for key, value in payload.model_dump().items() if value is not None}
        body = {**existing, **sent, "id": advert_id}
        body.setdefault("active", True)
        body.setdefault("placement", "explore")
        put_row(db, "advert", advert_id, body)
        audit(db, "admin", staff.email, "cms.advert.save", advert_id, staff.role)
        db.commit()
        return {"advert": body}


@router.delete("/cms/advert")
def cms_advert_remove(session: Optional[str] = Header(None, alias="X-Ferix-Session"),
                      payload: AdvertRefIn = Body(...)):
    """Take an advertisement out for good."""
    with SessionLocal() as db:
        staff = require_staff(db, session, "admin")
        require_permission(staff, "cms.manage")
        existing = next((row for row in rows_of(db, "advert") if row.get("id") == payload.id), None)
        if not existing:
            raise HTTPException(404, "That advertisement does not exist")
        drop_row(db, "advert", payload.id)
        audit(db, "admin", staff.email, "cms.advert.delete", payload.id, staff.role)
        db.commit()
        return {"removed": payload.id}

# ── Placing a product in a section ─────────────────────────────────────────
# The form that uploads a product lists the sections it can go into, and each one
# asks its own questions. That is what these three calls store and return.


class PlacementIn(BaseModel):
    productId: Optional[str] = None
    slug: Optional[str] = None
    documentId: str
    sectionId: str
    sectionType: Optional[str] = None
    price: Optional[float] = None
    compareAt: Optional[float] = None
    quantity: Optional[int] = None
    position: Optional[int] = None
    startsAt: Optional[str] = None
    endsAt: Optional[str] = None
    config: Optional[dict] = None


class PlacementRefIn(BaseModel):
    id: str


def _placement_json(row) -> dict:
    return {
        "id": row.id, "productId": row.product_id, "slug": row.product_slug,
        "documentId": row.document_id, "sectionId": row.section_id,
        "sectionType": row.section_type, "price": row.price, "compareAt": row.compare_at,
        "quantity": row.quantity, "position": row.position,
        "startsAt": iso(row.starts_at) if row.starts_at else None,
        "endsAt": iso(row.ends_at) if row.ends_at else None,
        "config": row.config or {},
    }


@router.get("/product/sections")
def product_sections(session: Optional[str] = Header(None, alias="X-Ferix-Session"),
                     slug: str = Query(...)):
    """Where one product sits, and every section it could sit in.

    The second half is what the upload form needs: every section in the CMS that
    can hold a product, with the section it belongs to and what it already has.
    """
    from core import ContentDocument, SectionPlacement

    with SessionLocal() as db:
        staff = require_staff(db, session, "admin")
        require_permission(staff, "catalog.manage")

        placements = [_placement_json(row) for row in db.scalars(
            select(SectionPlacement).where(SectionPlacement.product_slug == slug)).all()]

        available = []
        for document in db.scalars(select(ContentDocument)).all():
            for section in (document.data or {}).get("sections", []):
                if section.get("type") not in ("product_carousel", "product_grid", "featured_stores"):
                    continue
                used = [p for p in placements if p["sectionId"] == section.get("id")]
                available.append({
                    "documentId": document.id,
                    "documentTitle": document.title,
                    "sectionId": section.get("id"),
                    "sectionName": section.get("name") or section.get("type"),
                    "sectionType": section.get("type"),
                    "source": section.get("source"),
                    "placements": len(used),
                })
        return {"placements": placements, "available": available}


@router.post("/product/section")
def product_section_save(session: Optional[str] = Header(None, alias="X-Ferix-Session"),
                         payload: PlacementIn = Body(...)):
    """Put a product into a section, on that section's terms."""
    from core import SectionPlacement

    with SessionLocal() as db:
        staff = require_staff(db, session, "admin")
        require_permission(staff, "catalog.manage")

        product = next((p for p in all_products(db)
                        if p.get("id") == payload.productId or p.get("slug") == payload.slug), None)
        if not product:
            raise HTTPException(404, "That product does not exist")

        existing = db.scalar(select(SectionPlacement).where(
            SectionPlacement.product_id == product["id"],
            SectionPlacement.document_id == payload.documentId,
            SectionPlacement.section_id == payload.sectionId,
        ))
        row = existing or SectionPlacement(
            id=new_id("plc"), product_id=product["id"], product_slug=product["slug"],
            document_id=payload.documentId, section_id=payload.sectionId,
        )
        row.section_type = payload.sectionType or row.section_type or ""
        # A placement with no price of its own inherits the product's price, so a
        # section only holds a different price when someone deliberately set one.
        row.price = float(payload.price if payload.price is not None else product.get("price") or 0.0)
        row.compare_at = float(payload.compareAt or row.compare_at or 0.0)
        row.quantity = int(payload.quantity if payload.quantity is not None else product.get("stock") or 0)
        row.position = int(payload.position or row.position or 1)
        if payload.startsAt:
            row.starts_at = parse(payload.startsAt, None)
        if payload.endsAt:
            row.ends_at = parse(payload.endsAt, None)
        if payload.config:
            row.config = payload.config
        if existing is None:
            db.add(row)
        audit(db, "admin", staff.email, "product.section", product["slug"],
              f"{payload.documentId}/{payload.sectionId}")
        db.commit()
        return {"placement": _placement_json(row)}


@router.delete("/product/section")
def product_section_remove(session: Optional[str] = Header(None, alias="X-Ferix-Session"),
                           payload: PlacementRefIn = Body(...)):
    """Take a product out of a section. The product itself is untouched."""
    from core import SectionPlacement

    with SessionLocal() as db:
        staff = require_staff(db, session, "admin")
        require_permission(staff, "catalog.manage")
        row = db.get(SectionPlacement, payload.id)
        if not row:
            raise HTTPException(404, "That placement does not exist")
        slug = row.product_slug
        db.delete(row)
        audit(db, "admin", staff.email, "product.section.remove", slug, payload.id)
        db.commit()
        return {"removed": payload.id}

# ── Removing a seller account ──────────────────────────────────────────────
# Owner only, and refused while the seller has orders. An order is a record of what
# somebody bought and paid for; deleting the seller it belonged to would leave that
# record attached to nobody. Suspending stops them trading and signing in, and keeps
# the history - which is what most "delete this seller" requests actually want.


class MerchantRefIn(BaseModel):
    id: str


@router.delete("/merchant")
def delete_merchant(session: Optional[str] = Header(None, alias="X-Ferix-Session"),
                    payload: MerchantRefIn = Body(...)):
    """Take a seller account out: their sign-ins, their products, the store itself."""
    with SessionLocal() as db:
        staff = require_staff(db, session, "admin")
        require_permission(staff, "merchant.approve")

        # An administrator runs the platform; only an owner removes an account from it.
        if "*" not in (staff.permissions or []):
            raise HTTPException(403, "Only an owner can delete a seller account")

        found = find_merchant(db, payload.id)
        if not found:
            raise HTTPException(404, "That seller does not exist")
        merchant_id = found["id"]

        placed = [row for row in db.scalars(select(Order)).all()
                  if any((item or {}).get("merchantId") == merchant_id
                         for item in (row.data or {}).get("items", []))]
        if placed:
            raise HTTPException(
                409,
                f"That seller has {len(placed)} order(s). Suspend the account instead — "
                f"deleting it would leave those orders attached to nobody.",
            )

        products = [product for product in all_products(db)
                    if product.get("merchantId") == merchant_id]
        for product in products:
            drop_row(db, "product", product["slug"])

        sign_ins = db.scalars(select(StaffUser).where(
            StaffUser.subject_type == "merchant", StaffUser.subject_id == merchant_id)).all()
        for row in sign_ins:
            for session_row in db.scalars(select(StaffSession).where(StaffSession.staff_id == row.id)).all():
                db.delete(session_row)
            db.delete(row)

        drop_row(db, "merchant", found["slug"])
        audit(db, "admin", staff.email, "merchant.delete", found["slug"], staff.role)
        db.commit()
        return {"removed": merchant_id, "name": found.get("name"),
                "products": len(products), "signIns": len(sign_ins)}

# ── Acting on an order ─────────────────────────────────────────────────────
# Cancelling, refunding and resending a confirmation. Each one is refused when it would
# be wrong - cancelling an order already on its way, refunding one that was never paid -
# and each leaves a line in the order's own timeline, so what was done and when is part
# of the order rather than something someone has to remember.


class OrderRefIn(BaseModel):
    id: str
    reason: Optional[str] = None


@router.post("/order/{action}")
def order_action(action: str, session: Optional[str] = Header(None, alias="X-Ferix-Session"),
                 payload: OrderRefIn = Body(...)):
    """Cancel, refund or resend. One endpoint, because they share their guards."""
    from notifications import order_confirmation

    if action not in ("cancel", "refund", "resend"):
        raise HTTPException(400, "That is not something that can be done to an order")

    with SessionLocal() as db:
        staff = require_staff(db, session, "admin")
        require_permission(staff, "orders.manage")

        order = db.get(Order, payload.id)
        if not order:
            raise HTTPException(404, "That order does not exist")

        data = dict(order.data or {})
        if str(data.get("channel") or "").lower() != "marketplace":
            raise HTTPException(404, "That order is not a Ferixas marketplace order")
        timeline = list(data.get("timeline") or [])
        paid = str(data.get("payment") or "").lower() in PAID_PAYMENT_STATES
        done = str(data.get("fulfillment") or "").lower() in ("delivered", "completed")
        cancelled = str(data.get("fulfillment") or "").lower() == "cancelled"

        if action == "cancel":
            if cancelled:
                raise HTTPException(409, "That order was already cancelled")
            if done:
                raise HTTPException(409, "That order has already been delivered, so it cannot be cancelled. Refund it instead.")
            if paid:
                raise HTTPException(409, "Paid-order cancellation is unavailable until a verified refund flow is connected. No order or payment state was changed.")
            data["fulfillment"] = "cancelled"
            timeline.append({"label": "Cancelled", "at": iso(now()), "by": staff.email,
                             **({"note": payload.reason} if payload.reason else {})})
            message = "Unpaid order cancelled. No payment was processed."

        elif action == "refund":
            if not paid:
                raise HTTPException(409, "That order was never paid, so there is nothing to refund.")
            raise HTTPException(409, "Refunds are unavailable until a verified payment-provider refund flow is connected. No payment state was changed.")

        else:
            if not paid:
                raise HTTPException(409, "An order confirmation can only be resent after marketplace payment is confirmed.")
            to = str(data.get("contactEmail") or "")
            if not to:
                buyer = db.get(User, order.user_id)
                to = buyer.email if buyer else ""
            if not to:
                raise HTTPException(409, "That order has no email address to send to.")
            try:
                order_confirmation(to=to, name=to.split("@")[0],
                                   number=str(data.get("number") or order.id),
                                   total=float(data.get("total") or 0))
            except Exception as error:
                raise HTTPException(502, f"The confirmation could not be sent: {error}")
            timeline.append({"label": "Confirmation resent", "at": iso(now()), "by": staff.email})
            message = f"Confirmation sent to {to}."

        data["timeline"] = timeline
        order.data = data
        audit(db, "admin", staff.email, f"order.{action}", order.id, staff.role)
        db.commit()
        return {"order": {"id": order.id, "payment": data.get("payment"),
                          "fulfillment": data.get("fulfillment"), "timeline": timeline},
                "message": message}

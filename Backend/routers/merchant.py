"""Seller workspace API: /merchant/*

Every shape here matches WebPhase/merchant/lib/api.ts exactly, so the seller
frontend works against the real database without a single UI change.
"""
from __future__ import annotations

from datetime import timedelta
from typing import Optional

from fastapi import APIRouter, Body, File, Form, Header, HTTPException, Query, Request, UploadFile
from notifications import order_status
from pydantic import BaseModel, Field
from sqlalchemy import select

from core import (
    DEMO_PASSWORD, ContentDocument, ContentVersion, FlashSale, FlashSaleItem,
    InventoryLog, LedgerEntry, MediaAsset, Order, Payout, SessionLocal, StaffSession,
    audit, aware, collections as all_collections, find_category, find_merchant, find_product,
    hash_password, iso, issue_staff_session, merchants as all_merchants, new_id, now,
    permissions_for, placeholder, products as all_products, put_row, remove_media_blob,
    require_permission, require_staff, rows_of, storage_info, sync_pending_media,
    upload_media_blob, validate_media_upload, verify_password, media_json,
)

router = APIRouter(prefix="/merchant", tags=["merchant"])

CARRIERS = ["DHL", "FedEx", "UPS", "GIG Logistics", "Aramex", "Local courier", "Store pickup"]
CATEGORY_LABELS = {
    "audio": "Audio", "electronics": "Electronics", "fashion": "Fashion", "home": "Home",
    "gaming": "Gaming", "beauty": "Beauty", "grocery": "Grocery", "sports": "Sports",
    "office": "Office", "kids": "Kids",
}
TEMPLATES = ["Atelier", "Terminal", "Boutique", "Gallery", "Depot"]


# ── Payload models ─────────────────────────────────────────────────────────

class LoginIn(BaseModel):
    email: str
    password: str


class ProductIn(BaseModel):
    id: Optional[str] = None
    title: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    compareAt: Optional[float] = None
    stock: Optional[int] = None
    status: Optional[str] = None
    store: Optional[bool] = None
    marketplace: Optional[bool] = None
    sku: Optional[str] = None
    bullets: Optional[list[str]] = None
    tags: Optional[list[str]] = None
    collections: Optional[list[str]] = None
    images: Optional[list[str]] = None
    variants: Optional[list[dict]] = None
    seoTitle: Optional[str] = None
    seoDescription: Optional[str] = None
    lowStockAt: Optional[int] = None
    slug: Optional[str] = None


class StockIn(BaseModel):
    id: str
    delta: int
    reason: str = "Manual adjustment"


class StatusIn(BaseModel):
    id: str
    fulfillment: str
    carrier: Optional[str] = None
    tracking: Optional[str] = None


class SettingsIn(BaseModel):
    name: Optional[str] = None
    tagline: Optional[str] = None
    about: Optional[str] = None
    location: Optional[str] = None
    customDomain: Optional[str] = None
    marketplaceEnabled: Optional[bool] = None
    accent: Optional[str] = None
    template: Optional[str] = None
    lowStockAt: Optional[int] = None
    autoFulfil: Optional[bool] = None
    orderEmails: Optional[bool] = None
    payoutCadence: Optional[str] = None


class MediaIn(BaseModel):
    url: str
    kind: str = "image"
    alt: str = ""
    folder: str = "store"
    publicId: str = ""
    width: int = 0
    height: int = 0


class StorefrontIn(BaseModel):
    sections: Optional[list[dict]] = None
    theme: Optional[dict] = None
    navigation: Optional[list[dict]] = None
    pages: Optional[list[dict]] = None
    status: Optional[str] = None


class PromotionIn(BaseModel):
    id: Optional[str] = None
    name: Optional[str] = None
    headline: Optional[str] = None
    bannerUrl: Optional[str] = None
    startsAt: Optional[str] = None
    endsAt: Optional[str] = None
    status: Optional[str] = None
    items: Optional[list[dict]] = None


# ── Helpers ────────────────────────────────────────────────────────────────

def _session(token: Optional[str]) -> str:
    if not token:
        raise HTTPException(401, "Please sign in as a merchant to continue")
    return token


def _merchant_or_404(db, merchant_id: str) -> dict:
    merchant = find_merchant(db, merchant_id)
    if not merchant:
        raise HTTPException(404, "Merchant not found")
    return merchant


def _own_products(db, merchant_id: str) -> list[dict]:
    return [p for p in all_products(db) if p.get("merchantId") == merchant_id]


def _merchant_orders(db, merchant_id: str) -> list[Order]:
    rows = db.scalars(select(Order).order_by(Order.placed_at.desc())).all()
    return [r for r in rows if any(i.get("merchantId") == merchant_id for i in (r.data or {}).get("items", []))]


def _merchant_product_units(db, merchant_id: str, days: Optional[int] = None) -> dict[str, int]:
    """Count units from persisted, non-cancelled order lines, never seed sales metadata."""
    today = now().date()
    counts: dict[str, int] = {}
    for row in _merchant_orders(db, merchant_id):
        data = row.data or {}
        if data.get("fulfillment") == "cancelled":
            continue
        if days is not None and (today - _date(data.get("placedAt", iso(row.placed_at)))).days >= days:
            continue
        for item in data.get("items", []):
            if item.get("merchantId") != merchant_id:
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


def _customer_of(db, order_row: Order) -> dict:
    from core import User
    user = db.get(User, order_row.user_id)
    address = (order_row.data or {}).get("address") or {}
    if not user:
        return {"id": order_row.user_id, "name": "Guest shopper", "email": "", "phone": "", "location": ""}
    return {
        "id": user.id, "name": user.name, "email": user.email, "phone": user.phone,
        "location": ", ".join(filter(None, [address.get("city"), address.get("country")])) or "—",
        "since": iso(user.created_at), "segment": "returning",
    }


def _merchant_order(db, row: Order, merchant_id: str) -> dict:
    """One order as this merchant sees it: only their items, only their money."""
    data = row.data or {}
    merchant = find_merchant(db, merchant_id) or {}
    commission_pct = merchant.get("commissionPct", 10)
    items = [i for i in data.get("items", []) if i.get("merchantId") == merchant_id]
    subtotal = round(sum(i["price"] * i["qty"] for i in items), 2)
    ratio = (subtotal / data["subtotal"]) if data.get("subtotal") else 1
    shipping = round((data.get("shipping") or 0) * ratio, 2)
    tax = round((data.get("tax") or 0) * ratio, 2)
    total = round(subtotal + shipping + tax, 2)
    return {
        "id": data.get("id", row.id),
        "number": data.get("number", row.id),
        "placedAt": data.get("placedAt", iso(row.placed_at)),
        "channel": "marketplace" if data.get("channel") == "marketplace" else "store",
        "customer": _customer_of(db, row),
        "items": items,
        "subtotal": subtotal, "shipping": shipping, "tax": tax, "total": total,
        "commission": round(subtotal * commission_pct / 100, 2),
        "payment": data.get("payment", "paid"),
        "fulfillment": data.get("fulfillment", "processing"),
        "carrier": data.get("carrier"), "tracking": data.get("tracking"),
        "address": data.get("address") or {
            "label": "Home", "name": "—", "phone": "", "line1": "—", "line2": None,
            "city": "—", "region": "", "postcode": "", "country": "—",
        },
        "note": data.get("note"),
        "timeline": data.get("timeline", []),
    }


def _money_series(db, merchant_id: str, days: int) -> list[dict]:
    today = now().date()
    series = []
    orders = [_merchant_order(db, r, merchant_id) for r in _merchant_orders(db, merchant_id)]
    for offset in range(days - 1, -1, -1):
        day = today - timedelta(days=offset)
        label = day.isoformat()
        matching = [o for o in orders if str(o["placedAt"])[:10] == label]
        series.append({
            "date": label,
            "revenue": round(sum(o["total"] for o in matching), 2),
            "orders": len(matching),
        })
    return series


def _merchant_settings(db, merchant: dict) -> dict:
    stored = merchant.get("settings") or {}
    return {
        "name": merchant.get("name", ""),
        "tagline": merchant.get("tagline", ""),
        "about": merchant.get("about", ""),
        "location": merchant.get("location", ""),
        "customDomain": merchant.get("customDomain") or "",
        "marketplaceEnabled": merchant.get("marketplaceEnabled", True),
        "accent": (merchant.get("brand") or {}).get("accent", "#c8ff3d"),
        "template": (merchant.get("brand") or {}).get("template", TEMPLATES[0]),
        "lowStockAt": stored.get("lowStockAt", 8),
        "autoFulfil": stored.get("autoFulfil", False),
        "orderEmails": stored.get("orderEmails", True),
        "payoutCadence": stored.get("payoutCadence", merchant.get("payoutCadence", "Monthly")),
    }


def _merchant_card(db, merchant: dict) -> dict:
    card = dict(merchant)
    card.pop("settings", None)
    card["productCount"] = len(_own_products(db, merchant["id"]))
    return card


# ── Session ────────────────────────────────────────────────────────────────

@router.post("/login")
def login(payload: LoginIn):
    with SessionLocal() as db:
        from core import StaffUser
        email = payload.email.strip().lower()
        staff = db.scalar(select(StaffUser).where(StaffUser.email == email, StaffUser.subject_type == "merchant"))
        if not staff or not verify_password(payload.password, staff.password_hash):
            raise HTTPException(401, "Those credentials do not match a seller account")

        # A store that has been suspended or blocked may not trade, and signing in
        # to a workspace you are barred from is the first thing a suspension is
        # meant to stop. A store still under review may sign in and prepare its
        # catalogue; it simply cannot go live until it is approved.
        # The role's definition is authoritative, as on the operator side.
        from core import ROLE_PERMISSIONS, permissions_for

        if staff.role in ROLE_PERMISSIONS:
            fresh = permissions_for(staff.role)
            if list(staff.permissions or []) != fresh:
                staff.permissions = fresh
                db.commit()

        from core import find_merchant

        store = find_merchant(db, staff.subject_id)
        status = str((store or {}).get("status") or "").lower()
        if status in ("suspended", "blocked", "disabled"):
            raise HTTPException(403, "That store is not active. Contact the platform.")
        merchant = _merchant_or_404(db, staff.subject_id)
        token = issue_staff_session(db, staff)
        db.commit()
        return {"token": token, "merchant": _merchant_card(db, merchant)}


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
        staff = require_staff(db, session, "merchant")
        merchant = find_merchant(db, staff.subject_id)
        return {"merchant": _merchant_card(db, merchant) if merchant else None}


# ── Dashboard ──────────────────────────────────────────────────────────────

@router.get("/dashboard")
def dashboard(session: Optional[str] = Header(None, alias="X-Ferix-Session")):
    with SessionLocal() as db:
        staff = require_staff(db, session, "merchant")
        merchant = _merchant_or_404(db, staff.subject_id)
        owned = _own_products(db, merchant["id"])
        settings = _merchant_settings(db, merchant)
        orders = [_merchant_order(db, r, merchant["id"]) for r in _merchant_orders(db, merchant["id"])]

        statuses: dict[str, int] = {}
        for order in orders:
            statuses[order["fulfillment"]] = statuses.get(order["fulfillment"], 0) + 1

        today = now().date()
        def window(days: int) -> list[dict]:
            return [o for o in orders if (today - _date(o["placedAt"])).days < days]
        revenue_total = round(sum(o["total"] for o in orders), 2)
        rev30 = round(sum(o["total"] for o in window(30)), 2)
        sold30 = _merchant_product_units(db, merchant["id"], 30)
        low_stock = [p for p in owned if p.get("stock", 0) <= settings["lowStockAt"]]

        summary = {
            "revenueTotal": revenue_total,
            "revenueToday": round(sum(o["total"] for o in window(1)), 2),
            "revenue7d": round(sum(o["total"] for o in window(7)), 2),
            "revenue30d": rev30,
            "ordersTotal": len(orders),
            "orders30d": len(window(30)),
            "commission30d": round(sum(o["commission"] for o in window(30)), 2),
            "averageOrder": round(revenue_total / len(orders), 2) if orders else 0.0,
        }
        customers = {o["customer"]["id"] for o in orders}
        activity = []
        for log in db.scalars(select(InventoryLog).where(InventoryLog.merchant_id == merchant["id"]).order_by(InventoryLog.created_at.desc()).limit(6)).all():
            activity.append({"id": log.id, "label": "Stock adjusted", "detail": f"{log.reason} · {log.delta:+d}", "at": iso(log.created_at), "tone": "amber"})
        for order in orders[:5]:
            activity.append({"id": f"act_{order['id']}", "label": f"Order {order['number']}", "detail": f"{order['customer']['name']} · {order['channel']}", "at": order["placedAt"], "tone": "mint"})
        activity.sort(key=lambda a: a["at"], reverse=True)

        return {
            "merchant": _merchant_card(db, merchant),
            "settings": settings,
            "summary": summary,
            "statuses": statuses,
            "counts": {
                "products": len(owned),
                "published": sum(p.get("status") == "active" for p in owned),
                "drafts": sum(p.get("status") == "draft" for p in owned),
                "lowStock": len(low_stock),
                "customers": len(customers),
                "marketplaceOrders": sum(o["channel"] == "marketplace" for o in orders),
                "storeOrders": sum(o["channel"] == "store" for o in orders),
            },
            "traffic": {
                "storeVisitors": None,
                "marketplaceImpressions": None,
                "conversionStore": None,
                "conversionMarketplace": None,
                "sold30d": sum(sold30.values()),
            },
            "lowStock": [{"id": p["id"], "title": p["title"], "sku": p.get("sku", ""), "stock": p.get("stock", 0), "slug": p["slug"]} for p in low_stock[:6]],
            "recentOrders": orders[:6],
            "activity": activity[:8],
        }


def _date(value: str):
    from datetime import date as _d
    try:
        return _d.fromisoformat(str(value)[:10])
    except Exception:
        return now().date()


# ── Products ───────────────────────────────────────────────────────────────

@router.get("/products")
def products(
    session: Optional[str] = Header(None, alias="X-Ferix-Session"),
    search: Optional[str] = None, status: Optional[str] = None, sort: Optional[str] = None,
    channel: Optional[str] = None, category: Optional[str] = None,
):
    with SessionLocal() as db:
        staff = require_staff(db, session, "merchant")
        merchant = _merchant_or_404(db, staff.subject_id)
        sold30 = _merchant_product_units(db, merchant["id"], 30)
        items = [dict(p, sold30d=sold30.get(p["id"], 0)) for p in _own_products(db, merchant["id"])]
        low_at = _merchant_settings(db, merchant)["lowStockAt"]

        if search:
            q = search.lower()
            items = [p for p in items if q in p["title"].lower() or q in p.get("sku", "").lower()]
        if status and status != "all":
            items = [p for p in items if p.get("status") == status]
        if category and category != "all":
            items = [p for p in items if p.get("category") == category]
        if channel == "store":
            items = [p for p in items if (p.get("channels") or {}).get("store")]
        elif channel == "marketplace":
            items = [p for p in items if (p.get("channels") or {}).get("marketplace")]

        if sort == "price-asc":
            items.sort(key=lambda p: p.get("price", 0))
        elif sort == "price-desc":
            items.sort(key=lambda p: -p.get("price", 0))
        elif sort == "stock":
            items.sort(key=lambda p: p.get("stock", 0))
        elif sort == "sold":
            items.sort(key=lambda p: -p.get("sold30d", 0))
        else:
            items.sort(key=lambda p: p.get("createdAt", ""), reverse=True)

        all_owned = _own_products(db, merchant["id"])
        return {
            "items": items,
            "total": len(items),
            "counts": {
                "all": len(all_owned),
                "active": sum(p.get("status") == "active" for p in all_owned),
                "draft": sum(p.get("status") == "draft" for p in all_owned),
                "archived": sum(p.get("status") == "archived" for p in all_owned),
                "lowStock": sum(p.get("stock", 0) <= low_at for p in all_owned),
            },
            "categories": sorted({p.get("category") for p in all_owned if p.get("category")}),
            "lowStockAt": low_at,
        }


@router.get("/product")
def product(session: Optional[str] = Header(None, alias="X-Ferix-Session"), slug: str = Query(...)):
    with SessionLocal() as db:
        staff = require_staff(db, session, "merchant")
        merchant = _merchant_or_404(db, staff.subject_id)
        found = find_product(db, slug)
        if not found or found.get("merchantId") != merchant["id"]:
            raise HTTPException(404, "Product not found in your catalogue")
        sold_all = _merchant_product_units(db, merchant["id"])
        sold30 = _merchant_product_units(db, merchant["id"], 30)
        product_data = {**found, "sold30d": sold30.get(found["id"], 0), "views30d": None}
        return {
            "product": product_data,
            "stock": found.get("stock", 0),
            "sold": sold_all.get(found["id"], 0),
            "lowStockAt": _merchant_settings(db, merchant)["lowStockAt"],
            "categories": sorted({p.get("category") for p in _own_products(db, merchant["id"]) if p.get("category")}) or [found.get("category")],
        }


def _slugify(value: str) -> str:
    keep = [c.lower() if c.isalnum() else "-" for c in value.strip()]
    slug = "".join(keep)
    while "--" in slug:
        slug = slug.replace("--", "-")
    return slug.strip("-") or new_id("item", 6)


@router.post("/product")
def create_product(session: Optional[str] = Header(None, alias="X-Ferix-Session"), payload: ProductIn = Body(...)):
    with SessionLocal() as db:
        staff = require_staff(db, session, "merchant")
        require_permission(staff, "merchant.products.manage")
        merchant = _merchant_or_404(db, staff.subject_id)
        if not payload.title:
            raise HTTPException(400, "A product needs a title")
        slug = payload.slug or _slugify(payload.title)
        if find_product(db, slug):
            slug = f"{slug}-{new_id('x', 4)}"
        price = float(payload.price or 0)
        product = {
            "id": new_id("prd"), "slug": slug, "title": payload.title,
            "merchantId": merchant["id"], "merchantName": merchant["name"], "merchantSlug": merchant["slug"],
            "category": payload.category or "home",
            "description": payload.description or "",
            "bullets": payload.bullets or [], "tags": payload.tags or [],
            "collections": payload.collections or [],
            "images": payload.images or [placeholder(f"{slug}-1"), placeholder(f"{slug}-2"), placeholder(f"{slug}-3")],
            "plates": [], "price": price,
            "compareAt": payload.compareAt, "discount": None, "cost": round(price * 0.62, 2),
            "sku": payload.sku or f"{merchant['slug'][:3].upper()}-{new_id('', 5).upper()}",
            "stock": int(payload.stock or 0), "lowStockAt": payload.lowStockAt or 8,
            "rating": 0.0, "ratingBreakdown": {}, "reviewCount": 0,
            "variants": payload.variants or [], "status": payload.status or "draft",
            "channels": {"store": bool(payload.store), "marketplace": bool(payload.marketplace)},
            "createdAt": iso(now()), "updatedAt": iso(now()), "sold30d": 0, "views30d": 0,
            "seoTitle": payload.seoTitle or payload.title,
            "seoDescription": payload.seoDescription or (payload.description or "")[:155],
            "origin": "merchant",
        }
        put_row(db, "product", slug, product)
        audit(db, "merchant", staff.email, "product.create", product["slug"], product["title"])
        db.commit()
        return {"product": product}


@router.patch("/product")
def update_product(session: Optional[str] = Header(None, alias="X-Ferix-Session"), payload: ProductIn = Body(...)):
    with SessionLocal() as db:
        staff = require_staff(db, session, "merchant")
        require_permission(staff, "merchant.products.manage")
        merchant = _merchant_or_404(db, staff.subject_id)
        target = find_product(db, payload.id or payload.slug or "")
        if not target or target.get("merchantId") != merchant["id"]:
            raise HTTPException(404, "Product not found in your catalogue")
        updated = dict(target)
        for field in ("title", "category", "description", "sku", "status", "compareAt",
                      "bullets", "tags", "collections", "images", "variants",
                      "seoTitle", "seoDescription", "lowStockAt"):
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
        audit(db, "merchant", staff.email, "product.update", target["slug"], updated.get("title", ""))
        db.commit()
        return {"product": updated}


@router.delete("/product")
def delete_product(session: Optional[str] = Header(None, alias="X-Ferix-Session"), payload: dict = Body(...)):
    with SessionLocal() as db:
        staff = require_staff(db, session, "merchant")
        require_permission(staff, "merchant.products.manage")
        merchant = _merchant_or_404(db, staff.subject_id)
        target = find_product(db, str(payload.get("id") or payload.get("slug") or ""))
        if not target or target.get("merchantId") != merchant["id"]:
            raise HTTPException(404, "Product not found in your catalogue")
        from core import drop_row
        drop_row(db, "product", target["slug"])
        audit(db, "merchant", staff.email, "product.delete", target["slug"], target.get("title", ""))
        db.commit()
        return {"removed": target["id"], "remaining": len(_own_products(db, merchant["id"]))}


# ── Inventory ──────────────────────────────────────────────────────────────

@router.get("/inventory")
def inventory(session: Optional[str] = Header(None, alias="X-Ferix-Session")):
    with SessionLocal() as db:
        staff = require_staff(db, session, "merchant")
        merchant = _merchant_or_404(db, staff.subject_id)
        low_at = _merchant_settings(db, merchant)["lowStockAt"]
        orders = _merchant_orders(db, merchant["id"])
        sold30 = _merchant_product_units(db, merchant["id"], 30)
        reserved: dict[str, int] = {}
        for row in orders:
            data = row.data or {}
            if data.get("fulfillment") in {"processing", "shipped"}:
                for item in data.get("items", []):
                    if item.get("merchantId") == merchant["id"]:
                        reserved[item["productId"]] = reserved.get(item["productId"], 0) + item.get("qty", 0)

        rows = []
        for product in _own_products(db, merchant["id"]):
            stock = product.get("stock", 0)
            held = reserved.get(product["id"], 0)
            available = max(0, stock - held)
            state = "out" if stock <= 0 else ("low" if stock <= low_at else "ok")
            rows.append({
                "id": product["id"], "slug": product["slug"], "title": product["title"],
                "sku": product.get("sku", ""), "stock": stock, "reserved": held,
                "available": available, "sold30d": sold30.get(product["id"], 0),
                "status": product.get("status", "active"), "channels": product.get("channels") or {},
                "category": product.get("category", ""), "state": state,
            })
        rows.sort(key=lambda r: (r["state"] != "out", r["state"] != "low", r["title"]))
        return {
            "rows": rows,
            "lowStockAt": low_at,
            "totals": {
                "skus": len(rows),
                "units": sum(r["stock"] for r in rows),
                "reserved": sum(r["reserved"] for r in rows),
                "low": sum(r["state"] == "low" for r in rows),
                "out": sum(r["state"] == "out" for r in rows),
                "value": round(sum(r["stock"] * next((p.get("price", 0) for p in _own_products(db, merchant["id"]) if p["id"] == r["id"]), 0) for r in rows), 2),
            },
        }


@router.post("/inventory/adjust")
def adjust(session: Optional[str] = Header(None, alias="X-Ferix-Session"), payload: StockIn = Body(...)):
    with SessionLocal() as db:
        staff = require_staff(db, session, "merchant")
        require_permission(staff, "merchant.inventory.manage")
        merchant = _merchant_or_404(db, staff.subject_id)
        target = find_product(db, payload.id)
        if not target or target.get("merchantId") != merchant["id"]:
            raise HTTPException(404, "Product not found in your catalogue")
        updated = dict(target)
        updated["stock"] = max(0, int(target.get("stock", 0)) + payload.delta)
        updated["updatedAt"] = iso(now())
        put_row(db, "product", target["slug"], updated)
        db.add(InventoryLog(id=new_id("inv"), product_id=target["id"], merchant_id=merchant["id"],
                             delta=payload.delta, stock_after=updated["stock"],
                             reason=payload.reason, actor=staff.email))
        audit(db, "merchant", staff.email, "inventory.adjust", target["slug"], f"{payload.delta:+d}")
        db.commit()
        logs = db.scalars(select(InventoryLog).where(InventoryLog.merchant_id == merchant["id"]).order_by(InventoryLog.created_at.desc()).limit(8)).all()
        return {
            "stock": updated["stock"],
            "log": [{"id": l.id, "title": (find_product(db, l.product_id) or {}).get("title", l.product_id),
                     "delta": l.delta, "stock": l.stock_after, "reason": l.reason, "at": iso(l.created_at)} for l in logs],
        }


# ── Orders ─────────────────────────────────────────────────────────────────

@router.get("/orders")
def orders(
    session: Optional[str] = Header(None, alias="X-Ferix-Session"),
    status: Optional[str] = None, channel: Optional[str] = None, search: Optional[str] = None,
):
    with SessionLocal() as db:
        staff = require_staff(db, session, "merchant")
        merchant = _merchant_or_404(db, staff.subject_id)
        rows = [_merchant_order(db, r, merchant["id"]) for r in _merchant_orders(db, merchant["id"])]
        counts: dict[str, int] = {"all": len(rows)}
        for order in rows:
            counts[order["fulfillment"]] = counts.get(order["fulfillment"], 0) + 1
        filtered = rows
        if status and status != "all":
            filtered = [o for o in filtered if o["fulfillment"] == status]
        if channel and channel != "all":
            filtered = [o for o in filtered if o["channel"] == channel]
        if search:
            q = search.lower()
            filtered = [o for o in filtered if q in o["number"].lower() or q in o["customer"]["name"].lower() or q in o["customer"]["email"].lower()]
        return {
            "orders": filtered, "total": len(filtered), "counts": counts,
            "revenue": round(sum(o["total"] for o in filtered), 2),
            "awaiting": counts.get("processing", 0),
        }


@router.get("/order")
def order(session: Optional[str] = Header(None, alias="X-Ferix-Session"), id: str = Query(...)):
    with SessionLocal() as db:
        staff = require_staff(db, session, "merchant")
        merchant = _merchant_or_404(db, staff.subject_id)
        for row in _merchant_orders(db, merchant["id"]):
            if row.id == id or (row.data or {}).get("number") == id:
                return {"order": _merchant_order(db, row, merchant["id"]), "carriers": CARRIERS}
        raise HTTPException(404, "Order not found")


@router.post("/orders/status")
def set_status(session: Optional[str] = Header(None, alias="X-Ferix-Session"), payload: StatusIn = Body(...)):
    with SessionLocal() as db:
        staff = require_staff(db, session, "merchant")
        require_permission(staff, "merchant.orders.manage")
        merchant = _merchant_or_404(db, staff.subject_id)
        if payload.fulfillment not in {"processing", "shipped", "delivered", "cancelled"}:
            raise HTTPException(400, "Unknown fulfilment state")
        for row in _merchant_orders(db, merchant["id"]):
            if row.id == payload.id or (row.data or {}).get("number") == payload.id:
                data = dict(row.data or {})
                data["fulfillment"] = payload.fulfillment
                if payload.carrier is not None:
                    data["carrier"] = payload.carrier
                if payload.tracking is not None:
                    data["tracking"] = payload.tracking
                timeline = list(data.get("timeline") or [])
                timeline.append({"label": f"Marked {payload.fulfillment}", "at": iso(now())})
                data["timeline"] = timeline
                row.data = data
                if payload.fulfillment == "delivered":
                    db.add(LedgerEntry(id=new_id("led"), merchant_id=merchant["id"], order_id=row.id,
                                       kind="sale", amount=round(data.get("total", 0), 2), note="Order delivered"))
                audit(db, "merchant", staff.email, "order.status", data.get("number", row.id), payload.fulfillment)
                db.commit()
                customer = db.get(User, row.user_id)
                if customer and (customer.settings or {}).get("orderEmails", True):
                    order_status(to=customer.email, name=customer.name, number=data.get("number", row.id), status=payload.fulfillment)
                return {"order": _merchant_order(db, row, merchant["id"])}
        raise HTTPException(404, "Order not found")


# ── Customers ──────────────────────────────────────────────────────────────

@router.get("/customers")
def customers(session: Optional[str] = Header(None, alias="X-Ferix-Session"), search: Optional[str] = None, segment: Optional[str] = None):
    with SessionLocal() as db:
        staff = require_staff(db, session, "merchant")
        merchant = _merchant_or_404(db, staff.subject_id)
        orders = [_merchant_order(db, r, merchant["id"]) for r in _merchant_orders(db, merchant["id"])]
        people: dict[str, dict] = {}
        for order in orders:
            person = people.setdefault(order["customer"]["id"], {**order["customer"], "orders": 0, "spent": 0.0, "lastOrderAt": None})
            person["orders"] += 1
            person["spent"] = round(person["spent"] + order["total"], 2)
            person["lastOrderAt"] = order["placedAt"]
        rows = []
        for person in people.values():
            person["averageOrder"] = round(person["spent"] / max(1, person["orders"]), 2)
            person["segment"] = "vip" if person["spent"] > 600 else ("returning" if person["orders"] > 1 else "new")
            rows.append(person)
        rows.sort(key=lambda p: -p["spent"])
        segments: dict[str, int] = {"all": len(rows)}
        for person in rows:
            segments[person["segment"]] = segments.get(person["segment"], 0) + 1
        filtered = rows
        if search:
            q = search.lower()
            filtered = [p for p in filtered if q in p["name"].lower() or q in p["email"].lower()]
        if segment and segment != "all":
            filtered = [p for p in filtered if p["segment"] == segment]
        return {"customers": filtered, "total": len(filtered), "segments": segments,
                "lifetime": round(sum(p["spent"] for p in rows), 2)}


@router.get("/customer")
def customer(session: Optional[str] = Header(None, alias="X-Ferix-Session"), id: str = Query(...)):
    with SessionLocal() as db:
        staff = require_staff(db, session, "merchant")
        merchant = _merchant_or_404(db, staff.subject_id)
        orders = [_merchant_order(db, r, merchant["id"]) for r in _merchant_orders(db, merchant["id"])]
        mine = [o for o in orders if o["customer"]["id"] == id]
        if not mine:
            raise HTTPException(404, "Customer not found")
        spent = round(sum(o["total"] for o in mine), 2)
        person = {**mine[0]["customer"], "orders": len(mine), "spent": spent,
                  "averageOrder": round(spent / len(mine), 2),
                  "segment": "vip" if spent > 600 else ("returning" if len(mine) > 1 else "new"),
                  "lastOrderAt": mine[0]["placedAt"]}
        return {"customer": person, "orders": mine, "address": mine[0]["address"]}


# ── Analytics ──────────────────────────────────────────────────────────────

@router.get("/analytics")
def analytics(session: Optional[str] = Header(None, alias="X-Ferix-Session"), days: int = 30):
    with SessionLocal() as db:
        staff = require_staff(db, session, "merchant")
        merchant = _merchant_or_404(db, staff.subject_id)
        owned = _own_products(db, merchant["id"])
        orders = [_merchant_order(db, r, merchant["id"]) for r in _merchant_orders(db, merchant["id"])]
        series = _money_series(db, merchant["id"], max(7, min(90, days)))
        today = now().date()
        window = [o for o in orders if (today - _date(o["placedAt"])).days < days]

        by_category: dict[str, float] = {}
        top: dict[str, dict] = {}
        for order in window:
            for item in order["items"]:
                product = next((p for p in owned if p["id"] == item["productId"]), None)
                category = (product or {}).get("category", "other")
                by_category[category] = round(by_category.get(category, 0) + item["price"] * item["qty"], 2)
                row = top.setdefault(item["productId"], {"id": item["productId"], "slug": (product or {}).get("slug", ""),
                                                         "title": item["title"], "sold30d": 0, "views30d": None,
                                                         "price": item["price"], "revenue": 0.0})
                row["sold30d"] += item["qty"]
                row["revenue"] = round(row["revenue"] + item["price"] * item["qty"], 2)

        buyers = {o["customer"]["id"] for o in window}
        repeat = sum(1 for person in buyers if sum(1 for o in window if o["customer"]["id"] == person) > 1)
        revenue_total = round(sum(o["total"] for o in orders), 2)
        return {
            "merchant": _merchant_card(db, merchant),
            "series": series,
            "summary": {
                "revenueTotal": revenue_total,
                "revenueToday": round(sum(o["total"] for o in orders if _date(o["placedAt"]) == today), 2),
                "revenue7d": round(sum(o["total"] for o in orders if (today - _date(o["placedAt"])).days < 7), 2),
                "revenue30d": round(sum(o["total"] for o in window), 2),
                "ordersTotal": len(orders), "orders30d": len(window),
                "commission30d": round(sum(o["commission"] for o in window), 2),
                "averageOrder": round(revenue_total / len(orders), 2) if orders else 0.0,
            },
            "byChannel": {
                "store": round(sum(o["total"] for o in window if o["channel"] == "store"), 2),
                "marketplace": round(sum(o["total"] for o in window if o["channel"] == "marketplace"), 2),
            },
            "topProducts": [
                {**row, "conversion": None}
                for row in sorted(top.values(), key=lambda r: -r["revenue"])[:8]
            ],
            "byCategory": [
                {"category": key, "name": CATEGORY_LABELS.get(key, key.title()), "revenue": value}
                for key, value in sorted(by_category.items(), key=lambda kv: -kv[1])
            ],
            "customers": {"buyers": len(buyers), "repeat": repeat,
                          "repeatRate": round((repeat / len(buyers) * 100) if buyers else 0, 1)},
        }


# ── Payouts ────────────────────────────────────────────────────────────────

@router.get("/payouts")
def payouts(session: Optional[str] = Header(None, alias="X-Ferix-Session")):
    with SessionLocal() as db:
        staff = require_staff(db, session, "merchant")
        merchant = _merchant_or_404(db, staff.subject_id)
        commission_pct = merchant.get("commissionPct", 10)
        orders = [_merchant_order(db, r, merchant["id"]) for r in _merchant_orders(db, merchant["id"])]

        buckets: dict[str, dict] = {}
        for order in orders:
            period = str(order["placedAt"])[:7]
            bucket = buckets.setdefault(period, {"period": period, "orders": 0, "gross": 0.0, "commission": 0.0})
            bucket["orders"] += 1
            bucket["gross"] = round(bucket["gross"] + order["total"], 2)
            bucket["commission"] = round(bucket["commission"] + order["commission"], 2)

        stored = db.scalars(select(Payout).where(Payout.merchant_id == merchant["id"])).all()
        rows = [{"id": p.id, "period": p.period, "orders": p.orders, "gross": p.gross,
                 "commission": p.commission, "net": p.net, "status": p.status,
                 "date": p.date, "method": p.method} for p in stored]
        if not rows:
            for index, (period, bucket) in enumerate(sorted(buckets.items(), reverse=True)):
                net = round(bucket["gross"] - bucket["commission"], 2)
                rows.append({
                    "id": f"pay_{merchant['slug']}_{period}", "period": period,
                    "orders": bucket["orders"], "gross": bucket["gross"],
                    "commission": bucket["commission"], "net": net,
                    "status": "paid" if index > 0 else "pending",
                    "date": f"{period}-28", "method": "Bank transfer",
                })
        paid = round(sum(r["net"] for r in rows if r["status"] == "paid"), 2)
        pending = round(sum(r["net"] for r in rows if r["status"] != "paid"), 2)
        return {
            "payouts": rows, "balance": round(paid + pending, 2), "pending": pending,
            "paidToDate": paid, "commissionPct": commission_pct,
            "cadence": _merchant_settings(db, merchant)["payoutCadence"], "method": "Bank transfer",
        }


# ── Settings ───────────────────────────────────────────────────────────────

@router.get("/settings")
def settings(session: Optional[str] = Header(None, alias="X-Ferix-Session")):
    with SessionLocal() as db:
        staff = require_staff(db, session, "merchant")
        merchant = _merchant_or_404(db, staff.subject_id)
        return {"settings": _merchant_settings(db, merchant), "merchant": _merchant_card(db, merchant),
                "email": staff.email, "plan": merchant.get("plan", "Starter"),
                "templates": TEMPLATES, "domain": merchant.get("domain", "")}


@router.patch("/settings")
def update_settings(session: Optional[str] = Header(None, alias="X-Ferix-Session"), payload: SettingsIn = Body(...)):
    with SessionLocal() as db:
        staff = require_staff(db, session, "merchant")
        require_permission(staff, "merchant.store.manage")
        merchant = _merchant_or_404(db, staff.subject_id)
        updated = dict(merchant)
        stored = dict(updated.get("settings") or {})
        brand = dict(updated.get("brand") or {})
        for field in ("name", "tagline", "about", "location"):
            value = getattr(payload, field)
            if value is not None:
                updated[field] = value
        if payload.customDomain is not None:
            updated["customDomain"] = payload.customDomain or None
        if payload.marketplaceEnabled is not None:
            updated["marketplaceEnabled"] = payload.marketplaceEnabled
        if payload.accent is not None:
            brand["accent"] = payload.accent
        if payload.template is not None:
            brand["template"] = payload.template
        for field in ("lowStockAt", "autoFulfil", "orderEmails", "payoutCadence"):
            value = getattr(payload, field)
            if value is not None:
                stored[field] = value
        updated["brand"] = brand
        updated["settings"] = stored
        put_row(db, "merchant", merchant["slug"], updated)
        # Keep the merchant's own product cards in step with a renamed store.
        if updated.get("name") != merchant.get("name"):
            for product in _own_products(db, merchant["id"]):
                product["merchantName"] = updated["name"]
                put_row(db, "product", product["slug"], product)
        audit(db, "merchant", staff.email, "settings.update", merchant["slug"], "Store settings saved")
        db.commit()
        return {"settings": _merchant_settings(db, updated)}


# ── Media library ──────────────────────────────────────────────────────────

@router.get("/media")
def media(session: Optional[str] = Header(None, alias="X-Ferix-Session")):
    with SessionLocal() as db:
        staff = require_staff(db, session, "merchant")
        sync_pending_media(db)
        from core import media_for
        return {"assets": media_for(db, "merchant", staff.subject_id),
                "storage": storage_info()["provider"], "storageInfo": storage_info()}


@router.post("/media")
def add_media(session: Optional[str] = Header(None, alias="X-Ferix-Session"), payload: MediaIn = Body(...)):
    with SessionLocal() as db:
        staff = require_staff(db, session, "merchant")
        require_permission(staff, "merchant.store.manage")
        if payload.kind not in {"image", "video"}:
            raise HTTPException(422, "Media kind must be image or video")
        asset = MediaAsset(id=new_id("med"), owner_type="merchant", owner_id=staff.subject_id,
                           kind=payload.kind, url=payload.url, alt=payload.alt, folder=payload.folder,
                           public_id=payload.publicId, width=payload.width, height=payload.height)
        db.add(asset)
        audit(db, "merchant", staff.email, "media.add", payload.folder, payload.url[:120])
        db.commit()
        from core import media_json
        return {"asset": media_json(asset)}


@router.post("/media/upload")
async def upload_media(
    request: Request,
    session: Optional[str] = Query(None),
    x_session: Optional[str] = Header(None, alias="X-Ferix-Session"),
    file: UploadFile = File(...),
    kind: str = Form("image"),
    alt: str = Form(""),
    folder: str = Form("store"),
):
    """Local-disk upload fallback for MVP deployments without Cloudinary."""
    with SessionLocal() as db:
        staff = require_staff(db, session or x_session, "merchant")
        require_permission(staff, "merchant.store.manage")
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
            id=new_id("med"), owner_type="merchant", owner_id=staff.subject_id,
            kind=kind, url=url,
            public_id=public_id, alt=alt[:300], folder=folder[:80], bytes=len(content),
        )
        db.add(asset)
        audit(db, "merchant", staff.email, "media.upload", folder, public_id)
        db.commit()
        return {"asset": media_json(asset), "storage": storage, "storageInfo": storage_info(storage)}


@router.delete("/media")
def remove_media(session: Optional[str] = Header(None, alias="X-Ferix-Session"), payload: dict = Body(...)):
    with SessionLocal() as db:
        staff = require_staff(db, session, "merchant")
        asset = db.get(MediaAsset, str(payload.get("id")))
        if not asset or asset.owner_id != staff.subject_id:
            raise HTTPException(404, "Media not found")
        cleanup = remove_media_blob(asset)
        db.delete(asset)
        db.commit()
        return {"removed": str(payload.get("id")), "cleanup": cleanup}


# ── Storefront document (Store Design lives behind this) ────────────────────

def _storefront_doc(db, merchant_id: str) -> ContentDocument:
    doc = db.get(ContentDocument, f"doc_store_{merchant_id}")
    if doc:
        return doc
    merchant = find_merchant(db, merchant_id) or {}
    doc = ContentDocument(
        id=f"doc_store_{merchant_id}", owner_type="merchant", owner_id=merchant_id,
        document_type="storefront", title=f"{merchant.get('name', 'Store')} storefront",
        status="draft",
        data={
            "theme": (merchant.get("brand") or {}),
            "navigation": [{"label": "Shop", "href": "/products"}, {"label": "About", "href": "/about"}],
            "sections": [
                {"id": "st_hero", "type": "hero_banner", "title": merchant.get("name", "Your store"),
                 "subtitle": merchant.get("tagline", ""), "position": 1, "visible": True},
                {"id": "st_featured", "type": "product_carousel", "title": "Featured", "position": 2, "visible": True},
            ],
            "pages": [{"slug": "about", "title": "About", "body": merchant.get("about", "")}],
        },
    )
    db.add(doc)
    db.flush()
    return doc


def _doc_json(doc: ContentDocument) -> dict:
    return {"id": doc.id, "ownerType": doc.owner_type, "ownerId": doc.owner_id,
            "documentType": doc.document_type, "title": doc.title, "status": doc.status,
            "data": doc.data, "updatedAt": iso(doc.updated_at), "updatedBy": doc.updated_by,
            "designEngine": "coming_soon"}


@router.get("/storefront")
def storefront(session: Optional[str] = Header(None, alias="X-Ferix-Session")):
    with SessionLocal() as db:
        staff = require_staff(db, session, "merchant")
        doc = _storefront_doc(db, staff.subject_id)
        db.commit()
        return {"document": _doc_json(doc), "designEngine": "coming_soon",
                "message": "The visual Store Design engine is coming soon. Your storefront content is ready to edit."}


@router.patch("/storefront")
def update_storefront(session: Optional[str] = Header(None, alias="X-Ferix-Session"), payload: StorefrontIn = Body(...)):
    with SessionLocal() as db:
        staff = require_staff(db, session, "merchant")
        require_permission(staff, "merchant.store.manage")
        doc = _storefront_doc(db, staff.subject_id)
        data = dict(doc.data or {})
        for field in ("sections", "theme", "navigation", "pages"):
            value = getattr(payload, field)
            if value is not None:
                data[field] = value
        doc.data = data
        if payload.status:
            doc.status = payload.status
        doc.updated_at = now()
        doc.updated_by = staff.email
        db.add(ContentVersion(id=new_id("ver"), document_id=doc.id,
                              version=len(db.scalars(select(ContentVersion).where(ContentVersion.document_id == doc.id)).all()) + 1,
                              status=doc.status, data=data, note="Storefront saved", created_by=staff.email))
        audit(db, "merchant", staff.email, "storefront.save", doc.id, doc.status)
        db.commit()
        return {"document": _doc_json(doc)}


@router.post("/storefront/publish")
def publish_storefront(session: Optional[str] = Header(None, alias="X-Ferix-Session")):
    with SessionLocal() as db:
        staff = require_staff(db, session, "merchant")
        require_permission(staff, "merchant.store.manage")
        doc = _storefront_doc(db, staff.subject_id)
        doc.status = "published"
        doc.updated_at = now()
        doc.updated_by = staff.email
        db.add(ContentVersion(id=new_id("ver"), document_id=doc.id,
                              version=len(db.scalars(select(ContentVersion).where(ContentVersion.document_id == doc.id)).all()) + 1,
                              status="published", data=doc.data, note="Storefront published", created_by=staff.email))
        audit(db, "merchant", staff.email, "storefront.publish", doc.id, "Published")
        db.commit()
        return {"document": _doc_json(doc)}


# ── Merchant promotions ────────────────────────────────────────────────────

@router.get("/promotions")
def promotions(session: Optional[str] = Header(None, alias="X-Ferix-Session")):
    with SessionLocal() as db:
        staff = require_staff(db, session, "merchant")
        merchant = _merchant_or_404(db, staff.subject_id)
        rows = db.scalars(select(FlashSale).where(FlashSale.owner_id == merchant["id"])).all()
        sales = []
        for sale in rows:
            items = db.scalars(select(FlashSaleItem).where(FlashSaleItem.sale_id == sale.id)).all()
            sales.append({
                "id": sale.id, "name": sale.name, "headline": sale.headline,
                "bannerUrl": sale.banner_url, "startsAt": iso(sale.starts_at), "endsAt": iso(sale.ends_at),
                "status": sale.status, "ownerType": sale.owner_type, "ownerId": sale.owner_id,
                "items": [{"id": i.id, "productId": i.product_id, "salePrice": i.sale_price,
                           "quantityLimit": i.quantity_limit, "soldQuantity": i.sold_quantity,
                           "title": (find_product(db, i.product_id) or {}).get("title", i.product_id)} for i in items],
            })
        return {"sales": sales, "products": [{"id": p["id"], "title": p["title"], "price": p["price"], "slug": p["slug"]} for p in _own_products(db, merchant["id"])]}


@router.post("/promotions")
def create_promotion(session: Optional[str] = Header(None, alias="X-Ferix-Session"), payload: PromotionIn = Body(...)):
    with SessionLocal() as db:
        staff = require_staff(db, session, "merchant")
        require_permission(staff, "merchant.promotions.manage")
        merchant = _merchant_or_404(db, staff.subject_id)
        if not payload.name:
            raise HTTPException(400, "A promotion needs a name")
        sale = FlashSale(
            id=new_id("sale"), name=payload.name, headline=payload.headline or "",
            banner_url=payload.bannerUrl or placeholder(f"sale-{merchant['slug']}"),
            starts_at=now(), ends_at=now() + timedelta(days=7),
            status=payload.status or "draft", owner_type="merchant", owner_id=merchant["id"],
        )
        db.add(sale)
        for item in payload.items or []:
            db.add(FlashSaleItem(id=new_id("fsi"), sale_id=sale.id, product_id=item.get("productId", ""),
                                 merchant_id=merchant["id"], sale_price=float(item.get("salePrice", 0)),
                                 quantity_limit=int(item.get("quantityLimit", 0))))
        audit(db, "merchant", staff.email, "promotion.create", sale.name, merchant["slug"])
        db.commit()
        return {"sale": {"id": sale.id, "name": sale.name, "status": sale.status}}

@router.post("/auth/refresh")
def auth_refresh(session: Optional[str] = Header(None, alias="X-Ferix-Session")):
    """Silently rotate the seller session. Nothing is extended: the new token carries
    the original expiry, so the session still ends seven days after signing in."""
    from core import refresh_staff_session

    with SessionLocal() as db:
        result = refresh_staff_session(db, session, "merchant")
        if not result:
            raise HTTPException(401, "That session has ended. Please sign in again.")
        return {"token": result["token"], "expiresAt": iso(result["expiresAt"]),
                "role": result["staff"].role, "permissions": result["staff"].permissions}

# ── Submitting a product for review ────────────────────────────────────────
# Nothing a seller publishes goes live on its own. A product carries its review
# state and the trail behind it, and only an operator decision puts it on sale.


class ProductRefIn(BaseModel):
    id: str
    note: Optional[str] = None


@router.post("/product/submit")
def product_submit(session: Optional[str] = Header(None, alias="X-Ferix-Session"),
                   payload: ProductRefIn = Body(...)):
    """Send a seller's product to the platform for review."""
    with SessionLocal() as db:
        staff = require_staff(db, session, "merchant")
        require_permission(staff, "merchant.products.manage")

        product = next((p for p in all_products(db) if p.get("id") == payload.id), None)
        if not product:
            raise HTTPException(404, "That product is not in your catalogue")
        if product.get("merchantId") != staff.subject_id:
            raise HTTPException(403, "That product belongs to another store")

        product["reviewStatus"] = "in_review"
        product["reviewNote"] = payload.note or ""
        product["submittedBy"] = staff.email
        product["submittedAt"] = now().isoformat()
        put_row(db, "product", product["id"], product)
        audit(db, "merchant", staff.email, "product.submit", product["id"], "in_review")
        db.commit()
        return {"product": {"id": product["id"], "reviewStatus": product["reviewStatus"],
                            "submittedAt": product["submittedAt"]}}

"""Shared database, models and helpers for the Ferixas commerce API.

Neon PostgreSQL is the source of truth. SQLite is supported for local work.
Cloudinary and Resend are adapters enabled by environment variables.
"""
from __future__ import annotations

import hashlib
import hmac
import json
import os
import re
import secrets
import time
import urllib.parse
import urllib.request
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Optional

from fastapi import HTTPException
from sqlalchemy import DateTime, ForeignKey, JSON, String, Text, create_engine, select
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, sessionmaker

# ── Configuration ──────────────────────────────────────────────────────────

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./ferixas-dev.db")
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+psycopg://", 1)
if DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg://", 1)

engine = create_engine(DATABASE_URL, pool_pre_ping=True, future=True)
SessionLocal = sessionmaker(bind=engine, expire_on_commit=False)

FREE_SHIPPING_OVER = 120.0
TAX_RATE = 0.075
SESSION_DAYS = 30
ROOT = Path(__file__).resolve().parent
SEED_PATH = ROOT / "seed.json"
DEMO_PASSWORD = "Ferixas123"
PLACEHOLDER = "https://picsum.photos/seed/{seed}/900/900"
UPLOAD_ROOT = ROOT / "uploads" if "ROOT" in globals() else Path(__file__).resolve().parent / "uploads"
UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)

# Curated catalogue imagery ships with the repository under media/, so a fresh
# clone renders a real storefront instead of grey placeholders. Anything the
# CMS or a seller uploads still lands in uploads/ and takes precedence.
MEDIA_ROOT = ROOT / "media"
MEDIA_PREFIX = "/media"


def catalogue_image(folder: str, slug: str) -> Optional[str]:
    """The bundled photograph for a catalogue entity, if one was shipped."""
    for suffix in (".jpg", ".jpeg", ".png", ".webp"):
        if (MEDIA_ROOT / folder / f"{slug}{suffix}").is_file():
            return f"{MEDIA_PREFIX}/{folder}/{slug}{suffix}"
    return None


def catalogue_images(folder: str, slug: str, limit: int = 4) -> list[str]:
    """Every bundled photograph for an entity, in filename order."""
    found: list[str] = []
    for suffix in (".jpg", ".jpeg", ".png", ".webp"):
        candidate = MEDIA_ROOT / folder / f"{slug}{suffix}"
        if candidate.is_file():
            found.append(f"{MEDIA_PREFIX}/{folder}/{slug}{suffix}")
    for index in range(2, limit + 1):
        for suffix in (".jpg", ".jpeg", ".png", ".webp"):
            candidate = MEDIA_ROOT / folder / f"{slug}-{index}{suffix}"
            if candidate.is_file():
                found.append(f"{MEDIA_PREFIX}/{folder}/{slug}-{index}{suffix}")
    return found

def save_upload(content: bytes, original_name: str) -> str:
    """Persist an MVP upload locally and return its public filename."""
    suffix = Path(original_name or "asset").suffix.lower()
    suffix = suffix if re.fullmatch(r"\.[a-z0-9]{1,8}", suffix) else ".bin"
    filename = f"{uuid.uuid4().hex}{suffix}"
    (UPLOAD_ROOT / filename).write_bytes(content)
    return filename


def validate_media_upload(content: bytes, original_name: str, kind: str) -> None:
    """Reject non-media payloads before storing or forwarding an upload.

    Browser ``accept`` attributes are only hints, so validate file signatures on
    the server. SVG is intentionally excluded because active markup is unsafe
    to serve as an uploaded image without sanitisation.
    """
    if kind not in {"image", "video"}:
        raise HTTPException(422, "Upload kind must be image or video")

    image_ok = (
        content.startswith(b"\x89PNG\r\n\x1a\n")
        or content.startswith(b"\xff\xd8\xff")
        or content.startswith((b"GIF87a", b"GIF89a"))
        or (len(content) >= 12 and content[:4] == b"RIFF" and content[8:12] == b"WEBP")
    )
    brand = content[8:12] if len(content) >= 12 and content[4:8] == b"ftyp" else b""
    if brand in {b"avif", b"avis", b"mif1", b"heic", b"heix", b"hevc", b"hevx"}:
        image_ok = True

    video_ok = content.startswith(b"\x1aE\xdf\xa3")
    video_brands = {b"isom", b"iso2", b"iso5", b"iso6", b"mp41", b"mp42", b"avc1", b"M4V ", b"qt  ", b"3gp4", b"3gp5"}
    if brand in video_brands:
        video_ok = True

    valid = image_ok if kind == "image" else video_ok
    if not valid:
        raise HTTPException(415, f"This file does not appear to be a supported {kind}.")

def upload_media_blob(content: bytes, original_name: str, kind: str = "image") -> tuple[str, str, str]:
    """Upload to Cloudinary when configured, otherwise use local MVP storage."""
    cloudinary_url = os.getenv("CLOUDINARY_URL", "").strip()
    if cloudinary_url.startswith("cloudinary://"):
        try:
            parsed = urllib.parse.urlparse(cloudinary_url)
            cloud_name = parsed.hostname or ""
            api_key = urllib.parse.unquote(parsed.username or "")
            api_secret = urllib.parse.unquote(parsed.password or "")
            if cloud_name and api_key and api_secret:
                timestamp = int(time.time())
                public_id = f"ferixas/{uuid.uuid4().hex}"
                signature_base = f"public_id={public_id}&timestamp={timestamp}{api_secret}"
                signature = hashlib.sha1(signature_base.encode()).hexdigest()
                boundary = f"----ferixas{uuid.uuid4().hex}"
                resource = "video" if kind == "video" else "image"
                fields = {
                    "api_key": api_key,
                    "timestamp": str(timestamp),
                    "public_id": public_id,
                    "signature": signature,
                }
                parts: list[bytes] = []
                for key, value in fields.items():
                    parts.extend([
                        f"--{boundary}\r\n".encode(),
                        f'Content-Disposition: form-data; name="{key}"\r\n\r\n'.encode(),
                        str(value).encode(), b"\r\n",
                    ])
                suffix = Path(original_name or "asset").suffix or (".mp4" if kind == "video" else ".jpg")
                parts.extend([
                    f"--{boundary}\r\n".encode(),
                    f'Content-Disposition: form-data; name="file"; filename="asset{suffix}"\r\n'.encode(),
                    f"Content-Type: {('video/mp4' if kind == 'video' else 'application/octet-stream')}\r\n\r\n".encode(),
                    content, b"\r\n", f"--{boundary}--\r\n".encode(),
                ])
                request = urllib.request.Request(
                    f"https://api.cloudinary.com/v1_1/{cloud_name}/{resource}/upload",
                    data=b"".join(parts),
                    headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
                    method="POST",
                )
                with urllib.request.urlopen(request, timeout=30) as response:
                    payload = json.loads(response.read().decode())
                secure_url = payload.get("secure_url") or payload.get("url")
                if secure_url:
                    return secure_url, str(payload.get("public_id") or public_id), "cloudinary"
        except Exception:
            # A provider outage should not make the MVP unusable; local storage is the fallback.
            pass
    filename = save_upload(content, original_name)
    # Uploaded files live under uploads/, which is mounted at /uploads.  Keep
    # /media for bundled catalogue assets; returning /media here used to make
    # every local upload appear saved while serving a 404.
    return f"/uploads/{filename}", filename, "local"


def storage_info(effective: Optional[str] = None) -> dict[str, Any]:
    """Describe storage without returning provider credentials or URLs."""
    configured = "cloudinary" if os.getenv("CLOUDINARY_URL", "").startswith("cloudinary://") else "local"
    active = effective or configured
    return {
        "provider": active,
        "configuredProvider": configured,
        "fallback": active != configured,
        "fallbackAvailable": True,
    }


def remove_media_blob(asset: "MediaAsset") -> str:
    """Best-effort cleanup for a media record's owned local/provider blob.

    Bundled /media/<folder>/ assets are never removed. Legacy local uploads
    were incorrectly recorded as /media/<filename>; those single-segment
    paths are intentionally included for backwards-compatible cleanup.
    """
    url = str(asset.url or "")
    parsed = urllib.parse.urlparse(url)
    path = parsed.path or url
    filename = ""
    local_candidate = False
    if path.startswith("/uploads/") and "/" not in path[len("/uploads/"):].strip("/"):
        filename = Path(path).name
        local_candidate = True
    elif path.startswith("/media/") and "/" not in path[len("/media/"):].strip("/"):
        filename = Path(path).name
        local_candidate = True
    if local_candidate and filename:
        source = (UPLOAD_ROOT / filename).resolve()
        try:
            source.relative_to(UPLOAD_ROOT.resolve())
            if source.is_file():
                source.unlink()
                return "local"
        except (OSError, ValueError):
            pass

    cloudinary_url = os.getenv("CLOUDINARY_URL", "").strip()
    public_id = str(asset.public_id or "")
    if cloudinary_url.startswith("cloudinary://") and public_id:
        try:
            parsed_config = urllib.parse.urlparse(cloudinary_url)
            cloud_name = parsed_config.hostname or ""
            api_key = urllib.parse.unquote(parsed_config.username or "")
            api_secret = urllib.parse.unquote(parsed_config.password or "")
            if not (cloud_name and api_key and api_secret):
                return "none"
            timestamp = int(time.time())
            signature_base = f"public_id={public_id}&timestamp={timestamp}{api_secret}"
            signature = hashlib.sha1(signature_base.encode()).hexdigest()
            resource = "video" if asset.kind == "video" else "image"
            fields = {"api_key": api_key, "public_id": public_id,
                      "timestamp": str(timestamp), "signature": signature}
            boundary = f"----ferixas-delete{uuid.uuid4().hex}"
            parts: list[bytes] = []
            for key, value in fields.items():
                parts.extend([f"--{boundary}\r\n".encode(),
                              f'Content-Disposition: form-data; name="{key}"\r\n\r\n'.encode(),
                              str(value).encode(), b"\r\n"])
            parts.append(f"--{boundary}--\r\n".encode())
            request = urllib.request.Request(
                f"https://api.cloudinary.com/v1_1/{cloud_name}/{resource}/destroy",
                data=b"".join(parts),
                headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
                method="POST",
            )
            with urllib.request.urlopen(request, timeout=10):
                return "cloudinary"
        except Exception:
            # Removing the database record must remain possible during a
            # provider outage; orphan cleanup can be retried out of band.
            return "cloudinary-pending"
    return "none"

def sync_pending_media(db: Session) -> int:
    """Back up fallback uploads to Cloudinary as soon as credentials work again."""
    if not os.getenv("CLOUDINARY_URL", "").startswith("cloudinary://"):
        return 0
    synced = 0
    for asset in db.scalars(select(MediaAsset)).all():
        if "/media/" not in (asset.url or ""):
            continue
        filename = asset.public_id or Path(urllib.parse.urlparse(asset.url).path).name
        source = UPLOAD_ROOT / filename
        if not source.exists():
            continue
        try:
            url, public_id, storage = upload_media_blob(source.read_bytes(), filename, asset.kind)
            if storage == "cloudinary":
                asset.url = url
                asset.public_id = public_id
                db.add(asset)
                synced += 1
        except Exception:
            continue
    if synced:
        db.commit()
    return synced

# ── Models ─────────────────────────────────────────────────────────────────

class Base(DeclarativeBase):
    pass


class User(Base):
    """A shopper account."""
    __tablename__ = "users"
    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    name: Mapped[str] = mapped_column(String(160))
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(256))
    phone: Mapped[str] = mapped_column(String(40), default="")
    settings: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class SessionToken(Base):
    __tablename__ = "sessions"
    token: Mapped[str] = mapped_column(String(96), primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class StaffUser(Base):
    """Merchant or platform operator sign-in. One table, two subject types."""
    __tablename__ = "staff_users"
    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    subject_type: Mapped[str] = mapped_column(String(20), index=True)  # merchant | admin
    subject_id: Mapped[str] = mapped_column(String(60), index=True)    # merchant id, or "platform"
    name: Mapped[str] = mapped_column(String(160))
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(256))
    role: Mapped[str] = mapped_column(String(40), default="owner")
    permissions: Mapped[list] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class StaffSession(Base):
    __tablename__ = "staff_sessions"
    token: Mapped[str] = mapped_column(String(96), primary_key=True)
    staff_id: Mapped[str] = mapped_column(ForeignKey("staff_users.id"), index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class Catalog(Base):
    """Catalogue records: products, categories, collections, merchants, banners."""
    __tablename__ = "catalog_records"
    key: Mapped[str] = mapped_column(String(180), primary_key=True)
    kind: Mapped[str] = mapped_column(String(30), index=True)
    slug: Mapped[str] = mapped_column(String(180), index=True)
    data: Mapped[dict] = mapped_column(JSON)


class Address(Base):
    __tablename__ = "addresses"
    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    data: Mapped[dict] = mapped_column(JSON)


class Cart(Base):
    __tablename__ = "carts"
    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    user_id: Mapped[Optional[str]] = mapped_column(ForeignKey("users.id"), nullable=True, index=True)
    lines: Mapped[list] = mapped_column(JSON, default=list)


class Wishlist(Base):
    __tablename__ = "wishlists"
    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), unique=True)
    product_ids: Mapped[list] = mapped_column(JSON, default=list)


class Review(Base):
    __tablename__ = "reviews"
    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    product_id: Mapped[str] = mapped_column(String(180), index=True)
    data: Mapped[dict] = mapped_column(JSON)


class Order(Base):
    __tablename__ = "orders"
    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    data: Mapped[dict] = mapped_column(JSON)
    placed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class MediaAsset(Base):
    """A Cloudinary-backed (or placeholder) image, video or document."""
    __tablename__ = "media_assets"
    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    owner_type: Mapped[str] = mapped_column(String(20), index=True)   # platform | merchant
    owner_id: Mapped[str] = mapped_column(String(60), index=True)
    kind: Mapped[str] = mapped_column(String(20), default="image")    # image | video
    url: Mapped[str] = mapped_column(Text)
    public_id: Mapped[str] = mapped_column(String(240), default="")
    alt: Mapped[str] = mapped_column(String(300), default="")
    folder: Mapped[str] = mapped_column(String(80), default="")
    width: Mapped[int] = mapped_column(default=0)
    height: Mapped[int] = mapped_column(default=0)
    bytes: Mapped[int] = mapped_column(default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class ContentDocument(Base):
    """Versioned content: marketplace home, banners, storefront, pages."""
    __tablename__ = "content_documents"
    id: Mapped[str] = mapped_column(String(60), primary_key=True)
    owner_type: Mapped[str] = mapped_column(String(20), index=True)
    owner_id: Mapped[str] = mapped_column(String(60), index=True)
    document_type: Mapped[str] = mapped_column(String(40), index=True)
    title: Mapped[str] = mapped_column(String(200), default="")
    status: Mapped[str] = mapped_column(String(20), default="draft")   # draft | published | archived
    data: Mapped[dict] = mapped_column(JSON, default=dict)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_by: Mapped[str] = mapped_column(String(320), default="")


class ContentVersion(Base):
    __tablename__ = "content_versions"
    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    document_id: Mapped[str] = mapped_column(ForeignKey("content_documents.id"), index=True)
    version: Mapped[int] = mapped_column(default=1)
    status: Mapped[str] = mapped_column(String(20), default="draft")
    data: Mapped[dict] = mapped_column(JSON)
    note: Mapped[str] = mapped_column(String(300), default="")
    created_by: Mapped[str] = mapped_column(String(320), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class FlashSale(Base):
    __tablename__ = "flash_sales"
    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    name: Mapped[str] = mapped_column(String(200))
    headline: Mapped[str] = mapped_column(String(300), default="")
    banner_url: Mapped[str] = mapped_column(Text, default="")
    starts_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    ends_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    status: Mapped[str] = mapped_column(String(20), default="scheduled")  # scheduled | live | ended | draft
    owner_type: Mapped[str] = mapped_column(String(20), default="platform")
    owner_id: Mapped[str] = mapped_column(String(60), default="platform")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class FlashSaleItem(Base):
    __tablename__ = "flash_sale_items"
    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    sale_id: Mapped[str] = mapped_column(ForeignKey("flash_sales.id"), index=True)
    product_id: Mapped[str] = mapped_column(String(180), index=True)
    merchant_id: Mapped[str] = mapped_column(String(60), index=True)
    sale_price: Mapped[float] = mapped_column(default=0.0)
    quantity_limit: Mapped[int] = mapped_column(default=0)
    sold_quantity: Mapped[int] = mapped_column(default=0)


class InventoryLog(Base):
    __tablename__ = "inventory_logs"
    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    product_id: Mapped[str] = mapped_column(String(180), index=True)
    merchant_id: Mapped[str] = mapped_column(String(60), index=True)
    delta: Mapped[int] = mapped_column(default=0)
    stock_after: Mapped[int] = mapped_column(default=0)
    reason: Mapped[str] = mapped_column(String(200), default="")
    actor: Mapped[str] = mapped_column(String(320), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class LedgerEntry(Base):
    """Merchant money movements. Payouts are derived, never hand-set balances."""
    __tablename__ = "ledger_entries"
    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    merchant_id: Mapped[str] = mapped_column(String(60), index=True)
    order_id: Mapped[str] = mapped_column(String(60), default="", index=True)
    kind: Mapped[str] = mapped_column(String(30))  # sale | commission | refund | fee | payout
    amount: Mapped[float] = mapped_column(default=0.0)
    note: Mapped[str] = mapped_column(String(300), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class Payout(Base):
    __tablename__ = "payouts"
    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    merchant_id: Mapped[str] = mapped_column(String(60), index=True)
    period: Mapped[str] = mapped_column(String(60))
    orders: Mapped[int] = mapped_column(default=0)
    gross: Mapped[float] = mapped_column(default=0.0)
    commission: Mapped[float] = mapped_column(default=0.0)
    net: Mapped[float] = mapped_column(default=0.0)
    status: Mapped[str] = mapped_column(String(20), default="pending")
    method: Mapped[str] = mapped_column(String(60), default="Bank transfer")
    date: Mapped[str] = mapped_column(String(40), default="")


class AuditLog(Base):
    __tablename__ = "audit_logs"
    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    actor_type: Mapped[str] = mapped_column(String(20))
    actor_id: Mapped[str] = mapped_column(String(320))
    action: Mapped[str] = mapped_column(String(80))
    target: Mapped[str] = mapped_column(String(200), default="")
    detail: Mapped[str] = mapped_column(String(400), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


# ── Permissions ────────────────────────────────────────────────────────────

ROLE_PERMISSIONS: dict[str, list[str]] = {
    "owner": ["*"],
    "admin": [
        "cms.manage", "catalog.manage", "media.manage", "merchant.approve",
        "merchant.view", "customer.view", "orders.view", "orders.manage",
        "payments.view", "payouts.view", "analytics.view", "settings.manage",
        "promotions.manage", "audit.view",
    ],
    "content": ["cms.manage", "catalog.manage", "media.manage", "promotions.manage", "analytics.view"],
    "ops": ["merchant.view", "customer.view", "orders.view", "orders.manage", "payouts.view", "analytics.view"],
    "merchant": [
        "merchant.products.manage", "merchant.orders.manage", "merchant.inventory.manage",
        "merchant.customers.view", "merchant.analytics.view", "merchant.payouts.view",
        "merchant.store.manage", "merchant.promotions.manage",
    ],
}


def permissions_for(role: str, explicit: Optional[list] = None) -> list[str]:
    if explicit:
        return list(explicit)
    return list(ROLE_PERMISSIONS.get(role, []))


def has_permission(permissions: list[str], needed: str) -> bool:
    if "*" in permissions:
        return True
    if needed in permissions:
        return True
    # "cms.manage" grants "cms.view"; "orders.manage" grants "orders.view".
    if needed.endswith(".view"):
        return needed.replace(".view", ".manage") in permissions
    return False


# ── Helpers ────────────────────────────────────────────────────────────────

def now() -> datetime:
    return datetime.now(timezone.utc)


def iso(value: Any) -> str:
    if isinstance(value, datetime):
        return value.isoformat()
    return str(value)


def aware(value: datetime) -> datetime:
    return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value


def initials(name: str) -> str:
    return "".join(part[0].upper() for part in (name or "").split()[:2]) or "F"


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.scrypt(password.encode(), salt=salt, n=2**14, r=8, p=1)
    return salt.hex() + ":" + digest.hex()


def verify_password(password: str, stored: str) -> bool:
    try:
        salt, digest = stored.split(":", 1)
        actual = hashlib.scrypt(password.encode(), salt=bytes.fromhex(salt), n=2**14, r=8, p=1).hex()
        return hmac.compare_digest(actual, digest)
    except Exception:
        return False


def new_id(prefix: str, size: int = 12) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:size]}"


def placeholder(seed: str) -> str:
    """Last-resort artwork for an entity with no bundled photograph.

    Deterministic and local, so the storefront never depends on a third-party
    image host and never shows a broken frame.
    """
    return f"/media/placeholder.svg?seed={urllib.parse.quote(seed)}"


def backfill_catalogue_media(db: Session) -> int:
    """Point catalogue rows at the bundled photographs.

    A database seeded before the imagery shipped still holds third-party
    placeholder URLs. This rewrites only those rows, and only where a bundled
    photograph exists, so a CMS upload or a seller's own image is never
    overwritten. Idempotent: a second run changes nothing.
    """
    folders = {
        "category": ("categories", ("image", "imageUrl")),
        "collection": ("collections", ("image",)),
        "merchant": ("merchants", ("logo", "cover")),
        "banner": ("banners", ("image", "imageUrl", "mediaUrl")),
    }
    changed = 0
    for kind, (folder, fields) in folders.items():
        for row in rows_of(db, kind):
            slug = row.get("slug") or row.get("id") or ""
            bundled = catalogue_image(folder, slug)
            if not bundled:
                continue
            patch = {
                f: bundled
                for f in fields
                if not row.get(f)
                or "picsum.photos" in str(row.get(f))
                or str(row.get(f)).startswith("/banners/")
            }
            legacy_banner_media = kind == "banner" and any(
                str(row.get(f) or "").startswith("/banners/") for f in fields
            )
            legacy_banner_video = kind == "banner" and str(row.get("videoUrl") or "").startswith("/banners/")
            if legacy_banner_media or legacy_banner_video:
                if row.get("kind") == "video" and (
                    legacy_banner_media or str(row.get("mediaUrl") or "").startswith("/media/banners/")
                ):
                    patch["kind"] = "image"
                if legacy_banner_video:
                    patch["videoUrl"] = None
            if patch:
                put_row(db, kind, slug, {**row, **patch})
                changed += 1

    for row in rows_of(db, "product"):
        slug = row.get("slug") or ""
        bundled = catalogue_images("products", slug)
        if not bundled:
            continue
        current = row.get("images") or []
        if not current or any("picsum.photos" in str(url) for url in current):
            put_row(db, "product", slug, {**row, "images": bundled})
            changed += 1
    return changed


def audit(db: Session, actor_type: str, actor_id: str, action: str, target: str = "", detail: str = "") -> None:
    db.add(AuditLog(id=new_id("aud"), actor_type=actor_type, actor_id=actor_id,
                    action=action, target=target, detail=detail))


# ── Shopper session ────────────────────────────────────────────────────────

def get_user(db: Session, token: Optional[str]) -> Optional[User]:
    if not token:
        return None
    row = db.get(SessionToken, token)
    if not row:
        return None
    if aware(row.expires_at) < now():
        return None
    return db.get(User, row.user_id)


def require_user(db: Session, token: Optional[str]) -> User:
    user = get_user(db, token)
    if not user:
        raise HTTPException(401, "Please sign in to continue")
    return user


def public_user(user: User) -> dict:
    return {
        "id": user.id, "name": user.name, "email": user.email, "phone": user.phone,
        "createdAt": iso(user.created_at), "segment": "returning",
        "avatarInitials": initials(user.name), "settings": user.settings or {},
    }


# ── Staff session ──────────────────────────────────────────────────────────

def staff_from_token(db: Session, token: Optional[str], subject_type: str) -> Optional[StaffUser]:
    if not token:
        return None
    row = db.get(StaffSession, token)
    if not row:
        return None
    if aware(row.expires_at) < now():
        return None
    staff = db.get(StaffUser, row.staff_id)
    if not staff or staff.subject_type != subject_type:
        return None
    return staff


def require_staff(db: Session, token: Optional[str], subject_type: str) -> StaffUser:
    staff = staff_from_token(db, token, subject_type)
    if not staff:
        label = "merchant" if subject_type == "merchant" else "operator"
        raise HTTPException(401, f"Please sign in as a {label} to continue")
    return staff


def require_permission(staff: StaffUser, needed: str) -> StaffUser:
    if not has_permission(staff.permissions or [], needed):
        raise HTTPException(403, "Your account does not have permission to do that")
    return staff


def issue_staff_session(db: Session, staff: StaffUser) -> str:
    token = ("m_" if staff.subject_type == "merchant" else "a_") + secrets.token_urlsafe(28)
    db.add(StaffSession(token=token, staff_id=staff.id, expires_at=now() + timedelta(days=SESSION_DAYS)))
    return token


# ── Catalogue access ───────────────────────────────────────────────────────

def rows_of(db: Session, kind: str) -> list[dict]:
    return [r.data for r in db.scalars(select(Catalog).where(Catalog.kind == kind)).all()]


def put_row(db: Session, kind: str, slug: str, data: dict) -> None:
    key = f"{kind}:{slug}"
    row = db.get(Catalog, key)
    if row:
        row.data = data
    else:
        db.add(Catalog(key=key, kind=kind, slug=slug, data=data))


def drop_row(db: Session, kind: str, slug: str) -> bool:
    row = db.get(Catalog, f"{kind}:{slug}")
    if not row:
        return False
    db.delete(row)
    return True


def products(db: Session) -> list[dict]:
    return rows_of(db, "product")


def merchants(db: Session) -> list[dict]:
    return rows_of(db, "merchant")


def categories(db: Session) -> list[dict]:
    return rows_of(db, "category")


def collections(db: Session) -> list[dict]:
    return rows_of(db, "collection")


def brands(db: Session) -> list[dict]:
    """Persisted platform brands, stored in the existing catalogue table."""
    return rows_of(db, "brand")


brand_rows = brands


DEFAULT_OVERLAY = {
    "enabled": True, "align": "left", "vertical": "bottom", "scrim": 0.55,
    "tone": "light", "width": 52, "showText": True, "showButtons": True,
}


def banners(db: Session) -> list[dict]:
    """Banners, always shaped the way the storefront expects them.

    A banner written from the CMS carries only the fields the editor exposes,
    so the presentation defaults are filled in here rather than in every client.
    """
    shaped: list[dict] = []
    for row in rows_of(db, "banner"):
        media = row.get("mediaUrl") or row.get("image") or row.get("imageUrl") or ""
        shaped.append({
            **row,
            "kind": row.get("kind") or "image",
            "eyebrow": row.get("eyebrow") or "",
            "headline": row.get("headline") or "",
            "body": row.get("body") or "",
            "ctaLabel": row.get("ctaLabel") or "Shop now",
            "ctaHref": row.get("ctaHref") or "/browse",
            "secondaryLabel": row.get("secondaryLabel") or "",
            "secondaryHref": row.get("secondaryHref") or "",
            "accent": row.get("accent") or "#c8ff3d",
            "mediaUrl": media,
            "image": media,
            "posterNote": row.get("posterNote") or "",
            "duration": int(row.get("duration") or 7000),
            "overlay": {**DEFAULT_OVERLAY, **(row.get("overlay") or {})},
            "active": row.get("active", True),
            "position": int(row.get("position") or row.get("order") or 0),
        })
    return shaped


def find_product(db: Session, value: str) -> Optional[dict]:
    return next((p for p in products(db) if p.get("id") == value or p.get("slug") == value), None)


# Readable aliases: the endpoints think in "rows", the domain thinks in entities.
product_rows = products
merchant_rows = merchants


def find_merchant(db: Session, value: str) -> Optional[dict]:
    return next((m for m in merchants(db) if m.get("id") == value or m.get("slug") == value), None)


def find_category(db: Session, value: str) -> Optional[dict]:
    return next((c for c in categories(db) if c.get("slug") == value or c.get("id") == value), None)


def find_collection(db: Session, value: str) -> Optional[dict]:
    return next((c for c in collections(db) if c.get("slug") == value or c.get("id") == value), None)


def store_card(db: Session, merchant: dict) -> dict:
    owned = [p for p in products(db) if p.get("merchantId") == merchant.get("id")]
    return {
        **merchant,
        "productCount": len(owned),
        "categories": sorted({p.get("category") for p in owned if p.get("category")}),
    }


def media_for(db: Session, owner_type: str, owner_id: str) -> list[dict]:
    rows = db.scalars(
        select(MediaAsset).where(MediaAsset.owner_type == owner_type, MediaAsset.owner_id == owner_id)
    ).all()
    return [media_json(m) for m in rows]


def media_json(m: MediaAsset) -> dict:
    return {
        "id": m.id, "ownerType": m.owner_type, "ownerId": m.owner_id, "kind": m.kind,
        "url": m.url, "publicId": m.public_id, "alt": m.alt, "folder": m.folder,
        "width": m.width, "height": m.height, "bytes": m.bytes, "createdAt": iso(m.created_at),
    }


# ── Cart ───────────────────────────────────────────────────────────────────

def line_key(line: dict) -> str:
    return f"{line['productId']}::{line.get('variant') or ''}"


def cart_for(db: Session, user_id: Optional[str], cart_id: Optional[str]) -> Optional[Cart]:
    if user_id:
        cart = db.scalar(select(Cart).where(Cart.user_id == user_id))
        if cart:
            return cart
    if cart_id:
        cart = db.get(Cart, cart_id)
        if cart:
            return cart
        cart = Cart(id=cart_id, user_id=user_id, lines=[])
        db.add(cart)
        db.flush()
        return cart
    if user_id:
        cart = Cart(id=new_id("cart"), user_id=user_id, lines=[])
        db.add(cart)
        db.flush()
        return cart
    return None


def cart_payload(db: Session, cart: Optional[Cart]) -> dict:
    lines: list[dict] = []
    grouped: dict[str, list[dict]] = {}
    if cart:
        for raw in cart.lines or []:
            product = find_product(db, raw["productId"])
            if not product:
                continue
            item = {
                "key": line_key(raw), "product": product, "productId": product["id"],
                "image": (product.get("images") or [None])[0],
                "slug": product.get("slug"),
                "variant": raw.get("variant"), "qty": raw["qty"],
                "unitPrice": product["price"],
                "lineTotal": round(product["price"] * raw["qty"], 2),
                "inStock": (product.get("stock") or 0) > 0,
            }
            lines.append(item)
            grouped.setdefault(product["merchantId"], []).append(item)

    subtotal = round(sum(line["lineTotal"] for line in lines), 2)
    free_shipping = subtotal >= FREE_SHIPPING_OVER
    groups = []
    for merchant_id, items in grouped.items():
        merchant = find_merchant(db, merchant_id)
        card = store_card(db, merchant) if merchant else {"id": merchant_id}
        for item in items:
            item["merchant"] = card
        groups.append({
            "merchant": card,
            "items": items,
            "subtotal": round(sum(item["lineTotal"] for item in items), 2),
            "shipping": 0.0 if free_shipping else 6.5,
            "freeShipping": free_shipping,
        })
    shipping = 0.0 if subtotal >= FREE_SHIPPING_OVER else sum(g["shipping"] for g in groups)
    tax = round(subtotal * TAX_RATE, 2)
    return {
        "cartId": cart.id if cart else None, "lines": lines, "merchants": groups,
        "count": sum(line["qty"] for line in lines), "distinctItems": len(lines),
        "subtotal": subtotal, "shipping": shipping, "tax": tax,
        "total": round(subtotal + shipping + tax, 2), "freeShippingOver": FREE_SHIPPING_OVER,
    }


# ── Promotions ─────────────────────────────────────────────────────────────

def sale_status(sale: FlashSale) -> str:
    if sale.status == "draft":
        return "draft"
    current = now()
    if aware(sale.ends_at) < current:
        return "ended"
    if aware(sale.starts_at) > current:
        return "scheduled"
    return "live"


def active_sale_price(db: Session, product_id: str) -> Optional[dict]:
    """The best live flash-sale price for a product, or None."""
    for sale in db.scalars(select(FlashSale)).all():
        if sale_status(sale) != "live":
            continue
        for item in db.scalars(select(FlashSaleItem).where(FlashSaleItem.sale_id == sale.id)).all():
            if item.product_id != product_id:
                continue
            if item.quantity_limit and item.sold_quantity >= item.quantity_limit:
                continue
            return {
                "id": sale.id, "name": sale.name, "headline": sale.headline,
                "endsAt": iso(sale.ends_at), "price": item.sale_price,
                "quantityLimit": item.quantity_limit, "soldQuantity": item.sold_quantity,
            }
    return None


def decorated_product(db: Session, product: dict) -> dict:
    """A product with its resolved live promotion applied."""
    sale = active_sale_price(db, product["id"])
    if not sale:
        return {**product, "promotion": None}
    return {
        **product,
        "price": sale["price"],
        "compareAt": product["price"],
        "promotion": {
            "type": "flash_sale", "id": sale["id"], "title": sale["name"],
            "headline": sale["headline"], "endsAt": sale["endsAt"],
        },
    }


def decorate(db: Session, items: list[dict]) -> list[dict]:
    return [decorated_product(db, item) for item in items]


# ── Seeding ────────────────────────────────────────────────────────────────

def _catalogue_rows() -> dict:
    return json.loads(SEED_PATH.read_text())


def seed(db: Session) -> None:
    """Populate the storefront once. Idempotent: never reseeds a live catalogue."""
    if db.scalar(select(Catalog.key).limit(1)):
        _seed_staff(db)
        return

    data = _catalogue_rows()

    for row in data.get("categories", []):
        put_row(db, "category", row["slug"], {
            **row,
            "id": row.get("id", row["slug"]),
            "image": row.get("image") or catalogue_image("categories", row["slug"]) or placeholder(f"cat-{row['slug']}"),
            "imageUrl": row.get("imageUrl") or catalogue_image("categories", row["slug"]) or placeholder(f"cat-{row['slug']}"),
            "showInNav": row.get("showInNav", True),
            "showAsTile": row.get("showAsTile", True),
            "showAsText": row.get("showAsText", False),
            "position": row.get("position", 0),
            "visible": row.get("visible", True),
        })
    for row in data.get("collections", []):
        put_row(db, "collection", row["slug"], {
            **row,
            "id": row.get("id", row["slug"]),
            "image": row.get("image") or catalogue_image("collections", row["slug"]) or placeholder(f"col-{row['slug']}"),
            "visible": row.get("visible", True),
            "position": row.get("position", 0),
        })
    for row in data.get("merchants", []):
        put_row(db, "merchant", row["slug"], {
            **row,
            "logo": row.get("logo") or catalogue_image("merchants", row["slug"]) or placeholder(f"logo-{row['slug']}"),
            "cover": row.get("cover") or catalogue_image("merchants", row["slug"]) or placeholder(f"cover-{row['slug']}"),
            "marketplaceEnabled": row.get("marketplaceEnabled", True),
        })
    for row in data.get("products", []):
        merchant = next((m for m in data.get("merchants", []) if m["id"] == row["merchantId"]), None)
        seo = row.get("seo") or {}
        put_row(db, "product", row["slug"], {
            **row,
            "merchantSlug": merchant["slug"] if merchant else row["merchantId"],
            "merchantName": merchant["name"] if merchant else row["merchantId"],
            "images": row.get("images") or catalogue_images("products", row["slug"]) or [placeholder(f"{row['slug']}-{i}") for i in (1, 2, 3)],
            "collections": row.get("collections", []),
            "variants": row.get("variants", []),
            "bullets": row.get("bullets", []),
            "tags": row.get("tags", []),
            "seoTitle": row.get("seoTitle") or seo.get("title") or row["title"],
            "seoDescription": row.get("seoDescription") or seo.get("description") or row.get("description", "")[:155],
            "updatedAt": row.get("createdAt", iso(now())),
        })
    for index, row in enumerate(data.get("banners", [])):
        banner_id = row.get("id", f"banner-{index + 1}")
        # The seed ships SVG stand-ins under /banners/ that are not served; the
        # bundled photograph replaces them.
        bundled = catalogue_image("banners", banner_id)
        existing = str(row.get("image") or row.get("mediaUrl") or "")
        legacy_poster = any(str(row.get(field) or "").startswith("/banners/") for field in ("image", "imageUrl", "mediaUrl"))
        if bundled and (not existing or legacy_poster):
            existing = bundled
        put_row(db, "banner", banner_id, {
            **row,
            "id": banner_id,
            "kind": "image" if legacy_poster else (row.get("kind") or "image"),
            "image": existing or placeholder(f"banner-{index + 1}"),
            "imageUrl": existing or placeholder(f"banner-{index + 1}"),
            "mediaUrl": existing or placeholder(f"banner-{index + 1}"),
            "videoUrl": None if legacy_poster else (row.get("videoUrl") or (row.get("mediaUrl") if row.get("kind") == "video" else None)),
            "position": row.get("order", index + 1),
            "active": row.get("active", True),
            "status": "published",
        })

    # ── Storefront pages ─────────────────────────────────────────────────
    # One document per page. The CMS lists these, opens one, and edits the
    # sections inside it; the storefront renders those sections in this order,
    # dropping any that is switched off. Section fields are the ones the editor
    # exposes: media, copy, buttons, position and visibility.
    def storefront_page(doc_id: str, doc_type: str, title: str, sections: list) -> None:
        document = ContentDocument(
            id=doc_id, owner_type="platform", owner_id="platform",
            document_type=doc_type, title=title, status="published",
            data={"sections": sections},
        )
        db.add(document)
        db.add(ContentVersion(id=new_id("ver"), document_id=document.id, version=1,
                              status="published", data=document.data,
                              note="Initial content", created_by="seed"))

    storefront_page(
        "doc_marketplace_home", "marketplace_home", "Homepage",
        [
            {
                "id": "sec_hero", "type": "hero_banner", "name": "Hero banner",
                "eyebrow": "Autumn on Ferixas",
                "title": "Seven merchants. One cart. One checkout.",
                "subtitle": "Audio, tailoring, home, gaming and pantry goods, bought once and shipped by each seller.",
                "ctaLabel": "Shop the marketplace", "ctaHref": "/browse",
                "secondaryLabel": "Meet the stores", "secondaryHref": "/stores",
                "bannerIds": ["bnr_launch", "bnr_delivery", "bnr_official"],
                "align": "left", "vertical": "middle", "tone": "dark", "scrim": 55,
                "showText": True, "showButtons": True, "duration": 7000, "width": 44,
                "position": 1, "visible": True,
            },
            {"id": "sec_promo", "type": "promo_strip", "name": "Promo strip",
             "message": "Free delivery over $120 · 30-day returns",
             "position": 2, "visible": True},
            {"id": "sec_categories", "type": "category_grid", "name": "Department tiles",
             "title": "Shop by department", "subtitle": "Ten departments, one checkout",
             "limit": 10, "showAsTile": True, "position": 3, "visible": True},
            {"id": "sec_brands", "type": "brand_carousel", "name": "Brand row",
             "title": "Shop by brand", "subtitle": "Verified makers across the marketplace",
             "limit": 8, "layout": "slider", "position": 4, "visible": True},
            {"id": "sec_flash", "type": "product_carousel", "name": "Today's deals",
             "title": "Today's deals", "subtitle": "Limited windows, limited stock",
             "source": "flash", "limit": 8, "position": 5, "visible": True},
            {"id": "sec_trending", "type": "product_carousel", "name": "Trending",
             "title": "Trending this week", "subtitle": "What shoppers are buying",
             "source": "trending", "limit": 8, "position": 6, "visible": True},
            {"id": "sec_stores", "type": "featured_stores", "name": "Stores worth following",
             "title": "Stores worth following", "subtitle": "Verified merchants across the platform",
             "limit": 3, "layout": "rows", "showFollow": True, "position": 7, "visible": True},
            {"id": "sec_footer", "type": "footer", "name": "Footer",
             "position": 8, "visible": True},
        ],
    )

    storefront_page(
        "doc_marketplace_explore", "marketplace_explore", "Explore",
        [
            {"id": "sec_explore_hero", "type": "hero_slim", "name": "Explore banner",
             "eyebrow": "This week on Ferixas", "title": "Audio, up to 30% off",
             "ctaLabel": "Shop the deals", "ctaHref": "/browse?onSale=1",
             "height": 150, "position": 1, "visible": True},
            {"id": "sec_explore_grid", "type": "product_grid", "name": "Product list",
             "columns": 4, "perPage": 24, "adEvery": 6, "position": 2, "visible": True},
            {"id": "sec_explore_brands", "type": "brand_carousel", "name": "Brand row",
             "title": "Shop by brand", "limit": 8, "position": 3, "visible": True},
        ],
    )

    storefront_page(
        "doc_marketplace_product", "marketplace_product", "Product page",
        [
            {"id": "sec_gallery", "type": "product_gallery", "name": "Gallery",
             "position": 1, "visible": True},
            {"id": "sec_buybox", "type": "buy_box", "name": "Buy box",
             "position": 2, "visible": True},
            {"id": "sec_delivery", "type": "delivery_block", "name": "Delivery and returns",
             "position": 3, "visible": True},
            {"id": "sec_reviews", "type": "reviews", "name": "Reviews", "verifiedOnly": True,
             "position": 4, "visible": True},
            {"id": "sec_related", "type": "product_carousel", "name": "More like this",
             "source": "related", "limit": 8, "position": 5, "visible": True},
        ],
    )

    demo = User(id="usr_demo", name="Ferixas Demo Shopper", email="demo@ferixas.com",
                password_hash=hash_password(DEMO_PASSWORD),
                settings={"language": "English", "currency": "USD", "marketingEmails": True,
                          "orderEmails": True, "smsUpdates": False, "profilePublic": False})
    db.add(demo)
    db.add(Wishlist(id="wish_demo", user_id=demo.id, product_ids=[]))

    # A launch flash sale so the promotion engine has real data to resolve.
    sale = FlashSale(
        id="sale_launch", name="Launch Week Drop", headline="Up to 20% off for a limited window",
        banner_url=placeholder("flash-launch"), status="scheduled",
        starts_at=now(), ends_at=now() + timedelta(days=14),
    )
    db.add(sale)
    for index, product in enumerate(data.get("products", [])[:6]):
        db.add(FlashSaleItem(
            id=new_id("fsi"), sale_id=sale.id, product_id=product["id"],
            merchant_id=product["merchantId"],
            sale_price=round(product["price"] * 0.8, 2), quantity_limit=25, sold_quantity=index * 3,
        ))

    db.commit()
    _seed_staff(db)


def _seed_staff(db: Session) -> None:
    """Create merchant and operator sign-ins once."""
    if db.scalar(select(StaffUser.id).limit(1)):
        return
    for merchant in merchants(db):
        email = f"owner@{merchant['slug']}.ferixas.com"
        db.add(StaffUser(
            id=new_id("stf"), subject_type="merchant", subject_id=merchant["id"],
            name=f"{merchant['name']} owner", email=email, password_hash=hash_password(DEMO_PASSWORD),
            role="merchant", permissions=permissions_for("merchant"),
        ))
    for email, name, role in (
        ("info@ferixas.com", "Ferixas Platform Owner", "owner"),
        ("admin@ferixas.com", "Platform Administrator", "admin"),
        ("ops@ferixas.com", "Operations Desk", "ops"),
        ("content@ferixas.com", "Content Desk", "content"),
    ):
        db.add(StaffUser(
            id=new_id("stf"), subject_type="admin", subject_id="platform",
            name=name, email=email, password_hash=hash_password(DEMO_PASSWORD),
            role=role, permissions=permissions_for(role),
        ))
    db.commit()


def ensure_seed() -> None:
    Base.metadata.create_all(engine)
    with SessionLocal() as db:
        seed(db)

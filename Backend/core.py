"""Shared database, models and helpers for the Ferixas commerce API.

Neon PostgreSQL is the application source of truth. A database URL must be
explicitly configured; the application never silently creates a local database.
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
from sqlalchemy import DateTime, ForeignKey, JSON, String, Text, create_engine, inspect, select
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, sessionmaker

# The section contract. Everything that decides what a CMS section is, how its
# products are chosen and when it is live reads this one module.
from cms_sections import (ALL_SOURCES, PRODUCT_SECTION_TYPES, is_manual_product_section,
                          placement_is_live, section_is_live)

# ── Configuration ──────────────────────────────────────────────────────────

DATABASE_URL = os.getenv("DATABASE_URL", "").strip()
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL must be configured for the hosted PostgreSQL database.")
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+psycopg://", 1)
if DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg://", 1)

engine = create_engine(DATABASE_URL, pool_pre_ping=True, future=True)
SessionLocal = sessionmaker(bind=engine, expire_on_commit=False)

FREE_SHIPPING_OVER = 120.0
TAX_RATE = 0.075
SESSION_DAYS = 7             # the absolute life of a session, never extended
SESSION_IDLE_MINUTES = 60     # untouched for this long and the session is dead
ROOT = Path(__file__).resolve().parent
# Privileged credentials are never sourced from source-controlled data fixtures.
# Test environments may provide an explicit password through the process environment.
TEST_STAFF_PASSWORD = os.getenv("FERIXAS_TEST_STAFF_PASSWORD", "").strip()
BOOTSTRAP_SECRET = os.getenv("FERIXAS_BOOTSTRAP_SECRET", "").strip()
ENVIRONMENT = os.getenv("FERIXAS_ENV", os.getenv("ENVIRONMENT", "development")).strip().lower()
PRODUCTION_ENVIRONMENTS = {"production", "prod"}
SCHEMA_VERSION = 5
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
    last_seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class StaffUser(Base):
    """Merchant or platform operator sign-in. One table, two subject types."""
    __tablename__ = "staff_users"
    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    subject_type: Mapped[str] = mapped_column(String(20), index=True)  # merchant | admin
    subject_id: Mapped[str] = mapped_column(String(60), index=True)    # merchant id, or "platform"
    name: Mapped[str] = mapped_column(String(160))
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(256))
    # No access until a role is granted. This previously defaulted to "owner",
    # so any staff row created without naming a role was a full-access account.
    role: Mapped[str] = mapped_column(String(40), default="")
    permissions: Mapped[list] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class StaffSession(Base):
    __tablename__ = "staff_sessions"
    token: Mapped[str] = mapped_column(String(96), primary_key=True)
    staff_id: Mapped[str] = mapped_column(ForeignKey("staff_users.id"), index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    # Touched by the silent refresh. A session untouched for the idle window is
    # refused even while it is inside its absolute life.
    last_seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class Catalog(Base):
    """Catalogue records: products, categories, collections, merchants, banners."""
    __tablename__ = "catalog_records"
    key: Mapped[str] = mapped_column(String(180), primary_key=True)
    kind: Mapped[str] = mapped_column(String(30), index=True)
    slug: Mapped[str] = mapped_column(String(180), index=True)
    data: Mapped[dict] = mapped_column(JSON)

    # Approval workflow & isolation
    status: Mapped[Optional[str]] = mapped_column(String(30), nullable=True, default="pending_review")
    owner_type: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    rejection_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Shipping & Product Details
    shipping_amount: Mapped[Optional[float]] = mapped_column(nullable=True)
    estimated_delivery_days: Mapped[Optional[int]] = mapped_column(nullable=True)
    package_weight: Mapped[Optional[float]] = mapped_column(nullable=True)
    package_dimensions: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    shipping_origin: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)

    # Seller Profile fields (if kind == "merchant")
    follower_count: Mapped[int] = mapped_column(default=0)
    total_reviews: Mapped[int] = mapped_column(default=0)
    average_rating: Mapped[float] = mapped_column(default=0.0)
    success_rate: Mapped[float] = mapped_column(default=0.0)
    delivery_rate: Mapped[float] = mapped_column(default=0.0)


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

    #: The library fields. A file is identified by its bytes, not its name,
    #: so the same image can never be stored twice by accident.
    label: Mapped[str] = mapped_column(String(200), default="")
    tags: Mapped[list] = mapped_column(JSON, default=list)
    origin_page: Mapped[str] = mapped_column(String(40), default="", index=True)
    origin_section: Mapped[str] = mapped_column(String(60), default="")
    content_hash: Mapped[str] = mapped_column(String(64), default="", index=True)
    perceptual_hash: Mapped[str] = mapped_column(String(32), default="")


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


class MerchantProfileRequest(Base):
    """Auditable seller-proposed profile snapshots; public data changes only on approval."""
    __tablename__ = "merchant_profile_requests"
    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    merchant_id: Mapped[str] = mapped_column(String(60), index=True)
    profile: Mapped[dict] = mapped_column(JSON, default=dict)
    status: Mapped[str] = mapped_column(String(30), default="pending_review", index=True)
    note: Mapped[str] = mapped_column(Text, default="")
    submitted_by: Mapped[str] = mapped_column(String(320), default="")
    submitted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    reviewed_by: Mapped[str] = mapped_column(String(320), default="")
    reviewed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)



class SectionPlacement(Base):
    """A product placed in a named section of a page.

    A product is not simply "on the homepage". It sits in a named section, and each
    placement can carry its own price, quantity and window - which is how the same
    product is $189 in Today's deals and $249 in Trending, and how a shopper pays
    according to the section they bought from rather than the page they were on.

    Types are inferred from the annotations, so this needs no new import.
    """

    __tablename__ = "section_placements"
    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    product_id: Mapped[str] = mapped_column(String(60), index=True)
    product_slug: Mapped[str] = mapped_column(String(180), index=True)
    document_id: Mapped[str] = mapped_column(String(60), index=True)
    section_id: Mapped[str] = mapped_column(String(60), index=True)
    section_type: Mapped[str] = mapped_column(String(40), default="")
    price: Mapped[float] = mapped_column(default=0.0)
    compare_at: Mapped[float] = mapped_column(default=0.0)
    quantity: Mapped[int] = mapped_column(default=0)
    position: Mapped[int] = mapped_column(default=1)
    starts_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    ends_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    config: Mapped[dict] = mapped_column(JSON, default=dict)
    #: Switched off by a person without losing the assignment: the one-click way
    #: back for a product whose own window has run out in this section.
    active: Mapped[bool] = mapped_column(default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

class Section(Base):
    """A CMS section as a row, not only a node inside a page document.

    The page document stays the published artefact: publish, restore and the
    version history all operate on it. This table is the same sections,
    materialised, so a placement can be checked against a real record, a
    section can be listed without parsing every document, and "which sections
    hold this product" is a join rather than a scan through JSON.

    The table is a projection, never a second source of truth:
    ``sync_document_sections`` rewrites it from the document, so it can always
    be rebuilt and cannot drift.
    """

    __tablename__ = "sections"
    document_id: Mapped[str] = mapped_column(String(60), primary_key=True)
    section_id: Mapped[str] = mapped_column(String(60), primary_key=True)
    status: Mapped[str] = mapped_column(String(20), primary_key=True, default="published")
    document_type: Mapped[str] = mapped_column(String(40), default="", index=True)
    type: Mapped[str] = mapped_column(String(40), default="", index=True)
    name: Mapped[str] = mapped_column(String(200), default="")
    position: Mapped[int] = mapped_column(default=0)
    visible: Mapped[bool] = mapped_column(default=True)
    selection_mode: Mapped[str] = mapped_column(String(20), default="")
    source: Mapped[str] = mapped_column(String(40), default="")
    presentation: Mapped[str] = mapped_column(String(40), default="")
    version: Mapped[int] = mapped_column(default=0)
    settings: Mapped[dict] = mapped_column(JSON, default=dict)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


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


class SchemaVersion(Base):
    """Singleton schema version used to make readiness explicit and fail closed."""
    __tablename__ = "schema_versions"
    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    version: Mapped[int] = mapped_column(default=0)
    applied_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


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
    # The administrator runs the platform; the owner governs it. Everything
    # operational is here, but "settings.manage" is deliberately NOT: that one
    # permission is what opens Team and roles and Settings, so creating accounts,
    # granting roles and changing the platform's own configuration stay with the
    # owner. Without this difference the two roles were indistinguishable, since
    # the administrator's list was otherwise the owner's.
    "admin": [
        "cms.manage", "catalog.manage", "media.manage", "merchant.approve",
        "merchant.view", "customer.view", "orders.view", "orders.manage",
        "payments.view", "payouts.view", "analytics.view",
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

    # Past its absolute life: the row is deleted, not just refused.
    if aware(row.expires_at) < now():
        db.delete(row)
        db.commit()
        return None

    # Untouched for too long: dead even inside the seven days. Guarded with
    # getattr so a database that has not yet been migrated degrades to working
    # rather than failing.
    seen = getattr(row, "last_seen_at", None)
    if seen is not None and aware(seen) + timedelta(minutes=SESSION_IDLE_MINUTES) < now():
        db.delete(row)
        db.commit()
        return None

    staff = db.get(StaffUser, row.staff_id)
    if not staff or staff.subject_type != subject_type:
        return None
    return staff


def rotate_staff_session(db: Session, row: StaffSession, staff_id: str) -> str:
    """Issue a fresh token and retire the previous one.

    The new session inherits the ORIGINAL expiry, so refreshing every minute
    never extends the absolute life of a session - it only shrinks the window in
    which a stolen token is worth anything.
    """
    import secrets

    token = secrets.token_urlsafe(32)
    expires = row.expires_at
    db.delete(row)
    db.add(StaffSession(token=token, staff_id=staff_id, expires_at=expires, last_seen_at=now()))
    db.commit()
    return token


def refresh_staff_session(db: Session, token: Optional[str], subject_type: str) -> Optional[dict]:
    """Validate a token, rotate it, and report the session's original end."""
    staff = staff_from_token(db, token, subject_type)
    if not staff:
        return None
    row = db.get(StaffSession, token)
    if not row:
        return None
    expires = row.expires_at
    fresh = rotate_staff_session(db, row, staff.id)
    return {"token": fresh, "staff": staff, "expiresAt": expires}


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
    
    # Extract fields that belong to Catalog columns to keep them in sync
    status = data.get("status")
    owner_type = data.get("owner_type") or data.get("origin")
    rejection_reason = data.get("rejection_reason")
    shipping_amount = data.get("shipping_amount")
    estimated_delivery_days = data.get("estimated_delivery_days")
    package_weight = data.get("package_weight")
    package_dimensions = data.get("package_dimensions")
    shipping_origin = data.get("shipping_origin")
    follower_count = data.get("follower_count")
    total_reviews = data.get("total_reviews")
    average_rating = data.get("average_rating")
    success_rate = data.get("success_rate")
    delivery_rate = data.get("delivery_rate")

    if row:
        # Merge existing data with new data to prevent wiping out old fields (Fix Data Wipeout Bug)
        merged_data = {**(row.data or {}), **data}
        row.data = merged_data
        
        # Update specific columns if present in data
        if status is not None:
            row.status = status
        if owner_type is not None:
            row.owner_type = owner_type
        if rejection_reason is not None:
            row.rejection_reason = rejection_reason
        if shipping_amount is not None:
            row.shipping_amount = shipping_amount
        if estimated_delivery_days is not None:
            row.estimated_delivery_days = estimated_delivery_days
        if package_weight is not None:
            row.package_weight = package_weight
        if package_dimensions is not None:
            row.package_dimensions = package_dimensions
        if shipping_origin is not None:
            row.shipping_origin = shipping_origin
        if follower_count is not None:
            row.follower_count = follower_count
        if total_reviews is not None:
            row.total_reviews = total_reviews
        if average_rating is not None:
            row.average_rating = average_rating
        if success_rate is not None:
            row.success_rate = success_rate
        if delivery_rate is not None:
            row.delivery_rate = delivery_rate
    else:
        db.add(Catalog(
            key=key, kind=kind, slug=slug, data=data,
            status=status or ("pending_review" if kind == "product" else None),
            owner_type=owner_type,
            rejection_reason=rejection_reason,
            shipping_amount=shipping_amount,
            estimated_delivery_days=estimated_delivery_days,
            package_weight=package_weight,
            package_dimensions=package_dimensions,
            shipping_origin=shipping_origin,
            follower_count=follower_count or 0,
            total_reviews=total_reviews or 0,
            average_rating=average_rating or 0.0,
            success_rate=success_rate or 0.0,
            delivery_rate=delivery_rate or 0.0,
        ))


def record_merchant_follow_activity(db: Session, merchant: dict, action: str, at: Optional[datetime] = None) -> None:
    """Persist anonymous daily follow counts in existing merchant JSON; never store follower identity."""
    if action not in {"follow", "unfollow"}:
        raise ValueError("Follow activity must be 'follow' or 'unfollow'")
    slug = str(merchant.get("slug") or "")
    if not slug:
        raise ValueError("Merchant slug is required to record follow activity")
    timestamp = at or now()
    # Lock the existing catalog row so simultaneous follow actions do not lose increments.
    row = db.scalar(select(Catalog).where(Catalog.kind == "merchant", Catalog.slug == slug).with_for_update())
    current = dict((row.data if row else None) or merchant)
    day = timestamp.date().isoformat()
    raw_activity = current.get("followerActivity")
    activity = dict(raw_activity) if isinstance(raw_activity, dict) else {}
    raw_bucket = activity.get(day)
    bucket = dict(raw_bucket) if isinstance(raw_bucket, dict) else {}
    try:
        previous = int(bucket.get(action, 0))
    except (TypeError, ValueError):
        previous = 0
    bucket[action] = max(0, previous) + 1
    activity[day] = bucket
    cutoff = (timestamp.date() - timedelta(days=364)).isoformat()
    current["followerActivity"] = {key: value for key, value in activity.items() if str(key) >= cutoff}
    current["followerTrackingStartedAt"] = current.get("followerTrackingStartedAt") or iso(timestamp)
    raw_recent = current.get("recentFollowerActivity")
    recent = [
        {"action": item.get("action"), "at": str(item.get("at") or "")}
        for item in (raw_recent if isinstance(raw_recent, list) else [])
        if isinstance(item, dict) and item.get("action") in {"follow", "unfollow"}
    ]
    recent.append({"action": action, "at": iso(timestamp)})
    current["recentFollowerActivity"] = recent[-30:]
    put_row(db, "merchant", slug, current)


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
    "enabled": True, "align": "left", "vertical": "bottom", "scrim": 55,
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


# ── Product filtering helpers ──────────────────────────────────────────────

def product_owner_kind(product: dict) -> str:
    """Classify a catalogue row by the intent its write path recorded.

    origin and owner_type are set explicitly by the endpoint that created the
    row; they say what the writer meant. merchantId is only an identifier and
    on this platform the same id can belong to a seller row and to the
    platform itself, so it is used only when neither marker is present.
    """
    merchant_id = str(product.get("merchantId") or "").strip().lower()
    origin = str(product.get("origin") or "").strip().lower()
    owner_type = str(product.get("owner_type") or "").strip().lower()

    # Explicit markers win: they are what the writing endpoint decided.
    if origin == "seller" or owner_type == "seller" or origin == "merchant" or owner_type == "merchant":
        return "seller"
    if origin == "platform" or owner_type == "platform" or origin == "official" or owner_type == "official":
        return "platform"

    # No explicit marker: fall back to the merchant id.
    official_ids = {"ferixas-official", "platform", "official"}
    if merchant_id in official_ids:
        return "platform"
    if merchant_id:
        return "seller"
    return "unknown"


def is_platform_product(product: dict) -> bool:
    return product_owner_kind(product) == "platform"


def is_seller_product(product: dict, merchant_id: str) -> bool:
    return product_owner_kind(product) == "seller" and str(product.get("merchantId") or "") == merchant_id


def is_seller_marketplace_product(product: dict, merchant_id: Optional[str] = None) -> bool:
    """A seller listing belongs in Ferixas only when ownership and marketplace channel are explicit."""
    channels = product.get("channels")
    if not is_seller_product(product, merchant_id or str(product.get("merchantId") or "")):
        return False
    return isinstance(channels, dict) and channels.get("marketplace") is True


def is_public_store(merchant: Optional[dict]) -> bool:
    """Canonical public seller gate shared by every shopper-facing surface."""
    return bool(merchant and str(merchant.get("status", "active")).lower() == "active"
                and merchant.get("marketplaceEnabled", True) is True)


PUBLIC_SECTION_TYPES = set(PRODUCT_SECTION_TYPES)
# The section contract lives in ``cms_sections`` so the CMS editor, the
# storefront resolver and the product-upload forms cannot drift apart. The set
# name is kept because several routers and tests import it.
CMS_PRODUCT_SOURCES = set(ALL_SOURCES)


def is_assignable_product_section(document: Optional[ContentDocument], section: dict) -> bool:
    """Whether a CMS product section is a curated placement destination.

    The Explore page's paginated product_grid is the all-products feed, not a
    curated slot. Its perPage setting distinguishes it from product grids that
    hold manually assigned products. Related-product modules and every other
    automatic source are computed from catalogue data and are not manual
    placement destinations either.
    """
    if not document or document.owner_type != "platform" or document.status == "archived":
        return False
    if not isinstance(section, dict):
        return False
    visible = section.get("visible", True)
    if visible is False or (isinstance(visible, str) and visible.strip().lower() in {"false", "0", "no"}):
        return False
    if section.get("type") not in PUBLIC_SECTION_TYPES:
        return False
    # Only a manually curated section accepts placements or appears in a
    # product-upload form. A section with no source is the legacy spelling of
    # ``assigned``, so older documents keep behaving as the curated sections
    # they were; every automatic feed computes its own membership.
    if not is_manual_product_section(section):
        return False
    if (
        document.document_type == "marketplace_explore"
        and section.get("type") == "product_grid"
        and section.get("perPage") is not None
    ):
        return False
    return True


def visible_published_sections(document: Optional[ContentDocument]) -> list[dict]:
    """Published sections that are switched on and inside their own window."""
    if not document or document.status != "published":
        return []
    sections = (document.data or {}).get("sections") or []
    return sorted([s for s in sections
                   if isinstance(s, dict) and section_visible(s) and section_is_live(s)],
                  key=lambda s: s.get("position", 0))


def public_taxonomy(row: Optional[dict]) -> bool:
    return bool(row and row.get("visible", True) is True)


def seller_promotion_product_available(db: Session, product: dict, merchant_id: str) -> bool:
    """Current ownership, approval, channel and merchant state for seller promotions."""
    return bool(is_seller_marketplace_product(product, merchant_id)
                and str(product.get("status") or "").lower() == "approved"
                and marketplace_product_available(db, product))


def approved_products(db: Session) -> list[dict]:
    """Only approved products for public marketplace display."""
    return [p for p in products(db) if marketplace_product_available(db, p)]


def is_publicly_sellable(product: dict) -> bool:
    """Whether a product may be discovered and purchased on the marketplace."""
    channels = product.get("channels") or {}
    return (
        product_owner_kind(product) in {"platform", "seller"}
        and
        str(product.get("status") or "").lower() == "approved"
        and channels.get("marketplace") is True
    )


def marketplace_product_available(db: Session, product: dict) -> bool:
    """A listing is public only while its own seller is active and marketplace-enabled."""
    if not is_publicly_sellable(product):
        return False
    merchant = find_merchant(db, str(product.get("merchantId", "")))
    return bool(merchant and merchant.get("status", "active") == "active"
                and merchant.get("marketplaceEnabled", True))


def platform_products(db: Session) -> list[dict]:
    """Only platform-owned products for admin catalog (Ferixas Official products)."""
    return [p for p in products(db) if is_platform_product(p)]


def seller_products(db: Session, merchant_id: str) -> list[dict]:
    """Only explicit Ferixas marketplace listings owned by a specific seller."""
    return [p for p in products(db) if is_seller_marketplace_product(p, merchant_id)]


def seller_catalog_products(db: Session, merchant_id: str) -> list[dict]:
    """All seller-owned records managed by Ferixas, including hidden/archived listings."""
    return [p for p in products(db) if is_seller_product(p, merchant_id)]


def pending_products(db: Session) -> list[dict]:
    """Seller submissions awaiting the explicit admin review gate."""
    return [p for p in products(db) if is_seller_marketplace_product(p) and p.get("status") == "pending_review"]


def rejected_products(db: Session, merchant_id: Optional[str] = None) -> list[dict]:
    """Rejected Ferixas marketplace submissions, optionally filtered by merchant."""
    rejected = [p for p in products(db)
                if p.get("status") == "rejected" and is_seller_marketplace_product(p)]
    if merchant_id:
        rejected = [p for p in rejected if p.get("merchantId") == merchant_id]
    return rejected


def merchant_follower_count(db: Session, merchant_id: str) -> int:
    """Count actual account relationships, not legacy demo counters."""
    return sum(
        1 for settings in db.scalars(select(User.settings)).all()
        if isinstance(settings, dict) and merchant_id in (settings.get("followed_sellers") or [])
    )


def merchant_review_summary(db: Session, merchant_id: str) -> dict:
    """Aggregate persisted reviews for this seller's own products; ignore legacy counters."""
    product_ids = [p["id"] for p in seller_products(db, merchant_id) if marketplace_product_available(db, p)]
    if not product_ids:
        return {"rating": None, "reviewCount": 0, "ratingBreakdown": {}}
    ratings: list[float] = []
    breakdown = {str(star): 0 for star in range(1, 6)}
    for review in db.scalars(select(Review).where(Review.product_id.in_(product_ids))).all():
        try:
            rating = float((review.data or {}).get("rating"))
        except (TypeError, ValueError):
            continue
        if 1 <= rating <= 5:
            ratings.append(rating)
            bucket = str(int(round(rating)))
            breakdown[bucket] += 1
    return {
        "rating": round(sum(ratings) / len(ratings), 1) if ratings else None,
        "reviewCount": len(ratings),
        "ratingBreakdown": breakdown,
    }


def paid_marketplace_product_units(db: Session, days: Optional[int] = None) -> dict[str, int]:
    """Count paid, non-cancelled marketplace units; never trust legacy sold counters."""
    cutoff = now() - timedelta(days=days) if days is not None else None
    counts: dict[str, int] = {}
    paid_states = {"paid", "captured", "succeeded", "settled"}
    for row in db.scalars(select(Order)).all():
        data = dict(row.data or {})
        if str(data.get("payment") or "pending").lower() not in paid_states:
            continue
        if str(data.get("channel") or "").lower() != "marketplace":
            continue
        if str(data.get("fulfillment") or "processing").lower() == "cancelled":
            continue
        if cutoff is not None:
            placed = row.placed_at
            raw_placed = data.get("placedAt")
            if raw_placed:
                try:
                    placed = datetime.fromisoformat(str(raw_placed).replace("Z", "+00:00"))
                except (TypeError, ValueError):
                    pass
            if aware(placed) < cutoff:
                continue
        for item in data.get("items") or []:
            if not isinstance(item, dict):
                continue
            product_id = str(item.get("productId") or item.get("product_id") or "")
            if not product_id:
                continue
            try:
                quantity = max(0, int(item.get("qty", 0)))
            except (TypeError, ValueError):
                quantity = 0
            counts[product_id] = counts.get(product_id, 0) + quantity
    return counts


def store_card(db: Session, merchant: dict) -> dict:
    merchant_id = str(merchant.get("id") or "")
    owned = [p for p in seller_products(db, merchant_id) if marketplace_product_available(db, p)]
    followers = merchant_follower_count(db, merchant_id)
    reviews = merchant_review_summary(db, merchant_id)
    # Seller theme/domain settings are private workspace configuration. The
    # Ferixas marketplace renders its own profile shell and only exposes the
    # approved profile fields below.
    public_fields = ("id", "slug", "name", "tagline", "location", "verified", "since", "logo", "image", "about")
    return {
        **{key: merchant[key] for key in public_fields if key in merchant},
        "brand": {
            "template": "FERIXAS", "canvas": "#fbf8f2", "surface": "#ffffff",
            "ink": "#17242e", "muted": "#6c7882", "accent": "#e4572e",
            "accentInk": "#ffffff", "displayFont": "", "radius": 12, "hero": "",
        },
        **({"businessEmail": merchant.get("businessEmail", "")} if merchant.get("showBusinessEmail") and merchant.get("businessEmail") else {}),
        **({"businessPhone": merchant.get("businessPhone", "")} if merchant.get("showPhone") and merchant.get("businessPhone") else {}),
        "productCount": len(owned),
        "categories": sorted({p.get("category") for p in owned if p.get("category")}),
        "followers": followers,
        "follower_count": followers,
        "rating": reviews["rating"],
        "reviewCount": reviews["reviewCount"],
        "average_rating": reviews["rating"],
        "total_reviews": reviews["reviewCount"],
    }


def media_for(db: Session, owner_type: str, owner_id: str) -> list[dict]:
    rows = db.scalars(
        select(MediaAsset).where(MediaAsset.owner_type == owner_type, MediaAsset.owner_id == owner_id)
    ).all()
    return [media_json(m) for m in rows]


def _media_json_base(m: MediaAsset) -> dict:
    return {
        "id": m.id, "ownerType": m.owner_type, "ownerId": m.owner_id, "kind": m.kind,
        "url": m.url, "publicId": m.public_id, "alt": m.alt, "folder": m.folder,
        "width": m.width, "height": m.height, "bytes": m.bytes, "createdAt": iso(m.created_at),
    }


# ── Cart ───────────────────────────────────────────────────────────────────

def line_key(line: dict) -> str:
    base = f"{line['productId']}::{line.get('variant') or ''}"
    document_id = str(line.get("documentId") or "")
    section_id = str(line.get("sectionId") or "")
    # Preserve old unscoped keys for existing carts and security-sensitive callers.
    return f"{base}::{document_id}::{section_id}" if document_id and section_id else base


def cart_for(db: Session, user_id: Optional[str], cart_id: Optional[str]) -> Optional[Cart]:
    """Resolve only an authenticated owner's cart; never attach a caller to another cart."""
    if not user_id:
        raise HTTPException(401, "Sign in to use a cart")
    owned = db.scalar(select(Cart).where(Cart.user_id == user_id))
    if cart_id:
        requested = db.get(Cart, cart_id)
        if requested and requested.user_id != user_id:
            raise HTTPException(403, "That cart does not belong to your account")
        if requested:
            return requested
    if owned:
        return owned
    cart = Cart(id=cart_id or new_id("cart"), user_id=user_id, lines=[])
    db.add(cart)
    db.flush()
    return cart


def cart_payload(db: Session, cart: Optional[Cart]) -> dict:
    lines: list[dict] = []
    grouped: dict[str, list[dict]] = {}
    if cart:
        for raw in cart.lines or []:
            product = find_product(db, raw["productId"])
            if not product or not marketplace_product_available(db, product):
                continue
            price_product = decorate(db, [product])[0]
            unit_price = float(price_product["price"])
            document_id = str(raw.get("documentId") or "")
            section_id = str(raw.get("sectionId") or "")
            section_unavailable = False
            section_label = None
            if document_id and section_id:
                placement = db.scalar(select(SectionPlacement).where(
                    SectionPlacement.product_id == product["id"],
                    SectionPlacement.document_id == document_id,
                    SectionPlacement.section_id == section_id,
                ))
                document = db.get(ContentDocument, document_id)
                section = next((row for row in ((document.data or {}).get("sections") or [])
                                if isinstance(row, dict) and str(row.get("id") or "") == section_id), None) if document else None
                if (placement and document and document.status == "published" and section
                        and section.get("visible", True) is not False and section_is_live(section)
                        and placement_is_live(placement)):
                    if str(section.get("showSectionPrice", "true")).lower() not in {"false", "0", "no"}:
                        unit_price = float(placement.price or unit_price)
                    section_label = str((placement.config or {}).get("label") or "").strip() or None
                else:
                    # The offer is no longer current. Keep the line visible at
                    # the product's base price and block checkout until reviewed.
                    section_unavailable = True
            item = {
                "key": line_key(raw), "product": product, "productId": product["id"],
                "image": (product.get("images") or [None])[0],
                "slug": product.get("slug"),
                "variant": raw.get("variant"), "qty": raw["qty"],
                "unitPrice": unit_price,
                "lineTotal": round(unit_price * raw["qty"], 2),
                "inStock": (product.get("stock") or 0) > 0,
                "documentId": document_id or None,
                "sectionId": section_id or None,
                "sectionUnavailable": section_unavailable,
                "sectionLabel": section_label,
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
    """The best live flash-sale price for a currently valid product, or None."""
    product = find_product(db, product_id)
    if not product or not marketplace_product_available(db, product):
        return None
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


PUBLIC_PRODUCT_FIELDS = (
    "id", "slug", "title", "merchantId", "merchantName", "merchantSlug", "brandName",
    "category", "collections", "description", "bullets", "price", "compareAt", "discount",
    "variants", "plates", "images", "tags", "createdAt", "promotion",
    # Section-specific shopper data is deliberately allowlisted: these fields
    # let the CMS card and basket agree without exposing placement internals.
    "sectionId", "sectionDocumentId", "sectionPlacementId", "sectionPrice",
    "sectionLabel", "sectionBadgeColor", "sectionQuantity", "sectionRemaining",
    "basePrice", "baseCompareAt", "baseDiscount",
)


def public_product_fields(product: dict, valid_section_tags: Optional[set] = None) -> dict:
    """Return only shopper-facing listing fields; never serialize seller/admin internals.

    When ``valid_section_tags`` is provided, any section_tags on the product that
    do not appear in that set are dropped. That prunes stale tags left behind by
    a section that was renamed, replaced, or removed from the CMS.
    """
    public = {key: product[key] for key in PUBLIC_PRODUCT_FIELDS if key in product}
    if valid_section_tags is not None:
        raw_tags = product.get("section_tags") or []
        public["section_tags"] = [t for t in raw_tags if t in valid_section_tags]
    safe_variants = []
    for variant in product.get("variants") or []:
        if not isinstance(variant, dict):
            continue
        name = str(variant.get("name") or "").strip()
        values = variant.get("values") or []
        if name:
            safe_variants.append({"name": name, "values": [str(value) for value in values if value is not None]})
    public["variants"] = safe_variants
    try:
        stock = max(0, int(product.get("stock", 0)))
        low_stock_at = max(1, int(product.get("lowStockAt", 8)))
    except (TypeError, ValueError):
        stock, low_stock_at = 0, 8
    public["stockStatus"] = "out_of_stock" if stock == 0 else "limited" if stock <= low_stock_at else "in_stock"
    # The shopper needs a safe purchase ceiling, but not internal reserved-stock
    # or cost fields. This value is refreshed from the same product row used by
    # cart validation.
    public["availableQuantity"] = stock
    return public


def valid_section_tag_set(db: Session) -> set:
    """Every ``<document_id>__<section_id>`` that currently exists in the CMS.

    Used to prune stale tags from products before they reach a shopper.
    """
    tags: set = set()
    for doc in db.scalars(select(ContentDocument)).all():
        for section in (doc.data or {}).get("sections") or []:
            if isinstance(section, dict) and section.get("id"):
                tags.add(f"{doc.id}__{section['id']}")
    return tags


def public_products(db: Session, items: list[dict]) -> list[dict]:
    """Serialize marketplace products with ratings calculated from persisted reviews only."""
    if not items:
        return []
    # Compute the set of section tags that currently exist, once, so every
    # product in this batch prunes the same way. A section that has been
    # renamed or replaced leaves a stale tag on the product; pruning here
    # prevents it reaching the shopper.
    valid_tags = valid_section_tag_set(db)
    product_ids = list({str(item.get("id") or "") for item in items if item.get("id")})
    summaries: dict[str, dict] = {
        product_id: {"ratings": [], "breakdown": {str(star): 0 for star in range(1, 6)}}
        for product_id in product_ids
    }
    if product_ids:
        for review in db.scalars(select(Review).where(Review.product_id.in_(product_ids))).all():
            summary = summaries.get(str(review.product_id))
            if summary is None:
                continue
            try:
                rating = float((review.data or {}).get("rating"))
            except (TypeError, ValueError):
                continue
            if 1 <= rating <= 5:
                summary["ratings"].append(rating)
                summary["breakdown"][str(int(round(rating)))] += 1

    output = []
    for item in items:
        public = public_product_fields(item, valid_tags)
        summary = summaries.get(str(item.get("id") or ""), {"ratings": [], "breakdown": {}})
        ratings = summary["ratings"]
        public.update({
            "rating": round(sum(ratings) / len(ratings), 1) if ratings else None,
            "reviewCount": len(ratings),
            "ratingBreakdown": summary["breakdown"],
        })
        output.append(public)
    return output


def public_review_data(review: Review) -> dict:
    """Expose only customer-authored review content and a generic label, never account PII."""
    data = dict(review.data or {})
    verified = bool(data.get("verified", data.get("verifiedPurchase", False)))
    try:
        rating = int(data.get("rating", 0))
    except (TypeError, ValueError):
        rating = 0
    if rating < 1 or rating > 5:
        rating = 0
    try:
        helpful = max(0, int(data.get("helpful", 0)))
    except (TypeError, ValueError):
        helpful = 0
    return {
        "id": review.id,
        "productId": review.product_id,
        "rating": rating,
        "title": str(data.get("title") or ""),
        "body": str(data.get("body") or data.get("comment") or ""),
        "date": str(data.get("date") or data.get("createdAt") or ""),
        "verified": verified,
        "helpful": helpful,
        "author": "Verified buyer" if verified else "Ferixas customer",
    }


def migrate() -> None:
    """Apply idempotent schema changes and fail closed on every required error."""
    from sqlalchemy import text
    inspector = inspect(engine)
    tables = set(inspector.get_table_names())
    if "schema_versions" not in tables:
        SchemaVersion.__table__.create(bind=engine, checkfirst=True)
        inspector = inspect(engine)
        tables = set(inspector.get_table_names())
    stamp = "TIMESTAMP WITH TIME ZONE" if engine.dialect.name.startswith("postgres") else "TIMESTAMP"
    required = {
        "staff_sessions": {"last_seen_at": f"{stamp}"}, "sessions": {"last_seen_at": f"{stamp}"},
        "catalog_records": {"status": "VARCHAR(30)", "owner_type": "VARCHAR(20)",
          "rejection_reason": "TEXT", "shipping_amount": "FLOAT", "estimated_delivery_days": "INTEGER",
          "package_weight": "FLOAT", "package_dimensions": "VARCHAR(100)", "shipping_origin": "VARCHAR(200)",
          "follower_count": "INTEGER DEFAULT 0", "total_reviews": "INTEGER DEFAULT 0",
          "average_rating": "FLOAT DEFAULT 0.0", "success_rate": "FLOAT DEFAULT 0.0", "delivery_rate": "FLOAT DEFAULT 0.0"},
        # A placement can be switched off without being deleted.
        "section_placements": {"active": "BOOLEAN DEFAULT TRUE"},
        # The library: identity by content, and where a file came from.
        "media_assets": {"label": "VARCHAR(200)", "tags": "JSON", "origin_page": "VARCHAR(40)",
                         "origin_section": "VARCHAR(60)", "content_hash": "VARCHAR(64)",
                         "perceptual_hash": "VARCHAR(32)"},
    }
    with engine.begin() as connection:
        for table, columns in required.items():
            # A table that create_all has not made yet is skipped, not fatal.
            if table not in inspect(connection).get_table_names():
                continue
            existing = {col["name"] for col in inspect(connection).get_columns(table)}
            for name, sql_type in columns.items():
                if name not in existing:
                    connection.execute(text(f"ALTER TABLE {table} ADD COLUMN {name} {sql_type}"))
        version = connection.execute(text("SELECT version FROM schema_versions WHERE id = 'current'" )).scalar()
        if version is None:
            connection.execute(text("INSERT INTO schema_versions (id, version, applied_at) VALUES ('current', :version, CURRENT_TIMESTAMP)"), {"version": SCHEMA_VERSION})
        elif int(version) > SCHEMA_VERSION:
            raise RuntimeError(f"Database schema version {version} is newer than application {SCHEMA_VERSION}")
        elif int(version) < SCHEMA_VERSION:
            connection.execute(text("UPDATE schema_versions SET version = :version, applied_at = CURRENT_TIMESTAMP WHERE id = 'current'"), {"version": SCHEMA_VERSION})
    verify = inspect(engine)
    present = set(verify.get_table_names())
    if not all(name in {c["name"] for c in verify.get_columns(table)}
               for table, columns in required.items() if table in present for name in columns):
        raise RuntimeError("Required schema columns are missing after migration")

def schema_ready() -> bool:
    try:
        row = SessionLocal().scalar(select(SchemaVersion).where(SchemaVersion.id == "current"))
        return bool(row and row.version == SCHEMA_VERSION)
    except Exception:
        return False

def ensure_schema() -> None:
    """Prepare the schema only. Application content is never written here."""
    Base.metadata.create_all(engine)
    migrate()


# ── Sections as rows ───────────────────────────────────────────────────────
# The page document is the artefact; `sections` is its index.

SECTION_PUBLISHED = "published"
SECTION_DRAFT = "draft"
SECTION_IDENTITY_KEYS = frozenset({"id", "type", "name", "position", "visible",
                                   "selectionMode", "source", "presentation"})


def section_visible(raw: dict) -> bool:
    """The same visibility rule the contract uses, tolerant of legacy values."""
    value = (raw or {}).get("visible", True)
    if isinstance(value, str):
        return value.strip().lower() not in {"false", "0", "no", "off", ""}
    return True if value is None else bool(value)


def section_rows_for(document, data: dict, status: str, version: int = 0) -> list:
    """The rows one page state implies, in document order."""
    rows = []
    for index, raw in enumerate((data or {}).get("sections") or []):
        if not isinstance(raw, dict):
            continue
        section_id = str(raw.get("id") or "").strip()
        if not section_id:
            continue
        settings = {key: value for key, value in raw.items() if key not in SECTION_IDENTITY_KEYS}
        try:
            position = int(raw.get("position"))
        except (TypeError, ValueError):
            position = index + 1
        rows.append({"document_id": document.id, "section_id": section_id, "status": status,
                     "document_type": str(document.document_type or ""),
                     "type": str(raw.get("type") or ""),
                     "name": str(raw.get("name") or raw.get("type") or ""),
                     "position": position, "visible": section_visible(raw),
                     "selection_mode": str(raw.get("selectionMode") or ""),
                     "source": str(raw.get("source") or ""),
                     "presentation": str(raw.get("presentation") or ""),
                     "version": int(version or 0), "settings": settings})
    return rows


def latest_draft(db: Session, document_id: str):
    return db.scalar(select(ContentVersion).where(
        ContentVersion.document_id == document_id,
        ContentVersion.status == SECTION_DRAFT,
    ).order_by(ContentVersion.version.desc()))


def sync_document_sections(db: Session, document) -> dict:
    """Rewrite this document's section rows from its published and draft data."""
    result = {"documentId": document.id, "written": 0, "removed": 0}
    draft = latest_draft(db, document.id)
    states = [(SECTION_PUBLISHED, dict(document.data or {}), 0)]
    if draft is not None:
        states.append((SECTION_DRAFT, dict(draft.data or {}), int(draft.version or 0)))

    for status, data, version in states:
        payloads = section_rows_for(document, data, status, version)
        existing = {row.section_id: row for row in db.scalars(select(Section).where(
            Section.document_id == document.id, Section.status == status)).all()}
        for payload in payloads:
            current = existing.pop(payload["section_id"], None)
            if current is None:
                db.add(Section(**payload))
            else:
                for key, value in payload.items():
                    setattr(current, key, value)
                current.updated_at = now()
            result["written"] += 1
        for gone in existing.values():
            db.delete(gone)
            result["removed"] += 1

    if draft is None:
        for stale in db.scalars(select(Section).where(
                Section.document_id == document.id, Section.status == SECTION_DRAFT)).all():
            db.delete(stale)
            result["removed"] += 1
    return result


def sync_all_sections(db: Session) -> dict:
    """Rebuild the whole index. Cheap: sections are a few hundred rows at most."""
    totals = {"documents": 0, "written": 0, "removed": 0}
    for document in db.scalars(select(ContentDocument)).all():
        part = sync_document_sections(db, document)
        totals["documents"] += 1
        totals["written"] += part["written"]
        totals["removed"] += part["removed"]
    return totals


def published_section_keys(db: Session) -> set:
    return {(row.document_id, row.section_id) for row in db.scalars(
        select(Section).where(Section.status == SECTION_PUBLISHED)).all()}


def section_exists(db: Session, document_id: str, section_id: str, status=None) -> bool:
    query = select(Section).where(Section.document_id == document_id,
                                  Section.section_id == section_id)
    if status:
        query = query.where(Section.status == status)
    return db.scalar(query) is not None


def orphan_placements(db: Session) -> list:
    """Placements pointing at a section that is no longer published."""
    live = published_section_keys(db)
    out = []
    for row in db.scalars(select(SectionPlacement)).all():
        if (row.document_id, row.section_id) in live:
            continue
        out.append({"placementId": row.id, "productId": row.product_id,
                    "productSlug": row.product_slug, "documentId": row.document_id,
                    "sectionId": row.section_id, "sectionType": row.section_type})
    return out


def delete_orphan_placements(db: Session, dry_run: bool = True) -> dict:
    """Remove placements whose section no longer exists.

    Orphans are inert: the resolver already refuses to price or render a section
    it cannot find, so deleting them changes nothing a shopper sees. It only
    makes the integrity report honest. Call `sync_all_sections` first, and pass
    dry_run=False to actually write.
    """
    orphans = orphan_placements(db)
    if not dry_run:
        for entry in orphans:
            row = db.get(SectionPlacement, entry["placementId"])
            if row is not None:
                db.delete(row)
        db.flush()
    return {"dryRun": bool(dry_run), "count": len(orphans), "placements": orphans}


# ── The media library ─────────────────────────────────────────────────────
# Two jobs: keep one copy of a file however many times it is uploaded, and
# answer "where is this used" before anything is deleted.

def content_hash(data: bytes) -> str:
    """The identity of a file: its bytes, never its name or its date."""
    import hashlib as _hashlib
    return _hashlib.sha256(data).hexdigest()


def url_hash(url: str) -> str:
    """Identity for an asset added by address rather than uploaded."""
    import hashlib as _hashlib
    return _hashlib.sha256(str(url or "").strip().encode("utf-8")).hexdigest()


def find_media_by_hash(db: Session, digest: str):
    """The asset already holding these bytes, if there is one."""
    if not digest:
        return None
    return db.scalar(select(MediaAsset).where(MediaAsset.content_hash == digest))


def _asset_ids_in(blob) -> set:
    """Every asset id referenced anywhere inside a stored JSON value."""
    found = set()
    try:
        text = json.dumps(blob, default=str)
    except (TypeError, ValueError):
        return found
    for key in ("assetId", "asset_id", "mediaId"):
        marker = f'"{key}": "'
        start = 0
        while True:
            index = text.find(marker, start)
            if index < 0:
                break
            index += len(marker)
            end = text.find('"', index)
            if end < 0:
                break
            value = text[index:end]
            if value:
                found.add(value)
            start = end + 1
    return found


def media_usage(db: Session) -> dict:
    """Where every asset is used, so nothing is deleted out from under a page."""
    usage = {}

    def note(asset_id, where):
        usage.setdefault(asset_id, []).append(where)

    for document in db.scalars(select(ContentDocument)).all():
        for row in ((document.data or {}).get("sections") or []):
            if not isinstance(row, dict):
                continue
            for asset_id in _asset_ids_in(row):
                note(asset_id, {"kind": "section", "documentId": document.id,
                                "sectionId": str(row.get("id") or ""),
                                "status": document.status})
    for record in db.scalars(select(Catalog)).all():
        if not record.data:
            continue
        for asset_id in _asset_ids_in(record.data):
            note(asset_id, {"kind": record.kind, "id": record.slug, "status": "record"})
    return usage


def media_usage_for(db: Session, asset_id: str) -> list:
    return media_usage(db).get(str(asset_id), [])


def media_json(asset) -> dict:
    """The base shape the consoles already read, plus the library fields."""
    row = _media_json_base(asset)
    row.update({
        "label": getattr(asset, "label", "") or "",
        "tags": list(getattr(asset, "tags", None) or []),
        "originPage": getattr(asset, "origin_page", "") or "",
        "originSection": getattr(asset, "origin_section", "") or "",
        "contentHash": getattr(asset, "content_hash", "") or "",
        "inLibrary": True,
    })
    return row


def apply_section_update(data: dict, section_id: str, fields: dict) -> dict:
    """Merge fields into one section, leaving every other section byte-identical.

    The page editor rewrites the whole array; this exists so a section can be
    saved on its own without touching its neighbours.
    """
    rows = [dict(row) for row in (data or {}).get("sections") or [] if isinstance(row, dict)]
    for index, row in enumerate(rows):
        if str(row.get("id") or "") != str(section_id):
            continue
        merged = {**row, **(fields or {}), "id": str(section_id)}
        merged["type"] = str(merged.get("type") or row.get("type") or "")
        rows[index] = merged
        return {"sections": rows, "section": merged, "found": True}
    return {"sections": rows, "section": None, "found": False}

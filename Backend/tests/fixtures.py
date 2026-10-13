"""Test-only catalogue and staff fixtures.

The production service never writes starter content into a database. Every row a
live installation holds was written by an authenticated request — the admin
console, the seller workspace or a shopper. Nothing in `core` or `app` seeds.

The contract tests still need a small world to assert against: two stores, a
handful of approved listings, the CMS pages and the staff logins they exercise.
That world is built here instead, and only ever inside the disposable SQLite
database that `tests/test_support.py` guards.

    from fixtures import create_test_records

    with SessionLocal() as db:
        create_test_records(db)
"""

from __future__ import annotations

import json
import os
from datetime import timedelta
from pathlib import Path

from sqlalchemy import select

from core import (
    ContentDocument,
    ContentVersion,
    FlashSale,
    FlashSaleItem,
    SessionLocal,
    StaffUser,
    catalogue_image,
    catalogue_images,
    hash_password,
    merchants,
    new_id,
    now,
    permissions_for,
    placeholder,
    put_row,
)

FIXTURE_PATH = Path(__file__).resolve().parent / "catalogue_test_data.json"

# The staff password the tests sign in with. Supplied by the environment so no
# credential is ever committed; the test modules set it before importing core.
TEST_STAFF_PASSWORD = os.getenv("FERIXAS_TEST_STAFF_PASSWORD", "").strip()


def _assert_disposable_test_database(db=None) -> None:
    """Refuse to write test data unless the target is the guarded local SQLite DB."""
    if os.getenv("FERIXAS_ENV") != "test":
        raise RuntimeError("Test catalogue data may only be written with FERIXAS_ENV=test")
    from core import engine

    target_engine = db.get_bind() if db is not None else engine
    database = str(target_engine.url.database or "")
    if (
        target_engine.dialect.name != "sqlite"
        or not database
        or not Path(database).name.startswith("ferixas-")
    ):
        raise RuntimeError("Test catalogue data may only be written to a disposable ferixas- SQLite database")


def _catalogue_rows() -> dict:
    return json.loads(FIXTURE_PATH.read_text())


def create_test_catalogue(db) -> None:
    """Write the fixture catalogue: categories, collections, stores, listings, banners."""
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
            "status": "approved",
            "channels": {"store": False, "marketplace": True},
            "demoListing": True,
            "demoNotice": "Demo catalogue listing — not a real sale or social-proof record.",
            "rating": 0.0, "ratingBreakdown": {}, "reviewCount": 0, "sold30d": 0,
            "merchantSlug": merchant["slug"] if merchant else row["merchantId"],
            "merchantName": merchant["name"] if merchant else row["merchantId"],
            "images": row.get("images") or catalogue_images("products", row["slug"]) or [placeholder(f"{row['slug']}-{i}") for i in (1, 2, 3)],
            "collections": row.get("collections", []),
            "variants": row.get("variants", []),
            "bullets": row.get("bullets", []),
            "tags": row.get("tags", []),
            "seoTitle": row.get("seoTitle") or seo.get("title") or row["title"],
            "seoDescription": row.get("seoDescription") or seo.get("description") or row.get("description", "")[:155],
            "updatedAt": row.get("createdAt", now().isoformat()),
        })
    for index, row in enumerate(data.get("banners", [])):
        banner_id = row.get("id", f"banner-{index + 1}")
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

    # Brands, derived from the stores so the brand row has something to show.
    for brand_index, merchant in enumerate(merchants(db), start=1):
        put_row(db, "brand", merchant["slug"], {
            "id": merchant["slug"],
            "name": merchant["name"],
            "slug": merchant["slug"],
            "description": merchant.get("tagline") or f"{merchant['name']} on Ferixas.",
            "image": merchant.get("logo") or "",
            "imageUrl": merchant.get("logo") or "",
            "featured": brand_index <= 4,
            "visible": True,
            "position": brand_index,
        })

    # Adverts for the promotion slots.
    advert_until = now() + timedelta(days=90)
    for advert_position, advert in enumerate((
        {
            "id": "adv_autumn", "name": "Autumn edit",
            "headline": "Autumn edit: quiet pieces, bold colours",
            "body": "Hand-picked from three stores.",
            "mediaUrl": catalogue_image("banners", "bnr_launch") or "",
            "kind": "image", "href": "/browse?onSale=1",
            "placement": "explore", "sponsor": "",
        },
        {
            "id": "adv_audio_range", "name": "New audio range",
            "headline": "See the new audio range",
            "body": "", "mediaUrl": "", "kind": "video",
            "href": "/browse?category=audio",
            "placement": "explore", "sponsor": "AuraSound Audio",
        },
        {
            "id": "adv_delivery", "name": "Delivery promise",
            "headline": "Free delivery over $120",
            "body": "Across every store, one checkout.",
            "mediaUrl": "", "kind": "image", "href": "/browse",
            "placement": "home", "sponsor": "",
        },
    ), start=1):
        put_row(db, "advert", advert["id"], {
            **advert,
            "position": advert_position,
            "active": True,
            "startsAt": now().isoformat(),
            "endsAt": advert_until.isoformat(),
        })

    def storefront_page(doc_id: str, doc_type: str, title: str, sections: list) -> None:
        document = ContentDocument(
            id=doc_id, owner_type="platform", owner_id="platform",
            document_type=doc_type, title=title, status="published",
            data={"sections": sections},
        )
        db.add(document)
        db.add(ContentVersion(id=new_id("ver"), document_id=document.id, version=1,
                              status="published", data=document.data,
                              note="Test fixture", created_by="tests"))

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
             "title": "Shop by department",
             "limit": 10, "showAsTile": True, "position": 3, "visible": True},
            {"id": "sec_brands", "type": "brand_carousel", "name": "Brand row",
             "title": "Shop by brand",
             "layout": "slider", "position": 4, "visible": True},
            {"id": "sec_home_slots", "type": "promo_slots", "name": "Promotion slots",
             "subtitle": "Advertisement", "limit": 2,
             "position": 5, "visible": True},
            {"id": "sec_flash", "type": "product_carousel", "name": "Today's deals",
             "title": "Today's deals",
             "limit": 8, "position": 6, "visible": True},
            {"id": "sec_trending", "type": "product_carousel", "name": "Trending",
             "title": "Trending this week",
             "limit": 8, "position": 7, "visible": True},
            {"id": "sec_stores", "type": "featured_stores", "name": "Stores worth following",
             "title": "Stores worth following",
             "limit": 3, "layout": "rows", "position": 8, "visible": True},
            {"id": "sec_footer", "type": "footer", "name": "Footer",
             "position": 9, "visible": True},
        ],
    )

    storefront_page(
        "doc_marketplace_explore", "marketplace_explore", "Explore",
        [
            {"id": "sec_explore_hero", "type": "hero_slim", "name": "Explore banner",
             "eyebrow": "This week on Ferixas", "title": "Audio, up to 30% off",
             "ctaLabel": "Shop the deals", "ctaHref": "/browse?onSale=1",
             "height": 150, "position": 1, "visible": True},
            {"id": "sec_explore_trending", "type": "product_carousel", "name": "Trending",
             "title": "Trending", "limit": 8, "layout": "groups", "across": 2,
             "rowsPerSet": 2, "position": 2, "visible": True},
            {"id": "sec_explore_grid", "type": "product_grid", "name": "Product list",
             "columns": 4, "perPage": 24, "position": 3, "visible": True},
            {"id": "sec_explore_brands", "type": "brand_carousel", "name": "Brand row",
             "title": "Shop by brand", "layout": "slider", "position": 4, "visible": True},
            {"id": "sec_explore_slots", "type": "promo_slots", "name": "Promotion slots",
             "subtitle": "Advertisement", "adEvery": 6, "limit": 3, "placement": "explore",
             "position": 5, "visible": True},
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

    sale = FlashSale(
        id="sale_launch", name="Launch Week Drop", headline="Up to 20% off for a limited window",
        banner_url=placeholder("flash-launch"), status="scheduled",
        starts_at=now(), ends_at=now() + timedelta(days=14),
    )
    db.add(sale)
    for product in data.get("products", [])[:6]:
        db.add(FlashSaleItem(
            id=new_id("fsi"), sale_id=sale.id, product_id=product["id"],
            merchant_id=product["merchantId"],
            sale_price=round(product["price"] * 0.8, 2), quantity_limit=25, sold_quantity=0,
        ))


def create_test_staff(db) -> None:
    """Create the admin and per-store staff logins the tests sign in with."""
    if db.scalar(select(StaffUser.id).limit(1)):
        return
    if not TEST_STAFF_PASSWORD:
        raise RuntimeError("FERIXAS_TEST_STAFF_PASSWORD must be set before building test-only records test staff")
    for merchant in merchants(db):
        db.add(StaffUser(id=new_id("stf"), subject_type="merchant", subject_id=merchant["id"],
                         name=f"{merchant['name']} owner", email=f"owner@{merchant['slug']}.ferixas.com",
                         password_hash=hash_password(TEST_STAFF_PASSWORD), role="merchant",
                         permissions=permissions_for("merchant")))
    db.add(StaffUser(id=new_id("stf"), subject_type="admin", subject_id="platform",
                     name="Test Platform Owner", email="admin@ferixas.test",
                     password_hash=hash_password(TEST_STAFF_PASSWORD), role="owner",
                     permissions=permissions_for("owner")))


def create_test_records(db=None) -> None:
    """Build the whole fixture and commit it. Safe to call from any test setUp."""
    _assert_disposable_test_database(db)
    if db is not None:
        create_test_catalogue(db)
        create_test_staff(db)
        db.commit()
        return
    with SessionLocal() as session:
        create_test_catalogue(session)
        create_test_staff(session)
        session.commit()

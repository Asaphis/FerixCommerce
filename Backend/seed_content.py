"""Put the storefront's content into an existing database, without touching data.

The seed that runs at startup only ever acts on an empty database - which is
correct, because restarting a live platform must never write starter content over
real rows. That leaves the opposite problem: a database already in use never
receives content added later, such as a new page or a new section.

Run this on the server when you add content to the code and want it in place:

    python seed_content.py

It creates only what is missing and leaves everything else exactly as it is, so it
is safe to run more than once and safe to run against production.
"""

import sys

from sqlalchemy import select

from core import (
    ContentDocument,
    ContentVersion,
    SessionLocal,
    ensure_seed,
    merchants,
    new_id,
    now,
    put_row,
    rows_of,
)

HOME = [
    {"id": "sec_hero", "type": "hero_banner", "name": "Hero banner",
     "eyebrow": "Autumn on Ferixas",
     "title": "Seven merchants. One cart. One checkout.",
     "subtitle": "Audio, tailoring, home, gaming and pantry goods, bought once and shipped by each seller.",
     "ctaLabel": "Shop the marketplace", "ctaHref": "/browse",
     "secondaryLabel": "Meet the stores", "secondaryHref": "/stores",
     "align": "left", "vertical": "middle", "tone": "dark", "scrim": 55,
     "showText": True, "showButtons": True, "duration": 7000, "width": 44},
    {"id": "sec_promo", "type": "promo_strip", "name": "Promo strip",
     "message": "Free delivery over $120 · 30-day returns"},
    {"id": "sec_categories", "type": "category_grid", "name": "Department tiles",
     "title": "Shop by department", "subtitle": "Ten departments, one checkout",
     "limit": 10, "showAsTile": True},
    {"id": "sec_brands", "type": "brand_carousel", "name": "Brand row",
     "title": "Shop by brand", "subtitle": "Verified makers across the marketplace",
     "limit": 8, "layout": "slider"},
    {"id": "sec_home_slots", "type": "promo_slots", "name": "Promotion slots",
     "subtitle": "Advertisement", "adEvery": 2, "limit": 2, "placement": "home"},
    {"id": "sec_flash", "type": "product_carousel", "name": "Today's deals",
     "title": "Today's deals", "subtitle": "Limited windows, limited stock",
     "source": "flash", "limit": 8},
    {"id": "sec_trending", "type": "product_carousel", "name": "Trending",
     "title": "Trending this week", "subtitle": "What shoppers are buying",
     "source": "trending", "limit": 8},
    {"id": "sec_stores", "type": "featured_stores", "name": "Stores worth following",
     "title": "Stores worth following", "subtitle": "Verified merchants across the platform",
     "limit": 3, "layout": "rows", "showFollow": True},
    {"id": "sec_footer", "type": "footer", "name": "Footer"},
]

EXPLORE = [
    {"id": "sec_explore_hero", "type": "hero_slim", "name": "Explore banner",
     "eyebrow": "This week on Ferixas", "title": "Audio, up to 30% off",
     "ctaLabel": "Shop the deals", "ctaHref": "/browse?onSale=1", "height": 150},
    {"id": "sec_explore_grid", "type": "product_grid", "name": "Product list",
     "columns": 4, "perPage": 24, "adEvery": 6},
    {"id": "sec_explore_brands", "type": "brand_carousel", "name": "Brand row",
     "title": "Shop by brand", "limit": 8},
    {"id": "sec_explore_slots", "type": "promo_slots", "name": "Promotion slots",
     "subtitle": "Advertisement", "adEvery": 6, "limit": 3, "placement": "explore"},
]

PRODUCT = [
    {"id": "sec_gallery", "type": "product_gallery", "name": "Gallery"},
    {"id": "sec_buybox", "type": "buy_box", "name": "Buy box"},
    {"id": "sec_delivery", "type": "delivery_block", "name": "Delivery and returns"},
    {"id": "sec_reviews", "type": "reviews", "name": "Reviews", "verifiedOnly": True},
    {"id": "sec_related", "type": "product_carousel", "name": "More like this",
     "source": "related", "limit": 8},
]

ADVERTS = [
    {"id": "adv_autumn", "name": "Autumn edit", "headline": "Autumn edit: quiet pieces, bold colours",
     "body": "Hand-picked from three stores.", "kind": "image", "href": "/browse?onSale=1",
     "placement": "explore", "sponsor": ""},
    {"id": "adv_audio_range", "name": "New audio range", "headline": "See the new audio range",
     "body": "", "kind": "video", "href": "/browse?category=audio",
     "placement": "explore", "sponsor": "AuraSound Audio"},
    {"id": "adv_delivery", "name": "Delivery promise", "headline": "Free delivery over $120",
     "body": "Across every store, one checkout.", "kind": "image", "href": "/browse",
     "placement": "home", "sponsor": ""},
]


def ensure_page(db, doc_id, doc_type, title, sections):
    """Create a page, or add any section it is missing. Never reorder what is there."""
    document = db.get(ContentDocument, doc_id)

    if document is None:
        document = ContentDocument(
            id=doc_id, owner_type="platform", owner_id="platform", document_type=doc_type,
            title=title, status="published",
            data={"sections": [{**s, "position": i} for i, s in enumerate(sections, start=1)]},
        )
        db.add(document)
        db.add(ContentVersion(id=new_id("ver"), document_id=doc_id, version=1, status="published",
                              data=document.data, note="Created by seed_content",
                              created_by="seed_content"))
        return f"created with {len(sections)} sections", None

    present = {s.get("id") for s in (document.data or {}).get("sections", [])}
    missing = [s for s in sections if s.get("id") not in present]
    if not missing:
        return f"already complete ({len(present)} sections)", None

    data = dict(document.data or {})
    merged = list(data.get("sections") or [])
    highest = max([s.get("position", 0) for s in merged] or [0])
    for offset, section in enumerate(missing, start=1):
        merged.append({**section, "position": highest + offset})
    data["sections"] = merged
    document.data = data

    versions = len(db.scalars(
        select(ContentVersion.id).where(ContentVersion.document_id == doc_id)).all())
    db.add(ContentVersion(id=new_id("ver"), document_id=doc_id, version=versions + 1,
                          status="published", data=data, note="Completed by seed_content",
                          created_by="seed_content"))
    return f"added {len(missing)} missing section(s)", [s.get("id") for s in missing]


def main() -> int:
    ensure_seed()          # tables and migrations, never a wipe
    created, completed = [], []

    with SessionLocal() as db:
        existing_brands = {row.get("slug") for row in rows_of(db, "brand")}
        for index, merchant in enumerate(merchants(db), start=1):
            if merchant["slug"] in existing_brands:
                continue
            put_row(db, "brand", merchant["slug"], {
                "id": merchant["slug"], "name": merchant["name"], "slug": merchant["slug"],
                "description": merchant.get("tagline") or f"{merchant['name']} on Ferixas.",
                "image": merchant.get("logo") or "", "imageUrl": merchant.get("logo") or "",
                "featured": index <= 4, "visible": True, "position": index,
            })
            created.append(f"brand {merchant['name']}")

        existing_adverts = {row.get("id") for row in rows_of(db, "advert")}
        for position, advert in enumerate(ADVERTS, start=1):
            if advert["id"] in existing_adverts:
                continue
            put_row(db, "advert", advert["id"], {
                **advert, "mediaUrl": advert.get("mediaUrl", ""), "position": position,
                "active": True, "startsAt": now().isoformat(),
                "endsAt": now().replace(year=now().year + 1).isoformat(),
            })
            created.append(f"advert {advert['name']}")

        for doc_id, doc_type, title, sections in [
            ("doc_marketplace_home", "marketplace_home", "Homepage", HOME),
            ("doc_marketplace_explore", "marketplace_explore", "Explore", EXPLORE),
            ("doc_marketplace_product", "marketplace_product", "Product page", PRODUCT),
        ]:
            result, added = ensure_page(db, doc_id, doc_type, title, sections)
            if added:
                completed.append(f"{title}: {result} -> {', '.join(added)}")
            else:
                created.append(f"{title}: {result}")

        db.commit()

    print("seed_content: what it did")
    for line in created:
        print(f"  created      {line}")
    for line in completed:
        print(f"  completed    {line}")
    if not created and not completed:
        print("  nothing was missing - the database already has everything")
    print("\nNothing existing was changed. Re-running this is safe.")
    return 0


if __name__ == "__main__":
    sys.exit(main())

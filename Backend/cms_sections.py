"""The CMS section contract.

One module decides what a section *is*, how its products are chosen, where its
live data comes from, how it is presented and when it is on the shop. The CMS
editor, the storefront resolver, the product-upload forms and the tests all read
this file, so a section saved in one place cannot quietly mean something else in
another.

Four ideas are kept strictly apart, because mixing them is what made the old
editor confusing:

* **type**          - the visual block: a hero, a product row, a brand row.
* **selectionMode** - automatic (the backend picks), manual (a person picks),
                      or none (the section holds no products at all).
* **source**        - the data provider for a product section: a catalogue
                      feed such as ``trending``, or ``assigned`` for a curated
                      list held in SectionPlacement rows.
* **presentation**  - how the block is dressed: a plain row, or the Flash Sale
                      campaign treatment with its own colours and countdown.

Trending, new arrivals, best sellers, featured and on-sale are therefore *not*
section types. They are automatic sources inside a product row or product grid.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

SELECTION_AUTOMATIC = "automatic"
SELECTION_MANUAL = "manual"
SELECTION_NONE = "none"
SELECTION_MODES = (SELECTION_AUTOMATIC, SELECTION_MANUAL, SELECTION_NONE)

PRESENTATION_STANDARD = "standard"
PRESENTATIONS = ("standard", "flash_sale", "sale", "new_arrivals", "featured")

#: Sections whose membership is a list of products.
PRODUCT_SECTION_TYPES = ("product_carousel", "product_grid")

#: Automatic catalogue feeds. ``flash_sale`` is retained only so sections saved
#: before this contract existed keep rendering; it is never offered again. The
#: live Flash Sale campaign is a manual section with presentation ``flash_sale``.
AUTOMATIC_SOURCES: dict[str, dict] = {
    "trending": {
        "label": "Trending",
        "hint": "Ranked by units sold in the window you choose.",
        "config": [
            {"key": "windowDays", "label": "Sales window", "kind": "number", "default": 30},
            {"key": "minimumSales", "label": "Minimum units sold", "kind": "number", "default": 1},
        ],
    },
    "newest_arrivals": {
        "label": "New arrivals",
        "hint": "Newest approved products first.",
        "config": [
            {"key": "windowDays", "label": "Only products added within", "kind": "number", "default": 0},
        ],
    },
    "best_sellers": {
        "label": "Best sellers",
        "hint": "Highest paid quantity sold in the window you choose.",
        "config": [
            {"key": "windowDays", "label": "Sales window", "kind": "number", "default": 30},
            {"key": "minimumSales", "label": "Minimum units sold", "kind": "number", "default": 1},
        ],
    },
    "featured": {
        "label": "Featured products",
        "hint": "Products an Admin has flagged as featured.",
        "config": [],
    },
    "on_sale": {
        "label": "On sale",
        "hint": "Products carrying a live discount. No product is attached by hand.",
        "config": [],
    },
    "category": {
        "label": "One department",
        "hint": "Everything approved inside a department.",
        "config": [
            {"key": "categorySlug", "label": "Department slug", "kind": "text", "required": True},
        ],
    },
    "collection": {
        "label": "One collection",
        "hint": "Everything approved inside a collection.",
        "config": [
            {"key": "collectionSlug", "label": "Collection slug", "kind": "text", "required": True},
        ],
    },
    "related": {
        "label": "Related to the product being viewed",
        "hint": "Product pages only. Filled from the product's own relationships.",
        "config": [],
    },
}

#: Sources kept readable but no longer offered anywhere.
LEGACY_SOURCES = ("flash_sale",)

#: ``assigned`` is a source too: the curated list lives in SectionPlacement.
ASSIGNED_SOURCE = "assigned"

#: Every value a stored section may carry in ``source``.
ALL_SOURCES = (ASSIGNED_SOURCE,) + tuple(AUTOMATIC_SOURCES) + LEGACY_SOURCES

#: What each product placement can carry, per presentation. This is what the
#: product form opens when someone ticks the section.
PRODUCT_CONFIG_PRESETS: dict[str, list[dict]] = {
    PRESENTATION_STANDARD: [
        {"key": "position", "label": "Position in the section", "kind": "number"},
        {"key": "label", "label": "Badge label", "kind": "text"},
        {"key": "startsAt", "label": "Shows from", "kind": "datetime"},
        {"key": "endsAt", "label": "Shows until", "kind": "datetime"},
    ],
    "flash_sale": [
        {"key": "price", "label": "Flash-sale price", "kind": "number", "required": True},
        {"key": "compareAt", "label": "Original price", "kind": "number"},
        {"key": "label", "label": "Discount label", "kind": "text", "placeholder": "50% OFF"},
        {"key": "startsAt", "label": "Product shows from", "kind": "datetime"},
        {"key": "endsAt", "label": "Product shows until", "kind": "datetime"},
        {"key": "position", "label": "Position in the campaign", "kind": "number"},
        {"key": "badgeColor", "label": "Badge colour", "kind": "color"},
    ],
    "sale": [
        {"key": "position", "label": "Position in the section", "kind": "number"},
    ],
    "new_arrivals": [
        {"key": "position", "label": "Position in the section", "kind": "number"},
    ],
    "featured": [
        {"key": "position", "label": "Position in the section", "kind": "number"},
    ],
}

#: Fields the Flash Sale campaign itself carries. The editor renders these; the
#: storefront reads them. Colours are plain hex so a theme can be added later
#: without another migration.
FLASH_SALE_FIELDS = (
    "eyebrow", "title", "subtitle", "ctaLabel", "ctaHref",
    "startsAt", "endsAt", "showCountdown", "countdownLabel",
    "theme", "backgroundColor", "accentColor", "textColor",
    "timerBackgroundColor", "timerTextColor",
    "layout", "showDiscountBadges", "showViewAll",
)

#: Default Flash Sale dressing. Chosen to read as urgent without being loud.
FLASH_SALE_DEFAULTS: dict = {
    "eyebrow": "Limited time only",
    "showCountdown": True,
    "countdownLabel": "Ends in",
    "theme": "ember",
    "backgroundColor": "#FFF3EF",
    "accentColor": "#E4572E",
    "textColor": "#12263A",
    "timerBackgroundColor": "#12263A",
    "timerTextColor": "#FFFFFF",
    "layout": "carousel",
    "showDiscountBadges": True,
    "showViewAll": True,
}

#: The add-section palette, grouped by what the operator is trying to do. Each
#: entry is a button; ``asksSource`` means the button opens the small
#: manual-or-automatic setup before the section is created.
PALETTE: list[dict] = [
    {
        "id": "campaign",
        "label": "Hero and banners",
        "hint": "The campaign at the top of a page.",
        "entries": [
            {"id": "hero_banner", "label": "Hero banner", "type": "hero_banner",
             "hint": "Full hero with two buttons or a banner carousel."},
            {"id": "hero_slim", "label": "Slim banner", "type": "hero_slim",
             "hint": "Compact band with one button."},
            {"id": "promo_strip", "label": "Message strip", "type": "promo_strip",
             "hint": "One line of reassurance."},
        ],
    },
    {
        "id": "products",
        "label": "Products",
        "hint": "Pick the products yourself, or let the catalogue fill it.",
        "entries": [
            {"id": "product_row", "label": "Product row", "type": "product_carousel",
             "hint": "A row or carousel you fill from the product form.",
             "asksSource": True, "defaultSource": ASSIGNED_SOURCE},
            {"id": "product_grid", "label": "Product grid", "type": "product_grid",
             "hint": "A grid you fill from the product form.",
             "asksSource": True, "defaultSource": ASSIGNED_SOURCE},
            {"id": "flash_sale", "label": "Flash sale", "type": "product_carousel",
             "hint": "A timed campaign with its own colours, countdown and per-product prices.",
             "selectionMode": SELECTION_MANUAL, "source": ASSIGNED_SOURCE,
             "presentation": "flash_sale", "preset": "flash_sale"},
        ],
    },
    {
        "id": "automatic_products",
        "label": "Product rows that pick their own products",
        "hint": "These never appear in the product form. The catalogue decides.",
        "entries": [
            {"id": "trending", "label": "Trending", "type": "product_carousel",
             "selectionMode": SELECTION_AUTOMATIC, "source": "trending",
             "presentation": "standard", "preset": "trending"},
            {"id": "new_arrivals", "label": "New arrivals", "type": "product_carousel",
             "selectionMode": SELECTION_AUTOMATIC, "source": "newest_arrivals",
             "presentation": "new_arrivals", "preset": "new_arrivals"},
            {"id": "best_sellers", "label": "Best sellers", "type": "product_carousel",
             "selectionMode": SELECTION_AUTOMATIC, "source": "best_sellers",
             "presentation": "standard", "preset": "best_sellers"},
            {"id": "featured", "label": "Featured products", "type": "product_carousel",
             "selectionMode": SELECTION_AUTOMATIC, "source": "featured",
             "presentation": "featured", "preset": "featured"},
            {"id": "on_sale", "label": "On sale", "type": "product_carousel",
             "selectionMode": SELECTION_AUTOMATIC, "source": "on_sale",
             "presentation": "sale", "preset": "on_sale"},
        ],
    },
    {
        "id": "catalogue",
        "label": "Live catalogue",
        "hint": "Filled from the department, brand and seller managers.",
        "entries": [
            {"id": "category_grid", "label": "Department tiles", "type": "category_grid",
             "hint": "Every visible department, from the department manager."},
            {"id": "brand_carousel", "label": "Brand row", "type": "brand_carousel",
             "hint": "Visible brands, from the brand manager."},
            {"id": "featured_stores", "label": "Stores", "type": "featured_stores",
             "hint": "Active sellers worth following."},
        ],
    },
    {
        "id": "display",
        "label": "Promotions and display",
        "hint": "Adverts and page furniture.",
        "entries": [
            {"id": "promo_slots", "label": "Advert slots", "type": "promo_slots",
             "hint": "Placed adverts, from the advert manager."},
            {"id": "footer", "label": "Footer", "type": "footer",
             "hint": "The page footer."},
        ],
    },
    {
        "id": "product_template",
        "label": "Product page template",
        "hint": "Only meaningful on the product page. Each reads the product being viewed.",
        "entries": [
            {"id": "product_gallery", "label": "Gallery", "type": "product_gallery",
             "hint": "The product's own images."},
            {"id": "buy_box", "label": "Buy box", "type": "buy_box",
             "hint": "Price, stock and add to cart."},
            {"id": "delivery_block", "label": "Delivery and returns", "type": "delivery_block",
             "hint": "Shipping and return copy."},
            {"id": "reviews", "label": "Reviews", "type": "reviews",
             "hint": "Reviews left for the product."},
        ],
    },
]

#: Types only offered on the product page template.
PRODUCT_TEMPLATE_TYPES = ("product_gallery", "buy_box", "delivery_block", "reviews")


# ── Windows ────────────────────────────────────────────────────────────────

def moment_of(value) -> Optional[datetime]:
    """A stored time as an aware datetime, or None when it is unusable."""
    if not value:
        return None
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    text = str(value).strip().replace("Z", "+00:00")
    if not text:
        return None
    try:
        parsed = datetime.fromisoformat(text)
    except ValueError:
        return None
    return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)


def section_is_live(section: dict, moment: Optional[datetime] = None) -> bool:
    """Whether the section's own window is open right now.

    A section that has not started yet, or whose end has passed, is not on the
    shop at all - which is how a Flash Sale closes as a whole.
    """
    moment = moment or datetime.now(timezone.utc)
    starts = moment_of((section or {}).get("startsAt"))
    ends = moment_of((section or {}).get("endsAt"))
    if starts and moment < starts:
        return False
    if ends and moment > ends:
        return False
    return True


def placement_is_live(row, moment: Optional[datetime] = None) -> bool:
    """Whether one product's own window inside a section is open.

    This is the silent drop-out: the product leaves, the section carries on.
    """
    moment = moment or datetime.now(timezone.utc)
    starts = getattr(row, "starts_at", None)
    ends = getattr(row, "ends_at", None)
    if starts and moment_of(starts) and moment < moment_of(starts):
        return False
    if ends and moment_of(ends) and moment > moment_of(ends):
        return False
    return True


# ── The contract ───────────────────────────────────────────────────────────

def is_product_section(section: dict) -> bool:
    return str((section or {}).get("type") or "") in PRODUCT_SECTION_TYPES


def selection_mode_of(section: dict) -> str:
    """How a section's products are chosen.

    A product section with no source is the legacy spelling of ``assigned``, so
    older documents keep behaving as the curated sections they were.
    """
    row = section or {}
    if not is_product_section(row):
        return SELECTION_NONE
    source = str(row.get("source") or ASSIGNED_SOURCE).strip().lower()
    return SELECTION_MANUAL if source == ASSIGNED_SOURCE else SELECTION_AUTOMATIC


def source_of(section: dict) -> str:
    row = section or {}
    if not is_product_section(row):
        return ""
    source = str(row.get("source") or ASSIGNED_SOURCE).strip().lower()
    return source if source in ALL_SOURCES else ASSIGNED_SOURCE


def presentation_of(section: dict) -> str:
    row = section or {}
    presentation = str(row.get("presentation") or "").strip().lower()
    if presentation in PRESENTATIONS:
        return presentation
    # Documents written before presentations existed said it this way.
    if str(row.get("sectionKind") or "").strip().lower() == "flash_sale":
        return "flash_sale"
    return PRESENTATION_STANDARD


def product_config_schema(section: dict) -> list[dict]:
    """What the product form should ask for one product in this section."""
    row = section or {}
    declared = row.get("productConfigSchema")
    if isinstance(declared, list) and declared:
        return [item for item in declared if isinstance(item, dict) and item.get("key")]
    return list(PRODUCT_CONFIG_PRESETS.get(presentation_of(row), PRODUCT_CONFIG_PRESETS[PRESENTATION_STANDARD]))


def normalize_section(section: dict) -> dict:
    """Return a section with the contract spelled out.

    Unknown fields are preserved: a section may carry editor settings this
    module has never heard of, and dropping them would lose an operator's work.
    """
    row = dict(section or {})
    if is_product_section(row):
        source = str(row.get("source") or ASSIGNED_SOURCE).strip().lower()
        if source not in ALL_SOURCES:
            source = ASSIGNED_SOURCE
        row["source"] = source
        row["selectionMode"] = SELECTION_MANUAL if source == ASSIGNED_SOURCE else SELECTION_AUTOMATIC
        row["presentation"] = presentation_of(row)
        if row["selectionMode"] == SELECTION_MANUAL and not isinstance(row.get("productConfigSchema"), list):
            row["productConfigSchema"] = product_config_schema(row)
        if row["presentation"] == "flash_sale":
            for key, value in FLASH_SALE_DEFAULTS.items():
                row.setdefault(key, value)
    else:
        mode = str(row.get("selectionMode") or SELECTION_NONE).strip().lower()
        row["selectionMode"] = mode if mode in SELECTION_MODES else SELECTION_NONE
        row["presentation"] = presentation_of(row)
    for key in ("startsAt", "endsAt"):
        if key in row and not str(row.get(key) or "").strip():
            row.pop(key)
    return row


def validate_section(section: dict) -> None:
    """Raise ValueError when a stored section breaks the contract."""
    row = section or {}
    if not str(row.get("type") or "").strip():
        raise ValueError("Every section needs a type.")
    if is_product_section(row):
        source = str(row.get("source") or ASSIGNED_SOURCE).strip().lower()
        if source not in ALL_SOURCES:
            raise ValueError(f"'{source}' is not a product source this platform offers.")
        presentation = str(row.get("presentation") or PRESENTATION_STANDARD).strip().lower()
        if presentation not in PRESENTATIONS:
            raise ValueError(f"'{presentation}' is not a section presentation this platform offers.")
    for key in ("startsAt", "endsAt"):
        raw = str(row.get(key) or "").strip()
        if raw and moment_of(raw) is None:
            raise ValueError(f"{key} must be a date and time.")


def is_manual_product_section(section: dict) -> bool:
    """Whether a person attaches products to this section by hand."""
    return is_product_section(section) and selection_mode_of(section) == SELECTION_MANUAL


def apply_placement_overrides(product: dict, row) -> dict:
    """One product as the section it was bought from presents it.

    A placement may hold its own price, its own stock figure and its own badge,
    which is how the same product is $189 in a Flash Sale and $249 in Trending.
    Nothing here changes the product record itself.
    """
    data = dict(product or {})
    price = float(getattr(row, "price", 0) or 0)
    compare_at = float(getattr(row, "compare_at", 0) or 0)
    base_price = float(data.get("price") or 0)
    if price > 0 and abs(price - base_price) > 1e-9:
        data["price"] = price
        data["sectionPrice"] = price
        data["compareAt"] = compare_at if compare_at > price else None
    config = getattr(row, "config", None) or {}
    label = str(config.get("label") or "").strip()
    if label:
        data["sectionLabel"] = label
    badge = str(config.get("badgeColor") or "").strip()
    if badge:
        data["sectionBadgeColor"] = badge
    quantity = int(getattr(row, "quantity", 0) or 0)
    if quantity > 0 and quantity != int(data.get("availableQuantity") or 0):
        data["sectionQuantity"] = quantity
    if getattr(row, "section_id", None):
        data["sectionId"] = row.section_id
    return data

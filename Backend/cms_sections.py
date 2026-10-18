"""The CMS section contract.

One module decides what a section *is*, how its products are chosen, what it
asks of each product, how it is dressed and when it is on the shop. The CMS
editor, the storefront resolver, the product-upload forms and the tests all read
this file, so a section saved in one place cannot quietly mean something else in
another.

Five ideas are kept strictly apart, because mixing them is what made the old
editor confusing:

* **type**          - the visual block: a hero, a product row, a brand row.
* **selectionMode** - automatic (the backend picks), manual (a person picks),
                      or none (the section holds no products at all).
* **source**        - the data provider for a product section: a catalogue feed
                      such as ``trending``, or ``assigned`` for a curated list
                      held in SectionPlacement rows.
* **presentation**  - how the block is dressed. Dressing only: it never decides
                      which fields a product form asks for.
* **requirements**  - what this section asks of a product placed in it. The
                      section declares the list; the values are entered on the
                      product form and stored on the placement. A section never
                      stores a price - it stores the requirement for one.

Each automatic feed ranks by its own declared rule, so two feeds can no longer
be the same list behind two names.
"""
from __future__ import annotations

import re
from datetime import datetime, timezone
from typing import Optional

SELECTION_AUTOMATIC = "automatic"
SELECTION_MANUAL = "manual"
SELECTION_NONE = "none"
SELECTION_MODES = (SELECTION_AUTOMATIC, SELECTION_MANUAL, SELECTION_NONE)

PRESENTATION_STANDARD = "standard"
PRESENTATIONS = ("standard", "flash_sale", "sale", "new_arrivals", "featured")

PRODUCT_SECTION_TYPES = ("product_carousel", "product_grid")

#: Kinds the console renders as real controls: a date picker, a colour picker,
#: a number box. ``text`` is the last resort, never the default.
KIND_TEXT, KIND_NUMBER, KIND_DATETIME, KIND_COLOR, KIND_CHOICE, KIND_TOGGLE = (
    "text", "number", "datetime", "color", "choice", "toggle")


def field(key: str, label: str, kind: str = KIND_TEXT, **extra) -> dict:
    """One editable setting, described once for every surface that shows it."""
    row = {"key": key, "label": label, "kind": kind}
    row.update(extra)
    return row


_CSS_NUMBER = r"[+-]?(?:\d+(?:\.\d*)?|\.\d+)%?"
_RGB_COLOR = re.compile(rf"^rgba?\(\s*{_CSS_NUMBER}\s*,\s*{_CSS_NUMBER}\s*,\s*{_CSS_NUMBER}(?:\s*,\s*{_CSS_NUMBER})?\s*\)$", re.IGNORECASE)
_HSL_COLOR = re.compile(r"^hsla?\(\s*[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:deg|turn|rad)?\s*,\s*[+-]?(?:\d+(?:\.\d*)?|\.\d+)%\s*,\s*[+-]?(?:\d+(?:\.\d*)?|\.\d+)%\s*(?:,\s*[+-]?(?:\d+(?:\.\d*)?|\.\d+)%?)?\)$", re.IGNORECASE)
_CSS_NAMED_COLORS = {
    "transparent", "black", "white", "red", "green", "blue", "yellow", "orange", "purple", "pink",
    "gray", "grey", "silver", "maroon", "navy", "teal", "olive", "lime", "aqua", "fuchsia",
    "coral", "tomato", "gold", "indigo", "violet", "beige", "brown", "chocolate", "crimson",
    "khaki", "lavender", "plum", "salmon", "tan", "turquoise", "rebeccapurple",
}


def _safe_solid_color(value: str) -> bool:
    color = value.strip()
    if re.fullmatch(r"#(?:[0-9A-Fa-f]{3,4}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})", color):
        return True
    if _RGB_COLOR.fullmatch(color) or _HSL_COLOR.fullmatch(color):
        return True
    return color.lower() in _CSS_NAMED_COLORS


def _split_css_arguments(value: str) -> list[str] | None:
    parts: list[str] = []
    depth = 0
    start = 0
    for index, char in enumerate(value):
        if char == "(":
            depth += 1
        elif char == ")":
            depth -= 1
            if depth < 0:
                return None
        elif char == "," and depth == 0:
            parts.append(value[start:index].strip())
            start = index + 1
    if depth != 0:
        return None
    parts.append(value[start:].strip())
    return parts


def is_safe_css_color(value: object, allow_gradient: bool = False) -> bool:
    """Accept a bounded CSS color grammar; never pass arbitrary CSS from a form to a style."""
    raw = str(value or "").strip()
    if _safe_solid_color(raw):
        return True
    if not allow_gradient:
        return False
    match = re.fullmatch(r"(linear|radial|conic)-gradient\((.*)\)", raw, re.IGNORECASE)
    if not match:
        return False
    kind, body = match.group(1).lower(), match.group(2)
    parts = _split_css_arguments(body)
    if not parts:
        return False
    stops = parts
    first = parts[0]
    header_patterns = {
        "linear": r"(?:to\s+(?:left|right|top|bottom)(?:\s+(?:left|right|top|bottom))?|[+-]?(?:\d+(?:\.\d*)?|\.\d+)deg)",
        "radial": r"(?:(?:circle|ellipse)(?:\s+(?:closest-side|closest-corner|farthest-side|farthest-corner))?)?(?:\s+at\s+(?:center|left|right|top|bottom)(?:\s+(?:left|right|top|bottom))?)?",
        "conic": r"from\s+[+-]?(?:\d+(?:\.\d*)?|\.\d+)deg(?:\s+at\s+(?:center|left|right|top|bottom))?",
    }
    if not _safe_solid_color(re.sub(r"\s+[+-]?(?:\d+(?:\.\d*)?|\.\d+)%$", "", first)):
        if re.fullmatch(header_patterns[kind], first, re.IGNORECASE) is None:
            return False
        stops = parts[1:]
    if not 2 <= len(stops) <= 8:
        return False
    for stop in stops:
        parsed = re.fullmatch(r"(.+?)(?:\s+([+-]?(?:\d+(?:\.\d*)?|\.\d+))%)?", stop)
        if not parsed or not _safe_solid_color(parsed.group(1)):
            return False
        if parsed.group(2) is not None and not 0 <= float(parsed.group(2)) <= 100:
            return False
    return True


def ch(*pairs) -> list:
    """Choice options from ("value", "Label") pairs."""
    return [{"value": str(value), "label": label} for value, label in pairs]


def copy_of(entries) -> list:
    return [dict(entry) for entry in entries]


def mix(*groups) -> list:
    """One field list from any number of groups, copied, in order."""
    out: list = []
    for group in groups:
        for item in group:
            out.append(dict(item))
    return out


# ── What a section may ask of a product ────────────────────────────────────
#: The library a section declares from. The value is never stored on the
#: section: it is entered against the product, per section, on the product form.
REQUIREMENT_LIBRARY: dict[str, dict] = {
    "price": field("price", "Price in this section", KIND_NUMBER, step="0.01", minimum=0,
                   hint="What a shopper pays when buying from this section"),
    "compareAt": field("compareAt", "Compare-at price", KIND_NUMBER, step="0.01", minimum=0,
                       hint="Shown struck through beside this section's price"),
    "label": field("label", "Label on the card", KIND_TEXT, placeholder="Only 10 left",
                   hint="Shown on this product's card inside this section"),
    "badgeColor": field("badgeColor", "Label colour", KIND_COLOR,
                        hint="Overrides the section colour for this product's label"),
    "startsAt": field("startsAt", "Shows in this section from", KIND_DATETIME,
                      hint="When one product leaves, the rest of the section carries on"),
    "endsAt": field("endsAt", "Shows in this section until", KIND_DATETIME),
    "position": field("position", "Position in this section", KIND_NUMBER, minimum=0),
    "quantity": field("quantity", "Quantity for this section", KIND_NUMBER, minimum=0,
                      hint="How many this section may sell; empty means no limit"),
}

#: Recommended starting lists. A section may override any of them.
REQUIREMENT_SETS: dict[str, tuple] = {
    "simple": ("position",),
    "curated": ("price", "compareAt", "label", "position", "startsAt", "endsAt"),
    "campaign": ("price", "compareAt", "label", "badgeColor", "position", "startsAt", "endsAt"),
    "automatic": (),
}
REQUIREMENT_PRESET_CUSTOM = "custom"

#: Which recommended list a dressing suggests. Dressing only ever *adds*.
PRESENTATION_REQUIREMENTS = {
    PRESENTATION_STANDARD: "simple", "sale": "curated", "flash_sale": "campaign",
    "new_arrivals": "simple", "featured": "simple",
}

#: What a card shows in a section: a display decision, not a product requirement.
CARD_DISPLAY_FIELDS = (
    field("showSectionPrice", "This section's price", KIND_TOGGLE, default=True,
          hint="Instead of the product's normal price"),
    field("showCompareAt", "Compare-at price", KIND_TOGGLE, default=True),
    field("showLabel", "Card label", KIND_TOGGLE, default=True),
    field("showCountdown", "Countdown to the section's end", KIND_TOGGLE, default=True),
    field("showRemaining", "Remaining quantity", KIND_TOGGLE, default=False,
          hint="Taken from the quantity a product is given in this section"),
)

#: Older name kept: the per-product field sets, as lists.
PRODUCT_CONFIG_PRESETS: dict[str, list[dict]] = {
    preset: [dict(REQUIREMENT_LIBRARY[key]) for key in keys if key in REQUIREMENT_LIBRARY]
    for preset, keys in REQUIREMENT_SETS.items()
}
PRODUCT_CONFIG_PRESETS.update({
    "flash_sale": PRODUCT_CONFIG_PRESETS["campaign"],
    PRESENTATION_STANDARD: PRODUCT_CONFIG_PRESETS["simple"],
    "new_arrivals": PRODUCT_CONFIG_PRESETS["simple"],
    "featured": PRODUCT_CONFIG_PRESETS["simple"],
    "sale": PRODUCT_CONFIG_PRESETS["curated"],
})

# ── Automatic feeds, each with its own ranking rule ────────────────────────
#: ``rank`` is what the resolver reads: the metric, the window it counts over
#: (0 means every paid sale ever) and the minimum a product must reach.
AUTOMATIC_SOURCES: dict[str, dict] = {
    "trending": {
        "label": "Trending",
        "hint": "Ranked by units sold per day inside a short window, newest first when tied.",
        "rank": {"primary": "velocity", "window": 7, "minimum": 1, "tiebreak": "recent"},
        "config": [field("windowDays", "Trending window (days)", KIND_NUMBER, default=7),
                   field("minimumSales", "Minimum units sold", KIND_NUMBER, default=1)],
    },
    "best_sellers": {
        "label": "Best sellers",
        "hint": "Ranked by total paid units sold, all time unless you set a window.",
        "rank": {"primary": "units", "window": 0, "minimum": 1, "tiebreak": "recent"},
        "config": [field("windowDays", "Count sales from the last (days)", KIND_NUMBER, default=0,
                         hint="0 counts every paid sale ever"),
                   field("minimumSales", "Minimum units sold", KIND_NUMBER, default=1)],
    },
    "newest_arrivals": {
        "label": "New arrivals",
        "hint": "Newest approved products first, optionally only those added recently.",
        "rank": {"primary": "created_desc", "window": 0, "minimum": 0, "tiebreak": "recent"},
        "config": [field("windowDays", "Only products added within (days)", KIND_NUMBER, default=0)],
    },
    "on_sale": {
        "label": "On sale",
        "hint": "Products carrying a live discount, biggest saving first. Nothing is attached by hand.",
        "rank": {"primary": "discount_pct", "window": 0, "minimum": 0, "tiebreak": "recent"},
        "config": [],
    },
    "category": {
        "label": "One department",
        "hint": "Everything approved inside a department you choose from the department manager.",
        "rank": {"primary": "created_desc", "window": 0, "minimum": 0, "tiebreak": "recent"},
        "selector": "category",
        "config": [field("categorySlug", "Department", KIND_CHOICE, source="categories", required=True)],
    },
    "collection": {
        "label": "One collection",
        "hint": "Everything approved inside a collection you choose from the collection manager.",
        "rank": {"primary": "created_desc", "window": 0, "minimum": 0, "tiebreak": "recent"},
        "selector": "collection",
        "config": [field("collectionSlug", "Collection", KIND_CHOICE, source="collections", required=True)],
    },
    "related": {
        "label": "Related to the product being viewed",
        "hint": "Product pages only. Filled from the product's own relationships.",
        "rank": {"primary": "related", "window": 0, "minimum": 0, "tiebreak": "recent"},
        "config": [],
    },
}

#: Old source spellings kept readable, never offered as automatic feeds.
LEGACY_SOURCES = ("flash_sale", "featured")

#: ``assigned`` is a source too: the curated list lives in SectionPlacement.
ASSIGNED_SOURCE = "assigned"
ALL_SOURCES = (ASSIGNED_SOURCE,) + tuple(AUTOMATIC_SOURCES) + LEGACY_SOURCES

#: Fields the campaign dressing carries. Dressing, so it never gates a product field.
FLASH_SALE_FIELDS = (
    "eyebrow", "title", "subtitle", "ctaLabel", "ctaHref", "startsAt", "endsAt",
    "showCountdown", "countdownLabel", "theme", "backgroundColor", "accentColor", "textColor",
    "timerBackgroundColor", "timerTextColor", "layout", "showDiscountBadges", "showViewAll",
)

FLASH_SALE_DEFAULTS: dict = {
    "eyebrow": "Limited time only", "showCountdown": True, "countdownLabel": "Ends in",
    "theme": "ember", "backgroundColor": "#FFF3EF", "accentColor": "#E4572E",
    "textColor": "#12263A", "timerBackgroundColor": "#12263A", "timerTextColor": "#FFFFFF",
    "layout": "carousel", "showDiscountBadges": True, "showViewAll": True,
}

# ── Placement state ────────────────────────────────────────────────────────
PLACEMENT_ACTIVE = "active"
PLACEMENT_PAUSED = "paused"
PLACEMENT_STATES = (PLACEMENT_ACTIVE, PLACEMENT_PAUSED)

# ── The editor's fields, per section type ──────────────────────────────────
SHARED_DESIGN_FIELDS = (
    field("title", "Title", KIND_TEXT),
    field("eyebrow", "Eyebrow", KIND_TEXT),
    field("subtitle", "Description", KIND_TEXT, long=True),
    field("backgroundColor", "Background", KIND_COLOR, default="#FFFFFF", allowGradient=True),
    field("accentColor", "Accent", KIND_COLOR, default="#E4572E"),
    field("textColor", "Text", KIND_COLOR, default="#12263A"),
    field("padY", "Vertical padding", KIND_CHOICE, default="normal",
          options=ch(("compact", "Compact"), ("normal", "Normal"), ("generous", "Generous"))),
)
COLOUR_FIELDS = SHARED_DESIGN_FIELDS[3:6]

#: The section's own clock, available to every family rather than only a campaign.
SECTION_CLOCK_FIELDS = (
    field("startsAt", "Section starts", KIND_DATETIME,
          hint="Before this moment the section is not on the shop"),
    field("endsAt", "Section ends", KIND_DATETIME,
          hint="When the section closes the whole band goes; products keep their own clocks"),
)
ACROSS_FIELD = field("across", "Across on a phone", KIND_CHOICE, default="2",
                     options=ch(("1", "One"), ("2", "Two"), ("3", "Three"), ("4", "Four")))
ARRANGEMENT = (
    ACROSS_FIELD,
    field("layout", "Arrangement", KIND_CHOICE, default="grid",
          options=ch(("grid", "Grid, wrapping down the page"),
                     ("groups", "Sets of rows, swiped for the next set"),
                     ("horizontal", "One row, running off the edge"))),
    field("seeAll", "See-all link", KIND_TOGGLE, default=True),
)
ROWS_PER_SET = field("rowsPerSet", "Rows per swipe", KIND_CHOICE, default="2",
                     options=ch(("1", "One"), ("2", "Two"), ("3", "Three"), ("4", "Four"),
                                ("5", "Five"), ("6", "Six")))
LIMIT_FIELD = field("limit", "How many products", KIND_NUMBER, default=8, minimum=1, maximum=60)
PRODUCT_COPY = (field("title", "Title", KIND_TEXT), field("eyebrow", "Eyebrow", KIND_TEXT),
                field("subtitle", "Description", KIND_TEXT, long=True))

SECTION_FIELDS: dict[str, list[dict]] = {
    "hero_banner": copy_of(PRODUCT_COPY + (
        field("ctaLabel", "Button label"), field("ctaHref", "Button link"),
        field("secondaryLabel", "Second button"), field("secondaryHref", "Second button link"),
        field("mediaOnly", "Hero display", KIND_CHOICE, default="false",
              options=ch(("false", "Text and button over the media"),
                         ("true", "Media only — no copy, buttons or shading"))),
        field("align", "Text across", KIND_CHOICE, default="left",
              options=ch(("left", "Left"), ("center", "Centre"), ("right", "Right"))),
        field("vertical", "Text height", KIND_CHOICE, default="middle",
              options=ch(("top", "Top"), ("middle", "Middle"), ("bottom", "Bottom"))),
        field("tone", "Overlay tone", KIND_CHOICE, default="dark",
              options=ch(("dark", "Dark behind light text"), ("light", "Light behind dark text"))),
        field("scrim", "Overlay strength", KIND_NUMBER, default=55, minimum=0, maximum=100),
    ) + SECTION_CLOCK_FIELDS),
    "product_carousel": mix(
        PRODUCT_COPY,
        (
            field("source", "Products come from", KIND_CHOICE, options="feeds"),
            field("type", "Display layout", KIND_CHOICE, default="product_carousel",
                  options=ch(("product_carousel", "Product row / carousel"),
                             ("product_grid", "Product grid"))),
            field("presentation", "How it is dressed", KIND_CHOICE, default="standard",
                  options=ch(("standard", "A standard product row"),
                             ("flash_sale", "Timed campaign band"),
                             ("sale", "Sale styling"),
                             ("new_arrivals", "New arrivals styling"),
                             ("featured", "Featured styling"))),
            field("countdownLabel", "Countdown label"),
            field("ctaLabel", "Button label"),
            field("ctaHref", "Button link"),
            field("showDiscountBadges", "Discount badges", KIND_TOGGLE, default=True),
            field("timerBackgroundColor", "Timer background", KIND_COLOR, allowGradient=True),
            field("timerTextColor", "Timer text", KIND_COLOR),
        ),
        ARRANGEMENT,
        (ROWS_PER_SET, LIMIT_FIELD),
        COLOUR_FIELDS,
        SECTION_CLOCK_FIELDS,
    ),
    "hero_slim": copy_of(PRODUCT_COPY + (
        field("ctaLabel", "Button label"), field("ctaHref", "Button link"),
        field("mediaOnly", "Banner display", KIND_CHOICE, default="false",
              options=ch(("false", "Text and button over the media"),
                         ("true", "Media only — no copy, buttons or shading"))),
    ) + SECTION_CLOCK_FIELDS),
    "category_grid": [field("title", "Title", KIND_TEXT), ACROSS_FIELD,
        field("rowsPerSet", "Rows per page", KIND_CHOICE, default="1",
              options=ch(("1", "One"), ("2", "Two"), ("3", "Three"))),
        field("layout", "Arrangement", KIND_CHOICE, default="groups",
              options=ch(("groups", "Groups, swiped"), ("grid", "One grid"), ("horizontal", "One row"))),
        field("seeAll", "See-all link", KIND_TOGGLE, default=True),
    ] + copy_of(COLOUR_FIELDS) + copy_of(SECTION_CLOCK_FIELDS),
    "brand_carousel": [field("title", "Title", KIND_TEXT),
        field("across", "Across on a phone", KIND_CHOICE, default="2",
              options=ch(("1", "One"), ("2", "Two"), ("3", "Three"))),
        field("layout", "How they sit", KIND_CHOICE, default="slider",
              options=ch(("slider", "A sliding row"), ("wrap", "Wrapped rows"))),
        field("seeAll", "See-all link", KIND_TOGGLE, default=True),
        field("limit", "How many brands", KIND_NUMBER, default=12, minimum=1, maximum=60),
    ] + copy_of(COLOUR_FIELDS) + copy_of(SECTION_CLOCK_FIELDS),
    "featured_stores": [field("title", "Title", KIND_TEXT),
        field("layout", "How they sit", KIND_CHOICE, default="cards",
              options=ch(("rows", "One per row"), ("cards", "Cards in a grid"))),
        field("limit", "How many stores", KIND_NUMBER, default=6, minimum=1, maximum=60),
        field("ctaLabel", "Directory link label"), field("ctaHref", "Directory link"),
    ] + copy_of(COLOUR_FIELDS) + copy_of(SECTION_CLOCK_FIELDS),
    "promo_strip": [field("message", "Message", KIND_TEXT),
        field("backgroundColor", "Background", KIND_COLOR, default="#FFFFFF", allowGradient=True),
        field("accentColor", "Colour", KIND_COLOR, default="#E4572E"),
        field("textColor", "Text", KIND_COLOR, default="#12263A"),
        field("icon", "Icon", KIND_CHOICE, default="",
              options=ch(("", "None"), ("truck", "Delivery"), ("shield", "Guarantee"), ("tag", "Offer"))),
        field("ctaLabel", "Link label"), field("ctaHref", "Link"),
        field("dismissible", "Can be dismissed", KIND_TOGGLE, default=False),
    ] + copy_of(SECTION_CLOCK_FIELDS),
    "promo_slots": [field("title", "Title", KIND_TEXT),
        field("subtitle", "Label above each advert", KIND_TEXT),
        field("limit", "At most how many adverts", KIND_NUMBER, default=2, minimum=1, maximum=12),
        field("placement", "Advert placement", KIND_CHOICE, default="explore",
              options=ch(("explore", "Explore"), ("home", "Home"))),
        field("adEvery", "Insert after every", KIND_CHOICE, default="6",
              options=ch(("4", "Four products"), ("6", "Six products"),
                         ("8", "Eight products"), ("12", "Twelve products"))),
    ] + copy_of(SECTION_CLOCK_FIELDS),
    "footer": [field("message", "Closing line", KIND_TEXT), field("title", "Footer title", KIND_TEXT),
        field("ctaLabel", "Link label"), field("ctaHref", "Link"),
        field("backgroundColor", "Background", KIND_COLOR, default="#FFFFFF", allowGradient=True),
        field("textColor", "Text", KIND_COLOR, default="#637586")],
    "product_gallery": [], "buy_box": [], "delivery_block": [], "reviews": [],
}
SECTION_FIELDS["product_grid"] = SECTION_FIELDS["product_carousel"]

PRODUCT_TEMPLATE_TYPES = ("product_gallery", "buy_box", "delivery_block", "reviews")

#: The add-section palette: families first, Product configured rather than preset.
PALETTE: list[dict] = [
    {"id": "hero", "label": "Hero section",
     "hint": "Create a hero or banner block and select shared media or a saved banner.",
     "entries": [{"id": "hero_banner", "label": "Hero banner", "type": "hero_banner",
                  "hint": "Full hero with two buttons or a banner carousel."},
                 {"id": "hero_slim", "label": "Slim banner", "type": "hero_slim",
                  "hint": "Compact band with one button."}]},
    {"id": "product", "label": "Product section",
     "hint": "Name a product section, choose manual or automatic, then declare what it asks of each product.",
     "entries": [{"id": "product_section", "label": "Configure product section", "type": "product_carousel",
                  "hint": "Manual sections are filled from the product form; feeds fill themselves.",
                  "asksSource": True, "defaultSource": ASSIGNED_SOURCE}]},
    {"id": "category", "label": "Category section",
     "hint": "Displays shared categories from the Category manager; configure only its presentation.",
     "entries": [{"id": "category_grid", "label": "Department tiles", "type": "category_grid",
                  "hint": "Every visible department, from the department manager."}]},
    {"id": "brand", "label": "Brand section",
     "hint": "Displays shared brands from the Brand manager; configure only its presentation.",
     "entries": [{"id": "brand_carousel", "label": "Brand row", "type": "brand_carousel",
                  "hint": "Visible brands, from the brand manager."}]},
    {"id": "store", "label": "Store section",
     "hint": "Displays active seller/store records; configure only its presentation.",
     "entries": [{"id": "featured_stores", "label": "Stores", "type": "featured_stores",
                  "hint": "Active sellers worth following."}]},
    {"id": "other", "label": "Other sections",
     "hint": "Advert and page-furniture sections use their existing sources.",
     "entries": [{"id": "promo_strip", "label": "Message strip", "type": "promo_strip",
                  "hint": "One line of reassurance, with its own colour, icon and link."},
                 {"id": "promo_slots", "label": "Advert slots", "type": "promo_slots",
                  "hint": "Placed adverts, from the advert manager."},
                 {"id": "footer", "label": "Footer", "type": "footer", "hint": "The page footer."}]},
    {"id": "product_template", "label": "Product page template",
     "hint": "Only meaningful on the product page. Each reads the product being viewed.",
     "entries": [{"id": "product_gallery", "label": "Gallery", "type": "product_gallery",
                  "hint": "The product's own images."},
                 {"id": "buy_box", "label": "Buy box", "type": "buy_box",
                  "hint": "Price, stock and add to cart."},
                 {"id": "delivery_block", "label": "Delivery and returns", "type": "delivery_block",
                  "hint": "Shipping and return copy."},
                 {"id": "reviews", "label": "Reviews", "type": "reviews",
                  "hint": "Reviews left for the product."}]},
]

#: Which page kind each family belongs to, so a family is never offered where it
#: cannot draw.
FAMILY_PAGE_KINDS: dict[str, tuple] = {
    "hero": ("marketplace_home", "marketplace_explore", "information"),
    "product": ("marketplace_home", "marketplace_explore", "information"),
    "category": ("marketplace_home", "marketplace_explore", "information"),
    "brand": ("marketplace_home", "marketplace_explore", "information"),
    "store": ("marketplace_home", "marketplace_explore", "information"),
    "other": ("marketplace_home", "marketplace_explore", "information"),
    "product_template": ("marketplace_product",),
}


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
    """Whether the section's own window is open right now."""
    moment = moment or datetime.now(timezone.utc)
    starts = moment_of((section or {}).get("startsAt"))
    ends = moment_of((section or {}).get("endsAt"))
    if starts and moment < starts:
        return False
    if ends and moment > ends:
        return False
    return True


def placement_is_active(row) -> bool:
    """Whether a person has left this product switched on in its section.

    False, zero and the words for no all mean paused; a row from before this
    state existed has nothing recorded and reads as on.
    """
    raw = getattr(row, "active", True)
    if isinstance(raw, bool):
        return raw
    if raw is None:
        return True
    text = str(raw).strip().lower()
    if not text:
        return True
    return text not in {"false", "0", "no", PLACEMENT_PAUSED}


def placement_is_live(row, moment: Optional[datetime] = None) -> bool:
    """Whether one product is on the shop in its section right now."""
    if not placement_is_active(row):
        return False
    moment = moment or datetime.now(timezone.utc)
    starts = moment_of(getattr(row, "starts_at", None))
    ends = moment_of(getattr(row, "ends_at", None))
    if starts and moment < starts:
        return False
    if ends and moment > ends:
        return False
    return True


# ── The contract ───────────────────────────────────────────────────────────

def is_product_section(section: dict) -> bool:
    return str((section or {}).get("type") or "") in PRODUCT_SECTION_TYPES


def selection_mode_of(section: dict) -> str:
    """How a section's products are chosen."""
    row = section or {}
    if not is_product_section(row):
        return SELECTION_NONE
    source = str(row.get("source") or ASSIGNED_SOURCE).strip().lower()
    if source in LEGACY_SOURCES:
        return SELECTION_MANUAL
    return SELECTION_MANUAL if source == ASSIGNED_SOURCE else SELECTION_AUTOMATIC


def source_of(section: dict) -> str:
    row = section or {}
    if not is_product_section(row):
        return ""
    source = str(row.get("source") or ASSIGNED_SOURCE).strip().lower()
    if source in LEGACY_SOURCES:
        return ASSIGNED_SOURCE
    return source if source in ALL_SOURCES else ASSIGNED_SOURCE


def presentation_of(section: dict) -> str:
    row = section or {}
    presentation = str(row.get("presentation") or "").strip().lower()
    if presentation in PRESENTATIONS:
        return presentation
    if str(row.get("sectionKind") or "").strip().lower() == "flash_sale":
        return "flash_sale"
    return PRESENTATION_STANDARD


def feed_rule(section: dict) -> dict:
    """The rule an automatic feed ranks by, with the operator's overrides."""
    rule = dict((AUTOMATIC_SOURCES.get(source_of(section)) or {}).get("rank") or {})
    rule.setdefault("primary", "units")
    rule.setdefault("window", 0)
    rule.setdefault("minimum", 0)
    rule.setdefault("tiebreak", "recent")
    row = section or {}
    for key, setting in (("window", "windowDays"), ("minimum", "minimumSales")):
        raw = str(row.get(setting) or "").strip()
        if not raw:
            continue
        try:
            rule[key] = int(float(raw))
        except (TypeError, ValueError):
            continue
    return rule


def selector_of(section: dict) -> str:
    """The manager-owned record a feed filters on, if it filters on one."""
    selector = str((AUTOMATIC_SOURCES.get(source_of(section)) or {}).get("selector") or "")
    if not selector:
        return ""
    row = section or {}
    return str(row.get(f"{selector}Slug") or row.get(selector) or "").strip()


def family_of(section_type: str) -> str:
    """The family a section type belongs to."""
    key = str(section_type or "")
    for group in PALETTE:
        for entry in group["entries"]:
            if entry["type"] == key:
                return group["id"]
    return ""


def palette_for(document_type: str) -> list[dict]:
    """Only the families that can draw on this page are offered."""
    kind = str(document_type or "").strip()
    if not kind:
        return PALETTE
    return [group for group in PALETTE if kind in FAMILY_PAGE_KINDS.get(group["id"], ())]


def requirement_preset(section: dict) -> str:
    """The recommended requirement list this section's dressing suggests."""
    row = section or {}
    declared = str(row.get("requirementsPreset") or "").strip().lower()
    if declared in REQUIREMENT_SETS or declared == REQUIREMENT_PRESET_CUSTOM:
        return declared
    if not is_product_section(row) or selection_mode_of(row) == SELECTION_AUTOMATIC:
        return "automatic"
    return PRESENTATION_REQUIREMENTS.get(presentation_of(row), "simple")


def legacy_requirement_keys(section: dict) -> list[str]:
    """What an older section already asked for, read from its frozen schema."""
    declared = (section or {}).get("productConfigSchema")
    if not isinstance(declared, list):
        return []
    keys: list[str] = []
    for item in declared:
        if not isinstance(item, dict):
            continue
        key = str(item.get("key") or "").strip()
        if key and key in REQUIREMENT_LIBRARY and key not in keys:
            keys.append(key)
    return keys


def _clean_keys(keys) -> list[str]:
    seen: list[str] = []
    for key in keys or []:
        name = str(key or "").strip()
        if name in REQUIREMENT_LIBRARY and name not in seen:
            seen.append(name)
    return seen


def requirement_names(section: dict) -> list[str]:
    """The requirement names a section resolves to, preset included."""
    preset = requirement_preset(section)
    if preset == REQUIREMENT_PRESET_CUSTOM:
        preset = "simple"
    names = legacy_requirement_keys(section)
    for key in REQUIREMENT_SETS.get(preset, ()):
        if key not in names:
            names.append(key)
    return names


def section_requirements(section: dict) -> list[str]:
    """What this section asks of a product placed in it.

    An explicit list is the operator's own and is honoured exactly. Otherwise
    the recommendation for the current dressing is taken, unioned with whatever
    the section already asked for, so a dressing can only ever *add* - it can
    never shut a field off the way the frozen schema used to.
    """
    row = section or {}
    if not is_product_section(row):
        return []
    declared = row.get("productRequirements")
    if requirement_preset(row) == REQUIREMENT_PRESET_CUSTOM and isinstance(declared, list):
        return _clean_keys(declared)
    return _clean_keys(requirement_names(row))


def requirement_fields(keys) -> list[dict]:
    """The field definitions for a list of requirement keys."""
    return [dict(REQUIREMENT_LIBRARY[str(key)]) for key in _clean_keys(keys)]


def product_config_schema(section: dict) -> list[dict]:
    """What the product form should ask for one product in this section."""
    row = section or {}
    declared = row.get("productRequirements")
    if isinstance(declared, list):
        return requirement_fields(declared)
    if isinstance(row.get("productConfigSchema"), list) and row.get("productConfigSchema"):
        return requirement_fields(legacy_requirement_keys(row)) or [
            dict(item) for item in row["productConfigSchema"] if isinstance(item, dict) and item.get("key")]
    return requirement_fields(requirement_names(row))


def section_fields(section: dict) -> list[dict]:
    """Every field the console should render for this section, in order."""
    row = section or {}
    fields = copy_of(SECTION_FIELDS.get(str(row.get("type") or ""), []))
    if not fields:
        return fields
    if is_product_section(row):
        for item in fields:
            if item.get("options") == "feeds":
                item["options"] = [{"value": ASSIGNED_SOURCE,
                                    "label": "Manual — filled from the product form"}] + [
                    {"value": name, "label": f"{value['label']} — {value['hint']}"}
                    for name, value in AUTOMATIC_SOURCES.items() if name != "related"]
                item["current"] = source_of(row)
        return fields
    if any(item["kind"] == KIND_COLOR for item in fields):
        return fields
    return fields + copy_of(SHARED_DESIGN_FIELDS[3:6])


def card_display_defaults(section: dict) -> dict:
    """What a card shows in this section before the operator changes it."""
    return {item["key"]: item.get("default", False) for item in CARD_DISPLAY_FIELDS}


def normalize_section(section: dict) -> dict:
    """Return a section with the contract spelled out.

    The requirement list is re-derived on every save, so the field set a product
    form asks for can never be frozen into a state the console can no longer
    change. Unknown fields are preserved.
    """
    row = dict(section or {})
    # Accept legacy form values but persist a consistent JSON contract.
    visible = row.get("visible", True)
    if isinstance(visible, str):
        row["visible"] = visible.strip().lower() not in {"false", "0", "no", "off", ""}
    elif visible is None:
        row["visible"] = True
    for key, choices in (("align", {"left", "center", "right"}), ("vertical", {"top", "middle", "bottom"}), ("tone", {"dark", "light"})):
        if key in row and str(row[key]).strip().lower() not in choices:
            row[key] = {"align": "left", "vertical": "middle", "tone": "dark"}[key]
        elif key in row:
            row[key] = str(row[key]).strip().lower()
    if is_product_section(row):
        source = str(row.get("source") or ASSIGNED_SOURCE).strip().lower()
        if source in LEGACY_SOURCES or source not in ALL_SOURCES:
            source = ASSIGNED_SOURCE
        row["source"] = source
        row["selectionMode"] = SELECTION_MANUAL if source == ASSIGNED_SOURCE else SELECTION_AUTOMATIC
        row["presentation"] = presentation_of(row)
        row["requirementsPreset"] = requirement_preset(row)
        row["productRequirements"] = section_requirements(row)
        if row["selectionMode"] == SELECTION_MANUAL:
            row["productConfigSchema"] = requirement_fields(row["productRequirements"])
        for key, value in card_display_defaults(row).items():
            row.setdefault(key, value)
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
        for key in list(row.get("productRequirements") or []):
            if str(key) not in REQUIREMENT_LIBRARY:
                raise ValueError(f"'{key}' is not something a section can ask of a product.")
        preset = str(row.get("requirementsPreset") or "").strip().lower()
        if preset and preset not in REQUIREMENT_SETS and preset != REQUIREMENT_PRESET_CUSTOM:
            raise ValueError(f"'{preset}' is not a recommended product-field set.")
    for setting in SECTION_FIELDS.get(str(row.get("type") or ""), []):
        if setting.get("kind") != KIND_COLOR:
            continue
        key = str(setting.get("key") or "")
        raw = str(row.get(key) or "").strip()
        if raw and not is_safe_css_color(raw, allow_gradient=bool(setting.get("allowGradient"))):
            expectation = "a supported CSS colour or gradient" if setting.get("allowGradient") else "a supported CSS colour code"
            raise ValueError(f"'{key}' must be {expectation}.")
    for key in ("ctaHref", "secondaryHref"):
        href = str(row.get(key) or "").strip()
        if not href:
            continue
        if href.startswith(("//", "\\")) or any(ord(char) < 32 for char in href):
            raise ValueError(f"'{key}' must be a same-site path or an HTTPS URL.")
        scheme = re.match(r"^[A-Za-z][A-Za-z0-9+.-]*:", href)
        if scheme and re.match(r"^https://[^/\s]+(?:/|$)", href, re.IGNORECASE) is None:
            raise ValueError(f"'{key}' must use HTTPS for an external destination.")
    for key in ("startsAt", "endsAt"):
        raw = str(row.get(key) or "").strip()
        if raw and moment_of(raw) is None:
            raise ValueError(f"{key} must be a date and time.")
    starts, ends = moment_of(row.get("startsAt")), moment_of(row.get("endsAt"))
    if starts and ends and ends <= starts:
        raise ValueError("A section cannot end before it starts.")


def is_manual_product_section(section: dict) -> bool:
    """Whether a person attaches products to this section by hand."""
    return is_product_section(section) and selection_mode_of(section) == SELECTION_MANUAL


def apply_placement_overrides(product: dict, row) -> dict:
    """One product as the section it was bought from presents it."""
    data = dict(product or {})
    price = float(getattr(row, "price", 0) or 0)
    compare_at = float(getattr(row, "compare_at", 0) or 0)
    base_price = float(data.get("price") or 0)
    base_compare_at = float(data.get("compareAt") or 0)
    price_changed = price > 0 and abs(price - base_price) > 1e-9
    compare_at_changed = abs(compare_at - base_compare_at) > 1e-9
    if price_changed or compare_at_changed:
        data["basePrice"] = base_price
        data["baseCompareAt"] = base_compare_at or None
        data["baseDiscount"] = data.get("discount")
        data["price"] = price if price > 0 else base_price
        data["sectionPrice"] = data["price"]
        data["compareAt"] = compare_at if compare_at > price else None
        data["discount"] = round((compare_at - price) / compare_at * 100) if compare_at > price else None
    config = getattr(row, "config", None) or {}
    label = str(config.get("label") or "").strip()
    if label:
        data["sectionLabel"] = label
    badge = str(config.get("badgeColor") or "").strip()
    if badge:
        data["sectionBadgeColor"] = badge
    quantity = int(getattr(row, "quantity", 0) or 0)
    if quantity > 0:
        data["sectionQuantity"] = quantity
        data["sectionRemaining"] = quantity
    starts_at = getattr(row, "starts_at", None)
    ends_at = getattr(row, "ends_at", None)
    if starts_at is not None:
        data["placementStartsAt"] = starts_at.isoformat()
    if ends_at is not None:
        data["placementEndsAt"] = ends_at.isoformat()
    if getattr(row, "section_id", None):
        data["sectionId"] = row.section_id
        data["sectionDocumentId"] = getattr(row, "document_id", None)
        data["sectionPlacementId"] = getattr(row, "id", None)
    return data

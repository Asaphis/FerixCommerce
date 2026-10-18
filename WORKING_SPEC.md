# FerixCommerce — the working specification

**Purpose of this document.** Everything agreed about how the shop, the CMS, the catalog and the seller studio should work: the model, every screen, every rule, what is already built, what is open, and how to verify it. Written so another engineer or AI can continue without re-deriving any of it.

**Repository:** `Asaphis/FerixCommerce`, branch `main`.
**Last state of `main` when this was written:** `de402891`.

Status marks used throughout: **[AGREED]** decided, not built · **[BUILT]** in `main` · **[OPEN]** fault found, not fixed · **[DECISION NEEDED]**.

---

## 1. What the business wants

A marketplace with three faces and one content system:

1. **The shopper site** (`WebPhase/marketplace`) — products, departments, brands, stores, product pages.
2. **The seller studio** (`WebPhase/merchant`) — a seller uploads products, sees orders, stock and payouts.
3. **The admin console** (`WebPhase/admin`) — staff run the catalogue, the CMS, review and promotions.

The admin owns the platform's catalogue; sellers own their own products. The CMS decides what appears on each page and in what order.

The ambition stated repeatedly, in the user's own terms: **make the section system fully dynamic.** For any given section the operator must be able to configure the colours, the title, the background, the timing, the layout, and — where that kind of section needs it — the price, the label and the expiry of each product inside it. A flash sale needs those; a plain product row does not; and the console must never confuse the two.

---

## 2. The mental model — the single most important part

Five ideas are kept strictly apart. Mixing them is what made the existing system confusing.

| Idea | What it is | Where it lives |
|---|---|---|
| **type** | The visual block: hero, product row, brand row, department tiles | `section.type` |
| **selectionMode** | Who chooses the products: `automatic`, `manual`, or `none` | derived from `source` |
| **source** | The data provider for a product section: a catalogue feed (`trending`, `best_sellers`, `new_arrivals`, `on_sale`, `category`, `collection`, `related`) or `assigned` | `section.source` |
| **presentation** | How the block is *dressed*: `standard`, `flash_sale`, `sale`, `new_arrivals`, `featured` | `section.presentation` |
| **requirements** | What this section *asks of* each product placed in it: a declared list of fields | `section.productRequirements` + `section.requirementsPreset` |

### 2.1 The rule

> **A section never stores a price. It stores the requirement for one.**

A section declares: *"every product in me supplies a price, a compare-at price, a label, its own window, its own position."* The **values** are entered against the product, per section, on the product form and on the admin placement editor, and stored on the placement row.

Consequences that must hold:

- The same product can be cheaper in one section and full price everywhere else. The product record is never edited.
- Two sections can ask for different things. A brand row asks for nothing.
- A section can be given a price requirement at any time; no field list may ever be frozen into a state the console cannot change.

### 2.2 Who owns what

| Data | Owner | Never duplicated into |
|---|---|---|
| Departments | Department manager | Sections, products |
| Brands | Brand manager | Sections, products |
| Collections | Collection manager | Sections, products |
| Stores | Seller records | Sections |
| Media / banners | Media library, banner (campaign) library | Section rows beyond a reference |
| Product facts (title, base price, stock, images) | The catalogue | Placements |
| Per-section price / label / window / quantity / position | The placement | The product |
| Section design, timing, requirements | The section | The product |

A section chooses **presentation and membership**, never duplicates the record.

### 2.3 Manual versus automatic

- **Manual** (`source: assigned`): products are attached by a person — from the product form, or by staff in admin. These are the only sections offered as assignment destinations.
- **Automatic** (any feed): the backend fills the section from the catalogue. It is never offered as a place to attach a product. Each feed ranks by its own declared rule (§11.4), so two feeds can no longer be the same list behind two names.

---

## 3. The two clocks

There are two independent windows. They must never be conflated in the UI.

**(a) The section's clock** — `section.startsAt` / `section.endsAt`.
- Set in the CMS, on the section, for **any** family.
- When it closes, the whole band disappears from the shop at once, every product in it.
- It must be edited with a real date-and-time picker, never by typing `YYYY-MM-DDTHH:MM`.

**(b) A product's clock inside that section** — `placement.starts_at` / `placement.ends_at`.
- Set on the product form, per section; or by staff while editing the placement.
- When it runs out, **only that product leaves that section.** The other products stay, the section stays.
- The product returns to the general list at its normal price, and other sections keep their own terms.
- Bringing it back must be one action: a per-placement **on/off** state (`placement.active`), not date surgery.

**States the console must show** for a section: `live`, `scheduled` (before start), `closed` (after end), `empty` (no products resolved), and `draft` (page has an unpublished draft).

---

## 4. The seven families

The add-a-section palette is organised by family. Each family declares its own field set; every family may also carry the section clock.

| Family | Section types | Draws from | Configures |
|---|---|---|---|
| **Hero** | `hero_banner`, `hero_slim` | Media library, banner/campaign library | Media, copy, one or two buttons, overlay placement, media-only mode, clock |
| **Product** | `product_carousel`, `product_grid` | Placements (manual) or a catalogue feed | Source, layout, arrangement, columns, rows, count, see-all, dressing, requirements, card display, design, clock |
| **Category** | `category_grid` | Department manager | Title, arrangement, columns, rows per page, see-all, colours |
| **Brand** | `brand_carousel` | Brand manager | Title, how they sit, columns, count, see-all, colours |
| **Store** | `featured_stores` | Seller records | Title, how they sit, count, directory label + link, colours |
| **Other** | `promo_strip`, `promo_slots`, `footer` | Own copy, advert manager | Strip: message, colour, icon, link, dismissible, clock · Adverts: count, placement, frequency, label · Footer: closing line, title, link, colours |
| **Product page** | `product_gallery`, `buy_box`, `delivery_block`, `reviews` | The product being viewed | On/off per block only. Offered on the product page and nowhere else |

**Family rules:** a family is only offered on page types where it can draw (`FAMILY_PAGE_KINDS`). The four product-page blocks are never offered on the home page.

---

## 5. The CMS — screens and flows

```
Content  (/cms)
  └─ Pages  (Home · Explore · Product page · About)
       └─ Page  (/cms/pages/[id])
            ├─ Section list  (name · type · who fills it · state · count)
            ├─ Add a section  → family → entry → fields
            └─ Section settings  (/cms/pages/[id]/[sectionId])
Libraries: Media · Banners (campaigns) · Departments · Brands · Collections · Adverts
```

### 5.1 The section list (per page)
Each row: index · **name** (wraps, never truncated) · a meta line saying what it is and who fills it · **state pill** (live / scheduled / closed / empty / hidden) · Edit · secondary actions (move up/down/top/bottom, hide, delete) behind a menu on narrow screens.

**[BUILT]** 44px targets, readable rows, state pill.

### 5.2 Add a section
Pick the family, then the entry. Every entry opens a form of its own:
- Hero → "Hero banner" or "Slim banner" → media + copy + placement + clock.
- Product → "Configure product section" → name, manual or automatic, then the declaration and design.
- Category / Brand / Store → title, arrangement, count, see-all, colours (content stays in its manager).
- Other → message strip, advert slots, footer.
- Product page → gallery, buy box, delivery, reviews (only on the product page).

### 5.3 The section settings screen
Order of panels, all rendered **from the backend contract** (`sectionFields`), never from a frontend list:

1. **Content** — section name, then every field the contract declares for this type, each with the right control: text, number, **date-time picker**, **colour picker with swatch**, choice, toggle.
2. **What this section asks of each product** — checkboxes from `requirementLibrary`: price, compare-at, label, label colour, its own window, position, quantity. Saving stores the list as the operator's own (`requirementsPreset: custom`). **[BUILT]**
3. **What the cards show here** — this section's price, compare-at, label, countdown, remaining quantity. **[AGREED]**
4. **Design** — eyebrow, title, description, background, accent, text colour, padding, shape. Real pickers, a recommended scheme, a reset.
5. **When it runs** — the section clock with two real pickers, plus the computed state.
6. **Preview** — a real preview of the band drawn from the section's own values, including the countdown. **[BUILT for product/campaign; hero already had one]**

### 5.4 The flash-sale confusion (must be resolved)

Three separate things currently carry the name:

| Name | What it actually is | Where |
|---|---|---|
| Section campaign dressing | `presentation: flash_sale` on a product section; copy, countdown, colours, per-product terms | CMS section settings |
| Promotions page | A separate `FlashSale` + `FlashSaleItem` record with its own name, banner, window and sale prices; feeds `home.flashSale` | `/promotions`, `routers/admin.py` |
| "Promotional sections" | A separate list with its own create form, unrelated to page sections | `/cms/sections` |

**Decision [DECISION NEEDED]:** fold the Promotions record into sections, or rename all three so an operator can tell which one they are in. Until then the console must say which is which.

---

## 6. The catalog and seller upload — section-first

Both surfaces (admin `/catalog` and seller `/products`) must open with a chooser, not a blank form.

```
Upload product
  ├─ Upload a general product  → normal form; appears in the catalogue and in every automatic row
  └─ Upload into a section     → sections grouped by PAGE, each row naming:
        · the page (Homepage / Explore page)
        · the section's own name
        · what it asks for ("a price, a label and this product's own clock")
        · how many products it holds
        · its own run dates
        · automatic feeds shown but disabled, with the reason
```

Choosing a section opens **only** that product's facts plus that section's fields. Nothing is left to assign afterwards.

### 6.1 The per-section block
```
This section runs           1 Nov 09:00 → 30 Nov 23:59     (read-only, set in the CMS)
This product in this section 3 Nov 09:00 → 20 Nov 18:00     (real pickers)
[ Active in this section ]  on/off — the one-click way back
Price in this section       9,000        (normal price 12,000 shown beside it)
Compare-at in this section  12,000
Quantity for this section   10
Position                    2
Label on the card           Only 10 left at this price
Status                      pending review · live · expired · paused
```

**[BUILT]** the per-section fields already render from the section's declared requirements (datetime/number/colour/text controls) on both surfaces. **[OPEN]** the chooser; the section clock beside the product clock; the normal price beside the section price; the active switch; the status.

---

## 7. The storefront — the rendering contract

Per-product data the backend sends for a placement (see `apply_placement_overrides`):

| Field | Meaning | Rendered? |
|---|---|---|
| `price`, `compareAt` | The section's price, written over the product's | Yes — this is why section pricing works |
| `sectionPrice` | Same figure, kept for audit | n/a |
| `sectionLabel` | The label typed on the product form | **Yes — [BUILT] in the mobile pass** |
| `sectionBadgeColor` | That label's colour | **Yes — [BUILT]** |
| `sectionRemaining` | How many this section may still sell | **Yes — [BUILT]** |
| `sectionId` | Which section the price came from | **No [OPEN]** — nothing carries it to basket/checkout, so a section price cannot be re-checked at payment |

Per family, the component reads: hero — media, copy, placement, overlay, clock; product — `placements[sectionId]` or a feed, then arrangement/columns/rows/count, or the campaign band; departments/brands/stores — the manager data plus layout; strip — the message only; adverts — count and label; footer — closing line.

**Behaviour that must hold on the shop:** an empty feed renders nothing (and the console shows "found 0"); a closed section disappears; an expired or paused placement drops out of that section only; the campaign band ticks its countdown to the section's end.

---

## 8. The invariants — never break these

1. A section stores requirements, never prices.
2. A dressing may only **add** to what a section asks; never shut a field off. No frozen field lists.
3. A product's expiry in a section affects only that product in that section.
4. Pausing a placement is not deleting it; one action restores it.
5. Automatic sections are never assignment destinations.
6. Departments, brands, collections and stores stay manager-owned; sections never fork them.
7. Two feeds must never be the same list behind two names.
8. Every control the console offers must be drawn by the shop — no dead fields (audit in §12).
9. An empty section must be visible as empty in the console, not silent.
10. Section clock ≠ product clock; both shown, never merged.
11. Inactive placements are never applied (the server filters them out).
12. A section cannot be saved ending before it starts.

---

## 9. UI / UX requirements

- **Touch targets ≥ 44px** for every control (`min-h-11`); the shared admin `SubmitButton` carries it globally. **[BUILT]**
- **Meta text ≥ 11px** on phones; nothing unreadable at 10px. Partially **[BUILT]** (34 → 28 instances; remaining are 10–10.5px labels).
- **Names wrap, never truncate** in lists where the name is the identifier. **[BUILT]** for the CMS section list.
- **Multi-column layouts collapse to two columns on a phone**; no fixed 3–6 column grids without a breakpoint.
- **States are visible everywhere**: live / scheduled / closed / empty / draft / hidden / expired.
- **Plain language**: "Product" not "product_carousel"; "When it runs" not "starts_at"; slug fields become managed pickers.
- **Real controls**: date pickers for dates, colour pickers for colours, selects for choices. Never a text box for a hex value or an ISO timestamp.
- **Preview** wherever the operator is designing something.
- Every screen must state what it will collect and when it applies ("saved as a draft; publish to put it on the storefront").

---

## 10. Backend architecture

```
Backend/
  cms_sections.py     the contract: types, families, fields, requirements, feeds, validation, normalisation
  core.py             SQLAlchemy models + idempotent migration (SCHEMA_VERSION = 3)
  app.py              public routes: /catalog/home, /catalog/explore, product pages; the resolver
  routers/admin.py    CMS, catalogue, review, placements, promotions
  routers/merchant.py seller products, orders, stock; the assignable-section options
  tests/              64 tests, of which 22 cover the section contract
```

### 10.1 Data model (the parts that matter)

- `ContentDocument` — a page: `id`, `title`, `document_type`, `status`, `owner_type`, `data.sections[]`.
- `ContentVersion` — the draft/published copies of that data.
- `SectionPlacement` — one product in one section: `document_id`, `section_id`, `product_id`, `price`, `compare_at`, `quantity`, `position`, `starts_at`, `ends_at`, `config` (label, badge colour and any other declared terms), **`active`**.
- `FlashSale` / `FlashSaleItem` — the legacy promotions record (§5.4).

### 10.2 Section JSON (normalised on every save)

```json
{
  "id": "sec_…", "type": "product_carousel", "name": "Weekend Offers",
  "position": 2, "visible": true,
  "source": "assigned", "selectionMode": "manual",
  "presentation": "flash_sale",
  "requirementsPreset": "custom",
  "productRequirements": ["price","compareAt","label","position","startsAt","endsAt"],
  "productConfigSchema": [ …derived from the list above… ],
  "showSectionPrice": true, "showLabel": true, "showCountdown": true,
  "backgroundColor": "#FFF3EF", "accentColor": "#E4572E", "textColor": "#12263A",
  "startsAt": "2026-11-01T09:00", "endsAt": "2026-11-30T23:59"
}
```

### 10.3 Who serves the console
`GET /admin/cms/section-types` returns: palette, selection modes, presentations, automatic sources with their ranking rules, legacy sources, campaign defaults, product presets, the **section fields per type**, the **requirement library**, the requirement sets and the card display switches. The console renders from this; a new backend field appears in the editor with no frontend change. **[BUILT]**

### 10.4 The feeds

| Feed | Ranked by | Window | Minimum |
|---|---|---|---|
| `trending` | units per day | 7 days | 1 |
| `best_sellers` | total paid units | all time | 1 |
| `new_arrivals` | newest first | optional | — |
| `on_sale` | biggest saving | live discounts | — |
| `category` | newest first | — | reads a managed department |
| `collection` | newest first | — | reads a managed collection |
| `related` | product page only | — | — |

Each declares its rule in `AUTOMATIC_SOURCES[…]["rank"]`; the resolver reads it. **[BUILT]**
Legacy spellings `flash_sale` and `featured` read as manual and are never offered.

---

## 11. What is already built (do not rebuild)

| Commit | What it does |
|---|---|
| `bcf7cf4` | The contract rewrite: declared requirements, typed fields, per-feed rules, placement `active`, migration to schema 3, 22 new tests (64 total) |
| `17516994` | `/admin/cms/section-types` serves fields, requirements, card switches |
| `f182b9b6` | Console types carry them |
| `abe93de8` | Saving what a section asks of a product |
| `ed0c8223` | Section settings render from the contract: requirements panel, live/closed pill, real preview |
| `35aa817d` | Colour pickers and date-time pickers in the editor |
| `43f720d` | Product cards render section label, badge colour and remaining count |
| `6342af0` | Admin responsive pass: 44px targets, readable section rows, larger palette |
| `de402891` | Mobile sweep across admin/merchant/marketplace: 44px targets, larger text |

**Verified:** backend 64/64 tests; `npm run typecheck` rc 0 in all three frontends against the pushed content.

---

## 12. Open faults

| Fault | Status |
|---|---|
| Footer section has no editable fields and the shop reads a field only the editor could set — it renders nothing, ever | **[BUILT]** fields now in the contract; verify the shop draws them |
| Sale / new-arrivals / featured dressings change nothing on the shop; only `flash_sale` is branched on | **[OPEN]** — either draw them or remove them |
| Hero "text width" is saved but never passed to the banner | **[OPEN]** |
| Advert label reads a field the editor never offered (always "Advertisement") | editor now offers "Label above each advert" — **[OPEN]** verify the shop reads it |
| Message strip offers colour, icon, link, dismiss; the shop draws only the message | **[OPEN]** |
| Store directory link is hard-coded | **[OPEN]** |
| `sectionId` not carried to basket/checkout | **[OPEN]** — money-critical |
| Five legacy rails (`trending`, `newArrivals`, `featured`, `under100`, `official`) outside the section system | **[OPEN]** |
| Product-page blocks: fixed order, offered on every page before the palette change | palette fixed; order still fixed **[OPEN]** |
| Quantity per placement is collected but not enforced | **[OPEN]** |
| Three flash-sale concepts | **[DECISION NEEDED]** |
| 28 text instances still at 10–10.5px | **[OPEN]** |

---

## 13. The backlog, in order

1. **The chooser** on `/catalog` and `/products`; choosing a section opens only that place's fields. Files: `admin/app/catalog/page.tsx`, `admin/app/catalog/new/page.tsx`, `merchant/app/products/page.tsx`, `merchant/components/studio/product-form.tsx`, `admin/components/ops/placement-terms.tsx`. **Done when:** picking "Weekend Offers" shows its clock, its price fields and nothing from other sections; picking "general product" shows no section fields at all.
2. **The per-section block** enriched: section clock beside product clock, normal price beside section price, the active switch, the status. **Done when** a seller can price a product for a campaign and bring back an expired one without touching dates.
3. **Basket and checkout carry the section** and re-check the placement price, window and stock. **Done when** the price charged always equals the price shown.
4. **Card display switches** honoured on the shop (price/label/countdown/remaining per section).
5. **Section design everywhere**: colours, padding and shape applied to every family, not only the campaign band.
6. **Draw or remove** the offered-but-unread controls (§12).
7. **The flash-sale decision** (§5.4), then the storefront consequences.
8. **The remaining text-size pass** and a real browser pass at 360px.

---

## 14. Glossary

- **Family** — a group in the palette (Hero, Product, Category, Brand, Store, Other, Product page).
- **Dressing (presentation)** — how a block is styled; never decides which product fields are asked for.
- **Requirement** — a field a section asks of each product placed in it.
- **Placement** — one product in one section, with its own price, label, window, quantity, position and on/off state.
- **Feed** — an automatic source for a product section.
- **Section clock / product clock** — the two windows in §3.
- **Manager-owned** — departments, brands, collections, stores, media, banners, adverts.

---

## 15. How to verify

```bash
cd Backend && python -m unittest discover -s tests -v      # expect: Ran 64 tests … OK
cd WebPhase/admin       && npm ci && npm run typecheck      # expect rc 0
cd WebPhase/merchant    && npm ci && npm run typecheck      # expect rc 0
cd WebPhase/marketplace && npm ci && npm run typecheck      # expect rc 0
```

On boot the app runs an idempotent migration (`SCHEMA_VERSION = 3`) that adds `section_placements.active` if missing and skips tables the schema has not created yet.

**What to look at after deploying:** CMS → a page → a product section → Edit: real colour swatches and date pickers, the requirements panel, the state pill, a live preview. Then the shop: cards inside a manual section carry the label and "Only N left".

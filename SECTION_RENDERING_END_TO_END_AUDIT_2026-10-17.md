# FerixCommerce — End-to-End CMS Section Rendering Audit

**Audited revision:** `949c430b060f7493ef027757e3e6d8697bf729d2` (`Fix CMS section preview and storefront contract`)
**Audit date:** 2026-10-17
**Scope:** Section declarations and editor controls; draft/live preview; save/publish and API projections; home, listing, product, store and information routes; section and placement product data; card output and cart enforcement.
**Source changes made:** None. This was a read-only audit.

## Executive finding

The draft/publish boundary is basically sound: saving a section creates/updates a private draft, and public catalogue endpoints use published document data. Homepage and listing-page section data also travel through real backend resolvers and the shared `RenderSections` renderer. That is not enough to ensure publication works, however. CMS acceptance, preview, backend response and public route rendering are separate contracts. In several page families the CMS accepts and publishes a section type that the corresponding public route never draws; in other cases individual fields are accepted and saved but are ignored by the public renderer or differ from the Admin preview.

This directly explains the reported symptom: **a preview is not proof that the same route will render the section after publish.** The most serious problem is that the palette/backend validation accepts a broader section/page matrix than the storefront actually supports.

## Page and route coverage

| Public surface | Current data path | Audit result |
|---|---|---|
| Home `/` | `GET /catalog/home` → published sections/placements → `RenderSections` | Most complete route. Supports the shared renderer’s known families, but contains the hero-banner and homepage promo-slot mismatches listed below. |
| Browse/search | `GET /catalog/page?type=marketplace_explore` → `CatalogListing` and `RenderSections` | Shared sections render; promo slots have a separate listing-insertion path. Route-family selection uses a fallback to `marketplace_explore`, so new listing routes could silently use the wrong document type. |
| Category, brand and collection detail | Reuse `CatalogListing` / explore document | Section rendering is shared with Explore; each route additionally filters/locks the main product grid. These are not independent CMS documents today. |
| Departments index `/departments` | Categories API → fixed `CategoryTile` mapping | Not CMS-section-rendered. It is also the category-grid “See all” destination. `showAsTile=false` is treated differently from the category-grid renderer. |
| Product detail `/product/[slug]` | Fetches product and `marketplace_product`, then custom fixed JSX | **High risk:** it does not iterate the CMS section list or honor section order. It only checks visibility for gallery, buy box, delivery and reviews, plus a special related-products carousel. Other types the CMS permits—including hero, promo, footer and manual product sections—can be published and then omitted. If the CMS page is missing/unpublished or its fetch fails, the code defaults to showing the hard-coded blocks. |
| Store detail `/store/[slug]` | Store API → fixed profile and product grid | **High risk:** a `marketplace_store` CMS document is seeded/managed but this route does not fetch it or call `RenderSections`. Published store-page sections are not drawn. |
| Information pages (for example `/about`) | Content-only page API → fixed information page | CMS validation permits section families on information documents, but the public page client extracts content only and does not render sections. Those saved sections can be invisible. |
| Global footer | `FerixFooter` with hard-coded link groups; separate CMS `footer` section exists | Two contracts coexist. The CMS footer supports a closing line and one CTA, not the global link arrays; changing the CMS footer does not configure the site-wide footer links. |

## Confirmed findings, in priority order

### 1. CMS page-family acceptance does not match public route capability — critical for “published but invisible”

`Backend/cms_sections.py` exposes broad page-family allowances, while the routes are not uniformly CMS consumers. Product detail has a custom fixed layout, store detail does not fetch its managed CMS document, and information pages read only content fields. The shared `RenderSections` component also returns `null` for unknown/unsupported types. Therefore, a successful save/publish response does not guarantee that a corresponding public route has a renderer.

**User effect:** a section can exist in the CMS, show in its preview, and be published, yet never appear on its intended public page.

**Fix direction:** choose one of two policies and enforce it at both palette and backend save validation:

1. Implement the CMS document consumer for every managed page family and make it render its allowed section types in `position` order; or
2. Narrow the allowed section families to exactly what each existing route renders, and reject unsupported section types before they can be published.

Do not treat palette membership alone as proof of storefront support.

### 2. Product detail is not a composable CMS section page

`WebPhase/marketplace/app/product/[slug]/page.tsx` checks whether four fixed block types are visible, then lays those blocks out in hard-coded JSX. It does not iterate `cmsPage.sections` or use their `position`; the delivery block is nested inside the buy-box column. The editor exposes empty schemas for these blocks, so operators cannot configure meaningful layout/copy. It does not render other permitted product-page section types. The shared renderer does not implement the product-template types either.

Additional data losses on this route:

- Delivery copy is generic/fixed; product-specific shipping data is not exposed/used.
- Review bodies are returned from the backend but not rendered by the review-list component.
- A missing/unpublished CMS page or fetch failure currently makes `sectionVisible()` return `true`, so the fixed blocks are shown rather than following an explicit page-visibility policy.

**Fix direction:** implement a product-template renderer that iterates the four supported template blocks in CMS order and defines field schemas for each, or explicitly constrain the editor to the existing fixed visibility-only behavior. Then add route tests for each block independently and in non-default order.

### 3. Hero-banner fallback/precedence produces blank or fallback output

In `render-sections.tsx`, `hero_banner` only maps `home.banners` when a `bannerId` is selected. With no direct media and no selected banner it passes an empty slide array, even though the editor says active banners are the fallback. If both `mediaUrl` and `bannerId` are present, the public branch first refuses direct media because a banner is selected, then returns `null` because direct media exists. The Admin preview instead renders usable media, creating preview/public divergence.

There are also scrim inconsistencies: section contract/preview default `55`, while `MediaHero` defaults to `48`; shared banner default overlay stores `0.55`, while the carousel/preview treat the value as a 0–100 percentage and divide by 100.

**Fix direction:** encode one explicit precedence rule—direct media, selected reusable banner, or all active banners—and use the same resolver in preview and public output. Normalize scrim to one unit convention and default.

### 4. Automatic-feed product sections preview as empty

Public `/catalog/home` and `/catalog/page` resolve automatic sources (trending, newest, best sellers, on sale, category and collection) into the section’s product list. The private preview endpoint loads `SectionPlacement` rows only and does not invoke the automatic feed resolver. The preview can therefore say “No assigned products” for a collection/feed section that will populate publicly after publish.

**Fix direction:** use the same source resolver and shopper-safe projection for preview and public feeds, operating against draft settings without publishing them.

### 5. Preview is not faithful for manager-driven sections and adverts

The Admin preview uses synthetic category, brand and store tiles and placeholder advert boxes. It cannot show the real records, images, counts, ordering, empty states or active advert payloads that the public route will consume. It also diverges on category/brand layout and count behavior, some CTA labels/fallback text, and featured-store CTA visibility.

**Fix direction:** load real, public-safe category/brand/store/ad records into a private preview payload. Where that is not feasible, label the preview explicitly as a structural mock and do not present it as a public rendering preview.

### 6. Several persisted settings are no-ops or only partly wired

Examples confirmed in the field-flow audit:

- Flash-sale `theme` and `layout` are in backend defaults/contract intent, but do not reach or change `FlashSaleBand` output; the campaign product layout is hard-coded.
- `showCountdown` controls the campaign-band timer, not a per-product countdown. Placement start/end timestamps filter availability but are not projected to product cards for display.
- `sectionRemaining` is the assigned quantity copied unchanged, not a decrementing remaining count after sales.
- Product-card accent/text styling is partial: section accent reaches label fallback, while card title and card plate colors remain fixed.
- `promo_slots.title` is not rendered; homepage advert fetching is hard-coded to the `home` placement, and homepage does not use `adEvery` as Explore does.
- `product_carousel` has the canonical field schema and `product_grid` is aliased to it in code, but the editor still carries fallback/duplicate logic—this is an unnecessary drift point.
- A new `brand_carousel` can lack the declared `limit=12` default; absent limit is treated as unlimited. Defaults generally are not reliably materialized in the Admin editor/save path, and missing color defaults can be replaced by generic white.
- `padY` is declared as shared design metadata but is not wired through the served field list or public output.

**Fix direction:** create a generated field coverage check: each field must be either (a) editable, serialized, previewed and consumed publicly, or (b) removed from the contract/explicitly marked informational. Materialize declared defaults at section creation/save and keep the backend schema authoritative.

### 7. Listing and directory behavior has smaller but real mismatches

- Featured stores are selected by slicing a merchant list whose database query has no explicit ordering. Same CMS limit can show different stores depending on database order.
- `/stores` offers “Most products,” but backend sorting has no products branch, so it falls through to the rating-based sort.
- Featured-store preview can hide the CTA using `seeAll`, while the backend field schema has no such control and public output always shows the CTA.
- `/departments` ignores `showAsTile=false`, even though `category_grid` uses it to suppress tiles.
- Brand carousel preview is placeholder-only, caps its visual sample, and has different empty/layout/CTA behavior from public output.

### 8. API and placement/cart integrity still needs hardening

The public section resolver correctly gates pages by publication, filters section/placement time windows, and uses server-derived placement prices; the code does not accept a client-supplied price as authoritative. But cross-checking request writes found:

- Cart POST/PATCH validates section allocation quantity but does not enforce the product’s current base stock. A client can request cart quantities above stock.
- Admin placement save/replace writes do not comprehensively validate nonnegative price, quantity versus stock, or `endsAt > startsAt`.
- Sending null/empty dates/config does not clear existing placement fields because updates are truthiness-guarded.
- Bulk placement replacement can recreate rows with `{}` config when the caller omits config, dropping labels/badge metadata.
- Advert `href` is accepted, stored and returned without URL validation, and public advert anchors use it directly. Promo-strip canonical save validation exists, but its renderer also lacks a defensive read-time safe-link fallback for legacy data.
- Preview `publicNow` evaluates draft visibility/window state for an existing section ID, so it can disagree with the live published route after a draft changes those values.

These are API/data-integrity issues, not merely visual styling issues. They deserve tests before enabling real checkout or relying on allocation counts.

## What did work in the audit

- Draft save and publish remain distinct: the public CMS resolver reads published document data, not an ordinary saved draft.
- Homepage and listing routes fetch published section payloads and use section/placement live windows.
- Canonical category source, brand slug links, canonical promo-strip message/accent/CTA label, manual placement price overrides and expected-price server validation mostly flow through their intended public paths.
- Public product/store data is projected through shopper-facing serializers in the reviewed paths.

## Verification and limitations

- Backend: `Backend/.venv/bin/python -m unittest discover -s tests -v` — **68 tests passed**.
- Marketplace: `pnpm typecheck` — **passed**.
- Admin: `pnpm typecheck` — **passed**.
- `git diff --check` — **passed**; current checkout is the exact audited commit. Existing untracked reports/spec/lockfiles were present; this audit did not alter application source.
- A separate queued test command used system Python and failed to import `sqlalchemy`; that is an environment/dependency-selection failure, not a failing test assertion. Re-running through the project virtualenv passed.
- This is static repository/API contract review plus unit/type checks, not a live production browser or deployed-backend exercise. It does not establish current production deployment state or verify a real database’s CMS records.

## Recommended repair sequence

1. **Close the invisible-published-section gap:** define a page-family capability table, make Admin palette and backend validation derive from it, and ensure every allowed family is fetched/rendered by its route. Initially, reject unsupported combinations rather than silently publish them.
2. **Fix hero/banner behavior:** implement/test direct media vs selected banner vs active-banner fallback; unify scrim units/defaults.
3. **Unify preview data with public resolvers:** automatic product source resolution, real manager entities/adverts, accurate published-vs-draft status; keep all draft preview access authenticated and private.
4. **Make field coverage enforceable:** default materialization and a contract test connecting backend schema → editor control → save type → preview → public consumer. Remove or implement no-op fields.
5. **Make product templates truly ordered/configurable:** render allowed types in CMS position order or constrain the palette; define delivery and review-body data contracts.
6. **Harden placement/cart/ad API writes:** validate stock/price/windows, enforce stock in cart mutation, implement clear semantics, preserve config in replacement, sanitize advert links, and define a real remaining-allocation model.
7. **Add route-level regression tests:** home, browse/search, category, product, store, information, and footer; for each test draft invisibility, post-publish visibility, hidden/window behavior, and each allowed type’s rendered output.

**Bottom line:** the existing regression suite passing does not prove every CMS type renders. The missing protection is an end-to-end route/field contract test. Fix the accepted-page-family versus actual-renderer mismatch first; it best explains a successfully published section not appearing at all.

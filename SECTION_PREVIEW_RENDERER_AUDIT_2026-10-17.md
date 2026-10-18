# FerixCommerce CMS Section Preview / Renderer Audit

**Date:** 2026-10-17
**Repository:** `/home/ubuntu/FerixCommerce`
**Audited revision:** `de402891f91c9ece9a51c040360fc56f601bb87c` on `main`
**Declared specification:** [`WORKING_SPEC.md`](/home/ubuntu/FerixCommerce/WORKING_SPEC.md)

## 1. Scope and conclusion

This report synthesizes the supplied independent, read-only source reviews. It explains why a CMS edit saved as a draft can appear in the admin editor while time, background, title, color, card, or other values appear absent in preview or on the storefront; why publishing can still result in an empty or broken-looking page; and whether catalog upload, section configuration, placement/card data, API responses, and frontend rendering form one coherent contract.

### Executive diagnosis

There is **not one failure**. There are four overlapping behaviors:

1. **Confirmed lifecycle behavior:** `Save draft` writes a `ContentVersion`; it deliberately does not replace the live `ContentDocument.data`. The storefront reads the published document only. A saved draft therefore does not change shoppers' output until the separate `Publish` action succeeds. Evidence: `/WebPhase/admin/lib/actions.ts:373-485`, `/WebPhase/admin/lib/api.ts:943-954`, `/Backend/routers/admin.py:2573-2624`, `:2639-2662`, and `/Backend/app.py:636-638`, `:1071-1078`.
2. **Confirmed preview defect:** the section editor uses persisted values as `defaultValue`, and its preview reads the loaded `section`; it is not driven by current unsaved form state. Evidence: `/WebPhase/admin/app/cms/pages/[id]/[sectionId]/page.tsx:339-355`, `:376-391`, `:430-499`.
3. **Confirmed contract/rendering gaps:** a number of fields are accepted and/or exposed by the backend and editor but are ignored, hard-coded, or only partially implemented by the storefront. This includes most card-display switches, several colors/links, non-`flash_sale` presentations, parts of hero behavior, and several family renderers. Evidence is detailed in Sections 4–6.
4. **Confirmed route/data-integrity gaps:** sections can be offered or saved outside the renderer/page route that supports them; legacy CMS writes bypass canonical validation; section IDs and visibility are weakly validated; published sections can silently return `null`; and placement price, quantity, active state, and section identity do not survive the cart/checkout boundary. These can produce a blank, stale, or financially incorrect storefront even after a successful save/publish.

The most likely explanation for the narrow symptom “I saved it but the storefront still shows the old version” is the **intentional draft-versus-published gate**, not a failed write. The most likely explanations for “I published it but this section is blank or some values do nothing” are the **preview/storefront contract gaps, page-route incompleteness, unfiltered palette, legacy write path, or empty/missing render data**.

## 2. Desired flow according to the working specification

The specification defines a single content system shared by admin, merchant, and shopper surfaces. The important intended path is:

1. **Admin selects a page and section family.** The palette should be filtered by page type. Product-page blocks must not be offered on the home page. `WORKING_SPEC.md:91-105`.
2. **Admin configures a section from the backend contract.** Fields should be rendered with their declared controls: text, number, date-time picker, color picker, choice, or toggle. The editor should configure content, requirements, card display, design, section clock, and a real preview. `WORKING_SPEC.md:134-142`.
3. **A section stores requirements, not product prices.** The section declares what each placement must supply; the product-in-section values—price, compare-at, label, window, quantity, position, active state—belong to `SectionPlacement`. `WORKING_SPEC.md:38-63`, `:255-260`.
4. **Save creates a draft.** The draft should be normalized and validated, while the currently published document remains live until explicit publish. This is the intended version model represented by `ContentDocument` and `ContentVersion`. `WORKING_SPEC.md:257-259`; source evidence `/Backend/routers/admin.py:2573-2624`.
5. **Preview should show the current configured values.** Per the specification, it should be a real band preview, including countdown and family-specific behavior, not merely the last persisted object. `WORKING_SPEC.md:140-142`, `:238-239`.
6. **Publish promotes the draft.** The public catalog/page API should return only the published, visible, live sections and resolve automatic feeds or active placements. Source evidence `/Backend/routers/admin.py:2639-2662`, `/Backend/app.py:610-707`, `:1071-1078`, `:1386-1452`.
7. **Frontend route renderers should draw every offered field.** The shopper should see the configured title, colors, timing, layout, links, card switches, and placement values. `WORKING_SPEC.md:193-208`, invariant 8 at `:212-225`.
8. **Cart/checkout should preserve placement context.** A section-specific price must be rechecked against the active placement at quote/place time; the section identity must survive to the order. `WORKING_SPEC.md:197-204`, `:336-344`.

The implementation currently satisfies only parts of this path.

## 3. Root causes ranked by impact

| Rank | Root cause | Impact | Status and evidence |
|---:|---|---|---|
| 1 | **Draft save is not publish.** | A successful save is invisible to shoppers by design; operators may interpret this as data loss. | **Confirmed source behavior.** `/WebPhase/admin/lib/actions.ts:373-485`; `/Backend/routers/admin.py:2573-2624`, `:2639-2662`; `/Backend/app.py:636-638`, `:1071-1078`. |
| 2 | **Preview is not live form state and is a hand-written mock.** | Operators can inspect stale values, believe an edit is previewed, and publish a result different from what they saw. | **Confirmed.** `/WebPhase/admin/app/cms/pages/[id]/[sectionId]/page.tsx:376-391`, `:430-499`, `:625-693`. |
| 3 | **Published section dispatch is incomplete and route-specific.** | Valid published sections can be dropped on Explore, product, store, and information routes; unsupported types fall through to `null`. | **Confirmed.** `/WebPhase/marketplace/app/page.tsx:165-208`; `/WebPhase/marketplace/components/ferix/catalog-listing.tsx:127-150`, `:289-317`; `/WebPhase/marketplace/app/product/[slug]/page.tsx:39-55`, `:72-77`, `:228-295`; `/WebPhase/marketplace/app/about/page.tsx:29-49`; `/WebPhase/marketplace/app/store/[slug]/page.tsx:12-22`, `:31-156`; `/WebPhase/marketplace/components/ferix/render-sections.tsx:514-517`. |
| 4 | **Palette and validation do not enforce page-family compatibility or known types.** | Operators can save/publish a product-only or unknown section on a page whose renderer has no case; it then renders nothing. | **Confirmed.** `/Backend/cms_sections.py:386-396`, `:535-540`, `:683-707`; `/Backend/routers/admin.py:2421-2455`; `/WebPhase/admin/app/cms/pages/[id]/page.tsx:74-80`, `:126-128`; renderer `/WebPhase/marketplace/components/ferix/render-sections.tsx:514-517`. |
| 5 | **Backend contract fields are not threaded through preview, API types, and storefront components.** | Time/background/title/color/card/link values can be saved but ignored or hard-coded; preview and published page disagree. | **Confirmed.** See the field-path table and Sections 5–6. |
| 6 | **Legacy CMS document save/publish bypasses canonical validation and normalization.** | A legacy homepage edit can return success while storing unsupported/stale JSON that the renderer silently skips. | **Confirmed.** `/Backend/routers/admin.py:1871-1884`, `:1971-2033` versus canonical `:2587-2601`; `/WebPhase/admin/app/cms/homepage/page.tsx:4`, `:16-20`, `:47`, `:93-108`. |
| 7 | **Section IDs, visibility, and empty-data cases are weakly guarded.** | Missing/duplicate IDs can break merge, React keys, placements, or automatic resolver paths; false-like strings remain visible; empty content can look like a broken page. | **Confirmed source risks.** `/Backend/routers/admin.py:332-344`, `:2371-2375`, `:2588-2600`; `/Backend/core.py:1071-1078`; `/WebPhase/marketplace/components/ferix/render-sections.tsx:520-525`; `/Backend/app.py:1419-1446`. |
| 8 | **Placement context is discarded at cart/checkout.** | A card may show a section discount while cart/quote use the base price; quantity and active/window checks cannot be repeated. | **Confirmed and critical, although payment itself is unavailable in this revision.** `/Backend/app.py:932-947`, `:1273-1314`; `/Backend/core.py:1283-1299`; `/WebPhase/marketplace/components/ferix/add-to-cart.tsx:79-112`; `/WebPhase/marketplace/lib/api.ts:526-527`. |

## 4. CMS input → save → API → preview → published page data path

The table below distinguishes what is present in the source path from what is missing or unverified. “Stored” means source code accepts/persists the value; it does not mean a runtime request was executed in this audit.

| Field / concern | CMS input | Save payload / normalization | Backend stored / response | Admin preview | Published page API | Frontend renderer | Audit result |
|---|---|---|---|---|---|---|---|
| **Draft lifecycle / status** | Page and section forms expose Save; publish is a separate action. `/WebPhase/admin/lib/actions.ts:373-485`, `/WebPhase/admin/lib/api.ts:943-954`. | Save sends the assembled page to `PATCH /admin/cms/page`. | `/Backend/routers/admin.py:2573-2624` writes a draft `ContentVersion`; `/Backend/routers/admin.py:2639-2662` promotes it only on publish. | Page UI expects `hasDraft` and `publishedSections`, but those are not returned. `/Backend/routers/admin.py:2397-2418`, `:2559-2569`, `:2621-2624`; `/WebPhase/admin/app/cms/pages/[id]/page.tsx:95-102`, `:212-224`; API types `/WebPhase/admin/lib/api.ts:926-938`. | `/Backend/app.py:636-638`, `:1071-1078` use published document data; unpublished documents yield no visible published sections. | Old live state remains until publish. | **Confirmed lifecycle mismatch and high operator-confusion risk.** Draft metadata/live comparison must be added to the response. |
| **Unsaved title, subtitle, copy, CTA** | Inputs use `defaultValue`, not a controlled preview model. `/WebPhase/admin/app/cms/pages/[id]/[sectionId]/page.tsx:430-499`. | Server action reads `FormData`, merges `field_*` values into the current section, then saves. `/WebPhase/admin/lib/actions.ts:381-480`. | Canonical page save normalizes supported fields. `/Backend/cms_sections.py:644-669`; `/Backend/routers/admin.py:2588-2601`. | Preview reads the loaded `section` at `:376-391`, not current FormData. | Published API can contain the normalized value if the section is published. | Some families read title/message; many CTA/copy fields are ignored or hard-coded. `/WebPhase/marketplace/components/ferix/render-sections.tsx:268-277`, `:478-510`. | **Confirmed stale preview; partial storefront support.** |
| **Background/accent/text colors** | Backend declares them; editor offers color controls in relevant forms. `/Backend/cms_sections.py:249-338`; editor `/WebPhase/admin/app/cms/pages/[id]/[sectionId]/page.tsx:451-500`. | Values are submitted as fields and normalized where supported. | Values are retained in normalized section JSON. `/Backend/cms_sections.py:644-669`. | Preview paints colors for some product mock cases, but not all family behavior. `:672-680`. | Public API can carry them, but frontend API types omit many fields. `/WebPhase/marketplace/lib/api.ts:397-437`. | Standard product/category/brand/store/strip/footer renderers largely use fixed classes or ignore colors. `/WebPhase/marketplace/components/ferix/render-sections.tsx:291-339`, `:343-377`, `:430-458`, `:268-277`, `:503-510`. | **Confirmed save/API-to-renderer gap.** |
| **Section clock (`startsAt`, `endsAt`)** | Date-time control is present in the canonical editor. `/WebPhase/admin/app/cms/pages/[id]/[sectionId]/page.tsx:451-500`; spec requires real pickers, `WORKING_SPEC.md:72-87`, `:237`. | Canonical validation rejects malformed clocks and `end <= start`; normalization persists defaults. `/Backend/cms_sections.py:683-707`, `:644-669`. | Public readers apply section liveness. `/Backend/cms_sections.py:401-426`; `/Backend/core.py:1071-1078`; `/Backend/app.py:1400-1406`. | Preview shows a static campaign timer for `flash_sale` and does not implement a changing countdown. `:676-680`. | Published API filters closed/not-yet-live sections. | Flash-sale band receives `endsAt`; other family behavior is not uniformly styled. `/WebPhase/marketplace/components/ferix/render-sections.tsx:409-424`. | **Mostly wired for well-formed canonical data; preview and legacy/read-time edge cases remain.** Exact-end semantics and malformed legacy timestamps were not runtime tested. |
| **Product clock (`placement.starts_at`, `ends_at`) and active** | Product/admin forms expose date fields but not section clock or active switch. `/WebPhase/admin/components/ops/placement-terms.tsx:15-41`; `/WebPhase/merchant/components/studio/product-form.tsx:241-289`. | Placement inputs are permissive strings; `active` is not accepted. `/Backend/routers/admin.py:2774-2787`. | Placement rows store clocks/quantity/active, but serializer omits active and malformed timestamps can become `null`. `/Backend/routers/admin.py:2799-2808`, `:2906-2909`, `:2981-2986`. | No placement-clock/status display in forms. | Public resolver filters inactive and out-of-window placements. `/Backend/cms_sections.py:429-457`; `/Backend/app.py:652-657`, `:1426-1437`. | Section cards can receive `sectionRemaining`, label, and badge; product clock cannot be rechecked after cart. | **Partial alignment; active/status and strict date validation are missing.** |
| **Card display switches** | Backend serves `cardDisplay`, but the section settings screen has no panel consuming it. `/Backend/routers/admin.py:2451-2454`; `/WebPhase/admin/app/cms/pages/[id]/[sectionId]/page.tsx:536-560`. | Product section fields do not include the switches; save cannot reliably transmit them. `/Backend/cms_sections.py:264-288`. | Normalizer has defaults for switches. `:644-669`. | No switch preview. | API types/section can contain values, but no effective projection is made to cards. | `cards.tsx:22-60`, `:71-77` renders available labels/remaining/price rather than switch-controlled output; only flash-sale band reads some flags. `/WebPhase/marketplace/components/ferix/flash-sale.tsx:118-149`. | **Confirmed dead/partial contract.** |
| **Presentation (`standard`, `flash_sale`, `sale`, `new_arrivals`, `featured`)** | Editor offers all five. `/Backend/cms_sections.py:38-46`, `:271-276`. | Save accepts/normalizes presentation. | Stored in section JSON. | Preview styles product mock and shows a timer for flash sale regardless of all effective controls. `:672-680`. | API carries presentation. | Renderer has a special branch only for `flash_sale`; others use standard path. `/WebPhase/marketplace/components/ferix/render-sections.tsx:381-458`. | **Confirmed dead behavior for non-flash presentations.** |
| **Source / category / collection selector** | Choice fields are declared but builder renders text boxes. `/Backend/cms_sections.py:164-182`; `/WebPhase/admin/components/ops/product-section-builder.tsx:10-15`, `:60-70`. | Raw selector values are saved without managed-record validation. `/WebPhase/admin/lib/actions.ts:320-328`. | Resolver uses raw slug/selector. `/Backend/cms_sections.py:516-522`. | No managed picker feedback. | Feed may resolve to zero products. | Empty product sections return `null` in several paths. `/WebPhase/marketplace/components/ferix/render-sections.tsx:401-402`; `/catalog-listing.tsx:289-291`. | **Confirmed control/validation gap; can look like missing content.** |
| **Section type / page family** | Unscoped palette is rendered for every page. `/Backend/routers/admin.py:2421-2455`; `/WebPhase/admin/app/cms/pages/[id]/page.tsx:74-80`, `:126-128`. | Canonical validation checks non-empty type but not known type/page compatibility. `/Backend/cms_sections.py:683-707`. | Public API returns visible live dictionaries, including unsupported values. `/Backend/core.py:1071-1078`. | Admin can configure a type with no family preview. | Published page can include it. | Unknown types return `null`; product-only blocks are not valid on every route. `/WebPhase/marketplace/components/ferix/render-sections.tsx:514-517`. | **Confirmed high-impact mismatch.** |
| **Placement price / compare-at / quantity / sectionId** | Product/placement forms collect values according to requirements. | Add-to-cart posts only product, variant, quantity. `/WebPhase/marketplace/components/ferix/add-to-cart.tsx:79-112`. | Public section response applies overrides, but cart stores only productId/variant/qty and rehydrates base product. `/Backend/cms_sections.py:715-741`; `/Backend/app.py:932-947`; `/Backend/core.py:1283-1299`. | Preview uses placeholder cards and does not model actual placement data. `/WebPhase/admin/app/cms/pages/[id]/[sectionId]/page.tsx:671-686`. | API can show section price/remaining on catalog response only. | Cards display the override, but quote/place cannot revalidate it; checkout currently returns 503. `/Backend/app.py:1312-1314`. | **Confirmed critical boundary break.** |

## 5. Major findings by subsystem

### 5.1 Admin page/section editor and draft/publish

#### Confirmed: Save draft intentionally does not change the storefront

The save action tells the operator “Saved as a draft. Publish to put it on the storefront” (`/WebPhase/admin/lib/actions.ts:373-485`). The page API has separate PATCH save and POST publish wrappers (`/WebPhase/admin/lib/api.ts:943-954`). The backend saves a draft `ContentVersion` and deliberately leaves `document.data` unchanged (`/Backend/routers/admin.py:2573-2624`); publish copies the latest draft into live document data (`:2639-2662`). Public catalog logic uses the published document and `visible_published_sections`, which returns no visible sections unless the document is published (`/Backend/app.py:636-638`, `:1071-1078`).

This fully explains an old storefront after Save draft. It does **not** by itself explain a published section that remains blank.

#### Confirmed: the CMS page response does not match the page UI's draft/live contract

`_page_summary` reports status, section count, visible count, and sections but not `hasDraft` or `publishedSections` (`/Backend/routers/admin.py:2397-2418`). GET and save replace `summary.sections` with draft sections when one exists but do not update counts or attach the published section list (`:2559-2569`, `:2621-2624`). The UI expects `page.hasDraft` for its Draft pill and `page.publishedSections` for “On the storefront now” (`/WebPhase/admin/app/cms/pages/[id]/page.tsx:95-102`, `:212-224`); the TypeScript type advertises those fields (`/WebPhase/admin/lib/api.ts:926-938`).

The result can be a mixed mental model: a page header/status/count may describe published data while the section list contains draft data, without an explicit comparison.

#### Confirmed: preview does not reflect unsaved edits

The section page loads `getCmsPage()`, finds the persisted section, and renders a server component (`/WebPhase/admin/app/cms/pages/[id]/[sectionId]/page.tsx:339-355`). Inputs use `defaultValue` (`:430-499`), while the preview reads the original section object (`:376-391`). The save action only builds the next section after receiving submitted `FormData` (`/WebPhase/admin/lib/actions.ts:381-480`). Therefore changing title, colors, copy, CTA, image, layout, or end time without saving cannot update the preview.

This directly violates the specification's “real preview” expectation (`WORKING_SPEC.md:140-142`).

#### Confirmed: preview is a simplified mock, not a shared renderer

The preview has cases for hero, category, and product-like content, but it does not implement all seven families. It hard-codes “Departments” and descriptive text (`/WebPhase/admin/app/cms/pages/[id]/[sectionId]/page.tsx:659-670`), renders literal `Product` boxes without placements/images/prices (`:671-686`), and has no meaningful brand, store, promo-strip, promo-slot, or footer branches (`:625-693`). The storefront has separate brand, advert-slot, store, and footer renderers (`/WebPhase/marketplace/components/ferix/render-sections.tsx:343-378`, `:462-511`).

An acceptable preview must either use the same family components with deterministic representative data or clearly identify itself as an approximation. The current panel presents a visual claim it cannot fulfill.

### 5.2 Section contract, palette, and validation

#### Confirmed: family filtering exists in the contract but is not used by the endpoint

`FAMILY_PAGE_KINDS` and `palette_for(document_type)` implement the intended compatibility model (`/Backend/cms_sections.py:386-396`, `:535-540`). However, `/admin/cms/section-types` returns the unfiltered `PALETTE` (`/Backend/routers/admin.py:2421-2455`), and the page UI fetches one palette for every page (`/WebPhase/admin/app/cms/pages/[id]/page.tsx:74-80`, `:126-128`). Save validation only checks that `type` is non-empty and validates a subset of source/presentation/requirements/date rules (`/Backend/cms_sections.py:683-707`).

This is a direct path to publishing `product_gallery`, `buy_box`, or other unsupported blocks on the wrong page. The renderer falls through to `null` for unsupported types (`/WebPhase/marketplace/components/ferix/render-sections.tsx:514-517`).

#### Confirmed: declared field kinds are not honored by editor controls

The backend contract declares text, number, datetime, color, choice, and toggle kinds (`/Backend/cms_sections.py:43-46`). The section editor handles options, long text, color, and datetime, but renders all remaining kinds as a generic text/number input; toggle is not a checkbox/switch (`/WebPhase/admin/app/cms/pages/[id]/[sectionId]/page.tsx:451-500`). Boolean coercion is a hard-coded key list (`/WebPhase/admin/lib/actions.ts:385-409`) rather than derived from the field's declared kind. The product-section builder similarly maps most non-number/datetime/color kinds to text and renders manager-backed selectors as `<input>` (`/WebPhase/admin/components/ops/product-section-builder.tsx:10-15`, `:60-70`).

Known boolean names may happen to serialize correctly, but the contract's promise that a new backend toggle/choice appears correctly without frontend changes is false in this path.

#### Confirmed: validation is incomplete

The canonical save path accepts `sections` as an untyped list and calls `validate_section` directly (`/Backend/routers/admin.py:2371-2375`, `:2588-2593`). Declared options, min/max ranges, field kinds, object shape, non-empty unique IDs, known section types, and page compatibility are not comprehensively validated. A non-dict section can reach `.get`, producing an unhandled error rather than a structured 422 according to the supplied review. Duplicate/missing IDs are accepted even though merge-by-ID assumes uniqueness (`/Backend/routers/admin.py:1871-1879`, `:2588-2600`).

### 5.3 Storefront renderer and page routes

#### Confirmed: only the homepage uses the generic full renderer

The homepage fetches the CMS-backed home payload and invokes `RenderSections` (`/WebPhase/marketplace/app/page.tsx:165-208`). Explore/listing rendering selects only hero, promo slots, product rows, and brand carousel (`/WebPhase/marketplace/components/ferix/catalog-listing.tsx:127-150`) and renders product placements separately (`:289-317`). Product pages use fixed product blocks and one related rail rather than iterating the CMS section list (`/WebPhase/marketplace/app/product/[slug]/page.tsx:39-55`, `:72-77`, `:228-295`). About fetches page content but no section list (`/WebPhase/marketplace/app/about/page.tsx:29-49`), and store routes do not fetch CMS pages (`/WebPhase/marketplace/app/store/[slug]/page.tsx:12-22`, `:31-156`).

This is the highest-impact explanation for “published successfully but not visible” on non-home routes. The backend supports broader families/page kinds than the route components actually dispatch.

#### Confirmed: many controls are ignored or hard-coded

Examples include:

- Product `sale`, `new_arrivals`, and `featured` presentations are offered but only `flash_sale` gets a distinct renderer branch (`/WebPhase/marketplace/components/ferix/render-sections.tsx:381-430`).
- Standard product title-related design values—subtitle, eyebrow, CTA, background, accent, and text color—are not used by the standard path (`:430-458`).
- Category, brand, store, strip, and footer colors/links/icon/dismissible settings are saved or declared but ignored or hard-coded (`:268-277`, `:291-339`, `:343-377`, `:478-510`).
- Featured store directory text/link is hard-coded to “All stores” and `/stores` (`:478-500`).
- Footer reads only a small subset of content and uses fixed styling/link behavior (`:503-510`).
- Flash-sale preview shows a timer without reading the actual switch, does not render CTA links, and the live `FlashSaleBand` hard-codes a 2/3/5-column grid while ignoring the offered layout fields (`/WebPhase/admin/app/cms/pages/[id]/[sectionId]/page.tsx:647-680`; `/WebPhase/marketplace/components/ferix/render-sections.tsx:409-424`; `/WebPhase/marketplace/components/ferix/flash-sale.tsx:118-149`).
- Hero preview uses fixed overlay/tone/placement behavior and selects an unbound reusable banner differently from the published renderer (`/WebPhase/admin/app/cms/pages/[id]/[sectionId]/page.tsx:375-391`, `:639-650`; `/WebPhase/marketplace/components/ferix/render-sections.tsx:197-227`; `/WebPhase/marketplace/components/ferix/media-hero.tsx:56-66`, `:89-108`; `/WebPhase/marketplace/components/ferix/banner.tsx:63-72`, `:213-228`, `:244-317`).

These are not inferred from a missing network response: they are source-level paths where a value is accepted but no consuming read exists or fixed output is emitted.

#### Confirmed: empty data is rendered as no section, with weak observability

Several renderer branches return `null` when there are no products, adverts, stores, slides, or footer copy: `/WebPhase/marketplace/components/ferix/render-sections.tsx:268-277`, `:401-402`, `:463-466`, `:478-480`, `:504-510`; `catalog-listing.tsx:289-291`. A media-only hero with no valid media/banner can also be empty (`/WebPhase/marketplace/components/ferix/banner.tsx:61-73`). The homepage only shows an explicit empty-page message if the entire section list is empty; if sections exist but all resolve empty, it renders an empty wrapper (`/WebPhase/marketplace/app/page.tsx:193-208`).

The working specification says the console should show “empty (no products resolved)” and that an empty section should not be silent (`WORKING_SPEC.md:87`, `:208`, `:221-223`). The current public page behavior is therefore difficult to distinguish from a renderer defect.

#### Confirmed: frontend API types underdeclare the backend contract

`CatalogueSection` omits colors, clocks, card switches, icon, dismissible, and footer fields (`/WebPhase/marketplace/lib/api.ts:397-437`). Renderers use index signatures and broad casts (`/WebPhase/marketplace/components/ferix/render-sections.tsx:21-56`; `/WebPhase/marketplace/app/page.tsx:208`). This permits typecheck success while fields silently disappear from components.

### 5.4 Catalog upload, merchant placement, cards, API, and checkout

#### Partial alignment: section placement overrides reach the section card

`apply_placement_overrides` writes section-specific price, compare-at, label/badge, remaining, and section ID onto the resolved storefront product (`/Backend/cms_sections.py:715-741`). The card component reads label, badge, remaining, and price (`/WebPhase/marketplace/components/ferix/cards.tsx:22-60`, `:71-77`). This explains why some section-level product values can visibly work on the catalog page.

#### Confirmed critical break: placement context is dropped at add-to-cart

The storefront add-to-cart action sends only product ID, variant, and quantity (`/WebPhase/marketplace/components/ferix/add-to-cart.tsx:79-112`; `/WebPhase/marketplace/lib/api.ts:526-527`). Backend cart lines store only those values (`/Backend/app.py:932-947`). Cart reconstruction uses the base product price and computes line totals from it (`/Backend/core.py:1283-1299`); it never looks up `SectionPlacement`. Quote/place checks product availability only (`/Backend/app.py:1273-1314`), and checkout/place currently returns 503 (`:1312-1314`).

Thus catalog card price and cart/quote price can diverge. The section ID is also not retained for future revalidation or order audit. This is explicitly an open money-critical fault in `WORKING_SPEC.md:197-204`, `:327`, and backlog item `:340`.

#### Confirmed: placement quantity is display metadata, not an enforced limit

Placement quantity is stored and mapped to `sectionRemaining` (`/Backend/core.py:462-489`; `/Backend/cms_sections.py:735-738`), but add-to-cart caps only general quantity and checks marketplace availability (`/Backend/app.py:932-947`), while cart reconstruction exposes base stock (`/Backend/core.py:1283-1299`). There is no placement reservation/sold counter or quote/place enforcement. The source review's proposed test—quantity 2, reject quantity 3, then decrement after paid orders—cannot pass without implementing this invariant.

#### Confirmed: active state exists in the model but not in admin/merchant contract

`SectionPlacement.active` defaults true (`/Backend/core.py:462-489`) and public filtering honors false/0/no (`/Backend/cms_sections.py:429-457`; `/Backend/app.py:652-657`). But `PlacementIn` omits `active`, `_placement_json` omits it, and replacement writes can restore true (`/Backend/routers/admin.py:2774-2787`, `:2799-2808`, `:2971-2987`). Forms have no active switch (`/WebPhase/admin/components/ops/placement-terms.tsx:15-41`; `/WebPhase/merchant/components/studio/product-form.tsx:248-289`). This makes a paused placement invisible and difficult to restore.

#### Confirmed: draft sections can receive placements that are not public yet

Approval/assignment resolves against draft content (`/Backend/routers/admin.py:1553-1561`, `:1583-1591`), while public resolution requires the published document and skips placement rows whose section ID is absent from the published revision (`/Backend/core.py:1038-1068`, `/Backend/app.py:637-657`). The merchant UI can therefore permit assignment to a draft-only section (`/WebPhase/merchant/components/studio/product-form.tsx:267`). The behavior is consistent with the draft/publish model but needs an explicit “awaiting page publish” status rather than appearing missing.

#### Confirmed: merchant pending-review status is an expected gate

Merchant saves write placement requests/terms with `pending_review`; Admin approval creates the actual placement (`/WebPhase/merchant/lib/actions.ts:136-162`, `:181-231`; `/Backend/routers/merchant.py:809-828`; `/Backend/routers/admin.py:1519-1612`). This is not itself a defect. It is a user-visible workflow state that must be distinguished from draft, paused, expired, and empty.

## 6. Obsolete, parallel, or unwired components/pages/types

No component or page should be deleted solely from this audit. The following appear **obsolete, parallel, or unwired** and require migration evidence before any deletion decision:

1. **Legacy homepage CMS page and `/admin/cms/document` persistence path.** Evidence: `/WebPhase/admin/app/cms/homepage/page.tsx:4`, `:16-20`, `:47`, `:93-108` uses the legacy flow; `/Backend/routers/admin.py:1871-1884`, `:1971-2033` merges/publishes generic JSON without canonical section validation/normalization; the newer `/admin/cms/page` path does validate/normalize (`:2587-2601`). Recommendation: route legacy writes through the canonical service, migrate existing documents, compare output, then deprecate—not delete yet.
2. **Unscoped `/admin/cms/section-types` palette response.** The server already has `palette_for(document_type)` (`/Backend/cms_sections.py:535-540`) but endpoint/UI use unfiltered `PALETTE` (`/Backend/routers/admin.py:2421-2455`; `/WebPhase/admin/app/cms/pages/[id]/page.tsx:74-80`). This is unwired intended functionality, not an obsolete contract. Recommendation: add document type to the endpoint and filter at both boundaries.
3. **`cardDisplay` response contract and card switches.** Backend serves card-display data (`/Backend/routers/admin.py:2451-2454`) and normalizes defaults (`/Backend/cms_sections.py:644-669`), but section editor, `CatalogueSection`, `RenderSections`, and `ProductCard` do not thread those switches (`/WebPhase/admin/app/cms/pages/[id]/[sectionId]/page.tsx:536-560`; `/WebPhase/marketplace/lib/api.ts:397-437`; `/WebPhase/marketplace/components/ferix/cards.tsx:22-77`). Recommendation: wire it or explicitly mark/deprecate the contract after product decision; do not remove before checking client consumers.
4. **Local `FLASH_SALE_FIELDS` fallback versus served product fields.** The section editor has a local fallback (`/WebPhase/admin/app/cms/pages/[id]/[sectionId]/page.tsx:176-206`) but uses the backend-served contract when available (`:249-263`), so fallback fields can be dead or inconsistent. Recommendation: consolidate to one schema source and add a fixture test.
5. **Bespoke Explore/product/about/store render paths.** These are not necessarily obsolete pages, but they are parallel implementations that do not consume the full generic section system. Evidence: `/WebPhase/marketplace/app/page.tsx:165-208` versus `/WebPhase/marketplace/components/ferix/catalog-listing.tsx:127-150`, product route `:72-295`, about `:29-49`, store route `:12-22`, `:31-156`. Recommendation: define an explicit page-kind dispatch contract; migrate each route to a shared renderer or formally constrain its palette before removing any path.
6. **Legacy rails (`trending`, `newArrivals`, `featured`, `under100`, `official`) and separate Promotions/Promotional Sections concepts.** The specification calls these open/decision items (`WORKING_SPEC.md:144-154`, `:317-331`). Their presence should be inventoried and mapped to current section APIs before deprecation. Do not delete them from source or data as part of this audit.
7. **Fixed product-page blocks.** Product page palette filtering was improved, but order remains fixed and open (`WORKING_SPEC.md:329`). The fixed implementation should not be deleted until product-page section ordering and visibility are implemented and covered by route tests.

## 7. Recommended fixes in dependency order

1. **Make lifecycle state explicit before changing rendering.**
   - Return `hasDraft`, `draftStatus`, `publishedSections`, published counts, and draft counts from `GET /admin/cms/page` and save responses.
   - Show a persistent Draft/Live comparison banner and a clear “Publish changes” affordance on every page/section editor.
   - Keep Save draft from mutating live document data.
   - Add a “save and publish” option only where policy permits.

2. **Establish one canonical CMS write service.**
   - Route legacy `/admin/cms/document` save/publish through the same validation, normalization, ContentVersion, and removed-placement cleanup used by `/admin/cms/page`.
   - Alternatively migrate the legacy homepage screen to `/cms/pages`, but preserve compatibility until all callers/data are migrated.
   - Share removed-section placement cleanup: the old path has it (`/Backend/routers/admin.py:2014-2025`), while new `/cms/page/publish` lacks it (`:2641-2662`).

3. **Close the schema boundary before expanding UI.**
   - Pass `document_type` to section-types and return `palette_for(document_type)`.
   - Validate type membership, page-family compatibility, known fields, object shape, required fields, choices, min/max, colors/dates, and non-empty unique server-owned IDs.
   - Normalize `visible` to boolean and use one helper for false-like legacy values.
   - Return deterministic 422 errors with section/field paths; never allow malformed data to become a 500 or silent `null`.

4. **Build one normalized section model shared by admin, API, preview, and storefront.**
   - Generate or manually maintain a complete TypeScript `Section`/family union matching `SECTION_FIELDS`, card display, requirements, clocks, and placement overrides.
   - Remove broad `unknown`/index-signature casts at public API boundaries.
   - Make field controls derive from `kind`: real toggle, choice/select, color picker, and datetime picker. Use manager-backed selectors for category/collection.

5. **Replace the mock preview with a current-state, shared preview renderer.**
   - Use controlled form state or derive a normalized preview object from current `FormData` on change.
   - Reuse the same family renderer/primitives and field precedence as the storefront, with deterministic representative data for products, brands, stores, adverts, and banners.
   - Show empty/missing-data diagnostics in preview instead of silently claiming a live band.
   - Ensure preview and storefront agree on hero banner precedence, CTA links, scrim/tone/placement, countdown, colors, and layout.

6. **Complete storefront page dispatch and field wiring.**
   - Either route every CMS-backed page through a shared page-kind-aware `RenderSections`, or formally restrict the palette to the families each route renders.
   - Implement or remove/deprecate offered `sale`, `new_arrivals`, `featured`, design, CTA, color, icon, dismissible, footer, and advert-label controls.
   - Thread card-display settings through section → resolved product → `ProductCard` and distinguish per-card countdown from campaign-band countdown.
   - Add deliberate empty states and diagnostics for media-only/no-media and empty feeds.

7. **Repair catalog upload and placement contracts.**
   - Show section clock beside product clock, normal price beside section price, active toggle, and placement status in Admin and Merchant forms.
   - Strictly validate placement timestamps and relationship to section window; preserve omitted versus invalid.
   - Include `active` in input/output and preserve it on replacement.
   - Block or label assignment to unpublished sections as awaiting publish.
   - Expose and preserve position or provide a reorder API.

8. **Carry placement context through cart and order.**
   - Send a placement/document/section reference from the card.
   - Resolve and revalidate active state, section/product windows, current placement price, stock, quantity, and product availability at add, quote, and place.
   - Persist section/placement identity in cart and order item data.
   - Define behavior while payment remains unconfigured (the current `503` must not be mistaken for a passing checkout test).

9. **Only then decide deprecation/removal.**
   - Inventory consumers, migrate data, add parity tests, and measure route/API usage before removing legacy pages, rails, fallback fields, or parallel models.

## 8. Regression and verification plan

### 8.1 Lifecycle and response contract

1. Create a published page with a distinctive title/color/time.
2. Change title and color; click Save draft only.
3. Assert admin GET contains the new draft values, `hasDraft=true`, draft counts, old `publishedSections`, and a visible Draft waiting state.
4. Assert public `/catalog/home` and relevant page API still return the old published values.
5. Publish; assert public API and storefront now return the new values and admin reports no pending draft.
6. Repeat through both current and legacy CMS screens; assert identical 422/normalized behavior and identical public output.

### 8.2 Preview parity matrix

For each family—hero banner, slim hero, product standard, flash sale, sale, new arrivals, featured, category, brand, store, promo strip, promo slots, footer, and product-page blocks where supported—set distinctive values for:

- title, subtitle, eyebrow, message, and CTA label/href;
- background/accent/text colors;
- media/banner selection, media-only, alignment, vertical position, tone, scrim, and text width;
- layout, columns, rows, count, see-all;
- section clock and product/placement clock;
- card switches, product price/compare-at/label/remaining/countdown;
- icon/dismissible/advert label/footer CTA.

Change each value **without saving** and assert the preview updates immediately. Save/reload and assert it remains. Publish and compare preview DOM/visible values to the published route at the same viewport. Verify each unsupported value is either implemented or absent from the contract/editor.

### 8.3 Palette and validation

- `GET /admin/cms/section-types?document_type=...` returns only compatible families.
- Attempt a product-page block on home, an unknown type, missing ID, duplicate ID, malformed section object, invalid choice, out-of-range number, invalid color, and bad dates; each returns a structured 422 with a field path.
- Test `visible` as `false`, `"false"`, `0`, and `"no"`; all must be hidden after normalization.
- Verify automatic sections without IDs cannot create resolver/placement errors.

### 8.4 Published route coverage

Create a fixture page for each supported page kind and put every permitted section family in order. Request home, explore, product, about/information, and store routes. Assert:

- all permitted sections render in order;
- no unsupported section can be published;
- title, colors, timing, links, and card settings reach the DOM;
- empty feeds have a deliberate documented state;
- media-only/no-media and missing banner cases are diagnosed;
- a bad section does not prevent neighboring valid sections from rendering.

### 8.5 Placement/catalog/cart

- Submit a manual placement with a price different from the base catalog price; assert card price equals add-to-cart, quote, and order price and that section/placement identity is retained.
- Pause, expire, and restore the placement; assert public output and add/quote/place behavior change without date surgery.
- Set placement quantity to 2; reject a quantity of 3, reserve/decrement after successful test orders, and hide/disable after balance reaches zero.
- Test reversed, malformed, scheduled, exact-start, exact-end, and just-after-end placement clocks.
- Assign a product to a draft-only section; show awaiting publish, no public row; publish the page and assert placement appears without re-approval.
- Verify removal of a section through the new publish path deletes its orphaned placement rows.

### 8.6 Existing verification commands

`WORKING_SPEC.md:361-368` declares:

```bash
cd Backend && python -m unittest discover -s tests -v
cd WebPhase/admin && npm ci && npm run typecheck
cd WebPhase/merchant && npm ci && npm run typecheck
cd WebPhase/marketplace && npm ci && npm run typecheck
```

The supplied review results report Admin, Merchant, and Marketplace typecheck exit 0. I reran `Backend/.venv/bin/python -m unittest discover -s tests -v`; **64 tests passed** (`Ran 64 tests ... OK`). This confirms the existing regression baseline, but does not cover every missing preview/renderer/API integration test listed above.

## 9. Limits of this audit

- This is a **read-only source audit and synthesis**. No repository files were edited or deleted by the review work except the requested report written at the path shown below; no production services, production databases, credentials, or hosted endpoints were accessed.
- No browser session, live HTTP API call, end-to-end test, visual comparison, or deployed revision/cache check was performed. Runtime behavior is not claimed beyond what the supplied source reviews actually traced.
- The report treats source-level paths as **confirmed implementation facts**, but labels actual user-visible production behavior as requiring the regression/manual tests above.
- The backend unittest baseline was rerun in the repository virtualenv: 64/64 passed. Frontend typecheck results were supplied by the independent reviews; no browser visual/E2E run was performed.
- Deployment/frontend-backend revision parity, CDN/browser caching, database contents, migration state, and production data were not inspected. The primary stale-live explanation remains the confirmed draft-versus-published gate rather than an inferred cache problem.
- Checkout/place is currently reported as returning `503` because payment processing is not configured; no claim is made about production payment behavior.
- No deletion recommendation is final. Components/pages/types marked obsolete or unwired require consumer inventory, migration, parity tests, and an explicit product decision first.

## 10. Bottom line

The CMS does save meaningful data, but the current system has multiple boundaries where the data stops being authoritative: draft versus live document, stale mock preview versus current form, unfiltered palette versus page-family renderer, legacy save versus canonical validation, backend contract versus frontend types/components, and catalog placement response versus product-only cart lines.

The immediate operator-facing fix is to make **Draft vs Live explicit and preview current form state**. The immediate correctness fix is to **enforce one canonical section contract and route every published page through a complete renderer**. The immediate financial/data-integrity fix is to **carry and revalidate placement context through cart and checkout**. Until those dependencies are addressed in that order, a successful save or publish cannot be treated as proof that the configured values will appear—or remain correct—on the storefront.

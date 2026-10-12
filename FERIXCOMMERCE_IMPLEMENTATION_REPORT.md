# FerixCommerce implementation status and remaining work

**Date:** 11 October 2026  
**Code reviewed:** `/home/ubuntu/FerixCommerce-review`, base revision `9fea071dc0cabe327533fb62cbc581442d9d019e` with the working-tree corrections described here.  
**Status:** source corrections implemented and local verification recorded below; **not production-ready**. No production deployment, live database operation, or payment/provider operation was performed.

This is the implementation follow-up to the [source audit](/home/ubuntu/FerixCommerce-review-audit.md), whose issue tables describe the pre-correction baseline. The IDs below map that entire original issue matrix—not a claim that live systems, visuals or providers have been verified.

## What I understand the product to be

FerixCommerce is one commerce product with three related surfaces: **Shopper Marketplace**, **Seller workspace**, and **Admin console**, all backed by one API. These surfaces must share the same product/publication truth, but must not mix ownership or expose one another's private records.

The central product rules I applied are:

- Admin owns the Ferixas Official catalogue and marketplace content; sellers own only their own listings.
- A Seller form creates a **Ferixas Marketplace submission**, requires an Admin-managed category and an explicit acknowledgement, and the API forces `marketplace=true`, `store=false`, `pending_review`. Brand is intentionally optional and called out as such.
- CMS controls which product sections exist, are visible and are live; the product form chooses from those sections. The Admin review queue should show human-readable page/section names.
- Public exposure must require a currently eligible seller, an approved product and the marketplace channel. Hidden CMS/taxonomy records must stay hidden.
- Guest checkout was removed as a false promise: sign-in is required before quote/order details. The current API has **no configured payment provider**, so it does not create an order or claim a charge/capture.
- Seller Studio is visible, concise and **Coming Soon**; it must not present a working independent-website editor until that capability exists.
- Copy should be short, actionable and necessary—not explanatory filler repeated on every page.

## Corrections implemented

### Backend, data and security

- Normalized blank-database seed listings to approved marketplace demo items, while labelling them as demo and zeroing sales/review proof. Seed only runs on a truly blank application database.
- Bound cart access to the authenticated shopper and refused foreign cart IDs/email-based account resolution. Checkout requires an authenticated shopper.
- Protected product/order/review history by archiving referenced seller listings rather than deleting their product identity; unreferenced permitted drafts retain a delete path.
- Restricted Seller promotions to the authenticated seller's own approved marketplace listings and rechecked eligibility in the resolver.
- Centralized public seller/product eligibility and filtered inactive/disabled sellers, hidden taxonomy/CMS sections and hidden placements on public routes.
- Made reviews require delivered **and paid/captured** orders and prevent duplicate user/product reviews.
- Disabled Seller Studio writes behind a stable feature-disabled response.
- Removed source-controlled privileged default passwords. Production first-owner creation requires a one-time bootstrap secret and a 12-character-minimum password. The mock backend's optional shopper fixture now requires explicit local environment values and refuses short passwords; production documentation no longer advertises shared credentials.
- Made required migrations fail closed, recorded/checked a schema version and verified required columns after migration.
- Populated Admin customer follows from canonical, public seller data; removed stale placements when listings leave approved states.
- Completed Admin product API persistence for brand, variants, SEO, low-stock, SKU, channels, images, and shipping/package fields; role and custom-permission changes are validated server-side, including a block on wildcard access for non-owner roles.
- Required categories at the Seller API boundary; made title-generated Seller slugs immutable by ignoring caller-supplied create slugs and preserving the original slug on edit.

### Admin console and content operations

- Extended Admin create/edit catalogue forms and API payloads so displayed product fields round-trip; the edit form hydrates existing descriptions, tags and image lists rather than collapsing them on a routine edit.
- Replaced opaque CMS placement IDs in Seller review with resolved page/section labels.
- Distinguished a pending homepage draft from the published live version.
- Added accessible labels to CMS icon controls.
- Added role and explicit permission editing to team rows, owner protection, success/error feedback, and backend rejection for unsafe self/owner/wildcard changes.
- Replaced silent failures on major Admin delete/publish/restore/promotion/payout/team mutations with errors surfaced by a shared query-toast; form-state save paths continue to report their errors inline.
- Corrected the official catalogue's approved count/filter, resolved backend-relative product/brand/promotion images, clarified wildcard owner access, replaced the blank overview reporting panel with real 30-day GMV/commission figures and an Analytics link, and hid duplicate no-data order/sales panels until activity exists.
- Corrected review badges to say **Pending review**, formatted submission timestamps for operators, and removed repeated queue explanations.
- Simplified Homepage CMS by removing redundant setup steps, repeated page/section IDs and counts, and non-hero supporting-line fields. Ordinary section headings now have a title only; product/category/store assignment remains in its dedicated catalogue controls.
- Upgraded Next.js from 16.1.1 to 16.4.0 across Admin, Seller and Shopper, refreshed lockfiles, and applied non-breaking transitive updates. The follow-up `npm audit` scan reports zero vulnerabilities for all three apps.

### Seller and Shopper surfaces

- Added Studio to shared Seller navigation; replaced the editor with a compact, non-interactive Coming Soon screen; added safe-area viewport metadata for mobile navigation.
- Made category and marketplace-submission acknowledgement required in both the Seller action and backend. The UI explicitly marks brand as optional. Stable generated slug behavior is stated and enforced.
- Exposed requested-change notes distinctly from rejection and added a concise Seller timeline using persisted audit events; event-retention immutability and full transition coverage remain open test/design points.
- Fixed brand locking/filtering, routed search through the shared browse filter/sort model, preserved review login return context, and kept Seller identity visible on compact product cards.
- Gated checkout before quote for signed-in shoppers, removed guest-email continuation, aligned checkout progress and provider-disabled messaging, and updated public readiness copy so the app does not imply that an order/payment completed.
- Added an owner-scoped Seller product-history timeline sourced from persisted review, edit, archive, placement and inventory events; normalized API-relative images in Seller product, media-library and promotion views. Removed a duplicate mobile search affordance and shortened the seeded/UX-preview home-hero copy.
- Removed section eyebrow/supporting copy from shared Shopper section headings and the catalogue brand strip. Removed the redundant starter subtitles from both backend seed paths; CMS saves clear stale category/brand/product/store section copy while preserving hero descriptions and the Advertisement label.

**Existing CMS content caveat:** the code change does not rewrite an already-populated CMS database or publish a new version. Legacy section copy is no longer rendered as a section heading, and the matching redundant fields are removed when those CMS sections are next saved. The separate hero-copy change updates seed and UX-preview data but does not overwrite an existing published home banner. No live database was changed.

### Documentation and quality scripts

- Replaced stale surface-status and credential instructions in platform, Admin, Seller and Shopper READMEs; updated `FRONTEND_CONTRACT.md` and the stale `CHANGES.md` roadmap.
- Added `npm run typecheck` to all three web apps. The production build remains available as `npm run build`.

## Complete mapping to the original source-audit issues

Status key: **Implemented** means the source correction is present. **Implemented; test gap** means source is corrected but its full acceptance matrix was not run. **Partial/open** means an explicit requirement remains.

| Original ID | Status and current evidence |
|---|---|
| B-01 | **Implemented; fresh-seed test passed.** A disposable local PostgreSQL smoke verified approved marketplace demo listings and idempotent seeding; public route behavior still needs a deployed smoke. |
| B-02 | **Implemented.** Account carts require session/ownership; cross-owner cart regression test passes. Guest checkout is intentionally not supported. |
| B-03 | **Implemented; test gap.** Seller/Admin preserve referenced records by archive; the regression suite tests seller product management/history but not every order/review/placement/cart/wishlist reference combination. |
| B-04 | **Implemented.** Seller promotion ownership/status/channel enforcement and resolver checks; contract test passes. |
| B-05 | **Implemented.** Shared public-store predicate and public seller gate regression passes. |
| B-06 | **Implemented; test gap.** Public section/placement/taxonomy visibility filtering is in the source; the full visible/hidden/hero/taxonomy route matrix was not exhaustively exercised. |
| B-07 | **Implemented.** Paid-delivery qualification and duplicate review rejection; regression test passes. |
| B-08 | **Implemented.** Studio write APIs are feature-disabled/read-only; regression test passes. |
| B-09 | **Implemented; test gap.** Default privileged password seeding is removed; bootstrap is required in production; mock credentials are explicit-local-only. Bootstrap was not tested against a live deployment. |
| B-10 | **Implemented; local PostgreSQL smoke passed.** Fresh schema, legacy upgrade, required-column checks and future-version refusal passed; partial/incompatible legacy fixtures and the chosen managed database remain unverified. |
| B-11 | **Implemented; test gap.** Admin detail now resolves canonical public follows and counts; dedicated follow-detail regression is still needed. |
| B-12 | **Implemented; test gap.** Unapproved transitions remove active placements and audit the action. A full rollback/re-approval history matrix is still needed. |
| A-01 | **Implemented; test gap.** Full Admin product fields round-trip through backend; contract test passes, and the local catalogue now shows working thumbnails and an accurate approved count/filter. Three-image edit-with-price-only round-trip remains untested. |
| A-02 | **Implemented; test gap.** Review page resolves placement IDs to page/section labels; duplicate-name/deleted-section fixtures were not browser-tested. |
| A-03 | **Implemented.** Homepage shows pending-draft and published-live states separately; backend retains draft/live semantics. |
| A-04 | **Implemented; test gap.** CMS icon controls now have accessible names; automated keyboard/screen-reader checks were not run. |
| A-05 | **Partial.** Major Admin mutations now return visible errors instead of swallowing failures; exhaustive injected-failure/retry testing across every form is still needed. |
| A-06 | **Implemented.** Team UI edits role and custom permissions; backend blocks unsafe wildcard escalation and self/owner misuse. Role/custom-permission regression passes; full owner/audit before-after matrix is still needed. |
| S-01 | **Implemented.** Studio is available in shared Seller navigation and labelled Coming Soon. |
| S-02 | **Implemented.** Studio route is static and has no editor/publish controls; backend writes are disabled. |
| S-03 | **Implemented by explicit policy.** Category is required and server-validated; brand is deliberately optional, labelled optional, and validated when supplied. Blank/unmanaged category regression passes. |
| S-04 | **Implemented by explicit policy.** Slug is generated from title once and stable on edit; API ignores create slug supplied by a caller. Regression passes. |
| S-05 | **Implemented.** Seller product detail distinguishes Changes requested and displays Admin's note. |
| S-06 | **Implemented; coverage gap.** Seller has an owner-scoped persisted-event timeline for creation/edit/review/archive/placement/inventory; the regression test covers submission, edit, requested changes, inventory adjustment, chronology and owner isolation. Expand coverage for every archive/placement transition and audit-retention edge case. |
| S-07 | **Implemented.** Accessible acknowledgement is required in the action; server still forces marketplace-only pending-review submission. |
| H-01 | **Implemented.** Brand route locks the brand in shared listing filters. |
| H-02 | **Implemented by product decision.** Guests are redirected to sign-in before quote/details; there is no guest place-order promise. Payment remains unavailable. |
| H-03 | **Resolved by H-02 decision.** Guest email continuation was removed, so shipping changes cannot drop it. |
| H-04 | **Implemented.** Review sign-in preserves a sanitized product return path. |
| H-05 | **Implemented; visual test gap.** Seller byline is retained on narrow cards; a 390px Shopper-home smoke found no horizontal overflow, but product-card clipping/overlap still needs route-specific viewport tests. |
| H-06 | **Implemented; visual test gap.** Progress and content use a coherent three-stage model, with availability blocked until payment setup. Browser step/back/error-state testing remains. |
| H-07 | **Implemented.** Search uses the shared catalogue listing, filters, sort and query-preserving links. |
| H-08 | **Implemented in source.** About/cart/checkout copy states provider-disabled behavior and no-order outcome; provider-enabled copy cannot be verified because no provider is configured. |
| X-01 | **Implemented.** Studio is discoverable, static/Coming Soon and backend writes are disabled. |
| X-02 | **Implemented; device test gap.** Seller viewport exports `viewportFit: "cover"`; no real iPhone/safe-area/keyboard QA was run. |
| X-03 | **Implemented; lint/accessibility gap.** Added a GitHub Actions quality workflow and root Makefile for backend contracts, PostgreSQL smoke, and all three frontend typechecks/production builds. No dedicated lint, automated accessibility or device-test suite is included yet. |
| X-04 | **Open.** No deployment topology, provider-specific manifest, migration release job, CI deploy smoke or rollback process is configured. |
| X-05 | **Implemented; test gap.** Surface READMEs, frontend contract and CHANGES roadmap were corrected; full operator runbook/release checklist review remains. |

## Verification performed

- **Backend:** `make backend-test` — **20 tests passed** in an isolated test database, including Seller product-history ownership and event checks.
- **PostgreSQL:** the guarded smoke passed on a disposable local PostgreSQL database for fresh seed/idempotence, legacy schema upgrade/required columns, and refusal of a future schema version.
- **Admin, Seller, Shopper:** clean `npm ci`, `npm run typecheck` and `npm run build` all passed on Next.js 16.4.0. Each install and `npm audit` reported **zero vulnerabilities**.
- Responsive visual smoke at 390px covered the Shopper homepage and both login screens; local desktop browser inspection covered Seller product history and Admin catalogue, review, team and analytics. This is not device/accessibility certification.
- `git diff --check`, seed JSON parsing and a targeted scan for the named redundant marketplace copy passed. No production database, payment operation or deployment was performed.
- Credential scan found no source/documented shared `Ferixas123` credentials. Remaining test login emails/passwords are confined to isolated tests using the test-only environment.

## Still required before production

1. Expand PostgreSQL migration fixtures to partial/incompatible legacy schemas and verify on the selected managed database in a non-production environment. The local fresh/legacy/future-version smoke now passes but does not certify a provider-specific migration.
2. Decide, integrate and verify a real payment provider. Until then checkout intentionally creates no order and captures no funds; refunds/transfers/payouts must not be represented as complete.
3. Choose a deployment host/topology, add provider-specific manifests and safe secret injection, then run health/readiness, frontend/API wiring, migration, and rollback tests in a disposable deployment. The code-quality workflow exists; deployment/rollback CI does not.
4. Complete browser QA at 360, 390, 768 and 1280 px plus touch, safe-area, keyboard, zoom, focus, screen-reader and error states. The current 390px smoke is only a narrow subset; successful builds are not visual certification.
5. Expand Seller timeline and backend audit-history tests for every archive, placement, historical-reference, hidden CMS/taxonomy and approval-transition case.
6. Review current live CMS records and complete route-by-route browser copy/viewport QA. This code correction removes the identified redundant section copy and trims repeated metadata, but no production CMS content was changed.
7. Rehearse production owner bootstrap with the chosen host and secret manager; do not use test-only credentials or seed fixtures in production.
8. Plan a separate Recharts 3 migration: the installed Recharts 2.15.4 emitted a deprecation warning, but has no current npm audit finding and a major upgrade needs its own compatibility review.

**Release conclusion:** the source corrections include the Seller event timeline, CI quality gates, guarded PostgreSQL migration smoke, security/ownership fixes, and UI/content cleanups. This is **not a certification of production readiness**. Payment-provider setup, review of existing CMS records, production database/deployment wiring, additional UI/device/accessibility coverage and release/rollback validation remain outstanding.

## System-wide copy reduction (final pass)

The copy requirement was applied across the whole product, not only the CMS
sections that first exposed it:

- **Page headers.** 46 pages in Admin, Seller and Shopper lost an eyebrow label
  that only repeated the page title ("Catalogue / Products", "Orders / Order
  queue", "Control / Audit log"). Each page now opens with its title alone.
- **Route-accurate titles.** Vague headings were replaced with the name of the
  surface they belong to: Seller "Performance" to "Analytics", "Who buys from
  you" to "Customers", "Stock" to "Inventory", "Money" to "Payouts" and
  "Order queue" to "Orders".
- **Duplicate panels removed.** The Seller dashboard's marketplace-presence panel
  (already shown as tiles), the Seller orders explainer that restated the table,
  the Admin orders subtitle and the Admin "Reading this table" panel.
- **Shopper copy.** Section heads show a title only; the Help centre was rebuilt
  as topic links plus one contact block, with hard-coded merchant names and
  repeated routing text removed; the FAQ lost its intro, per-group notes and
  duplicate headings; the cart heading, empty state and duplicate payment notice
  were trimmed; About now describes only approved listings, reviewed products and
  the unavailable checkout.
- **Accuracy fixes found while trimming.** The shared trust strip and the product
  page no longer promise buyer protection or a 2–5 day delivery guarantee while
  payment and settlement are unconfigured; the mobile drawer's buyer-protection
  line was removed; the Shopper root metadata no longer claims a single checkout
  or a fixed merchant count; the department carousel no longer says "face".

Existing database rows are still not rewritten at deploy time: the CMS keeps
whatever an administrator has saved. Only freshly seeded databases and subsequent
saves use the reduced copy.

**Validation after this pass:** 20 backend tests OK, PostgreSQL migration smoke
(fresh seed + idempotence, legacy upgrade, future-schema refusal) passed, and
`typecheck` plus production `build` passed for Admin, Seller and Shopper.

## Product destinations, the seller library, and product history

One product record, two destinations. This is the rule the seller surfaces now
enforce end to end:

- `channels.marketplace` — the **Ferixas Marketplace** listing. A seller submission
  always starts here as `pending_review` and stays hidden until Admin approves it.
- `channels.store` — the seller's **own website** listing. Recorded on the same
  record now, so a product is never uploaded twice; it becomes live when Studio ships.

**Where a seller finds everything they uploaded.** Seller → Products is the library.
It lists every seller-owned record, including products kept for their own website
only, and can be filtered three ways: by status, by search (title or SKU), and by
**destination** (`Every destination` / `Ferixas` / `My website`). Every filter link
preserves the others, so narrowing by destination never silently drops the search.

**Moving a product without re-uploading it.** Each row carries the action for its
current state:

- *Use on my website* / *Remove from my website* — toggles the own-website
  destination instantly; the Ferixas submission is untouched.
- *Submit to Ferixas* — shown when a product is not a marketplace listing; it
  reuses the same record, restores its requested product sections and returns it to
  review.
- Withdrawing a submission that has not been approved yet returns the product to
  `draft` while keeping the record and its own-website listing. A listing that is
  already **live** on Ferixas cannot be pulled silently by the seller: that is an
  Admin unlist, and the API answers with a plain 400 explaining it.

**Product history.** Every destination move is written as an audited
`product.destination` event and appears in the product's own timeline on the Seller
product page ("Destination changed"), beside submissions, approvals, requested
changes, edits and stock adjustments.

**Verified:** 24 backend tests pass, including the new destination contract tests
(`tests/test_seller_channels.py`) which cover both destinations at submission, moving
a saved product between them, withdrawing and re-submitting the same record, the
library still listing a withdrawn product, and the history entry the move produces.
All three frontends typecheck and build.


## Seller submission and page-specific product sections (follow-up)

The upload screenshot showed **“Product unavailable” after the form had already redirected to the new record**. That screen did not establish that the POST failed; the previous action sent the seller straight to a separate detail lookup, and the fallback blamed the Seller session. The flow now returns to Products with an explicit accepted/pending-review message and stable product reference. If a read-back is missing, it warns the seller to check the library before retrying rather than silently inviting a duplicate.

- **Upload path:** product images are size-checked before upload; image-upload and product-submission failures return different actionable messages. Product-folder uploads require product-management permission, not the unrelated store-design permission.
- **End-to-end workflow:** the integration test uploads an image, creates a pending product, confirms seller library and detail visibility, confirms the Admin review queue, approves it, and verifies the resulting section placement is returned by the public page API.
- **CMS/product boundary:** removed the “Which products” selection from the CMS section editor. CMS continues to control a section's title, visibility and supported presentation; the product form assigns a product to a named page/section. Assignment options are available before a product exists, grouped by page, and exclude the paginated Explore catalogue feed, hidden/archived sections, non-platform pages and automatically related-product modules.
- **Home versus Explore:** the runtime fresh-install seed now has separate Home Trending and Explore Trending product sections. A submitted product can be assigned to the exact page/section; Admin approval creates the placement; the public `/catalog/page` response returns only currently eligible products for that page. Explore renders its assigned product sections rather than relying on a hard-coded “Trending” source.
- **Department section:** removed the truncation that sliced departments before the swipe component received them. All visible departments now remain in the paged/swipe set; CMS rows-per-set changes the page size instead of deleting the rest. The visible page-count sentence is now screen-reader-only.
- **Other connected section controls:** Explore's catalogue feed is kept distinct from curated carousels; Explore promotion frequency/placement controls now affect the listing; brand row count, layout and “See all” controls are consumed; product-detail section visibility and the related-products module's title/count/layout are read from its CMS document.

**Validation:** 26 backend tests pass, including the upload → review → Explore Trending placement test; the PostgreSQL smoke passed (fresh seed/idempotence, legacy upgrade, and future-schema refusal); Admin, Seller and Shopper all pass `typecheck` and production `build`; npm audit reported zero vulnerabilities. npm still prints a non-blocking Recharts 2.x maintenance/deprecation warning.

**Existing CMS data:** seed defaults are applied only to a truly blank database; saved CMS documents are not rewritten at startup. If an existing Explore page has no curated product section, an Admin must add and publish one in CMS before it can be selected on the product form. Existing Home and Explore sections remain separate and are never auto-merged.

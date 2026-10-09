# FerixCommerce — Current-State Audit & Solution Report

**Audit date:** 2026-10-09
**Repository:** `Asaphis/FerixCommerce`
**Branch / revision:** `main` at `2ab80f5` — `Fix CMS wipeout, enable seller follow, add review queue API & seller UI badges`
**Audit scope:** repository docs, admin/merchant/marketplace source and builds, backend models/routes, tests, and seller product/review/profile/order/payout paths.
**Baseline:** the findings below describe the source as first audited at `2ab80f5`. The remediation requested afterward has now been applied in the working tree; see **Implementation follow-up** at the end for current status, verification, and remaining blockers. The changes have not been committed or pushed.

## Executive summary

I understand the intended MVP and its core boundaries:

1. **Ferixas owns and controls** platform catalog products, categories, brands, CMS sections, and marketplace merchandising.
2. **Each seller owns their own submitted listings.** A seller can upload a product and set the required marketplace channel while the seller website builder is not available.
3. **A seller submission must remain private until platform review.** Admin reviewers approve or reject it, ideally with an explanation. An approval should be the sole transition that makes it publicly buyable.
4. **Ownership must remain attached** through the product, seller profile, order item, fulfillment, product sales history, and eventual financial ledger/payout.
5. **A public seller page shows that seller's approved products only.** Ferixas-owned items may be cross-promoted separately, not mixed into the seller's catalog.
6. **Seller metrics must be honest.** Real order-backed data may be shown; views, conversion, payment capture, settlement, delivery-success metrics, etc. must not be represented as real if not implemented.

The current branch contains a meaningful amount of this MVP: ownership and review states, an admin review queue, seller status badges, marketplace-required seller submission, seller-specific catalog pages, following, merchant order/product data, CMS-managed product sections, and APIs for seller shipping metadata. The basic desired architecture is therefore **partially implemented, not absent**.

However, **it is not safe to call the upload/review/sale process complete**. Current code has publicly accessible routes that bypass the approval filter, a store-page ownership lookup inconsistency, mock-looking checkout/payment/payout behavior that contradicts backend documentation, and gaps between the seller form and the backend fields. The Marketplace app also currently fails its production build. These are the highest-priority items before relying on the MVP.

## Validation performed

| Area | Result |
|---|---|
| Git baseline | Clean `main`, tracking `origin/main`, HEAD `2ab80f5` |
| Backend Python syntax | `python3 -m compileall -q Backend` passed |
| Backend regression tests | 3 tests passed using `Backend/tests/test_media_brands.py` and the declared requirements in an isolated local venv |
| Admin production build | Passed (Next.js compile, TypeScript, static generation) |
| Merchant production build | Passed (Next.js compile, TypeScript, static generation) |
| Marketplace production build | **Failed**: `WebPhase/marketplace/lib/session.ts` imports `next/headers` into the client bundle through `app/store/[slug]/page.tsx` |
| Runtime/API end-to-end | Not fully exercised; the three backend tests cover media/brand behavior, not the product approval, checkout, sales, and payout journeys |
| Responsive visual QA | Not performed in a browser at phone/tablet/desktop breakpoints; builds are not responsive verification |
| Live deployment/database | Not accessed; this report describes the cloned source, not production configuration or live data |

Admin and Merchant build logs warned that `FERIX_API_BASE` is unset in this environment and requests will fall back to the app's own origin. That is acceptable for a build-only check but means I did not validate a correctly wired multi-app deployment.

## What exists today

### Shopper Marketplace

- Next.js application with customer routes for home, browse/search, categories/collections, product, stores/storefront, cart, checkout, orders, authentication, and customer account areas.
- Shopper-facing `/catalog/products` filters records to `status == approved` before producing its product list and facets.
- Storefront API `/catalog/store` filters to approved products for the store merchant ID; the seller's product grid is therefore separated from platform inventory on that route.
- A seller follow API and a customer account following page exist.
- **Current blocking build defect:** client component route `app/store/[slug]/page.tsx` imports `lib/session.ts`, which imports `cookies` from `next/headers`. Next.js disallows that server-only API in this client bundle. The import needs to be split so client code does not transitively import the server session module.
- Other public feeds/search/product detail still require approval hardening (see findings below).

### Merchant workspace

- Routes exist for login, dashboard, products/create/detail, inventory, orders/detail, customers/detail, analytics, payouts, media, promotions, settings, and a Store Design area.
- The merchant product API scopes product reads, edits, and deletes to the authenticated merchant ID.
- Product creation forces `status: pending_review` server-side and requires marketplace channel selection; clients cannot publish directly by passing an approved status.
- Editing an approved seller listing sends it back to review, and the seller detail screen shows product status/rejection reason. Product sales quantities can be derived from order line items; views are explicitly marked “Coming soon.”
- The current create form exposes only a basic subset (title, a hardcoded category list, price, compare-at price, stock, store/marketplace checkboxes, description, images). It does **not** expose many of the fields the user requested: platform-controlled brand selection, CMS product-section assignment, seller shipping amount/ETA/package/origin, promotional section settings, or full product details. Although backend fields exist for several shipping and section-tag attributes, the shown seller action does not send them.
- Seller-created product status can be changed through edits to pending review for existing approved products. Rejected edits are not clearly reset to a fresh `pending_review` state in the inspected `update_product` logic, so resubmission behavior needs an explicit test/fix.
- Seller dashboard has no completed seller-facing “followers list” capability evident from the inspected endpoints; follow relationships are kept on shopper settings and the aggregate is updated on a catalog record.

### Admin workspace

- Routes exist for platform overview, analytics, merchants, customers/users, orders, catalog, CMS pages/sections/banners/categories/collections/media, promotions, payments, payouts, review queue, team, audit, and settings.
- A pending review page exists with approve/reject controls and optional section selection. The admin product catalog separates platform stock from merchant stock in its default presentation, and seller-specific controls/pages are present.
- Admin catalog creation can assign a merchant owner. The code currently auto-approves a product created by an admin for a non-official merchant by default; this is distinct from seller-created submissions. The business rule for admin-created-on-behalf-of-seller listings should be made explicit and tested so that assignment does not accidentally bypass review or misclassify ownership.
- Admin create/update UI has section assignment controls sourced from CMS product sections. The backend also has section-placement APIs. This is more developed than the seller upload UI.

### Backend

- FastAPI app with marketplace, shopper auth/cart/checkout/order, merchant, and admin routers.
- `Catalog` records carry product JSON and dedicated columns for status, owner type, rejection reason, shipping/package metadata, and seller profile statistics.
- Merchant product ownership is represented by `merchantId`; admin-created data adds `origin` and seller assignment. `put_row()` writes record data and synchronizes selected dedicated columns.
- Admin review APIs exist: `GET /admin/catalog/products/pending`, `PATCH /admin/catalog/products/approve`, `PATCH /admin/catalog/products/reject`. Rejections require a reason and actions write audit entries.
- Seller follow/unfollow/check endpoints exist. A public seller profile API exists in addition to `/catalog/store`.
- Orders carry each item's product and `merchantId`, and merchant APIs scope order views to the merchant's items.
- The README states that payment capture is not enabled and production integrations still require configuration. **The live source behavior does not fully match that statement**: checkout marks the order `payment: "paid"`, and merchant payout responses can synthesize paid/pending payout rows when no persisted payout rows exist.

## Findings — prioritized

### P0 — Public approval gate is inconsistent (release blocker)

The approved-only rule is enforced by `/catalog/products` and `/catalog/store`, but not across all shopper/public paths:

- `GET /catalog/product?slug=...` returns any matching catalog row without checking `status == approved`.
- `GET /search` searches and returns all product rows without the approval filter.
- `GET /catalog/collections` builds collection product previews from all product rows.
- The `/sellers/{merchant_id}` profile API accepts either `status == approved` **or** `reviewStatus == approved`; this means a rejected/non-approved product can pass if stale `reviewStatus` remains approved.
- Cart insertion looks up a product without checking approval or marketplace channel. Checkout uses the cart contents and similarly does not revalidate the product's approval/channel status at placement.

**Impact:** A direct API call, cached URL, collection preview, stale review field, or cart path may expose or purchase a product that the admin has not approved. An approval gate must be server-side and consistently applied to every public read and every cart/checkout mutation—not only the main browse endpoint.

**Recommended correction:** Create one canonical `is_publicly_sellable(product)` predicate (approved status, marketplace channel enabled, appropriate availability/stock policy) and use it for product detail, home/CMS sections, search, collection previews, store pages, seller pages, cart add, cart recalculation, checkout quote, and order placement. Do not use `reviewStatus` as an alternate approval source. Add regression tests demonstrating that pending, rejected, draft, archived, and marketplace-disabled products are absent and cannot be purchased.

### P0 — Checkout/payment and payout responses can imply money movement that did not occur

- Checkout writes `payment: "paid"` even though the backend README explicitly says payment capture is not enabled and checkout remains pending.
- When no persisted payout rows exist, `/merchant/payouts` derives payout rows from order totals and labels older months as `paid`, and the newest as `pending`; it even supplies a bank-transfer method/date. This is not a recorded payment or settlement.
- A ledger sale entry is added when an order is marked delivered, using the order's total; it is not a payment-provider capture or a clearly net-of-commission settlement.

**Impact:** Sellers/admins/customers can be shown false payment or payout states and could treat estimated order value as money received. This conflicts with the product TODO and plan, which say not to fabricate payment/payout data.

**Recommended correction:** Until a payment provider and settlement/ledger rules exist, orders should use truthful states such as `pending_payment`/`payment_unconfigured` and payout UI should show “Not available yet” or only actual persisted payout records. Keep order GMV separate from captured funds, seller payable, commission, and settled payout. Never infer a `paid` status from order age.

### P1 — Public seller profile can expose fabricated performance rates / merchant contact details

The `/sellers/{merchant_id}` response defaults success rate to **95%** and delivery rate to **98%** when values are absent. Those figures are not derived from verified records. It also returns seller phone and email publicly without an evident public-consent setting.

**Impact:** This is misleading and may disclose contact data beyond the seller's intent.

**Recommended correction:** Remove hardcoded percentages; show a rate only when it is calculated from sufficient, defined, persisted order history. Otherwise return `null`/“Not enough data” and render no claim. Add merchant-controlled public contact visibility fields and only expose explicitly public fields. Confirm how the intended public seller profile and canonical seller ID/slug should map across `/sellers/{id}`, `/catalog/store?slug=...`, and UI routes.

### P1 — Seller upload UI does not implement the full requested intake contract

Backend payload/schema support exists for seller shipping and section metadata, but the current product form/action inspected does not collect or send them. Seller category choices are hardcoded in the page rather than loaded from admin-managed categories. The inspected form has no platform brand picker and no CMS product-section picker.

**Impact:** Sellers cannot configure information needed for admin review, fulfillment quotes, or placement into CMS sections as requested. Hardcoded category slugs may diverge from CMS categories. Seller forms should not allow sellers to create platform categories/brands.

**Recommended correction:** Load active categories and brands from admin-controlled APIs (allow no category/brand when that is the intended policy). Load only product-capable CMS sections; make section placement optional, with a clear default/no-placement behavior. Add shipping amount, ETA, package size/weight, and shipping origin fields with validation and clear shipping responsibility. Persist exactly the seller submission for review and show the same details to admin reviewers.

### P1 — Admin-assigned seller products have a different default lifecycle

`POST /admin/catalog/product` treats a product assigned to a non-Ferixas merchant as seller-origin and defaults it to **approved**, while the seller upload endpoint always starts at pending review. This could be intentional for staff-created listings, but it is not documented as an explicit policy and can make ownership/approval behavior appear inconsistent.

**Recommended correction:** Decide and encode the policy: (A) admin-created on behalf of seller is trusted/staff-approved, with an audit reason and explicit action, or (B) it is pending review like all seller-owned products. Make ownership, `owner_type`/`origin`, `merchantId`, admin catalog filters, and seller catalog visibility consistent. Test admin product isolation and seller-specific deletion/update permissions.

### P1 — Marketplace production build is currently broken

`npm run build` in `WebPhase/marketplace` fails because `next/headers` is imported by `lib/session.ts`, which gets pulled into client code through `app/store/[slug]/page.tsx`. Admin and Merchant production builds pass.

**Impact:** Marketplace cannot be deployed from this revision until corrected and rebuilt.

**Recommended correction:** Separate server-only cookie/session utilities from browser-safe session/API code; ensure client components use browser APIs or props, never import `next/headers`. Re-run the production build after the refactor.

### P2 — Product-sales and finance display needs a stricter source-of-truth model

Merchant product/order views do aggregate quantities from order line items, which is a good foundation. But orders currently record `payment: paid`, and the payout derivation makes orders resemble financial settlement. The unit aggregation excludes cancelled fulfillment but does not by itself establish that an order is paid, fulfilled, not refunded, or chargeback-free.

**Recommended correction:** Define states and reconciliation rules separately: order, payment, fulfillment, refund, seller payable, and payout. Tie product sold units/revenue to eligible order line items; subtract cancellations/refunds; record commission and shipping at the line-item/merchant level for multi-seller baskets. Make finance screens source exclusively from those records.

### P2 — Following data is not yet a complete seller engagement feature

Following is stored as a shopper's `settings.followed_sellers` array, with a counter incremented on the seller catalog row. The seller-facing summary/list and count synchronization are not clearly unified; the public seller API reads values partly from merchant JSON and partly from catalog columns. There is no robust follow relationship table evident in this flow.

**Recommended correction:** Use a unique `(user_id, merchant_id)` follow record or rigorously maintain a single authoritative collection/counter. Add an authenticated merchant endpoint for aggregate count and (if desired) follower list with privacy controls. Test repeat follow/unfollow, missing catalog record, seller ID vs slug, concurrency, and migration consistency.

### P2 — Test coverage does not match workflow risk

The current backend test suite has one file with 3 passing tests, all focused on media uploads/brands. It does not exercise seller product creation, isolation, approval/rejection, public endpoint filtering, section assignment, marketplace checkout gates, order ownership, following, sales, ledger, or payouts.

**Recommended correction:** Add focused API tests with a temporary SQLite database and authenticated admin/merchant/shopper sessions. Cover the full state machine, ownership boundaries, public route filters, and realistic order lifecycle before considering this feature complete.

### P3 — Project documents are stale or contradictory

`CONTINUATION_REPORT.md` references an older HEAD (`ddb1033`) and claims several merchant/admin APIs or UI flows are unfinished that now exist. `WebPhase/README.md` also describes Merchant/Admin as not started, contradicted by actual app routes and successful builds. `CHANGES.md` describes implementation as completed but its future next-step list still says frontend work is needed despite current UI changes. Backend README's claim that checkout remains pending conflicts with checkout's `payment: "paid"` source behavior.

**Recommended correction:** Refresh repository overview/handoff docs after workflow fixes, state the exact tested revision, and make docs agree with code. Maintain a single source of truth for current status and known gaps.

## Suggested MVP target workflow

1. Merchant logs in; the API derives their merchant ID from the session, never from a trusted client-submitted owner ID.
2. Seller form loads platform-controlled categories, brands, and eligible CMS product sections; category/brand/section assignment follows the chosen optional/required policy. Marketplace channel is mandatory until seller storefronts exist.
3. Seller provides listing details, price, inventory, product media, requested section, and shipping/packaging metadata. The API creates a seller-owned `pending_review` product and records the submission/audit trail.
4. Pending listing appears only to that seller and authorized admin reviewers. It is absent from every public API, product page, collection, search result, cart, and checkout.
5. Admin sees seller identity, requested sections, category/brand, price, stock, images, shipping details, and prior review history; can approve, reject with reason, or remove the seller's listing. Every action is auditable.
6. Approval changes the one canonical state to approved; the product becomes publicly visible only if marketplace channel is enabled and product is sellable. Seller edit to a live listing returns it to review.
7. Public seller profile contains seller details explicitly marked public and that seller's approved product grid only. Any Ferixas cross-sell content is a separate “More from Ferixas” section.
8. Orders capture product ID, merchant ID, price/quantity, shipping allocation, and lifecycle events. Merchant sees only their line items/orders and their own fulfillment actions.
9. Until payment capture and payout settlement are implemented, show order and payment statuses truthfully; do not label money paid or settled based on age or an order record.
10. Add tests for all states and routes; pass all three app builds and responsive checks before deployment.

## Recommended work order

1. **Fix the Marketplace build error.**
2. **Centralize and enforce the public sellable-product gate** across all routes, cart, and checkout; add regression tests first/alongside.
3. **Correct checkout/payment/payout truthfulness** before showing financial summaries as real.
4. **Finish seller intake form** for CMS-owned categories/brands/sections plus shipping fields; wire to backend and admin review details.
5. **Settle admin-created-for-seller policy** and verify product owner/type normalization and all catalog views.
6. **Harden seller profile privacy and metric calculations**, plus follow data consistency.
7. **Run full API journey tests, all production builds, and browser QA** at 360/390, 768, and 1280+ widths; verify no overflow, broken images, or unapproved product leakage.
8. **Update documentation** after code and tests agree.

## Limits and confidence

The source inspection and builds give high confidence in the listed code-level defects, especially the build error, route-level approval inconsistencies, checkout's `paid` flag, and synthetic payout rows. The three passing tests validate only their own media/brand contracts; they do not prove overall backend correctness. I did not connect to a live database, inspect production settings, complete real shopper/admin/merchant sessions in a browser, or perform responsive screenshot QA. Those are the remaining validation steps before calling the system production-ready.


## Implementation follow-up — requested remediation applied

The following changes were made after the baseline audit. They are present in the working tree but have **not** been committed or pushed.

### Implemented

- Added one canonical `is_publicly_sellable` rule: a product must be `approved` and have its marketplace channel enabled. Applied it to browse/product detail, home feeds, category counts, collections, search, seller storefronts/profiles, carts, wishlists, and checkout revalidation. Product cards/counts and merchant store cards now count only publicly sellable items.
- Closed the seller-profile ID/slug mismatch and removed public phone/email fields and unsupported performance-rate claims. Store cards now serialize a public allowlist rather than spreading the full merchant record. Unverified rates render as “Not yet measured.” Seller follow counts synchronize to the stored catalog row, and following checks resolve slugs to canonical merchant IDs.
- Seller product upload/edit now loads platform-managed categories, brands, and active product-capable CMS sections. The form collects optional shipping cost, ETA, package weight/dimensions, shipping origin, and section-placement requests. The server validates taxonomy/section IDs, records who/when submitted, forces marketplace-only channel state, and always sends listings to review (including edits/resubmissions). Sellers cannot set product status to approved by posting a crafted payload.
- Admin review displays submission/shipping/section data. Approve/changes/reject transitions now synchronize product and review states; approval is the only point that exposes listings and it materializes valid seller-requested section placements against platform-owned active CMS sections. Admin-created seller-owned catalog products now enter review, and unknown merchant assignments are rejected.
- Checkout now returns an explicit `503` because secure payment capture is not integrated. It does not create an order, claim money was paid, or consume stock. The delivery-status action no longer manufactures a sale ledger entry. Merchant payouts only show actual persisted payout records; absence of settlement is represented as “Coming soon”/“Not configured.”
- Split the Marketplace store page into a server page and a client-only follow control. Corrected its API URL fallback so server rendering uses an absolute URL; added the missing `Store` icon import exposed by build validation.
- Added backend lifecycle regression coverage for seller-controlled status/channel spoofing, visibility before approval, changes-requested/resubmit/approve transitions, category validation, and the payment-unconfigured no-order path.

### Verification after changes

| Check | Current result |
|---|---|
| Backend syntax compilation | Passed (`python -m compileall -q .` from `Backend`) |
| Backend tests | Passed: 5 tests total, including 2 new lifecycle tests |
| Admin production build | Passed |
| Merchant production build | Passed |
| Marketplace production build | Passed |
| `git diff --check` | Passed |
| Live deployment or production database | Not accessed |
| Browser/responsive visual QA | Not performed |

### Remaining release gates / deliberate limitations

1. **Payments are still not implemented.** Checkout placement is intentionally unavailable (HTTP 503) until a secure provider and verified capture/webhook/refund flow are built. The current checkout form can quote but cannot complete a sale. This is safer than pretending an order was paid.
2. **Production configuration still needs `FERIX_API_BASE`** set to the deployed backend for each frontend. Builds succeeded with the local absolute fallback; they do not prove a live multi-app deployment is wired correctly.
3. **No live end-to-end/browser visual run** was performed. CMS section assignment is tested at the service level for its gate but should still get an operator workflow smoke test and visual QA.
4. **Payout settlement remains unimplemented.** The UI now reports only real persisted payout rows; it does not calculate or transfer funds.
5. Changes remain in the repository working tree only. No commit, push, or deployment was performed.

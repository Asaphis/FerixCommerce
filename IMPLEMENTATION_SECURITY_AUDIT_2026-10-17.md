# FerixCommerce implementation and security audit

**Audit date:** 17 October 2026
**Repository:** `Asaphis/FerixCommerce`
**Branch / commit:** `main` / `de402891`
**Scope:** Current repository implementation plus read-only checks of the configured public API. No source changes or production mutations were made.

## Executive summary

Yes — I understand the intended system from the previous conversation and the attached working specification. Ferixas is meant to have one CMS-defined section system used consistently by three surfaces: Admin defines and publishes sections, Merchants or Admin place products and provide section-specific terms, and Marketplace displays the resolved sections. A section declares its type, source, presentation, product requirements and section-level window; the product placement owns its own price/quantity/window. The backend should be the authority for eligibility, price and availability, and the cart should preserve the exact offer the shopper selected.

The repository has a substantial amount of this architecture in place, and the main section definitions, page response, manual placement response and storefront rendering are connected. However, **the end-to-end sale is not complete**. The most consequential disconnect is that a product can be displayed with a section-specific price, but adding it to the cart sends only the product ID/variant/quantity. The cart then reloads the catalogue product and prices it at its base price. Checkout placement is deliberately disabled and returns HTTP 503 because no payment provider is configured. Thus there is no functioning production purchase path for these section offers today.

**Overall assessment:** CMS/placement foundations are in place; section-specific cart/checkout behavior and parts of the promised presentation/placement workflow are incomplete. The backend has meaningful authentication and ownership checks, but there are additional security gaps: tokens are accepted in URLs/bodies, raw internal product records are nested in shopper responses, product numeric inputs are not consistently constrained, login throttling was not found, and the shared Bearer key is not validated by the backend. No successful exploit or unauthorized account access was demonstrated.

## What I checked

- Repository README, structure/audit/continuation documents and the attached working specification.
- Current `main` checkout and its source: Backend section contract, CMS/Admin routes, Merchant product creation, Marketplace page renderer, API transport, cart and checkout.
- Backend regression suite: **64 tests passed**.
- Frontend typechecking: **all three apps (Admin, Merchant, Marketplace) reported exit code 0**.
- Read-only production requests to `https://shopapi.ferixas.com/health` and `/catalog/page?type=marketplace_home`.
- No live login, mutation, order, or payment request was made.

## Current live status

The configured API host returned HTTP 200 for its health endpoint. Its payload was:

```json
{"ok":true,"database":"ok","schemaVersion":2,"storage":"cloudinary-configured","mail":"resend-configured","payments":"pending-configuration"}
```

The public homepage API returned HTTP 200 with a published `Homepage` and **9 sections**. The response included a manually assigned product carousel with **3 products** and a trending section with **0 products** in the placement map. A returned product included `sectionId`, `sectionQuantity`, and `sectionRemaining`, confirming that the live API is emitting placement metadata. The empty trending feed may be valid if there are no eligible paid sales; it should be checked against expected storefront content, not treated by itself as a defect.

Two live mismatches/risks are apparent:

1. **Health version is stale:** production reports `schemaVersion: 2`, while the checked-out backend declares `SCHEMA_VERSION = 3`; the health route itself hardcodes `2`. This makes the health value unreliable as a schema/migration indicator.
2. **Payments are not configured:** the backend says `payments: pending-configuration`; `/checkout/place` explicitly returns 503. This is a confirmed launch blocker, not a test failure.

## Main request/response paths

| Flow | Frontend sends / expects | Backend behavior | Assessment |
|---|---|---|---|
| CMS section contract | Admin requests `GET /cms/section-types`; expects palette, sources, section fields, requirement library and presets | Admin route requires staff + `cms.manage`; returns the central contract | **Aligned** |
| Save/publish page | Admin sends `PATCH /cms/page` with `{id, sections, ...}`; then `POST /cms/page/publish` | Backend validates and normalizes each section, saves a draft version, publishes separately; storefront reads only published data | **Aligned**; draft/publish boundary is sensible |
| Storefront page | Marketplace calls `GET /catalog/page?type=...`; expects `{page, sections, placements, content}` | Backend returns published, live sections and resolved manual/automatic products | **Aligned for page payload and live public route** |
| Merchant product create | Form sends product data, `section_tags`, and `section_terms` along with ordinary product/media fields | Server action uploads media, parses terms, then submits through the Merchant API; section options and backend term schema share the same contract | **Mostly aligned**; the form is product-first rather than the specified section-first flow |
| Section placement | Admin product forms send placement selection and `config__...` fields; backend maintains placement rows | Placement is separated from the CMS section; backend applies placement price/label/badge/quantity and start/end times to resolved products | **Partially aligned**; values reach the page response, but several UI display toggles are not honored |
| Add to cart | Marketplace sends `{productId, variant, qty}` plus session/cart credentials | Backend reloads the product and returns `unitPrice`/`lineTotal` using `product.price` | **Misaligned for placement offers**; no section/placement identifier is sent or accepted, and the placement price is lost |
| Checkout quote | Frontend sends `{addressId, shippingMethod, email?}` and expects quote/totals/address | Backend computes from cart; selects a shipping option but returns `address: null`; it does not resolve the selected saved address/email | **Incomplete** |
| Place order | Frontend sends address, shipping, payment method and note, expects `{order}` | Backend checks availability and then intentionally returns HTTP 503; no order/payment/inventory mutation occurs | **Not working by design until payment integration** |
| Product detail from a section | Product card links to `/product/{slug}`; detail requests only the slug and adds by product ID | Backend detail response returns the base product; it does not receive the originating section/placement | **Misaligned**; the section offer is lost before the cart |

### Cart price mismatch in detail

The section resolver applies a placement override to the product before rendering the page. `ProductCard` displays `product.price` and can display the section label and remaining count. But its add-to-cart form submits only the product ID. `POST /cart/items` stores only product ID, variant and quantity. The backend `cart_payload()` resolves the original product and calculates `unitPrice = product.price`; it does not resolve the original section placement. A shopper can therefore see one section price and then see a different base price in the basket. Since order placement is disabled, the mismatch does not currently result in a completed charge, but it must be fixed before checkout is enabled.

## What is working

- The central section contract separates product section type, source/selection mode, presentation and product requirements.
- CMS section data is normalized and validated at save time; page editing creates drafts, and shoppers see only published versions.
- The backend distinguishes automatic feeds from manual placements and applies both section-level and product-level time windows to storefront resolution.
- The public page endpoint is live and returns the expected `{page, sections, placements, content}` shape.
- Admin CMS and protected management routes require staff authentication and permissions; Merchant product submission has a separate owner/session boundary.
- Passwords use salted `scrypt` and constant-time digest comparison. Staff sessions are rotated on refresh, have a seven-day absolute expiry and a 60-minute idle cutoff.
- Media uploads are bounded to 20 MB in the inspected upload handlers and checked by content signature; SVG is intentionally excluded.
- Shopper cart routes are authenticated and verify that a requested cart belongs to the signed-in user. Marketplace availability is rechecked on add and quote.
- The backend regression tests cover section contract, owner/security boundaries, live windows and several flows; all 64 passed. All three frontend typechecks passed.

## Findings and priorities

### P1 — Preserve placement identity and terms through cart and checkout

**Evidence:** Marketplace `addCartItem()` accepts only `productId`, `variant`, and `qty`; backend `/cart/items` stores those fields. `cart_payload()` uses the catalogue product's base `price`. No placement ID or section ID is part of the cart line.

**Impact:** Section-specific price, quantity cap, label, and offer window can be lost once the shopper clicks Add to cart. A sale shown at a placement price may appear at the base price in cart. The basket also has no reliable way to enforce the placement's own remaining quantity or end time.

**Fix:** Add an immutable placement/offer reference to the card form and cart line; resolve it server-side against the current published page/section and live placement; calculate the cart unit price, stock/quantity eligibility, and totals from that server-resolved placement. Revalidate the same reference in quote and order placement. Never accept a client-supplied price as authoritative.

### P1 — Checkout cannot place an order

**Evidence:** Production health reports payment configuration pending. Backend `/checkout/place` always raises HTTP 503 with a payment-not-configured message; the frontend expects an order response.

**Impact:** No Marketplace order can be completed. Do not describe checkout as operational until a provider is configured, signed payment webhooks are verified, order/stock transitions are implemented, and an end-to-end test reaches a confirmed paid order.

**Fix:** Configure the chosen provider and implement a server-authoritative payment/order state machine. Keep the current 503 safety behavior until that work is complete; it correctly avoids falsely marking unpaid orders as paid or decrementing inventory.

### P1/P2 — The promised section-first upload flow is not present

**Evidence:** Merchant product creation begins with product basics and later offers a “Product sections” checklist. Section-specific product fields are revealed after a section is selected. Admin catalogue creation follows the same product-first pattern.

**Impact:** The core contract is reasonably represented in fields, but it is not the section-first chooser/per-section block flow described in the working specification. This makes it harder to understand which product facts belong to which section and leaves a workflow/UX acceptance gap.

**Fix:** Begin with a section chooser; for each chosen section show its own requirements and its own placement terms/clocks/prices. Preserve explicit “switch back on” behavior on edit. Share the same field schema in Merchant and Admin.

### P2 — CMS card-display switches are not consistently applied

**Evidence:** The backend normalizes card display defaults, and the product card unconditionally renders a `sectionLabel` when present and a `sectionRemaining` count when positive. The card does not receive/use section settings such as `showLabel`, `showRemaining`, `showSectionPrice`, or `showCompareAt`; no section countdown is rendered by the ordinary product card. The section price may affect the product price, but the corresponding “show price” switch is not a card-level gate.

**Impact:** CMS settings can claim to control what a section shows while the storefront ignores them. The operator preview and customer view can diverge.

**Fix:** Pass the section’s effective display contract into the card renderer and honor each switch. Add renderer tests for each switch and for two sections rendering the same product with different settings.

### P2 — Date-time inputs have no explicit timezone policy

**Evidence:** CMS and placement forms use `datetime-local` inputs, which submit timezone-naive values. Backend `moment_of()` assigns UTC to a naive datetime.

**Impact:** An operator entering local wall time may get a different actual start/end time than expected. This affects both the section window and a product’s window within it.

**Fix:** Choose and display a policy (for example UTC, or a configured business timezone), convert client input to an explicit offset before submission, store UTC, and show the interpreted timezone in CMS and Merchant forms. Test daylight-saving boundaries if using a regional timezone.

### P2 — Session tokens are placed in GET query strings

**Evidence:** Marketplace, Admin and Merchant API transport helpers append sessions to the URL for GET requests because the proxy does not forward custom headers. The backend also accepts these query credentials.

**Impact:** URLs are more likely than headers to be captured by proxy/access logs, tracing, monitoring and diagnostic tooling. Any token copied from a URL log remains a bearer credential until expiry/revocation.

**Fix:** Prefer a server-side proxy that forwards the session in an authorization header, or use a narrowly scoped short-lived credential for GET requests. Redact `session` query parameters from all logs immediately; use `Referrer-Policy: no-referrer` as a defense in depth measure, not as the primary fix.

### P2 — Login throttling was not found in the application code

**Evidence:** Shopper, Merchant and Admin login routes verify credentials and issue sessions; no application-level rate limiter or lockout was found in the inspected backend.

**Impact:** Exposed login endpoints can be targeted by password guessing or credential stuffing. Strong password hashing helps storage security but does not limit guesses.

**Fix:** Add per-account and per-source rate limits/backoff (with safe recovery against denial-of-service lockouts), alert on repeated failures, and confirm equivalent limits exist at the edge.

### P2 — Shared Bearer API key is sent but is not backend-enforced

**Evidence:** Frontend server API helpers send `Authorization: Bearer ${CODEWORDS_API_KEY}`. No matching bearer-key validation or `CODEWORDS_API_KEY` check exists in the backend. Protected operations rely on per-user session and permission checks instead.

**Impact:** If deployment operators believe this shared key is an API perimeter, it is not serving that role. It may also create false confidence or unnecessary secret handling. The per-user checks remain important and must not be removed.

**Fix:** Either remove/document the unused header, or deliberately enforce a service credential at the API edge/backend in addition to user/session authorization. Do not treat a shared key as a replacement for role/ownership checks.

### P2 — Live health reports the wrong schema version

**Evidence:** Live health says schema version 2; checked-out code has `SCHEMA_VERSION = 3`, while the health handler hardcodes `schemaVersion: 2`.

**Impact:** Monitoring can indicate the wrong deployed/migrated state and conceal incomplete database migrations.

**Fix:** Return the actual schema constant/migration record, and have deployment health validate the required schema rather than hardcoding a number.

### P1 — Placement quantity is metadata, not an enforced limit

**Evidence:** Placement quantity is copied into `sectionQuantity`/`sectionRemaining` at resolution time. The value is not reduced by sales/reservations, and cart, quote and checkout do not enforce it. The card renders “Only N left” as text only.

**Impact:** The UI can imply a limited quantity while the user can add more; concurrent purchases cannot be safely capped. Catalogue stock is also not enforced as a quantity limit during cart/quote.

**Fix:** Define whether quantity limits are per placement and whether cart reservations count. Recalculate remaining server-side and atomically enforce it at final order placement; validate stock and quantity on cart/quote as feedback, then revalidate at purchase.

### P1 — Placement active/paused state cannot be managed through the product flows

**Evidence:** The placement model and resolver understand `active`, but Admin/Merchant placement response types and forms do not expose a switch, and placement save/replace/approval payloads do not write it.

**Impact:** A placement can be filtered out when inactive, but operators do not have the promised one-action pause/restore workflow. The data model has a lifecycle state that the editing API/UI cannot manage.

**Fix:** Include `active` in placement read/write schemas and add an explicit switch to Merchant and Admin, preserving the row/dates while paused. Test pause, restore and expired-but-still-active separately.

### P1 — Product detail drops the placement context

**Evidence:** `ProductCard` links only to `/product/{slug}`; the detail page requests by slug and its buy box uses the base product price and product ID. No section/placement identifier is carried into that route or request.

**Impact:** Even before add-to-cart, a section card with an offer price can navigate to a detail page that displays and submits different base-product terms.

**Fix:** Carry a server-validated placement reference into detail and render the same live placement terms, or explicitly make the transition to base-product pricing clear and do not imply the section offer remains available. The authoritative cart/checkout resolver is still required.

### P2 — Shopper responses include raw internal product records

**Evidence:** Cart lines embed the result of `find_product()` directly, and review responses attach raw `product_rows()` entries. A public allowlisted product serializer exists but is not used for these nested objects.

**Impact:** Authenticated shoppers may receive fields that are meant for internal workflows (for example ownership/origin, submission/review details, or cost-like fields if present on the stored record). Authentication does not make those internal fields appropriate for disclosure.

**Fix:** Use an explicit shopper-safe projection for every nested product in cart, review, wishlist and account responses. Add sentinel-field tests proving internal keys never escape.

### P2 — Numeric product inputs lack consistent server-side range/finite validation

**Evidence:** Merchant product schemas use unconstrained optional numeric types for values including price, compare-at, stock, shipping and package details; form `min` attributes and client-side conversion are not an API security boundary.

**Impact:** Direct or manipulated requests can bypass browser constraints and attempt negative or non-finite values, which can corrupt catalog/cart arithmetic or make downstream processing unreliable. No completed purchase impact is possible while order placement returns 503, but validation is required before enabling it.

**Fix:** Apply Pydantic constraints and explicit finite/range/cross-field validation on create and update. Reject invalid values before persistence; include tests for negative values, NaN/Infinity, compare-at relationships, quantity integers and update paths.

### P2 — CORS defaults to unrestricted origins, methods and headers

**Evidence:** Backend CORS middleware falls back to `*` when `CORS_ORIGINS` is unset and allows all methods/headers. Whether production overrides this environment variable was not verified.

**Impact:** An unrestricted policy broadens which browser origins can call public endpoints and makes future credentialed/browser flows easier to misconfigure. `allow_credentials=false` reduces cookie-CSRF exposure but does not replace a deliberate origin policy.

**Fix:** Configure exact production origins and only required methods/headers; verify the deployed preflight response for both approved and unapproved origins.

### P2 — Placement edit terms are incomplete or mis-mapped

**Evidence:** Merchant omits `position` from the rendered schema and treats every numeric term as a decimal input. In Admin, `PlacementTerms` filters `position`; the replacement action does not promote a rendered `quantity` field to the top-level placement `quantity` expected by the backend. Neither UI exposes the placement `active` state or clearly shows section clock beside the product clock.

**Impact:** Position can silently default, quantity can be misplaced in config or truncated, and the operator cannot see/manage the complete placement contract. The spec's `quantity` semantic can appear configured without being enforced.

**Fix:** Define one typed placement request/response model shared by both frontends; make integer vs decimal controls follow schema metadata; require complete field mapping tests from input → request → persistence → public response.

### P2 — Admin section contract/editor does not fully honor its own backend schema

**Evidence:** `GET /cms/section-types` returns the unfiltered palette rather than the page-specific palette; the section editor does not expose automatic-source config after creation, has no card-display panel despite the API returning `cardDisplay`, and some toggle/choice field kinds fall through to text controls. Section validation also does not enforce the page-family/type whitelist.

**Impact:** Admin can offer or save section combinations the target page cannot render, while source and card settings may be impossible to change after creation or may be persisted with the wrong type.

**Fix:** Pass the target document type to the contract endpoint and validate it again on save; render every declared field kind and every returned cardDisplay setting; test create → reopen → edit → publish for every section family and source.

### P2 — Frontend does not independently hide timed sections as time passes

**Evidence:** Backend filters sections/placements when constructing the response, but the frontend section type omits clocks and the renderer filters only by type/visibility. The flash-sale renderer can leave its band mounted with a zeroed/expired timer while products remain in the already-fetched payload.

**Impact:** A page left open across an end time may continue to show an expired section/offer. The backend must remain authoritative, but the UI should not keep presenting stale campaign state.

**Fix:** Return explicit server-calculated live state/end timestamps, update or remove timed UI at expiry, and revalidate all offer details on cart/quote/place. Add fake-clock browser tests.

### P2 — Login throttling was not found in the application code

**Evidence:** Shopper, Merchant and Admin login routes verify credentials and issue sessions; no application-level rate limiter or lockout was found in the inspected backend. An external edge control may exist, but it was not verified.

**Impact:** Exposed login endpoints can be targeted by password guessing or credential stuffing. Strong password hashing helps storage security but does not limit guesses.

**Fix:** Add per-account and per-source rate limits/backoff (with safe recovery against denial-of-service lockouts), alert on repeated failures, and confirm equivalent limits exist at the edge.

### P3 — Placement terms are shown for unchecked sections in Admin

**Evidence:** `PlacementTerms` renders enabled inputs for every available section; it does not know whether the checkbox is selected. The selected-section fields are not hidden or disabled like they are in the Merchant form.

**Impact:** Admin product forms show irrelevant fields and may submit stray terms for sections not selected. This is confusing and makes required-field behavior fragile if requirements expand.

**Fix:** Tie each `PlacementTerms` block to its checkbox selection; disable/hide it when unchecked and validate only selected placements.

## Security assessment

**Positive controls observed:** passwords are not stored as plaintext; staff APIs use authentication plus explicit permissions; merchant operations use staff/merchant subject-type checks; cart ownership is checked server-side; public catalog serialization uses an explicit field allowlist on catalog routes; review logic checks for a delivered paid order; media upload sizes and file signatures are validated; checkout refuses to create a fake paid order when payment is absent.

**Additional risks:** session tokens are accepted in query parameters and request bodies as well as headers; `CODEWORDS_API_KEY` is sent by clients but no backend validator was found; cart/review nested products bypass the public allowlist; numeric writes need server constraints; CORS is wildcard by default unless production overrides it; and upload/media URL fields need an explicit allowed-scheme/host policy. Public root/health responses also expose deployment counts/configuration metadata; reduce them to generic liveness where practical.

**Not a security certification:** This was a repository review plus a limited read-only public API check, not a penetration test, dependency audit, cloud-configuration review, or inspection of production logs/secrets. I did not use credentials or call authenticated production endpoints.

**Prioritize before launch:** finish server-side placement/price/stock validation across detail, cart and checkout; configure a real payment provider and validate webhook signatures; replace URL/body token transport with protected headers and redact logs; allowlist product output fields in cart/review; add numeric input constraints and login throttles; set explicit production CORS and media URL policies; resolve the unused Bearer key expectation; correct the live schema health value. Keep all prices and placement validity server-authoritative.

## Recommended implementation order

1. Define the placement-aware product-detail/cart-line identity and server-side offer resolver.
2. Add tests proving the shown price, section quantity, stock and clocks stay correct from storefront → detail → cart → quote → order, including expiry, concurrency and tampering.
3. Finish checkout/payment provider integration and signed webhook handling; retain 503 until payment is truly ready.
4. Add active/paused, position, quantity, two-clock and section-first controls with typed shared request/response models.
5. Make Admin and storefront honor every page family, source field, presentation and card-display switch; align live previews with rendering.
6. Set an explicit time zone policy and serialize offsets consistently.
7. Replace URL/body session transport, add login throttles, constrain numeric and media URL inputs, project safe product fields, set explicit CORS, clarify Bearer-key intent and correct health schema reporting.

## Validation boundaries

- **Verified:** 64/64 backend tests; typecheck passed in Admin, Merchant and Marketplace; live unauthenticated health/page GETs returned HTTP 200.
- **Not verified:** authenticated production writes, live checkout, payment provider behavior, cloud/database migration history, browser interaction/visual rendering, runtime production logs, or a formal security test.
- **Repository state:** no tracked source files were changed during this audit. The report itself is an audit artifact.

# FerixCommerce section system — implementation report

**Date:** 17 October 2026
**Repository:** `Asaphis/FerixCommerce`
**Working branch:** `main`

## What the section system is meant to do

A CMS section is a page-level design and product-selection contract. Its unsaved edits and saved draft should be previewable—including real products already assigned to the section—without changing the public storefront. Publishing should make that exact draft public. The storefront, product details, and basket must then agree on the section’s card design, campaign clock, product terms, and price. Prices remain server-authoritative; the CMS section itself does not set an arbitrary product price.

## Findings and fixes

### 1. Draft preview was incomplete and detached from actual placements

The editor’s preview did not faithfully follow all form edits and could not reliably show the products assigned to that section. This made saved-but-unpublished designs hard to review.

**Implemented:** the Admin editor now has a private, authenticated draft-preview data path that loads the current draft (or published document when no draft exists), the actual assigned products, placement terms, and status. Its preview updates from form/media changes and renders product cards, section styling, the campaign timer, labels and card-display switches. It distinguishes draft-only content from what is currently public. Product data is passed through the shopper-safe projection; private seller fields are not returned.

### 2. Section settings did not consistently reach public rendering

Some values were accepted and saved by the CMS but did not affect every public rendering path. Product-card display switches were not consistently propagated through grid, carousel and flash-sale layouts; configured colors, promo-strip controls, and saved links could also be ignored or displayed differently.

**Implemented:** the shared renderer now passes card-display settings through the product-grid, carousel and campaign cards. The public promo strip honours its icon, CTA, accent and dismissible settings. Section text/background/accent and timer colors are applied where supported. CMS colors are constrained to six-digit hexadecimal values and public renderers also sanitize legacy values. Hero, promo and other section destinations are routed through safe-link handling. Browse/Search pages use the canonical section renderer rather than a smaller, divergent rendering path.

### 3. Public serialization discarded section pricing metadata

The backend’s public product allowlist removed section price, label, badge color, remaining quantity, base-price and placement identity after the section resolver had attached them. A renderer could therefore receive an incomplete product even when the section resolver had found the correct placement.

**Implemented:** only the shopper-facing section fields are now included in the public product projection. Product-detail links preserve the originating page/section context and the detail endpoint resolves only an active published placement; stale or invalid context falls back to the ordinary product.

### 4. Section price and identity stopped at the product card

The basket request carried a product ID, not its section/document identity. Consequently the server could not verify or price a section offer, and the same product could not be distinguished as a normal item versus a section-priced line.

**Implemented:** section identity now travels from section cards through product-detail links/forms to the cart API. The backend validates the published page, visible section, active placement, product and time window; it computes the amount from stored placement terms, separates section and ordinary cart lines, and enforces placement quantity limits. Client-provided prices are never used as prices. A submitted display price is only a stale-page guard: if it differs from the currently calculated price, the server returns `409` and asks the shopper to refresh. Basket recalculation uses the current effective product price (including an active product-level promotion) when the section price is disabled.

### 5. Product placement inputs needed stronger validation

Seller placement fields were schema-filtered but color values were treated as ordinary text. Unsafe or malformed colors and unsafe section CTA schemes could therefore be persisted and cause inconsistent rendering.

**Implemented:** seller badge colors and CMS section colors are validated as six-digit hex. CMS CTA destinations allow same-site paths and HTTPS URLs while rejecting protocol-relative and script-style destinations. Public styles are independently sanitized for legacy records.

### 6. Draft and publish behavior

The versioned CMS path was verified: Save writes a draft version and leaves the public document untouched; Publish promotes the latest draft. The implementation retains this isolation while exposing the saved draft only to the authenticated Admin preview. Page-family palette filtering and backend validation prevent adding section families that the target route does not render.

## Validation performed

- **Backend:** `68` tests passed with `python -m unittest discover -s tests -v` from `Backend/`.
- **Marketplace:** TypeScript check passed; optimized Next.js production build completed, including static generation for 37 routes.
- **Admin:** TypeScript check passed.
- **Backend syntax:** all modified Python modules compiled with `py_compile`.
- **Diff hygiene:** `git diff --check` passed.
- Regression coverage includes draft privacy and publish visibility, private preview with real assigned products, section-price cards and product detail, cart price and line identity, stale-price rejection, quantity limits, section-price display-off behavior, invalid placement IDs, page-family palette filtering, and unsafe color/CTA rejection.

## Remaining limitations / operational notes

- **Checkout/payment remains disabled in this repository:** the existing checkout placement endpoint returns `503` while no payment/order-placement integration is configured. The changes here make section pricing and basket lines coherent; they do not enable payment or place orders.
- **This work is a repository push, not a production deployment.** Production deployment and post-deploy verification still need to run in the deployment environment.
- No tracked application files were deleted: the audit did not establish any obsolete tracked component as safe to remove. Generated local install lockfiles and earlier audit/spec copies are not part of the implementation changeset.

## Release checklist

1. Merge/push the reviewed `main` changes.
2. Deploy the backend and Admin/Marketplace front ends together so the API contract is available to both applications.
3. In a non-production test page, edit each section family, verify the private preview with real assigned products, Save and confirm the public page is unchanged, then Publish and confirm the storefront shows the same styling/products.
4. Test a section price, a normal price for the same item, a stale page, a paused/expired placement, and a quantity above the placement cap. Confirm the basket shows the server-calculated amount.
5. Keep checkout disabled until payment integration and order-placement tests are complete.

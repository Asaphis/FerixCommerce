# Ferixas full redesign — acceptance checklist

- [ ] Transform the **entire** Shopper, Merchant, and Admin UI/UX to the user-approved concept boards; do not stop at colors or spacing.
- [ ] Keep the three surfaces unmistakably part of the Ferixas brand while giving Shopper retail, Merchant operations, and Admin platform control distinct information architecture.
- [ ] Use rectangular cards with a subtle curve/chamfer at one selected corner, not heavy global rounding.
- [ ] Dramatically reduce copy: short titles and at most one supporting line where helpful.
- [ ] Make phone summary cards short landscape rectangles, two across; verify layouts at 360/390, 768, and 1280+ with no horizontal overflow.
- [ ] Rebuild Shopper home/discovery/product/cart/checkout/account/auth and mobile/desktop navigation; retain working catalog and account flows.
- [ ] Rebuild Merchant dashboard/catalog/inventory/orders/analytics/media/payout/auth flows; retain working seller actions and truthful empty states.
- [ ] Rebuild Admin overview/operations/CMS/auth flows; retain functional page/section navigation, uploads, and media previews.
- [ ] Do not fake any payment, order, payout, sales, traffic, impression, or conversion figures. Derive supported measures from persisted records and show **Coming soon** for unimplemented metrics.
- [ ] Resolve incorrect/broken campaign asset paths; do not use decorative fallback artwork to imply unavailable content is real.
- [ ] Run all three production builds, backend regression tests, screenshot comparison, responsive overflow checks, and broken-image checks.
- [ ] Commit and push verified changes to GitHub `main`; state what is pushed versus what still requires production deployment.

## Current focused work
- [ ] Departments render as responsive poster tiles; phone groups are configurable by across × rows, swipe position dots/count work, all departments show unless a limit is set, and desktop/tablet groups match visible columns.
- [ ] Remove dead category CMS controls and make the remaining arrangement, row, limit, and See all settings persist and affect the storefront.
- [ ] Homepage hero section and Explore hero both support image/video upload and preview; media-only mode removes all text, buttons, shading, controls, and fallback color.
- [ ] Verify the CMS draft/publish behavior, phone/tablet/desktop layouts, Marketplace/Admin builds, and backend regressions before pushing.


## Approved seller/admin governance follow-up
- [ ] Admin’s default Products catalogue contains only canonically platform-owned Ferixas Official products; seller products are in a separate review or merchant-detail workflow, and no accidental combined owner view is offered.
- [ ] Every admin generic product edit/delete path is owner-scoped; no generic status edit or legacy approval route can publish a seller item. Seller products remain private until a valid pending-review decision approves them, and missing marketplace-channel data fails closed.
- [ ] Seller dashboard list/detail/edit/delete and new seller analytics remain scoped to the authenticated merchant ID; platform and other-seller products never appear there.
- [ ] Ferixas public seller pages expose only approved marketplace-profile fields and that seller’s approved marketplace products. External seller website/domain/storefront CMS page content, private address, sign-in email, plan, commission, and payout details are not exposed or rendered as Ferixas storefront content.
- [ ] Seller profile edits remain snapshots awaiting Admin approval; the seller sees live profile versus pending proposal, request status, reviewer feedback, and submission history. Admin can find pending seller-profile changes in a global review queue and approve, request changes, or reject with a note and audit trail.
- [ ] Seller Audience UI shows follower counts from real follow relationships and dated aggregate follow/unfollow history; it does not reveal follower identity or private contact data and does not invent dates for pre-existing followers.
- [ ] Seller Audience UI shows only persisted reviews for products owned by that seller, with no customer email/phone or fabricated rating/review history.
- [ ] Seller dashboard retains real order, commission, payout, and performance provenance; unavailable payment capture and traffic/conversion remain clearly unavailable rather than being simulated.
- [ ] Seller Center product, order, revenue, and payout views are scoped to Ferixas marketplace activity only; independent seller websites are not shown as marketplace channels, and unpaid orders cannot be marked shipped or delivered.
- [ ] Admin order, payment, and analytics views include only explicitly tagged Ferixas marketplace orders; financial totals require a paid/captured/succeeded/settled payment state and exclude cancelled orders. Fulfilment status alone never establishes payment, refund, or settlement.
- [ ] Do not infer a refund from cancellation, generate payout estimates from orders, or mark transfers paid without a verified provider result. Until a provider is connected, refunds/transfers remain unavailable and existing payout rows are presented as unverified records.
- [ ] Preserve the existing hosted REST API and Neon persistence boundary; use existing JSON-backed data for anonymous follower aggregates, add no database table or schema migration, do not add a runtime SQLite/local DB, change production environment settings, query/write production records, or deploy. Run isolated backend regressions and Marketplace/Merchant/Admin production builds, then push verified code to GitHub `main`.

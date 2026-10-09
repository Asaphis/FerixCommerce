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

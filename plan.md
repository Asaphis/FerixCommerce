# Ferixas full UI/UX redesign plan

## Objective
Replace the current incremental styling pass with a complete, recognizable high-end commerce experience across Shopper Marketplace, Merchant Workspace, and Platform Admin, using the user-approved Ferixas concept boards as the visual target. Preserve existing APIs, authentication, catalog and CMS workflows; do not fabricate orders, payments, payouts, traffic or conversion data.

## Design direction
Ferixas should feel like one original, confident marketplace brand: bright commerce surfaces, bold campaign color, crisp navy typography, clear product imagery, and restrained orange accents. Shopper is retail-first and energetic; Merchant is an efficient seller operations workspace; Admin is a calm, high-trust command console. Use the supplied concept boards as the source of truth, not generic dashboard/card styling.

## Shared visual rules
- Square/rectangular geometry with a single restrained curved or clipped corner on selected components; avoid pill-heavy or globally over-rounded cards.
- Short headings and at most one useful supporting line; remove repeated explanatory copy and empty decorative sections.
- Product-first layouts, meaningful image area, strong price/title hierarchy, consistent CTA hierarchy, and deliberate whitespace.
- Compact metric cards are short landscape rectangles; on mobile, show two per row.
- Responsive at 360/390, 768, and 1280+ widths; navigation, tables, forms, drawers, and overlays must not create horizontal overflow.
- One Ferixas component language and typography/color system across all three apps, with distinct role navigation and restrained role-specific surfaces.
- Respect reduced-motion preferences, visible keyboard focus, accessible labels, and touch targets.

## Screen architecture
### Shopper Marketplace
A retail-native top shell with prominent search, category discovery, account/cart affordances, and a proper mobile navigation. Rebuild the homepage hierarchy around an edge-to-edge campaign hero, compact category tiles, editorial merchandising, deal discovery, and dense-but-readable product grids. Rework the browse/category/search/product/store/cart/checkout/account/auth flows to share that hierarchy, card system, and mobile behavior. Keep the mobile product grid two-up and product imagery prominent.

### Merchant Workspace
A clearly differentiated Seller Center with a branded desktop side rail, compact workspace header, task-first dashboard, two-up phone metrics, actionable order/inventory queues, concise forms, and mobile bottom navigation. Make analytics distinguish verified order-backed measures from unavailable traffic. Keep product, inventory, order, customer, media, payout and store-design flows within the same operational system.

### Platform Admin
A high-trust operations console with role-specific navigation, a crisp overview, real platform data, concise action queues, and responsive tables/cards. Apply the same Ferixas design primitives to merchants, customers, catalog, orders, payouts, audit, settings, and CMS. Preserve CMS page-to-section navigation and upload previews; make content editing feel like a purpose-built publishing studio.

## Data and media integrity
- Derive sold units and financial totals only from persisted order rows/line items; do not present seeded catalogue metadata as actual sales.
- Remove invented traffic/impressions/conversion claims. Display `Coming soon` where the feature is not backed by a real source.
- Never create sample payments/orders/payouts to make a screen look populated. Empty states must remain honest and useful.
- Use existing approved/local catalogue media where available; correct broken hero/category asset references rather than masking them with invented business content.

## Implementation sequence
1. Create shared acceptance checklist and audit route/component ownership.
2. Rebuild app-wide tokens, shells, navigation and reusable commerce/workspace components.
3. Redesign the main Shopper, Merchant, Admin, auth/account and CMS screens, then propagate the same patterns across the remaining route families.
4. Correct data provenance and media handling; remove unsupported metrics/copy.
5. Run all three production builds, backend regressions, and responsive browser QA at 360/390, 768 and 1280; fix issues before committing/pushing to `main`.

## Validation and delivery
Use the isolated local QA API/database only for preview; do not change live orders, payments, account/security settings or production CMS content. Compare screenshots against the approved boards, check overflow/broken media, run builds/tests, and push only verified source changes to the authorized GitHub `main` branch. Production publishing/redeployment is separate and will be identified clearly in the handoff.

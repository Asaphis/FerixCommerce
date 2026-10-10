# Ferixas frontend integration contract

All three frontends use the existing hosted commerce REST API at
**`https://shopapi.ferixas.com`** by default. Every screen must read and write through
its app's `lib/api.ts`. Never hardcode records in a page or connect a frontend
directly to PostgreSQL/Neon.

## Environment

An alternate deployment can override the API host with both server and browser
values:

```
FERIX_API_BASE=https://shopapi.ferixas.com
NEXT_PUBLIC_FERIX_API_BASE=https://shopapi.ferixas.com
```

## Demo sign-ins

| Surface | Email | Password |
|---|---|---|
| Admin (owner) | `info@ferixas.com` | `Ferixas123` |
| Admin (content) | `content@ferixas.com` | `Ferixas123` |
| Admin (ops) | `ops@ferixas.com` | `Ferixas123` |
| Merchant | `owner@abc-electronics.ferixas.com` | `Ferixas123` |

Other merchants: `aurasound`, `nova-fashion`, `sahel-supply`, `lumen-home`,
`pixel-gaming`, `verdant-beauty`, `ferixas-official`.

## Page conventions

### Admin console (`WebPhase/admin`)

- Server components. Guard every page with `const { session, admin } = await requireAdmin();` from `@/lib/data`.
- Fetch with `@/lib/api` helpers. Wrap failures with `explain(error)` from `@/lib/data`.
- Mutations go in `lib/actions.ts` as `"use server"` functions returning `FormState`.
- UI primitives live in `@/components/ops/bits` (`Panel`, `PanelHead`, `Eyebrow`, `Pill`, `Readout`, `Meter`, `Distribution`, `Empty`) and `@/components/ops/controls` (`SubmitButton`, `Field`, `inputClass`, `selectClass`, `textareaClass`).
- Theme tokens: `bg-void`, `bg-panel`, `bg-panel-2`, `text-chalk`, `text-chalk-dim`, `border-hairline`, accents `text-signal` (lime), `text-violet`, `text-mint`, `text-amber`, `text-rose`. Fonts: `font-display`, `font-mono`.

### Merchant workspace (`WebPhase/merchant`)

- Same pattern with `requireMerchant()` from `@/lib/data`.
- Primitives in `@/components/studio/bits`, `@/components/studio/controls`, `@/components/studio/forms`.
- Accent is `text-lime`.

### Responsiveness

Every page must work at 360 px, 768 px and 1280 px:

- Tables must be wrapped in `overflow-x-auto` with a `min-w-[...]` table, or become stacked cards below `md`.
- Never use a fixed pixel width without a responsive alternative.
- Filter bars wrap (`flex flex-wrap`) and search inputs are full width on phones.
- Keep copy short. A card shows a title and at most one supporting line.

## Endpoints available

### Admin

```
GET    /admin/catalog/products?search&category&status&owner
POST   /admin/catalog/product
PATCH  /admin/catalog/product
DELETE /admin/catalog/product
GET    /admin/merchants
GET    /admin/merchant?id=
PATCH  /admin/merchant
PATCH  /admin/merchant/product
DELETE /admin/merchant/product
POST   /admin/merchant/product/restore
GET    /admin/merchant/profile-requests
POST   /admin/merchant/profile-request/decision
GET    /admin/review/queue
POST   /admin/review/decision
GET    /admin/catalog/categories      POST /admin/catalog/category      DELETE /admin/catalog/category
GET    /admin/catalog/collections     POST /admin/catalog/collection    DELETE /admin/catalog/collection
GET    /admin/cms/banners             POST /admin/cms/banner            DELETE /admin/cms/banner
GET    /admin/cms/documents           GET  /admin/cms/document?id=
PATCH  /admin/cms/document            POST /admin/cms/document/publish   POST /admin/cms/document/restore
GET    /admin/media                   POST /admin/media                 DELETE /admin/media
GET    /admin/promotions              POST /admin/promotions            DELETE /admin/promotions
GET    /admin/payments
GET    /admin/payouts                 PATCH /admin/payouts
GET    /admin/staff                   POST /admin/staff                 DELETE /admin/staff
GET    /admin/audit
```

### Merchant

```
GET/PATCH /merchant/storefront        POST /merchant/storefront/publish
GET/POST/DELETE /merchant/media
GET/POST /merchant/promotions
```

Admin orders, payments and analytics include only explicitly tagged Ferixas marketplace orders. Revenue and commission require a paid/captured/succeeded/settled payment state and exclude cancelled orders; fulfillment is not proof of payment, refund or settlement. With no provider connected, refund/paid-payout mutations are refused, payout estimates are not synthesized from orders, and persisted payout rows remain unverified records.

Admin seller management and review are separate workflows. `GET /admin/merchant?id=` is the Merchant record: it exposes seller-scoped performance/catalogue and the approved profile as read-only. `PATCH /admin/merchant` changes only account/commercial settings, not seller-submitted profile fields. The Merchant page can edit only approved listings owned by that seller via `/admin/merchant/product`; pending submissions must use the Review queue. Marketplace visibility and homepage featuring are separate listing controls. Removing an unreferenced listing deletes it; listings referenced by orders, reviews, placements, or sales are archived and may be restored. `/admin/review/queue` and `/admin/merchant/profile-requests` feed the same Admin Review page; decisions remain permission-checked by the API, and failed queue loads must not appear as empty queues.

## Deferred features

These must exist as pages and say **Coming soon** — do not fake them:

- Visual Store Design engine (drag-and-drop canvas, templates, AI assistant)
- Custom domain connection and SSL
- Payment provider charging and live payouts
- Email campaign automation

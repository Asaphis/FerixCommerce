# Ferixas — Seller System

The merchant workspace. One of three separate systems on the same platform backend:

| System | Audience | State |
|---|---|---|
| Customer | Shoppers | Built |
| **Seller** (this project) | Merchants running their shop | Built |
| Admin | Platform operators | Not started |

## How it talks to the backend

Every screen and every action goes through `lib/api.ts`. Nothing in the UI holds its own
data — there is no mock or placeholder data anywhere in this app.

The backend is the shared hosted commerce REST API, the same one the customer system uses.
The frontend reads and writes through that API; it does not connect directly to PostgreSQL/Neon.

The default API host is `https://shopapi.ferixas.com`. For a deployment using another API host,
set both public and server values:

```
FERIX_API_BASE=https://shopapi.ferixas.com
NEXT_PUBLIC_FERIX_API_BASE=https://shopapi.ferixas.com
```

## Routes

`/login` · `/` (dashboard) · `/products` · `/products/new` · `/products/[slug]` ·
`/inventory` · `/orders` · `/orders/[id]` · `/customers` · `/customers/[id]` ·
`/analytics` · `/payouts` · `/settings`

## Demo store

Any seller on the platform signs in with their own email and the shared demo password:

```
owner@abc-electronics.ferixas.com / Ferixas123
```

Other stores: `aurasound`, `nova-fashion`, `sahel-supply`, `lumen-home`, `pixel-gaming`,
`verdant-beauty`, `ferixas-official`.

## Backend surface this app uses

```
POST   /merchant/login             POST   /merchant/logout
GET    /merchant/me                GET    /merchant/dashboard
GET    /merchant/products          GET    /merchant/product
POST   /merchant/product           PATCH  /merchant/product
DELETE /merchant/product           GET    /merchant/inventory
POST   /merchant/inventory/adjust  GET    /merchant/orders
GET    /merchant/order             POST   /merchant/orders/status
GET    /merchant/customers         GET    /merchant/customer
GET    /merchant/analytics         GET    /merchant/payouts
GET    /merchant/settings          PATCH  /merchant/settings
```

The merchant session token travels inside the request body (writes) or the query string
(reads), because the runtime proxy does not forward custom headers.

## The core idea this workspace demonstrates

Seller products are scoped to the authenticated merchant and submitted to the Ferixas
marketplace for review. Only approved listings and an approved seller profile appear on
Ferixas. A seller's independent website is separate: its pages, domain, and storefront
content are not embedded or represented as a Ferixas marketplace store.

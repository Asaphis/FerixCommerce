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

The backend is the shared FastAPI commerce API, the same one the customer system uses.
It answers the same requests, at the same addresses, with the same shapes of data across
local and production environments.

To point at the production backend, change one value:

```
FERIX_API_BASE=http://127.0.0.1:8000
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

A product is one record. Per product the merchant chooses which channels it sells on —
their own storefront, the Ferixas marketplace, or both. Stock is shared, so a marketplace
sale reduces the same count the storefront shows. A marketplace order also lands in the
merchant's order queue, marked with its channel.

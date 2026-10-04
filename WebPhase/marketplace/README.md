# Ferixas — Customer System

The shopper-facing system. This is one of three separate systems built on the
same platform backend:

| System | Audience | State |
|---|---|---|
| **Customer** (this project) | Shoppers | Being built |
| Seller | Merchants running their shop | Not started |
| Admin | Platform operators | Not started |

## How it talks to the backend

Every screen and every action goes through `lib/api.ts`. Nothing in the UI holds
its own data — there is no mock or placeholder data anywhere in this app.

The repository now includes the production API in `../../Backend`. It uses Neon
PostgreSQL for persistent state and keeps the same route contract as the
original simulator. The sandbox preview may still point at the local mock while
the Neon service is being deployed; the app cannot tell the difference once the
route contract is online.

To switch to the production backend, change one value:

```
FERIX_API_SERVICE=<service id>      # or
FERIX_API_BASE=https://<host>
```

No page or component needs to change.

## Routes

**Browsing** `/` · `/browse` · `/search` · `/product/[slug]` · `/stores` · `/store/[slug]`

**Shopping** `/cart` · `/checkout` · `/order/[id]`

**Account** `/login` · `/register` · `/account` · `/account/orders` · `/account/wishlist` ·
`/account/addresses` · `/account/reviews` · `/account/settings`

## Backend surface this app uses

```
GET    /catalog/home              GET    /catalog/products
GET    /catalog/product           GET    /catalog/categories
GET    /catalog/category          GET    /catalog/collections
GET    /catalog/collection        GET    /catalog/stores
GET    /catalog/store              GET    /search
POST   /auth/register             POST   /auth/login
POST   /auth/logout               GET    /auth/me
GET    /cart                      POST   /cart/items
PATCH  /cart/items                DELETE /cart/items
POST   /cart/save-for-later       GET    /account
GET    /account/orders            POST   /account/orders/reorder
GET    /account/addresses         POST   /account/addresses
PATCH  /account/addresses         DELETE /account/addresses
GET    /account/wishlist          POST   /account/wishlist/toggle
GET    /account/reviews           POST   /account/reviews
PATCH  /account/reviews           DELETE /account/reviews
GET    /account/settings          PATCH  /account/settings
GET    /shipping/options          POST   /checkout/quote
POST   /checkout/place
```

The signed-in session token and the cart id travel inside the request body
(writes) or the query string (reads), because the runtime proxy does not forward
custom headers.

## Demo account

A seeded shopper with past orders, addresses and saved items:

```
demo@ferixas.com / Ferixas123
```

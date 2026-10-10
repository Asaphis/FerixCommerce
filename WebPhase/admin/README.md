# Ferixas — Admin Console (WebPhase/admin)

The platform control room. One of three separate systems on the same backend:

| System   | Audience                 | State |
|----------|--------------------------|-------|
| Customer | Shoppers                 | Built |
| Seller   | Merchants running a shop | Built |
| **Admin** (this project) | Platform operators | Built |

## How it talks to the backend

Every screen and every action goes through `lib/api.ts`. Nothing in the UI holds its own
data — there is no mock or placeholder data anywhere in this app. Point `FERIX_API_BASE`
at the hosted commerce API and the console follows with no code change. The default API
host is `https://shopapi.ferixas.com`; this app uses the REST API and never connects directly
to PostgreSQL/Neon.

## Routes

`/login` · `/` (overview) · `/merchants` · `/merchants/[id]` · `/users` · `/users/[id]` ·
`/orders` · `/analytics` · `/settings`

## Demo operator

```
info@ferixas.com / Ferixas123
```

Also `admin@ferixas.com` and `ops@ferixas.com`.

## Backend surface this app uses

```
POST   /admin/login       POST   /admin/logout      GET  /admin/me
GET    /admin/overview    GET    /admin/merchants   GET  /admin/merchant
PATCH  /admin/merchant    GET    /admin/users       GET  /admin/user
GET    /admin/orders      GET    /admin/analytics   GET  /admin/settings
PATCH  /admin/settings
```

The operator session token travels inside the request body (writes) or the query string
(reads), because the runtime proxy does not forward custom headers.

## Access separation

Operator sessions are prefixed `a_`, merchant sessions `m_`. A merchant token is refused by
every admin endpoint and an operator token is refused by the merchant endpoints, so the two
systems cannot cross over.

## Environment

```
FERIX_API_BASE=https://shopapi.ferixas.com
NEXT_PUBLIC_FERIX_API_BASE=https://shopapi.ferixas.com
CODEWORDS_API_KEY=
```

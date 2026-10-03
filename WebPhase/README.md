# WebPhase — the three systems

Each system is built on its own. They share one backend.

| Folder | System | Audience | State |
|---|---|---|---|
| `marketplace/` | **Customer** | Shoppers | Built |
| `merchant/` | **Seller** | Merchants running their shop | Not started |
| `admin/` | **Admin** | Platform operators | Not started |

## marketplace/ — the customer system

A Next.js app. It is its own project root: run npm commands from inside it.

```
cd WebPhase/marketplace
npm install
npm run dev
```

Every screen gets its data by calling the backend — there is no mock or
placeholder data in the app itself.

- `_specs/` holds the original per-page notes (home, products, cart, checkout,
  account) that came with the repo. They describe intent, not the build.
- `.env.example` lists the two settings the deployed app needs.

## Status of admin/

No specification has been written for admin yet, so it is untouched.

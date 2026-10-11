# Ferixas Seller Workspace

The merchant-facing Next.js application for catalogue, inventory, orders, customers, analytics, payouts, promotions and profile settings. It calls the shared FastAPI API through `lib/api.ts`; it does not access PostgreSQL directly.

## Run and build

```bash
npm ci
FERIX_API_BASE=http://localhost:8000 npm run dev
npm run typecheck
npm run build
```

Configure the server-side and public API base variables from `.env.example` for the deployment. There is no shared seller demo password: seller accounts are provisioned through the platform's authorized account workflow. Test fixtures and test-only credentials are described in [`../../Backend/README.md`](../../Backend/README.md); never use them in production.

## Product lifecycle

Seller-owned listings are private until approved by an Admin. Store profile edits that change marketplace-visible fields use the review queue. Suspended or marketplace-disabled sellers, unapproved listings and listings with the marketplace channel off are not publicly discoverable. Seller Studio is marked **Coming soon** and remains read-only until its design engine is implemented.

## Mobile navigation

The workspace keeps five primary links in the bottom bar and groups all destinations in the accessible More drawer. The drawer is safe-area aware and closes on navigation or Escape.

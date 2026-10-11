# Ferixas Commerce

Ferixas is split into three Next.js applications backed by one FastAPI API. Run each web app from its own folder; none should connect to PostgreSQL directly.

| Folder | Surface | Purpose |
|---|---|---|
| `marketplace/` | Shopper | Public marketplace, cart, checkout and account |
| `merchant/` | Seller | Seller catalogue, inventory, orders, audience and workspace |
| `admin/` | Admin | Platform catalogue, seller review, CMS and operations |

## Local development

1. Start the API from `../Backend` after configuring `DATABASE_URL` to a PostgreSQL instance (Neon is the intended database). The application intentionally has no local SQLite runtime fallback.
2. In a separate terminal, start one web surface:

```bash
cd marketplace   # or merchant / admin
npm ci
FERIX_API_BASE=http://localhost:8000 npm run dev
```

Configure the web app's server-side and public API base variables as required by its `.env.example`; never commit secrets or production tokens. For the local fonts and build requirements, use Node 22 and the committed lockfile.

## Verification

From the repository root, install backend/frontend dependencies and set `FERIXAS_TEST_POSTGRES_URL` to a disposable local PostgreSQL database named `ferixas_test_*`, then run:

```bash
make verify
```

Individual targets are `make backend-test`, `make postgres-smoke`, and `make frontend-check`. The PostgreSQL smoke creates and removes only its own uniquely named test schemas and refuses non-local hosts or a database name without the test prefix. Backend contract tests use a separate disposable SQLite database guarded by `FERIXAS_ENV=test`; SQLite remains test-only and is not a supported runtime fallback.

GitHub Actions runs the same backend contract, PostgreSQL migration/seed, and three frontend build/typecheck gates on pull requests and pushes to `main`.

## Product and deployment boundaries

- Seed catalogue rows are clearly marked demo listings, not actual orders or social-proof data.
- Seller listings remain private until the Admin approval workflow accepts them; public pages use the active-store, approved-product and marketplace-channel gates.
- Payment capture, refunds, payouts, and real email/media delivery require configured, verified providers. UI states must not imply those provider actions succeeded when the backend has refused or not performed them.
- Seller Studio storefront design is explicitly read-only/coming soon until the design engine is implemented.
- Production deployment, account creation and live provider setup are separate from local code verification; this repository does not claim that a live deployment was performed.

See [`../Backend/README.md`](../Backend/README.md) for API setup, production bootstrap and provider configuration.

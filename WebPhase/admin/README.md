# Ferixas Admin Console

The platform-operator Next.js application. It calls the shared FastAPI API via `lib/api.ts` and does not access PostgreSQL directly.

## Run and build

```bash
npm ci
FERIX_API_BASE=http://localhost:8000 npm run dev
npm run typecheck
npm run build
```

Set the matching server-side and public API base variables from `.env.example` for the deployment. Do not commit credentials. The application does **not** have a shared demo password. Test-only staff can be created by setting `FERIXAS_ENV=test` and `FERIXAS_TEST_STAFF_PASSWORD` in an isolated disposable test database. Production's first owner is created through the one-time `FERIXAS_BOOTSTRAP_SECRET` workflow; see [`../../Backend/README.md`](../../Backend/README.md).

## Main areas

- Seller and product review queues
- Ferixas Official catalogue
- Storefront CMS, brands, banners, media and placements
- Orders, customers, analytics and platform settings
- Role-based team access and audit trail

## Operational limits

Provider-dependent payment, refund, payout and delivery operations are blocked until their provider flow is configured and verified. A disabled or unavailable operation should show its API error rather than imply success. See the platform README for the full architecture and verification commands.

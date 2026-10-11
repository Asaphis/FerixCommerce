# Ferixas Commerce API

FastAPI service for the Shopper, Seller and Admin applications. PostgreSQL (Neon in the current product setup) is the runtime source of truth. The service intentionally does not fall back to local SQLite.

## Local API

```bash
cd Backend
python3 -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Set DATABASE_URL to a PostgreSQL URL with sslmode=require.
uvicorn app:app --reload --port 8000
```

The API applies idempotent schema migrations and seed content during startup. It seeds a completely blank database only; it must not overwrite existing catalogue, CMS or account data.

## Tests

```bash
python -m unittest discover -s tests -v
```

Tests create temporary SQLite fixtures with `FERIXAS_ENV=test`; a guarded helper drops only a database whose URL is SQLite and whose file name begins with `ferixas-`. This is not a supported runtime/deployment configuration.

## PostgreSQL migration smoke

Use a **disposable local** PostgreSQL database named `ferixas_test_*`; never point this test at staging or production. It creates uniquely named `ferixas_test_*` schemas, checks a fresh seed and repeat-seed idempotence, upgrades a legacy schema, rejects a future schema version, and drops only the schemas it created.

```bash
export FERIXAS_TEST_POSTGRES_URL='postgresql+psycopg://USER:PASSWORD@127.0.0.1:5432/ferixas_test_local'
python tests/postgres_migration_smoke.py
```

The script refuses non-local hosts and database names without the `ferixas_test_` prefix. CI runs this check against an ephemeral PostgreSQL service. From the repository root, `make verify` runs the backend contracts, PostgreSQL smoke, and all three frontend typecheck/build checks; set the local test URL first.

## Production owner bootstrap

Production must not use seeded or shared staff passwords. Before first deployment, set a strong, one-time `FERIXAS_BOOTSTRAP_SECRET` in the host's secret manager and call `POST /admin/bootstrap` with that secret, the initial owner's name/email and a password of at least 12 characters. Bootstrap is unavailable without the secret and succeeds only while no staff account exists. After the owner exists, remove/rotate the bootstrap secret according to the hosting provider's secret-management policy. The health endpoint reports not-ready until a production staff account exists.

Do not commit secrets, send them over chat, or enable `FERIXAS_TEST_STAFF_PASSWORD` in a production environment.

## External services and deliberate boundaries

- **Database:** PostgreSQL, with TLS enabled.
- **Media:** Cloudinary is the intended hosted provider; local media is an MVP fallback and should not be treated as durable production storage.
- **Email:** Resend integration needs a verified sender domain and configured API key.
- **Payments:** Checkout remains pending until a real payment provider flow is selected, configured and verified; setting an environment variable alone does not prove a captured payment.
- **Payouts/refunds:** do not mark a transfer or refund complete until a verified provider flow has executed it.
- **Seller marketplace:** products require explicit marketplace channel, approval and an active/enabled seller account.

Set `CORS_ORIGINS`, `PUBLIC_API_URL`, `PUBLIC_APP_URL` and frontend API base variables for the real deployment host. No production service was changed as part of repository review.

## Health

- `GET /health` probes database access and production owner bootstrap readiness, and reports provider configuration indicators.
- `GET /` reports catalogue counts and service status.

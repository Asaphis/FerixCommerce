# Ferixas production backend

This is the real FastAPI backend for the marketplace. It uses **Neon PostgreSQL** as the source of truth. The catalogue seed is demo content only so the customer UI has products, categories, stores and banners before the first merchant uploads real inventory.

## Local run

```bash
cd Backend
python3 -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# For local development, DATABASE_URL may be sqlite:///./ferixas-dev.db
uvicorn app:app --reload --port 8000
```

The first boot creates the tables and imports `seed.json`. It is idempotent: it does not reseed a database that already contains catalogue data.

## Production services to create

1. **Neon**: create a PostgreSQL project and copy its pooled connection string into `DATABASE_URL`. Keep `sslmode=require`.
2. **Cloudinary**: create a cloud and set `CLOUDINARY_URL`. Product images and future merchant uploads should use Cloudinary URLs; binaries should not be stored in Neon.
3. **Resend**: verify the Ferixas sending domain, create an API key, and set `RESEND_API_KEY` and `RESEND_FROM`. Use it for verification, password reset, order confirmation and shipping emails.
4. **API hosting**: deploy this folder to Render, Railway, Fly.io, or a container service. Set the environment variables in the host dashboard and expose HTTPS.
5. Point the frontend `FERIX_API_BASE` to the deployed API URL.

## Deliberate product behavior

- Seeded catalogue content is clearly demo catalogue content and is only used to populate the storefront.
- There are no fake merchant payouts, payment captures, email deliveries, or upload records.
- Payment capture is not enabled yet; checkout records remain `pending` until a payment provider is selected and configured.
- Media upload endpoints and merchant/admin systems are intentionally not represented as complete until their workflows are defined.
- Empty real user areas return empty arrays, not invented orders, addresses or reviews.

## Health checks

- `GET /health` checks database readiness and reports whether Cloudinary and Resend variables are configured.
- `GET /` reports the loaded catalogue counts and backend readiness.

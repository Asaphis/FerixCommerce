# Products

## Purpose

Complete product management interface. Merchants create, edit, delete, and organize their product catalog.

## Key Features

- **Product list** — searchable, filterable table of products
- **Create product** — new product form with all attributes
- **Edit product** — modify product details
- **Delete product** — remove or archive products
- **Product variants** — manage size, color, SKU variants
- **Pricing and discounts** — set prices, discount rules
- **Images and videos** — upload and manage media
- **Inventory** — stock levels per variant
- **Categories and CMS sections** — choose an active platform category and optionally request active product-grid/carousel placement
- **SEO configuration** — meta title and description; the API generates a slug on create and keeps it stable on update
- **Sales channels** — the current Seller flow acknowledges Ferixas Marketplace intent; Marketplace remains required until seller storefronts exist
- **Review lifecycle** — submit for Admin review; approved edits return to review and requested-change notes are shown when the response provides them
- **Preview product** — view how product appears live

## Data

- Product catalog (all products owned by merchant)
- Product details (name, description, pricing, variants, media, inventory)
- Category/collection mapping
- Channel assignments

## Notes

Merchant-only. Sales channel selection is a core Ferixas concept — the current Seller submission is Marketplace-only while Studio is unavailable.

### Product governance decisions

- **Category is required in the Seller UI.** The backend still accepts a blank category for compatibility, but this form does not submit one: Sellers select from active categories returned by `GET /merchant/product/options`. Sellers cannot create or rename platform categories.
- **Brand is explicitly optional.** Governance permits an unbranded listing, so the form offers “No brand” and otherwise accepts only active brands returned by the same existing options response. Sellers cannot create or rename platform brands. If governance later requires brands, that is a policy/API change, not a client-side assumption.
- **Slug is generated and stable.** The existing create contract derives a unique slug from the title when no slug is supplied; Seller edits address the product by `id` and do not rename the slug. There is intentionally no custom-slug control in this workspace, avoiding broken links and unsafe API-semantic changes.
- **CMS section assignment stays optional and active-only.** The form uses the existing `sections` array from the options response. The backend remains the source of truth for active platform sections and approval placement; no new endpoint is assumed. Existing detail-route id fallback remains required when a newly created record cannot be reopened by slug.
- **Review feedback and history are contract-scoped.** `reviewStatus`, `reviewNote`, `rejection_reason`, `submittedAt`, `submittedBy`, and `updatedAt` are rendered only when already present on the product response. There is no Seller lifecycle-history endpoint in the current contract, so the UI does not invent an event timeline. If a persisted history array is added later, extend the API type and render it from that response rather than deriving events in the client.

# Ferixas Merchant and Admin Feature Audit

**Audit date:** 2026-10-05  
**Scope:** `WebPhase/merchant`, `WebPhase/admin`, the real `Backend/` service, the existing specifications, and the attached requirements report.

## Executive finding

The repository contains substantial **frontend shells** for the Merchant and Admin systems, but they are not yet complete production systems.

The most important blocker is architectural:

> The new real backend in `Backend/app.py` currently implements the customer marketplace API only. It does not yet implement the `/merchant/*` or `/admin/*` APIs required by the existing Merchant and Admin frontends.

Both frontends still default to the old CodeWords mock service. The pages exist visually, but merchant and admin operations cannot be considered connected to the real database until those API families are added.

---

## Current implementation status

| Area | Frontend pages | Frontend API client | Real backend | Status |
|---|---:|---:|---:|---|
| Customer marketplace | Present | Present | Present | Working foundation |
| Merchant dashboard | Present | Present | Missing | Mock/demo only |
| Merchant products | Present | Present | Missing | UI exists; product mutations are not real |
| Merchant inventory | Present | Present | Missing | UI exists; persistence missing |
| Merchant orders | Present | Present | Missing | UI exists; fulfillment API missing |
| Merchant customers | Present | Present | Missing | UI exists; backend missing |
| Merchant analytics | Present | Present | Missing | UI exists; real event data missing |
| Merchant payouts | Present | Present | Missing | UI exists; financial ledger missing |
| Merchant Store Design | Missing | Missing | Missing | Correctly should be Coming Soon |
| Platform admin overview | Present | Present | Missing | Mock/demo only |
| Admin merchant management | Present | Present | Missing | Mock/demo only |
| Admin customer management | Present | Present | Missing | Mock/demo only |
| Admin order oversight | Present | Present | Missing | Mock/demo only |
| Admin analytics | Present | Present | Missing | Mock/demo only |
| Admin payments/payouts | Missing | Missing | Missing | Must be added |
| Platform CMS | Missing | Missing | Missing | Must be added |
| Flash-sale management | Missing | Missing | Missing | Must be added |
| Media library / Cloudinary | Missing | Missing | Configuration only | Must be added |
| Roles and permissions | Partial session separation in mock | Partial | Missing | Must be added before admin/merchant production use |

---

## Merchant frontend: what already exists

The Merchant frontend contains these routes:

```text
/login
/                         Dashboard
/products
/products/new
/products/[slug]
/inventory
/orders
/orders/[id]
/customers
/customers/[id]
/analytics
/payouts
/settings
```

It also contains shared UI for:

- Dashboard cards and charts
- Product list and product form
- Inventory adjustment
- Order status changes
- Customer lists and details
- Analytics panels
- Payout summaries
- Store settings
- Session login/logout
- Desktop navigation with a responsive horizontal mobile overflow pattern

The current navigation is:

```text
Dashboard
Products
Inventory
Orders
Customers
Analytics
Payouts
Store settings
```

This is a reasonable **merchant operations foundation**.

### Merchant features that are visibly implemented

- Revenue and order dashboard
- Product create/edit/delete screens
- Product status and sales-channel controls
- Stock adjustment screen
- Order list and order detail
- Fulfillment status actions
- Customer list and customer detail
- Analytics by channel/category
- Payout display
- Store settings
- Shared catalogue concept: Store and Marketplace channels

### Merchant features missing or incomplete

The product specification promises more than the current product form actually exposes.

#### Product management gaps

The specification requires:

- Product images
- Product videos
- Multiple variants
- Variant-level SKU
- Variant-level inventory
- Collections
- SEO title
- SEO description
- Custom URL slug controls
- Product preview
- Media ordering
- Product archive workflow
- Product duplication
- Bulk operations
- Import/export

The current merchant product form mainly covers:

- Title
- Category
- Description
- Price
- Compare-at price
- Stock
- Status
- Store channel
- Marketplace channel

Therefore the current product form is **not yet a complete product uploader**.

#### Store features missing

The Merchant navigation has no route for:

- Store
- Store pages
- Navigation editor
- Store media
- Domain management
- Marketplace participation detail
- Store preview
- Store design

This is acceptable for Store Design because it is intentionally deferred, but basic store settings should still be separated from the future visual editor.

#### Promotions missing

The Merchant frontend has no visible module for:

- Flash sales
- Discount campaigns
- Coupon codes
- Scheduled product promotions
- Sale quantities
- Promotion performance

These should not be mixed into the visual Store Design system. They belong in **Products / Marketing / Promotions**.

#### Financial functionality missing

The Payouts page exists, but a real merchant finance system still needs:

- Transaction ledger
- Gross sales
- Marketplace commission
- Payment processing fee
- Refunds
- Chargebacks
- Pending balance
- Available balance
- Payout history
- Payout method
- Payout status
- Settlement period
- Exportable statements

The current dashboard and payout UI should be treated as a placeholder until a proper financial ledger exists.

---

## Admin frontend: what already exists

The Admin frontend contains:

```text
/login
/                         Overview
/merchants
/merchants/[id]
/users
/users/[id]
/orders
/analytics
/settings
```

It is currently designed as a platform operations console, which is the correct direction.

### Admin features that are visibly implemented

- Platform overview dashboard
- Merchant list and merchant details
- Merchant status changes
- Merchant editing
- Customer list and details
- Order oversight
- Platform analytics
- Platform settings
- Admin login/logout

### Admin features missing

The current Admin navigation does not contain the most important platform-control areas discussed in the requirements.

#### Platform CMS missing

There is no route for:

```text
/cms
/cms/homepage
/cms/banners
/cms/categories
/cms/collections
/cms/media
/cms/publishing
```

The system cannot yet manage:

- Marketplace hero banners
- Banner video
- Homepage sections
- Section title and description
- Section ordering
- CTA labels and links
- Featured products
- Featured stores
- Category images
- Text-only categories
- Category navigation placement
- Collection cover images
- Draft/preview/publish state
- Scheduled publishing
- Version history
- Audit history

This is the biggest UI feature gap in the Admin system.

#### Catalogue management missing

Admin currently has no first-class product management route for Ferixas-owned products.

There should be a platform catalogue area for:

- Ferixas Official products
- Product approval
- Product archive
- Marketplace visibility
- Categories
- Collections
- Featured status
- Flash-sale inclusion
- Product media
- Canonical product content

This is where Ferixas should upload its own products rather than creating a fake normal seller account.

#### Platform commerce operations missing

Admin still needs dedicated areas for:

- Payments
- Refunds
- Chargebacks
- Payouts
- Commission rules
- Settlement ledger
- Tax configuration
- Subscriptions/plans
- Reports and exports
- Fraud/risk review
- Security events
- Admin roles and permissions
- Audit logs

The existing Admin `Settings` page should not become a dumping ground for all these functions. They need separate sections because they have different risk and permission requirements.

---

## Store Design status

The Merchant specifications correctly describe a future visual Store Design engine with:

- Templates
- Layer tree
- WYSIWYG canvas
- Properties inspector
- Device preview
- Undo/redo
- Version history
- Preview
- Publish
- AI design assistant
- Commerce components

None of this is implemented as a route or API yet.

This should remain visible as:

```text
Store Design
Coming soon
```

It should not be represented as a broken or half-functional editor.

The merchant can still have basic **Store settings** now:

- Store name
- Tagline
- About text
- Logo placeholder/media
- Marketplace participation
- Domain display
- Contact information

The visual layout editor, custom domain connection, and publishing engine can remain deferred.

---

## Product ownership and upload model

The audit confirms that the current UI is built around a single product record with channel flags. That is adequate for the first operational milestone, but the long-term product model should separate:

```text
Product
Offer / Seller listing
Inventory
Promotion
```

### Ferixas-owned products

Ferixas should upload its own products from:

```text
Admin → Catalogue → Ferixas products → Add product
```

Internally, Ferixas should also exist as a special merchant record:

```text
merchantId: ferixas-official
type: platform
```

This means:

- Admin controls the canonical product
- Ferixas Official owns the offer
- Sales can appear in the official merchant dashboard
- Admin can report platform and official-store sales separately

### Seller products

Sellers should upload from:

```text
Merchant → Products → Add product
```

They should control their own:

- Title
- Media
- Description
- Price
- Stock
- Variants
- Store visibility
- Marketplace visibility

### Shared or reseller products

If sellers later resell a Ferixas-owned product, create a separate offer rather than duplicating the product.

This is necessary for:

- Different seller prices
- Different stock
- Correct commissions
- Seller-specific fulfillment
- Multi-seller checkout
- Flash-sale ownership

---

## Flash sales and Explore

Neither Merchant nor Admin currently has flash-sale functionality.

Flash sales should be implemented as a separate campaign system, not as a modified product record.

Required concepts:

```text
FlashSale
├── name
├── banner
├── startsAt
├── endsAt
├── status
└── items

FlashSaleItem
├── flashSaleId
├── productId
├── offerId
├── salePrice
├── quantityLimit
└── soldQuantity
```

The backend should calculate whether a sale is active. The frontend should not decide this based on local time or arbitrary fields.

Explore should eventually expose:

- Categories
- Trending products
- New arrivals
- Flash sales
- Collections
- Featured stores
- Search results
- Product filters

The storefront should receive a resolved promotion object, for example:

```json
{
  "price": 99,
  "compareAt": 129,
  "promotion": {
    "type": "flash_sale",
    "title": "Weekend Tech Drop",
    "endsAt": "2026-10-10T23:59:00Z"
  }
}
```

---

## Real backend audit

The current `Backend/app.py` exposes customer routes such as:

```text
/catalog/*
/search
/auth/*
/cart/*
/account/*
/checkout/*
```

It does **not** yet expose:

```text
/merchant/*
/admin/*
/cms/*
/catalogue-admin/*
/promotions/*
/media/*
/payments/*
/payouts/*
```

Therefore the next backend work is not merely UI polishing. The real API needs to be expanded before the Merchant and Admin UIs can be connected to Neon.

The existing merchant/admin API clients already define a useful contract. Those route families can be implemented against the real database instead of rewriting the frontends.

---

## Build and validation status

The Merchant and Admin source trees are present, but a clean production build could not run in the current sandbox because their local dependencies are not installed:

```text
merchant: next: not found
admin: next: not found
```

This is an environment/dependency state, not proof of a TypeScript failure. Before modifying those apps further, run:

```bash
cd WebPhase/merchant && npm install && npm run build
cd ../admin && npm install && npm run build
```

The customer frontend has a separate installed dependency tree from the earlier work.

---

## What is unnecessary or should be deferred

The following should not be prioritized before product and order operations are real:

- Full visual Store Design engine
- AI Design Assistant
- Custom domains and SSL automation
- Merchant template marketplace
- Advanced marketing automation
- Seller subscription billing
- Multi-location inventory
- Advanced tax automation
- Complex recommendations
- Full payout automation

These can remain visible as Coming Soon or planned capabilities.

The following should **not** be removed from the roadmap because they are operationally essential:

- Product media
- Product variants
- Inventory
- Orders
- Fulfillment
- Payments and refunds
- Payout ledger
- Categories and collections
- Admin CMS
- Permissions and audit logs
- Search and Explore
- Flash-sale data model

---

## Priority order

### Priority 0 — Connect the existing frontends to the real backend

Build and test:

1. Admin login/session/permissions
2. Merchant login/session/permissions
3. Merchant dashboard API
4. Admin overview API
5. Neon database migrations
6. Role and permission enforcement
7. Production environment configuration

Until this is done, the Merchant and Admin UI should be considered demos.

### Priority 1 — Product operations

1. Product database model
2. Product images and Cloudinary upload
3. Variants and variant SKUs
4. Category assignment
5. Collections
6. Pricing and compare-at price
7. Stock and reserved stock
8. Draft/published/archived states
9. Admin Ferixas product upload
10. Merchant seller product upload
11. Sales channel controls
12. Product preview

### Priority 2 — Orders and inventory

1. Shared inventory reservations
2. Merchant order queue
3. Admin order oversight
4. Fulfillment status
5. Carrier and tracking
6. Refund state
7. Multi-seller order splitting
8. Customer and merchant order views

### Priority 3 — Money and records

1. Payment provider integration
2. Payment transaction records
3. Refunds and chargebacks
4. Commission calculation
5. Merchant ledger
6. Payout records
7. Settlement reports
8. Admin financial permissions

### Priority 4 — Platform CMS

1. Homepage content records
2. Banners and video metadata
3. Category management
4. Collections
5. Homepage section ordering
6. Cloudinary media library
7. Draft/preview/publish
8. Version history
9. Audit logs
10. Marketplace merchandising

### Priority 5 — Discovery and promotions

1. Explore page data
2. Search improvements
3. Featured content
4. Flash-sale campaigns
5. Sale badges and countdowns
6. Campaign quantity limits
7. Promotion reporting

### Priority 6 — Store Design

Leave visible as **Coming Soon** until the previous priorities are stable.

---

## Final recommendation

The existing UI is not worthless and should not be thrown away. It provides a good first pass at the operating surfaces. But its current status should be described accurately:

> **Merchant and Admin frontends are designed shells with mock API contracts. The real operational backend still needs to be implemented.**

The immediate focus should be:

```text
Real backend connection
→ Product upload
→ Media and variants
→ Inventory
→ Orders and fulfillment
→ Payments and records
→ Admin CMS
→ Flash sales and Explore
→ Store Design later
```

The platform CMS should live in Admin. Ferixas-owned products should be uploaded through Admin and owned by the special Ferixas Official merchant record. Seller products should be uploaded through Merchant. Store Design should remain a visible Coming Soon feature until the commerce engine is reliable.

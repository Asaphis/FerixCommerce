# FERIXAS COMMERCE — COMPLETE PROJECT CONCEPT & FUNCTIONAL SPECIFICATION

---

## 1. Project Concept

Ferixas Commerce is a complete commerce ecosystem that allows businesses to create and operate their own online stores while also giving them the option to sell their products through a centralized Ferixas marketplace.

It combines three things into one platform:

### A. Merchant Commerce Platform

Businesses can create an online store and manage their entire business from one place:

- **Products** — create, edit, organize, variants, SKUs, pricing, discounts
- **Inventory** — stock tracking, low-stock warnings, adjustments
- **Orders** — processing, fulfillment, tracking, multi-channel visibility
- **Customers** — customer list, profiles, order history, segmentation, notes
- **Payments** — payment processing, refunds, failed transactions
- **Promotions** — discounts, campaigns, featured products
- **Analytics** — revenue, traffic, conversion, best-selling products
- **Store design** — visual storefront builder (Design Engine)
- **Domains** — branded URLs (e.g., `abcelectronics.com` or `abc.ferixas.com`)
- **Staff** — team members, roles, permissions
- **Finances** — balance, fees, commissions, payouts, transaction ledger

### B. Ferixas Marketplace

Ferixas operates a centralized marketplace where customers can discover products from multiple merchants.

Customers can:

- Search products
- Browse categories
- Discover stores
- Compare products
- Add products to cart
- Checkout
- Track orders
- Review products
- Follow stores

### C. Ferixas Store Design Engine

Merchants get a visual website/store builder that allows them to design their storefront without needing to manually code the entire website.

The merchant can visually modify:

- Layout (sections, grids, flex)
- Typography (font, size, weight, line height, spacing, alignment)
- Colors and appearance (backgrounds, gradients, borders, shadows)
- Images and banners
- Buttons and interactive elements
- Navigation and menus
- Mobile layouts and responsive behavior

**AI Design Assistant** — merchants can talk to an AI to improve their store (e.g., "Make the homepage look more premium", "Improve the mobile layout"). The AI proposes changes; the merchant previews, applies, rejects, or revises them.

---

## 2. The Main Problem Ferixas Commerce Solves

Many businesses that want to sell online have to combine multiple systems:

| Need | Typical Separate Tool |
|---|---|
| Building their website | Wix / Squarespace |
| Managing products | Shopify / custom CMS |
| Payments | Stripe / PayPal |
| Analytics | Google Analytics |
| Marketplace reach | Amazon / Etsy |
| Store design | Framer / Webflow |
| Marketing | Mailchimp / Klaviyo |

**Ferixas Commerce brings these functions into one ecosystem.**

But there is an additional problem: **A merchant's own website and a marketplace normally operate separately.** Merchants have to create duplicate product catalogs and manage two separate storefronts.

**Ferixas solves this** by allowing a merchant to have:

- Their own store **and** access to the Ferixas marketplace **using the same product catalog**.

For example:

> ABC Electronics creates `abc.ferixas.com`.

They add 500 products.

They can choose per-product which sales channels are active:

| Product | My Store | Ferixas Marketplace |
|---|---|---|
| Product A | ✅ | ✅ |
| Product B | ✅ | ❌ |
| Product C | ❌ | ✅ |

The merchant does not need to create duplicate products.

---

## 3. The Fundamental Concept

> **One commerce system, multiple storefronts and sales channels.**

A merchant has **one central catalog**. That catalog can feed:

```
MERCHANT
   ↓
ONE PRODUCT CATALOG
   ↓
 ┌─────────────────────┬─────────────────────┬─────────────────────┐
 │                     │                     │                     │
 ▼                     ▼                     ▼
 OWN STORE        FERIXAS MARKETPLACE   FUTURE CHANNELS
```

This is the foundation of the platform:

1. **Single source of truth** — product data, inventory, pricing
2. **Channel control** — merchants choose where each product sells
3. **Synced state** — changes to a product propagate to all chosen channels
4. **Unified management** — orders from all channels appear in one place

---

## 4. Who Ferixas Commerce Serves

There are three primary groups.

### 4.1 Customers

People who want to purchase products online.

They get:

- Marketplace (centralized product discovery across all merchants)
- Merchant stores (individual branded storefronts)
- Search and filtering
- Product discovery (categories, collections, recommendations)
- Cart and checkout
- Order tracking
- Wishlist
- Reviews and ratings
- Customer account (profile, addresses, settings)
- Store following

### 4.2 Merchants

Businesses and individuals who want to sell products online.

They get:

- Online store (branded storefront with custom domain)
- Product management (catalog, variants, SKUs, pricing)
- Inventory management (stock tracking, low-stock alerts)
- Order management (processing, fulfillment, multi-channel)
- Customer management (list, profiles, segmentation, notes)
- Marketplace access (selective channel distribution)
- Store design tools (visual Design Engine with responsive editing)
- AI assistance (natural-language store redesign)
- Analytics (revenue, traffic, conversion, performance)
- Marketing (promotions, campaigns, featured listings)
- Payment management (processing, refunds, payouts)
- Domain management (custom domains, SSL)
- Business finances (ledger, fees, commissions, balance)

### 4.3 Ferixas Platform Administrators

The Ferixas team manages the entire ecosystem.

They get:

- Platform dashboard (high-level business metrics)
- Merchant management (onboarding, approval, suspension)
- Customer management (account status, platform-level issues)
- Marketplace management (categories, collections, featured content)
- Product management (visibility, moderation)
- Order management (disputes, cross-merchant orders)
- Payment management (transactions, fees, refunds, payouts)
- Commission management (platform fees, marketplace cut)
- Store management (store verification, domain handling)
- Promotions management (platform-wide campaigns)
- Reports and analytics (revenue, growth, trends)
- Settings (currency, taxes, security, permissions, integrations)
- Subscriptions (merchant plans, billing status)

---

## 5. What a Customer Gets

A customer doesn't need to understand the merchant infrastructure. They simply experience Ferixas as a commerce platform.

### Customer Journey

1. **Browse or search** — find products via marketplace or direct store URL
2. **Open a product** — view details, images, variants, price, reviews
3. **See the merchant** — identify who sells it, visit their store
4. **Add to cart** — collect items from multiple merchants in one cart
5. **Continue shopping** — return to browsing from any entry point
6. **Checkout** — single checkout, internally split by merchant
7. **Receive order** — merchant ships (platform notifies customer)
8. **Track order** — view delivery status from customer account
9. **Review purchase** — rate and review products and stores
10. **Manage account** — profile, saved addresses, payment methods, settings

A customer can enter the **Ferixas Marketplace** OR visit an **individual merchant store directly** (e.g., `abcelectronics.com`). Both paths lead to the same commerce experience.

---

## 6. What a Merchant Gets

A merchant effectively gets a complete **digital commerce business system**.

```
MERCHANT DASHBOARD
       │ manages
       ↓
ONE PRODUCT CATALOG + SETTINGS
       │ feeds
       ├───────────────────┐
       ▼                   ▼
  MERCHANT STORE     FERIXAS MARKETPLACE
  (own storefront)   (centralized discovery)
       │
       ▼ visited by
  CUSTOMER
```

They receive:

| Component | Description |
|---|---|
| **Store** | Their own branded storefront — `abc.ferixas.com` or custom domain |
| **Business management** | Products, inventory, orders, customers, staff, finances — all in one place |
| **Marketplace distribution** | Select which products appear on Ferixas Marketplace via sales channel toggles |
| **Store builder** | Visual Design Engine to build and customize their storefront |
| **AI assistance** | Ask the AI to help improve the store design with natural language |
| **Analytics** | See revenue, traffic, conversion, and performance across all channels |

---

## 7. The Three Major Interfaces

After removing the unnecessary separate customer application, the platform has three major application interfaces:

```
FERIXAS COMMERCE
│
├── MARKETPLACE    (customer-facing: public shopping + customer account)
├── MERCHANT       (merchant's private business operating system)
└── ADMIN          (platform control center)
```

- **The customer experience belongs inside Marketplace** — public shopping and account management combined.
- **The merchant storefront is also part of the customer-facing commerce experience**, although merchants manage it from the Merchant interface.

---

## 8. MARKETPLACE INTERFACE

The Marketplace is the main **customer-facing** interface. It contains both public shopping and customer account functionality.

A visitor can use it **without an account**:

> Browse → Search → Product → Store → Cart → Checkout

Then they can create/login to an account and the **same Marketplace application** becomes their personal shopping area:

> Account → Orders → Wishlist → Addresses → Reviews → Settings

### Marketplace Page Groups (12 major areas)

| # | Page Group | Purpose |
|---|---|---|
| 1 | **Home** | Marketplace homepage with search, featured products, stores, collections |
| 2 | **Search** | Full marketplace search with filters, sorting, suggestions |
| 3 | **Category** | Category browsing: subcategories, products, filters |
| 4 | **Product** | Product detail page: images, variants, price, reviews, add to cart |
| 5 | **Store Discovery** | Browse and discover merchant stores |
| 6 | **Merchant Storefront** | Individual merchant's public store (`abc.ferixas.com`) |
| 7 | **Cart** | Multi-merchant cart with grouped items |
| 8 | **Checkout** | Checkout flow: address, shipping, payment, order summary, confirmation |
| 9 | **Order Confirmation** | Post-checkout confirmation with order details |
| 10 | **Customer Account** | Account dashboard with all personal sections |
| 11 | **Customer Orders** | Order history, tracking, details |
| 12 | **Customer Wishlist** | Saved products |

### Account Sections Within Customer Account

- Profile
- Orders
- Wishlist
- Addresses
- Reviews
- Settings

---

## 9. MERCHANT INTERFACE

The Merchant interface is the merchant's **private business operating system**. It is much more extensive than Marketplace.

```
MERCHANT
│
├── Dashboard          (business overview: revenue, orders, metrics)
├── Products           (create, edit, variants, pricing, sales channels)
├── Orders             (manage orders from all channels, fulfill, track)
├── Customers          (customer list, profiles, segmentation, notes)
├── Inventory          (stock levels, low-stock, adjustments, SKUs)
├── Analytics          (revenue, traffic, conversion, performance)
├── Finances           (balance, fees, commissions, payouts, ledger)
├── Store              (store settings, branding, navigation, pages, URL)
├── Design Engine      (visual storefront builder)
├── Marketing          (promotions, campaigns, featured products)
├── Domains            (custom domain management, SSL)
└── Settings           (account, billing, team, notifications, security)
```

---

## 10. Merchant Dashboard

The dashboard is the merchant's business overview.

It should show:

- **Revenue** — total, today, this week, this month
- **Orders** — total, pending, processing, shipped, delivered
- **Products** — total, published, draft, low-stock
- **Customers** — total, new this period
- **Visitors** — store traffic, marketplace traffic
- **Conversion information** — store conversion rate, marketplace conversion rate
- **Sales by channel** — store sales vs marketplace sales
- **Inventory warnings** — low-stock items
- **Recent orders** — latest order activity
- **Recent activity** — recent product updates, customer actions
- **Sales charts** — revenue over time, orders over time

The merchant should immediately understand what is happening with their business at a glance.

---

## 11. Products (Merchant)

Product management is one of the core areas.

A merchant can:

- Create product
- Edit product
- Delete product
- Duplicate product
- Archive product
- Publish / unpublish product
- Manage images and videos
- Manage variants (size, color, etc.)
- Manage SKU
- Set price and discount
- Manage inventory
- Assign categories
- Assign collections
- Configure SEO (meta title, description, URL slug)
- **Choose sales channels** (per-product distribution)

### Sales Channel Controls

For every product:

```
Sales Channels
[x] My Store
[x] Ferixas Marketplace
[ ] Future Channel
```

This is one of the key concepts of Ferixas Commerce — one catalog, multiple distribution channels, per-product control.

---

## 12. Orders (Merchant)

Merchant can manage all orders from one place.

Orders can originate from:

- Their own store
- Ferixas Marketplace

The merchant can see:

- Order ID
- Customer
- Products
- Amount
- Channel (store or marketplace)
- Payment status
- Fulfillment status
- Date

They can open an order to see complete details and take fulfillment actions.

---

## 13. Customers (Merchant)

Merchant can see customers who have interacted with their business.

Features:

- Customer list (searchable, filterable, segmented)
- Customer profile (contact info, addresses)
- Order history
- Lifetime spending
- Customer notes
- Customer segmentation (tags, groups)
- Customer activity timeline

---

## 14. Inventory (Merchant)

Inventory management includes:

- Stock quantity per variant/SKU
- Low-stock warnings
- Out-of-stock product indicators
- Inventory adjustments (manual or via import)
- Reserved stock (allocated to pending orders)

---

## 15. Analytics (Merchant)

Merchant analytics can include:

- **Revenue** — total, by product, by channel, by time period
- **Orders** — count, value, conversion funnel
- **Customers** — new vs returning, retention, lifetime value
- **Products** — best-sellers, low-performing, inventory turnover
- **Store traffic** — visitors, page views, popular pages
- **Marketplace traffic** — impressions, clicks, conversions
- **Conversion** — store conversion rate, marketplace conversion rate
- **Sales by channel** — store vs marketplace revenue breakdown
- **Sales over time** — daily, weekly, monthly trends

---

## 16. Finances (Merchant)

Merchant finances should be built around proper ledger/transaction records.

Includes:

- **Balance** — available funds
- **Sales** — gross revenue, by channel
- **Fees** — platform fees, payment processing fees, marketplace commissions
- **Commissions** — Ferixas' cut from marketplace sales
- **Refunds** — issued refunds, their effect on balance
- **Payouts** — scheduled and completed payouts to the merchant's bank/PayPal
- **Transactions** — full ledger of all financial events
- **Financial history** — exportable records

> This should be implemented as a proper transaction/ledger system rather than simply adjusting a balance number.

---

## 17. Store Management (Merchant)

Controls the merchant's public storefront.

Merchant can manage:

- Store name
- Logo
- Brand colors
- Navigation menu (header, footer)
- Custom pages (About, Contact, FAQ, etc.)
- Store visibility (draft, live, password-protected)
- Marketplace participation (opt in/out of marketplace)
- Store URL (`abc.ferixas.com`)
- Custom domain connection

---

## 18. Design Engine (Merchant)

One of the biggest parts of the entire project.

The Design Engine is a visual storefront builder.

**Editor layout:**

```
┌─────────────────────────────────────────────────────────────────────────┐
│  HEADER: Save | Undo | Redo | Preview | Device | AI | History | Publish │
├────────────┬──────────────────────────────────┬────────────────────────┤
│            │                                  │                        │
│ LEFT PANEL │          CENTER CANVAS           │        RIGHT PANEL     │
│            │                                  │                        │
│ Layers /   │   Visual storefront canvas      │   Properties /         │
│ Sections / │   (editable, WYSIWYG)           │   Inspector            │
│ Structure  │                                  │                        │
│            │                                  │                        │
└────────────┴──────────────────────────────────┴────────────────────────┘
```

**Left panel:**

- Layers / sections / structure tree
- Element hierarchy browser

**Center:**

- Live visual preview of the store
- Click to select and edit elements

**Right panel:**

- Properties / inspector for selected element
- Shows all editable properties

**Header:**

- **Save** — save draft
- **Undo / Redo** — history navigation
- **Preview** — view as customer (non-editable)
- **Device** — toggle Desktop / Tablet / Mobile view
- **AI** — open AI Design Assistant chat
- **History** — version history panel
- **Publish** — go live

---

## 19. Design Engine Capabilities

The merchant can select any element and change:

### Typography

- Font family
- Font size
- Font weight
- Line height
- Letter spacing
- Text alignment
- Text color

### Layout

- Width
- Height
- Margin
- Padding
- Gap
- Flex properties
- Grid properties
- Position (static, relative, absolute, fixed)

### Appearance

- Background color
- Background image
- Gradient
- Border (style, width, color, radius)
- Box shadow
- Opacity
- Z-index
- Visibility

### Responsive

- Separate settings for Desktop, Tablet, and Mobile
- Each device view has its own property values
- Can toggle between views to fine-tune per-device

---

## 20. Commerce Components Inside Design Engine

The builder must understand commerce. It is not a generic website builder.

Available commerce components:

| Component | Purpose |
|---|---|
| **Product card** | Displays a single product (image, name, price, rating) |
| **Product grid** | Container that lays out product cards |
| **Product price** | Displays price with discount badge |
| **Product image** | Product image gallery/carousel |
| **Product rating** | Star rating display |
| **Add-to-cart button** | Adds product to cart |
| **Wishlist button** | Saves product to wishlist |
| **Product variants** | Selector for variant options (size, color) |
| **Collection** | Displays products from a collection |
| **Category** | Displays products from a category |
| **Cart summary** | Mini cart / cart total display |
| **Reviews** | Product reviews list and rating summary |
| **Promotional banner** | Banner for sales, promotions, announcements |
| **Trust section** | Displays trust badges (shipping, returns, security) |

---

## 21. AI Design Assistant

The merchant can talk to an AI about their store using natural language.

Examples of merchant requests:

> "Make the homepage look more premium."

> "Make the product cards smaller."

> "Improve the mobile layout."

> "Move the product section closer to the hero."

> "Create a luxury fashion store layout."

> "Change the color scheme to match my brand colors."

The AI proposes changes to the store design. The merchant can:

- **Preview** the AI's proposed changes side-by-side
- **Apply** the changes to the draft
- **Reject** the changes entirely
- **Revise** — ask the AI to adjust and try again
- **Undo** — revert applied AI changes

The AI should **never directly modify or publish** the live store without merchant approval.

---

## 22. Templates

Merchants can start from professionally designed templates.

Potential categories:

- Fashion & apparel
- Electronics & gadgets
- Beauty & cosmetics
- Furniture & home
- Restaurant & food
- Grocery & essentials
- Luxury goods
- Sports & outdoors
- Digital products
- General retail
- B2B wholesale
- Art & crafts

Templates can then be fully customized using the Design Engine.

---

## 23. Versioning

The Design Engine needs robust versioning to protect merchants from data loss:

- **Draft** — unsaved working state
- **Save** — explicitly save changes as a draft version
- **Preview** — view the draft as customers would see it
- **Version history** — list of all saved/published versions with timestamps
- **Undo / Redo** — fine-grained within a session
- **Revert** — roll back to a previous version
- **Publish** — make the draft live (creates a new published version)

---

## 24. Domains

Merchants can use:

- `merchant.ferixas.com` (free subdomain on Ferixas)
- Custom domain: `merchant.com` (connected via DNS, SSL provided by Ferixas)

The prototype can simulate domain assignment and connection. Full DNS/SSL provisioning comes in production.

---

## 25. Marketing (Merchant)

Merchant marketing can eventually include:

- **Promotions** — discount codes, automated discounts
- **Campaigns** — scheduled marketing campaigns
- **Featured products** — highlight products on their own store
- **Store sharing** — share the store link on social media
- **Product sharing** — share individual product links
- **Collection sharing** — share collection pages
- **Marketplace promotion** — pay to feature products on the Ferixas Marketplace

---

## 26. ADMIN INTERFACE

The Admin interface controls the entire Ferixas Commerce ecosystem.

It is **not** a merchant dashboard. It is the platform control center.

```
ADMIN
│
├── Dashboard          (platform-wide metrics)
├── Merchants          (merchant management)
├── Customers          (customer management)
├── Products           (product moderation)
├── Orders             (order oversight)
├── Payments           (transaction monitoring)
├── Payouts            (payout management)
├── Marketplace        (marketplace configuration)
├── Stores             (store verification)
├── Domains            (domain management)
├── Commissions        (fee configuration)
├── Promotions         (platform campaigns)
├── Subscriptions      (merchant plans)
├── Reports            (platform analytics)
└── Settings           (system configuration)
```

---

## 27. Admin Dashboard

Platform-wide overview showing:

- Total merchants (active, new this period)
- Total customers
- Total orders (today, this week, this month)
- Marketplace sales volume
- Gross merchandise value (GMV)
- Platform revenue (fees, commissions)
- Active stores
- New merchant registrations
- Transaction volume
- Failed transactions
- System activity (recent events, alerts)

---

## 28. Merchant Management (Admin)

Admin can:

- View merchant list (search, filter, sort)
- Approve / reject new merchant applications
- Suspend / reactivate merchants
- View merchant details (business info, contact)
- View merchant stores
- View merchant products
- View merchant orders
- View financial activity (revenue share, payouts)
- Communicate with merchants (messages/notes)

---

## 29. Customer Management (Admin)

Admin can:

- View customer list (across all stores and marketplace)
- Search customers
- View account information
- View order history
- Manage account status (active, suspended)
- Handle platform-level issues (disputes, chargebacks)

---

## 30. Marketplace Management (Admin)

Admin controls the entire marketplace structure:

- **Categories** — create, edit, reorder, delete
- **Collections** — create curated product collections
- **Featured products** — select which products appear on homepage/sections
- **Featured stores** — select which stores to promote
- **Marketplace promotions** — configure sales, campaigns
- **Marketplace content** — homepage banners, content sections
- **Product visibility** — moderate or hide products

---

## 31. Payments and Payouts (Admin)

Admin can monitor the entire financial flow:

- **Payments** — all payment transactions
- **Transactions** — detailed ledger
- **Fees** — payment processing fees, platform fees
- **Merchant payouts** — scheduled, pending, completed payouts
- **Refunds** — processed refunds
- **Failed transactions** — payment failures requiring attention
- **Platform commissions** — marketplace cut from sales

---

## 32. Commissions (Admin)

Ferixas can earn through multiple revenue models:

- **Marketplace commissions** — percentage of marketplace sales
- **Merchant subscriptions** — monthly/yearly plans for store features
- **Payment/service fees** — per-transaction processing fees
- **Promotions** — paid featured listings
- **Other commerce services** — premium themes, apps, integrations

The admin can:

- Configure commission rates
- Set up subscription plans
- Adjust fee structures
- Monitor revenue from each stream
- Generate commission reports

---

## 33. Subscriptions (Admin)

If Ferixas introduces merchant plans (which it should), admin can manage:

- **Plans** — create, edit, delete subscription tiers
- **Features** — assign features to each plan (e.g., "custom domain", "more templates")
- **Pricing** — set monthly and yearly pricing
- **Merchant subscriptions** — which merchants are on which plan
- **Usage** — track plan usage (product count, bandwidth, etc.)
- **Billing status** — check if merchants are paid up

---

## 34. Reports (Admin)

Platform-wide reports covering:

- **Sales** — GMV, revenue, trends over time
- **Merchants** — growth, churn, performance
- **Customers** — acquisition, retention, segments
- **Products** — top products, categories performance
- **Orders** — volume, fulfillment rates, dispute rates
- **Payments** — success rates, failure rates, volume
- **Marketplace activity** — traffic, engagement, conversion
- **Revenue** — platform income from all streams

---

## 35. Settings (Admin)

Platform configuration:

- **General settings** — platform name, logo, contact info
- **Marketplace settings** — marketplace policies, terms
- **Payment settings** — payment providers, currencies
- **Currency** — supported currencies, base currency, exchange rates
- **Countries** — supported countries, restricted countries
- **Tax** — tax rules, VAT, sales tax configuration
- **Shipping** — shipping zones, rates (for marketplace)
- **Notifications** — email/SMS settings, templates
- **Integrations** — third-party app connections
- **Security** — password policies, 2FA, session management
- **Permissions** — role-based access control

---

## 36. Merchant Storefront vs Merchant Dashboard

This distinction is extremely important and must be clear.

### Private Merchant Interface (Dashboard)

The merchant **manages** the business:

```
MERCHANT DASHBOARD
  → Products
  → Orders
  → Inventory
  → Customers
  → Analytics
  → Finances
  → Design Engine
  → Settings
  etc.
```

### Public Storefront (Merchant Store)

Customers **see** the merchant's store:

```
abc.ferixas.com
  → Homepage
  → Product pages
  → Collections
  → Cart
  → Checkout
  etc.
```

The merchant uses the **Design Engine** (inside the Merchant dashboard) to control the public storefront.

```
MERCHANT DASHBOARD
       │
       │ manages (via Design Engine)
       ↓
DESIGN ENGINE
       │
       │ publishes
       ↓
MERCHANT STORE
       │
       │ visited by
       ↓
CUSTOMER
```

---

## 37. How Everything Connects

```
                    FERIXAS COMMERCE
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ↓                     ↓                     ↓
  MARKETPLACE              MERCHANT              ADMIN
        │                     │
  (Customers)          (Merchants)            (Platform team)
        │                     │
        │                     ↓
        │            DESIGN ENGINE
        │                     │
        │                     ↓
        │          MERCHANT STORE
        │                     │
        │                     ↓
        │              (visited by)
        │                     │
        └─────────────────────┘
                (Customer)
```

The overall product flow:

1. **Admin** configures the platform (categories, payment providers, policies)
2. **Merchants** sign up, create product catalogs, build stores, publish
3. **Customers** discover products on the Marketplace or via merchant stores
4. **Customers** add to cart, checkout, receive orders
5. **Merchants** fulfill orders, manage inventory, serve customers
6. **Platform** collects fees/commissions, pays out merchants, provides analytics

---

## 38. Approximate Page Count

For the initial product definition:

### Marketplace / Customer-facing

12 major page groups, with multiple sub-pages/states:

1. Home
2. Search
3. Category
4. Product
5. Store discovery
6. Merchant storefront
7. Cart
8. Checkout (3+ steps: shipping, payment, review)
9. Order confirmation
10. Customer account (dashboard)
11. Customer account → Orders
12. Customer account → Wishlist

Plus sub-pages for addresses, reviews, settings, order tracking.

### Merchant

12 major areas, with multiple pages inside each:

1. Dashboard
2. Products (list, create/edit, variants, media)
3. Orders (list, detail, fulfillment)
4. Customers (list, profile, segmentation)
5. Inventory (list, adjustments)
6. Analytics (dashboard, reports)
7. Finances (dashboard, transactions, payouts)
8. Store (settings, pages, navigation, visibility)
9. Design Engine (editor workspace)
10. Marketing (promotions, campaigns)
11. Domains (management)
12. Settings (account, team, notifications)

### Admin

14 major areas, with multiple management pages:

1. Dashboard
2. Merchants
3. Customers
4. Products
5. Orders
6. Payments
7. Payouts
8. Marketplace
9. Stores
10. Domains
11. Commissions
12. Promotions
13. Subscriptions
14. Reports + Settings

### Design Engine

A major application workspace rather than a normal collection of pages:

- Editor canvas
- Layer/section panel
- Properties/inspector panel
- AI assistant panel
- Version history panel
- Device preview toggles

> This is not a 20-page website. It is a large multi-interface commerce application.

---

## 39. Frontend Folder Organization

For the frontend, the conceptual structure follows the three interfaces:

```
ferixas-commerce/
│
├── marketplace/
│   ├── public/
│   │   ├── home
│   │   ├── search
│   │   ├── categories
│   │   ├── products
│   │   ├── stores
│   │   └── collections
│   ├── account/
│   │   ├── profile
│   │   ├── orders
│   │   ├── wishlist
│   │   ├── addresses
│   │   ├── reviews
│   │   └── settings
│   ├── shopping/
│   │   ├── cart
│   │   ├── checkout
│   │   └── order-confirmation
│   └── merchant-storefront/
│       ├── store-home
│       ├── products
│       ├── collections
│       └── pages
│
├── merchant/
│   ├── dashboard/
│   ├── products/
│   ├── orders/
│   ├── customers/
│   ├── inventory/
│   ├── analytics/
│   ├── finances/
│   ├── store/
│   ├── design-engine/
│   ├── marketing/
│   ├── domains/
│   └── settings/
│
├── admin/
│   ├── dashboard/
│   ├── merchants/
│   ├── customers/
│   ├── products/
│   ├── orders/
│   ├── payments/
│   ├── payouts/
│   ├── marketplace/
│   ├── stores/
│   ├── domains/
│   ├── commissions/
│   ├── promotions/
│   ├── subscriptions/
│   ├── reports/
│   └── settings/
│
└── shared/
    ├── components/
    ├── hooks/
    ├── lib/
    ├── types/
    └── styles/
```

The important principle:

> **Every folder should correspond to an actual product responsibility.**
> Do not create meaningless folders just to make the project look large.

Shared components (UI primitives, hooks, utilities, types, global styles) live under `shared/` and are used across all three interfaces.

---

## 40. What the First Prototype Should Demonstrate

For the prototype, we don't need to implement every production capability.

The prototype should prove these things:

### Customer (Marketplace)

Can I:

> Discover → Search → Product → Store → Cart → Checkout → Account → Orders?

Key screens: Home, Search, Category, Product, Store, Cart, Checkout, Order Confirmation, Account Dashboard, Account Orders.

### Merchant

Can I:

> Create product → Choose sales channels → Manage store → Manage orders → View business → Design store?

Key screens: Dashboard, Products (list + create/edit), Orders (list + detail), Analytics, Store settings, Design Engine.

### Design Engine

Can I:

> Select element → Change property → See visual change → Ask AI → Preview → Save → Publish?

Key capabilities: Element selection, properties panel, live canvas, AI assistant, version history, preview, publish.

### Admin

Can I:

> See platform → Manage merchants → Manage products → Manage orders → Manage marketplace → Manage financial activity?

Key screens: Dashboard, Merchants, Products, Orders, Payments/Payouts, Marketplace settings, Reports.

If those four experiences work convincingly, we have a strong frontend prototype.

---

## 41. What Is Prototype vs Production Functionality

| Area | Prototype | Production |
|---|---|---|
| Auth | Mocked / simulated login per role | Real OAuth2 / session / RBAC |
| Data | In-memory / seed JSON / mock API | Real backend + database |
| Payments | Simulated checkout + fake confirmation | Live payment gateway (Stripe, etc.) |
| Design Engine | Property editing + preview + AI-simulated changes | Real element tree, serialization, publishing |
| Domains | Simulated assignment | Real DNS + SSL provisioning |
| Analytics | Static mock charts | Real events pipeline + dashboards |
| Search | In-memory filtering | Search service (e.g. Meilisearch/Algolia) |
| Marketplace | Curated static data | Live product indexing across merchants |
| Admin | Simulated platform state | Real admin service with audit logs |
| AI Design Assistant | Prompt → mock edits (preview only) | LLM integration that emits concrete edit ops |

---

## 42. The Actual Vision

The long-term vision is not simply:

> "A website builder."

And it is not simply:

> "A marketplace."

And it is not simply:

> "A Shopify alternative."

The concept is:

> **Ferixas Commerce is a commerce infrastructure and marketplace ecosystem where businesses can operate independent branded stores, manage their complete commerce operations, use a powerful visual/AI Design Engine to build their storefronts, and optionally distribute their products through the shared Ferixas marketplace.**

That is the central idea everything else should follow.

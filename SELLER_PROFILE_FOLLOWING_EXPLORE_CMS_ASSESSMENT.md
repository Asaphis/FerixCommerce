# FerixCommerce — Seller Profiles, Following, Explore & CMS Assessment

**Prepared:** 2026-10-09
**Repository:** `Asaphis/FerixCommerce`
**Audited revision:** `2ab80f5` (`main`)
**Working-tree note:** there are already substantial **uncommitted** backend and UI changes from the earlier “Apply it all” request, plus its audit report and tests. I inspected the current working-tree code as well as the committed baseline. **No application code was changed for this assessment.** This is a diagnosis and proposal, not authorization to implement the new scope.

## 1. My understanding of what you want

There are two different seller experiences and they must not be mixed up:

1. **A seller’s Ferixas marketplace profile/store page** is part of your platform. It should present a clear public-facing identity, show that seller’s approved products that are assigned to sell on the marketplace, and provide a one-way Follow action. The seller may opt out of marketplace selling; their listings/profile should then not be presented as marketplace inventory.
2. **A seller’s own website** is a separate future site they may design/control. It should not be implied that the current marketplace seller page is already that website. Until the site builder or a verified external website URL exists, the profile should show an honest **“Seller website coming soon”** placeholder (or a validated external link once that functionality is deliberately enabled).

The seller should have a private account/dashboard to manage their own profile proposal, products, review status, and real follower total. Seller changes to public-facing profile fields should preferably be submitted as a **profile update request** for admin review rather than going live immediately. Admin should own verification, moderation, marketplace eligibility, and acceptance/rejection of proposed profile changes. Neither users nor sellers “follow back”: shoppers follow sellers, can unfollow, and must be authenticated to do so.

You also want a functional explore/catalog experience: category, brand, price and other filters should produce the matching products; category and brand links should be slug-based, shareable dynamic pages; and seller product upload should assign the platform-managed category/brand needed by those pages.

Finally, CMS changes must not silently lose settings. “Save draft” must really be a draft, “Publish” must be the one intentional live transition, and saving one section must preserve every other section and all the selected section’s specialized settings.

## 2. Current state and what already works

### Seller page and profile fields

- `/catalog/store?slug=...` returns products owned by that merchant only, and in the current working tree those products are filtered by the shared public-sellability check. This separation from platform-owned products is the right foundation.
- The public page shows the seller name, verified badge, tagline, location, rating/review count, public product count, trading-since date, About text, follower number, and that seller’s product grid.
- The API response includes `website` and `payment_methods`, and a public serializer allowlists some profile fields, but the current shopper page does not render an external seller website/contact block. The store header currently prints `customDomain`/`domain`, which is the Ferixas storefront address—not necessarily a seller-owned external website. Merchant settings call branded-domain connection “coming soon.” There is no clear seller-controlled external website field/workflow in the current merchant UI.
- Admin merchant detail currently edits store name, location, tagline, About, commission, plan, and marketplace enablement. Seller settings can also change name/tagline/About/location and marketplace enablement. Those edits go straight to persistence; there is no profile review queue or pending/approved profile version yet. Commission and plan are administrative business fields and must remain private, not part of the public seller card.
- The seller workspace currently does **not** show a follower KPI or a profile-update review state.

### Following

- The backend follow/unfollow endpoints require an authenticated shopper (`require_user`), and following is one-way. Follow/unfollow controls exist on the seller page. The server action sends logged-out users to `/login?return=/store/<slug>`.
- The flow is incomplete in two concrete ways:
  - The backend stores canonical **merchant IDs** in `account.follows`, but `/account/following` compares those values to **store slugs**. With ordinary IDs and slugs, the followed-store list will be empty even when follow records exist (`Backend/app.py` account response; `WebPhase/marketplace/app/account/following/page.tsx` comparison).
  - The login/register action supports a safe return parameter, but the login page and `AuthForm` do not include the `return` query in submitted form data. A guest is sent to login, but after login/register the follow intent/store return is lost and they go to the normal account destination.
- The shopper following page shows store cards, but has no direct unfollow action; shoppers have to revisit a seller page to unfollow.
- Follower totals have mixed sources. Seed data includes large preset `followers` values. Follow endpoints increment/decrement `Catalog.follower_count`, but the seller page’s `stats.followers` is populated from `merchant.followers`, while the public store-card serializer may use the catalog counter if a row exists and the preset merchant field otherwise. This can display a count that does not correspond to actual shopper relationships or differs between surfaces. A seller should see a count derived from real follow relationships, not the presentation seed number.

### Explore, brands, categories, products and routes

- Backend `/catalog/products` already accepts category, brand, store, price, rating, stock, sale, sorting, and paging filters. The backend can filter by brand.
- Explore’s present filter state/UI wires category, store, price, rating, in-stock and on-sale; it does **not** put `brand` into its filter object or provide a brand filter group. Therefore the API’s backend brand capability is not exposed as a working Explore filter.
- The dynamic brand route `/brands/[slug]` sends `query={{ brand: slug }}`, but `CatalogListing` ignores `brand` when building the actual API filters. It renders a brand heading while loading the general listing, not reliably that brand’s products. This is a direct functional defect, not just a missing visual treatment.
- Category pages are further along: they resolve a category slug, lock that category into the listing query, and the API filters the product rows by the category slug. Category names, visibility and links are CMS/catalog managed.
- Current seller upload changes in the working tree load admin-managed categories and brands and send brand/category fields. That is the right source of truth; however, historical products may still have `brandId` without `brandSlug`, while public brand URLs use slugs. The backend and UI need one canonical mapping (prefer brand ID internally and stable slug in the URL, resolved to the ID before filtering).
- Price bucket labels and comparisons should be checked together: the current bounds are inclusive on both ends, so a boundary price (for example exactly $50 or $150) can fall into two named bands or conflict with a label such as “Under $50.”

### CMS and the reported settings wipeout

There are **two CMS editing paths for the same family of page documents**, with different save semantics:

1. The Admin `/cms/homepage` screen uses `saveHomepageAction` → `PATCH /cms/document`. That legacy action reconstructs every section from a limited set of fields (`id`, type, title, subtitle, CTA, position, visibility). It does not preserve section-specific settings such as category-grid `layout`, `across`, `rowsPerSet`, `limit`, `seeAll`, or other custom fields. The homepage renderer actually uses those properties. Saving the page through this route can therefore erase specialized configuration even when the operator only meant to change a title/visibility setting.
2. That same `/cms/document` handler writes directly to `ContentDocument.data`; it creates a version record, but it does not hold the new data as an isolated draft. If the document is already `published`, shoppers can see the edit on Save before the operator presses Publish. This contradicts the Admin screen’s “Save draft” text.
3. A newer `/cms/pages/...` editor uses `/cms/page` and `ContentVersion` draft/publish behavior, which does keep a draft apart until Publish. Both routes can refer to the same underlying page, so editing in one and then saving/publishing in the other can make the apparent version/state confusing or overwrite a prior expectation.
4. `/cms/categories` is a separate catalogue-category record editor, not the same thing as the homepage’s `category_grid` section configuration. Its save action sends the individual category fields and booleans; the backend updates the category record directly. It is intended to be immediate and does not have a Publish button. The current issue most strongly matches the **homepage section serializer and overlapping CMS draft paths**, but your exact screen/button sequence should be captured during the eventual fix so we verify the right workflow.

This explains how an edit can appear on the frontend after Save, while a later edit/publish appears to revert or lose settings: Save is live in one editor, draft-based in another, and the legacy editor drops custom section properties when serializing.

## 3. Priority findings

| Priority | Finding | User impact |
|---|---|---|
| **P0** | Homepage Save draft writes directly to the published document and is not a true draft. | Operators can unintentionally change the live storefront before Publish; draft/history state is misleading. |
| **P0** | Homepage save action serializes only a subset of each section’s fields. | Category-grid/product-section layout, limit, count, and other custom settings can be wiped when saving a generic change. |
| **P1** | Follow list stores IDs but renders by comparing slugs. | A shopper’s followed sellers can disappear from their account page. |
| **P1** | Follow totals use seeded/fallback counts and inconsistent fields between routes. | Seller/public follower totals may be fake, stale, or inconsistent. |
| **P1** | Follow return path is not carried through the login/register form. | Guest is asked to sign in but is not returned to the seller/finish-follow flow. |
| **P1** | No follow/unfollow control on the following dashboard. | Shoppers cannot conveniently manage followed sellers from their account list. |
| **P1** | Brand filter is omitted from `CatalogListing`; brand dynamic page passes a value that is ignored. | Brand pages can show unrelated/all products; Explore cannot filter brands. |
| **P1** | Public profile and private seller website are not clearly separated; there is no website placeholder/action on the profile. | Shoppers may mistake a Ferixas domain for the seller’s own site; seller intent/choice is not represented. |
| **P1** | Seller profile edits are direct, with no review workflow; admin can also directly edit them. | Public-facing edits can go live without the approval process you prefer. |
| **P2** | Filter-boundary and brand ID/slug normalization need a single contract. | Boundary price results and older/inconsistently tagged products may not filter predictably. |
| **P2** | Dashboard lacks a real follower KPI/profile-review queue state. | Sellers cannot see the audience count or understand whether a profile edit is live/pending/rejected. |

## 4. Recommended product and data design

### A. Define the marketplace seller profile (public allowlist)

Recommended public fields:

- Display/store name and logo/cover image.
- Short tagline and About description.
- Location at the intended public granularity (avoid exposing private address/contact data).
- Ferixas verification badge, controlled by Admin.
- Marketplace follower count, computed from real follow relationships.
- Rating and review count only if tied to valid, persisted reviews; response/fulfilment rates only when computed by a defined, verified method and sample threshold.
- Approved, marketplace-enabled products owned by that seller; optionally public category chips computed from those products.
- A clearly labeled external seller website link only if a valid URL has been submitted and approved; otherwise **Seller website coming soon**. Keep Ferixas marketplace profile/store URL clearly separate.

Do not expose commission, plan, internal status, payout method, login email, seller-only settings, or private contact details in the public profile.

### B. Give sellers a safe profile request lifecycle

- Seller edits a private profile form and submits a `pending_review` snapshot (do not overwrite currently approved public fields).
- Seller sees current published profile plus pending changes, submission date, and admin feedback.
- Admin can approve the proposed version, request changes with a required note, or reject it; each decision is audited. Approval promotes the whole submitted snapshot atomically.
- Admin retains control of verification, account status, marketplace eligibility, moderation, commission/plan and other operational fields. Admin edits that affect public copy should either go through the same proposed-version flow or require an explicit audited “publish now” action.
- Seller marketplace opt-in is distinct from their external website. If they turn marketplace selling off, their products leave marketplace/store/filter results; their independent website builder remains a separate future product.

### C. Fix follows with one source of truth

- Persist follows as unique `(shopper_id, merchant_id)` relationship rows (or equivalently ensure a canonical consistent relation with uniqueness and transaction safety), rather than storing an ID array plus separately maintained, seed-contaminated counters.
- Derive follower count from the relationship table (or maintain a reconciled cache). Remove large fake seed totals or label them as demo-only and reset before production.
- Account API should return the seller records/IDs+slugs needed by the UI; the page must join by canonical merchant ID or resolved slug.
- Keep follow/unfollow authenticated, one-way, idempotent and available on seller page **and** followed-sellers dashboard. Logged-out follow sends user to Login/Register with a safe return path and resumes the action or returns them to the seller page.
- Add shopper `following` state and seller follower total from one canonical endpoint/response contract. A seller can see the aggregate number, not necessarily follower identities (identity visibility has not been requested).

### D. Complete Explore/category/brand routing

- Add brand to the shared `CatalogListing` filter model and filter panel; serialize brand slug in the URL and pass it as a query parameter to `/catalog/products`.
- Resolve brand slug to canonical brand ID/record, and ensure product `brandId`/`brandSlug` backfill is consistent. Avoid silently treating merchant IDs as brand IDs.
- Brand pages should validate the brand slug, use that canonical brand name/metadata, provide correct title/breadcrumbs, and return an empty state for a valid brand with zero products rather than all marketplace items.
- Keep category dynamic pages slug-based and ensure category filter is preserved through sorting, price filters and pagination. Define one consistent endpoint/query contract for `/category/:slug`, `/brands/:slug`, Explore, and product links.
- Add an explicit Brands group or search/select filter to Explore, and preserve selected brand/category/price/sort/page state in links and removable filter chips.
- Define non-overlapping price ranges and test boundary values.
- For each uploaded product, store canonical category and brand references and derive human-readable labels/slugs in API serialization. Keep category/brand choices admin-controlled.

### E. Unify CMS editing and protect section data

- Choose **one** CMS page save/publish API and migrate/retire the duplicate path. Every Save should create/replace the current draft version; shopper API should continue reading only the published document. Publish should atomically promote one draft and create an audit/version record.
- On section edit, load the latest draft (or published version if none) and patch only the changed section field while preserving every unedited section and every custom property. Do not reconstruct arbitrary sections from a fixed list of generic inputs.
- If the generic homepage editor cannot expose advanced category-grid settings, it must round-trip unknown fields untouched; ideally link to the detailed section editor to change `layout`, `across`, `rowsPerSet`, `limit`, and `seeAll`.
- Add version compare/restore and visible draft/live badges so an operator can tell which state they are editing.
- Keep `/cms/categories` (department metadata) behavior explicitly immediate or add its own draft/publish semantics consistently; label the behavior so it is not confused with homepage section configuration.

## 5. Acceptance tests before considering this complete

1. A guest clicks Follow → chooses Login or Register → is authenticated and returned to the seller page/following flow; a malicious external return URL is rejected.
2. Authenticated shopper follows/unfollows twice; relationship is idempotent, count changes exactly once, and persists after reload.
3. Followed-sellers page lists the correct seller with canonical IDs/slugs and supports unfollow in-place. Account/dashboard count matches that list.
4. Seller sees the real follower total; seller page, store cards, dashboard and follow API all return the same value. With zero relationships, count is zero—not a seeded marketing number.
5. Seller public-profile edit creates a pending version; public page remains unchanged until admin approval. Request-changes/reject/approve states and notes are visible and audited. Private fields never appear in public API response.
6. Seller profile lists only that seller’s approved, marketplace-enabled items; no products from another seller or platform inventory leak in. Seller opt-out removes them from the marketplace surfaces.
7. Brand Explore filter, brand page, category page, sorting, price bands and pagination return only products matching the canonical slug/ID and keep other selected filters.
8. CMS regression: save a category-grid layout/count/visibility draft, edit a separate field, save again, reload, and confirm all custom settings remain. Frontend stays on old published version until Publish. Publish updates the intended page once; restoring a version restores the full section configuration.
9. Test the category-record editor separately from the homepage category-grid editor so we do not mistake one for the other.

## 6. Suggested implementation sequence

1. **CMS data-loss/live-draft correction** first: unify the save contract and add a regression test reproducing the category-grid setting wipeout.
2. **Follow correctness** next: reconcile IDs/slugs and counts, fix the dashboard and return-after-login flow, and expose unfollow in the account list.
3. **Explore/brand filtering** next: wire brand filter state end-to-end and normalize product brand references; test category/brand routes and price boundaries.
4. **Seller profile governance** next: agree the public field allowlist, implement profile proposal versions/review, seller-facing profile/follow KPI, and the external website placeholder/link state.
5. Run backend integration tests, all three production builds, then authenticated and guest browser QA on desktop/mobile. Only after explicit review should the implementation be committed/deployed.

## 7. Decisions I need you to confirm before implementation

My best interpretation is: public profile edits should be staged for admin approval; seller website is a placeholder until a real URL/site feature exists; shoppers see a follower **count** but not a follower identity list; brand/category pages show products only when approved and marketplace-enabled; and CMS saves are drafts until an explicit Publish. Please tell me if any of those assumptions are wrong. The report is ready for review; I have not implemented this new scope.

import Link from "next/link";
import { ChevronDown, SlidersHorizontal, X } from "lucide-react";
import { assetUrl, getCataloguePage, listAdverts, listProducts, type Advert } from "@/lib/api";
import { savedIds } from "@/lib/data";
import { ProductGrid } from "@/components/ferix/cards";
import { AutoForm } from "@/components/ferix/add-to-cart";
import { EmptyState, Eyebrow, LinkButton } from "@/components/ferix/marks";
import { money } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * The product listing used by Browse, Category, Collection and Search.
 *
 * Layout rules that matter on a phone:
 * - Filters live behind a disclosure at the top of the grid instead of pushing
 *   the products below the fold, and the panel is rendered open on desktop.
 * - Active filters appear as removable chips so nobody has to open the panel to
 *   find out why the list is short.
 * - Sort stays a one-tap control next to the filters.
 */

export type Query = Record<string, string | string[] | undefined>;

/** Which document a base path builds from. Add a line here for a new listing. */
const PAGE_TYPES: Record<string, string> = {
  "/browse": "marketplace_explore",
  "/search": "marketplace_explore",
};

/** Splits the results so a promotion can sit after every group. */
function productChunks<T>(items: T[], size: number): T[][] {
  if (size <= 0) return [items];
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

const SORTS = [
  { id: "relevance", label: "Most relevant" },
  { id: "best", label: "Best selling" },
  { id: "new", label: "Newest" },
  { id: "price-asc", label: "Price: low to high" },
  { id: "price-desc", label: "Price: high to low" },
  { id: "rating", label: "Top rated" },
];

const PRICE_BUCKETS = [
  { id: "under-50", label: "Under $50", maxPrice: "50" },
  { id: "50-150", label: "$50 – $150", minPrice: "50", maxPrice: "150" },
  { id: "150-400", label: "$150 – $400", minPrice: "150", maxPrice: "400" },
  { id: "400-plus", label: "$400 and up", minPrice: "400" },
];

export const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export function buildHref(basePath: string, query: Query, patch: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    const single = one(value);
    if (single && key !== "page" && key !== "q" && key !== "search") params.set(key, single);
  }
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined || value === "") params.delete(key);
    else params.set(key, value);
  }
  const search = params.toString();
  return `${basePath}${search ? `?${search}` : ""}`;
}

export type Locked = { category?: string; collection?: string; store?: string };

export async function CatalogListing({
  query,
  basePath,
  locked = {},
  heading,
  crumbs,
}: {
  query: Query;
  basePath: string;
  locked?: Locked;
  heading: string;
  crumbs?: { label: string; href?: string }[];
}) {
  const filters = {
    search: one(query.q) ?? one(query.search),
    category: locked.category ?? one(query.category),
    collection: locked.collection ?? one(query.collection),
    store: locked.store ?? one(query.store),
    minPrice: one(query.minPrice),
    maxPrice: one(query.maxPrice),
    rating: one(query.rating),
    inStock: one(query.inStock) === "1" ? "true" : undefined,
    onSale: one(query.onSale) === "1" ? "true" : undefined,
    sort: one(query.sort) ?? "relevance",
    page: one(query.page) ?? "1",
    perPage: "24",
  };

  const [feed, saved] = await Promise.all([listProducts(filters), savedIds()]);

  // The listing builds itself from the page document. The slots section decides
  // whether advertisements are woven into the results at all, how often, how many
  // and for which placement, so where they appear is a CMS decision rather than
  // something baked into this file.
  const pageType = PAGE_TYPES[basePath] ?? "marketplace_explore";
  const page = await getCataloguePage(pageType).catch(() => ({ page: null, sections: [] }));
  const slotSection = page.sections.find(
    (section) => section.type === "promo_slots" && section.visible !== false,
  );
  const slotEvery = Math.max(1, Number(slotSection?.adEvery) || 6);
  const slotLimit = Math.max(0, Number(slotSection?.limit) || 3);
  const adverts = slotSection && slotLimit > 0
    ? (await listAdverts(slotSection.placement ?? "explore").catch(() => ({ adverts: [] }))).adverts.slice(0, slotLimit)
    : [];
  const activeStore = feed.facets.stores.find((item) => item.slug === filters.store);
  const activeCategory = feed.facets.categories.find((item) => item.slug === filters.category);
  // Filtering by department renames the page, so the heading always matches the list.
  const displayHeading = !locked.category && activeCategory ? activeCategory.name : heading;

  const chips: { label: string; href: string }[] = [];
  const href = (patch: Record<string, string | undefined>) => buildHref(basePath, query, patch);

  if (filters.minPrice || filters.maxPrice) {
    const bucket = PRICE_BUCKETS.find((b) => b.minPrice === filters.minPrice && b.maxPrice === filters.maxPrice);
    chips.push({
      label: bucket?.label ?? `${filters.minPrice ? money(Number(filters.minPrice), { cents: false }) : "$0"} – ${filters.maxPrice ? money(Number(filters.maxPrice), { cents: false }) : "any"}`,
      href: href({ minPrice: undefined, maxPrice: undefined }),
    });
  }
  if (!locked.store && filters.store) chips.push({ label: activeStore?.name ?? filters.store, href: href({ store: undefined }) });
  if (!locked.category && filters.category)
    chips.push({ label: activeCategory?.name ?? filters.category, href: href({ category: undefined }) });
  if (filters.inStock) chips.push({ label: "In stock", href: href({ inStock: undefined }) });
  if (filters.onSale) chips.push({ label: "On offer", href: href({ onSale: undefined }) });
  if (filters.rating) chips.push({ label: `${filters.rating}★ and up`, href: href({ rating: undefined }) });

  const panel = (
    <FilterPanel query={query} basePath={basePath} filters={filters} facets={feed.facets} locked={locked} />
  );

  return (
    <div className="mx-auto max-w-[1240px] px-4 py-6 lg:px-6 lg:py-8">
      {crumbs?.length ? (
        <nav className="no-scrollbar -mx-4 flex items-center gap-2 overflow-x-auto px-4 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-soft lg:mx-0 lg:px-0">
          {crumbs.map((crumb, index) => (
            <span key={`${crumb.label}-${index}`} className="flex shrink-0 items-center gap-2">
              {index > 0 ? <span>/</span> : null}
              {crumb.href ? (
                <Link href={crumb.href} className="transition-colors hover:text-ember">
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-ink">{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>
      ) : null}

      <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-[21px] font-semibold capitalize leading-tight text-ink lg:text-[28px]">
            {displayHeading}
          </h1>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft">
            {feed.total} product{feed.total === 1 ? "" : "s"}
            {chips.length ? ` · ${chips.length} filter${chips.length === 1 ? "" : "s"} on` : ""}
          </p>
        </div>

        <AutoForm action={basePath} method="get" className="flex items-center gap-2">
          {locked.category ? <input type="hidden" name="category" value={locked.category} /> : null}
          {locked.collection ? <input type="hidden" name="collection" value={locked.collection} /> : null}
          {locked.store ? <input type="hidden" name="store" value={locked.store} /> : null}
          {filters.search ? <input type="hidden" name="q" value={filters.search} /> : null}
          <label className="flex items-center gap-2">
            <span className="sr-only">Sort products</span>
            <select
              name="sort"
              defaultValue={filters.sort}
              className="h-9 rounded-[2px] border border-line-warm bg-white px-2 text-[12.5px] text-ink outline-none focus:border-ink"
            >
              {SORTS.map((sort) => (
                <option key={sort.id} value={sort.id}>
                  {sort.label}
                </option>
              ))}
            </select>
          </label>
          <noscript>
            <button type="submit" className="rounded-[2px] border border-ink/25 px-3 py-2 text-[12px] font-semibold text-ink">
              Apply
            </button>
          </noscript>
        </AutoForm>
      </div>

      <div className="mt-4 grid gap-4 lg:mt-6 lg:grid-cols-[236px_1fr] lg:gap-8">
        <aside>
          {/* Mobile: one disclosure instead of a full screen of filters. */}
          <details className="group overflow-hidden rounded-[3px] border border-line-warm bg-white lg:hidden">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3.5 py-3 [&::-webkit-details-marker]:hidden">
              <span className="flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink">
                <SlidersHorizontal width={14} height={14} className="text-ember" />
                Filters
                {chips.length ? (
                  <span className="rounded-[2px] bg-ink px-1.5 py-[1px] text-[9.5px] text-bone">{chips.length}</span>
                ) : null}
              </span>
              <ChevronDown width={16} height={16} className="text-ink-soft transition-transform group-open:rotate-180" />
            </summary>
            <div className="space-y-5 border-t border-line-warm p-3.5">{panel}</div>
          </details>

          {/* Desktop: always open. */}
          <div className="hidden lg:block">
            <div className="flex items-center gap-2 border-b border-line-warm pb-2">
              <SlidersHorizontal width={14} height={14} className="text-ember" />
              <Eyebrow className="text-ink">Filters</Eyebrow>
            </div>
            <div className="mt-6 space-y-6">{panel}</div>
          </div>

          {activeStore && locked.store !== activeStore.slug ? (
            <div className="mt-4 rounded-[3px] border border-line-warm bg-white p-3.5">
              <Eyebrow>Only showing</Eyebrow>
              <p className="mt-1.5 font-display text-[14px] font-semibold text-ink">{activeStore.name}</p>
              <Link
                href={`/store/${activeStore.slug}`}
                className="mt-2 inline-block font-mono text-[10px] uppercase tracking-[0.14em] text-ember underline decoration-2 underline-offset-4"
              >
                Visit the store
              </Link>
            </div>
          ) : null}
        </aside>

        <div className="min-w-0">
          {chips.length ? (
            <div className="no-scrollbar -mx-4 mb-3 flex gap-1.5 overflow-x-auto px-4 lg:mx-0 lg:flex-wrap lg:px-0">
              {chips.map((chip) => (
                <Link
                  key={chip.label}
                  href={chip.href}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-[2px] border border-ink/20 bg-white px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-ink transition-colors hover:border-ember/50 hover:text-ember"
                >
                  {chip.label}
                  <X width={11} height={11} />
                </Link>
              ))}
              <Link
                href={basePath}
                className="inline-flex shrink-0 items-center rounded-[2px] px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft underline decoration-ember decoration-2 underline-offset-4"
              >
                Clear all
              </Link>
            </div>
          ) : null}

          {feed.items.length ? (
            <div className="grid gap-5">
              {/* One block of products, then whatever promotion follows it. */}
              {productChunks(feed.items, slotEvery).map((chunk, index) => (
                <div key={chunk[0]?.id ?? index} className="grid gap-3.5">
                  <ProductGrid products={chunk} savedIds={saved} />
                  {adverts[index] ? (
                    <AdvertSlot advert={adverts[index]} label={slotSection?.subtitle ?? "Advertisement"} />
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="Nothing matches those filters"
              body="Try widening the price range or clearing a filter and the catalogue will fill back up."
              action={<LinkButton href={basePath}>Clear every filter</LinkButton>}
            />
          )}

          {feed.pages > 1 ? (
            <div className="mt-8 flex items-center justify-between gap-3 border-t border-line-warm pt-5">
              <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-soft">
                Page {feed.page} of {feed.pages}
              </span>
              <div className="flex gap-2">
                {feed.page > 1 ? (
                  <LinkButton href={href({ page: String(feed.page - 1) })} variant="outline">
                    Previous
                  </LinkButton>
                ) : null}
                {feed.page < feed.pages ? (
                  <LinkButton href={href({ page: String(feed.page + 1) })} variant="outline">
                    Next
                  </LinkButton>
                ) : null}
              </div>
            </div>
          ) : null}

          <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft/70">
            Free delivery over {money(120, { cents: false })} · 30-day returns
          </p>
        </div>
      </div>
    </div>
  );
}

type Facets = Awaited<ReturnType<typeof listProducts>>["facets"];

function FilterPanel({
  query,
  basePath,
  filters,
  facets,
  locked,
}: {
  query: Query;
  basePath: string;
  filters: { category?: string; store?: string; minPrice?: string; maxPrice?: string; rating?: string; inStock?: string; onSale?: string };
  facets: Facets;
  locked: Locked;
}) {
  const href = (patch: Record<string, string | undefined>) => buildHref(basePath, query, patch);

  return (
    <>
      {!locked.category ? (
        <FilterGroup title="Department">
          <FilterLink href={href({ category: undefined })} active={!filters.category}>
            All departments
          </FilterLink>
          {facets.categories
            .filter((category) => category.count > 0)
            .map((category) => (
              <FilterLink
                key={category.slug}
                href={href({ category: category.slug })}
                active={filters.category === category.slug}
              >
                {category.name} <span className="text-ink-soft">({category.count})</span>
              </FilterLink>
            ))}
        </FilterGroup>
      ) : null}

      <FilterGroup title="Price">
        {PRICE_BUCKETS.map((bucket) => (
          <FilterLink
            key={bucket.id}
            href={href({ minPrice: bucket.minPrice, maxPrice: bucket.maxPrice })}
            active={filters.minPrice === bucket.minPrice && filters.maxPrice === bucket.maxPrice}
          >
            {bucket.label}
          </FilterLink>
        ))}
      </FilterGroup>

      {!locked.store ? (
        <FilterGroup title="Store">
          <FilterLink href={href({ store: undefined })} active={!filters.store}>
            Every store
          </FilterLink>
          {facets.stores
            .filter((store) => store.count > 0)
            .map((store) => (
              <FilterLink key={store.slug} href={href({ store: store.slug })} active={filters.store === store.slug}>
                {store.name} <span className="text-ink-soft">({store.count})</span>
              </FilterLink>
            ))}
        </FilterGroup>
      ) : null}

      <FilterGroup title="Other">
        <FilterLink href={href({ inStock: filters.inStock ? undefined : "1" })} active={Boolean(filters.inStock)}>
          In stock only
        </FilterLink>
        <FilterLink href={href({ onSale: filters.onSale ? undefined : "1" })} active={Boolean(filters.onSale)}>
          On offer
        </FilterLink>
        <FilterLink href={href({ rating: filters.rating ? undefined : "4" })} active={Boolean(filters.rating)}>
          Four stars and up
        </FilterLink>
      </FilterGroup>
    </>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <Eyebrow>{title}</Eyebrow>
      <div className="mt-2.5 flex flex-wrap gap-1.5 lg:flex-col lg:gap-1">{children}</div>
    </div>
  );
}

function FilterLink({ href, active, children }: { href: string; active?: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-[2px] px-2 py-1.5 text-[13px] transition-colors",
        active ? "bg-ink text-bone" : "text-ink-soft hover:bg-bone-soft hover:text-ink",
      )}
    >
      {children}
    </Link>
  );
}

/**
 * One advertisement, in the flow of the results.
 *
 * Labelled, always: a promotion that cannot be told apart from a result is a
 * trick, and it costs more trust than the slot earns. A sponsor line appears
 * when the advert has one; without it the slot is house advertising.
 */
function AdvertSlot({ advert, label }: { advert: Advert; label: string }) {
  const media = assetUrl(advert.mediaUrl);
  const isVideo = advert.kind === "video";
  return (
    <a
      href={advert.href || "/browse"}
      className="group grid overflow-hidden rounded-[14px] border border-line-warm bg-white transition-colors hover:border-ember/40 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]"
    >
      <span className="relative block min-h-[132px] bg-gradient-to-br from-[#5b3a7a] via-[#8b63b0] to-[#c8a7e0]">
        {media && !isVideo ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={media} alt="" className="h-full w-full object-cover" />
        ) : null}
      </span>
      <span className="flex flex-col justify-center gap-1.5 px-4 py-4">
        <span className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-ink-soft">{label}</span>
        <span className="font-display text-[17px] font-bold leading-tight text-ink group-hover:text-ember">
          {advert.headline || advert.name || "Something worth a look"}
        </span>
        {advert.body ? <span className="text-[12.5px] leading-relaxed text-ink-soft">{advert.body}</span> : null}
        <span className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft/80">
          {advert.sponsor ? `Sponsored by ${advert.sponsor}` : "From Ferixas"}
        </span>
      </span>
    </a>
  );
}

import Link from "next/link";
import { SlidersHorizontal } from "lucide-react";
import { listProducts, type ProductList } from "@/lib/api";
import { savedIds } from "@/lib/data";
import { ProductGrid } from "@/components/ferix/cards";
import { AutoForm } from "@/components/ferix/add-to-cart";
import { EmptyState, Eyebrow, LinkButton } from "@/components/ferix/marks";
import { money } from "@/lib/format";
import { cn } from "@/lib/utils";

type Query = Record<string, string | string[] | undefined>;

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

const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

function withParam(query: Query, patch: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    const single = one(value);
    if (single && key !== "page") params.set(key, single);
  }
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined || value === "") params.delete(key);
    else params.set(key, value);
  }
  const search = params.toString();
  return `/browse${search ? `?${search}` : ""}`;
}

export default async function BrowsePage({ searchParams }: { searchParams: Promise<Query> }) {
  const query = await searchParams;
  const filters = {
    search: one(query.q) ?? one(query.search),
    category: one(query.category),
    collection: one(query.collection),
    store: one(query.store),
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
  const activeCategory = feed.facets.categories.find((item) => item.slug === filters.category);
  const activeStore = feed.facets.stores.find((item) => item.slug === filters.store);
  const heading = activeCategory?.name ?? (filters.collection ? filters.collection.replace(/-/g, " ") : "All departments");
  const activeCount = [
    filters.category,
    filters.collection,
    filters.store,
    filters.minPrice,
    filters.maxPrice,
    filters.rating,
    filters.inStock,
    filters.onSale,
  ].filter(Boolean).length;

  return (
    <div className="mx-auto max-w-[1240px] px-4 py-8">
      <nav className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-soft">
        <Link href="/" className="transition-colors hover:text-ember">
          Home
        </Link>
        <span>/</span>
        <Link href="/browse" className="transition-colors hover:text-ember">
          Browse
        </Link>
        {activeCategory ? (
          <>
            <span>/</span>
            <span className="text-ink">{activeCategory.name}</span>
          </>
        ) : null}
      </nav>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[28px] font-semibold capitalize leading-tight text-ink">{heading}</h1>
          <p className="mt-1.5 font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-soft">
            {feed.total} products{activeCount ? ` · ${activeCount} filter${activeCount === 1 ? "" : "s"} on` : ""}
          </p>
        </div>
        <AutoForm action="/browse" method="get" className="flex items-center gap-2">
          {filters.category ? <input type="hidden" name="category" value={filters.category} /> : null}
          {filters.collection ? <input type="hidden" name="collection" value={filters.collection} /> : null}
          {activeCount ? (
            <Link href="/browse" className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft underline decoration-ember decoration-2 underline-offset-4">
              Clear filters
            </Link>
          ) : null}
          <label className="flex items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft">Sort</span>
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

      <div className="mt-6 grid gap-8 lg:grid-cols-[236px_1fr]">
        <aside className="space-y-6">
          <div className="flex items-center gap-2 border-b border-line-warm pb-2">
            <SlidersHorizontal width={14} height={14} className="text-ember" />
            <Eyebrow className="text-ink">Filters</Eyebrow>
          </div>

          <FilterGroup title="Department">
            <FilterLink href={withParam(query, { category: undefined })} active={!filters.category}>
              All departments
            </FilterLink>
            {feed.facets.categories
              .filter((category) => category.count > 0)
              .map((category) => (
                <FilterLink
                  key={category.slug}
                  href={withParam(query, { category: category.slug })}
                  active={filters.category === category.slug}
                >
                  {category.name} <span className="text-ink-soft">({category.count})</span>
                </FilterLink>
              ))}
          </FilterGroup>

          <FilterGroup title="Price">
            {PRICE_BUCKETS.map((bucket) => (
              <FilterLink
                key={bucket.id}
                href={withParam(query, {
                  minPrice: bucket.minPrice,
                  maxPrice: bucket.maxPrice,
                })}
                active={filters.minPrice === bucket.minPrice && filters.maxPrice === bucket.maxPrice}
              >
                {bucket.label}
              </FilterLink>
            ))}
          </FilterGroup>

          <FilterGroup title="Store">
            <FilterLink href={withParam(query, { store: undefined })} active={!filters.store}>
              Every store
            </FilterLink>
            {feed.facets.stores
              .filter((store) => store.count > 0)
              .map((store) => (
                <FilterLink
                  key={store.slug}
                  href={withParam(query, { store: store.slug })}
                  active={filters.store === store.slug}
                >
                  {store.name} <span className="text-ink-soft">({store.count})</span>
                </FilterLink>
              ))}
          </FilterGroup>

          <FilterGroup title="Other">
            <FilterLink href={withParam(query, { inStock: filters.inStock ? undefined : "1" })} active={Boolean(filters.inStock)}>
              In stock only
            </FilterLink>
            <FilterLink href={withParam(query, { onSale: filters.onSale ? undefined : "1" })} active={Boolean(filters.onSale)}>
              On offer
            </FilterLink>
            <FilterLink href={withParam(query, { rating: filters.rating ? undefined : "4" })} active={Boolean(filters.rating)}>
              Four stars and up
            </FilterLink>
          </FilterGroup>

          {activeStore ? (
            <div className="rounded-[3px] border border-line-warm bg-white p-3.5">
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

        <div>
          {feed.items.length ? (
            <ProductGrid products={feed.items} savedIds={saved} />
          ) : (
            <EmptyState
              title="Nothing matches those filters"
              body="Try widening the price range or clearing a filter and the catalogue will fill back up."
              action={<LinkButton href="/browse">Clear every filter</LinkButton>}
            />
          )}

          {feed.pages > 1 ? (
            <div className="mt-8 flex items-center justify-between border-t border-line-warm pt-5">
              <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-soft">
                Page {feed.page} of {feed.pages}
              </span>
              <div className="flex gap-2">
                {feed.page > 1 ? (
                  <LinkButton href={withParam(query, { page: String(feed.page - 1) })} variant="outline">
                    Previous
                  </LinkButton>
                ) : null}
                {feed.page < feed.pages ? (
                  <LinkButton href={withParam(query, { page: String(feed.page + 1) })} variant="outline">
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

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <Eyebrow>{title}</Eyebrow>
      <div className="mt-2.5 flex flex-col gap-1">{children}</div>
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

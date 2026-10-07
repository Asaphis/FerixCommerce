import Link from "next/link";
import { searchAll } from "@/lib/api";
import { savedIds } from "@/lib/data";
import { ProductGrid, StoreCard } from "@/components/ferix/cards";
import { EmptyState, Eyebrow, LinkButton } from "@/components/ferix/marks";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const term = (q ?? "").trim();
  const [results, saved] = await Promise.all([
    term ? searchAll(term) : Promise.resolve(null),
    savedIds(),
  ]);

  return (
    <div className="mx-auto max-w-[1240px] px-4 py-8">
      <Eyebrow>Search</Eyebrow>
      <h1 className="mt-2 font-display text-[26px] font-semibold text-ink">
        {term ? `Results for “${term}”` : "Search the marketplace"}
      </h1>

      {!term ? (
        <p className="mt-3 max-w-[60ch] text-[13.5px] leading-relaxed text-ink-soft">
          Use the search field above to look across every merchant’s catalogue, or browse by
          department.
        </p>
      ) : null}

      {results ? (
        <>
          <p className="mt-2 font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-soft">
            {results.products.length} products · {results.stores.length} stores · {results.categories.length} departments
          </p>

          {results.categories.length ? (
            <div className="mt-6 flex flex-wrap gap-2">
              {results.categories.map((category) => (
                <Link
                  key={category.slug}
                  href={`/browse?category=${category.slug}`}
                  className="rounded-[2px] border border-line-warm bg-white px-3 py-2 text-[12.5px] text-ink transition-colors hover:border-ink/30"
                >
                  {category.name}
                </Link>
              ))}
            </div>
          ) : null}

          <section className="mt-8">
            {results.products.length ? (
              <ProductGrid products={results.products} savedIds={saved} />
            ) : (
              <EmptyState
                title="No products matched that search"
                body="Check the spelling, try a broader word, or browse the departments instead."
                action={<LinkButton href="/browse">Browse everything</LinkButton>}
              />
            )}
          </section>

          {results.stores.length ? (
            <section className="mt-12">
              <Eyebrow>Matching stores</Eyebrow>
              <div className="mt-3 grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-3">
                {results.stores.map((store) => (
                  <StoreCard key={store.id} store={store} />
                ))}
              </div>
            </section>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

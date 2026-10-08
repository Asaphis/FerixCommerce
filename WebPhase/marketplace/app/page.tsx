import Link from "next/link";
import { ArrowRight, BadgeCheck, Boxes, ShoppingBag, Store as StoreIcon } from "lucide-react";
import type { Category, Product } from "@/lib/api";
import { getHome } from "@/lib/api";
import { savedIds } from "@/lib/data";
import { PromoBanner } from "@/components/ferix/banner";
import { CategoryTile, ProductGrid, ProductRail, StoreCard } from "@/components/ferix/cards";
import { SectionHead } from "@/components/ferix/marks";

function uniqueProducts(products: Product[]) {
  const seen = new Set<string>();
  return products.filter((product) => {
    const key = product.id || product.slug;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function categoryFallback(products: Product[]): Category[] {
  const grouped = new Map<string, { count: number; image: string | null }>();
  for (const product of products) {
    const slug = (product.category || "").trim().toLowerCase();
    if (!slug) continue;
    const row = grouped.get(slug) ?? { count: 0, image: product.images?.[0] ?? null };
    row.count += 1;
    if (!row.image && product.images?.[0]) row.image = product.images[0];
    grouped.set(slug, row);
  }
  return [...grouped.entries()].map(([slug, row]) => ({
    slug,
    name: slug.split(/[-_\s]+/).map((part) => part ? part[0].toUpperCase() + part.slice(1) : "").join(" "),
    glyph: slug.slice(0, 1).toUpperCase(),
    blurb: "",
    count: row.count,
    image: row.image,
  }));
}

export default async function HomePage() {
  const [home, saved] = await Promise.all([getHome(), savedIds()]);
  const catalogue = uniqueProducts([
    ...home.trending,
    ...home.newArrivals,
    ...home.featured,
    ...home.official,
    ...home.under100,
  ]);
  const categories = (home.categories.length ? home.categories : categoryFallback(catalogue)).slice(0, 10);
  const trending = uniqueProducts(home.trending).slice(0, 8);
  const arrivals = uniqueProducts(home.newArrivals).slice(0, 8);

  return (
    <div className="pb-10">
      <section className="mx-auto max-w-[1440px] sm:px-5 sm:pt-5">
        <div className="grid gap-3 lg:grid-cols-[226px_minmax(0,1fr)]">
          <aside className="hidden rounded-[3px] rounded-tr-[14px] border border-line-warm bg-white p-3.5 lg:block">
            <div className="mb-2 flex items-center gap-2 border-b border-line-warm px-1 pb-3">
              <span className="grid h-8 w-8 place-items-center rounded-[2px] bg-[#fff0e9] text-ember"><Boxes width={16} height={16} /></span>
              <p className="text-[12px] font-bold text-ink">Departments</p>
            </div>
            <nav aria-label="Shop departments" className="grid gap-0.5">
              {categories.slice(0, 8).map((category) => (
                <Link key={category.slug} href={`/browse?category=${category.slug}`} className="flex min-h-9 items-center justify-between gap-2 rounded-[2px] px-2 text-[12px] font-medium text-ink-soft transition-colors hover:bg-[#fff3ed] hover:text-ember">
                  <span className="truncate">{category.name}</span><ArrowRight width={13} height={13} />
                </Link>
              ))}
              <Link href="/browse" className="mt-1 flex min-h-9 items-center gap-2 border-t border-line-warm px-2 pt-1 text-[11px] font-bold text-ember">All departments <ArrowRight width={13} height={13} /></Link>
            </nav>
          </aside>
          <div className="min-w-0">
            <PromoBanner
              banners={home.banners}
              heightClassName="h-[236px] sm:h-[286px] lg:h-[350px]"
              className="rounded-[3px] rounded-tr-[18px] shadow-[0_10px_28px_rgba(16,45,67,0.10)] max-lg:rounded-none max-lg:shadow-none"
            />
            <div className="mt-2.5 grid grid-cols-3 divide-line-warm rounded-[3px] border border-line-warm bg-white py-2.5 sm:divide-x max-lg:mt-0 max-lg:rounded-none max-lg:border-x-0 max-lg:py-0">
              <div className="flex min-h-[46px] items-center justify-center gap-1.5 px-2 text-center text-[10px] leading-tight font-semibold text-ink-soft sm:min-h-0 sm:gap-2 sm:px-1 sm:text-[11px]"><ShoppingBag width={14} height={14} className="shrink-0 text-ember" />One cart, many stores</div>
              <div className="flex min-h-[46px] items-center justify-center gap-1.5 px-2 text-center text-[10px] leading-tight font-semibold text-ink-soft sm:min-h-0 sm:gap-2 sm:px-1 sm:text-[11px]"><BadgeCheck width={14} height={14} className="shrink-0 text-ember" />Seller profiles</div>
              <div className="flex min-h-[46px] items-center justify-center gap-1.5 px-2 text-center text-[10px] leading-tight font-semibold text-ink-soft sm:min-h-0 sm:gap-2 sm:px-1 sm:text-[11px]"><StoreIcon width={14} height={14} className="shrink-0 text-ember" />{home.stats.merchants} stores</div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1440px] px-4 pb-1 pt-5 sm:px-6 sm:pt-7 lg:pt-8">
        <SectionHead
          eyebrow="Find your next favourite"
          title="Shop by category"
          action={<Link href="/browse" className="inline-flex shrink-0 items-center gap-1 text-[12px] font-semibold text-ember hover:underline">All departments <ArrowRight width={14} height={14} /></Link>}
          className="mb-3"
        />
        {categories.length ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {categories.slice(0, 8).map((category) => <CategoryTile key={category.slug} category={category} />)}
          </div>
        ) : (
          <div className="rounded-[3px] border border-line-warm bg-white px-4 py-5 text-[13px] text-ink-soft">More categories are coming soon.</div>
        )}
      </section>

      {home.flashSale?.products.length ? (
        <section className="mt-6 border-y border-line-warm bg-white sm:mt-8">
          <div className="mx-auto max-w-[1440px] px-4 py-5 sm:px-6 sm:py-7">
            <SectionHead
              eyebrow="Limited-time offers"
              title={home.flashSale.headline || home.flashSale.name}
              action={<span className="shrink-0 rounded-[2px] rounded-tr-[8px] bg-[#fff0e9] px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide text-ember sm:text-[11px]">Ends {new Date(home.flashSale.endsAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>}
              className="mb-3"
            />
            <ProductRail products={uniqueProducts(home.flashSale.products)} savedIds={saved} />
          </div>
        </section>
      ) : null}

      {trending.length ? (
        <section className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 sm:py-9">
          <SectionHead
            eyebrow="Popular right now"
            title="Trending picks"
            action={<Link href="/browse?sort=best" className="inline-flex items-center gap-1 text-[12px] font-semibold text-ember hover:underline">See all <ArrowRight width={14} height={14} /></Link>}
            className="mb-3 sm:mb-4"
          />
          <ProductGrid products={trending} savedIds={saved} />
        </section>
      ) : null}

      {arrivals.length ? (
        <section className="border-y border-line-warm bg-white">
          <div className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 sm:py-9">
            <SectionHead
              eyebrow="Fresh on Ferixas"
              title="New arrivals"
              action={<Link href="/browse?sort=new" className="inline-flex items-center gap-1 text-[12px] font-semibold text-ember hover:underline">Explore <ArrowRight width={14} height={14} /></Link>}
              className="mb-3 sm:mb-4"
            />
            <ProductGrid products={arrivals} savedIds={saved} />
          </div>
        </section>
      ) : null}

      {home.stores.length ? (
        <section className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 sm:py-9">
          <SectionHead
            eyebrow="Independent shops, one marketplace"
            title="Meet the stores"
            action={<Link href="/stores" className="inline-flex items-center gap-1 text-[12px] font-semibold text-ember hover:underline">All stores <ArrowRight width={14} height={14} /></Link>}
            className="mb-3 sm:mb-4"
          />
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4">
            {home.stores.slice(0, 8).map((store) => <StoreCard key={store.id} store={store} />)}
          </div>
        </section>
      ) : null}

      <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-3 px-4 pb-3 text-[11px] text-ink-soft sm:px-6">
        <span>{home.stats.products.toLocaleString()} products across {home.stats.merchants} stores</span>
        <Link href="/stores" className="inline-flex shrink-0 items-center gap-1 font-semibold text-ember"><StoreIcon width={13} height={13} /> Meet the stores</Link>
      </div>
    </div>
  );
}

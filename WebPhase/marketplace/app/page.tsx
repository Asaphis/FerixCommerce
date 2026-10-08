import Link from "next/link";
import { ArrowRight, Store as StoreIcon } from "lucide-react";
import { assetUrl, getHome } from "@/lib/api";
import { savedIds } from "@/lib/data";
import { PromoBanner } from "@/components/ferix/banner";
import { ProductGrid, ProductRail, StoreCard } from "@/components/ferix/cards";
import { Eyebrow, Plate, SectionHead } from "@/components/ferix/marks";
import { compact } from "@/lib/format";

export default async function HomePage() {
  const [home, saved] = await Promise.all([getHome(), savedIds()]);
  const categories = home.categories.slice(0, 10);

  return (
    <div className="pb-8">
      <div className="mx-auto max-w-[1320px] px-3 pt-3 sm:px-5 sm:pt-5">
        <PromoBanner
          banners={home.banners}
          heightClassName="h-[245px] sm:h-[310px] lg:h-[380px]"
          className="rounded-[2px] rounded-tr-[18px] shadow-[0_8px_30px_rgba(16,45,67,0.10)]"
        />
      </div>

      <section className="mx-auto max-w-[1320px] px-4 pb-4 pt-6 sm:px-6 sm:pt-8">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="font-display text-[17px] font-bold text-ink sm:text-[20px]">Shop by category</h2>
          <Link href="/browse" className="inline-flex shrink-0 items-center gap-1 text-[12px] font-semibold text-ember hover:underline">
            All departments <ArrowRight width={14} height={14} />
          </Link>
        </div>
        <div className="-mx-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
          <div className="flex min-w-0 gap-2.5 sm:grid sm:grid-cols-5 lg:grid-cols-10">
            {categories.map((category) => (
              <Link
                key={category.slug}
                href={`/category/${category.slug}`}
                className="group flex w-[72px] shrink-0 flex-col items-center gap-1.5 text-center sm:w-auto"
              >
                <span className="grid h-[58px] w-[58px] place-items-center overflow-hidden rounded-[2px] rounded-tr-[13px] border border-line-warm bg-white shadow-[0_2px_8px_rgba(16,45,67,0.05)] transition-transform group-hover:-translate-y-0.5 sm:h-[66px] sm:w-[66px]">
                  <Plate seed={category.slug} src={assetUrl(category.image)} alt={category.name} className="h-full w-full rounded-none" />
                </span>
                <span className="w-full truncate text-[10px] font-semibold text-ink sm:text-[11px]">{category.name}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {home.flashSale && home.flashSale.products.length > 0 ? (
        <section className="border-y border-line-warm bg-white">
          <div className="mx-auto max-w-[1320px] px-4 py-5 sm:px-6 sm:py-7">
            <SectionHead
              eyebrow="Limited time"
              title={home.flashSale.headline || home.flashSale.name}
              action={
                <span className="shrink-0 rounded-[2px] rounded-tr-[9px] bg-[#fff0e9] px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide text-ember sm:text-[11px]">
                  Ends {new Date(home.flashSale.endsAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                </span>
              }
              className="mb-4"
            />
            <ProductRail products={home.flashSale.products} savedIds={saved} />
          </div>
        </section>
      ) : null}

      <section className="mx-auto max-w-[1320px] px-4 py-6 sm:px-6 sm:py-9">
        <SectionHead
          eyebrow="Popular now"
          title="Trending picks"
          action={<Link href="/browse?sort=best" className="inline-flex items-center gap-1 text-[12px] font-semibold text-ember hover:underline">See all <ArrowRight width={14} height={14} /></Link>}
          className="mb-4"
        />
        <ProductRail products={home.trending} savedIds={saved} />
      </section>

      <section className="border-y border-line-warm bg-white">
        <div className="mx-auto max-w-[1320px] px-4 py-6 sm:px-6 sm:py-9">
          <SectionHead
            eyebrow="Just added"
            title="New arrivals"
            action={<Link href="/browse?sort=new" className="inline-flex items-center gap-1 text-[12px] font-semibold text-ember hover:underline">Explore <ArrowRight width={14} height={14} /></Link>}
            className="mb-4"
          />
          <ProductGrid products={home.newArrivals.slice(0, 8)} savedIds={saved} />
        </div>
      </section>

      <section className="mx-auto max-w-[1320px] px-4 py-6 sm:px-6 sm:py-9">
        <SectionHead
          eyebrow="Trusted sellers"
          title="Featured stores"
          action={<Link href="/stores" className="inline-flex items-center gap-1 text-[12px] font-semibold text-ember hover:underline">All {home.stats.merchants} stores <ArrowRight width={14} height={14} /></Link>}
          className="mb-4"
        />
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4">
          {home.stores.slice(0, 8).map((store) => <StoreCard key={store.id} store={store} />)}
        </div>
      </section>

      <div className="mx-auto flex max-w-[1320px] items-center justify-between gap-3 px-4 pb-3 sm:px-6">
        <p className="text-[11px] text-ink-soft">{compact(home.stats.products)} products · {home.stats.merchants} sellers</p>
        <Link href="/stores" className="inline-flex items-center gap-1 text-[11px] font-semibold text-ember"><StoreIcon width={13} height={13} /> Meet the stores</Link>
      </div>
    </div>
  );
}

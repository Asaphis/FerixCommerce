import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { getHome } from "@/lib/api";
import { savedIds } from "@/lib/data";
import { PromoBanner } from "@/components/ferix/banner";
import { CategoryTile, CollectionCard, ProductGrid, ProductRail, StoreCard, TrustStrip } from "@/components/ferix/cards";
import { Eyebrow, LinkButton, SectionHead } from "@/components/ferix/marks";
import { compact } from "@/lib/format";

export default async function HomePage() {
  const [home, saved] = await Promise.all([getHome(), savedIds()]);

  return (
    <>
      <PromoBanner banners={home.banners} />

      {home.flashSale && home.flashSale.products.length > 0 ? (
        <section className="mx-auto max-w-[1240px] px-4 pt-12">
          <SectionHead
            eyebrow="Ends soon"
            title={home.flashSale.headline || home.flashSale.name}
            action={
              <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-ember">
                Closes {new Date(home.flashSale.endsAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
              </span>
            }
          />
          <ProductRail products={home.flashSale.products} savedIds={saved} />
        </section>
      ) : null}

      <section className="mx-auto max-w-[1240px] px-4 py-12">
        <SectionHead
          eyebrow="Departments"
          title="Shop the whole platform by department"
          action={
            <Link
              href="/browse"
              className="group inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft transition-colors hover:text-ember"
            >
              All {home.stats.categories} departments
              <ArrowRight width={14} height={14} className="transition-transform group-hover:translate-x-0.5" />
            </Link>
          }
        />
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
          {home.categories.map((category) => (
            <CategoryTile key={category.slug} category={category} />
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1240px] px-4 pb-12">
        <SectionHead eyebrow="Curated" title="Collections put together this season" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {home.collections.slice(0, 3).map((collection) => (
            <CollectionCard key={collection.slug} collection={collection} />
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1240px] px-4 pb-12">
        <SectionHead
          eyebrow="Trending this month"
          title="What the marketplace is buying"
          action={
            <Link href="/browse?sort=best" className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft transition-colors hover:text-ember">
              See all
            </Link>
          }
        />
        <ProductRail products={home.trending} savedIds={saved} />
      </section>

      <section className="border-y border-hairline bg-void">
        <div className="mx-auto max-w-[1240px] px-4 py-14">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <Eyebrow className="text-lime">Platform as merchant</Eyebrow>
              <h2 className="mt-3 font-display text-[28px] font-semibold leading-tight text-chalk sm:text-[34px]">
                Ferixas Official Store
              </h2>
              <p className="mt-4 max-w-[46ch] text-[14px] leading-relaxed text-chalk-dim">
                The platform sells its own hardware through exactly the same catalogue, the same
                channels and the same checkout as every other merchant.
              </p>
              <div className="mt-6 flex flex-wrap gap-2.5">
                <LinkButton href="/store/ferixas-official" variant="light" className="gap-2">
                  <Sparkles width={15} height={15} />
                  Open the official store
                </LinkButton>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {home.official.map((product) => (
                <Link
                  key={product.id}
                  href={`/product/${product.slug}`}
                  className="rounded-[3px] border border-hairline bg-panel p-3 transition-colors hover:border-chalk-dim"
                >
                  <p className="line-clamp-2 font-display text-[13px] font-semibold text-chalk">{product.title}</p>
                  <p className="mt-2 font-mono text-[12px] text-lime">${product.price.toFixed(2)}</p>
                  <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-chalk-dim">
                    {compact(product.sold30d)} sold
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1240px] px-4 py-14">
        <SectionHead
          eyebrow="New arrivals"
          title="Fresh from merchant catalogues"
          action={
            <Link href="/browse?sort=new" className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft transition-colors hover:text-ember">
              See all
            </Link>
          }
        />
        <ProductGrid products={home.newArrivals.slice(0, 8)} savedIds={saved} />
      </section>

      <section className="border-y border-line-warm bg-bone-soft/60">
        <div className="mx-auto max-w-[1240px] px-4 py-14">
          <SectionHead
            eyebrow="Merchant stores"
            title="Shop a single brand, end to end"
            action={
              <Link href="/stores" className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft transition-colors hover:text-ember">
                All {home.stats.merchants} stores
              </Link>
            }
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {home.stores.map((store) => (
              <StoreCard key={store.id} store={store} />
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1240px] px-4 py-14">
        <SectionHead eyebrow="Under $100" title="Small things, real quality" />
        <ProductRail products={home.under100} savedIds={saved} />
      </section>

      <TrustStrip />

      <p className="mx-auto max-w-[1240px] px-4 py-10 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-soft/70">
        {compact(home.stats.products)} products · {home.stats.merchants} merchant stores · one cart and one checkout
      </p>
    </>
  );
}

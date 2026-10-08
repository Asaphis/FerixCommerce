import Link from "next/link";
import { ArrowRight, BadgeCheck, Boxes, ShoppingBag, Store as StoreIcon } from "lucide-react";
import type { Category, Product } from "@/lib/api";
import { assetUrl, getHome } from "@/lib/api";
import { savedIds } from "@/lib/data";
import { PromoBanner } from "@/components/ferix/banner";
import { CategoryTile, ProductGrid, ProductRail, StoreCard } from "@/components/ferix/cards";
import { SectionHead } from "@/components/ferix/marks";

/**
 * The storefront homepage, built from the CMS.
 *
 * Every band on this page is a section of the homepage document, rendered in
 * the order the CMS stores and skipped when it is switched off. The page used to
 * draw its own eight bands and ignore the document entirely, so nothing edited
 * in the admin could ever reach the shop.
 *
 * If a page has no sections at all, the built-in order below is used, so a shop
 * with no content document still renders rather than coming up blank.
 */

type Section = {
  id: string;
  type: string;
  name?: string;
  position?: number;
  visible?: boolean;
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  message?: string;
  ctaLabel?: string;
  ctaHref?: string;
  secondaryLabel?: string;
  secondaryHref?: string;
  source?: string;
  limit?: number;
};

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
    name: slug.split(/[-_\s]+/).map((part) => (part ? part[0].toUpperCase() + part.slice(1) : "")).join(" "),
    glyph: slug.slice(0, 1).toUpperCase(),
    blurb: "",
    count: row.count,
    image: row.image,
  }));
}

/** The order a page renders when its document carries no sections. */
const BUILT_IN: Section[] = [
  { id: "built_in_hero", type: "hero_banner", position: 1, visible: true },
  { id: "built_in_strip", type: "promo_strip", position: 2, visible: true },
  { id: "built_in_categories", type: "category_grid", position: 3, visible: true, title: "Shop by category" },
  { id: "built_in_flash", type: "product_carousel", position: 4, visible: true, source: "flash" },
  { id: "built_in_trending", type: "product_carousel", position: 5, visible: true, source: "trending" },
  { id: "built_in_arrivals", type: "product_carousel", position: 6, visible: true, source: "new" },
  { id: "built_in_stores", type: "featured_stores", position: 7, visible: true },
  { id: "built_in_footer", type: "footer", position: 8, visible: true },
];

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
  const flash = uniqueProducts(home.flashSale?.products ?? []);
  const brands = home.brands ?? [];

  const document = (home.content ?? {}) as { sections?: Section[] };
  const stored = (document.sections ?? [])
    .filter((section) => section && typeof section.type === "string" && section.visible !== false)
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  const sections = stored.length ? stored : BUILT_IN;

  function block(section: Section, index: number) {
    const limit = typeof section.limit === "number" ? section.limit : undefined;

    switch (section.type) {
      /* ── The campaign ───────────────────────────────────────────── */
      case "hero_banner": {
        return (
          <section key={section.id ?? index} className="mx-auto max-w-[1440px] sm:px-5 sm:pt-5">
            <PromoBanner
              banners={home.banners}
              heightClassName="h-[300px] sm:h-[380px] lg:h-[440px]"
              className="rounded-[3px] rounded-tr-[18px] shadow-[0_10px_28px_rgba(16,45,67,0.10)] max-lg:rounded-none max-lg:shadow-none"
            />
            <div className="mt-2.5 grid grid-cols-3 divide-line-warm rounded-[3px] border border-line-warm bg-white py-2.5 sm:divide-x max-lg:mt-0 max-lg:rounded-none max-lg:border-x-0 max-lg:py-0">
              <div className="flex min-h-[46px] items-center justify-center gap-1.5 px-2 text-center text-[10px] leading-tight font-semibold text-ink-soft sm:min-h-0 sm:gap-2 sm:px-1 sm:text-[11px]"><ShoppingBag width={14} height={14} className="shrink-0 text-ember" />One cart, many stores</div>
              <div className="flex min-h-[46px] items-center justify-center gap-1.5 px-2 text-center text-[10px] leading-tight font-semibold text-ink-soft sm:min-h-0 sm:gap-2 sm:px-1 sm:text-[11px]"><BadgeCheck width={14} height={14} className="shrink-0 text-ember" />Seller profiles</div>
              <div className="flex min-h-[46px] items-center justify-center gap-1.5 px-2 text-center text-[10px] leading-tight font-semibold text-ink-soft sm:min-h-0 sm:gap-2 sm:px-1 sm:text-[11px]"><StoreIcon width={14} height={14} className="shrink-0 text-ember" />{home.stats.merchants} stores</div>
            </div>
          </section>
        );
      }

      /* ── A short band above the list ────────────────────────────── */
      case "hero_slim": {
        return (
          <section key={section.id ?? index} className="mx-auto max-w-[1440px] px-4 pt-4 sm:px-6">
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-[14px] bg-gradient-to-r from-[#b8542a] via-[#e0703a] to-[#f3a877] px-5 py-6">
              <div className="min-w-0">
                {section.eyebrow ? (
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/85">{section.eyebrow}</span>
                ) : null}
                <p className="mt-1.5 font-display text-[20px] font-bold leading-tight text-white sm:text-[24px]">
                  {section.title ?? "This week on Ferixas"}
                </p>
              </div>
              {section.ctaLabel ? (
                <Link href={section.ctaHref ?? "/browse"} className="shrink-0 rounded-[10px] bg-white px-4 py-2.5 text-[12.5px] font-bold text-[#c2441a]">
                  {section.ctaLabel}
                </Link>
              ) : null}
            </div>
          </section>
        );
      }

      /* ── One line of reassurance ────────────────────────────────── */
      case "promo_strip": {
        if (section.message) {
          return (
            <div key={section.id ?? index} className="mt-2.5 border-y border-line-warm bg-white px-4 py-2.5 text-center text-[11px] font-semibold text-ink-soft">
              {section.message}
            </div>
          );
        }
        return null;
      }

      /* ── Departments ────────────────────────────────────────────── */
      case "category_grid": {
        const shown = limit ? categories.slice(0, limit) : categories.slice(0, 8);
        return (
          <section key={section.id ?? index} className="mx-auto max-w-[1440px] px-4 pb-1 pt-5 sm:px-6 sm:pt-7 lg:pt-8">
            <SectionHead
              eyebrow={section.eyebrow ?? "Find your next favourite"}
              title={section.title ?? "Shop by category"}
              action={
                <Link href="/browse" className="inline-flex shrink-0 items-center gap-1 text-[12px] font-semibold text-ember hover:underline">
                  All departments <ArrowRight width={14} height={14} />
                </Link>
              }
              className="mb-3"
            />
            {shown.length ? (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                {shown.map((category) => <CategoryTile key={category.slug} category={category} />)}
              </div>
            ) : null}
          </section>
        );
      }

      /* ── Brands ─────────────────────────────────────────────────── */
      case "brand_carousel": {
        if (!brands.length) return null;
        const shown = limit ? brands.slice(0, limit) : brands.slice(0, 8);
        return (
          <section key={section.id ?? index} className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 sm:py-9">
            <SectionHead
              eyebrow={section.subtitle ?? "Verified makers across the marketplace"}
              title={section.title ?? "Shop by brand"}
              action={
                <Link href="/browse" className="inline-flex shrink-0 items-center gap-1 text-[12px] font-semibold text-ember hover:underline">
                  All brands <ArrowRight width={14} height={14} />
                </Link>
              }
              className="mb-3 sm:mb-4"
            />
            <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
              {shown.map((brand) => {
                // A brand's artwork has been called imageUrl and logo in different
                // places, so read whichever the record carries rather than pinning
                // the page to one spelling.
                // The Brand type here describes a store's theming, not a brand record, so the cast
                // goes through unknown rather than pretending the shapes overlap.
                const record = brand as unknown as { slug: string; name: string; imageUrl?: string; logo?: string };
                const artwork = assetUrl(record.imageUrl ?? record.logo ?? null);
                return (
                  <Link
                    key={record.slug}
                    href={`/browse?brand=${record.slug}`}
                    className="flex w-[150px] shrink-0 flex-col items-center rounded-[14px] border border-line-warm bg-white p-4 text-center transition-colors hover:border-ember/40"
                  >
                    {artwork ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={artwork} alt={record.name} className="h-[62px] w-full rounded-[10px] object-cover" />
                    ) : (
                      <span className="grid h-[62px] w-full place-items-center rounded-[10px] bg-bone-soft font-display text-[16px] font-bold text-ink-soft">
                        {record.name.slice(0, 1)}
                      </span>
                    )}
                    <span className="mt-3 truncate text-[12.5px] font-semibold text-ink">{record.name}</span>
                  </Link>
                );
              })}
            </div>
          </section>
        );
      }

      /* ── A strip of products ────────────────────────────────────── */
      case "product_carousel": {
        const source = section.source ?? "trending";
        if (source === "flash") {
          if (!flash.length) return null;
          return (
            <section key={section.id ?? index} className="mt-6 border-y border-line-warm bg-white sm:mt-8">
              <div className="mx-auto max-w-[1440px] px-4 py-5 sm:px-6 sm:py-7">
                <SectionHead
                  eyebrow={section.subtitle ?? "Limited-time offers"}
                  title={section.title ?? home.flashSale?.headline ?? home.flashSale?.name ?? "Today's deals"}
                  className="mb-3"
                />
                <ProductRail products={limit ? flash.slice(0, limit) : flash} savedIds={saved} />
              </div>
            </section>
          );
        }
        const products = source === "new" ? arrivals : trending;
        if (!products.length) return null;
        const shown = limit ? products.slice(0, limit) : products;
        return (
          <section key={section.id ?? index} className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 sm:py-9">
            <SectionHead
              eyebrow={section.subtitle ?? (source === "new" ? "Fresh on Ferixas" : "Popular right now")}
              title={section.title ?? (source === "new" ? "New arrivals" : "Trending picks")}
              action={
                <Link href={`/browse?sort=${source === "new" ? "new" : "best"}`} className="inline-flex items-center gap-1 text-[12px] font-semibold text-ember hover:underline">
                  See all <ArrowRight width={14} height={14} />
                </Link>
              }
              className="mb-3 sm:mb-4"
            />
            <ProductGrid products={shown} savedIds={saved} />
          </section>
        );
      }

      /* ── Stores worth following ─────────────────────────────────── */
      case "featured_stores": {
        if (!home.stores.length) return null;
        const shown = limit ? home.stores.slice(0, limit) : home.stores.slice(0, 8);
        return (
          <section key={section.id ?? index} className="border-y border-line-warm bg-white">
            <div className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 sm:py-9">
              <SectionHead
                eyebrow={section.subtitle ?? "Independent shops, one marketplace"}
                title={section.title ?? "Meet the stores"}
                action={
                  <Link href="/stores" className="inline-flex items-center gap-1 text-[12px] font-semibold text-ember hover:underline">
                    All stores <ArrowRight width={14} height={14} />
                  </Link>
                }
                className="mb-3 sm:mb-4"
              />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {shown.map((store) => <StoreCard key={store.id} store={store} />)}
              </div>
            </div>
          </section>
        );
      }

      /* ── The foot of the page ───────────────────────────────────── */
      case "footer": {
        return (
          <div key={section.id ?? index} className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-3 px-4 pb-3 pt-6 text-[11px] text-ink-soft sm:px-6">
            <span>{home.stats.products.toLocaleString()} products across {home.stats.merchants} stores</span>
            <span className="inline-flex items-center gap-1.5 font-semibold text-ember">
              <Boxes width={13} height={13} /> One cart, one checkout
            </span>
          </div>
        );
      }

      /* ── Anything the CMS adds later ────────────────────────────── */
      default:
        return null;
    }
  }

  return <div className="pb-10">{sections.map((section, index) => block(section, index))}</div>;
}

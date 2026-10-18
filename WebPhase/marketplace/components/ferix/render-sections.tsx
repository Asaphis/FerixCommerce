import Link from "next/link";
import {
  ArrowRight, BadgeCheck, ShoppingBag, Store as StoreIcon,
} from "lucide-react";
import { MediaHero } from "@/components/ferix/media-hero";
import { PromoBanner } from "@/components/ferix/banner";
import { CategoryTile, ProductGrid, StoreCard } from "@/components/ferix/cards";
import { FlashSaleBand } from "@/components/ferix/flash-sale";
import { SectionHead } from "@/components/ferix/marks";
import { CmsPromoStrip } from "@/components/ferix/cms-promo-strip";
import { HorizontalRail, SetSwiper } from "@/components/ferix/set-swiper";
import { TileSwiper } from "@/components/ferix/tile-swiper";
import { assetUrl } from "@/lib/api";
import type { Advert, Banner, CatalogueBrand, Category, Collection, Product } from "@/lib/api";
import { isSafeBackground, safeBackgroundStyle, safeColor } from "@/components/shared/colors";

/**
 * One section shape, as it is stored in a CMS document. Fields beyond the
 * four required ones are section-type specific - a product section carries
 * a ``source`` and a ``limit``, a hero carries its own media and copy, and
 * so on - and each case below reads only what it needs.
 */
export type Section = {
  // The four fields every section carries.
  id?: string;
  type?: string;
  title?: string;
  name?: string;
  visible?: boolean;
  position?: number;
  // Fields the hero and promo cases read. Everything optional so a
  // section that has never been opened still typechecks.
  eyebrow?: string;
  subtitle?: string;
  mediaUrl?: string | null;
  mediaOnly?: boolean | string;
  showText?: boolean | string;
  showButtons?: boolean | string;
  kind?: string;
  bannerId?: string;
  ctaLabel?: string;
  ctaHref?: string;
  secondaryLabel?: string;
  secondaryHref?: string;
  align?: string;
  vertical?: string;
  tone?: string;
  scrim?: number;
  message?: string;
  // Section-specific controls.
  source?: string;
  limit?: number | string;
  across?: number | string;
  rowsPerSet?: number | string;
  seeAll?: boolean | string;
  layout?: string;
  // Anything else a case needs and we have not typed yet.
  [key: string]: unknown;
};

function safeSectionColor(value: unknown): string | undefined {
  return safeColor(value);
}

function safeSectionBackground(value: unknown): string | undefined {
  const background = String(value ?? "").trim();
  return isSafeBackground(background) ? background : undefined;
}

function scrimPercent(value: unknown, fallback = 55): number {
  const raw = Number(value);
  if (!Number.isFinite(raw)) return fallback;
  const percentage = raw > 0 && raw <= 1 ? raw * 100 : raw;
  return Math.max(0, Math.min(100, percentage));
}

export function safeSectionHref(value: unknown, fallback: string): string {
  const href = String(value ?? "").trim();
  if (href.startsWith("/") && !href.startsWith("//")) return href;
  if (href && !href.startsWith("\\") && !/^[a-z][a-z0-9+.-]*:/i.test(href) && !/[\u0000-\u0020]/.test(href)) return `/${href}`;
  try {
    const parsed = new URL(href);
    return parsed.protocol === "https:" && parsed.hostname ? href : fallback;
  } catch {
    return fallback;
  }
}

function isSectionOn(value: unknown, fallback: boolean): boolean {
  if (value === undefined || value === null || value === "") return fallback;
  return value === true || ["true", "1", "yes", "on"].includes(String(value).toLowerCase());
}


function tileWidth(across: number) {
  const columns = Math.min(4, Math.max(1, Math.round(across || 2)));
  const widths: Record<number, string> = {
    1: "grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4",
    2: "grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 md:grid-cols-4 lg:grid-cols-4",
    3: "grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-3 md:grid-cols-5 lg:grid-cols-6",
    4: "grid grid-cols-4 gap-2 sm:grid-cols-5 sm:gap-3 md:grid-cols-6 lg:grid-cols-6",
  };
  return widths[columns];
}

function horizontalTileWidth(across: number) {
  const columns = Math.min(4, Math.max(1, Math.round(across || 2)));
  const widths: Record<number, string> = {
    1: "w-[82%] sm:w-[48%] lg:w-[32%]",
    2: "w-[47%] sm:w-[32%] lg:w-[24%]",
    3: "w-[31%] sm:w-[24%] lg:w-[16%]",
    4: "w-[23%] sm:w-[16%] lg:w-[16%]",
  };
  return `shrink-0 snap-start ${widths[columns]}`;
}

function BrandTile({
  record,
  width,
}: {
  record: CatalogueBrand;
  width?: string;
}) {
  const artwork = assetUrl(record.imageUrl);
  return (
    <Link
      href={`/brands/${record.slug}`}
      className="group flex shrink-0 flex-col items-center rounded-[14px] transition-colors"
      style={width ? { width } : undefined}
    >
      {/* Circled, and small. A brand is a badge in a row of badges: the mark in a circle, the
          name under it. The square panel it had made each one as tall as a product card and the
          band competed with the rows beneath it. */}
      <span className="flex justify-center pt-3">
        {artwork ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={artwork}
              alt={record.name}
              className="h-[52px] w-[52px] rounded-full object-cover ring-1 ring-line-warm transition-transform duration-300 group-hover:scale-[1.05]"
            />
          </>
        ) : (
          <span className="grid h-[52px] w-[52px] place-items-center rounded-full bg-bone-soft font-display text-[16px] font-bold text-ink-soft ring-1 ring-line-warm">
            {record.name.slice(0, 1)}
          </span>
        )}
      </span>
      <span className="block px-2 pb-3 pt-2 text-center">
        <span className="block truncate text-[12px] font-semibold text-ink group-hover:text-ember">
          {record.name}
        </span>
      </span>
    </Link>
  );
}

function HomeAdvert({ advert, label }: { advert: Advert; label: string }) {
  const media = assetUrl(advert.mediaUrl);
  const isVideo = advert.kind === "video";
  return (
    <a
      href={safeSectionHref(advert.href, "/browse")}
      className="group grid overflow-hidden rounded-[14px] border border-line-warm bg-white transition-colors hover:border-ember/40 sm:grid-cols-[minmax(0,120px)_minmax(0,1fr)]"
    >
      <span className="relative block min-h-[104px] bg-gradient-to-br from-[#5b3a7a] via-[#8b63b0] to-[#c8a7e0]">
        {media && !isVideo ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={media} alt="" className="h-full w-full object-cover" />
        ) : null}
      </span>
      <span className="flex flex-col justify-center gap-1.5 px-4 py-3.5">
        <span className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-ink-soft">{label}</span>
        <span className="font-display text-[15.5px] font-bold leading-tight text-ink group-hover:text-ember">
          {advert.headline || advert.name || "Something worth a look"}
        </span>
        {advert.body ? <span className="text-[12px] leading-relaxed text-ink-soft">{advert.body}</span> : null}
        <span className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft/80">
          {advert.sponsor ? `Sponsored by ${advert.sponsor}` : "From Ferixas"}
        </span>
      </span>
    </a>
  );
}

export type HomePayload = {
  banners: Banner[];
  brands: CatalogueBrand[];
  categories: Category[];
  collections: Collection[];
  featured: Product[];
  trending: Product[];
  newArrivals: Product[];
  under100: Product[];
  official: Product[];
  stores: { id: string; slug: string; name: string; [key: string]: unknown }[];
  placements?: Record<string, Product[]>;
  stats: { merchants: number };
};

export type RenderSectionsProps = {
  sections: Section[];
  home: HomePayload;
  adverts?: Advert[];
  saved: string[];
  /** "page" is the default - product and store modes override specific cases later. */
  mode?: "page" | "product" | "store";
};

/**
 * Renders a CMS section list in order.
 *
 * One component, one rule: every visible section renders in the order the
 * document stores it. Product sections choose their products from their own
 * ``source`` field, so a section added in the CMS appears on any page that
 * renders its section list - the page decides where, the CMS decides what.
 */
export function RenderSections({ sections, home, adverts = [], saved, mode = "page" }: RenderSectionsProps) {
  const categories = home.categories;
  const brands = home.brands;
  const homeAdverts = adverts;

  function block(section: Section, index: number) {
    const parsedLimit = Number(section.limit);
    const limit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? Math.floor(parsedLimit) : undefined;
    switch (section.type) {
      /* ── The campaign ───────────────────────────────────────────── */
      case "hero_banner": {
        const mediaOnly = section.mediaOnly === true || String(section.mediaOnly) === "true" || section.showText === false || String(section.showText) === "false";
        const usableBanners = home.banners.filter((banner) => (banner as Banner & { active?: boolean }).active !== false);
        const slides = (section.bannerId
          ? usableBanners.filter((banner) => banner.id === section.bannerId)
          : usableBanners).map((banner) => ({
              ...banner,
              ctaHref: safeSectionHref(banner.ctaHref, "/browse"),
              secondaryHref: safeSectionHref(banner.secondaryHref, "/browse"),
            }));
        return (
          <section key={section.id ?? index} className="mx-auto max-w-[1440px] sm:px-5 sm:pt-5">
            {section.mediaUrl ? (
              <MediaHero
                mediaUrl={section.mediaUrl}
                kind={section.kind}
                mediaOnly={mediaOnly}
                eyebrow={section.eyebrow}
                title={section.title}
                description={section.subtitle}
                ctaLabel={section.ctaLabel}
                ctaHref={safeSectionHref(section.ctaHref, "/browse")}
                secondaryLabel={section.secondaryLabel}
                secondaryHref={safeSectionHref(section.secondaryHref, "/browse")}
                align={section.align}
                vertical={section.vertical}
                tone={section.tone}
                scrim={scrimPercent(section.scrim)}
                heightClassName="h-[250px] sm:h-[340px] lg:h-[420px]"
                className="rounded-[3px] rounded-tr-[18px] shadow-[0_10px_28px_rgba(16,45,67,0.10)] max-lg:rounded-none max-lg:shadow-none"
              />
            ) : section.mediaUrl ? null : (
              <PromoBanner
                banners={slides}
                mediaOnly={mediaOnly}
                heightClassName="h-[300px] sm:h-[380px] lg:h-[440px]"
                className="rounded-[3px] rounded-tr-[18px] shadow-[0_10px_28px_rgba(16,45,67,0.10)] max-lg:rounded-none max-lg:shadow-none"
              />
            )}
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
        const mediaOnly = section.mediaOnly === true || String(section.mediaOnly) === "true" || section.showText === false || String(section.showText) === "false";
        const reusableBanner = section.bannerId ? home.banners.find((banner) => banner.id === section.bannerId) : undefined;
        // A section's directly selected media is authoritative; a reusable
        // banner is only the fallback when no direct media has been set.
        const useSectionMedia = Boolean(section.mediaUrl);
        return (
          <section key={section.id ?? index} className="mx-auto max-w-[1440px] px-4 pt-4 sm:px-6">
            <MediaHero
              mediaUrl={useSectionMedia ? section.mediaUrl : reusableBanner?.mediaUrl}
              kind={useSectionMedia ? section.kind : reusableBanner?.kind}
              mediaOnly={mediaOnly || reusableBanner?.showText === false}
              eyebrow={useSectionMedia ? section.eyebrow : reusableBanner?.eyebrow ?? section.eyebrow}
              title={useSectionMedia ? (section.title ?? section.name ?? "") : (reusableBanner?.headline ?? section.title ?? section.name ?? "This week on Ferixas")}
              description={useSectionMedia ? section.subtitle : reusableBanner?.body ?? section.subtitle}
              ctaLabel={useSectionMedia ? section.ctaLabel : reusableBanner?.ctaLabel ?? section.ctaLabel}
              ctaHref={safeSectionHref(useSectionMedia ? section.ctaHref : reusableBanner?.ctaHref ?? section.ctaHref, "/browse")}
              secondaryLabel={useSectionMedia ? section.secondaryLabel : reusableBanner?.secondaryLabel ?? section.secondaryLabel}
              secondaryHref={safeSectionHref(useSectionMedia ? section.secondaryHref : reusableBanner?.secondaryHref ?? section.secondaryHref, "/browse")}
              align={useSectionMedia ? section.align : reusableBanner?.overlay?.align ?? section.align}
              vertical={useSectionMedia ? section.vertical : reusableBanner?.overlay?.vertical ?? section.vertical}
              tone={useSectionMedia ? section.tone : reusableBanner?.overlay?.tone ?? section.tone}
              scrim={scrimPercent(useSectionMedia ? section.scrim : reusableBanner?.overlay?.scrim ?? section.scrim)}
              heightClassName="h-[150px] sm:h-[180px] lg:h-[210px]"
              className="rounded-[3px] rounded-tr-[14px]"
            />
          </section>
        );
      }

      /* ── One line of reassurance ────────────────────────────────── */
      case "promo_strip": {
        const message = String(section.message ?? "").trim();
        if (!message) return null;
        return (
          <CmsPromoStrip
            key={section.id ?? index}
            message={message}
            accentColor={safeSectionColor(section.accentColor)}
            backgroundColor={safeSectionBackground(section.backgroundColor)}
            textColor={safeSectionColor(section.textColor)}
            icon={String(section.icon ?? "")}
            ctaLabel={String(section.ctaLabel ?? "")}
            ctaHref={safeSectionHref(section.ctaHref, "/browse")}
            dismissible={String(section.dismissible) === "true" || section.dismissible === true}
          />
        );
      }

      /* ── Departments ────────────────────────────────────────────── */
      case "category_grid": {
        // Do not apply the legacy `limit` field here: slicing before TileSwiper
        // hides the rest of the departments, so there is nothing left to swipe to.
        const shown = categories.filter((category) => category.showAsTile !== false && String(category.showAsTile) !== "false");
        const textCategories = categories.filter((category) => category.showAsText === true || String(category.showAsText) === "true");
        const arrangement = String((section as { layout?: string }).layout ?? "groups");
        // Departments default to sets of rows when the section does not say otherwise,
        // because that is the arrangement they are shaped for.
        const isGrouped = arrangement === "groups";
        const seeAllDepartments = String((section as { seeAll?: string }).seeAll) !== "false";
        return (
          <section key={section.id ?? index} className="mx-auto max-w-[1440px] px-4 pb-1 pt-5 sm:px-6 sm:pt-7 lg:pt-8" style={safeBackgroundStyle(safeSectionBackground(section.backgroundColor))}>
            <SectionHead
              title={section.title ?? section.name ?? "Shop by department"}
              titleColor={safeSectionColor(section.textColor)}
              action={
                seeAllDepartments ? (
                  <Link href="/departments" className="inline-flex shrink-0 items-center gap-1 text-[12px] font-semibold text-ember hover:underline" style={{ color: safeSectionColor(section.accentColor) }}>
                    See all <ArrowRight width={14} height={14} />
                  </Link>
                ) : null
              }
              className="mb-3"
            />
            {shown.length ? (
              /* The section decides the arrangement: sets of rows swiped for the next set,
                 everything at once, or one row running off the edge. */
              isGrouped ? (
                <TileSwiper
                  categories={shown}
                  /* Two across and two down by default. The next set is a swipe away rather
                     than another screenful of scrolling. */
                  across={Number((section as { across?: number }).across) || 2}
                  rowsPerSet={Number((section as { rowsPerSet?: number }).rowsPerSet) || 2}
                  size="large"
                />
              ) : arrangement === "horizontal" ? (
                <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:gap-3 sm:px-0">
                  {shown.map((category) => (
                    <div key={category.slug} className={horizontalTileWidth(Number(section.across) || 2)}>
                      <CategoryTile category={category} size="large" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className={tileWidth(Number((section as { across?: number }).across) || 2)}>
                  {shown.map((category) => <CategoryTile key={category.slug} category={category} size="large" />)}
                </div>
              )
            ) : null}
            {textCategories.length ? (
              <nav aria-label="More departments" className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
                {textCategories.map((category) => (
                  <Link key={category.slug} href={`/category/${category.slug}`} className="text-[12px] font-medium text-ink-soft underline decoration-line-warm underline-offset-4 transition-colors hover:text-ember">
                    {category.name}
                  </Link>
                ))}
              </nav>
            ) : null}
          </section>
        );
      }

      /* ── Brands ─────────────────────────────────────────────────── */
      case "brand_carousel": {
        if (!brands.length) return null;
        const brandAcross = Math.min(3, Math.max(1, Math.round(Number(section.across) || 2)));
        const brandTileWidth = `min(110px, calc((100% - ${(brandAcross - 1) * 10}px) / ${brandAcross} - 20px))`;
        const brandLayout = String(section.layout ?? "slider");
        const brandGrid = brandLayout === "wrap" || brandLayout === "grid";
        const brandGridColumns = brandAcross === 1
          ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
          : brandAcross === 2
            ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4"
            : "grid-cols-3 sm:grid-cols-4 lg:grid-cols-6";
        const shown = limit ? brands.slice(0, limit) : brands;
        const brandSeeAll = String(section.seeAll) !== "false";
        return (
          <section key={section.id ?? index} className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 sm:py-9" style={safeBackgroundStyle(safeSectionBackground(section.backgroundColor))}>
            <SectionHead
              title={section.title ?? section.name ?? "Shop by brand"}
              titleColor={safeSectionColor(section.textColor)}
              action={
                brandSeeAll ? (
                  <Link href="/brands" className="inline-flex shrink-0 items-center gap-1 text-[12px] font-semibold text-ember hover:underline" style={{ color: safeSectionColor(section.accentColor) }}>
                    All brands <ArrowRight width={14} height={14} />
                  </Link>
                ) : null
              }
              className="mb-3 sm:mb-4"
            />
            <div
              className={brandGrid
                ? `grid gap-3 ${brandGridColumns}`
                : "no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0"}
            >
              {shown.map((brand) => <BrandTile key={brand.slug} record={brand} width={brandTileWidth} />)}
            </div>
          </section>
        );
      }

      /* ── A strip of products ────────────────────────────────────── */
      case "product_carousel":
      case "product_grid": {
        // The backend resolves every source - a manual section from its
        // placements, an automatic feed from the catalogue - into this
        // section's own list. The named rails below remain a fallback for the
        // older sources that predate the section contract.
        const source = String((section as { source?: string }).source || "assigned").toLowerCase();
        const presentation = String((section as { presentation?: string }).presentation || "standard").toLowerCase();
        let products: Product[] = (section.id ? home.placements?.[section.id] : undefined) ?? [];
        if (!products.length && source === "trending") {
          products = home.trending ?? [];
        } else if (!products.length && source === "newest_arrivals") {
          products = home.newArrivals ?? [];
        } else if (!products.length && source === "featured") {
          products = home.featured ?? [];
        } else if (!products.length && (source === "under_100" || source === "under100")) {
          products = home.under100 ?? [];
        } else if (!products.length && source === "official") {
          products = home.official ?? [];
        }
        if (!products.length) return null;
        const shown = limit ? products.slice(0, limit) : products;
        const cardDisplay = {
          accentColor: safeSectionColor(section.accentColor),
          backgroundColor: safeSectionBackground(section.backgroundColor),
          textColor: safeSectionColor(section.textColor),
          showSectionPrice: isSectionOn(section.showSectionPrice, true),
          showCompareAt: isSectionOn(section.showCompareAt, true),
          showLabel: isSectionOn(section.showLabel, true),
          showCountdown: isSectionOn(section.showCountdown, true),
          showRemaining: isSectionOn(section.showRemaining, false),
          showDiscountBadges: isSectionOn(section.showDiscountBadges, true),
        };

        // A timed campaign is its own band: its own words, its own countdown and
        // its own colours, all set in the CMS.
        if (presentation === "flash_sale") {
          const sectionHref = String(section.ctaHref ?? "").trim();
          return (
            <FlashSaleBand
              key={section.id ?? index}
              title={section.title ?? section.name ?? "Flash sale"}
              eyebrow={section.eyebrow}
              subtitle={section.subtitle}
              endsAt={String(section.endsAt ?? "") || undefined}
              countdownLabel={section.countdownLabel as string | undefined}
              showCountdown={String(section.showCountdown ?? "true") !== "false"}
              showDiscountBadges={String(section.showDiscountBadges ?? "true") !== "false"}
              showViewAll={isSectionOn(section.showViewAll, isSectionOn(section.seeAll, true))}
              href={safeSectionHref(sectionHref, "/browse?sort=discount")}
              backgroundColor={section.backgroundColor as string | undefined}
              accentColor={section.accentColor as string | undefined}
              textColor={section.textColor as string | undefined}
              layout={String(section.layout ?? "grid")}
              ctaLabel={String(section.ctaLabel ?? "See all")}
              timerBackgroundColor={section.timerBackgroundColor as string | undefined}
              timerTextColor={section.timerTextColor as string | undefined}
              products={shown}
              savedIds={saved}
              display={cardDisplay}
            />
          );
        }
        const seeAll = String(section.seeAll) !== "false";
        return (
          <section key={section.id ?? index} className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 sm:py-9" style={safeBackgroundStyle(safeSectionBackground(section.backgroundColor))}>
              <SectionHead
              title={section.title ?? section.name ?? "Featured products"}
              titleColor={safeSectionColor(section.textColor)}
              action={seeAll ? (
                <Link href={safeSectionHref(section.ctaHref, "/browse?sort=best")} className="inline-flex items-center gap-1 text-[12px] font-semibold text-ember hover:underline" style={{ color: safeSectionColor(section.accentColor) }}>
                  {String(section.ctaLabel ?? "").trim() || "See all"} <ArrowRight width={14} height={14} />
                </Link>
              ) : null}
              className="mb-3 sm:mb-4"
            />
            {(section as { layout?: string }).layout === "groups" ? (
              <SetSwiper
                products={shown}
                savedIds={saved}
                across={Number(section.across) || 2}
                rowsPerSet={Number((section as { rowsPerSet?: number }).rowsPerSet) || 2}
                display={cardDisplay}
              />
            ) : (section as { layout?: string }).layout === "horizontal" ? (
              <HorizontalRail
                products={shown}
                savedIds={saved}
                across={Number(section.across) || 2}
                display={cardDisplay}
              />
            ) : (
              <ProductGrid products={shown} savedIds={saved} across={Number(section.across) || 2} display={cardDisplay} />
            )}
          </section>
        );
      }

      /* ── A promotion between content sections ───────────────────── */
      case "promo_slots": {
        const slots = homeAdverts.slice(0, limit ?? 2);
        if (!slots.length) return null;
        return (
          <section key={section.id ?? index} className="mx-auto max-w-[1440px] px-4 py-5 sm:px-6 sm:py-6">
            <div className="grid gap-3 sm:grid-cols-2">
              {slots.map((advert) => (
                <HomeAdvert key={advert.id} advert={advert} label={section.title ?? section.subtitle ?? "Advertisement"} />
              ))}
            </div>
          </section>
        );
      }

      /* ── Stores worth following ─────────────────────────────────── */
      case "featured_stores": {
        if (!home.stores.length) return null;
        const shown = limit ? home.stores.slice(0, limit) : home.stores;
        return (
          <section key={section.id ?? index} className="border-y border-line-warm bg-white" style={safeBackgroundStyle(safeSectionBackground(section.backgroundColor))}>
            <div className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 sm:py-9">
              <SectionHead
                title={section.title ?? "Meet the stores"}
                titleColor={safeSectionColor(section.textColor)}
                action={
                  <Link href={safeSectionHref(section.ctaHref, "/stores")} className="inline-flex items-center gap-1 text-[12px] font-semibold text-ember hover:underline" style={{ color: safeSectionColor(section.accentColor) }}>
                    {String(section.ctaLabel ?? "").trim() || "All stores"} <ArrowRight width={14} height={14} />
                  </Link>
                }
                className="mb-3 sm:mb-4"
              />
              <div className={String(section.layout ?? "cards") === "rows"
                ? "grid grid-cols-1 gap-3"
                : "grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"}>
                {shown.map((store) => <StoreCard key={store.id ?? index} store={store as never} />)}
              </div>
            </div>
          </section>
        );
      }

      /* ── The foot of the page ───────────────────────────────────── */
      case "footer": {
        const closing = String(section.message ?? section.title ?? "").trim();
        if (!closing) return null;
        return (
          <div key={section.id ?? index} className="mx-auto max-w-[1440px] px-4 pb-3 pt-6 text-center text-[11px] text-ink-soft sm:px-6" style={{ ...safeBackgroundStyle(safeSectionBackground(section.backgroundColor)), color: safeSectionColor(section.textColor) }}>
            {closing}
            {String(section.ctaLabel ?? "").trim() ? (
              <Link href={safeSectionHref(section.ctaHref, "/browse")} className="ml-2 font-semibold underline underline-offset-2" style={{ color: safeSectionColor(section.accentColor) }}>
                {String(section.ctaLabel)}
              </Link>
            ) : null}
          </div>
        );
      }

      /* ── Anything the CMS adds later ────────────────────────────── */
      default:
        return null;
    }
  }

  return (
    <>
      {sections
        .filter((section) => section && typeof section.type === "string" && section.visible !== false)
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
        .map((section, index) => (section.id ? block(section, index) : null))}
    </>
  );
}

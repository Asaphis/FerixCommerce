import Link from "next/link";
import { ArrowRight, BadgeCheck, ShoppingBag, Store as StoreIcon } from "lucide-react";
import type { CatalogueBrand, Category, Product } from "@/lib/api";
import { assetUrl, getHome, listAdverts, type Advert } from "@/lib/api";
import { savedIds } from "@/lib/data";
import { PromoBanner } from "@/components/ferix/banner";
import { MediaHero } from "@/components/ferix/media-hero";
import { CategoryTile, ProductGrid, StoreCard } from "@/components/ferix/cards";
import { HorizontalRail, SetSwiper } from "@/components/ferix/set-swiper";
import { TileSwiper } from "@/components/ferix/tile-swiper";
import { SectionHead } from "@/components/ferix/marks";
import { RenderSections, type HomePayload, type Section as CmsSection } from "@/components/ferix/render-sections";

/**
 * The storefront homepage, built from the CMS.
 *
 * Every band on this page is a section of the homepage document, rendered in
 * the order the CMS stores and skipped when it is switched off. The page used to
 * draw its own eight bands and ignore the document entirely, so nothing edited
 * in the admin could ever reach the shop.
 *
 * Nothing here is hard-coded. If a section is switched off or removed it stops
 * appearing, and a page with no sections says so rather than drawing an invented
 * layout that the CMS cannot be seen to control.
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
  limit?: number;
  // Section settings arrive from the database as JSON, so switches may be strings.
  across?: number | string;
  layout?: string;
  rowsPerSet?: number | string;
  seeAll?: boolean | string;
  columns?: number;
  perPage?: number;
  showAsTile?: boolean | string;
  showText?: boolean | string;
  showButtons?: boolean | string;
  collection?: string;
  href?: string;
  mediaUrl?: string;
  bannerId?: string;
  kind?: string;
  mediaOnly?: boolean | string;
  align?: string;
  vertical?: string;
  tone?: string;
  scrim?: number | string;
  sponsor?: string;
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

/**
 * How many department tiles sit side by side, from the section.
 *
 * Wider screens take proportionally more, so two on a phone is five on a desktop.
 */
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

/** One brand: artwork edge to edge, its name beneath. Shared by the row and the grid. */
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

export default async function HomePage() {
  const [home, saved] = await Promise.all([getHome(), savedIds()]);

  const catalogue = uniqueProducts([
    ...home.trending,
    ...home.newArrivals,
    ...home.featured,
    ...home.official,
    ...home.under100,
  ]);
  const categories = home.categories.length ? home.categories : categoryFallback(catalogue);
  const brands = home.brands;

  // Adverts placed on the homepage. Only fetched when a slots section asks for
  // them, so a homepage without one costs nothing.
  const document = (home.content ?? {}) as { sections?: Section[] };
  const wantsSlots = (document.sections ?? []).some(
    (section) => section?.type === "promo_slots" && section.visible !== false,
  );
  const homeAdverts = wantsSlots
    ? (await listAdverts("home").catch(() => ({ adverts: [] as Advert[] }))).adverts
    : [];
  const stored = (document.sections ?? [])
    .filter((section) => section && typeof section.type === "string" && section.visible !== false)
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  const sections = stored;


  if (!sections.length) {
    return (
      <div className="mx-auto flex max-w-[520px] flex-col items-center gap-2.5 px-4 py-24 text-center">
        <h1 className="font-display text-[20px] font-semibold text-ink">This page is empty right now</h1>
        <p className="text-[13px] leading-relaxed text-ink-soft">No section is published for this page yet.</p>
        <Link
          href="/browse"
          className="mt-2 inline-flex min-h-10 items-center rounded-[3px] bg-ink px-5 text-[13px] font-semibold text-bone transition-colors hover:bg-ink/90"
        >
          Browse the catalogue
        </Link>
      </div>
    );
  }

  return <div className="pb-10">{RenderSections({ sections: sections as CmsSection[], home: home as unknown as HomePayload, adverts: homeAdverts, saved, mode: "page" as const })}</div>;
}

/**
 * One advertisement, in the flow of the homepage.
 *
 * Labelled, always, and it says who paid when anyone did: a promotion that cannot
 * be told apart from content is a trick, and it costs more trust than the slot
 * earns.
 */
function HomeAdvert({ advert, label }: { advert: Advert; label: string }) {
  const media = assetUrl(advert.mediaUrl);
  const isVideo = advert.kind === "video";
  return (
    <a
      href={advert.href || "/browse"}
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

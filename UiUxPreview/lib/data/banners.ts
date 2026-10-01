import type { Banner, BannerOverlay, HeroSlide, Merchant, Product } from "@/lib/types";
import { isoDaysBack } from "./core";

/** Default overlay: copy on the left, vertically centred, over a dark scrim. */
export const DEFAULT_OVERLAY: BannerOverlay = {
  enabled: true,
  align: "left",
  vertical: "middle",
  scrim: 62,
  tone: "light",
  width: 34,
};

const overlay = (patch: Partial<BannerOverlay> = {}): BannerOverlay => ({
  ...DEFAULT_OVERLAY,
  ...patch,
});

/**
 * Marketplace banners are platform-managed (Admin \u2192 Marketplace). They drive
 * the slider at the top of ferixas.com. The media fills the banner edge to edge;
 * the copy and buttons are overlaid on top of it.
 */
export const MARKETPLACE_BANNERS: Banner[] = [
  {
    id: "bnr_launch",
    kind: "image",
    eyebrow: "Autumn on Ferixas",
    headline: "Seven merchants.\nOne cart. One checkout.",
    body: "Audio, tailoring, home, gaming and pantry goods \u2014 bought together from seven independent stores, delivered separately.",
    ctaLabel: "Shop the marketplace",
    ctaHref: "/browse",
    secondaryLabel: "Meet the stores",
    secondaryHref: "/stores",
    accent: "#e4572e",
    hue: 18,
    mediaUrl: null,
    posterNote: "Marketplace hero",
    duration: 7000,
    active: true,
    order: 0,
    audience: "All shoppers",
    startsAt: isoDaysBack(9, 8),
    endsAt: isoDaysBack(-21, 23),
    impressions: 486210,
    clicks: 31480,
    overlay: overlay(),
  },
  {
    id: "bnr_audio",
    kind: "video",
    eyebrow: "Product spotlight",
    headline: "AuraSound Pro ANC",
    body: "Forty hours of battery, tuned by ear. Now $249 across every store that stocks it.",
    ctaLabel: "View the product",
    ctaHref: "/product/aurasound-pro-anc-headphones",
    secondaryLabel: "More audio",
    secondaryHref: "/browse?category=audio",
    accent: "#2f6f8f",
    hue: 202,
    mediaUrl: null,
    posterNote: "15-second product video \u00b7 1080p",
    duration: 9000,
    active: true,
    order: 1,
    audience: "Audio buyers",
    startsAt: isoDaysBack(4, 8),
    endsAt: isoDaysBack(-10, 23),
    impressions: 291440,
    clicks: 22810,
    overlay: overlay({ scrim: 54, width: 30 }),
  },
  {
    id: "bnr_delivery",
    kind: "image",
    eyebrow: "Delivery",
    headline: "Free delivery over $120",
    body: "Tracked across seven countries, dispatched within one working day by the seller who packs it.",
    ctaLabel: "Start shopping",
    ctaHref: "/browse?sort=best",
    secondaryLabel: "Delivery and returns",
    secondaryHref: "/docs/structure",
    accent: "#1f4b43",
    hue: 168,
    mediaUrl: null,
    posterNote: "Platform message",
    duration: 6000,
    active: true,
    order: 2,
    audience: "All shoppers",
    startsAt: isoDaysBack(30, 8),
    endsAt: isoDaysBack(-30, 23),
    impressions: 512900,
    clicks: 18940,
    overlay: overlay({ align: "center", scrim: 58, width: 28 }),
  },
  {
    id: "bnr_official",
    kind: "video",
    eyebrow: "Ferixas Official Store",
    headline: "Built by the platform",
    body: "Hardware and essentials sold by Ferixas through the same catalog, channels and checkout as every other merchant.",
    ctaLabel: "Open the official store",
    ctaHref: "/store/ferixas-official",
    secondaryLabel: "How the platform works",
    secondaryHref: "/docs/structure",
    accent: "#c9a24d",
    hue: 42,
    mediaUrl: null,
    posterNote: "20-second brand film \u00b7 1080p",
    duration: 8000,
    active: true,
    order: 3,
    audience: "All shoppers",
    startsAt: isoDaysBack(2, 8),
    endsAt: isoDaysBack(-28, 23),
    impressions: 158320,
    clicks: 9410,
    overlay: overlay({ vertical: "bottom", scrim: 68, width: 36 }),
  },
];

/**
 * Storefront hero slides for a merchant, built from their own catalog so a new
 * store opens with a real promotional banner rather than a static headline.
 */
export function heroSlidesFor(merchant: Merchant, catalog: Product[]): HeroSlide[] {
  const top = catalog.filter((p) => p.status === "active").slice(0, 3);
  const [first, second, third] = top;
  const slides: HeroSlide[] = [];

  slides.push({
    id: `slide-${merchant.id}-1`,
    kind: "image",
    headline: merchant.tagline,
    body: merchant.about.slice(0, 150),
    ctaLabel: "Shop the full catalog",
    ctaHref: "/browse",
    mediaUrl: null,
    duration: 7000,
    overlay: overlay({ width: 32 }),
  });

  if (first) {
    slides.push({
      id: `slide-${merchant.id}-2`,
      kind: "video",
      headline: first.title,
      body: `Now ${first.compareAt ? "on offer" : "available"} \u2014 ${first.bullets[0] ?? "shipped within one working day"}.`,
      ctaLabel: "View the product",
      ctaHref: `/product/${first.slug}`,
      mediaUrl: null,
      duration: 9000,
      overlay: overlay({ scrim: 50, width: 28 }),
    });
  }

  if (second) {
    slides.push({
      id: `slide-${merchant.id}-3`,
      kind: "image",
      headline: "Free delivery over $120",
      body: `Tracked delivery from ${merchant.location.split(",")[0]}, with 30-day returns on everything we ship.`,
      ctaLabel: third ? `Shop ${third.category}` : "Shop new arrivals",
      ctaHref: third ? `/browse?category=${third.category}` : "/browse",
      mediaUrl: null,
      duration: 6000,
      overlay: overlay({ align: "center", width: 30 }),
    });
  }

  return slides;
}

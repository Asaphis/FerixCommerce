import type { DesignNode, DesignVersion, Merchant, NodeStyle, NodeType } from "@/lib/types";
import { PRODUCTS, heroSlidesFor } from "@/lib/data";
import { cloneTree } from "./tree";

function n(
  type: NodeType,
  id: string,
  name: string,
  style: NodeStyle & { tokens?: Record<string, string> },
  extra: Partial<DesignNode> = {},
): DesignNode {
  const { tokens, ...clean } = style;
  return { id, type, name, style: clean, tokens, ...extra };
}

/**
 * The storefront a merchant starts from. Every node here is selectable in the
 * Design Engine, and the exact same tree renders the real storefront once
 * published — one document, two surfaces.
 */
export function defaultTree(merchant: Merchant): DesignNode[] {
  const hero = merchant.brand.hero;
  const centered = hero === "centered";
  const banner = hero === "banner";
  const catalog = PRODUCTS.filter((p) => p.merchantId === merchant.id);
  const slides = heroSlidesFor(merchant, catalog);

  return [
    n(
      "header",
      "header",
      "Header",
      {
        display: "flex",
        direction: "row",
        justify: "between",
        align: "center",
        gap: 24,
        paddingY: 18,
        paddingX: 40,
        background: "surface",
        borderWidth: 1,
        borderColor: "line",
      },
      {
        children: [
          n("heading", "header-brand", "Store name", {
            fontSize: 16,
            fontWeight: 800,
            letterSpacing: 0.16,
            color: "ink",
            tokens: { text: "{{store.name}}" },
          }),
          n("nav", "header-nav", "Navigation", {
            display: "flex",
            direction: "row",
            gap: 22,
            align: "center",
            fontSize: 12.5,
            color: "ink",
          }),
          n("cart", "header-cart", "Cart", { fontSize: 12.5, color: "ink" }),
          n("wishlist", "header-wishlist", "Wishlist", { fontSize: 12.5, color: "muted" }),
        ],
      },
    ),
    n(
      "hero",
      "hero",
      "Hero section",
      {
        display: centered ? "flex" : "grid",
        direction: "column",
        columns: centered ? 1 : 2,
        gap: banner ? 24 : 48,
        align: centered ? "center" : "center",
        paddingY: banner ? 88 : 76,
        paddingX: 40,
        background: banner ? "accent" : "canvas",
        textAlign: centered ? "center" : "left",
      },
      {
        slides,
        children: [
          n(
            "heading",
            "hero-heading",
            "Hero headline",
            {
              fontSize: banner ? 46 : 40,
              fontWeight: 800,
              lineHeight: 1.05,
              letterSpacing: -0.03,
              color: banner ? "accentInk" : "ink",
              responsive: { mobile: { fontSize: 30, letterSpacing: -0.02 } },
              tokens: { text: "{{store.tagline}}" },
            },
          ),
          n("paragraph", "hero-copy", "Hero paragraph", {
            fontSize: 15,
            lineHeight: 1.6,
            color: banner ? "accentInk" : "muted",
            opacity: banner ? 0.92 : 1,
            tokens: { text: merchant.about },
          }),
          n("button", "hero-cta", "Primary button", {
            fontSize: 13.5,
            fontWeight: 600,
            paddingX: 20,
            paddingY: 12,
            radius: merchant.brand.radius,
            background: banner ? "accentInk" : "accent",
            color: banner ? "accent" : "accentInk",
            width: centered ? "auto" : "fit-content",
            tokens: { text: "Shop the full catalog" },
          }),
          n("image", "hero-media", "Hero image", {
            width: "100%",
            height: banner ? "180px" : "300px",
            radius: merchant.brand.radius,
            shadow: 2,
          }),
        ],
      },
    ),
    n("trust", "trust", "Trust strip", {
      display: "grid",
      columns: 4,
      gap: 16,
      paddingY: 20,
      paddingX: 40,
      background: "surface",
      borderWidth: 1,
      borderColor: "line",
      fontSize: 12.5,
      color: "muted",
    }),
    n("section", "featured", "Featured collection", {
      display: "flex",
      direction: "column",
      gap: 18,
      paddingY: 56,
      paddingX: 40,
      background: "canvas",
    }, {
      children: [
        n("heading", "featured-heading", "Section heading", {
          fontSize: 24,
          fontWeight: 700,
          color: "ink",
          letterSpacing: -0.02,
          tokens: { text: "Shop by collection" },
        }),
        n("collection", "featured-collection", "Collection list", {
          display: "flex",
          direction: "row",
          gap: 12,
          fontSize: 12.5,
          color: "ink",
        }),
      ],
    }),
    n(
      "section",
      "grid",
      "Product grid section",
      {
        display: "flex",
        direction: "column",
        gap: 20,
        paddingY: 56,
        paddingX: 40,
        background: "surface",
      },
      {
        children: [
          n("heading", "grid-heading", "Grid heading", {
            fontSize: 24,
            fontWeight: 700,
            letterSpacing: -0.02,
            color: "ink",
            tokens: { text: "Featured products" },
          }),
          n(
            "productGrid",
            "grid-products",
            "Product grid",
            { display: "grid", columns: 4, gap: 20, responsive: { tablet: { columns: 3 }, mobile: { columns: 2, gap: 12 } } },
            {
              children: [
                n("productCard", "card-1", "Product card", {
                  display: "flex",
                  direction: "column",
                  gap: 8,
                  paddingX: 0,
                  paddingY: 0,
                  background: "surface",
                  radius: merchant.brand.radius,
                  tokens: {
                    title: "{{product.title}}",
                    price: "{{product.price}}",
                    rating: "{{product.rating}}",
                    badge: "{{product.stock}}",
                  },
                }),
                n("productCard", "card-2", "Product card (2)", { display: "flex", direction: "column", gap: 8, background: "surface", radius: merchant.brand.radius }, { tokens: { title: "{{product.title}}", price: "{{product.price}}", rating: "{{product.rating}}" } }),
                n("productCard", "card-3", "Product card (3)", { display: "flex", direction: "column", gap: 8, background: "surface", radius: merchant.brand.radius }, { tokens: { title: "{{product.title}}", price: "{{product.price}}", rating: "{{product.rating}}" } }),
              ],
            },
          ),
        ],
      },
    ),
    n(
      "banner",
      "banner",
      "Promotional banner",
      {
        display: "flex",
        direction: "column",
        gap: 12,
        align: "start",
        paddingY: 44,
        paddingX: 40,
        background: "ink",
        textAlign: "left",
      },
      {
        children: [
          n("heading", "banner-heading", "Banner heading", {
            fontSize: 26,
            fontWeight: 700,
            color: "canvas",
            letterSpacing: -0.02,
            tokens: { text: "Free delivery over $120" },
          }),
          n("paragraph", "banner-copy", "Banner copy", {
            fontSize: 13.5,
            lineHeight: 1.6,
            color: "canvas",
            opacity: 0.72,
            tokens: { text: "Tracked shipping across seven countries, dispatched within one working day." },
          }),
          n("button", "banner-cta", "Banner button", {
            fontSize: 13,
            fontWeight: 600,
            paddingX: 18,
            paddingY: 10,
            radius: merchant.brand.radius,
            background: "accent",
            color: "accentInk",
            width: "fit-content",
            tokens: { text: "Start shopping" },
          }),
        ],
      },
    ),
    n("section", "reviews-section", "Reviews", {
      display: "flex",
      direction: "column",
      gap: 20,
      paddingY: 56,
      paddingX: 40,
      background: "canvas",
    }, {
      children: [
        n("heading", "reviews-heading", "Reviews heading", {
          fontSize: 24,
          fontWeight: 700,
          color: "ink",
          letterSpacing: -0.02,
          tokens: { text: "What customers say" },
        }),
        n("reviews", "reviews", "Review cards", {
          display: "grid",
          columns: 3,
          gap: 16,
          fontSize: 13,
          color: "ink",
          responsive: { mobile: { columns: 1 } },
        }),
      ],
    }),
    n(
      "footer",
      "footer",
      "Footer",
      {
        display: "grid",
        columns: 4,
        gap: 24,
        paddingY: 44,
        paddingX: 40,
        background: "ink",
        color: "canvas",
      },
      {
        children: [
          n("text", "footer-brand", "Footer brand", {
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: 0.14,
            color: "canvas",
            tokens: { text: "{{store.name}}" },
          }),
          n("text", "footer-links", "Footer links", {
            fontSize: 12.5,
            lineHeight: 1.9,
            color: "canvas",
            opacity: 0.7,
            tokens: { text: "Shipping & returns\nAbout the store\nContact\nWholesale" },
          }),
          n("text", "footer-contact", "Footer contact", {
            fontSize: 12.5,
            lineHeight: 1.9,
            color: "canvas",
            opacity: 0.7,
            tokens: { text: "hello@store.com\n+234 803 411 2290\nLagos, Nigeria" },
          }),
          n("text", "footer-note", "Footer note", {
            fontSize: 11,
            lineHeight: 1.9,
            color: "canvas",
            opacity: 0.55,
            tokens: { text: "Powered by Ferixas Commerce\nPayment and delivery handled once at checkout." },
          }),
        ],
      },
    ),
  ];
}

export function seedVersions(merchant: Merchant): DesignVersion[] {
  const base = defaultTree(merchant);
  return [
    {
      id: "v1",
      label: "Initial storefront",
      createdAt: "2026-08-18T10:12:00.000Z",
      author: `${merchant.name} (owner)`,
      source: "system",
      nodes: cloneTree(base),
    },
    {
      id: "v2",
      label: "Autumn palette and hero copy",
      createdAt: "2026-09-12T15:40:00.000Z",
      author: `${merchant.name} (owner)`,
      source: "manual",
      nodes: cloneTree(base),
    },
    {
      id: "v3",
      label: "Product grid tightened",
      createdAt: "2026-09-27T09:05:00.000Z",
      author: "AI design assistant",
      source: "ai",
      nodes: cloneTree(base),
    },
  ];
}

export const TEMPLATE_PRESETS: Record<
  string,
  { label: string; blurb: string; patch: Record<string, NodeStyle> }
> = {
  FERRUM: {
    label: "Ferrum",
    blurb: "Engineered dark, mono labels, hairline rules",
    patch: {
      header: { background: "surface", borderWidth: 1, paddingY: 16 },
      hero: { background: "canvas", paddingY: 84, gap: 52 },
      "hero-heading": { fontWeight: 800, letterSpacing: -0.035, fontSize: 42 },
      grid: { background: "canvas" },
      "grid-products": { columns: 4, gap: 18 },
      banner: { background: "accent", textAlign: "left" },
      footer: { background: "ink" },
    },
  },
  ATELIER: {
    label: "Atelier",
    blurb: "Editorial fashion, wide margins, small type",
    patch: {
      header: { paddingY: 24, letterSpacing: 0.2, background: "canvas" },
      hero: { background: "canvas", paddingY: 96, gap: 56, textAlign: "center", display: "flex", columns: 1 },
      "hero-heading": { fontSize: 46, fontWeight: 500, letterSpacing: -0.01, lineHeight: 1.12 },
      "hero-cta": { background: "ink", color: "canvas", radius: 0 },
      "grid-products": { columns: 3, gap: 32 },
      footer: { background: "canvas", color: "ink" },
    },
  },
  CIRCUIT: {
    label: "Circuit",
    blurb: "Technical light, dense grids, cyan accents",
    patch: {
      header: { paddingY: 14, background: "surface" },
      hero: { paddingY: 60, gap: 40, background: "canvas" },
      "hero-heading": { fontSize: 36, fontWeight: 700 },
      "grid-products": { columns: 5, gap: 14 },
      trust: { columns: 4, paddingY: 16 },
    },
  },
  HEARTH: {
    label: "Hearth",
    blurb: "Warm natural, generous radii, soft rhythm",
    patch: {
      header: { paddingY: 22, background: "canvas" },
      hero: { paddingY: 88, gap: 44, background: "canvas" },
      "hero-heading": { fontSize: 40, fontWeight: 700, letterSpacing: -0.02 },
      "grid-products": { columns: 3, gap: 24 },
      banner: { background: "surface", color: "ink" },
      footer: { background: "surface", color: "ink" },
    },
  },
  GRID: {
    label: "Grid",
    blurb: "Terminal contrast, tight spacing, mono energy",
    patch: {
      header: { paddingY: 14, background: "surface" },
      hero: { paddingY: 64, gap: 36, background: "canvas" },
      "hero-heading": { fontSize: 38, fontWeight: 800, letterSpacing: -0.03 },
      "grid-products": { columns: 4, gap: 12 },
      banner: { background: "accent", textAlign: "left" },
    },
  },
};

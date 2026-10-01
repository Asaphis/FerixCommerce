import type { Product, ProductStatus, Variant } from "@/lib/types";
import { createRng, isoDaysBack, pickOne, pickMany } from "./core";

// One product record per SKU family. Channel flags decide where it is sold —
// nothing is duplicated per storefront.

type Row = [
  merchantId: string,
  category: string,
  title: string,
  price: number,
  compareAt: number,
  rating: number,
  reviewCount: number,
  stock: number,
  sold: number,
  status: ProductStatus,
  store: 0 | 1,
  marketplace: 0 | 1,
];

const ROWS: Row[] = [
  ["ferixas-official", "electronics", "Ferixas Hub Mini Smart Controller", 189, 229, 4.7, 412, 340, 1840, "active", 1, 1],
  ["ferixas-official", "computing", "Ferixas Dock 8-in-1 USB-C", 129, 0, 4.6, 268, 620, 2210, "active", 1, 1],
  ["ferixas-official", "electronics", "Ferixas Tag Tracker (4-pack)", 79, 99, 4.5, 190, 880, 3140, "active", 1, 1],
  ["ferixas-official", "electronics", "Ferixas Power Bank 20,000mAh", 69, 0, 4.8, 733, 1240, 5820, "active", 1, 1],
  ["ferixas-official", "electronics", "Ferixas Mesh Router AX3000", 219, 249, 4.4, 156, 210, 940, "active", 1, 1],
  ["ferixas-official", "computing", "Ferixas Studio Display Stand", 99, 0, 4.3, 88, 145, 610, "draft", 0, 0],
  ["ferixas-official", "audio", "Ferixas Buds Core", 59, 0, 4.6, 402, 0, 2410, "active", 1, 1],
  ["abc-electronics", "audio", "AuraSound Pro ANC Headphones", 249, 299, 4.8, 486, 132, 1420, "active", 1, 1],
  ["abc-electronics", "audio", "AuraSound Buds Air 2", 99, 129, 4.6, 812, 410, 3860, "active", 1, 1],
  ["abc-electronics", "electronics", "Obsidian 4K Action Camera", 299, 349, 4.7, 214, 78, 720, "active", 1, 1],
  ["abc-electronics", "electronics", "Volt 65W GaN Charger", 45, 0, 4.9, 1024, 1860, 7410, "active", 1, 1],
  ["abc-electronics", "electronics", "Lumen Smart LED Strip 5m", 35, 45, 4.4, 336, 240, 1980, "active", 1, 1],
  ["abc-electronics", "audio", "Pulse Soundbar 2.1 Channel", 329, 379, 4.5, 168, 64, 540, "active", 1, 0],
  ["abc-electronics", "phones", "AuraPhone X2 256GB", 899, 949, 4.6, 292, 46, 380, "active", 1, 1],
  ["abc-electronics", "phones", "Tab Pro 11-inch 128GB", 549, 0, 4.5, 176, 92, 460, "active", 1, 1],
  ["abc-electronics", "electronics", "Ferixas-Compat Wireless Charger Pad", 39, 0, 4.2, 121, 0, 890, "active", 1, 1],
  ["nova-fashion", "fashion", "Silk Blend Oversized Blazer", 178, 0, 4.9, 322, 54, 610, "active", 1, 1],
  ["nova-fashion", "fashion", "Merino Ribbed Knit", 96, 120, 4.8, 418, 168, 1120, "active", 1, 1],
  ["nova-fashion", "fashion", "Tailored Wide-Leg Trousers", 124, 0, 4.7, 236, 96, 740, "active", 1, 1],
  ["nova-fashion", "fashion", "Solstice Leather Tote", 210, 260, 4.9, 188, 38, 420, "active", 1, 1],
  ["nova-fashion", "fashion", "Linen Shirt Dress", 138, 0, 4.6, 264, 112, 880, "active", 1, 1],
  ["nova-fashion", "fashion", "Cashmere Scarf", 88, 0, 4.8, 402, 240, 1460, "active", 1, 0],
  ["nova-fashion", "fashion", "Crystal Drop Earrings", 72, 90, 4.5, 156, 310, 980, "active", 1, 1],
  ["nova-fashion", "fashion", "Wool Blend Overcoat", 340, 0, 4.7, 92, 24, 260, "archived", 1, 1],
  ["urban-home", "home", "Linen Weave Sectional Sofa", 1890, 2190, 4.6, 74, 18, 96, "active", 1, 1],
  ["urban-home", "home", "Terracotta Ceramic Vase Set", 64, 0, 4.7, 288, 420, 1340, "active", 1, 1],
  ["urban-home", "home", "Solid Oak Coffee Table", 420, 480, 4.8, 112, 42, 210, "active", 1, 1],
  ["urban-home", "home", "Handloomed Wool Rug 200x300", 650, 0, 4.5, 86, 26, 148, "active", 1, 1],
  ["urban-home", "home", "Arc Floor Lamp \u2014 Brushed Brass", 245, 0, 4.4, 134, 68, 320, "active", 1, 1],
  ["urban-home", "home", "Stoneware Dinner Set (16-piece)", 148, 178, 4.8, 342, 186, 720, "active", 1, 1],
  ["urban-home", "home", "Waffle Cotton Bedding Set", 189, 0, 4.7, 218, 94, 486, "active", 1, 1],
  ["techzone", "gaming", "Nebula Gaming Laptop 16-inch RTX", 1899, 2099, 4.6, 128, 22, 180, "active", 1, 1],
  ["techzone", "gaming", "Mechanical Keyboard TKL Hot-Swap", 129, 0, 4.8, 424, 268, 1080, "active", 1, 1],
  ["techzone", "computing", "27-inch QHD 165Hz Monitor", 329, 379, 4.5, 196, 74, 420, "active", 1, 1],
  ["techzone", "gaming", "Wireless Gaming Mouse 26K DPI", 79, 0, 4.7, 512, 386, 1620, "active", 1, 1],
  ["techzone", "audio", "Streaming Microphone USB-C", 119, 0, 4.6, 188, 142, 610, "active", 1, 1],
  ["techzone", "gaming", "RGB Gaming Chair \u2014 Ergo", 289, 340, 4.3, 96, 34, 240, "active", 1, 0],
  ["techzone", "computing", "1TB NVMe SSD Gen4", 119, 139, 4.9, 302, 512, 1940, "active", 1, 1],
  ["techzone", "computing", "Nebula Mini Workstation", 1249, 0, 4.4, 42, 14, 68, "draft", 0, 0],
  ["sahel-supply", "pantry", "Shea Butter Cold Pressed 500ml", 24, 0, 4.9, 618, 1420, 4820, "active", 1, 1],
  ["sahel-supply", "pantry", "Single-Origin Coffee 1kg", 32, 38, 4.8, 486, 880, 3120, "active", 1, 1],
  ["sahel-supply", "pantry", "Organic Hibiscus Tea 250g", 18, 0, 4.7, 344, 1640, 5240, "active", 1, 1],
  ["sahel-supply", "home", "Handwoven Storage Basket", 58, 0, 4.6, 212, 320, 880, "active", 1, 1],
  ["sahel-supply", "pantry", "Raw Wildflower Honey 1kg", 29, 34, 4.9, 528, 0, 2140, "active", 1, 1],
  ["meridian-sports", "sports", "Carbon Trail Running Shoes", 165, 195, 4.7, 168, 92, 480, "active", 1, 1],
  ["meridian-sports", "sports", "Adjustable Dumbbell Set 32kg", 399, 469, 4.5, 74, 28, 148, "active", 1, 1],
  ["meridian-sports", "sports", "Yoga Mat \u2014 Natural Rubber", 78, 0, 4.8, 296, 246, 940, "active", 1, 1],
  ["meridian-sports", "sports", "Insulated Bottle 1L", 38, 0, 4.4, 412, 720, 2410, "active", 1, 1],
  ["meridian-sports", "sports", "Compression Training Tights", 68, 84, 4.3, 208, 168, 610, "active", 1, 1],
  ["abc-electronics", "audio", "Ferixas Buds Replacement Tips", 19, 0, 4.1, 88, 400, 700, "archived", 1, 1],
];

const VARIANTS: Record<string, Variant[]> = {
  electronics: [{ name: "Colour", values: ["Graphite", "Ivory", "Clay"] }],
  audio: [{ name: "Colour", values: ["Graphite", "Ivory", "Sand"] }],
  computing: [{ name: "Configuration", values: ["Base", "16GB / 512GB", "32GB / 1TB"] }],
  gaming: [{ name: "Edition", values: ["Standard", "Pro"] }],
  phones: [{ name: "Storage", values: ["256GB", "512GB"] }],
  fashion: [{ name: "Size", values: ["XS", "S", "M", "L", "XL"] }],
  home: [{ name: "Finish", values: ["Natural", "Walnut", "Black"] }],
  beauty: [{ name: "Size", values: ["250ml", "500ml"] }],
  sports: [{ name: "Size", values: ["S", "M", "L", "XL"] }],
  pantry: [{ name: "Weight", values: ["500g", "1kg"] }],
};

const BULLETS: Record<string, string[]> = {
  electronics: ["Ships with regional plug adapters", "Two-year hardware warranty", "Firmware updates for five years"],
  audio: ["Tuned for speech and low-end detail", "Recycled aluminium housing", "Carry pouch and USB-C cable included"],
  computing: ["Benchmarked before dispatch", "VESA mounting compatible", "Cables rated for 100W passthrough"],
  gaming: ["Hot-swappable, no soldering", "Per-key lighting profiles", "Tested across 40 title launches"],
  phones: ["Region-free, dual SIM", "90-day screen replacement cover", "Includes 45W charger"],
  fashion: ["Natural fibre, milled in Portugal", "Cut in runs under 200 pieces", "Free returns within 30 days"],
  home: ["Fits through a standard doorway", "Assembles with the included tool", "Sustainably sourced timber"],
  beauty: ["Cold pressed, unrefined", "No synthetic fragrance", "Refillable glass packaging"],
  sports: ["Tested over 400km of trail", "Machine washable at 30\u00b0C", "Lifetime frame guarantee"],
  pantry: ["Traceable to the farm gate", "Roasted in small lots weekly", "Resealable, compostable pouch"],
};

const DESCRIPTIONS: Record<string, string> = {
  electronics: "Built to disappear into daily use, with the kind of details you only notice after a month.",
  audio: "Tuned by ear, not by curve. Comfortable enough for a full working day and honest about bass.",
  computing: "A workstation-grade part with the boring reliability that actually matters.",
  gaming: "Chosen for people who play competitively and still need to type all day.",
  phones: "Flagship hardware without the flagship markup, shipped with a real charger.",
  fashion: "Cut from natural fibres in limited runs. Designed to be worn for a decade, not a season.",
  home: "Designed for real apartments: honest materials, repairable joints, no flat-pack compromises.",
  beauty: "Cold-processed in small batches with nothing added to stretch the yield.",
  sports: "Equipment for a 45-minute session, built around people with a full working week.",
  pantry: "Sourced directly from cooperatives who are paid above market rate, every season.",
};

const MERCHANT_PREFIX: Record<string, string> = {
  "ferixas-official": "FX",
  "abc-electronics": "ABC",
  "nova-fashion": "NVA",
  "urban-home": "URB",
  techzone: "TZN",
  "sahel-supply": "SHL",
  "meridian-sports": "MER",
};

function slugifyTitle(title: string) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

const rng = createRng(445189);

export const PRODUCTS: Product[] = ROWS.map((row, i) => {
  const [merchantId, category, title, price, compareAt, rating, reviewCount, stock, sold, status, store, marketplace] = row;
  const variants = i % 5 === 3 ? [] : (VARIANTS[category] ?? []);
  const collections: string[] = [];
  if (i % 3 === 0) collections.push("New Arrivals");
  if (rating >= 4.7) collections.push("Best Sellers");
  if (price < 100) collections.push("Under $100");
  if (price >= 400) collections.push("Premium Picks");
  if (category === "fashion") collections.push("Autumn Edit");
  if (category === "home") collections.push("Home Refresh");
  if (category === "computing" || category === "gaming") collections.push("Work From Anywhere");
  if (!collections.length) collections.push(pickOne(["New Arrivals", "Best Sellers", "Premium Picks"], rng));

  return {
    id: `prd_${(2100 + i).toString(36)}${i}`,
    slug: slugifyTitle(title),
    title,
    merchantId,
    category,
    collections,
    description: DESCRIPTIONS[category] ?? "",
    bullets: BULLETS[category] ?? [],
    price,
    compareAt: compareAt || null,
    cost: Math.round(price * (0.52 + ((i * 7) % 17) / 100) * 100) / 100,
    sku: `${MERCHANT_PREFIX[merchantId] ?? "FX"}-${category.slice(0, 2).toUpperCase()}-${1000 + i}`,
    stock,
    lowStockAt: 40,
    rating,
    reviewCount,
    variants,
    plates: 3 + (i % 4),
    status,
    channels: { store: store === 1, marketplace: marketplace === 1 },
    seo: {
      title: `${title} | ${merchantId.split("-").map((w) => w[0].toUpperCase() + w.slice(1)).join(" ")}`,
      description: `${title} \u2014 ${DESCRIPTIONS[category] ?? ""}`.slice(0, 150),
      handle: slugifyTitle(title),
    },
    tags: pickMany(["bestseller", "new", "limited", "eco", "handmade", "clearance", "staff-pick"], 2 + (i % 2), createRng(i + 7)),
    createdAt: isoDaysBack(24 + ((i * 11) % 320), 9, (i * 13) % 60),
    sold30d: Math.max(6, Math.round(sold * (0.2 + (i % 9) / 100))),
    views30d: Math.max(90, Math.round(sold * (9 + (i % 13)))),
  };
});

export const PRODUCT_IDS = PRODUCTS.map((p) => p.id);

export function getProduct(id: string): Product | undefined {
  return PRODUCTS.find((p) => p.id === id);
}

export function getProductBySlug(slug: string): Product | undefined {
  return PRODUCTS.find((p) => p.slug === slug);
}

export function productsOf(merchantId: string): Product[] {
  return PRODUCTS.filter((p) => p.merchantId === merchantId);
}

export function onMarketplace(): Product[] {
  return PRODUCTS.filter((p) => p.status === "active" && p.channels.marketplace);
}

export function catalogValue(merchantId: string) {
  return productsOf(merchantId).reduce((sum, p) => sum + p.price * p.stock, 0);
}

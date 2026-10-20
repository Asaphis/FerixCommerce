import type { MetadataRoute } from "next";

const API = (process.env.FERIX_API_BASE ?? process.env.NEXT_PUBLIC_FERIX_API_BASE ?? "https://shopapi.ferixas.com").replace(/\/+$/, "");
const SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://ferixas.com").replace(/\/+$/, "");

async function getJson<T>(path: string): Promise<T | null> {
  try {
    const response = await fetch(`${API}${path}`, { next: { revalidate: 3600 } });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

/** The public catalogue, so a crawler can reach every buyable page. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const entries: MetadataRoute.Sitemap = [
    { url: `${SITE}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${SITE}/browse`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE}/departments`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE}/collections`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
    { url: `${SITE}/stores`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
  ];

  const products = await getJson<{ items?: { slug?: string }[] }>("/catalog/products?perPage=60");
  for (const product of products?.items ?? []) {
    if (product.slug) entries.push({ url: `${SITE}/product/${product.slug}`, lastModified: now, changeFrequency: "weekly", priority: 0.8 });
  }

  const categories = await getJson<{ categories?: { slug?: string }[] }>("/catalog/categories");
  for (const category of categories?.categories ?? []) {
    if (category.slug) entries.push({ url: `${SITE}/category/${category.slug}`, lastModified: now, changeFrequency: "weekly", priority: 0.7 });
  }

  const stores = await getJson<{ stores?: { slug?: string }[] }>("/catalog/stores");
  for (const store of stores?.stores ?? []) {
    if (store.slug) entries.push({ url: `${SITE}/store/${store.slug}`, lastModified: now, changeFrequency: "weekly", priority: 0.6 });
  }

  return entries;
}

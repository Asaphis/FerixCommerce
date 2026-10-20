import type { MetadataRoute } from "next";

const SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://ferixas.com").replace(/\/+$/, "");

/** Private shopping surfaces stay out of the index; the catalogue does not. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/account", "/cart", "/checkout", "/order/", "/verify", "/reset-password"] }],
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  };
}

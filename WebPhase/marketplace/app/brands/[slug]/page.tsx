import { getHome } from "@/lib/api";
import { CatalogListing } from "@/components/ferix/catalog-listing";

/**
 * A brand's own page.
 *
 * The brand band linked into the browse listing with a filter, so a brand had no address
 * of its own - nothing to share, nothing to bookmark, nothing a shopper could return to.
 * This gives it one.
 *
 * The brand is passed as a filter rather than locked, because the browse listing locks
 * department, collection and store but not brand: a shopper arriving here can still
 * narrow the brand's own products.
 */
export default async function BrandPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  // The API being unreachable must not 404 the page: the slug is a serviceable heading.
  const home = await getHome().catch(() => null);
  const brands = (home as unknown as { brands?: { slug: string; name: string }[] } | null)?.brands ?? [];
  const brand = brands.find((item) => item.slug === slug);
  const name = brand?.name ?? slug;

  return (
    <CatalogListing
      query={{ brand: slug }}
      basePath={`/brands/${slug}`}
      heading={name}
      crumbs={[
        { label: "Home", href: "/" },
        { label: "Explore", href: "/browse" },
        { label: name },
      ]}
    />
  );
}

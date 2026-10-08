import { getHome } from "@/lib/api";
import { CatalogListing } from "@/components/ferix/catalog-listing";

/**
 * A department's own page.
 *
 * Clicking a department used to filter the browse listing in place, so a department never
 * had an address of its own: nothing to share, nothing to bookmark, nothing to link to.
 * This gives it one - the same products, reached by the department, with the department
 * locked so the page cannot wander off it.
 *
 * The listing is the component that already does this work, so it is reused rather than
 * reimplemented.
 */
export default async function DepartmentPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  // The API being unreachable must not 404 the page: the slug is a serviceable heading.
  const home = await getHome().catch(() => null);
  const category = (home?.categories ?? []).find((item) => item.slug === slug);
  const name = category?.name ?? slug;

  return (
    <CatalogListing
      query={{}}
      basePath={`/departments/${slug}`}
      locked={{ category: slug }}
      heading={name}
      crumbs={[
        { label: "Home", href: "/" },
        { label: "Explore", href: "/browse" },
        { label: name },
      ]}
    />
  );
}

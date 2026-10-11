import { CatalogListing } from "@/components/ferix/catalog-listing";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const raw = query.q;
  const term = Array.isArray(raw) ? raw[0] : raw;
  return <CatalogListing query={query} basePath="/search" heading={term ? `Results for “${term}”` : "Search the marketplace"} />;
}

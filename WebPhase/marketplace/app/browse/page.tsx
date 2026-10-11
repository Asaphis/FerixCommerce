import { CatalogListing, type Query } from "@/components/ferix/catalog-listing";

export const metadata = {
  title: "Browse products — Ferixas",
  description: "Browse products by department, price, store, and rating.",
};

export default async function BrowsePage({ searchParams }: { searchParams: Promise<Query> }) {
  const query = await searchParams;
  return (
    <CatalogListing
      query={query}
      basePath="/browse"
      heading="All departments"
      crumbs={[{ label: "Home", href: "/" }, { label: "Browse" }]}
    />
  );
}

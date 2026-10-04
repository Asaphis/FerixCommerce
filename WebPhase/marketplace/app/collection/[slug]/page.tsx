import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getCollections } from "@/lib/api";
import { CatalogListing, type Query } from "@/components/ferix/catalog-listing";
import { Eyebrow } from "@/components/ferix/marks";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const feed = await getCollections().catch(() => ({ collections: [] }));
  const collection = feed.collections.find((item) => item.slug === slug);
  return {
    title: collection ? `${collection.name} — Ferixas` : "Collection — Ferixas",
    description: collection?.blurb ?? "A curated edit from across the marketplace.",
  };
}

export default async function CollectionPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Query>;
}) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const feed = await getCollections().catch(() => ({ collections: [] }));
  const collection = feed.collections.find((item) => item.slug === slug);
  if (!collection) notFound();

  return (
    <>
      <section className="bg-void">
        <div className="mx-auto max-w-[1240px] px-4 py-6 lg:px-6 lg:py-9">
          <Link
            href="/collections"
            className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-chalk-dim transition-colors hover:text-lime"
          >
            <ArrowLeft width={12} height={12} /> All collections
          </Link>
          <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
            <div className="min-w-0">
              <Eyebrow className="text-lime">Curated edit</Eyebrow>
              <h2 className="mt-2 font-display text-[24px] font-semibold leading-tight text-chalk lg:text-[34px]">
                {collection.name}
              </h2>
              <p className="mt-2 max-w-[64ch] text-[13px] leading-relaxed text-chalk-dim lg:text-[13.5px]">
                {collection.blurb}
              </p>
            </div>
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-chalk-dim">
              {collection.count} product{collection.count === 1 ? "" : "s"}
            </p>
          </div>
        </div>
      </section>

      <CatalogListing
        query={query}
        basePath={`/collection/${collection.slug}`}
        locked={{ collection: collection.slug }}
        heading={collection.name}
        crumbs={[
          { label: "Home", href: "/" },
          { label: "Collections", href: "/collections" },
          { label: collection.name },
        ]}
      />
    </>
  );
}

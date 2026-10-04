import { getCollections } from "@/lib/api";
import { CollectionCard } from "@/components/ferix/cards";
import { EmptyState, Eyebrow, LinkButton } from "@/components/ferix/marks";

export const metadata = {
  title: "Collections — Ferixas",
  description: "Curated edits that pull products from across every merchant store on the marketplace.",
};

export default async function CollectionsPage() {
  const feed = await getCollections().catch(() => ({ collections: [] }));

  return (
    <div className="mx-auto max-w-[1240px] px-4 py-6 lg:px-6 lg:py-8">
      <Eyebrow>Curated by Ferixas</Eyebrow>
      <h1 className="mt-2 font-display text-[24px] font-semibold leading-tight text-ink lg:text-[32px]">Collections</h1>
      <p className="mt-2 max-w-[68ch] text-[13px] leading-relaxed text-ink-soft lg:text-[13.5px]">
        Each edit gathers products from several sellers around one idea, so you can shop a look or a need without
        hopping between storefronts. Everything still goes into one cart.
      </p>

      {feed.collections.length ? (
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {feed.collections.map((collection) => (
            <CollectionCard key={collection.slug} collection={collection} />
          ))}
        </div>
      ) : (
        <div className="mt-6">
          <EmptyState
            title="No collections published yet"
            body="New edits are put together regularly. Browse the departments in the meantime."
            action={<LinkButton href="/browse">Browse everything</LinkButton>}
          />
        </div>
      )}
    </div>
  );
}

import Link from "next/link";
import { listStores } from "@/lib/api";
import { StoreCard } from "@/components/ferix/cards";
import { AutoForm } from "@/components/ferix/add-to-cart";
import { Eyebrow } from "@/components/ferix/marks";

export default async function StoresPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sort?: string }>;
}) {
  const { q, sort } = await searchParams;
  const { stores, total } = await listStores({ search: q, sort: sort ?? "top" });

  return (
    <div className="mx-auto max-w-[1240px] px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Eyebrow>Merchant stores</Eyebrow>
          <h1 className="mt-2 font-display text-[28px] font-semibold text-ink">Every store on Ferixas</h1>
          <p className="mt-2 max-w-[62ch] text-[13.5px] leading-relaxed text-ink-soft">
            Each store runs its own branded shopfront, and the same catalogue feeds the marketplace.
            Buy from several in one order and they ship separately.
          </p>
        </div>
        <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-soft">{total} stores trading</p>
      </div>

      <AutoForm action="/stores" method="get" className="mt-6 flex flex-wrap items-center gap-3">
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search stores by name"
          className="h-10 w-full rounded-[2px] border border-line-warm bg-white px-3 text-[13.5px] text-ink outline-none focus:border-ink sm:w-[280px]"
        />
        <label className="flex items-center gap-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft">Sort</span>
          <select
            name="sort"
            defaultValue={sort ?? "top"}
            className="h-10 rounded-[2px] border border-line-warm bg-white px-2 text-[12.5px] text-ink outline-none focus:border-ink"
          >
            <option value="top">Top rated</option>
            <option value="products">Most products</option>
            <option value="new">Newest</option>
          </select>
        </label>
        <noscript>
          <button type="submit" className="rounded-[2px] border border-ink/25 px-3 py-2.5 text-[12.5px] font-semibold text-ink">
            Apply
          </button>
        </noscript>
      </AutoForm>

      {stores.length ? (
        <div className="mt-8 grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-3">
          {stores.map((store) => (
            <StoreCard key={store.id} store={store} />
          ))}
        </div>
      ) : (
        <p className="mt-8 rounded-[3px] border border-dashed border-line-warm px-6 py-10 text-center text-[13.5px] text-ink-soft">
          No store matches that name.{" "}
          <Link href="/stores" className="text-ink underline decoration-ember decoration-2 underline-offset-4">
            Show every store
          </Link>
        </p>
      )}
    </div>
  );
}

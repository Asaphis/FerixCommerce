import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { requireMerchant } from "@/lib/data";
import { listProducts } from "@/lib/api";
import { FilterForm } from "@/components/studio/controls";
import { Empty, Eyebrow, Panel, Pill } from "@/components/studio/bits";
import { Thumb } from "@/components/studio/marks";
import { money, num, titleCase } from "@/lib/format";
import { cn } from "@/lib/utils";

const SORTS = [
  { id: "new", label: "Newest" },
  { id: "sold", label: "Best selling" },
  { id: "stock", label: "Lowest stock" },
  { id: "price", label: "Highest price" },
  { id: "title", label: "A to Z" },
];

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; status?: string; sort?: string; channel?: string }>;
}) {
  const { search, status, sort, channel } = await searchParams;
  const { session } = await requireMerchant();
  const data = await listProducts(session, {
    search,
    status: status ?? "all",
    sort: sort ?? "new",
    channel,
  });

  const filters = [
    { id: "all", label: "All", count: data.counts.all },
    { id: "active", label: "Published", count: data.counts.active },
    { id: "draft", label: "Drafts", count: data.counts.draft },
    { id: "archived", label: "Archived", count: data.counts.archived },
  ];

  return (
    <div className="grid gap-5">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Eyebrow>Catalogue</Eyebrow>
          <h1 className="mt-1.5 font-display text-[23px] font-semibold text-chalk">Products</h1>
          <p className="mt-1.5 max-w-[70ch] text-[13px] leading-relaxed text-chalk-dim">
            One product record per item. Choose per product whether it sells in your own store, on the
            Ferixas marketplace, or both.
          </p>
        </div>
        <Link
          href="/products/new"
          className="inline-flex items-center gap-2 rounded-[2px] bg-lime px-4 py-2.5 text-[12.5px] font-semibold text-void transition-colors hover:bg-chalk"
        >
          <Plus width={14} height={14} /> New product
        </Link>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {filters.map((filter) => (
            <Link
              key={filter.id}
              href={filter.id === "all" ? "/products" : `/products?status=${filter.id}`}
              className={cn(
                "rounded-[2px] border px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] transition-colors",
                (status ?? "all") === filter.id
                  ? "border-lime/40 bg-lime/10 text-lime"
                  : "border-hairline text-chalk-dim hover:border-chalk-dim hover:text-chalk",
              )}
            >
              {filter.label}
              <span className="ml-2 opacity-70">{filter.count}</span>
            </Link>
          ))}
        </div>

        <FilterForm action="/products" className="flex flex-wrap items-center gap-2">
          <label className="relative flex items-center">
            <Search width={14} height={14} className="pointer-events-none absolute left-2.5 text-chalk-dim" />
            <input
              name="search"
              defaultValue={search ?? ""}
              placeholder="Search title or SKU"
              className="h-9 w-[220px] rounded-[2px] border border-hairline bg-panel-2 pl-8 pr-3 text-[12.5px] text-chalk outline-none placeholder:text-chalk-dim/60 focus:border-chalk-dim"
            />
          </label>
          <label className="flex items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-chalk-dim">Sort</span>
            <select
              name="sort"
              defaultValue={sort ?? "new"}
              className="h-9 rounded-[2px] border border-hairline bg-panel-2 px-2 text-[12.5px] text-chalk outline-none focus:border-chalk-dim"
            >
              {SORTS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-chalk-dim">Channel</span>
            <select
              name="channel"
              defaultValue={channel ?? ""}
              className="h-9 rounded-[2px] border border-hairline bg-panel-2 px-2 text-[12.5px] text-chalk outline-none focus:border-chalk-dim"
            >
              <option value="">Every channel</option>
              <option value="store">My store</option>
              <option value="marketplace">Marketplace</option>
            </select>
          </label>
        </FilterForm>
      </div>

      {data.items.length ? (
        <Panel flush>
          <div className="p-5 md:overflow-x-auto">
            <table className="w-full min-w-0 border-collapse text-left md:min-w-[860px]">
              <thead>
                <tr className="hidden md:table-row">
                  {["Product", "SKU", "Price", "Stock", "Sold 30d", "Channels", "Status", ""].map((head) => (
                    <th
                      key={head}
                      className="border-b border-hairline pb-2.5 font-mono text-[10px] font-normal uppercase tracking-[0.14em] text-chalk-dim"
                    >
                      {head}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.items.map((product) => (
                  <tr
                    key={product.id}
                    className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-hairline/60 py-3 last:border-0 md:table-row md:py-0"
                  >
                    <td className="w-full min-w-0 py-0 md:w-auto md:py-3 md:pr-4">
                      <div className="flex items-center gap-3">
                        <Thumb seed={product.slug} className="h-10 w-10 shrink-0" />
                        <div className="min-w-0">
                          <Link
                            href={`/products/${product.slug}`}
                            className="block truncate text-[13px] font-medium text-chalk hover:text-lime md:max-w-[260px]"
                          >
                            {product.title}
                          </Link>
                          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-chalk-dim">
                            {titleCase(product.category)}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="hidden py-3 pr-4 font-mono text-[11.5px] text-chalk-dim md:table-cell">{product.sku}</td>
                    <td className="py-0 md:py-3 md:pr-4">
                      <span className="font-mono text-[12.5px] text-chalk">{money(product.price)}</span>
                      {product.compareAt ? (
                        <span className="ml-2 font-mono text-[11px] text-chalk-dim line-through">
                          {money(product.compareAt)}
                        </span>
                      ) : null}
                    </td>
                    <td className="py-0 md:py-3 md:pr-4">
                      <span
                        className={cn(
                          "font-mono text-[12.5px] tabular-nums",
                          product.stock <= 0 ? "text-ember-soft" : product.stock <= data.lowStockAt ? "text-sand" : "text-chalk",
                        )}
                      >
                        {product.stock}
                      </span>
                    </td>
                    <td className="hidden py-3 pr-4 font-mono text-[12.5px] tabular-nums text-chalk-dim md:table-cell">
                      {num(product.sold30d)}
                    </td>
                    <td className="py-0 md:py-3 md:pr-4">
                      <div className="flex flex-wrap gap-1.5">
                        {product.channels.store ? <Pill tone="lime">Store</Pill> : null}
                        {product.channels.marketplace ? <Pill tone="info">Market</Pill> : null}
                        {!product.channels.store && !product.channels.marketplace ? (
                          <Pill tone="warn">Not selling</Pill>
                        ) : null}
                      </div>
                    </td>
                    <td className="py-0 md:py-3 md:pr-4">
                      <Pill
                        tone={product.status === "active" ? "success" : product.status === "draft" ? "warn" : "neutral"}
                      >
                        {product.status}
                      </Pill>
                    </td>
                    <td className="ml-auto py-0 text-right md:py-3">
                      <Link
                        href={`/products/${product.slug}`}
                        className="inline-flex min-h-[44px] items-center font-mono text-[10px] uppercase tracking-[0.14em] text-lime hover:underline"
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      ) : (
        <Empty
          title="No products match"
          body="Try clearing the search or the status filter, or add a new product to the catalogue."
        />
      )}

      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-chalk-dim/70">
        {data.total} shown · {data.counts.all} in the catalogue · low stock at {data.lowStockAt} units
      </p>
    </div>
  );
}

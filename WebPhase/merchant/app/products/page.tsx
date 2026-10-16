import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { requireMerchant } from "@/lib/data";
import { listProducts } from "@/lib/api";
import { FilterForm } from "@/components/studio/controls";
import { Empty, Pill } from "@/components/studio/bits";
import { CellLabel, DataTable, Row, TablePanel, Td, TdDetail, TdEnd, TdLead } from "@/components/studio/table";
import { Thumb } from "@/components/studio/marks";
import { setProductDestinationAction } from "@/lib/actions";
import { money, num, titleCase } from "@/lib/format";
import { cn } from "@/lib/utils";

const SORTS = [
  { id: "new", label: "Newest" },
  { id: "sold", label: "Best selling" },
  { id: "stock", label: "Lowest stock" },
  { id: "price", label: "Highest price" },
  { id: "title", label: "A to Z" },
];

const DESTINATIONS = [
  { id: "all", label: "Every destination" },
  { id: "marketplace", label: "Ferixas" },
  { id: "store", label: "My website" },
];

/** One place that builds this list's URLs, so a filter never drops another. */
function productHref(params: { status?: string; sort?: string; search?: string; channel?: string }) {
  const query = new URLSearchParams();
  if (params.status && params.status !== "all") query.set("status", params.status);
  if (params.sort && params.sort !== "new") query.set("sort", params.sort);
  if (params.search) query.set("search", params.search);
  if (params.channel && params.channel !== "all") query.set("channel", params.channel);
  const value = query.toString();
  return value ? `/products?${value}` : "/products";
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; status?: string; sort?: string; channel?: string; notice?: string; submitted?: string }>;
}) {
  const { search, status, sort, channel, notice, submitted } = await searchParams;
  const { session } = await requireMerchant();
  const data = await listProducts(session, {
    search,
    status: status ?? "all",
    sort: sort ?? "new",
    channel: channel ?? "all",
  });
  const submittedProduct = submitted ? data.items.find((item) => item.id === submitted) : undefined;

  const filters = [
    { id: "all", label: "All", count: data.counts.all },
    { id: "approved", label: "Published", count: data.counts.approved },
    { id: "pending_review", label: "Pending Review", count: data.counts.pending_review },
    { id: "rejected", label: "Rejected", count: data.counts.rejected },
    { id: "draft", label: "Drafts", count: data.counts.draft },
    { id: "archived", label: "Archived", count: data.counts.archived },
  ];

  return (
    <div className="grid gap-5">
      {submitted ? (
        submittedProduct ? (
          <p role="status" className="rounded-[3px] border border-lime/40 bg-lime/10 px-3.5 py-3 text-[12.5px] text-chalk">
            <strong>{submittedProduct.title}</strong> was submitted for Admin review. It is below under Pending Review.
          </p>
        ) : (
          <p role="alert" className="rounded-[3px] border border-sand/40 bg-sand/10 px-3.5 py-3 text-[12.5px] text-chalk">
            The submission was accepted, but the product library did not return it. Refresh this page before retrying. Reference: {submitted}
          </p>
        )
      ) : notice ? (
        <p className="rounded-[3px] border border-lime/40 bg-lime/10 px-3.5 py-3 text-[12.5px] text-chalk">{notice}</p>
      ) : null}
      <header className="shrinkable flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="mt-1.5 font-display text-[23px] font-semibold text-chalk">Products</h1>
        </div>
        <Link
          href="/products/new"
          className="inline-flex min-h-11 items-center gap-2 rounded-[2px] bg-lime px-4 py-2.5 text-[12.5px] font-semibold text-void transition-colors hover:bg-chalk"
        >
          <Plus width={14} height={14} /> New product
        </Link>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {filters.map((filter) => (
            <Link
              key={filter.id}
              href={productHref({ status: filter.id, sort, search, channel })}
              className={cn(
                "min-h-11 rounded-[2px] border px-3 py-2 font-mono text-[10.5px] uppercase tracking-[0.14em] transition-colors",
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
              className="h-11 w-full rounded-[2px] sm:w-[220px] border border-hairline bg-panel-2 pl-8 pr-3 text-[12.5px] text-chalk outline-none placeholder:text-chalk-dim/60 focus:border-chalk-dim"
            />
          </label>
          <label className="flex items-center gap-2">
            <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-chalk-dim">Sort</span>
            <select
              name="sort"
              defaultValue={sort ?? "new"}
              className="h-11 rounded-[2px] border border-hairline bg-panel-2 px-2 text-[12.5px] text-chalk outline-none focus:border-chalk-dim"
            >
              {SORTS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </FilterForm>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-chalk-dim">Sold on</span>
        {DESTINATIONS.map((option) => (
          <Link
            key={option.id}
            href={productHref({ status, sort, search, channel: option.id })}
            className={cn(
              "min-h-11 rounded-[2px] border px-2.5 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.14em] transition-colors",
              (channel ?? "all") === option.id
                ? "border-lime/40 bg-lime/10 text-lime"
                : "border-hairline text-chalk-dim hover:border-chalk-dim hover:text-chalk",
            )}
          >
            {option.label}
          </Link>
        ))}
      </div>

      {data.items.length ? (
        <TablePanel>
          <DataTable
            head={["Product", "SKU", "Price", "Stock", "Sold 30d", "Listing", "Status", ""]}
            minWidth={820}
            className="p-5"
          >
            {data.items.map((product) => (
              <Row key={product.id}>
                <TdLead>
                  <div className="flex items-center gap-3">
                    <Thumb seed={product.slug} className="h-10 w-10 shrink-0" />
                    <div className="min-w-0">
                      <Link
                        href={`/products/${product.id}`}
                        className="block truncate text-[13px] font-medium text-chalk hover:text-lime md:max-w-[260px]"
                      >
                        {product.title}
                      </Link>
                      <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-chalk-dim">
                        {titleCase(product.category)}
                      </p>
                    </div>
                  </div>
                </TdLead>
                <TdDetail className="font-mono text-[11.5px] text-chalk-dim">{product.sku}</TdDetail>
                <Td>
                  <span className="font-mono text-[12.5px] text-chalk">{money(product.price)}</span>
                  {product.compareAt ? (
                    <span className="ml-2 font-mono text-[11px] text-chalk-dim line-through">
                      {money(product.compareAt)}
                    </span>
                  ) : null}
                </Td>
                <Td>
                  <CellLabel>Stock</CellLabel>
                  <span
                    className={cn(
                      "font-mono text-[12.5px] tabular-nums",
                      product.stock <= 0 ? "text-ember-soft" : product.stock <= data.lowStockAt ? "text-sand" : "text-chalk",
                    )}
                  >
                    {product.stock}
                  </span>
                </Td>
                <TdDetail className="font-mono text-[12.5px] tabular-nums text-chalk-dim">
                  {num(product.sold30d)}
                </TdDetail>
                <Td>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {product.channels?.marketplace ? <Pill tone="info">Ferixas</Pill> : null}
                    {product.channels?.store ? <Pill tone="neutral">My website</Pill> : null}
                  </div>
                  <form action={setProductDestinationAction} className="mt-2">
                    <input type="hidden" name="id" value={product.id} />
                    {product.channels?.marketplace ? (
                      <>
                        <input type="hidden" name="store" value={product.channels.store ? "off" : "on"} />
                        <button
                          type="submit"
                          className="cursor-pointer font-mono text-[10.5px] uppercase tracking-[0.14em] text-lime hover:underline"
                        >
                          {product.channels.store ? "Remove from my website" : "Use on my website"}
                        </button>
                      </>
                    ) : (
                      <>
                        <input type="hidden" name="marketplace" value="on" />
                        <button
                          type="submit"
                          className="cursor-pointer font-mono text-[10.5px] uppercase tracking-[0.14em] text-lime hover:underline"
                        >
                          Submit to Ferixas
                        </button>
                      </>
                    )}
                  </form>
                </Td>
                <Td>
                  <Pill
                    tone={
                      product.status === "approved"
                        ? "success"
                        : product.status === "pending_review"
                        ? "warn"
                        : product.status === "rejected"
                        ? "danger"
                        : "neutral"
                    }
                  >
                    {product.status === "pending_review"
                      ? "Pending Review"
                      : product.status === "rejected"
                      ? "Rejected"
                      : titleCase(product.status)}
                  </Pill>
                </Td>
                <TdEnd>
                  <Link
                    href={`/products/${product.id}`}
                    className="inline-flex min-h-[44px] items-center font-mono text-[10.5px] uppercase tracking-[0.14em] text-lime hover:underline"
                  >
                    Edit
                  </Link>
                </TdEnd>
              </Row>
            ))}
          </DataTable>
        </TablePanel>
      ) : (
        <Empty
          title="No products match"
          body="Try clearing the search or the status filter, or add a new product to the catalogue."
        />
      )}

    </div>
  );
}

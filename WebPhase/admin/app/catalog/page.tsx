import Link from "next/link";
import { Boxes, Plus, Search, Store } from "lucide-react";
import { requireAdmin } from "@/lib/data";
import { listCatalog } from "@/lib/api";
import { FilterForm, SubmitButton } from "@/components/ops/controls";
import { inputClass, selectClass } from "@/components/ops/table";
import { Empty, Eyebrow, Panel, PanelHead, Pill, Readout } from "@/components/ops/bits";
import { deleteCatalogProductAction } from "@/lib/ops-actions";
import { money, num, titleCase } from "@/lib/format";

const STATUS_TONE: Record<string, "mint" | "amber" | "neutral" | "rose"> = {
  active: "mint",
  draft: "amber",
  archived: "neutral",
};

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; category?: string; status?: string; owner?: string }>;
}) {
  const { search, category, status, owner } = await searchParams;
  const { session } = await requireAdmin();
  const data = await listCatalog(session, {
    search,
    category: category ?? "all",
    status: status ?? "all",
    // The catalogue is the platform's own stock. A seller's products belong to that seller
    // and are reached from their page; asking for every owner was showing the
    // marketplace in what is meant to be our own shelf.
    owner: owner ?? "official",
  });

  const official = data.counts.official ?? 0;
  const seller = data.counts.seller ?? 0;
  const value = data.products.reduce((sum, product) => sum + product.price * product.stock, 0);

  return (
    <div className="grid min-w-0 gap-5">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Eyebrow>Catalogue</Eyebrow>
          <h1 className="mt-1.5 font-display text-[23px] font-semibold text-chalk">Products</h1>
          
        </div>
        <Link
          href="/catalog/new"
          className="inline-flex items-center gap-2 rounded-[2px] bg-signal px-3.5 py-2.5 text-[12.5px] font-medium text-void transition-colors hover:bg-chalk"
        >
          <Plus width={14} height={14} />
          Upload product
        </Link>
      </header>

      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 xl:grid-cols-4">
        <Readout label="Products" value={num(data.total)} sub={`${data.counts.active ?? 0} active`} icon={<Boxes width={15} height={15} />} />
        <Readout label="Ferixas Official" value={num(official)} sub="Owned by the platform" tone="violet" />
        <Readout label="Seller listings" value={num(seller)} sub="From merchants" tone="mint" />
        <Readout label="Stock value" value={money(value, { cents: false })} sub="At listed price" tone="amber" />
      </div>

      <Panel>
        <PanelHead title="Filters" />
        <FilterForm action="/catalog" className="grid grid-cols-2 gap-2.5 md:gap-3 xl:grid-cols-4">
          <label className="relative block">
            <Search width={14} height={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-chalk-dim" />
            <input name="search" defaultValue={search ?? ""} placeholder="Title or SKU" className={`${inputClass} pl-9`} />
          </label>
          <select name="category" defaultValue={category ?? "all"} className={selectClass}>
            <option value="all">Every category</option>
            {data.categories.map((slug) => (
              <option key={slug} value={slug}>
                {titleCase(slug)}
              </option>
            ))}
          </select>
          <select name="status" defaultValue={status ?? "all"} className={selectClass}>
            <option value="all">Every status</option>
            <option value="active">Active</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </select>
          <select name="owner" defaultValue={owner ?? "official"} className={selectClass}>
            <option value="official">Our products</option>
            <option value="all">Every owner, including sellers</option>
            <option value="official">Ferixas Official</option>
            <option value="seller">Merchant sellers</option>
          </select>
        </FilterForm>
      </Panel>

      {data.products.length === 0 ? (
        <Empty title="No products match" body="Clear the filters, or upload the first Ferixas Official product." />
      ) : (
        <Panel flush className="overflow-hidden">
          <div className="min-w-0 md:overflow-x-auto">
            <table className="w-full min-w-0 border-collapse text-left md:min-w-[900px]">
              <thead>
                <tr className="hidden border-b border-hairline md:table-row">
                  {["Product", "Owner", "Price", "Stock", "Channels", "Status", ""].map((head) => (
                    <th key={head} className="px-4 py-3 font-mono text-[9.5px] uppercase tracking-[0.14em] text-chalk-dim">
                      {head}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.products.map((product) => (
                  <tr
                    key={product.id}
                    className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-hairline px-4 py-3 last:border-0 hover:bg-panel-2 md:table-row md:px-0 md:py-0"
                  >
                    <td className="w-full min-w-0 px-0 py-0 md:w-auto md:px-4 md:py-3">
                      <div className="flex items-center gap-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={product.image}
                          alt={product.title}
                          className="h-10 w-10 shrink-0 rounded-[2px] border border-hairline object-cover"
                        />
                        <div className="min-w-0">
                          <Link
                            href={`/catalog/${product.slug}`}
                            className="block truncate font-display text-[13px] font-semibold text-chalk hover:text-signal"
                          >
                            {product.title}
                          </Link>
                          <p className="mt-0.5 font-mono text-[10px] text-chalk-dim">
                            {product.sku || "no sku"} · {titleCase(product.category)}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="hidden px-4 py-3 md:table-cell">
                      <span className="inline-flex items-center gap-1.5 text-[12.5px] text-chalk-dim">
                        <Store width={13} height={13} />
                        {product.merchantName}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-[12.5px] tabular-nums text-chalk">
                      {money(product.price)}
                      {product.compareAt ? (
                        <span className="ml-2 text-[11px] text-chalk-dim line-through">{money(product.compareAt)}</span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 font-mono text-[12.5px] tabular-nums text-chalk-dim">{num(product.stock)}</td>
                    <td className="hidden px-4 py-3 md:table-cell">
                      <div className="flex flex-wrap gap-1.5">
                        {product.channels.store ? <Pill tone="mint">store</Pill> : null}
                        {product.channels.marketplace ? <Pill tone="signal">marketplace</Pill> : null}
                        {product.featured ? <Pill tone="violet">featured</Pill> : null}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Pill tone={STATUS_TONE[product.status] ?? "neutral"}>{product.status}</Pill>
                    </td>
                    <td className="px-4 py-3">
                      <form action={deleteCatalogProductAction}>
                        <input type="hidden" name="id" value={product.id} />
                        <input type="hidden" name="slug" value={product.slug} />
                        <SubmitButton variant="danger" pendingLabel="Removing">
                          Delete
                        </SubmitButton>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}
    </div>
  );
}

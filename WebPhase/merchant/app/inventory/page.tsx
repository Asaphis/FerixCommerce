import Link from "next/link";
import { AlertTriangle, PackageX } from "lucide-react";
import { requireMerchant } from "@/lib/data";
import { getInventory } from "@/lib/api";
import { StockAdjust } from "@/components/studio/stock-adjust";
import { Empty, Eyebrow, Panel, PanelHead, Pill, StatTile } from "@/components/studio/bits";
import { Thumb } from "@/components/studio/marks";
import { money, num } from "@/lib/format";
import { cn } from "@/lib/utils";

const STATES = [
  { id: "all", label: "Every SKU" },
  { id: "low", label: "Low stock" },
  { id: "out", label: "Out of stock" },
];

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  const { state } = await searchParams;
  const { session } = await requireMerchant();
  const data = await getInventory(session);
  const active = state ?? "all";
  const rows = active === "all" ? data.rows : data.rows.filter((row) => row.state === active);

  return (
    <div className="grid gap-5">
      <header>
        <Eyebrow>Inventory</Eyebrow>
        <h1 className="mt-1.5 font-display text-[23px] font-semibold text-chalk">Stock</h1>
        <p className="mt-1.5 max-w-[72ch] text-[13px] leading-relaxed text-chalk-dim">
          Stock is shared across both channels, so a sale on the marketplace reduces the same count your
          storefront shows. Reserved units are already committed to orders that have not shipped yet.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="SKUs" value={num(data.totals.skus)} sub="Active catalogue lines" />
        <StatTile label="Units on hand" value={num(data.totals.units)} sub={`${num(data.totals.reserved)} reserved for open orders`} accent="azure" />
        <StatTile
          label="Low stock"
          value={num(data.totals.low)}
          sub={`At or below ${data.lowStockAt} units`}
          icon={<AlertTriangle width={15} height={15} />}
          accent="sand"
        />
        <StatTile
          label="Stock value"
          value={money(data.totals.value, { cents: false })}
          sub={`${data.totals.out} SKU(s) out of stock`}
          icon={<PackageX width={15} height={15} />}
          accent="chalk"
        />
      </div>

      <div className="flex flex-wrap gap-1.5">
        {STATES.map((option) => (
          <Link
            key={option.id}
            href={option.id === "all" ? "/inventory" : `/inventory?state=${option.id}`}
            className={cn(
              "rounded-[2px] border px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] transition-colors",
              active === option.id
                ? "border-lime/40 bg-lime/10 text-lime"
                : "border-hairline text-chalk-dim hover:border-chalk-dim hover:text-chalk",
            )}
          >
            {option.label}
            <span className="ml-2 opacity-70">
              {option.id === "all" ? data.rows.length : data.rows.filter((row) => row.state === option.id).length}
            </span>
          </Link>
        ))}
      </div>

      {rows.length ? (
        <Panel flush>
          <div className="p-5 md:overflow-x-auto">
            <table className="w-full min-w-0 border-collapse text-left md:min-w-[900px]">
              <thead>
                <tr className="hidden md:table-row">
                  {["Product", "SKU", "On hand", "Reserved", "Available", "Sold 30d", "State", "Adjust"].map((head) => (
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
                {rows.map((row) => (
                  <tr
                    key={row.id}
                    className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-hairline/60 py-3 last:border-0 md:table-row md:py-0 md:align-top"
                  >
                    <td className="w-full min-w-0 py-0 md:w-auto md:py-3 md:pr-4">
                      <div className="flex items-center gap-3">
                        <Thumb seed={row.slug} className="h-9 w-9 shrink-0" />
                        <Link
                          href={`/products/${row.slug}`}
                          className="truncate text-[13px] font-medium text-chalk hover:text-lime md:max-w-[220px]"
                        >
                          {row.title}
                        </Link>
                      </div>
                    </td>
                    <td className="hidden py-3 pr-4 font-mono text-[11.5px] text-chalk-dim md:table-cell">{row.sku}</td>
                    <td className="py-0 font-mono text-[13px] tabular-nums text-chalk md:py-3 md:pr-4">{row.stock}</td>
                    <td className="hidden py-3 pr-4 font-mono text-[12.5px] tabular-nums text-chalk-dim md:table-cell">
                      {row.reserved}
                    </td>
                    <td className="py-0 font-mono text-[12.5px] tabular-nums text-chalk md:py-3 md:pr-4">{row.available}</td>
                    <td className="hidden py-3 pr-4 font-mono text-[12.5px] tabular-nums text-chalk-dim md:table-cell">
                      {num(row.sold30d)}
                    </td>
                    <td className="py-0 md:py-3 md:pr-4">
                      <Pill tone={row.state === "out" ? "danger" : row.state === "low" ? "warn" : "success"}>
                        {row.state === "out" ? "Out" : row.state === "low" ? "Low" : "Healthy"}
                      </Pill>
                    </td>
                    <td className="ml-auto py-0 md:py-3">
                      <StockAdjust productId={row.id} title={row.title} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      ) : (
        <Empty
          title="Nothing in this state"
          body="Switch back to every SKU, or check again once stock moves."
        />
      )}

      <Panel>
        <PanelHead title="How stock moves" />
        <p className="text-[12.5px] leading-relaxed text-chalk-dim">
          A sale reduces on-hand stock. An open order shows as reserved until you mark it shipped, so you do
          not oversell. A manual adjustment adds or removes units with a reason, recorded against your
          account.
        </p>
      </Panel>
    </div>
  );
}

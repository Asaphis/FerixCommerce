"use client";

import { useMemo, useState } from "react";
import { Boxes, Minus, PackageSearch, Plus, Search, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";
import { lowStock } from "@/lib/data";
import { money, num } from "@/lib/format";
import { useFerixas } from "@/lib/store";
import { StudioShell } from "@/components/studio/shell";
import {
  Panel,
  Pill,
  SegmentedControl,
  StatTile,
  StudioButton,
  TableWrap,
  Td,
  Th,
  inputClass,
} from "@/components/studio/bits";
import { ProductThumb } from "@/components/shop/product-plate";
import { cn } from "@/lib/utils";

export default function InventoryPage() {
  const { products, merchantId, updateProduct } = useFerixas();
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"all" | "low" | "out">("all");

  const catalog = useMemo(
    () => products.filter((p) => p.merchantId === merchantId),
    [products, merchantId],
  );

  const rows = useMemo(
    () =>
      catalog.filter((p) => {
        if (view === "low" && p.stock > p.lowStockAt) return false;
        if (view === "out" && p.stock > 0) return false;
        if (!query.trim()) return true;
        const hay = `${p.title} ${p.sku}`.toLowerCase();
        return query.trim().toLowerCase().split(/\s+/).every((t) => hay.includes(t));
      }),
    [catalog, view, query],
  );

  const units = catalog.reduce((s, p) => s + p.stock, 0);
  const value = catalog.reduce((s, p) => s + p.stock * p.price, 0);
  const out = catalog.filter((p) => p.stock === 0).length;
  const low = lowStock(merchantId).length;

  const adjust = (id: string, current: number, delta: number) => {
    updateProduct(id, { stock: Math.max(0, current + delta) });
  };

  return (
    <StudioShell
      title="Inventory"
      subtitle="One stock count shared by every sales channel"
      actions={
        <StudioButton
          variant="primary"
          onClick={() => {
            lowStock(merchantId).forEach((p) => updateProduct(p.id, { stock: p.stock + 150 }));
            toast.success(`Restocked ${low} low-stock products`);
          }}
        >
          <Boxes width={14} height={14} /> Restock all low stock
        </StudioButton>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Units on hand" value={num(units)} sub={`${catalog.length} SKUs tracked`} />
        <StatTile label="Inventory value" value={money(value, { cents: false })} sub="At retail price" />
        <StatTile label="Low stock" value={num(low)} sub="At or below the alert mark" />
        <StatTile label="Sold out" value={num(out)} sub="Hidden from sale, still listed" />
      </div>

      <Panel className="mt-3" flush>
        <div className="flex flex-wrap items-center gap-2 border-b border-hairline p-4">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-chalk-dim" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by product or SKU"
              aria-label="Search inventory"
              className={cn(inputClass, "pl-9")}
            />
          </div>
          <SegmentedControl
            value={view}
            onChange={setView}
            options={[
              { value: "all", label: "Everything" },
              { value: "low", label: "Low stock" },
              { value: "out", label: "Sold out" },
            ]}
          />
          <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-chalk-dim">
            <SlidersHorizontal width={12} height={12} /> Adjust inline
          </span>
        </div>

        <div className="p-4">
          <TableWrap>
            <thead>
              <tr>
                <Th>Product</Th>
                <Th>SKU</Th>
                <Th align="center">On hand</Th>
                <Th align="center">Alert at</Th>
                <Th>Status</Th>
                <Th>Channels</Th>
                <Th align="right">Value</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((product) => (
                <tr key={product.id} className="transition-colors hover:bg-panel-2/40">
                  <Td>
                    <div className="flex items-center gap-3">
                      <ProductThumb product={product} className="h-9 w-9 shrink-0 rounded-[2px]" />
                      <span className="max-w-[240px] truncate text-[13px] text-chalk">
                        {product.title}
                      </span>
                    </div>
                  </Td>
                  <Td className="font-mono text-[11px] text-chalk-dim">{product.sku}</Td>
                  <Td align="center">
                    <div className="inline-flex items-center gap-1.5">
                      <button
                        type="button"
                        aria-label={`Reduce stock for ${product.title}`}
                        onClick={() => adjust(product.id, product.stock, -10)}
                        className="grid h-7 w-7 cursor-pointer place-items-center rounded-[2px] border border-hairline text-chalk-dim transition-colors hover:text-ember-soft"
                      >
                        <Minus width={12} height={12} />
                      </button>
                      <input
                        type="number"
                        value={product.stock}
                        onChange={(e) => updateProduct(product.id, { stock: Math.max(0, Number(e.target.value)) })}
                        aria-label={`Stock for ${product.title}`}
                        className="h-7 w-[68px] rounded-[2px] border border-hairline bg-void text-center font-mono text-[12px] tabular-nums text-chalk outline-none focus:border-chalk-dim"
                      />
                      <button
                        type="button"
                        aria-label={`Add stock for ${product.title}`}
                        onClick={() => adjust(product.id, product.stock, 10)}
                        className="grid h-7 w-7 cursor-pointer place-items-center rounded-[2px] border border-hairline text-chalk-dim transition-colors hover:text-lime"
                      >
                        <Plus width={12} height={12} />
                      </button>
                    </div>
                  </Td>
                  <Td align="center" className="font-mono text-[11.5px] text-chalk-dim">
                    {product.lowStockAt}
                  </Td>
                  <Td>
                    <Pill
                      tone={
                        product.stock === 0
                          ? "danger"
                          : product.stock <= product.lowStockAt
                            ? "warn"
                            : "success"
                      }
                    >
                      {product.stock === 0 ? "Sold out" : product.stock <= product.lowStockAt ? "Low" : "Healthy"}
                    </Pill>
                  </Td>
                  <Td>
                    <div className="flex gap-1.5">
                      {product.channels.store ? <Pill tone="lime">Store</Pill> : null}
                      {product.channels.marketplace ? <Pill tone="ember">Marketplace</Pill> : null}
                      {!product.channels.store && !product.channels.marketplace ? (
                        <Pill tone="neutral">Not selling</Pill>
                      ) : null}
                    </div>
                  </Td>
                  <Td align="right" className="font-mono text-[12.5px] tabular-nums">
                    {money(product.price * product.stock, { cents: false })}
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
          {!rows.length ? (
            <div className="flex flex-col items-center gap-3 py-14 text-center">
              <PackageSearch width={26} height={26} className="text-chalk-dim" />
              <p className="text-[13.5px] text-chalk">Nothing matches that view.</p>
            </div>
          ) : null}
        </div>
      </Panel>

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <Panel>
          <h2 className="font-display text-[15px] font-semibold text-chalk">
            Stock is shared, not duplicated
          </h2>
          <p className="mt-2 text-[13px] leading-relaxed text-chalk-dim">
            An order from the marketplace and an order from your own storefront decrement the same
            number. There is no second inventory to reconcile and no oversell window between
            channels.
          </p>
        </Panel>
        <Panel>
          <h2 className="font-display text-[15px] font-semibold text-chalk">Low-stock alerts</h2>
          <p className="mt-2 text-[13px] leading-relaxed text-chalk-dim">
            Products at or below their alert mark are surfaced on the dashboard. Restocking here
            applies immediately across every channel.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {lowStock(merchantId).slice(0, 5).map((p) => (
              <span
                key={p.id}
                className="inline-flex items-center gap-2 rounded-[2px] border border-hairline px-2.5 py-1.5 font-mono text-[10.5px] text-chalk-dim"
              >
                {p.sku}
                <span className="text-ember-soft">{p.stock}</span>
              </span>
            ))}
          </div>
        </Panel>
      </div>
    </StudioShell>
  );
}

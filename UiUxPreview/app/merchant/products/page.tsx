"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Archive,
  Check,
  Copy,
  Layers,
  Package,
  Pencil,
  Plus,
  Search,
  Store,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { CATEGORIES, getMerchant } from "@/lib/data";
import { money, num } from "@/lib/format";
import { useFerixas } from "@/lib/store";
import type { Product, ProductStatus } from "@/lib/types";
import { StudioShell } from "@/components/studio/shell";
import {
  Panel,
  Pill,
  SegmentedControl,
  StudioButton,
  TableWrap,
  Td,
  Th,
  inputClass,
  selectClass,
} from "@/components/studio/bits";
import { ProductThumb } from "@/components/shop/product-plate";
import { cn } from "@/lib/utils";

type StatusFilter = "all" | ProductStatus;
type ChannelFilter = "all" | "store" | "marketplace" | "storeOnly" | "marketOnly";
type SortKey = "recent" | "sold" | "stock" | "price";

export default function ProductsPage() {
  const { products, merchantId, updateProduct, setChannels, duplicateProduct, deleteProduct, createProduct } =
    useFerixas();
  const merchant = getMerchant(merchantId);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [channel, setChannel] = useState<ChannelFilter>("all");
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState<SortKey>("recent");
  const [selected, setSelected] = useState<string[]>([]);
  const [bulk, setBulk] = useState<"none" | "status" | "channels">("none");

  const catalog = useMemo(() => products.filter((p) => p.merchantId === merchantId), [products, merchantId]);

  const rows = useMemo(() => {
    const filtered = catalog.filter((p) => {
      if (status !== "all" && p.status !== status) return false;
      if (category !== "all" && p.category !== category) return false;
      if (channel === "store" && !p.channels.store) return false;
      if (channel === "marketplace" && !p.channels.marketplace) return false;
      if (channel === "storeOnly" && p.channels.marketplace) return false;
      if (channel === "marketOnly" && p.channels.store) return false;
      if (query.trim()) {
        const hay = `${p.title} ${p.sku} ${p.category} ${p.tags.join(" ")}`.toLowerCase();
        if (!query.trim().toLowerCase().split(/\s+/).every((t) => hay.includes(t))) return false;
      }
      return true;
    });
    const sorted = [...filtered];
    if (sort === "recent") sorted.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    if (sort === "sold") sorted.sort((a, b) => b.sold30d - a.sold30d);
    if (sort === "stock") sorted.sort((a, b) => a.stock - b.stock);
    if (sort === "price") sorted.sort((a, b) => b.price - a.price);
    return sorted;
  }, [catalog, status, category, channel, query, sort]);

  const listed = catalog.filter((p) => p.status === "active" && p.channels.marketplace).length;
  const inventoryValue = catalog.reduce((s, p) => s + p.price * p.stock, 0);

  const toggleChannel = (product: Product, key: "store" | "marketplace") => {
    const next = { ...product.channels, [key]: !product.channels[key] };
    setChannels(product.id, next);
    if (key === "marketplace") {
      toast["success"](next.marketplace
        ? `${product.title} is now listed on the Ferixas marketplace`
        : `${product.title} removed from the marketplace \u2014 still selling on your store`);
    } else {
      toast["success"](next.store ? `${product.title} is back on your own storefront` : `${product.title} hidden from your storefront`);
    }
  };

  return (
    <StudioShell
      title="Products"
      subtitle={`${catalog.length} in catalog \u00b7 ${listed} listed on the marketplace`}
      actions={
        <Link href="/merchant/products/new">
          <StudioButton variant="primary">
            <Plus width={14} height={14} />
            New product
          </StudioButton>
        </Link>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Catalog size", value: num(catalog.length), hint: `${catalog.filter((p) => p.status === "active").length} active` },
          { label: "On the marketplace", value: num(listed), hint: "Visible on ferixas.com" },
          { label: "Store only", value: num(catalog.filter((p) => p.status === "active" && !p.channels.marketplace).length), hint: "Your storefront keeps selling" },
          { label: "Inventory value", value: money(inventoryValue, { cents: false }), hint: "At retail price" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-[3px] border border-hairline bg-panel p-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-chalk-dim">{stat.label}</p>
            <p className="mt-3 font-mono text-[22px] font-semibold tabular-nums text-chalk">{stat.value}</p>
            <p className="mt-1 text-[12px] text-chalk-dim">{stat.hint}</p>
          </div>
        ))}
      </div>

      <Panel className="mt-3" flush>
        <div className="flex flex-wrap items-center gap-2 border-b border-hairline p-4">
          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-chalk-dim" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by title, SKU or tag"
              aria-label="Search products"
              className={cn(inputClass, "pl-9")}
            />
          </div>
          <SegmentedControl
            value={status}
            onChange={setStatus}
            options={[
              { value: "all", label: "All" },
              { value: "active", label: "Active" },
              { value: "draft", label: "Draft" },
              { value: "archived", label: "Archived" },
            ]}
          />
          <SegmentedControl
            value={channel}
            onChange={setChannel}
            options={[
              { value: "all", label: "Any channel" },
              { value: "store", label: "Store" },
              { value: "marketplace", label: "Marketplace" },
              { value: "storeOnly", label: "Store only" },
            ]}
          />
          <select value={category} onChange={(e) => setCategory(e.target.value)} className={cn(selectClass, "w-[150px]")}>
            <option value="all">All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
          <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className={cn(selectClass, "w-[150px]")}>
            <option value="recent">Newest first</option>
            <option value="sold">Best selling</option>
            <option value="stock">Lowest stock</option>
            <option value="price">Highest price</option>
          </select>
        </div>

        {selected.length ? (
          <div className="flex flex-wrap items-center gap-2 border-b border-hairline bg-panel-2/60 px-4 py-3">
            <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-lime">
              {selected.length} selected
            </span>
            <StudioButton
              onClick={() => {
                selected.forEach((id) => updateProduct(id, { status: "active" }));
                toast.success(`${selected.length} products set to active`);
                setSelected([]);
              }}
            >
              <Check width={13} height={13} /> Set active
            </StudioButton>
            <StudioButton
              onClick={() => {
                selected.forEach((id) => updateProduct(id, { status: "draft" }));
                toast.success(`${selected.length} products moved to draft`);
                setSelected([]);
              }}
            >
              <Archive width={13} height={13} /> Move to draft
            </StudioButton>
            <StudioButton
              onClick={() => {
                const targets = catalog.filter((p) => selected.includes(p.id));
                targets.forEach((p) => setChannels(p.id, { ...p.channels, marketplace: true }));
                toast.success(`${targets.length} products listed on the marketplace`);
                setSelected([]);
              }}
            >
              <Store width={13} height={13} /> List on marketplace
            </StudioButton>
            <StudioButton
              onClick={() => {
                const targets = catalog.filter((p) => selected.includes(p.id));
                targets.forEach((p) => setChannels(p.id, { ...p.channels, marketplace: false }));
                toast.success(`${targets.length} products are store-only again`);
                setSelected([]);
              }}
            >
              <Layers width={13} height={13} /> Remove from marketplace
            </StudioButton>
            <StudioButton variant="danger" onClick={() => setSelected([])}>
              Clear
            </StudioButton>
            <span className="ml-auto font-mono text-[10px] text-chalk-dim">
              Bulk channels and status apply instantly in this prototype
            </span>
          </div>
        ) : null}

        <div className="p-4">
          <TableWrap>
            <thead>
              <tr>
                <Th className="w-[34px]">
                  <input
                    type="checkbox"
                    aria-label="Select all products"
                    checked={selected.length === rows.length && rows.length > 0}
                    onChange={(e) => setSelected(e.target.checked ? rows.map((r) => r.id) : [])}
                    className="h-3.5 w-3.5 cursor-pointer accent-[#c9f24d]"
                  />
                </Th>
                <Th>Product</Th>
                <Th>Status</Th>
                <Th>Sales channels</Th>
                <Th align="right">Price</Th>
                <Th align="right">Stock</Th>
                <Th align="right">Sold 30d</Th>
                <Th align="right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((product) => (
                <tr key={product.id} className="transition-colors hover:bg-panel-2/40">
                  <Td>
                    <input
                      type="checkbox"
                      aria-label={`Select ${product.title}`}
                      checked={selected.includes(product.id)}
                      onChange={(e) =>
                        setSelected((prev) =>
                          e.target.checked ? [...prev, product.id] : prev.filter((id) => id !== product.id),
                        )
                      }
                      className="h-3.5 w-3.5 cursor-pointer accent-[#c9f24d]"
                    />
                  </Td>
                  <Td>
                    <div className="flex items-center gap-3">
                      <ProductThumb product={product} className="h-9 w-9 shrink-0 rounded-[2px]" />
                      <div className="min-w-0">
                        <Link
                          href={`/merchant/products/${product.id}`}
                          className="block max-w-[260px] truncate text-[13px] text-chalk transition-colors hover:text-lime"
                        >
                          {product.title}
                        </Link>
                        <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-chalk-dim">
                          {product.sku} \u00b7 {categoryName(product.category)}
                        </span>
                      </div>
                    </div>
                  </Td>
                  <Td>
                    <Pill tone={product.status === "active" ? "success" : product.status === "draft" ? "warn" : "neutral"}>
                      {product.status}
                    </Pill>
                  </Td>
                  <Td>
                    <div className="flex flex-wrap gap-1.5">
                      {(["store", "marketplace"] as const).map((key) => {
                        const on = product.channels[key];
                        const disabled = key === "marketplace" && !merchant.marketplaceEnabled;
                        return (
                          <button
                            key={key}
                            type="button"
                            disabled={disabled}
                            onClick={() => toggleChannel(product, key)}
                            title={
                              disabled
                                ? "Marketplace participation is off for this store"
                                : on
                                  ? `Remove from ${key === "store" ? "your store" : "the marketplace"}`
                                  : `Add to ${key === "store" ? "your store" : "the marketplace"}`
                            }
                            className={cn(
                              "inline-flex cursor-pointer items-center gap-1.5 rounded-[2px] border px-2 py-[3px] font-mono text-[10px] uppercase tracking-[0.12em] transition-colors",
                              on
                                ? key === "marketplace"
                                  ? "border-ember/40 bg-ember/12 text-ember-soft"
                                  : "border-lime/35 bg-lime/10 text-lime"
                                : "border-hairline text-chalk-dim hover:border-chalk-dim",
                              disabled && "cursor-not-allowed opacity-40",
                            )}
                          >
                            {on ? <Check width={10} height={10} /> : <Plus width={10} height={10} />}
                            {key === "store" ? "My store" : "Marketplace"}
                          </button>
                        );
                      })}
                    </div>
                  </Td>
                  <Td align="right" className="font-mono text-[12.5px] tabular-nums">
                    {money(product.price)}
                    {product.compareAt ? (
                      <span className="ml-1.5 text-[10.5px] text-chalk-dim line-through">
                        {money(product.compareAt, { cents: false })}
                      </span>
                    ) : null}
                  </Td>
                  <Td align="right" className="font-mono text-[12.5px] tabular-nums">
                    <span className={product.stock <= product.lowStockAt ? "text-ember-soft" : "text-chalk"}>
                      {product.stock}
                    </span>
                  </Td>
                  <Td align="right" className="font-mono text-[12.5px] tabular-nums text-chalk-dim">
                    {product.sold30d}
                  </Td>
                  <Td align="right">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`/merchant/products/${product.id}`}
                        aria-label={`Edit ${product.title}`}
                        className="grid h-7 w-7 place-items-center rounded-[2px] text-chalk-dim transition-colors hover:bg-panel-2 hover:text-chalk"
                      >
                        <Pencil width={13} height={13} />
                      </Link>
                      <button
                        type="button"
                        aria-label={`Duplicate ${product.title}`}
                        onClick={() => {
                          const copy = duplicateProduct(product.id);
                          if (copy) toast.success(`Duplicated as a draft: ${copy.title}`);
                        }}
                        className="grid h-7 w-7 cursor-pointer place-items-center rounded-[2px] text-chalk-dim transition-colors hover:bg-panel-2 hover:text-chalk"
                      >
                        <Copy width={13} height={13} />
                      </button>
                      <button
                        type="button"
                        aria-label={`Delete ${product.title}`}
                        onClick={() => {
                          deleteProduct(product.id);
                          toast.success(`${product.title} deleted`);
                        }}
                        className="grid h-7 w-7 cursor-pointer place-items-center rounded-[2px] text-chalk-dim transition-colors hover:bg-ember/12 hover:text-ember-soft"
                      >
                        <Trash2 width={13} height={13} />
                      </button>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
          {!rows.length ? (
            <div className="flex flex-col items-center gap-3 py-14 text-center">
              <Package width={26} height={26} className="text-chalk-dim" />
              <p className="text-[13.5px] text-chalk">No products match those filters.</p>
              <StudioButton
                variant="outline"
                onClick={() => {
                  setQuery("");
                  setStatus("all");
                  setChannel("all");
                  setCategory("all");
                }}
              >
                Reset filters
              </StudioButton>
            </div>
          ) : null}
        </div>
      </Panel>

      <div className="mt-3 grid gap-3 lg:grid-cols-[1.3fr_1fr]">
        <Panel>
          <h2 className="font-display text-[15px] font-semibold text-chalk">
            How sales channels work here
          </h2>
          <p className="mt-2 text-[13px] leading-relaxed text-chalk-dim">
            There is one product record and one stock count. The channel chips in the table decide
            where that record is sold. Unticking the marketplace hides the product from ferixas.com
            immediately, while your own storefront keeps selling it — the same inventory is
            decremented either way.
          </p>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            {[
              ["One record", "Price, media, variants and SEO live once"],
              ["One stock count", "Shared by every channel"],
              ["Channel-tagged orders", "You always know where a sale came from"],
            ].map(([title, body]) => (
              <div key={title} className="rounded-[2px] border border-hairline p-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-lime">{title}</p>
                <p className="mt-1.5 text-[12px] text-chalk-dim">{body}</p>
              </div>
            ))}
          </div>
        </Panel>
        <Panel>
          <h2 className="font-display text-[15px] font-semibold text-chalk">Bulk import</h2>
          <p className="mt-2 text-[13px] leading-relaxed text-chalk-dim">
            Import from a CSV, a supplier feed or another platform. Duplicate SKUs are matched and
            merged rather than created twice.
          </p>
          <div className="mt-4 rounded-[2px] border border-dashed border-hairline p-5 text-center">
            <Upload width={20} height={20} className="mx-auto text-chalk-dim" />
            <p className="mt-2 text-[12.5px] text-chalk-dim">
              Drop a file here — simulated in the prototype
            </p>
            <StudioButton
              className="mt-3"
              onClick={() => toast.info("Import is simulated in this prototype")}
            >
              Choose a file
            </StudioButton>
          </div>
        </Panel>
      </div>
    </StudioShell>
  );
}

function categoryName(slug: string) {
  return CATEGORIES.find((c) => c.slug === slug)?.name ?? slug;
}

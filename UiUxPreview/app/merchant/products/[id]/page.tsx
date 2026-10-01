"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  Check,
  Copy,
  ExternalLink,
  Eye,
  Image as ImageIcon,
  Plus,
  Save,
  Search as SearchIcon,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { CATEGORIES, COLLECTIONS } from "@/lib/data";
import { money } from "@/lib/format";
import { useFerixas } from "@/lib/store";
import type { Product, ProductStatus, Variant } from "@/lib/types";
import { StudioShell } from "@/components/studio/shell";
import {
  Field,
  Panel,
  PanelHead,
  Pill,
  StudioButton,
  inputClass,
  selectClass,
} from "@/components/studio/bits";
import { ProductPlate } from "@/components/shop/product-plate";
import { cn } from "@/lib/utils";

const TABS = [
  "Basics",
  "Media",
  "Pricing",
  "Variants",
  "Inventory",
  "Channels",
  "SEO",
] as const;
type Tab = (typeof TABS)[number];

export default function ProductEditor() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { products, merchantId, updateProduct, createProduct, duplicateProduct, deleteProduct, setChannels } =
    useFerixas();
  const existing = products.find((p) => p.id === params.id);
  const isNew = params.id === "new";
  const [tab, setTab] = useState<Tab>("Basics");
  const [dirty, setDirty] = useState(false);

  const base: Product = useMemo(() => {
    if (existing) return existing;
    const seed = products.find((p) => p.merchantId === merchantId) ?? products[0];
    return {
      ...seed,
      id: "new",
      slug: "",
      title: "",
      description: "",
      bullets: [],
      price: 0,
      compareAt: null,
      cost: 0,
      sku: "",
      stock: 0,
      status: "draft",
      channels: { store: true, marketplace: false },
      variants: [],
      collections: [],
      tags: [],
      sold30d: 0,
      views30d: 0,
      reviewCount: 0,
      rating: 0,
      plates: 3,
    };
  }, [existing, products, merchantId]);

  const [draft, setDraft] = useState<Product>(base);
  const [tagInput, setTagInput] = useState("");

  const set = <K extends keyof Product>(key: K, value: Product[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  const margin = draft.price ? ((draft.price - draft.cost) / draft.price) * 100 : 0;
  const discount = draft.compareAt ? Math.round(((draft.compareAt - draft.price) / draft.compareAt) * 100) : 0;

  const save = () => {
    if (!draft.title.trim()) {
      toast.error("Give the product a title before saving");
      return;
    }
    if (isNew) {
      const created = createProduct({
        ...draft,
        title: draft.title.trim(),
        merchantId,
        slug: draft.title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      });
      toast.success(`${created.title} created`);
      router.push(`/merchant/products/${created.id}`);
      return;
    }
    updateProduct(draft.id, draft);
    setDirty(false);
    toast.success(`${draft.title} saved`);
  };

  if (!existing && !isNew) {
    return (
      <StudioShell title="Product not found" subtitle="It may have been deleted">
        <Panel>
          <p className="text-[13.5px] text-chalk-dim">
            That product is no longer in the catalog.
          </p>
          <Link href="/merchant/products" className="mt-4 inline-block">
            <StudioButton variant="outline">
              <ArrowLeft width={14} height={14} /> Back to products
            </StudioButton>
          </Link>
        </Panel>
      </StudioShell>
    );
  }

  return (
    <StudioShell
      title={isNew ? "New product" : draft.title}
      subtitle={`${draft.sku || "no SKU yet"} \u00b7 ${dirty ? "unsaved changes" : "all changes saved"}`}
      actions={
        <Button row>
          <Link href="/merchant/products">
            <StudioButton variant="ghost">
              <ArrowLeft width={14} height={14} />
              Products
            </StudioButton>
          </Link>
          <StudioButton variant="primary" onClick={save}>
            <Save width={14} height={14} />
            {isNew ? "Create product" : "Save changes"}
          </StudioButton>
        </Button>
      }
    >
      <div className="grid gap-3 lg:grid-cols-[1fr_320px]">
        <div>
          <div className="mb-3 -mx-4 overflow-x-auto px-4 lg:mx-0 lg:px-0">
            <div className="flex gap-1 border-b border-hairline">
              {TABS.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setTab(item)}
                  className={cn(
                    "cursor-pointer whitespace-nowrap px-3 py-2.5 font-mono text-[10.5px] uppercase tracking-[0.14em] transition-colors",
                    tab === item
                      ? "border-b-2 border-lime text-lime"
                      : "border-b-2 border-transparent text-chalk-dim hover:text-chalk",
                  )}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          {tab === "Basics" ? (
            <div className="grid gap-3">
              <Panel>
                <PanelHead title="Product information" hint="What the customer reads first" />
                <div className="grid gap-4">
                  <Field label="Title">
                    <input
                      className={inputClass}
                      value={draft.title}
                      onChange={(e) => set("title", e.target.value)}
                      placeholder="Premium Wireless Headphones"
                    />
                  </Field>
                  <Field label="Description" hint={`${draft.description.length} characters`}>
                    <textarea
                      className={cn(inputClass, "min-h-[110px] resize-y py-2.5")}
                      value={draft.description}
                      onChange={(e) => set("description", e.target.value)}
                      placeholder="Describe the product the way you would to a customer standing in front of it."
                    />
                  </Field>
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-chalk-dim">
                      Selling points
                    </p>
                    <ul className="mt-2 space-y-2">
                      {draft.bullets.map((bullet, i) => (
                        <li key={`${bullet}-${i}`} className="flex items-center gap-2">
                          <input
                            className={inputClass}
                            value={bullet}
                            onChange={(e) => {
                              const next = [...draft.bullets];
                              next[i] = e.target.value;
                              set("bullets", next);
                            }}
                          />
                          <button
                            type="button"
                            aria-label="Remove selling point"
                            onClick={() => set("bullets", draft.bullets.filter((_, idx) => idx !== i))}
                            className="grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-[2px] border border-hairline text-chalk-dim hover:text-ember-soft"
                          >
                            <X width={13} height={13} />
                          </button>
                        </li>
                      ))}
                    </ul>
                    <StudioButton
                      className="mt-2"
                      onClick={() => set("bullets", [...draft.bullets, ""])}
                    >
                      <Plus width={13} height={13} /> Add selling point
                    </StudioButton>
                  </div>
                </div>
              </Panel>

              <Panel>
                <PanelHead title="Organisation" hint="Categories drive navigation; collections drive merchandising" />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Category">
                    <select
                      className={selectClass}
                      value={draft.category}
                      onChange={(e) => set("category", e.target.value)}
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c.slug} value={c.slug}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Tags" hint="Press enter to add">
                    <div className="flex gap-2">
                      <input
                        className={inputClass}
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && tagInput.trim()) {
                            e.preventDefault();
                            set("tags", [...draft.tags, tagInput.trim().toLowerCase()]);
                            setTagInput("");
                          }
                        }}
                        placeholder="staff-pick"
                      />
                    </div>
                  </Field>
                </div>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {draft.tags.length ? (
                    draft.tags.map((tag, i) => (
                      <button
                        key={`${tag}-${i}`}
                        type="button"
                        onClick={() => set("tags", draft.tags.filter((_, idx) => idx !== i))}
                        className="inline-flex cursor-pointer items-center gap-1.5 rounded-[2px] border border-hairline px-2 py-1 font-mono text-[10px] text-chalk-dim hover:text-ember-soft"
                      >
                        {tag}
                        <X width={10} height={10} />
                      </button>
                    ))
                  ) : (
                    <span className="font-mono text-[10.5px] text-chalk-dim">No tags yet</span>
                  )}
                </div>
                <div className="mt-5">
                  <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-chalk-dim">
                    Collections
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {COLLECTIONS.map((collection) => {
                      const on = draft.collections.includes(collection);
                      return (
                        <button
                          key={collection}
                          type="button"
                          onClick={() =>
                            set(
                              "collections",
                              on
                                ? draft.collections.filter((c) => c !== collection)
                                : [...draft.collections, collection],
                            )
                          }
                          className={cn(
                            "inline-flex cursor-pointer items-center gap-1.5 rounded-[2px] border px-2.5 py-1.5 text-[12px] transition-colors",
                            on
                              ? "border-lime/35 bg-lime/10 text-lime"
                              : "border-hairline text-chalk-dim hover:border-chalk-dim",
                          )}
                        >
                          {on ? <Check width={12} height={12} /> : null}
                          {collection}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </Panel>
            </div>
          ) : null}

          {tab === "Media" ? (
            <Panel>
              <PanelHead
                title="Product media"
                hint="Generated plates in the prototype \u2014 real uploads replace them later"
              />
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {Array.from({ length: draft.plates }).map((_, i) => (
                  <div key={i} className="relative overflow-hidden rounded-[2px] border border-hairline">
                    <ProductPlate product={draft} index={i} className="aspect-square w-full" tone="dark" />
                    <span className="absolute left-2 top-2 rounded-[2px] bg-void/80 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-chalk-dim">
                      {i === 0 ? "Cover" : `Image ${i + 1}`}
                    </span>
                    <div className="flex items-center justify-between border-t border-hairline px-2 py-1.5">
                      <span className="font-mono text-[9.5px] text-chalk-dim">1200 \u00d7 1200</span>
                      <button
                        type="button"
                        aria-label={`Remove image ${i + 1}`}
                        disabled={draft.plates <= 1}
                        onClick={() => set("plates", Math.max(1, draft.plates - 1))}
                        className="cursor-pointer text-chalk-dim transition-colors hover:text-ember-soft disabled:opacity-30"
                      >
                        <Trash2 width={12} height={12} />
                      </button>
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => set("plates", draft.plates + 1)}
                  className="grid aspect-square cursor-pointer place-items-center rounded-[2px] border border-dashed border-hairline text-chalk-dim transition-colors hover:border-chalk-dim hover:text-chalk"
                >
                  <span className="flex flex-col items-center gap-2">
                    <ImageIcon width={18} height={18} />
                    <span className="font-mono text-[10px] uppercase tracking-[0.12em]">Add media</span>
                  </span>
                </button>
              </div>
              <div className="mt-5 rounded-[2px] border border-hairline p-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-chalk-dim">
                  Video
                </p>
                <p className="mt-2 text-[12.5px] text-chalk-dim">
                  One product video is allowed per product and appears after the cover image.
                </p>
                <StudioButton
                  className="mt-3"
                  onClick={() => toast.info("Video upload is simulated in this prototype")}
                >
                  <Plus width={13} height={13} /> Attach a video
                </StudioButton>
              </div>
            </Panel>
          ) : null}

          {tab === "Pricing" ? (
            <Panel>
              <PanelHead title="Pricing" hint="Margin updates as you type" />
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Price">
                  <input
                    type="number"
                    className={inputClass}
                    value={draft.price}
                    onChange={(e) => set("price", Number(e.target.value))}
                  />
                </Field>
                <Field label="Compare at" hint="Leave empty for no discount badge">
                  <input
                    type="number"
                    className={inputClass}
                    value={draft.compareAt ?? ""}
                    onChange={(e) => set("compareAt", e.target.value ? Number(e.target.value) : null)}
                  />
                </Field>
                <Field label="Cost per item" hint="Used for margin only, never shown">
                  <input
                    type="number"
                    className={inputClass}
                    value={draft.cost}
                    onChange={(e) => set("cost", Number(e.target.value))}
                  />
                </Field>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                {[
                  ["Margin", `${margin.toFixed(1)}%`],
                  ["Profit per unit", money(draft.price - draft.cost)],
                  ["Discount shown", discount ? `${discount}% off` : "None"],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-[2px] border border-hairline p-3">
                    <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-chalk-dim">{label}</p>
                    <p className="mt-1.5 font-mono text-[16px] tabular-nums text-chalk">{value}</p>
                  </div>
                ))}
              </div>
            </Panel>
          ) : null}

          {tab === "Variants" ? (
            <Panel>
              <PanelHead
                title="Variants"
                hint="Options customers pick on the product page"
                action={
                  <StudioButton
                    onClick={() =>
                      set("variants", [...draft.variants, { name: "Option", values: ["Default"] }])
                    }
                  >
                    <Plus width={13} height={13} /> Add option
                  </StudioButton>
                }
              />
              {draft.variants.length ? (
                <div className="grid gap-3">
                  {draft.variants.map((variant, vi) => (
                    <div key={`${variant.name}-${vi}`} className="rounded-[2px] border border-hairline p-4">
                      <div className="flex items-center gap-2">
                        <input
                          className={cn(inputClass, "max-w-[200px]")}
                          value={variant.name}
                          onChange={(e) => {
                            const next = [...draft.variants];
                            next[vi] = { ...variant, name: e.target.value };
                            set("variants", next);
                          }}
                        />
                        <button
                          type="button"
                          aria-label="Remove option"
                          onClick={() => set("variants", draft.variants.filter((_, i) => i !== vi))}
                          className="grid h-9 w-9 cursor-pointer place-items-center rounded-[2px] border border-hairline text-chalk-dim hover:text-ember-soft"
                        >
                          <Trash2 width={13} height={13} />
                        </button>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        {variant.values.map((value, i) => (
                          <span
                            key={`${value}-${i}`}
                            className="inline-flex items-center gap-1.5 rounded-[2px] border border-hairline px-2.5 py-1.5 text-[12.5px] text-chalk"
                          >
                            {value}
                            <button
                              type="button"
                              aria-label={`Remove ${value}`}
                              onClick={() => {
                                const next = [...draft.variants];
                                next[vi] = { ...variant, values: variant.values.filter((_, idx) => idx !== i) };
                                set("variants", next);
                              }}
                              className="cursor-pointer text-chalk-dim hover:text-ember-soft"
                            >
                              <X width={11} height={11} />
                            </button>
                          </span>
                        ))}
                        <input
                          placeholder="Add value and press enter"
                          className={cn(inputClass, "max-w-[220px]")}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && e.currentTarget.value.trim()) {
                              e.preventDefault();
                              const next = [...draft.variants];
                              next[vi] = { ...variant, values: [...variant.values, e.currentTarget.value.trim()] };
                              set("variants", next);
                              e.currentTarget.value = "";
                            }
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[13px] text-chalk-dim">
                  This product has a single variant. Customers buy it as-is.
                </p>
              )}
            </Panel>
          ) : null}

          {tab === "Inventory" ? (
            <Panel>
              <PanelHead title="Inventory" hint="One stock count shared by every channel" />
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="SKU">
                  <input className={inputClass} value={draft.sku} onChange={(e) => set("sku", e.target.value)} />
                </Field>
                <Field label="Quantity available">
                  <input
                    type="number"
                    className={inputClass}
                    value={draft.stock}
                    onChange={(e) => set("stock", Number(e.target.value))}
                  />
                </Field>
                <Field label="Low stock alert at">
                  <input
                    type="number"
                    className={inputClass}
                    value={draft.lowStockAt}
                    onChange={(e) => set("lowStockAt", Number(e.target.value))}
                  />
                </Field>
              </div>
              <div className="mt-5 flex flex-wrap items-center gap-3 rounded-[2px] border border-hairline p-4">
                <Pill tone={draft.stock === 0 ? "danger" : draft.stock <= draft.lowStockAt ? "warn" : "success"}>
                  {draft.stock === 0 ? "Sold out" : draft.stock <= draft.lowStockAt ? "Low stock" : "In stock"}
                </Pill>
                <span className="font-mono text-[11.5px] text-chalk-dim">
                  {draft.stock} units \u00b7 {money(draft.price * draft.stock, { cents: false })} at retail
                </span>
                <StudioButton
                  className="ml-auto"
                  onClick={() => {
                    set("stock", draft.stock + 100);
                    toast.success("Added 100 units");
                  }}
                >
                  <Plus width={13} height={13} /> Add 100 units
                </StudioButton>
              </div>
            </Panel>
          ) : null}

          {tab === "Channels" ? (
            <div className="grid gap-3">
              <Panel>
                <PanelHead
                  title="Sales channels"
                  hint="Choose where this product is sold. Nothing is duplicated."
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  {(["store", "marketplace"] as const).map((key) => {
                    const on = draft.channels[key];
                    const title = key === "store" ? "My own store" : "Ferixas Marketplace";
                    const detail =
                      key === "store"
                        ? "Your branded storefront and custom domain"
                        : "Listed on ferixas.com alongside every other merchant";
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => {
                          const next = { ...draft.channels, [key]: !on };
                          set("channels", next);
                          if (!isNew) setChannels(draft.id, next);
                          toast.success(
                            `${title} ${!on ? "enabled" : "disabled"} for ${draft.title || "this product"}`,
                          );
                        }}
                        className={cn(
                          "cursor-pointer rounded-[2px] border p-4 text-left transition-colors",
                          on ? "border-lime/40 bg-lime/[0.06]" : "border-hairline hover:border-chalk-dim",
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-[13.5px] font-medium text-chalk">{title}</p>
                            <p className="mt-1 text-[12px] text-chalk-dim">{detail}</p>
                          </div>
                          <span
                            className={cn(
                              "grid h-5 w-5 shrink-0 place-items-center rounded-[2px] border",
                              on ? "border-lime bg-lime text-void" : "border-hairline text-transparent",
                            )}
                          >
                            <Check width={12} height={12} />
                          </span>
                        </div>
                      </button>
                    );
                  })}
                  <div className="rounded-[2px] border border-dashed border-hairline p-4 opacity-60">
                    <p className="text-[13.5px] font-medium text-chalk">Future channel</p>
                    <p className="mt-1 text-[12px] text-chalk-dim">
                      Social and retail channels will use this same switch.
                    </p>
                  </div>
                  <div className="rounded-[2px] border border-hairline bg-panel-2 p-4">
                    <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-chalk-dim">
                      Current state
                    </p>
                    <p className="mt-2 text-[12.5px] leading-relaxed text-chalk-dim">
                      {draft.channels.store && draft.channels.marketplace
                        ? "Sold on your storefront and on the marketplace. Stock is shared."
                        : draft.channels.store
                          ? "Store only. Customers will not find it on ferixas.com."
                          : draft.channels.marketplace
                            ? "Marketplace only. Your storefront will not show it."
                            : "Not for sale anywhere yet."}
                    </p>
                  </div>
                </div>
              </Panel>
            </div>
          ) : null}

          {tab === "SEO" ? (
            <Panel>
              <PanelHead title="Search engine listing" hint="How the product appears in search results" />
              <div className="grid gap-4">
                <Field label="Page title" hint={`${draft.seo.title.length}/70`}>
                  <input
                    className={inputClass}
                    value={draft.seo.title}
                    onChange={(e) => set("seo", { ...draft.seo, title: e.target.value })}
                  />
                </Field>
                <Field label="Meta description" hint={`${draft.seo.description.length}/160`}>
                  <textarea
                    className={cn(inputClass, "min-h-[80px] resize-y py-2.5")}
                    value={draft.seo.description}
                    onChange={(e) => set("seo", { ...draft.seo, description: e.target.value })}
                  />
                </Field>
                <Field label="URL handle">
                  <input
                    className={inputClass}
                    value={draft.seo.handle}
                    onChange={(e) => set("seo", { ...draft.seo, handle: e.target.value })}
                  />
                </Field>
              </div>
              <div className="mt-5 rounded-[2px] border border-hairline bg-void p-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-chalk-dim">
                  Search preview
                </p>
                <p className="mt-3 text-[13px] text-azure">
                  {draft.seo.title || draft.title || "Product title"}
                </p>
                <p className="font-mono text-[11px] text-lime/80">
                  ferixas.com/product/{draft.seo.handle || "handle"}
                </p>
                <p className="mt-1 text-[12.5px] text-chalk-dim">
                  {draft.seo.description || draft.description || "Meta description preview"}
                </p>
              </div>
            </Panel>
          ) : null}
        </div>

        <div className="grid gap-3 self-start lg:sticky lg:top-[86px]">
          <Panel>
            <PanelHead
              title="Storefront preview"
              hint="Exactly how the card renders in your store"
              action={<Eye width={15} height={15} className="text-chalk-dim" />}
            />
            <div className="rounded-[2px] border border-hairline bg-bone p-3">
              <ProductPlate product={draft} className="aspect-square w-full rounded-[2px]" tone="light" />
              <p className="mt-2.5 font-mono text-[9.5px] uppercase tracking-[0.14em] text-ink-soft">
                {draft.title || "Untitled product"}
              </p>
              <div className="mt-1 flex items-center justify-between">
                <span className="font-mono text-[14px] font-semibold text-ink">{money(draft.price)}</span>
                {draft.compareAt ? (
                  <span className="font-mono text-[11px] text-ink-soft line-through">
                    {money(draft.compareAt)}
                  </span>
                ) : null}
              </div>
            </div>
          </Panel>

          <Panel>
            <PanelHead title="Status" hint="Draft products are invisible everywhere" />
            <div className="flex flex-wrap gap-2">
              {(["active", "draft", "archived"] as ProductStatus[]).map((state) => (
                <button
                  key={state}
                  type="button"
                  onClick={() => set("status", state)}
                  className={cn(
                    "cursor-pointer rounded-[2px] border px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.12em] transition-colors",
                    draft.status === state
                      ? state === "active"
                        ? "border-lime/40 bg-lime/10 text-lime"
                        : "border-chalk-dim bg-panel-2 text-chalk"
                      : "border-hairline text-chalk-dim hover:border-chalk-dim",
                  )}
                >
                  {state}
                </button>
              ))}
            </div>
            <div className="mt-4 space-y-2 border-t border-hairline pt-4">
              <Link
                href={`/product/${draft.slug}`}
                className="flex items-center justify-between text-[12.5px] text-chalk-dim transition-colors hover:text-chalk"
              >
                View on the marketplace
                <ExternalLink width={13} height={13} />
              </Link>
              <Link
                href={`/store/${getStoreSlug(merchantId)}`}
                className="flex items-center justify-between text-[12.5px] text-chalk-dim transition-colors hover:text-chalk"
              >
                View on your storefront
                <ExternalLink width={13} height={13} />
              </Link>
            </div>
          </Panel>

          <Panel>
            <PanelHead title="Actions" />
            <div className="grid gap-2">
              {!isNew ? (
                <>
                  <StudioButton
                    variant="outline"
                    onClick={() => {
                      const copy = duplicateProduct(draft.id);
                      if (copy) {
                        toast.success(`Duplicated as a draft`);
                        router.push(`/merchant/products/${copy.id}`);
                      }
                    }}
                  >
                    <Copy width={14} height={14} /> Duplicate product
                  </StudioButton>
                  <StudioButton
                    variant="danger"
                    onClick={() => {
                      deleteProduct(draft.id);
                      toast.success(`${draft.title} deleted`);
                      router.push("/merchant/products");
                    }}
                  >
                    <Trash2 width={14} height={14} /> Delete product
                  </StudioButton>
                </>
              ) : null}
            </div>
          </Panel>

          <Panel>
            <PanelHead title="Commerce bindings" hint="Available to the Design Engine" />
            <ul className="space-y-1.5">
              {["{{product.title}}", "{{product.price}}", "{{product.compare_at}}", "{{product.rating}}", "{{product.image}}", "{{product.stock}}"].map(
                (token) => (
                  <li
                    key={token}
                    className="flex items-center gap-2 rounded-[2px] bg-void px-2.5 py-1.5 font-mono text-[11px] text-lime"
                  >
                    <SearchIcon width={11} height={11} className="text-chalk-dim" />
                    {token}
                  </li>
                ),
              )}
            </ul>
          </Panel>
        </div>
      </div>
    </StudioShell>
  );
}

function Button({ children }: { children: React.ReactNode; row?: boolean }) {
  return <div className="flex items-center gap-2">{children}</div>;
}

function getStoreSlug(merchantId: string) {
  return merchantId;
}

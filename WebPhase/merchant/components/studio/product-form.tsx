"use client";

/**
 * The product editor.
 *
 * Layout, not capability: every field that existed before still exists and is
 * still posted under the same name, so the backend contract is untouched.
 *
 * What changed is the arrangement the upload flow needed:
 *   · the fields sit in one column on the left, in the order you would say them
 *   · a live preview sits on the right and answers back as you type
 *   · Save and Cancel never scroll away
 */
import { useEffect, useMemo, useState } from "react";
import { useActionState } from "react";
import { Check, ImagePlus, Save, X } from "lucide-react";
import { apiImageUrl, type Product } from "@/lib/api";
import { SubmitButton } from "@/components/studio/controls";
import { Field, Notice, inputClass, selectClass, textareaClass } from "@/components/studio/forms";
import { Panel, PanelHead, Pill } from "@/components/studio/bits";
import { createProductAction, saveProductAction, type FormState } from "@/lib/actions";
import { money } from "@/lib/format";
import { ColorInput } from "@/components/shared/color-input";

/**
 * A section a seller may ask to be placed in.
 *
 * Every one of these is a manual section: an automatic feed such as Trending is
 * never in this list, because nobody attaches a product to it. A Flash Sale is
 * in the list and carries its own terms, which Ferixas sets on approval.
 */
type SectionOption = {
  value: string;
  name: string;
  documentTitle: string;
  documentType?: string;
  sectionType?: string;
  source?: string;
  status?: string;
  selectionMode?: string;
  presentation?: string;
  productConfigSchema?: { key: string; label: string; kind: string; required?: boolean }[];
  startsAt?: string | null;
  endsAt?: string | null;
};

export function ProductForm({
  product,
  categories,
  brands = [],
  sections = [],
  storeName,
  library = [],
}: {
  product?: Product;
  categories: string[];
  brands?: { id: string; slug: string; name: string }[];
  sections?: SectionOption[];
  storeName?: string;
  /** The seller's own media, so a product can reuse a picture already uploaded. */
  library?: { url: string; label: string }[];
}) {
  const [state, action] = useActionState<FormState, FormData>(
    product ? saveProductAction : createProductAction,
    {},
  );
  const [images, setImages] = useState<string[]>(product?.images ?? []);
  const [files, setFiles] = useState<File[]>([]);
  const [selectedSections, setSelectedSections] = useState<Set<string>>(
    () => new Set(product?.section_tags ?? []),
  );
  const previews = useMemo(() => files.map((file) => URL.createObjectURL(file)), [files]);
  useEffect(() => () => previews.forEach((url) => URL.revokeObjectURL(url)), [previews]);
  const sectionGroups = sections.reduce<Record<string, typeof sections>>((groups, section) => {
    const key = section.documentTitle || "Marketplace";
    (groups[key] ??= []).push(section);
    return groups;
  }, {});

  const [draft, setDraft] = useState({
    title: product?.title ?? "",
    category: product?.category ?? "",
    status: product?.status ?? "pending_review",
    price: product?.price != null ? String(product.price) : "",
    compareAt: product?.compareAt != null ? String(product.compareAt) : "",
    description: product?.description ?? "",
    store: false,
    marketplace: true,
  });
  const set = (key: keyof typeof draft) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const value: string | boolean =
      event.target instanceof HTMLInputElement && event.target.type === "checkbox"
        ? event.target.checked
        : event.target.value;
    setDraft((current) => ({ ...current, [key]: value }) as typeof current);
  };

  const lead = previews[0] ?? apiImageUrl(images[0]) ?? null;
  const price = Number(draft.price) || 0;
  const was = Number(draft.compareAt) || 0;
  const discount = was > price && price > 0 ? Math.round(((was - price) / was) * 100) : 0;

  return (
    <form action={action} className="grid gap-4" encType="multipart/form-data">
      {product ? (
        <>
          <input type="hidden" name="id" value={product.id} />
          <input type="hidden" name="slug" value={product.slug} />
        </>
      ) : null}
      <input type="hidden" name="images" value={JSON.stringify(images)} />

      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_336px] xl:items-start">
        <div className="grid min-w-0 gap-4">
          <Panel>
            <PanelHead title="Basics" />
            <div className="grid gap-4">
              <Field title="Product title">
                <input name="title" value={draft.title} onChange={set("title")} className={inputClass} required />
                <p className="mt-1.5 text-[11px] leading-relaxed text-chalk-dim">Slug is set on first submission and stays fixed.</p>
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field title="Department">
                  <select name="category" value={draft.category} onChange={set("category")} className={selectClass} required aria-label="Category">
                    <option value="" disabled>Select a category</option>
                    {categories.map((category) => <option key={category} value={category}>{category}</option>)}
                  </select>
                </Field>
                <Field title="Brand (optional)">
                  <select name="brandId" defaultValue={product?.brandId ?? ""} className={selectClass}>
                    <option value="">No brand</option>
                    {brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}
                  </select>
                </Field>
              </div>
              <Field title="Description">
                <textarea name="description" value={draft.description} onChange={set("description")} className={textareaClass} placeholder="What it is, who it is for, what makes it worth buying" />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field title="SKU (optional)"><input name="sku" defaultValue={product?.sku ?? ""} className={inputClass} placeholder="Generated if left blank" /></Field>
                <Field title="Low-stock alert at"><input name="lowStockAt" type="number" min="0" defaultValue={product?.lowStockAt ?? 8} className={inputClass} /></Field>
              </div>
            </div>
          </Panel>

          <Panel>
            <PanelHead title="Product images" action={<span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-chalk-dim">First image is the lead</span>} />
            <div className="grid gap-3">
              <label className="flex min-h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-[14px] border border-dashed border-hairline bg-panel-2 p-4 text-center transition-colors hover:border-ember">
                <span className="grid h-11 w-11 place-items-center rounded-[12px] border border-hairline bg-panel text-ember"><ImagePlus width={20} height={20} /></span>
                <span className="text-[13px] font-medium text-chalk">Drop an image here, or choose from your device</span>
                <span className="text-[11px] text-chalk-dim">JPG, PNG, WEBP or GIF · up to 20 MB each</span>
                <input name="mediaFiles" type="file" accept="image/*" multiple className="sr-only" onChange={(event) => {
                  const next = Array.from(event.target.files ?? []).filter((file) => file.type.startsWith("image/") && file.size <= 20 * 1024 * 1024);
                  setFiles((current) => [...current, ...next]);
                  event.currentTarget.value = "";
                }} />
              </label>
              {library.length > 0 ? (
        <div className="grid gap-2 border-t border-hairline pt-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-chalk-dim">
            Or pick from your media
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {library.map((asset) => {
              const chosen = images.includes(asset.url);
              return (
                <button
                  key={asset.url}
                  type="button"
                  aria-pressed={chosen}
                  aria-label={`Use ${asset.label}`}
                  title={asset.label}
                  onClick={() =>
                    setImages((current) => (current.includes(asset.url) ? current : [...current, asset.url]))
                  }
                  className={
                    "relative shrink-0 overflow-hidden rounded-[3px] border transition-colors " +
                    (chosen ? "border-lime ring-1 ring-lime" : "border-hairline hover:border-chalk-dim")
                  }
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={apiImageUrl(asset.url) ?? asset.url} alt={asset.label} className="h-14 w-14 object-cover" />
                  {chosen ? (
                    <span className="absolute right-0.5 top-0.5 grid h-4 w-4 place-items-center rounded-full bg-lime text-[9px] text-[#102d43]">
                      <Check width={10} height={10} />
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
          <p className="text-[11px] leading-relaxed text-chalk-dim">
            Choosing here adds the picture to the gallery without uploading it again. The first one stays the lead image.
          </p>
        </div>
      ) : null}

      {(images.length || previews.length) ? (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {images.map((url, index) => (
                    <div key={url} className="group relative overflow-hidden rounded-[12px] border border-hairline bg-panel-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}<img src={apiImageUrl(url) ?? url} alt={`Product image ${index + 1}`} className="aspect-square w-full object-cover" />
                      {index === 0 ? <span className="absolute left-1.5 top-1.5 rounded-full bg-ember px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide text-white">Lead</span> : null}
                      <button type="button" aria-label={`Remove product image ${index + 1}`} onClick={() => setImages((current) => current.filter((_, item) => item !== index))} className="absolute right-1.5 top-1.5 grid h-8 w-8 place-items-center rounded-full bg-[#17232b]/80 text-white opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"><X width={14} height={14} /></button>
                    </div>
                  ))}
                  {previews.map((url, index) => (
                    <div key={url} className="relative overflow-hidden rounded-[12px] border border-ember/40 bg-panel-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}<img src={url} alt={`New product image ${index + 1}`} className="aspect-square w-full object-cover" />
                      <span className="absolute inset-x-1 bottom-1 rounded-[8px] bg-[#17232b]/75 px-1 py-0.5 text-center font-mono text-[10px] uppercase tracking-wide text-white">Uploads on save</span>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </Panel>

          <Panel>
            <PanelHead title="Price and stock" />
            <div className="grid gap-4 sm:grid-cols-3">
              <Field title="Price"><input name="price" type="number" step="0.01" min="0" value={draft.price} onChange={set("price")} className={inputClass} required /></Field>
              <Field title="Was price (optional)"><input name="compareAt" type="number" step="0.01" min="0" value={draft.compareAt} onChange={set("compareAt")} className={inputClass} placeholder="0.00" /></Field>
              <Field title="Units in stock"><input name="stock" type="number" min="0" defaultValue={product?.stock ?? 0} className={inputClass} /></Field>
            </div>
          </Panel>

          <Panel>
            <PanelHead title="More product details" />
            <div className="grid gap-4">
              <Field title="Highlights — one per line">
                <textarea name="bullets" defaultValue={(product?.bullets ?? []).join("\n")} className={textareaClass} rows={4} placeholder="Key feature or benefit" />
              </Field>
              <Field title="Search tags — separate with commas">
                <input name="tags" defaultValue={(product?.tags ?? []).join(", ")} className={inputClass} placeholder="wireless, travel, lightweight" />
              </Field>
              <Field title="Options — one per line, for example Color: Black, White">
                <textarea name="variants" defaultValue={(product?.variants ?? []).map((variant) => `${variant.name}: ${variant.values.join(", ")}`).join("\n")} className={textareaClass} rows={3} placeholder="Size: Small, Medium, Large" />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field title="Search title (optional)"><input name="seoTitle" defaultValue={product?.seoTitle ?? ""} className={inputClass} placeholder={draft.title || "Product title"} /></Field>
                <Field title="Search description (optional)"><textarea name="seoDescription" defaultValue={product?.seoDescription ?? ""} className={textareaClass} rows={2} placeholder="A short description for search results" /></Field>
              </div>
            </div>
          </Panel>

          <Panel>
            <PanelHead title="Where this product goes" />
            <div className="grid gap-2">
              <div className="flex items-start gap-2.5 rounded-[6px] border border-lime/40 bg-lime/5 p-3 text-[12px] text-chalk">
                <Check width={15} height={15} className="mt-[2px] shrink-0 text-lime" />
                <span>
                  <span className="font-semibold">Ferixas Marketplace</span> — this submission goes to Admin review and
                  stays hidden until it is approved.
                </span>
              </div>
              <label className="flex items-start gap-2.5 rounded-[6px] border border-hairline p-3 text-[12px] text-chalk">
                <input
                  type="checkbox"
                  name="store"
                  defaultChecked={Boolean(product?.channels?.store)}
                  className="mt-0.5 size-4 shrink-0 accent-[#e4572e]"
                />
                <span>
                  <span className="font-semibold">My own website</span> — also use this same product on your Studio
                  website once it ships. Recorded now, so you never upload it twice.
                </span>
              </label>
            </div>
            <input type="hidden" name="marketplace" value={product ? (product.channels?.marketplace ? "on" : "off") : "on"} />
          </Panel>

          <Panel>
            <PanelHead title="Submission intent" />
            <label className="flex items-start gap-2.5 rounded-[6px] border border-lime/30 bg-lime/5 p-3 text-[12px] text-chalk">
              <input name="marketplace_acknowledgement" type="checkbox" required className="mt-0.5 size-4 shrink-0 accent-[#e4572e]" />
              <span>I confirm this listing is for Ferixas Marketplace. It stays hidden until approved; edits to approved listings return to review.</span>
            </label>
          </Panel>

          <Panel>
            <PanelHead title="Product sections" />
            <div className="grid gap-4">
              <p className="text-[11px] leading-relaxed text-chalk-dim">
                These are the sections a person fills, so ticking one asks Ferixas to consider this product for it.
                Automatic rows such as Trending, New arrivals, Best sellers and On sale are not listed: they pick
                their own products from the catalogue and nothing can be attached to them.
              </p>
              {Object.entries(sectionGroups).map(([page, pageSections]) => (
                <fieldset key={page} className="grid gap-2">
                  <legend className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.14em] text-chalk-dim">{page}</legend>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {pageSections.map((section) => {
                      const selected = selectedSections.has(section.value);
                      const terms = product?.placementTerms?.[section.value] ?? {};
                      const fields = (section.productConfigSchema ?? []).filter((field) => field.key !== "position");
                      const checkboxId = `section-${section.value}`;
                      return (
                        <div key={section.value} className="rounded-[8px] border border-hairline p-3">
                          <label htmlFor={checkboxId} className="flex cursor-pointer items-start gap-2.5 text-[12px] text-chalk">
                            <input
                              id={checkboxId}
                              type="checkbox"
                              name="section_tags"
                              value={section.value}
                              checked={selected}
                              onChange={(event) => setSelectedSections((current) => {
                                const next = new Set(current);
                                if (event.target.checked) next.add(section.value);
                                else next.delete(section.value);
                                return next;
                              })}
                              className="mt-0.5 accent-[#e4572e]"
                            />
                            <span>{section.name}<span className="ml-1 text-[11px] text-chalk-dim">· manual products</span>{section.status === "draft" ? <span className="ml-1 text-[11px] text-chalk-dim">· draft</span> : null}</span>
                          </label>
                          {fields.length ? (
                            <div className={`${selected ? "grid" : "hidden"} mt-3 gap-2 border-t border-hairline pt-3 sm:grid-cols-2`}>
                              {fields.map((field) => field.kind === "color" ? (
                                <div key={field.key} className="grid gap-1">
                                  <span className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-chalk-dim">{field.label}{field.required ? <span className="text-[#e4572e"> *</span> : null}</span>
                                  <ColorInput name={`section_term__${section.value}__${field.key}`}
                                    value={terms[field.key] == null ? "" : String(terms[field.key])}
                                    required={selected && Boolean(field.required)} disabled={!selected} className={inputClass} />
                                </div>
                              ) : (
                                <label key={field.key} className="grid gap-1">
                                  <span className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-chalk-dim">{field.label}{field.required ? <span className="text-[#e4572e"> *</span> : null}</span>
                                  <input
                                    name={`section_term__${section.value}__${field.key}`}
                                    type={field.kind === "number" ? "number" : field.kind === "datetime" ? "datetime-local" : "text"}
                                    step={field.kind === "number" ? "0.01" : undefined}
                                    min={field.kind === "number" ? 0 : undefined}
                                    required={selected && Boolean(field.required)}
                                    disabled={!selected}
                                    defaultValue={field.kind === "datetime"
                                      ? String(terms[field.key] ?? "").replace(/Z$/, "").slice(0, 16)
                                      : terms[field.key] == null ? "" : String(terms[field.key])}
                                    className={inputClass}
                                  />
                                </label>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </fieldset>
              ))}
              {!sections.length ? (
                <p className="text-[12px] text-chalk-dim">
                  No manual product section exists yet. Ferixas adds them in the CMS; this product is still submitted
                  for review without one.
                </p>
              ) : null}
            </div>
          </Panel>

          <Panel>
            <PanelHead title="Shipping and package details" />
            <div className="grid gap-3 sm:grid-cols-2">
              <Field title="Shipping amount"><input name="shipping_amount" type="number" min="0" step="0.01" defaultValue={product?.shipping_amount ?? 0} className={inputClass} /></Field>
              <Field title="Estimated delivery (days)"><input name="estimated_delivery_days" type="number" min="0" defaultValue={product?.estimated_delivery_days ?? 0} className={inputClass} /></Field>
              <Field title="Package weight"><input name="package_weight" type="number" min="0" step="0.01" defaultValue={product?.package_weight ?? 0} className={inputClass} /></Field>
              <Field title="Package dimensions"><input name="package_dimensions" defaultValue={product?.package_dimensions ?? ""} className={inputClass} placeholder="Length × width × height" /></Field>
              <Field title="Ships from"><input name="shipping_origin" defaultValue={product?.shipping_origin ?? ""} className={inputClass} placeholder="City / region" /></Field>
            </div>
          </Panel>
        </div>

        <aside className="grid gap-4 xl:sticky xl:top-4">
          <Panel>
            <PanelHead title="Preview" action={<Pill tone={draft.status === "approved" ? "success" : draft.status === "pending_review" ? "amber" : "neutral"}>{draft.status === "approved" ? "On sale" : draft.status}</Pill>} />
            <div className="overflow-hidden rounded-[14px] border border-hairline bg-panel">
              <div className="aspect-[4/3] w-full bg-panel-2">
                {lead ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={lead} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="grid h-full place-items-center font-mono text-[10.5px] uppercase tracking-[0.14em] text-chalk-dim">No image yet</span>
                )}
              </div>
              <div className="grid gap-2 p-3.5">
                <span className="font-display text-[14.5px] font-bold leading-snug text-chalk">{draft.title.trim() || "Product title"}</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-chalk-dim">{draft.category}</span>
                  {storeName ? <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-chalk-dim">· {storeName}</span> : null}
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="font-display text-[20px] font-bold tabular-nums text-chalk">{money(price)}</span>
                  {discount ? (
                    <>
                      <span className="text-[12.5px] text-chalk-dim line-through">{money(was)}</span>
                      <span className="rounded-full bg-ember px-2 py-0.5 text-[10.5px] font-bold text-white">-{discount}%</span>
                    </>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {draft.marketplace ? <Pill tone="info">Marketplace</Pill> : null}
                </div>
              </div>
            </div>
          </Panel>

        </aside>
      </div>

      <div className="sticky bottom-[78px] z-20 flex flex-wrap items-center gap-3 rounded-[14px] border border-hairline bg-panel/95 p-3 backdrop-blur md:bottom-0">
        <SubmitButton pendingLabel="Saving"><Save width={14} height={14} /> {product ? "Save changes" : "Create the product"}</SubmitButton>
        <span className="ml-auto"><Notice state={state} /></span>
      </div>
    </form>
  );
}

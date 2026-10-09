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
 *   · a checklist names exactly what is still missing before publishing
 *   · Save and Cancel never scroll away
 */
import { useEffect, useMemo, useState } from "react";
import { useActionState } from "react";
import { ImagePlus, Save, ShieldCheck, TriangleAlert, X } from "lucide-react";
import type { Product } from "@/lib/api";
import { SubmitButton } from "@/components/studio/controls";
import { Field, Notice, inputClass, selectClass, textareaClass } from "@/components/studio/forms";
import { Panel, PanelHead, Pill } from "@/components/studio/bits";
import { createProductAction, saveProductAction, type FormState } from "@/lib/actions";
import { money } from "@/lib/format";

export function ProductForm({
  product,
  categories,
  storeName,
}: {
  product?: Product;
  categories: string[];
  storeName?: string;
}) {
  const [state, action] = useActionState<FormState, FormData>(
    product ? saveProductAction : createProductAction,
    {},
  );
  const [images, setImages] = useState<string[]>(product?.images ?? []);
  const [files, setFiles] = useState<File[]>([]);
  const previews = useMemo(() => files.map((file) => URL.createObjectURL(file)), [files]);
  useEffect(() => () => previews.forEach((url) => URL.revokeObjectURL(url)), [previews]);

  const [draft, setDraft] = useState({
    title: product?.title ?? "",
    category: product?.category ?? categories[0],
    status: product?.status ?? "draft",
    price: product?.price != null ? String(product.price) : "",
    compareAt: product?.compareAt != null ? String(product.compareAt) : "",
    description: product?.description ?? "",
    store: product ? product.channels.store : true,
    marketplace: product ? product.channels.marketplace : false,
  });
  const set = (key: keyof typeof draft) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const value: string | boolean =
      event.target instanceof HTMLInputElement && event.target.type === "checkbox"
        ? event.target.checked
        : event.target.value;
    setDraft((current) => ({ ...current, [key]: value }) as typeof current);
  };

  const lead = previews[0] ?? images[0] ?? null;
  const price = Number(draft.price) || 0;
  const was = Number(draft.compareAt) || 0;
  const discount = was > price && price > 0 ? Math.round(((was - price) / was) * 100) : 0;

  const checks = [
    { ok: draft.title.trim().length > 0, label: "Title" },
    { ok: previews.length + images.length > 0, label: "At least one image" },
    { ok: price > 0, label: "Price" },
    { ok: draft.store || draft.marketplace, label: "A sales channel" },
  ];
  const ready = checks.every((check) => check.ok);

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
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field title="Department">
                  <select name="category" value={draft.category} onChange={set("category")} className={selectClass}>
                    {categories.map((category) => <option key={category} value={category}>{category}</option>)}
                  </select>
                </Field>
                <Field title="Status">
                  <select name="status" value={draft.status} onChange={set("status")} className={selectClass}>
                    <option value="draft">Draft — not selling yet</option>
                    <option value="approved">Published — on sale</option>
                    <option value="archived">Archived — retired</option>
                  </select>
                </Field>
              </div>
              <Field title="Description">
                <textarea name="description" value={draft.description} onChange={set("description")} className={textareaClass} placeholder="What it is, who it is for, what makes it worth buying" />
              </Field>
            </div>
          </Panel>

          <Panel>
            <PanelHead title="Product images" action={<span className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-chalk-dim">First image is the lead</span>} />
            <div className="grid gap-3">
              <label className="flex min-h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-[14px] border border-dashed border-hairline bg-panel-2 p-4 text-center transition-colors hover:border-ember">
                <span className="grid h-11 w-11 place-items-center rounded-[12px] border border-hairline bg-panel text-ember"><ImagePlus width={20} height={20} /></span>
                <span className="text-[13px] font-medium text-chalk">Drop an image here, or choose from your device</span>
                <span className="text-[11px] text-chalk-dim">JPG, PNG, WEBP or GIF · up to 20 MB each</span>
                <input name="mediaFiles" type="file" accept="image/*" multiple className="sr-only" onChange={(event) => setFiles(Array.from(event.target.files ?? []))} />
              </label>
              {(images.length || previews.length) ? (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {images.map((url, index) => (
                    <div key={url} className="group relative overflow-hidden rounded-[12px] border border-hairline bg-panel-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}<img src={url} alt={`Product image ${index + 1}`} className="aspect-square w-full object-cover" />
                      {index === 0 ? <span className="absolute left-1.5 top-1.5 rounded-full bg-ember px-2 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wide text-white">Lead</span> : null}
                      <button type="button" aria-label={`Remove product image ${index + 1}`} onClick={() => setImages((current) => current.filter((_, item) => item !== index))} className="absolute right-1.5 top-1.5 grid h-8 w-8 place-items-center rounded-full bg-[#17232b]/80 text-white opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"><X width={14} height={14} /></button>
                    </div>
                  ))}
                  {previews.map((url, index) => (
                    <div key={url} className="relative overflow-hidden rounded-[12px] border border-ember/40 bg-panel-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}<img src={url} alt={`New product image ${index + 1}`} className="aspect-square w-full object-cover" />
                      <span className="absolute inset-x-1 bottom-1 rounded-[8px] bg-[#17232b]/75 px-1 py-0.5 text-center font-mono text-[9px] uppercase tracking-wide text-white">Uploads on save</span>
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
            <PanelHead title="Where it sells" />
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex cursor-pointer items-start gap-3 rounded-[12px] border border-hairline p-3.5 transition-colors hover:border-ember"><input type="checkbox" name="store" checked={draft.store} onChange={set("store")} className="mt-[3px] h-4 w-4 accent-[#e4572e]" /><span><span className="block text-[13px] font-medium text-chalk">My own storefront</span><span className="block text-[12px] text-chalk-dim">Sells on your branded shop</span></span></label>
              <label className="flex cursor-pointer items-start gap-3 rounded-[12px] border border-hairline p-3.5 transition-colors hover:border-ember"><input type="checkbox" name="marketplace" checked={draft.marketplace} onChange={set("marketplace")} className="mt-[3px] h-4 w-4 accent-[#e4572e]" /><span><span className="block text-[13px] font-medium text-chalk">Ferixas marketplace</span><span className="block text-[12px] text-chalk-dim">Listed to every shopper on the platform</span></span></label>
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
                  <span className="grid h-full place-items-center font-mono text-[9.5px] uppercase tracking-[0.14em] text-chalk-dim">No image yet</span>
                )}
              </div>
              <div className="grid gap-2 p-3.5">
                <span className="font-display text-[14.5px] font-bold leading-snug text-chalk">{draft.title.trim() || "Product title"}</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-chalk-dim">{draft.category}</span>
                  {storeName ? <span className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-chalk-dim">· {storeName}</span> : null}
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="font-display text-[20px] font-bold tabular-nums text-chalk">{money(price)}</span>
                  {discount ? (
                    <>
                      <span className="text-[12.5px] text-chalk-dim line-through">{money(was)}</span>
                      <span className="rounded-full bg-ember px-2 py-0.5 text-[10px] font-bold text-white">-{discount}%</span>
                    </>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {draft.store ? <Pill tone="success">Your store</Pill> : null}
                  {draft.marketplace ? <Pill tone="info">Marketplace</Pill> : null}
                  {!draft.store && !draft.marketplace ? <Pill tone="danger">No channel — nobody can buy it</Pill> : null}
                </div>
              </div>
            </div>
          </Panel>

          <Panel>
            <PanelHead title="Before it sells" action={ready ? <Pill tone="success">Ready</Pill> : <Pill tone="amber">{checks.filter((c) => !c.ok).length} left</Pill>} />
            <ul className="grid gap-2">
              {checks.map((check) => (
                <li key={check.label} className="flex items-center gap-2.5 text-[12.5px]">
                  {check.ok ? (
                    <ShieldCheck width={15} height={15} className="shrink-0 text-mint" />
                  ) : (
                    <TriangleAlert width={15} height={15} className="shrink-0 text-amber" />
                  )}
                  <span className={check.ok ? "text-chalk-dim" : "text-chalk"}>{check.label}</span>
                </li>
              ))}
            </ul>
          </Panel>
        </aside>
      </div>

      <div className="sticky bottom-[78px] z-20 flex flex-wrap items-center gap-3 rounded-[14px] border border-hairline bg-panel/95 p-3 backdrop-blur md:bottom-0">
        <SubmitButton pendingLabel="Saving"><Save width={14} height={14} /> {product ? "Save changes" : "Create the product"}</SubmitButton>
        {!ready ? <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-chalk-dim">Saved as a draft until it is complete</span> : null}
        <span className="ml-auto"><Notice state={state} /></span>
      </div>
    </form>
  );
}

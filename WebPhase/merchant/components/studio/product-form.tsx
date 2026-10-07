"use client";

import { useEffect, useMemo, useState } from "react";
import { ImagePlus, Save, X } from "lucide-react";
import type { Product } from "@/lib/api";
import { SubmitButton } from "@/components/studio/controls";
import { Field, Notice, inputClass, selectClass, textareaClass } from "@/components/studio/forms";
import { Panel, PanelHead } from "@/components/studio/bits";
import { createProductAction, saveProductAction, type FormState } from "@/lib/actions";
import { useActionState } from "react";

export function ProductForm({ product, categories }: { product?: Product; categories: string[] }) {
  const [state, action] = useActionState<FormState, FormData>(
    product ? saveProductAction : createProductAction,
    {},
  );
  const [images, setImages] = useState<string[]>(product?.images ?? []);
  const [files, setFiles] = useState<File[]>([]);
  const previews = useMemo(() => files.map((file) => URL.createObjectURL(file)), [files]);
  useEffect(() => () => previews.forEach((url) => URL.revokeObjectURL(url)), [previews]);

  return (
    <form action={action} className="grid gap-3" encType="multipart/form-data">
      {product ? (
        <>
          <input type="hidden" name="id" value={product.id} />
          <input type="hidden" name="slug" value={product.slug} />
        </>
      ) : null}
      <input type="hidden" name="images" value={JSON.stringify(images)} />

      <Panel>
        <PanelHead title="Basics" hint="What the shopper sees" />
        <div className="grid gap-4">
          <Field title="Product title">
            <input name="title" defaultValue={product?.title ?? ""} className={inputClass} required />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field title="Department">
              <select name="category" defaultValue={product?.category ?? categories[0]} className={selectClass}>
                {categories.map((category) => <option key={category} value={category}>{category}</option>)}
              </select>
            </Field>
            <Field title="Status">
              <select name="status" defaultValue={product?.status ?? "draft"} className={selectClass}>
                <option value="draft">Draft — not selling yet</option>
                <option value="active">Published — on sale</option>
                <option value="archived">Archived — retired</option>
              </select>
            </Field>
          </div>
          <Field title="Description">
            <textarea name="description" defaultValue={product?.description ?? ""} className={textareaClass} placeholder="What it is, who it is for, what makes it worth buying" />
          </Field>
        </div>
      </Panel>

      <Panel>
        <PanelHead title="Product images" hint="Upload product photography; the first image is the lead image." />
        <div className="grid gap-3">
          <label className="flex min-h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-[7px] border border-dashed border-hairline bg-panel-2 p-4 text-center transition-colors hover:border-ember">
            <ImagePlus width={20} height={20} className="text-ember" />
            <span className="text-[13px] font-medium text-chalk">Choose images</span>
            <span className="text-[11px] text-chalk-dim">JPG, PNG, WEBP or GIF · up to 20 MB each</span>
            <input name="mediaFiles" type="file" accept="image/*" multiple className="sr-only" onChange={(event) => setFiles(Array.from(event.target.files ?? []))} />
          </label>
          {(images.length || previews.length) ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {images.map((url, index) => (
                <div key={url} className="group relative overflow-hidden rounded-[5px] border border-hairline bg-panel-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}<img src={url} alt={`Product image ${index + 1}`} className="aspect-square w-full object-cover" />
                  <button type="button" aria-label={`Remove product image ${index + 1}`} onClick={() => setImages((current) => current.filter((_, item) => item !== index))} className="absolute right-1 top-1 grid h-8 w-8 place-items-center rounded-full bg-[#17232b]/80 text-white opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"><X width={14} height={14} /></button>
                </div>
              ))}
              {previews.map((url, index) => (
                <div key={url} className="relative overflow-hidden rounded-[5px] border border-ember/40 bg-panel-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}<img src={url} alt={`New product image ${index + 1}`} className="aspect-square w-full object-cover" />
                  <span className="absolute inset-x-1 bottom-1 rounded bg-[#17232b]/75 px-1 py-0.5 text-center font-mono text-[9px] uppercase tracking-wide text-white">Pending upload</span>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </Panel>

      <Panel>
        <PanelHead title="Price and stock" hint="One price and one stock count for every channel" />
        <div className="grid gap-4 sm:grid-cols-3">
          <Field title="Price"><input name="price" type="number" step="0.01" min="0" defaultValue={product?.price ?? 0} className={inputClass} required /></Field>
          <Field title="Was price (optional)"><input name="compareAt" type="number" step="0.01" min="0" defaultValue={product?.compareAt ?? ""} className={inputClass} placeholder="Shows a discount badge" /></Field>
          <Field title="Units in stock"><input name="stock" type="number" min="0" defaultValue={product?.stock ?? 0} className={inputClass} /></Field>
        </div>
      </Panel>

      <Panel>
        <PanelHead title="Sales channels" hint="Where this product is available to buy" />
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex cursor-pointer items-start gap-3 rounded-[7px] border border-hairline p-3.5 transition-colors hover:border-ember"><input type="checkbox" name="store" defaultChecked={product ? product.channels.store : true} className="mt-[3px] h-4 w-4 accent-[#e4572e]" /><span><span className="block text-[13px] font-medium text-chalk">My own storefront</span><span className="block text-[12px] text-chalk-dim">Sells on your branded shop</span></span></label>
          <label className="flex cursor-pointer items-start gap-3 rounded-[7px] border border-hairline p-3.5 transition-colors hover:border-ember"><input type="checkbox" name="marketplace" defaultChecked={product ? product.channels.marketplace : false} className="mt-[3px] h-4 w-4 accent-[#e4572e]" /><span><span className="block text-[13px] font-medium text-chalk">Ferixas marketplace</span><span className="block text-[12px] text-chalk-dim">Listed to every shopper on the platform</span></span></label>
        </div>
      </Panel>

      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton pendingLabel="Saving"><Save width={14} height={14} /> {product ? "Save changes" : "Create the product"}</SubmitButton>
        <Notice state={state} />
      </div>
    </form>
  );
}

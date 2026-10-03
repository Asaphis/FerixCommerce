"use client";

import { useActionState } from "react";
import { Save } from "lucide-react";
import type { Product } from "@/lib/api";
import { SubmitButton } from "@/components/studio/controls";
import { Field, Notice, inputClass, selectClass, textareaClass } from "@/components/studio/forms";
import { Panel, PanelHead } from "@/components/studio/bits";
import { createProductAction, saveProductAction, type FormState } from "@/lib/actions";

export function ProductForm({ product, categories }: { product?: Product; categories: string[] }) {
  const [state, action] = useActionState<FormState, FormData>(
    product ? saveProductAction : createProductAction,
    {},
  );

  return (
    <form action={action} className="grid gap-3">
      {product ? (
        <>
          <input type="hidden" name="id" value={product.id} />
          <input type="hidden" name="slug" value={product.slug} />
        </>
      ) : null}

      <Panel>
        <PanelHead title="Basics" hint="What the shopper sees" />
        <div className="grid gap-4">
          <Field title="Product title">
            <input name="title" defaultValue={product?.title ?? ""} className={inputClass} required />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field title="Department">
              <select name="category" defaultValue={product?.category ?? categories[0]} className={selectClass}>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
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
            <textarea
              name="description"
              defaultValue={product?.description ?? ""}
              className={textareaClass}
              placeholder="What it is, who it is for, what makes it worth buying"
            />
          </Field>
        </div>
      </Panel>

      <Panel>
        <PanelHead title="Price and stock" hint="One price and one stock count for every channel" />
        <div className="grid gap-4 sm:grid-cols-3">
          <Field title="Price">
            <input
              name="price"
              type="number"
              step="0.01"
              min="0"
              defaultValue={product?.price ?? 0}
              className={inputClass}
              required
            />
          </Field>
          <Field title="Was price (optional)">
            <input
              name="compareAt"
              type="number"
              step="0.01"
              min="0"
              defaultValue={product?.compareAt ?? ""}
              className={inputClass}
              placeholder="Shows a discount badge"
            />
          </Field>
          <Field title="Units in stock">
            <input
              name="stock"
              type="number"
              min="0"
              defaultValue={product?.stock ?? 0}
              className={inputClass}
            />
          </Field>
        </div>
      </Panel>

      <Panel>
        <PanelHead title="Sales channels" hint="Where this product is available to buy" />
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex cursor-pointer items-start gap-3 rounded-[2px] border border-hairline p-3.5 transition-colors hover:border-chalk-dim">
            <input
              type="checkbox"
              name="store"
              defaultChecked={product ? product.channels.store : true}
              className="mt-[3px] h-4 w-4 accent-[#c9f24d]"
            />
            <span>
              <span className="block text-[13px] font-medium text-chalk">My own storefront</span>
              <span className="block text-[12px] text-chalk-dim">Sells on your branded shop</span>
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-3 rounded-[2px] border border-hairline p-3.5 transition-colors hover:border-chalk-dim">
            <input
              type="checkbox"
              name="marketplace"
              defaultChecked={product ? product.channels.marketplace : false}
              className="mt-[3px] h-4 w-4 accent-[#c9f24d]"
            />
            <span>
              <span className="block text-[13px] font-medium text-chalk">Ferixas marketplace</span>
              <span className="block text-[12px] text-chalk-dim">Listed to every shopper on the platform</span>
            </span>
          </label>
        </div>
      </Panel>

      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton pendingLabel="Saving">
          <Save width={14} height={14} /> {product ? "Save changes" : "Create the product"}
        </SubmitButton>
        <Notice state={state} />
      </div>
    </form>
  );
}

"use client";

import { useActionState, useState } from "react";
import { Megaphone, Plus, Trash2 } from "lucide-react";
import { SubmitButton } from "@/components/studio/controls";
import { Field, Notice, inputClass, selectClass } from "@/components/studio/forms";
import { Panel, PanelHead } from "@/components/studio/bits";
import { createPromotionAction, type FormState } from "@/lib/actions";
import { money } from "@/lib/format";

type Option = { id: string; title: string; price: number; slug: string };
type Draft = { productId: string; salePrice: string; quantityLimit: string };

export function PromotionForm({ products }: { products: Option[] }) {
  const [state, action] = useActionState<FormState, FormData>(createPromotionAction, {});
  const [items, setItems] = useState<Draft[]>(() =>
    products.length
      ? [{ productId: products[0].id, salePrice: String(products[0].price), quantityLimit: "10" }]
      : [],
  );

  const priceOf = (productId: string) => products.find((product) => product.id === productId)?.price ?? 0;

  const update = (index: number, patch: Partial<Draft>) =>
    setItems((current) => current.map((item, at) => (at === index ? { ...item, ...patch } : item)));

  return (
    <form action={action} className="grid gap-3">
      <Panel>
        <PanelHead title="New promotion" hint="Name it, pick the products, set the sale price" />
        <div className="grid gap-4">
          <Field title="Promotion name">
            <input name="name" className={inputClass} placeholder="Weekend drop" required />
          </Field>
          <Field title="Headline">
            <input name="headline" className={inputClass} placeholder="Up to 20% off for 48 hours" />
          </Field>
          <Field title="Banner image URL">
            <input name="bannerUrl" className={inputClass} placeholder="https://example.com/banner.jpg" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field title="Starts">
              <input name="startsAt" type="datetime-local" className={inputClass} />
            </Field>
            <Field title="Ends">
              <input name="endsAt" type="datetime-local" className={inputClass} />
            </Field>
          </div>
          <p className="font-mono text-[9.5px] leading-relaxed text-chalk-dim/70">
            The platform confirms the final window when the promotion goes live.
          </p>
          <Field title="Status">
            <select name="status" defaultValue="draft" className={selectClass}>
              <option value="draft">Draft — not live</option>
              <option value="scheduled">Scheduled</option>
              <option value="active">Live now</option>
            </select>
          </Field>
        </div>
      </Panel>

      <Panel>
        <PanelHead title="Products on sale" hint="A sale price per product, with an optional quantity cap" />
        {items.length ? (
          <div className="grid gap-2.5">
            {items.map((item, index) => (
              <div key={index} className="grid gap-3 rounded-[2px] border border-hairline p-3">
                <Field title="Product">
                  <select
                    name="itemProduct"
                    value={item.productId}
                    onChange={(event) =>
                      update(index, { productId: event.target.value, salePrice: String(priceOf(event.target.value)) })
                    }
                    className={selectClass}
                  >
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.title} · {money(product.price)}
                      </option>
                    ))}
                  </select>
                </Field>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field title="Sale price">
                    <input
                      name="itemPrice"
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.salePrice}
                      onChange={(event) => update(index, { salePrice: event.target.value })}
                      className={inputClass}
                    />
                  </Field>
                  <Field title="Quantity limit">
                    <input
                      name="itemLimit"
                      type="number"
                      min="0"
                      value={item.quantityLimit}
                      onChange={(event) => update(index, { quantityLimit: event.target.value })}
                      className={inputClass}
                    />
                  </Field>
                </div>
                <button
                  type="button"
                  onClick={() => setItems((current) => current.filter((_, at) => at !== index))}
                  className="inline-flex w-fit cursor-pointer items-center gap-1.5 rounded-[2px] border border-hairline px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-chalk-dim transition-colors hover:border-ember/40 hover:text-ember-soft"
                >
                  <Trash2 width={11} height={11} /> Remove product
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[12.5px] text-chalk-dim">
            {products.length
              ? "No products on this promotion yet."
              : "Add a product to your catalogue before running a promotion."}
          </p>
        )}

        {products.length ? (
          <button
            type="button"
            onClick={() =>
              setItems((current) => [
                ...current,
                {
                  productId: products[0].id,
                  salePrice: String(products[0].price),
                  quantityLimit: "10",
                },
              ])
            }
            className="mt-3 inline-flex cursor-pointer items-center gap-1.5 rounded-[2px] border border-hairline px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-chalk-dim transition-colors hover:border-chalk-dim hover:text-chalk"
          >
            <Plus width={11} height={11} /> Add product
          </button>
        ) : null}
      </Panel>

      <div className="flex flex-wrap items-center gap-3">
        {products.length ? (
          <SubmitButton pendingLabel="Creating">
            <Megaphone width={14} height={14} /> Create promotion
          </SubmitButton>
        ) : null}
        <Notice state={state} />
      </div>
    </form>
  );
}

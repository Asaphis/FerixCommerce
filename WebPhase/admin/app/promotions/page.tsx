import { Megaphone, Plus } from "lucide-react";
import { requireAdmin } from "@/lib/data";
import { listPromotions } from "@/lib/api";
import { Field, SubmitButton, inputClass, selectClass } from "@/components/ops/controls";
import { Empty, Eyebrow, Panel, PanelHead, Pill } from "@/components/ops/bits";
import { deletePromotionAction, savePromotionAction } from "@/lib/ops-actions";
import { money, num } from "@/lib/format";

const STATUS_TONE: Record<string, "mint" | "amber" | "neutral"> = {
  live: "mint",
  scheduled: "amber",
  draft: "neutral",
  ended: "neutral",
};

function window(startsAt: string, endsAt: string) {
  const start = new Date(startsAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  const end = new Date(endsAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  return `${start} → ${end}`;
}

export default async function PromotionsPage() {
  const { session } = await requireAdmin();
  const { sales, products } = await listPromotions(session);

  return (
    <div className="grid gap-5">
      <header>
        <Eyebrow>Marketplace</Eyebrow>
        <h1 className="mt-1.5 font-display text-[23px] font-semibold text-chalk">Promotions</h1>
        <p className="mt-1.5 max-w-[74ch] text-[13px] leading-relaxed text-chalk-dim">
          Flash sales put a temporary price on a product without touching the product record. When the window ends
          the original price returns by itself. Products here can come from any merchant.
        </p>
      </header>

      {sales.length === 0 ? (
        <Empty
          title="No promotions yet"
          body="Create a flash sale below. Choose products, set the sale price and the window it runs for."
        />
      ) : (
        <div className="grid gap-3">
          {sales.map((sale) => (
            <Panel key={sale.id} className="grid gap-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex min-w-0 items-start gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={sale.bannerUrl}
                    alt={sale.name}
                    className="h-16 w-24 shrink-0 rounded-[2px] border border-hairline object-cover"
                  />
                  <div className="min-w-0">
                    <p className="font-display text-[14px] font-semibold text-chalk">{sale.name}</p>
                    <p className="mt-0.5 text-[12px] text-chalk-dim">{sale.headline || "No headline"}</p>
                    <p className="mt-1 font-mono text-[10.5px] text-chalk-dim">
                      {window(sale.startsAt, sale.endsAt)} · {sale.items.length} products
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Pill tone={STATUS_TONE[sale.status] ?? "neutral"}>{sale.status}</Pill>
                  <Pill tone="violet">{sale.ownerType === "platform" ? "platform" : "merchant"}</Pill>
                </div>
              </div>

              {sale.items.length > 0 ? (
                <div className="overflow-x-auto rounded-[2px] border border-hairline">
                  <table className="w-full min-w-[560px] border-collapse text-left">
                    <thead>
                      <tr className="border-b border-hairline bg-panel-2">
                        {["Product", "Sale price", "Limit", "Sold"].map((head) => (
                          <th
                            key={head}
                            className="px-3 py-2 font-mono text-[9.5px] uppercase tracking-[0.14em] text-chalk-dim"
                          >
                            {head}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sale.items.map((item) => (
                        <tr key={item.id} className="border-b border-hairline last:border-0">
                          <td className="px-3 py-2 text-[12.5px] text-chalk">{item.title}</td>
                          <td className="px-3 py-2 font-mono text-[12.5px] tabular-nums text-signal">
                            {money(item.salePrice)}
                          </td>
                          <td className="px-3 py-2 font-mono text-[12.5px] tabular-nums text-chalk-dim">
                            {item.quantityLimit ? num(item.quantityLimit) : "—"}
                          </td>
                          <td className="px-3 py-2 font-mono text-[12.5px] tabular-nums text-chalk-dim">
                            {num(item.soldQuantity)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}

              <details className="rounded-[2px] border border-hairline bg-panel-2">
                <summary className="cursor-pointer px-4 py-3 font-mono text-[10px] uppercase tracking-[0.16em] text-chalk-dim">
                  Edit promotion
                </summary>
                <form action={savePromotionAction} className="grid gap-3 border-t border-hairline p-4">
                  <input type="hidden" name="id" value={sale.id} />
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    <Field title="Name">
                      <input name="name" defaultValue={sale.name} className={inputClass} />
                    </Field>
                    <Field title="Headline">
                      <input name="headline" defaultValue={sale.headline} className={inputClass} />
                    </Field>
                    <Field title="Status">
                      <select name="status" defaultValue={sale.status} className={selectClass}>
                        <option value="draft">Draft</option>
                        <option value="scheduled">Scheduled</option>
                        <option value="live">Live</option>
                        <option value="ended">Ended</option>
                      </select>
                    </Field>
                    <Field title="Starts">
                      <input name="startsAt" type="datetime-local" defaultValue={sale.startsAt.slice(0, 16)} className={inputClass} />
                    </Field>
                    <Field title="Ends">
                      <input name="endsAt" type="datetime-local" defaultValue={sale.endsAt.slice(0, 16)} className={inputClass} />
                    </Field>
                    <Field title="Banner URL">
                      <input name="bannerUrl" defaultValue={sale.bannerUrl} className={inputClass} />
                    </Field>
                  </div>
                  <div className="grid gap-2">
                    <p className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-chalk-dim">
                      Products in this sale
                    </p>
                    {sale.items.map((item, index) => (
                      <div key={item.id} className="grid gap-2 rounded-[2px] border border-hairline p-3 md:grid-cols-[1fr_140px_140px]">
                        <input type="hidden" name="itemProductId" value={item.productId} />
                        <p className="self-center truncate text-[12.5px] text-chalk">{item.title}</p>
                        <input
                          name={`itemPrice_${index}`}
                          type="number"
                          step="0.01"
                          min="0"
                          defaultValue={item.salePrice}
                          className={inputClass}
                        />
                        <input
                          name={`itemLimit_${index}`}
                          type="number"
                          min="0"
                          defaultValue={item.quantityLimit}
                          className={inputClass}
                        />
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <SubmitButton variant="outline" pendingLabel="Saving">
                      Save promotion
                    </SubmitButton>
                  </div>
                </form>
                <form action={deletePromotionAction} className="border-t border-hairline px-4 py-3">
                  <input type="hidden" name="id" value={sale.id} />
                  <SubmitButton variant="danger" pendingLabel="Removing">
                    Delete promotion
                  </SubmitButton>
                </form>
              </details>
            </Panel>
          ))}
        </div>
      )}

      <Panel>
        <PanelHead title="New flash sale" hint="Pick up to a handful of products to keep the sale focused." />
        <form action={savePromotionAction} className="grid gap-3">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <Field title="Name">
              <input name="name" placeholder="Weekend audio drop" className={inputClass} />
            </Field>
            <Field title="Headline">
              <input name="headline" placeholder="Up to 30% off, this weekend only" className={inputClass} />
            </Field>
            <Field title="Status">
              <select name="status" defaultValue="draft" className={selectClass}>
                <option value="draft">Draft</option>
                <option value="scheduled">Scheduled</option>
                <option value="live">Live</option>
              </select>
            </Field>
            <Field title="Starts">
              <input name="startsAt" type="datetime-local" className={inputClass} />
            </Field>
            <Field title="Ends">
              <input name="endsAt" type="datetime-local" className={inputClass} />
            </Field>
            <Field title="Banner URL">
              <input name="bannerUrl" placeholder="https://" className={inputClass} />
            </Field>
          </div>

          <div className="grid gap-2">
            <p className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-chalk-dim">
              Products — pick a product and set its sale price
            </p>
            {[0, 1, 2].map((index) => (
              <div key={index} className="grid gap-2 rounded-[2px] border border-hairline p-3 md:grid-cols-[1fr_140px_140px]">
                <select name="itemProductId" defaultValue="" className={selectClass}>
                  <option value="">No product</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.title} · {money(product.price)}
                    </option>
                  ))}
                </select>
                <input name={`itemPrice_${index}`} type="number" step="0.01" min="0" placeholder="Sale price" className={inputClass} />
                <input name={`itemLimit_${index}`} type="number" min="0" placeholder="Quantity limit" className={inputClass} />
              </div>
            ))}
          </div>

          <div>
            <SubmitButton pendingLabel="Creating">
              <Plus width={14} height={14} />
              Create promotion
            </SubmitButton>
          </div>
        </form>
      </Panel>

      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-chalk-dim">
        <Megaphone width={11} height={11} className="mr-1 inline" />
        {sales.length} promotion{sales.length === 1 ? "" : "s"} · {sales.filter((s) => s.status === "live").length} live
      </p>
    </div>
  );
}

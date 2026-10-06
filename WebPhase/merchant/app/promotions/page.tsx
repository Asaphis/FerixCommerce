import { PromotionForm } from "@/components/studio/promotion-form";
import { requireMerchant } from "@/lib/data";
import { listPromotions } from "@/lib/api";
import { Empty, Eyebrow, Panel, PanelHead, Pill } from "@/components/studio/bits";
import { dateShort, money, num, titleCase } from "@/lib/format";

function statusTone(status: string) {
  if (status === "active") return "success" as const;
  if (status === "scheduled") return "info" as const;
  if (status === "draft") return "warn" as const;
  return "neutral" as const;
}

export default async function PromotionsPage() {
  const { session } = await requireMerchant();
  const data = await listPromotions(session);

  return (
    <div className="grid gap-5">
      <header>
        <Eyebrow>Catalogue</Eyebrow>
        <h1 className="mt-1.5 font-display text-[23px] font-semibold text-chalk">Promotions</h1>
        <p className="mt-1.5 max-w-[72ch] text-[13px] leading-relaxed text-chalk-dim">
          A promotion does not change the product record — it adds a temporary price window on the products
          you choose.
        </p>
      </header>

      <div className="grid gap-3 lg:grid-cols-[1.55fr_1fr]">
        <div className="grid content-start gap-3">
          {data.sales.length ? (
            data.sales.map((sale) => (
              <Panel key={sale.id} flush>
                <div className="flex flex-wrap items-start justify-between gap-4 p-5 pb-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-display text-[15px] font-semibold text-chalk">{sale.name}</h2>
                      <Pill tone={statusTone(sale.status)}>{titleCase(sale.status)}</Pill>
                    </div>
                    <p className="mt-1.5 text-[12.5px] text-chalk-dim">{sale.headline || "No headline yet"}</p>
                    <p className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-chalk-dim">
                      {dateShort(sale.startsAt)} → {dateShort(sale.endsAt)} · {sale.items.length} product(s)
                    </p>
                  </div>
                  {sale.bannerUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={sale.bannerUrl}
                      alt={`${sale.name} banner`}
                      loading="lazy"
                      className="h-14 w-24 shrink-0 rounded-[2px] border border-hairline object-cover"
                    />
                  ) : null}
                </div>

                {sale.items.length ? (
                  <div className="overflow-x-auto px-5 pb-5">
                    <table className="w-full min-w-[520px] border-collapse text-left">
                      <thead>
                        <tr>
                          {["Product", "Sale price", "Limit", "Sold"].map((head) => (
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
                        {sale.items.map((item) => (
                          <tr key={item.id} className="border-b border-hairline/60 last:border-0">
                            <td className="py-3 pr-4 text-[12.5px] text-chalk">{item.title}</td>
                            <td className="py-3 pr-4 font-mono text-[12.5px] tabular-nums text-chalk">
                              {money(item.salePrice)}
                            </td>
                            <td className="py-3 pr-4 font-mono text-[12.5px] tabular-nums text-chalk-dim">
                              {num(item.quantityLimit)}
                            </td>
                            <td className="py-3 font-mono text-[12.5px] tabular-nums text-chalk-dim">
                              {num(item.soldQuantity)} / {num(item.quantityLimit)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="px-5 pb-5 text-[12.5px] text-chalk-dim">No products on this promotion yet.</p>
                )}
              </Panel>
            ))
          ) : (
            <Empty
              title="No promotions yet"
              body="Create one on the right and it runs as a temporary price window on the products you pick."
            />
          )}
        </div>

        <div className="grid content-start gap-3">
          <PromotionForm products={data.products} />
          <Panel>
            <PanelHead title="How this works" hint="Nothing here edits your catalogue" />
            <ul className="grid gap-2.5 text-[12.5px] leading-relaxed text-chalk-dim">
              <li className="rounded-[2px] border border-hairline p-3">
                <span className="block text-chalk">Price window</span>
                The sale price applies only while the promotion is live.
              </li>
              <li className="rounded-[2px] border border-hairline p-3">
                <span className="block text-chalk">Product record</span>
                Your catalogue price, stock and channels stay exactly as they are.
              </li>
            </ul>
          </Panel>
        </div>
      </div>

      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-chalk-dim/70">
        {data.sales.length} promotion(s) · {data.products.length} product(s) available to promote
      </p>
    </div>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MapPin, Package, Truck } from "lucide-react";
import { requireMerchant } from "@/lib/data";
import { getOrder, ApiError } from "@/lib/api";
import { OrderStatusForms } from "@/components/studio/order-status-form";
import { SubmitButton } from "@/components/studio/controls";
import { Eyebrow, Panel, PanelHead, Pill } from "@/components/studio/bits";
import { statusTone } from "@/components/studio/order-bits";
import { dateLong, money, titleCase } from "@/lib/format";

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { session } = await requireMerchant();
  let data;
  try {
    data = await getOrder(session, id);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }
  const { order, carriers } = data;
  const isPaid = ["paid", "captured", "succeeded", "settled"].includes(String(order.payment ?? "pending").toLowerCase());

  return (
    <div className="grid gap-5">
      <div>
        <Link
          href="/orders"
          className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-chalk-dim transition-colors hover:text-chalk"
        >
          <ArrowLeft width={12} height={12} /> Order queue
        </Link>
      </div>

      <header className="shrinkable flex flex-wrap items-start justify-between gap-4">
        <div>
          <Eyebrow>Order</Eyebrow>
          <h1 className="mt-1.5 font-display text-[23px] font-semibold text-chalk">{order.number}</h1>
          <p className="mt-1.5 font-mono text-[10.5px] uppercase tracking-[0.14em] text-chalk-dim">
            Placed {dateLong(order.placedAt)} · Ferixas marketplace
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Pill tone={statusTone(order.fulfillment)}>{titleCase(order.fulfillment)}</Pill>
          <Pill tone={isPaid ? "success" : order.payment === "refunded" ? "danger" : "warn"}>
            {titleCase(order.payment ?? "pending")}
          </Pill>
          <p className="font-mono text-[18px] font-semibold text-chalk">{money(order.total)}</p>
        </div>
      </header>

      <div className="grid gap-3 lg:grid-cols-[1.4fr_1fr]">
        <div className="grid gap-3">
          <Panel>
            <PanelHead title="Items" />
            <ul className="divide-y divide-hairline">
              {order.items.map((item) => (
                <li key={`${item.productId}-${item.variant ?? ""}`} className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="text-[13.5px] font-medium text-chalk">{item.title}</p>
                    <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-chalk-dim">
                      {item.variant ? `${item.variant} · ` : ""}Qty {item.qty} · {money(item.price)} each
                    </p>
                  </div>
                  <p className="font-mono text-[13px] tabular-nums text-chalk">{money(item.price * item.qty)}</p>
                </li>
              ))}
            </ul>

            <dl className="mt-4 space-y-2.5 border-t border-hairline pt-4">
              {[
                ["Subtotal", money(order.subtotal)],
                ["Delivery", order.shipping === 0 ? "Free" : money(order.shipping)],
                ["Tax", money(order.tax)],
                ["Marketplace commission", isPaid ? money(order.commission) : "Calculated only after payment"],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-3">
                  <dt className="text-[12.5px] text-chalk-dim">{label}</dt>
                  <dd className="font-mono text-[12.5px] text-chalk">{value}</dd>
                </div>
              ))}
              <div className="flex justify-between gap-3 border-t border-hairline pt-3">
                <dt className="font-display text-[14px] font-semibold text-chalk">Order total</dt>
                <dd className="font-mono text-[15px] font-semibold text-chalk">{money(order.total)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-[12.5px] text-chalk-dim">{isPaid ? "Estimated seller proceeds" : "Seller proceeds"}</dt>
                <dd className="font-mono text-[12.5px] text-lime">{isPaid ? money(order.subtotal - order.commission + order.shipping) : "Not recognized as revenue"}</dd>
              </div>
            </dl>
          </Panel>

          <Panel>
            <PanelHead title="Fulfilment" />
            <OrderStatusForms orderId={order.id} carrier={order.carrier} tracking={order.tracking} carriers={carriers} paid={isPaid} fulfillment={order.fulfillment} />
            {order.tracking ? (
              <p className="mt-4 flex items-center gap-2 rounded-[2px] border border-hairline bg-panel-2 px-3 py-2.5 font-mono text-[11.5px] text-chalk">
                <Package width={13} height={13} /> {order.carrier} · {order.tracking}
              </p>
            ) : (
              <p className="mt-4 rounded-[2px] border border-hairline bg-panel-2 px-3 py-2.5 font-mono text-[11.5px] text-chalk-dim">
                No tracking yet — it is added when you mark the order shipped.
              </p>
            )}
          </Panel>
        </div>

        <div className="grid gap-3">
          <Panel>
            <PanelHead title={isPaid ? "Customer and delivery" : "Payment pending"} />
            {isPaid ? <>
              <p className="text-[14px] font-medium text-chalk">{order.customer.name}</p>
              <p className="mt-1 font-mono text-[11px] text-chalk-dim">{order.customer.phone}</p>
              <p className="mt-3 flex items-start gap-2 text-[12.5px] text-chalk-dim">
                <MapPin width={13} height={13} className="mt-[3px] shrink-0 text-chalk-dim" />
                <span>{order.address.line1}{order.address.line2 ? `, ${order.address.line2}` : ""}<br />{order.address.city}, {order.address.region} {order.address.postcode}<br />{order.address.country}</span>
              </p>
            </> : <p className="text-[12px] leading-relaxed text-chalk-dim">Payment is not confirmed. Customer contact details, delivery address, and order notes remain hidden until it is paid.</p>}
          </Panel>

          {isPaid && order.note ? (
            <Panel>
              <PanelHead title="Note from the shopper" />
              <p className="text-[12.5px] leading-relaxed text-chalk">“{order.note}”</p>
            </Panel>
          ) : null}

          <Panel>
            <PanelHead title="Channel" />
            <p className="text-[13px] text-chalk">Ferixas marketplace</p>
            <p className="mt-1.5 text-[12px] leading-relaxed text-chalk-dim">Commission applies to paid marketplace item value. A seller’s separate website is not part of Ferixas orders.</p>
          </Panel>
        </div>
      </div>
    </div>
  );
}

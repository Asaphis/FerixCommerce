import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Check, MapPin, Package, Truck } from "lucide-react";
import { getOrder, ApiError } from "@/lib/api";
import { readCredentials } from "@/lib/session";
import { reorderAction } from "@/lib/actions";
import { Eyebrow, LinkButton, Pill } from "@/components/ferix/marks";
import { dateLong, money } from "@/lib/format";

export default async function OrderConfirmationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const creds = await readCredentials();
  if (!creds.session) redirect("/login");

  let data;
  try {
    data = await getOrder(id, creds);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }
  const { order, merchants } = data;

  return (
    <div className="mx-auto max-w-[1000px] px-4 py-10">
      <div className="rounded-[3px] border border-line-warm bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-pine/40 bg-pine/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-pine">
              <Check width={11} height={11} /> Order placed
            </span>
            <h1 className="mt-3 font-display text-[26px] font-semibold text-ink">Thank you — order {order.number}</h1>
            <p className="mt-2 font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-soft">
              Placed {dateLong(order.placedAt)} · {order.items.length} line{order.items.length === 1 ? "" : "s"} · {order.merchantIds.length} seller{order.merchantIds.length === 1 ? "" : "s"}
            </p>
          </div>
          <div className="text-right">
            <Pill tone={order.payment === "paid" ? "success" : "warn"}>{order.payment}</Pill>
            <p className="mt-2 font-mono text-[20px] font-semibold text-ink">{money(order.total)}</p>
          </div>
        </div>

        <ol className="mt-6 grid gap-3 sm:grid-cols-4">
          {order.timeline.map((step, index) => (
            <li key={step.label} className="rounded-[2px] border border-line-warm p-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft">Step {index + 1}</p>
              <p className="mt-1 text-[13px] font-medium text-ink">{step.label}</p>
              <p className="mt-0.5 text-[11.5px] text-ink-soft">{step.at ? dateLong(step.at) : "Pending"}</p>
            </li>
          ))}
        </ol>

        {order.tracking ? (
          <p className="mt-5 flex flex-wrap items-center gap-2 rounded-[2px] border border-line-warm bg-bone-soft px-3 py-2.5 font-mono text-[11.5px] text-ink">
            <Truck width={13} height={13} /> {order.carrier} · tracking {order.tracking}
          </p>
        ) : (
          <p className="mt-5 rounded-[2px] border border-line-warm bg-bone-soft px-3 py-2.5 font-mono text-[11.5px] text-ink-soft">
            Tracking appears here as soon as each seller dispatches their part of the order.
          </p>
        )}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          {merchants.map((merchant) => (
            <section key={merchant.id} className="rounded-[3px] border border-line-warm bg-white p-5">
              <div className="flex items-center gap-3 border-b border-line-warm pb-3">
                <span
                  className="grid h-9 w-9 place-items-center rounded-[2px] font-display text-[14px] font-extrabold"
                  style={{ background: merchant.brand.accent, color: merchant.brand.accentInk }}
                >
                  {merchant.name.slice(0, 1)}
                </span>
                <div>
                  <Link href={`/store/${merchant.slug}`} className="font-display text-[14.5px] font-semibold text-ink hover:text-ember">
                    {merchant.name}
                  </Link>
                  <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft">
                    {merchant.items.length} item{merchant.items.length === 1 ? "" : "s"} · packing
                  </p>
                </div>
              </div>
              <ul className="mt-3 space-y-3">
                {merchant.items.map((item) => (
                  <li key={`${item.productId}-${item.variant ?? ""}`} className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-[13.5px] font-medium text-ink">{item.title}</p>
                      <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-soft">
                        {item.variant ? `${item.variant} · ` : ""}Qty {item.qty}
                      </p>
                    </div>
                    <p className="font-mono text-[13px] text-ink">{money(item.price * item.qty)}</p>
                  </li>
                ))}
              </ul>
            </section>
          ))}

          <div className="flex flex-wrap gap-3">
            <form action={reorderAction}>
              <input type="hidden" name="orderId" value={order.id} />
              <button
                type="submit"
                className="inline-flex cursor-pointer items-center gap-2 rounded-[2px] border border-ink/25 px-4 py-2.5 text-[13px] font-semibold text-ink transition-colors hover:border-ink"
              >
                <Package width={15} height={15} /> Buy these again
              </button>
            </form>
            <LinkButton href="/browse" variant="solid">
              Keep shopping
            </LinkButton>
            <LinkButton href="/account/orders" variant="ghost">
              All my orders
            </LinkButton>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-[3px] border border-line-warm bg-white p-5">
            <Eyebrow>Delivering to</Eyebrow>
            <p className="mt-2 flex items-start gap-2 text-[13.5px] text-ink">
              <MapPin width={14} height={14} className="mt-[3px] shrink-0 text-ember" />
              <span>
                {order.address.name}
                <span className="block text-[12.5px] text-ink-soft">
                  {order.address.line1}
                  {order.address.line2 ? `, ${order.address.line2}` : ""}
                  <br />
                  {order.address.city}, {order.address.region} {order.address.postcode}
                  <br />
                  {order.address.country}
                  <br />
                  {order.address.phone}
                </span>
              </span>
            </p>
            {order.note ? (
              <p className="mt-3 rounded-[2px] border border-line-warm bg-bone-soft px-3 py-2 text-[12.5px] text-ink-soft">
                “{order.note}”
              </p>
            ) : null}
          </div>

          <div className="rounded-[3px] border border-line-warm bg-white p-5">
            <Eyebrow>Payment</Eyebrow>
            <dl className="mt-3 space-y-2.5">
              <div className="flex justify-between">
                <dt className="text-[13px] text-ink-soft">Subtotal</dt>
                <dd className="font-mono text-[13px] text-ink">{money(order.subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[13px] text-ink-soft">Delivery</dt>
                <dd className="font-mono text-[13px] text-ink">{order.shipping === 0 ? "Free" : money(order.shipping)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[13px] text-ink-soft">Tax</dt>
                <dd className="font-mono text-[13px] text-ink">{money(order.tax)}</dd>
              </div>
              <div className="flex justify-between border-t border-line-warm pt-3">
                <dt className="font-display text-[14px] font-semibold text-ink">Paid</dt>
                <dd className="font-mono text-[14.5px] font-semibold text-ink">{money(order.total)}</dd>
              </div>
            </dl>
          </div>
        </aside>
      </div>
    </div>
  );
}

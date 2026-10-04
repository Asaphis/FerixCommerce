import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Check, CreditCard, MapPin, MessageSquare, Package, RotateCcw, Truck } from "lucide-react";
import { getOrder, ApiError } from "@/lib/api";
import { requireAccount } from "@/lib/data";
import { readCredentials } from "@/lib/session";
import { reorderAction } from "@/lib/actions";
import { AccountShell } from "@/components/ferix/account-shell";
import { Plate } from "@/components/ferix/marks";
import { dateLong, money } from "@/lib/format";
import { orderStages, statusHeadline, statusLabel, statusTone } from "@/lib/orders";
import { cn } from "@/lib/utils";

const DARK_CHIP: Record<string, string> = {
  success: "bg-lime text-void",
  info: "bg-azure text-white",
  warn: "bg-sand text-void",
  neutral: "bg-chalk/15 text-chalk",
  danger: "bg-ember text-white",
  ember: "bg-ember text-white",
};

export default async function OrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ placed?: string }>;
}) {
  const [{ id }, { placed }] = await Promise.all([params, searchParams]);
  const creds = await readCredentials();
  const account = await requireAccount();

  let data: Awaited<ReturnType<typeof getOrder>>;
  try {
    data = await getOrder(id, creds);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }
  const { order, merchants } = data;
  const stages = orderStages(order);
  const items = order.items.reduce((sum, item) => sum + item.qty, 0);

  return (
    <AccountShell
      account={account}
      title={`Order ${order.number}`}
      description={`Placed ${dateLong(order.placedAt)} · ${items} item${items === 1 ? "" : "s"} from ${order.merchantIds.length} seller${order.merchantIds.length === 1 ? "" : "s"}`}
      actions={
        <>
          <Link
            href="/account/orders"
            className="inline-flex items-center gap-2 rounded-[2px] border border-line-warm bg-white px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft transition-colors hover:border-ink/40 hover:text-ink"
          >
            <ArrowLeft width={13} height={13} /> All orders
          </Link>
          <form action={reorderAction}>
            <input type="hidden" name="orderId" value={order.id} />
            <button
              type="submit"
              className="inline-flex cursor-pointer items-center gap-2 rounded-[2px] bg-ink px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-bone transition-colors hover:bg-ember"
            >
              <RotateCcw width={13} height={13} /> Buy again
            </button>
          </form>
        </>
      }
    >
      {placed ? (
        <div className="mb-3 flex items-start gap-3 rounded-[3px] border border-pine/40 bg-pine/10 p-3.5">
          <Check width={16} height={16} className="mt-0.5 shrink-0 text-pine" />
          <div className="min-w-0">
            <p className="text-[13.5px] font-semibold text-pine">Order placed — thank you</p>
            <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink-soft">
              A confirmation is on its way to your inbox. Each seller dispatches their own items, so tracking can arrive
              in more than one update.
            </p>
          </div>
        </div>
      ) : null}

      {/* ── tracking ─────────────────────────────────────────────── */}
      <section className="overflow-hidden rounded-[3px] bg-void text-chalk">
        <div className="p-4 lg:p-6">
          <div className="flex flex-wrap items-center gap-2.5">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-[2px] px-2 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.12em]",
                DARK_CHIP[statusTone(order.fulfillment)] ?? DARK_CHIP.neutral,
              )}
            >
              <Truck width={12} height={12} strokeWidth={2.4} />
              {statusLabel(order.fulfillment)}
            </span>
            {order.carrier && order.tracking ? (
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-chalk-dim">
                {order.carrier} · {order.tracking}
              </span>
            ) : null}
          </div>

          <h2 className="mt-3 font-display text-[19px] font-semibold leading-tight text-chalk lg:text-[23px]">
            {statusHeadline(order)}
          </h2>

          <ol className="mt-5 space-y-0">
            {stages.map((stage, index) => (
              <li key={stage.label} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span
                    className={cn(
                      "grid h-5 w-5 shrink-0 place-items-center rounded-full",
                      stage.state === "todo" ? "border-2 border-hairline" : "bg-lime text-void",
                    )}
                  >
                    {stage.state === "done" ? <Check width={11} height={11} strokeWidth={3.2} /> : null}
                    {stage.state === "current" ? <span className="h-1.5 w-1.5 rounded-full bg-void" /> : null}
                  </span>
                  {index < stages.length - 1 ? (
                    <span className={cn("w-[2px] flex-1", stage.state === "todo" ? "bg-hairline" : "bg-lime")} />
                  ) : null}
                </div>
                <div className="pb-4">
                  <p
                    className={cn(
                      "text-[13.5px] font-medium",
                      stage.state === "todo" ? "text-chalk-dim" : "text-chalk",
                    )}
                  >
                    {stage.label}
                  </p>
                  <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-chalk-dim">
                    {stage.at ? dateLong(stage.at) : stage.state === "current" ? "In progress" : "Pending"}
                  </p>
                </div>
              </li>
            ))}
          </ol>

          <div className="mt-2 flex flex-wrap gap-2">
            <Link
              href="/help"
              className="inline-flex items-center gap-2 rounded-[2px] bg-lime px-3.5 py-2.5 font-mono text-[10.5px] font-semibold uppercase tracking-[0.14em] text-void transition-colors hover:bg-white"
            >
              <MessageSquare width={14} height={14} /> Get help with this order
            </Link>
            <Link
              href="/returns"
              className="inline-flex items-center gap-2 rounded-[2px] border border-hairline px-3.5 py-2.5 font-mono text-[10.5px] uppercase tracking-[0.14em] text-chalk transition-colors hover:border-chalk/40"
            >
              Return or exchange
            </Link>
          </div>
        </div>
      </section>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        {/* ── items ──────────────────────────────────────────────── */}
        <div className="space-y-3">
          <h2 className="font-display text-[17px] font-semibold text-ink">What's in this order</h2>
          {merchants.map((merchant) => (
            <section key={merchant.id} className="overflow-hidden rounded-[3px] border border-line-warm bg-white">
              <header className="flex items-center gap-3 border-b border-line-warm px-3.5 py-3 lg:px-5">
                <span
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-[2px] font-display text-[14px] font-extrabold"
                  style={{ background: merchant.brand.accent, color: merchant.brand.accentInk }}
                >
                  {merchant.name.slice(0, 1)}
                </span>
                <div className="min-w-0">
                  <Link
                    href={`/store/${merchant.slug}`}
                    className="block truncate font-display text-[14px] font-semibold text-ink hover:text-ember"
                  >
                    {merchant.name}
                  </Link>
                  <p className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-ink-soft">
                    {merchant.items.length} item{merchant.items.length === 1 ? "" : "s"} · packed by the seller
                  </p>
                </div>
                <Link
                  href={`/store/${merchant.slug}`}
                  className="ml-auto shrink-0 font-mono text-[10px] uppercase tracking-[0.14em] text-ember"
                >
                  Visit store
                </Link>
              </header>
              <ul className="divide-y divide-line-warm">
                {merchant.items.map((item) => (
                  <li key={`${item.productId}-${item.variant ?? ""}`} className="flex items-center gap-3 px-3.5 py-3 lg:px-5">
                    <Plate seed={item.productId} className="h-12 w-12 shrink-0 rounded-[2px]" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13.5px] font-medium text-ink">{item.title}</p>
                      <p className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-ink-soft">
                        {item.variant ? `${item.variant} · ` : ""}Qty {item.qty} · {money(item.price)} each
                      </p>
                    </div>
                    <p className="shrink-0 font-mono text-[13px] tabular-nums text-ink">{money(item.price * item.qty)}</p>
                  </li>
                ))}
              </ul>
            </section>
          ))}

          <div className="flex flex-wrap gap-2">
            <Link
              href="/browse"
              className="inline-flex items-center gap-2 rounded-[2px] border border-ink/20 bg-white px-3.5 py-2.5 font-mono text-[10px] uppercase tracking-[0.14em] text-ink transition-colors hover:border-ink"
            >
              <Package width={13} height={13} /> Keep shopping
            </Link>
          </div>
        </div>

        {/* ── delivery, payment ──────────────────────────────────── */}
        <aside className="space-y-3">
          <section className="rounded-[3px] border border-line-warm bg-white p-3.5 lg:p-5">
            <p className="flex items-center gap-2 font-mono text-[9.5px] uppercase tracking-[0.14em] text-ink-soft">
              <MapPin width={13} height={13} className="text-ember" /> Delivering to
            </p>
            <p className="mt-2 text-[13.5px] font-medium text-ink">{order.address.name}</p>
            <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink-soft">
              {order.address.line1}
              {order.address.line2 ? `, ${order.address.line2}` : ""}
              <br />
              {order.address.city}, {order.address.region} {order.address.postcode}
              <br />
              {order.address.country} · {order.address.phone}
            </p>
            {order.note ? (
              <p className="mt-3 rounded-[2px] border border-line-warm bg-bone-soft px-3 py-2 text-[12.5px] text-ink-soft">
                “{order.note}”
              </p>
            ) : null}
            <p className="mt-3 border-t border-line-warm pt-3 font-mono text-[9.5px] uppercase tracking-[0.12em] text-ink-soft">
              {order.carrier ? `Dispatched with ${order.carrier}` : "Dispatched by the seller"}
            </p>
          </section>

          <section className="rounded-[3px] border border-line-warm bg-white p-3.5 lg:p-5">
            <p className="flex items-center gap-2 font-mono text-[9.5px] uppercase tracking-[0.14em] text-ink-soft">
              <CreditCard width={13} height={13} className="text-ember" /> Payment
            </p>
            <dl className="mt-3 space-y-2.5">
              <div className="flex justify-between gap-3">
                <dt className="text-[12.5px] text-ink-soft">Subtotal</dt>
                <dd className="font-mono text-[12.5px] tabular-nums text-ink">{money(order.subtotal)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-[12.5px] text-ink-soft">Delivery</dt>
                <dd className="font-mono text-[12.5px] tabular-nums text-ink">
                  {order.shipping === 0 ? "Free" : money(order.shipping)}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-[12.5px] text-ink-soft">Tax</dt>
                <dd className="font-mono text-[12.5px] tabular-nums text-ink">{money(order.tax)}</dd>
              </div>
              <div className="flex justify-between gap-3 border-t border-line-warm pt-2.5">
                <dt className="font-display text-[14px] font-semibold text-ink">
                  {order.payment === "paid" ? "Paid" : "Due"}
                </dt>
                <dd className="font-mono text-[14.5px] font-semibold tabular-nums text-ink">{money(order.total)}</dd>
              </div>
            </dl>
            <p className="mt-3 border-t border-line-warm pt-3 font-mono text-[9.5px] uppercase tracking-[0.12em] text-ink-soft">
              {order.payment === "paid" ? "Payment confirmed" : "Waiting for payment"} · placed through{" "}
              {order.channel}
            </p>
          </section>
        </aside>
      </div>
    </AccountShell>
  );
}

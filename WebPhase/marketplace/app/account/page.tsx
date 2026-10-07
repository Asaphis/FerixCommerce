import Link from "next/link";
import {
  ArrowRight,
  Check,
  CreditCard,
  Heart,
  Package,
  RotateCcw,
  Star,
  Truck,
  Wallet,
} from "lucide-react";
import { requireAccount } from "@/lib/data";
import { getShipping, assetUrl } from "@/lib/api";
import { reorderAction } from "@/lib/actions";
import { AccountShell } from "@/components/ferix/account-shell";
import { ProductRail } from "@/components/ferix/cards";
import { Eyebrow, Plate, Pill } from "@/components/ferix/marks";
import { dateShort, money, relative } from "@/lib/format";
import {
  activeOrder,
  byNewest,
  itemsSummary,
  orderStages,
  statusHeadline,
  statusLabel,
  statusTone,
} from "@/lib/orders";
import { cn } from "@/lib/utils";

const SHORT_STAGE: Record<string, string> = {
  "Order placed": "Placed",
  "Payment confirmed": "Paid",
  "Packed by seller": "Packed",
  "In transit": "Transit",
  Delivered: "Delivered",
};

/** Status chips sit on the dark tracking panel, so they carry their own palette. */
const DARK_CHIP: Record<string, string> = {
  success: "bg-lime text-void",
  info: "bg-azure text-white",
  warn: "bg-sand text-void",
  neutral: "bg-chalk/15 text-chalk",
  danger: "bg-ember text-white",
  ember: "bg-ember text-white",
};

export default async function AccountPage() {
  const account = await requireAccount();
  const { user, orders, wishlist, addresses, stats } = account;
  const shipping = await getShipping().catch(() => null);

  const focus = activeOrder(orders);
  const stages = focus ? orderStages(focus) : [];
  const recent = byNewest(orders).slice(0, 4);
  const defaultAddress = addresses.find((address) => address.isDefault) ?? addresses[0];
  const savedIds = wishlist.map((product) => product.id);

  // Reorder shortcuts: the first item of each of the three most recent orders.
  const buyAgain = byNewest(orders)
    .slice(0, 3)
    .flatMap((order) => (order.items[0] ? [{ order, item: order.items[0] }] : []));

  return (
    <AccountShell
      account={account}
      title="Overview"
      description="Your orders, saved items and delivery details in one place."
    >
      {/* ── tracking ───────────────────────────────────────────────── */}
      {focus ? (
        <section className="overflow-hidden rounded-[3px] bg-void text-chalk">
          <div className="lg:grid lg:grid-cols-[1.6fr_1fr]">
            <div className="p-4 sm:p-5 lg:p-6">
              <div className="flex flex-wrap items-center gap-2.5">
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-[2px] px-2 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.12em]",
                    DARK_CHIP[statusTone(focus.fulfillment)] ?? DARK_CHIP.neutral,
                  )}
                >
                  <Truck width={12} height={12} strokeWidth={2.4} />
                  {statusLabel(focus.fulfillment)}
                </span>
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-chalk-dim">
                  {focus.number}
                </span>
              </div>

              <h2 className="mt-3 font-display text-[20px] font-semibold leading-tight text-chalk sm:text-[25px]">
                {statusHeadline(focus)}
              </h2>
              <p className="mt-1 font-mono text-[10.5px] uppercase tracking-[0.12em] text-chalk-dim">
                {focus.items.length} item{focus.items.length === 1 ? "" : "s"} · {money(focus.total)}
                {focus.carrier ? ` · ${focus.carrier}` : ""}
                {focus.tracking ? ` · ${focus.tracking}` : ""}
              </p>

              <ol className="mt-5 grid grid-cols-5 gap-1">
                {stages.map((stage) => (
                  <li key={stage.label}>
                    <div className="flex items-center gap-1">
                      <span
                        className={cn(
                          "grid h-4 w-4 shrink-0 place-items-center rounded-full",
                          stage.state === "done" && "bg-lime text-void",
                          stage.state === "current" && "bg-lime text-void",
                          stage.state === "todo" && "border-2 border-hairline",
                        )}
                      >
                        {stage.state === "done" ? <Check width={10} height={10} strokeWidth={3.2} /> : null}
                        {stage.state === "current" ? <span className="h-1.5 w-1.5 rounded-full bg-void" /> : null}
                      </span>
                      {stage.state !== "todo" ? <span className="h-[2px] flex-1 bg-lime" /> : <span className="h-[2px] flex-1 bg-hairline" />}
                    </div>
                    <p
                      className={cn(
                        "mt-2 font-mono text-[8.5px] uppercase tracking-[0.08em] sm:text-[9px]",
                        stage.state === "current" ? "text-lime" : stage.state === "done" ? "text-chalk" : "text-chalk-dim",
                      )}
                    >
                      {SHORT_STAGE[stage.label] ?? stage.label}
                    </p>
                    {stage.at ? (
                      <p className="font-mono text-[8.5px] text-chalk-dim sm:text-[9px]">{dateShort(stage.at)}</p>
                    ) : null}
                  </li>
                ))}
              </ol>

              <p className="mt-4 font-mono text-[9.5px] uppercase tracking-[0.14em] text-chalk-dim">
                Placed {dateShort(focus.placedAt)} · {relative(focus.placedAt)}
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  href={`/account/orders/${focus.id}`}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-[2px] bg-lime px-3.5 py-2.5 font-mono text-[10.5px] font-semibold uppercase tracking-[0.14em] text-void transition-colors hover:bg-white sm:flex-none"
                >
                  <Truck width={15} height={15} /> Track this order
                </Link>
                <form action={reorderAction} className="flex-1 sm:flex-none">
                  <input type="hidden" name="orderId" value={focus.id} />
                  <button
                    type="submit"
                    className="w-full cursor-pointer rounded-[2px] border border-hairline px-3.5 py-2.5 font-mono text-[10.5px] uppercase tracking-[0.14em] text-chalk transition-colors hover:border-chalk/40"
                  >
                    Buy again
                  </button>
                </form>
              </div>
            </div>

            <div className="border-t border-hairline p-4 sm:p-5 lg:border-l lg:border-t-0 lg:p-6">
              <p className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-chalk-dim">In this order</p>
              <ul className="mt-3 space-y-3">
                {focus.items.slice(0, 3).map((item) => (
                  <li key={`${item.productId}-${item.variant ?? ""}`} className="flex items-center gap-3">
                    <Plate seed={item.productId} src={assetUrl(item.image)} alt={item.title} className="h-11 w-11 shrink-0 rounded-[2px]" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] text-chalk">{item.title}</span>
                      <span className="block font-mono text-[9.5px] uppercase tracking-[0.12em] text-chalk-dim">
                        {item.merchantName} · Qty {item.qty}
                      </span>
                    </span>
                    <span className="font-mono text-[12px] tabular-nums text-chalk">{money(item.price)}</span>
                  </li>
                ))}
              </ul>
              {defaultAddress ? (
                <p className="mt-4 border-t border-hairline pt-3 font-mono text-[9.5px] uppercase tracking-[0.12em] text-chalk-dim">
                  Ships to {defaultAddress.label} · {defaultAddress.city}, {defaultAddress.country}
                </p>
              ) : null}
            </div>
          </div>
        </section>
      ) : (
        <section className="rounded-[3px] border border-dashed border-line-warm bg-white/60 px-6 py-12 text-center">
          <Package width={22} height={22} className="mx-auto text-ink-soft" />
          <p className="mt-3 font-display text-[17px] font-semibold text-ink">No orders yet</p>
          <p className="mx-auto mt-1.5 max-w-[44ch] text-[13px] leading-relaxed text-ink-soft">
            Anything you buy across the marketplace lands here, with tracking from every seller.
          </p>
          <Link
            href="/browse"
            className="mt-5 inline-flex items-center gap-2 rounded-[2px] bg-ink px-4 py-2.5 text-[13px] font-semibold text-bone transition-colors hover:bg-ember"
          >
            Start shopping <ArrowRight width={14} height={14} />
          </Link>
        </section>
      )}

      {/* ── stats ──────────────────────────────────────────────────── */}
      <section className="mt-3 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        {[
          { href: "/account/orders", label: "Orders", value: String(stats.orderCount), sub: `${account.activeOrders} still open`, Icon: Package },
          { href: "/account/orders", label: "Lifetime spend", value: money(stats.spent, { cents: false }), sub: `Avg ${money(stats.averageOrder, { cents: false })}`, Icon: Wallet },
          { href: "/account/wishlist", label: "Saved", value: String(stats.wishlistCount), sub: "Kept for later", Icon: Heart },
          { href: "/account/reviews", label: "Reviews", value: String(stats.reviewCount), sub: "Written by you", Icon: Star },
        ].map((tile) => (
          <Link
            key={tile.label}
            href={tile.href}
            className="rounded-[3px] border border-line-warm bg-white p-3.5 transition-colors hover:border-ink/25"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-ink-soft">{tile.label}</span>
              <tile.Icon width={14} height={14} className="text-ember" />
            </div>
            <p className="mt-2.5 font-mono text-[21px] font-semibold leading-none tabular-nums text-ink">{tile.value}</p>
            <p className="mt-1.5 font-mono text-[9.5px] uppercase tracking-[0.12em] text-ink-soft">{tile.sub}</p>
          </Link>
        ))}
      </section>

      {/* ── recent orders ──────────────────────────────────────────── */}
      <section className="mt-7">
        <div className="flex items-end justify-between gap-3">
          <h2 className="font-display text-[17px] font-semibold text-ink sm:text-[19px]">Recent orders</h2>
          <Link
            href="/account/orders"
            className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft transition-colors hover:text-ember"
          >
            View all {stats.orderCount} <ArrowRight width={13} height={13} />
          </Link>
        </div>

        {recent.length ? (
          <ul className="mt-3 divide-y divide-line-warm overflow-hidden rounded-[3px] border border-line-warm bg-white">
            {recent.map((order) => (
              <li key={order.id}>
                <details className="group">
                  <summary className="flex cursor-pointer list-none items-center gap-3 p-3.5 transition-colors hover:bg-bone-soft/60 lg:p-4 [&::-webkit-details-marker]:hidden">
                    <Plate seed={order.items[0]?.productId ?? order.id} src={assetUrl(order.items[0]?.image)} alt={order.items[0]?.title ?? ""} className="hidden h-11 w-11 shrink-0 rounded-[2px] sm:block" />
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-[12px] font-semibold text-ink">{order.number}</span>
                        <Pill tone={statusTone(order.fulfillment)}>{statusLabel(order.fulfillment)}</Pill>
                      </span>
                      <span className="mt-0.5 block truncate text-[12.5px] text-ink-soft">
                        {itemsSummary(order)} · {dateShort(order.placedAt)}
                      </span>
                    </span>
                    <span className="font-mono text-[12.5px] font-semibold tabular-nums text-ink">{money(order.total)}</span>
                    <ArrowRight
                      width={16}
                      height={16}
                      className="shrink-0 text-ink-soft transition-transform group-open:rotate-90"
                    />
                  </summary>

                  <div className="border-t border-line-warm bg-bone-soft/40 p-3.5 lg:p-4">
                    <ul className="space-y-2">
                      {order.items.map((item) => (
                        <li
                          key={`${item.productId}-${item.variant ?? ""}`}
                          className="flex items-center justify-between gap-3 text-[12.5px] text-ink-soft"
                        >
                          <span className="truncate">
                            {item.title}
                            {item.variant ? ` · ${item.variant}` : ""} · Qty {item.qty}
                          </span>
                          <span className="font-mono tabular-nums text-ink">{money(item.price * item.qty)}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-line-warm pt-3 font-mono text-[9.5px] uppercase tracking-[0.12em] text-ink-soft">
                      <span>{order.carrier && order.tracking ? `${order.carrier} · ${order.tracking}` : "Tracking appears when dispatched"}</span>
                      <span>{order.merchantIds.length} seller{order.merchantIds.length === 1 ? "" : "s"}</span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Link
                        href={`/account/orders/${order.id}`}
                        className="rounded-[2px] bg-ink px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-bone transition-colors hover:bg-ember"
                      >
                        Order details
                      </Link>
                      <form action={reorderAction}>
                        <input type="hidden" name="orderId" value={order.id} />
                        <button
                          type="submit"
                          className="cursor-pointer rounded-[2px] border border-ink/20 bg-white px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft transition-colors hover:border-ink/40 hover:text-ink"
                        >
                          Buy again
                        </button>
                      </form>
                    </div>
                  </div>
                </details>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 rounded-[3px] border border-dashed border-line-warm px-6 py-9 text-center text-[13.5px] text-ink-soft">
            No orders yet — anything you buy lands here with tracking.
          </p>
        )}
      </section>

      {/* ── saved + buy again ──────────────────────────────────────── */}
      <div className="mt-7 lg:grid lg:grid-cols-[1.45fr_1fr] lg:gap-6">
        <section className="min-w-0">
          <div className="flex items-end justify-between gap-3">
            <h2 className="font-display text-[17px] font-semibold text-ink sm:text-[19px]">Saved items</h2>
            <Link
              href="/account/wishlist"
              className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft transition-colors hover:text-ember"
            >
              All {stats.wishlistCount} <ArrowRight width={13} height={13} />
            </Link>
          </div>
          {wishlist.length ? (
            <div className="mt-3">
              <ProductRail products={wishlist.slice(0, 4)} savedIds={savedIds} />
            </div>
          ) : (
            <p className="mt-3 rounded-[3px] border border-dashed border-line-warm px-6 py-9 text-center text-[13.5px] text-ink-soft">
              Nothing saved yet — tap the heart on any product to keep it here.
            </p>
          )}
        </section>

        <section className="mt-7 min-w-0 lg:mt-0">
          <div className="flex items-end justify-between gap-3">
            <h2 className="font-display text-[17px] font-semibold text-ink sm:text-[19px]">Buy again</h2>
            <span className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-ink-soft">From recent orders</span>
          </div>
          {buyAgain.length ? (
            <ul className="mt-3 divide-y divide-line-warm overflow-hidden rounded-[3px] border border-line-warm bg-white">
              {buyAgain.map(({ order, item }) => (
                <li key={order.id} className="flex items-center gap-3 p-3">
                  <Plate seed={item.productId} src={assetUrl(item.image)} alt={item.title} className="h-10 w-10 shrink-0 rounded-[2px]" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12.5px] font-medium text-ink">{item.title}</span>
                    <span className="block font-mono text-[9.5px] uppercase tracking-[0.1em] text-ink-soft">
                      {order.number} · {dateShort(order.placedAt)}
                    </span>
                  </span>
                  <span className="font-mono text-[12px] font-semibold tabular-nums text-ink">{money(item.price)}</span>
                  <form action={reorderAction}>
                    <input type="hidden" name="orderId" value={order.id} />
                    <button
                      type="submit"
                      aria-label={`Buy ${item.title} again`}
                      className="grid h-8 w-8 cursor-pointer place-items-center rounded-[2px] bg-ink text-bone transition-colors hover:bg-ember"
                    >
                      <RotateCcw width={14} height={14} />
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 rounded-[3px] border border-dashed border-line-warm px-6 py-9 text-center text-[13.5px] text-ink-soft">
              Your reorder shortcuts appear here after your first purchase.
            </p>
          )}
        </section>
      </div>

      {/* ── delivery and payment strip ─────────────────────────────── */}
      <section className="mt-7 overflow-hidden rounded-[3px] border border-line-warm bg-white">
        <div className="grid divide-y divide-line-warm lg:grid-cols-3 lg:divide-x lg:divide-y-0">
          <div className="flex items-start gap-3 p-3.5">
            <Truck width={16} height={16} className="mt-0.5 shrink-0 text-ember" />
            <div className="min-w-0 flex-1">
              <p className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-ink-soft">
                Ships to{defaultAddress ? ` · ${defaultAddress.label}` : ""}
              </p>
              <p className="mt-1 truncate text-[12.5px] text-ink">
                {defaultAddress
                  ? `${defaultAddress.line1}, ${defaultAddress.city}, ${defaultAddress.country}`
                  : "No address saved yet"}
              </p>
            </div>
            <Link href="/account/addresses" className="shrink-0 font-mono text-[10px] uppercase tracking-[0.14em] text-ember">
              {defaultAddress ? "Change" : "Add"}
            </Link>
          </div>

          <div className="flex items-start gap-3 p-3.5">
            <CreditCard width={16} height={16} className="mt-0.5 shrink-0 text-ember" />
            <div className="min-w-0 flex-1">
              <p className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-ink-soft">Payment</p>
              <p className="mt-1 truncate text-[12.5px] text-ink">
                {shipping?.paymentMethods?.[0]
                  ? `${shipping.paymentMethods[0].label} · ${shipping.paymentMethods[0].detail}`
                  : "Card saved at checkout"}
              </p>
            </div>
            <Link href="/account/preferences" className="shrink-0 font-mono text-[10px] uppercase tracking-[0.14em] text-ember">
              Change
            </Link>
          </div>

          <div className="flex items-start gap-3 p-3.5">
            <RotateCcw width={16} height={16} className="mt-0.5 shrink-0 text-ember" />
            <div className="min-w-0 flex-1">
              <p className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-ink-soft">Returns</p>
              <p className="mt-1 truncate text-[12.5px] text-ink">
                30 days · free over {money(shipping?.freeShippingOver ?? 120, { cents: false })}
              </p>
            </div>
            <Link href="/returns" className="shrink-0 font-mono text-[10px] uppercase tracking-[0.14em] text-ember">
              Details
            </Link>
          </div>
        </div>
      </section>

      <p className="mt-5 font-mono text-[9.5px] uppercase tracking-[0.14em] text-ink-soft">
        <Eyebrow className="sr-only">Account note</Eyebrow>
        {user.name} · customer since {dateShort(stats.since)} · one checkout on every store
      </p>
    </AccountShell>
  );
}

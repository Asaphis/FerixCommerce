import Link from "next/link";
import { ArrowRight, Package, Truck } from "lucide-react";
import { requireAccount } from "@/lib/data";
import { reorderAction } from "@/lib/actions";
import { AccountShell } from "@/components/ferix/account-shell";
import { Pill } from "@/components/ferix/marks";
import { dateShort, money } from "@/lib/format";
import { byNewest, statusLabel, statusTone } from "@/lib/orders";
import { cn } from "@/lib/utils";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "processing", label: "Processing" },
  { id: "shipped", label: "In transit" },
  { id: "delivered", label: "Delivered" },
];

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const account = await requireAccount();
  const active = status ?? "all";
  const ordered = byNewest(account.orders);
  const orders = active === "all" ? ordered : ordered.filter((order) => order.fulfillment === active);

  return (
    <AccountShell
      account={account}
      title="Orders"
      description="Every seller's parcel in one list. Each seller packs and ships their own items, so one order can arrive in more than one delivery."
    >
      <div className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-wrap lg:px-0">
        {FILTERS.map((filter) => (
          <Link
            key={filter.id}
            href={filter.id === "all" ? "/account/orders" : `/account/orders?status=${filter.id}`}
            className={cn(
              "shrink-0 rounded-[2px] border px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] transition-colors",
              active === filter.id
                ? "border-ink bg-ink text-bone"
                : "border-line-warm bg-white text-ink-soft hover:border-ink/30 hover:text-ink",
            )}
          >
            {filter.label}
            <span className="ml-2 opacity-70">
              {filter.id === "all"
                ? account.stats.orderCount
                : account.orders.filter((order) => order.fulfillment === filter.id).length}
            </span>
          </Link>
        ))}
      </div>

      {orders.length ? (
        <div className="mt-4 space-y-3">
          {orders.map((order) => (
            <section key={order.id} className="overflow-hidden rounded-[3px] border border-line-warm bg-white">
              <header className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-line-warm px-3.5 py-3 lg:px-5 lg:py-4">
                <div className="min-w-0">
                  <Link
                    href={`/account/orders/${order.id}`}
                    className="font-mono text-[12.5px] font-semibold text-ink transition-colors hover:text-ember"
                  >
                    {order.number}
                  </Link>
                  <p className="mt-0.5 font-mono text-[9.5px] uppercase tracking-[0.14em] text-ink-soft">
                    {dateShort(order.placedAt)} · {order.merchantIds.length} seller
                    {order.merchantIds.length === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Pill tone={statusTone(order.fulfillment)}>{statusLabel(order.fulfillment)}</Pill>
                  <p className="font-mono text-[13.5px] font-semibold tabular-nums text-ink">{money(order.total)}</p>
                </div>
              </header>

              <div className="px-3.5 py-3 lg:px-5 lg:py-4">
                <ul className="space-y-2.5">
                  {order.items.map((item) => (
                    <li
                      key={`${item.productId}-${item.variant ?? ""}`}
                      className="flex items-start justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-medium text-ink">{item.title}</p>
                        <p className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-ink-soft">
                          {item.merchantName}
                          {item.variant ? ` · ${item.variant}` : ""} · Qty {item.qty}
                        </p>
                      </div>
                      <p className="shrink-0 font-mono text-[12.5px] tabular-nums text-ink">
                        {money(item.price * item.qty)}
                      </p>
                    </li>
                  ))}
                </ul>

                <p
                  className={cn(
                    "mt-3 flex flex-wrap items-center gap-2 rounded-[2px] border border-line-warm bg-bone-soft px-3 py-2 font-mono text-[11px]",
                    order.tracking ? "text-ink" : "text-ink-soft",
                  )}
                >
                  {order.tracking ? (
                    <>
                      <Truck width={13} height={13} /> {order.carrier} · {order.tracking}
                    </>
                  ) : (
                    "Tracking appears when the seller dispatches."
                  )}
                </p>

                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line-warm pt-3">
                  <Link
                    href={`/account/orders/${order.id}`}
                    className="inline-flex items-center gap-2 rounded-[2px] bg-ink px-3.5 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-bone transition-colors hover:bg-ember"
                  >
                    Track order <ArrowRight width={13} height={13} />
                  </Link>
                  <form action={reorderAction}>
                    <input type="hidden" name="orderId" value={order.id} />
                    <button
                      type="submit"
                      className="inline-flex cursor-pointer items-center gap-2 rounded-[2px] border border-line-warm px-3.5 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft transition-colors hover:border-ink/40 hover:text-ink"
                    >
                      <Package width={13} height={13} /> Buy again
                    </button>
                  </form>
                </div>
              </div>
            </section>
          ))}
        </div>
      ) : (
        <p className="mt-4 rounded-[3px] border border-dashed border-line-warm px-6 py-10 text-center text-[13.5px] text-ink-soft">
          No orders in this state.{" "}
          <Link href="/account/orders" className="text-ink underline decoration-ember decoration-2 underline-offset-4">
            Show every order
          </Link>
        </p>
      )}
    </AccountShell>
  );
}

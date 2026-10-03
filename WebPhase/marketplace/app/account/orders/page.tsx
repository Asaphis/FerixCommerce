import Link from "next/link";
import { Package, Truck } from "lucide-react";
import { requireAccount } from "@/lib/data";
import { reorderAction } from "@/lib/actions";
import { AccountNav } from "@/components/ferix/account-nav";
import { Eyebrow, LinkButton, Pill } from "@/components/ferix/marks";
import { dateLong, money, titleCase } from "@/lib/format";
import { cn } from "@/lib/utils";

const FILTERS = [
  { id: "all", label: "All orders" },
  { id: "processing", label: "Processing" },
  { id: "shipped", label: "Shipped" },
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
  const orders = active === "all" ? account.orders : account.orders.filter((order) => order.fulfillment === active);

  return (
    <div className="mx-auto max-w-[1240px] px-4 py-8">
      <Eyebrow>Your account</Eyebrow>
      <h1 className="mt-2 font-display text-[26px] font-semibold text-ink">Orders</h1>
      <p className="mt-2 max-w-[62ch] text-[13.5px] leading-relaxed text-ink-soft">
        Orders from every seller in one list. Each seller packs and ships their own items, so a single order can arrive
        in more than one parcel.
      </p>

      <div className="mt-6">
        <AccountNav />
      </div>

      <div className="mt-6 flex flex-wrap gap-1.5">
        {FILTERS.map((filter) => (
          <Link
            key={filter.id}
            href={filter.id === "all" ? "/account/orders" : `/account/orders?status=${filter.id}`}
            className={cn(
              "rounded-[2px] border px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] transition-colors",
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
        <div className="mt-6 space-y-4">
          {orders.map((order) => (
            <section key={order.id} className="rounded-[3px] border border-line-warm bg-white">
              <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line-warm px-5 py-4">
                <div>
                  <p className="font-mono text-[12.5px] font-semibold text-ink">{order.number}</p>
                  <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft">
                    Placed {dateLong(order.placedAt)} · {order.merchantIds.length} seller{order.merchantIds.length === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Pill tone={order.fulfillment === "delivered" ? "success" : order.fulfillment === "shipped" ? "info" : "warn"}>
                    {titleCase(order.fulfillment)}
                  </Pill>
                  <Pill tone={order.payment === "paid" ? "success" : "warn"}>{order.payment}</Pill>
                  <p className="font-mono text-[14px] font-semibold text-ink">{money(order.total)}</p>
                </div>
              </header>

              <div className="px-5 py-4">
                <ul className="space-y-3">
                  {order.items.map((item) => (
                    <li key={`${item.productId}-${item.variant ?? ""}`} className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[13.5px] font-medium text-ink">{item.title}</p>
                        <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-soft">
                          {item.merchantName}
                          {item.variant ? ` · ${item.variant}` : ""} · Qty {item.qty}
                        </p>
                      </div>
                      <p className="font-mono text-[13px] text-ink">{money(item.price * item.qty)}</p>
                    </li>
                  ))}
                </ul>

                {order.tracking ? (
                  <p className="mt-4 flex flex-wrap items-center gap-2 rounded-[2px] border border-line-warm bg-bone-soft px-3 py-2.5 font-mono text-[11.5px] text-ink">
                    <Truck width={13} height={13} /> {order.carrier} · {order.tracking}
                  </p>
                ) : (
                  <p className="mt-4 rounded-[2px] border border-line-warm bg-bone-soft px-3 py-2.5 font-mono text-[11.5px] text-ink-soft">
                    Tracking appears when the seller dispatches.
                  </p>
                )}

                <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-line-warm pt-4">
                  <LinkButton href={`/order/${order.id}`} variant="outline">
                    Full order details
                  </LinkButton>
                  <form action={reorderAction}>
                    <input type="hidden" name="orderId" value={order.id} />
                    <button
                      type="submit"
                      className="inline-flex cursor-pointer items-center gap-2 rounded-[2px] px-4 py-2.5 text-[13px] font-semibold text-ink-soft transition-colors hover:text-ember"
                    >
                      <Package width={15} height={15} /> Buy these again
                    </button>
                  </form>
                </div>
              </div>
            </section>
          ))}
        </div>
      ) : (
        <p className="mt-6 rounded-[3px] border border-dashed border-line-warm px-6 py-10 text-center text-[13.5px] text-ink-soft">
          No orders in this state.{" "}
          <Link href="/account/orders" className="text-ink underline decoration-ember decoration-2 underline-offset-4">
            Show every order
          </Link>
        </p>
      )}
    </div>
  );
}

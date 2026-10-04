import Link from "next/link";
import { ArrowRight, MapPin, Package, Truck } from "lucide-react";
import { currentUser } from "@/lib/data";
import { requireAccount } from "@/lib/data";
import { LinkButton } from "@/components/ferix/marks";
import { dateShort, money } from "@/lib/format";
import { byNewest, itemsSummary, orderStages, statusHeadline, statusLabel } from "@/lib/orders";
import { cn } from "@/lib/utils";

export const metadata = {
  title: "Track an order — Ferixas",
  description: "Follow every parcel in your orders, seller by seller.",
};

export default async function TrackOrderPage() {
  const user = await currentUser();

  if (!user) {
    return (
      <div className="mx-auto max-w-[560px] px-4 py-10 lg:py-16">
        <div className="rounded-[3px] border border-line-warm bg-white p-5 lg:p-6">
          <Truck width={20} height={20} className="text-ember" />
          <h1 className="mt-3 font-display text-[22px] font-semibold leading-tight text-ink">Track an order</h1>
          <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">
            Tracking lives with your account so we can show every parcel at once — including the ones that travel
            separately from different sellers.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <LinkButton href="/login?return=/track-order" variant="solid">
              Sign in to track
            </LinkButton>
            <LinkButton href="/register" variant="outline">
              Create an account
            </LinkButton>
          </div>
          <p className="mt-4 border-t border-line-warm pt-4 font-mono text-[9.5px] uppercase tracking-[0.12em] text-ink-soft">
            Ordered as a guest? Use the tracking link in your confirmation email
          </p>
        </div>
      </div>
    );
  }

  const account = await requireAccount();
  const orders = byNewest(account.orders);
  const live = orders.filter((order) => !["delivered", "cancelled", "refunded"].includes(order.fulfillment));
  const past = orders.filter((order) => ["delivered", "cancelled", "refunded"].includes(order.fulfillment));

  return (
    <div className="mx-auto max-w-[900px] px-4 py-6 lg:px-6 lg:py-8">
      <h1 className="font-display text-[22px] font-semibold leading-tight text-ink lg:text-[28px]">Track an order</h1>
      <p className="mt-1.5 text-[13px] text-ink-soft">
        {live.length
          ? `${live.length} parcel${live.length === 1 ? "" : "s"} on the way right now.`
          : "Nothing in transit at the moment."}
      </p>

      {live.length ? (
        <div className="mt-5 space-y-3">
          {live.map((order) => {
            const stages = orderStages(order);
            return (
              <section key={order.id} className="overflow-hidden rounded-[3px] border border-line-warm bg-white">
                <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line-warm px-3.5 py-3 lg:px-5">
                  <div className="min-w-0">
                    <Link
                      href={`/account/orders/${order.id}`}
                      className="font-mono text-[12.5px] font-semibold text-ink transition-colors hover:text-ember"
                    >
                      {order.number}
                    </Link>
                    <p className="mt-0.5 truncate font-mono text-[9.5px] uppercase tracking-[0.14em] text-ink-soft">
                      {itemsSummary(order)} · {money(order.total)}
                    </p>
                  </div>
                  <span className="rounded-[2px] bg-ink px-2 py-1 font-mono text-[9.5px] uppercase tracking-[0.12em] text-lime">
                    {statusLabel(order.fulfillment)}
                  </span>
                </header>

                <div className="px-3.5 py-3 lg:px-5 lg:py-4">
                  <p className="font-display text-[15px] font-semibold text-ink">{statusHeadline(order)}</p>

                  <ol className="mt-3 flex gap-1">
                    {stages.map((stage) => (
                      <li key={stage.label} className="min-w-0 flex-1">
                        <span
                          className={cn(
                            "block h-[3px] rounded-full",
                            stage.state === "todo" ? "bg-bone-soft" : "bg-ember",
                          )}
                        />
                        <span
                          className={cn(
                            "mt-1.5 block truncate font-mono text-[8.5px] uppercase tracking-[0.06em]",
                            stage.state === "todo" ? "text-ink-soft/70" : "text-ink",
                          )}
                        >
                          {stage.label.split(" ")[0]}
                        </span>
                      </li>
                    ))}
                  </ol>

                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-line-warm pt-3">
                    <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft">
                      <Truck width={12} height={12} />
                      {order.carrier && order.tracking ? `${order.carrier} · ${order.tracking}` : "Awaiting dispatch"}
                    </span>
                    <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft">
                      <MapPin width={12} height={12} />
                      {order.address.city}, {order.address.country}
                    </span>
                    <Link
                      href={`/account/orders/${order.id}`}
                      className="ml-auto inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-ember"
                    >
                      Details <ArrowRight width={12} height={12} />
                    </Link>
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <div className="mt-5 rounded-[3px] border border-dashed border-line-warm px-6 py-10 text-center">
          <Package width={20} height={20} className="mx-auto text-ink-soft" />
          <p className="mt-3 font-display text-[15px] font-semibold text-ink">Nothing in transit</p>
          <p className="mx-auto mt-1.5 max-w-[46ch] text-[13px] text-ink-soft">
            When a seller dispatches, the parcel appears here with its carrier and tracking number.
          </p>
        </div>
      )}

      {past.length ? (
        <section className="mt-6">
          <h2 className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-ink-soft">Already delivered</h2>
          <ul className="mt-3 divide-y divide-line-warm overflow-hidden rounded-[3px] border border-line-warm bg-white">
            {past.slice(0, 5).map((order) => (
              <li key={order.id} className="flex items-center gap-3 px-3.5 py-3">
                <span className="min-w-0 flex-1">
                  <Link
                    href={`/account/orders/${order.id}`}
                    className="block truncate font-mono text-[12px] font-semibold text-ink hover:text-ember"
                  >
                    {order.number}
                  </Link>
                  <span className="block truncate font-mono text-[9.5px] uppercase tracking-[0.12em] text-ink-soft">
                    {dateShort(order.placedAt)} · {itemsSummary(order)}
                  </span>
                </span>
                <span className="shrink-0 font-mono text-[12px] tabular-nums text-ink-soft">{money(order.total)}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

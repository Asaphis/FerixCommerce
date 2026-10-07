import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Boxes,
  LogOut,
  Percent,
  Receipt,
  Store,
  TrendingUp,
  Users,
} from "lucide-react";
import { requireAdmin } from "@/lib/data";
import { getOverview } from "@/lib/api";
import { signOutAction } from "@/lib/actions";
import { SubmitButton } from "@/components/ops/controls";
import { Distribution, TrendChart } from "@/components/ops/marks";
import { Empty, Eyebrow, Meter, Panel, PanelHead, Pill, Readout } from "@/components/ops/bits";
import { compact, dateShort, money, num, relative, titleCase } from "@/lib/format";

function statusTone(status: string) {
  if (status === "delivered") return "mint" as const;
  if (status === "shipped") return "signal" as const;
  if (status === "cancelled") return "rose" as const;
  return "amber" as const;
}

export default async function OverviewPage() {
  const { session, admin } = await requireAdmin();
  const data = await getOverview(session);
  const { totals, windows, channels, statuses, topMerchants, needsAttention, recentOrders, settings } = data;

  const channelMax = Math.max(channels.store, channels.marketplace, 1);
  const merchantMax = Math.max(...topMerchants.map((m) => m.gmv), 1);
  const trend = recentOrders.map((order) => order.total).reverse();

  return (
    <div className="grid min-w-0 gap-5">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Eyebrow>Platform overview</Eyebrow>
          <h1 className="mt-1.5 font-display text-[24px] font-semibold text-chalk">{settings.platformName} console</h1>
          <p className="mt-1.5 text-[13px] text-chalk-dim">
            Signed in as {admin.email} · {totals.merchants} merchants · {compact(totals.products)} products on one
            catalogue
          </p>
        </div>
        <form action={signOutAction}>
          <SubmitButton variant="outline" pendingLabel="Signing out">
            <LogOut width={13} height={13} /> Sign out
          </SubmitButton>
        </form>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Readout
          label="GMV · all time"
          value={money(totals.gmv, { cents: false })}
          sub={`${money(windows.today.gmv, { cents: false })} today · ${money(windows.week.gmv, { cents: false })} this week`}
          icon={<TrendingUp width={15} height={15} />}
        />
        <Readout
          label="Platform commission"
          value={money(totals.commission, { cents: false })}
          sub={`${money(windows.month.commission, { cents: false })} in the last 30 days`}
          icon={<Percent width={15} height={15} />}
          tone="violet"
        />
        <Readout
          label="Orders"
          value={num(totals.orders)}
          sub={`${windows.month.orders} in 30 days · ${totals.deliveredRate}% delivered`}
          icon={<Receipt width={15} height={15} />}
          tone="signal"
        />
        <Readout
          label="Merchants"
          value={num(totals.merchants)}
          sub={`${totals.activeMerchants} active · ${totals.reviewMerchants} in review · ${totals.suspendedMerchants} suspended`}
          icon={<Store width={15} height={15} />}
          tone={totals.suspendedMerchants > 0 ? "amber" : "mint"}
        />
      </div>

      <div className="grid gap-3 lg:grid-cols-[1.4fr_1fr]">
        <Panel>
          <PanelHead title="Settlement split" hint="Where the money lands on every paid order" />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-[2px] border border-hairline p-3.5">
              <Eyebrow>Settles to merchants</Eyebrow>
              <p className="mt-2 font-mono text-[19px] font-semibold text-chalk">
                {money(totals.merchantNet, { cents: false })}
              </p>
              <p className="mt-1 text-[12px] text-chalk-dim">
                {Math.round((totals.merchantNet / Math.max(1, totals.gmv)) * 100)}% of GMV
              </p>
            </div>
            <div className="rounded-[2px] border border-hairline p-3.5">
              <Eyebrow>Retained by the platform</Eyebrow>
              <p className="mt-2 font-mono text-[19px] font-semibold text-violet">
                {money(totals.commission, { cents: false })}
              </p>
              <p className="mt-1 text-[12px] text-chalk-dim">
                {settings.defaultCommissionPct}% default on marketplace sales
              </p>
            </div>
          </div>

          <div className="mt-5 border-t border-hairline pt-4">
            <Eyebrow>Channel mix</Eyebrow>
            <div className="mt-3 space-y-3">
              <div className="grid gap-1.5">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[12.5px] text-chalk-dim">Ferixas marketplace</span>
                  <span className="font-mono text-[12.5px] tabular-nums text-chalk">
                    {money(channels.marketplace, { cents: false })}
                  </span>
                </div>
                <Meter value={channels.marketplace} max={channelMax} />
              </div>
              <div className="grid gap-1.5">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[12.5px] text-chalk-dim">Merchant storefronts</span>
                  <span className="font-mono text-[12.5px] tabular-nums text-chalk">
                    {money(channels.store, { cents: false })}
                  </span>
                </div>
                <Meter value={channels.store} max={channelMax} tone="violet" />
              </div>
            </div>
          </div>

          <div className="mt-5 border-t border-hairline pt-4">
            <Eyebrow>Latest order values</Eyebrow>
            <TrendChart values={trend} className="mt-2" />
            <p className="mt-1 font-mono text-[10px] text-chalk-dim">
              Average order {money(totals.averageOrder)} · {compact(totals.soldUnits)} units sold across the catalogue
            </p>
          </div>
        </Panel>

        <div className="grid gap-3">
          <Panel>
            <PanelHead title="Order pipeline" hint="Every order, both channels" />
            <Distribution
              rows={[
                { label: "Awaiting action", value: statuses.processing ?? 0, tone: "amber" },
                { label: "In transit", value: statuses.shipped ?? 0, tone: "signal" },
                { label: "Delivered", value: statuses.delivered ?? 0, tone: "mint" },
                { label: "Cancelled", value: statuses.cancelled ?? 0, tone: "rose" },
              ]}
            />
          </Panel>

          <Panel>
            <PanelHead
              title="Top merchants"
              hint="By gross merchandise value"
              action={
                <Link href="/merchants" className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-signal">
                  All <ArrowRight width={12} height={12} />
                </Link>
              }
            />
            <ul className="space-y-3">
              {topMerchants.map((merchant) => (
                <li key={merchant.id} className="grid gap-1.5">
                  <div className="flex items-center justify-between gap-3">
                    <Link href={`/merchants/${merchant.id}`} className="truncate text-[12.5px] text-chalk hover:text-signal">
                      {merchant.name}
                    </Link>
                    <span className="font-mono text-[12.5px] tabular-nums text-chalk">
                      {money(merchant.gmv, { cents: false })}
                    </span>
                  </div>
                  <Meter value={merchant.gmv} max={merchantMax} />
                  <p className="font-mono text-[10px] text-chalk-dim">{merchant.orders} orders</p>
                </li>
              ))}
            </ul>
          </Panel>

          {needsAttention.length ? (
            <Panel>
              <PanelHead title="Needs attention" hint="Merchants not in good standing" />
              <ul className="space-y-2.5">
                {needsAttention.map((merchant) => (
                  <li key={merchant.id} className="flex items-center justify-between gap-3 rounded-[2px] border border-hairline p-3">
                    <Link href={`/merchants/${merchant.id}`} className="truncate text-[12.5px] text-chalk hover:text-signal">
                      {merchant.name}
                    </Link>
                    <Pill tone={merchant.status === "suspended" ? "rose" : "amber"}>
                      <AlertTriangle width={10} height={10} /> {merchant.status}
                    </Pill>
                  </li>
                ))}
              </ul>
            </Panel>
          ) : (
            <Panel>
              <PanelHead title="Needs attention" />
              <p className="text-[12.5px] text-chalk-dim">Every merchant is in good standing.</p>
            </Panel>
          )}
        </div>
      </div>

      <Panel flush>
        <div className="flex flex-wrap items-center justify-between gap-3 p-5 pb-4">
          <PanelHead title="Recent platform activity" hint="Newest orders across every merchant" />
          <Link href="/orders" className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-signal">
            All {num(totals.orders)} orders <ArrowRight width={12} height={12} />
          </Link>
        </div>

        {recentOrders.length ? (
          <div className="min-w-0 px-5 pb-5 md:overflow-x-auto">
            <table className="w-full min-w-0 border-collapse text-left md:min-w-[880px]">
              <thead>
                <tr className="hidden md:table-row">
                  {["Order", "Merchant", "Customer", "Channel", "Placed", "Status", "Commission", "Total"].map((head) => (
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
                {recentOrders.map((order) => (
                  <tr
                    key={order.id}
                    className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-hairline/60 py-3 last:border-0 md:table-row md:py-0"
                  >
                    <td className="w-full min-w-0 py-0 md:w-auto md:py-3 md:pr-4">
                      <p className="font-mono text-[12px] text-chalk">{order.number}</p>
                      <p className="mt-0.5 text-[11.5px] text-chalk-dim md:hidden">
                        {order.merchantName} · {order.customer.name} · {order.channel}
                      </p>
                    </td>
                    <td className="hidden py-3 pr-4 md:table-cell">
                      <Link href={`/merchants/${order.merchantId}`} className="text-[12.5px] text-chalk hover:text-signal">
                        {order.merchantName}
                      </Link>
                    </td>
                    <td className="hidden py-3 pr-4 text-[12.5px] text-chalk-dim md:table-cell">{order.customer.name}</td>
                    <td className="hidden py-3 pr-4 md:table-cell">
                      <Pill tone={order.channel === "marketplace" ? "violet" : "neutral"}>{order.channel}</Pill>
                    </td>
                    <td className="py-3 pr-4 font-mono text-[11.5px] text-chalk-dim">
                      {dateShort(order.placedAt)} · {relative(order.placedAt)}
                    </td>
                    <td className="py-3 pr-4">
                      <Pill tone={statusTone(order.fulfillment)}>{titleCase(order.fulfillment)}</Pill>
                    </td>
                    <td className="hidden py-3 pr-4 font-mono text-[12px] tabular-nums text-violet md:table-cell">{money(order.commission)}</td>
                    <td className="py-3 font-mono text-[12.5px] tabular-nums text-chalk">{money(order.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-5 pb-5">
            <Empty title="No orders yet" body="Orders from every merchant appear here as soon as they are placed." />
          </div>
        )}
      </Panel>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { href: "/merchants", title: "Manage merchants", body: "Approve, suspend, commission and plans", Icon: Store },
          { href: "/users", title: "Customer oversight", body: `${data.registeredUsers} registered accounts`, Icon: Users },
          { href: "/analytics", title: "Platform analytics", body: "Growth by merchant and channel", Icon: TrendingUp },
        ].map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="group flex items-center justify-between gap-3 rounded-[2px] border border-hairline bg-panel p-4 transition-colors hover:border-chalk-dim"
          >
            <span>
              <span className="block text-[13px] font-medium text-chalk">{card.title}</span>
              <span className="block text-[11.5px] text-chalk-dim">{card.body}</span>
            </span>
            <card.Icon width={16} height={16} className="text-chalk-dim group-hover:text-signal" />
          </Link>
        ))}
      </div>

      <p className="flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-chalk-dim/70">
        <Boxes width={11} height={11} /> {compact(totals.marketplaceListings)} marketplace listings · {settings.currency}{" "}
        settlement · {settings.payoutCadence} payouts
      </p>
    </div>
  );
}

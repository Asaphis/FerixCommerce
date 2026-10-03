import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Boxes,
  LogOut,
  Package,
  ShoppingCart,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { requireMerchant } from "@/lib/data";
import { getDashboard } from "@/lib/api";
import { signOutAction } from "@/lib/actions";
import { SubmitButton } from "@/components/studio/controls";
import { Bar, Empty, Eyebrow, Panel, PanelHead, Pill, StatTile } from "@/components/studio/bits";
import { Spark } from "@/components/studio/marks";
import { compact, dateShort, money, num, relative, titleCase } from "@/lib/format";

function statusTone(status: string) {
  if (status === "delivered") return "success" as const;
  if (status === "shipped") return "info" as const;
  if (status === "cancelled") return "danger" as const;
  return "warn" as const;
}

export default async function DashboardPage() {
  const { session, merchant } = await requireMerchant();
  const data = await getDashboard(session);
  const { summary, counts, statuses, traffic, lowStock, recentOrders, activity, settings } = data;

  const revenueSeries = recentOrders.map((order) => order.total).reverse();
  const orderMix = [
    { label: "Awaiting action", value: statuses.processing ?? 0, tone: "warn" as const },
    { label: "In transit", value: statuses.shipped ?? 0, tone: "info" as const },
    { label: "Delivered", value: statuses.delivered ?? 0, tone: "success" as const },
    { label: "Cancelled", value: statuses.cancelled ?? 0, tone: "danger" as const },
  ];
  const maxStatus = Math.max(...orderMix.map((row) => row.value), 1);

  return (
    <div className="grid gap-5">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Eyebrow>Dashboard</Eyebrow>
          <h1 className="mt-1.5 font-display text-[24px] font-semibold text-ink-soft">
            <span className="text-chalk">{merchant.name}</span>
          </h1>
          <p className="mt-1.5 text-[13px] text-chalk-dim">
            {merchant.tagline} · trading since {dateShort(merchant.since)}
          </p>
        </div>
        <form action={signOutAction}>
          <SubmitButton variant="outline" pendingLabel="Signing out">
            <LogOut width={13} height={13} /> Sign out
          </SubmitButton>
        </form>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Revenue · 30 days"
          value={money(summary.revenue30d, { cents: false })}
          sub={`${money(summary.revenueToday, { cents: false })} today · ${money(summary.revenue7d, { cents: false })} this week`}
          icon={<TrendingUp width={15} height={15} />}
        />
        <StatTile
          label="Orders · 30 days"
          value={num(summary.orders30d)}
          sub={`${statuses.processing ?? 0} waiting on you · average ${money(summary.averageOrder, { cents: false })}`}
          icon={<ShoppingCart width={15} height={15} />}
          accent="azure"
        />
        <StatTile
          label="Catalogue"
          value={num(counts.products)}
          sub={`${counts.published} published · ${counts.drafts} draft · ${counts.lowStock} low on stock`}
          icon={<Package width={15} height={15} />}
          accent="chalk"
        />
        <StatTile
          label="Customers"
          value={num(counts.customers)}
          sub={`${traffic.sold30d} units sold in 30 days`}
          icon={<Users width={15} height={15} />}
          accent="sand"
        />
      </div>

      <div className="grid gap-3 lg:grid-cols-[1.35fr_1fr]">
        <Panel>
          <PanelHead
            title="Sales by channel"
            hint="The same catalogue feeds your store and the marketplace"
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-[2px] border border-hairline p-3.5">
              <Eyebrow>Your own store</Eyebrow>
              <p className="mt-2 font-mono text-[19px] font-semibold text-chalk">
                {num(counts.storeOrders)} orders
              </p>
              <p className="mt-1 text-[12px] text-chalk-dim">
                {compact(traffic.storeVisitors)} visitors · {traffic.conversionStore}% convert
              </p>
            </div>
            <div className="rounded-[2px] border border-hairline p-3.5">
              <Eyebrow>Ferixas marketplace</Eyebrow>
              <p className="mt-2 font-mono text-[19px] font-semibold text-chalk">
                {num(counts.marketplaceOrders)} orders
              </p>
              <p className="mt-1 text-[12px] text-chalk-dim">
                {compact(traffic.marketplaceImpressions)} impressions · {traffic.conversionMarketplace}% convert
              </p>
            </div>
          </div>

          <div className="mt-5 border-t border-hairline pt-4">
            <Eyebrow>Recent order values</Eyebrow>
            <Spark values={revenueSeries} className="mt-2" />
            <p className="mt-1 font-mono text-[10px] text-chalk-dim">
              Commission on the last 30 days: {money(summary.commission30d, { cents: false })}
            </p>
          </div>

          <div className="mt-5 space-y-3 border-t border-hairline pt-4">
            <Eyebrow>Order status</Eyebrow>
            {orderMix.map((row) => (
              <div key={row.label} className="grid gap-1.5">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[12.5px] text-chalk-dim">{row.label}</span>
                  <span className="font-mono text-[12.5px] tabular-nums text-chalk">{row.value}</span>
                </div>
                <Bar value={row.value} max={maxStatus} tone={row.tone === "danger" ? "ember" : row.tone === "info" ? "azure" : "lime"} />
              </div>
            ))}
          </div>
        </Panel>

        <div className="grid gap-3">
          <Panel>
            <PanelHead
              title="Needs attention"
              hint={`Stock at or below ${settings.lowStockAt} units`}
              action={
                <Link href="/inventory" className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-lime">
                  Inventory <ArrowRight width={12} height={12} />
                </Link>
              }
            />
            {lowStock.length ? (
              <ul className="space-y-2.5">
                {lowStock.map((item) => (
                  <li key={item.id} className="flex items-center justify-between gap-3 rounded-[2px] border border-hairline p-3">
                    <div className="min-w-0">
                      <Link href={`/products/${item.slug}`} className="block truncate text-[13px] font-medium text-chalk hover:text-lime">
                        {item.title}
                      </Link>
                      <p className="font-mono text-[10px] text-chalk-dim">{item.sku}</p>
                    </div>
                    <Pill tone={item.stock <= 0 ? "danger" : "warn"}>
                      <AlertTriangle width={10} height={10} /> {item.stock} left
                    </Pill>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[12.5px] text-chalk-dim">Every SKU is comfortably in stock.</p>
            )}
          </Panel>

          <Panel>
            <PanelHead title="Recent activity" hint="Orders, stock and money" />
            <ul className="space-y-3">
              {activity.slice(0, 6).map((event) => (
                <li key={event.id} className="flex items-start gap-3">
                  <span
                    className={
                      event.tone === "order"
                        ? "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-lime"
                        : event.tone === "stock"
                          ? "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-sand"
                          : "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-azure"
                    }
                  />
                  <div className="min-w-0">
                    <p className="text-[12.5px] font-medium text-chalk">{event.label}</p>
                    <p className="truncate text-[11.5px] text-chalk-dim">{event.detail}</p>
                    <p className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-chalk-dim/70">
                      {relative(event.at)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>

      <Panel flush>
        <div className="flex flex-wrap items-center justify-between gap-3 p-5 pb-4">
          <PanelHead title="Latest orders" hint="From both channels, newest first" />
          <Link
            href="/orders"
            className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-lime"
          >
            All {num(summary.ordersTotal)} orders <ArrowRight width={12} height={12} />
          </Link>
        </div>

        {recentOrders.length ? (
          <div className="overflow-x-auto px-5 pb-5">
            <table className="w-full min-w-[720px] border-collapse text-left">
              <thead>
                <tr>
                  {["Order", "Customer", "Channel", "Placed", "Status", "Total"].map((head) => (
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
                  <tr key={order.id} className="border-b border-hairline/60 last:border-0">
                    <td className="py-3 pr-4">
                      <Link href={`/orders/${order.id}`} className="font-mono text-[12.5px] font-semibold text-chalk hover:text-lime">
                        {order.number}
                      </Link>
                      <p className="font-mono text-[10px] text-chalk-dim">{order.items.length} item(s)</p>
                    </td>
                    <td className="py-3 pr-4 text-[12.5px] text-chalk-dim">{order.customer.name}</td>
                    <td className="py-3 pr-4">
                      <Pill tone={order.channel === "marketplace" ? "info" : "neutral"}>{order.channel}</Pill>
                    </td>
                    <td className="py-3 pr-4 font-mono text-[11.5px] text-chalk-dim">
                      {dateShort(order.placedAt)} · {relative(order.placedAt)}
                    </td>
                    <td className="py-3 pr-4">
                      <Pill tone={statusTone(order.fulfillment)}>{titleCase(order.fulfillment)}</Pill>
                    </td>
                    <td className="py-3 font-mono text-[12.5px] tabular-nums text-chalk">{money(order.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-5 pb-5">
            <Empty title="No orders yet" body="Orders from your store and the marketplace land here together." />
          </div>
        )}
      </Panel>

      <div className="grid gap-3 sm:grid-cols-3">
        <Link
          href="/products"
          className="group flex items-center justify-between gap-3 rounded-[3px] border border-hairline bg-panel p-4 transition-colors hover:border-chalk-dim"
        >
          <span>
            <span className="block text-[13px] font-medium text-chalk">Add or edit a product</span>
            <span className="block text-[11.5px] text-chalk-dim">One record feeds both channels</span>
          </span>
          <Package width={16} height={16} className="text-chalk-dim group-hover:text-lime" />
        </Link>
        <Link
          href="/inventory"
          className="group flex items-center justify-between gap-3 rounded-[3px] border border-hairline bg-panel p-4 transition-colors hover:border-chalk-dim"
        >
          <span>
            <span className="block text-[13px] font-medium text-chalk">Adjust stock</span>
            <span className="block text-[11.5px] text-chalk-dim">Units, reserved and low-stock lines</span>
          </span>
          <Boxes width={16} height={16} className="text-chalk-dim group-hover:text-lime" />
        </Link>
        <Link
          href="/payouts"
          className="group flex items-center justify-between gap-3 rounded-[3px] border border-hairline bg-panel p-4 transition-colors hover:border-chalk-dim"
        >
          <span>
            <span className="block text-[13px] font-medium text-chalk">Payouts</span>
            <span className="block text-[11.5px] text-chalk-dim">
              {money(data.summary.revenueTotal - summary.commission30d, { cents: false })} net balance
            </span>
          </span>
          <Wallet width={16} height={16} className="text-chalk-dim group-hover:text-lime" />
        </Link>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BadgePercent,
  Eye,
  Globe2,
  PackageCheck,
  PenTool,
  ReceiptText,
  ShoppingBag,
  Store,
  Truck,
  Undo2,
} from "lucide-react";
import { toast } from "sonner";
import {
  DISPUTES,
  ORDERS,
  channelSplit,
  customerById,
  getMerchant,
  lowStock,
  merchantStats,
  merchantSubtotal,
  recentOrders,
  reviewsOf,
  seriesFor,
  topProducts,
} from "@/lib/data";
import { dateShort, money, num, relative } from "@/lib/format";
import { useFerixas } from "@/lib/store";
import { StudioShell } from "@/components/studio/shell";
import {
  Panel,
  PanelHead,
  Pill,
  SegmentedControl,
  StatTile,
  StudioButton,
  TableWrap,
  Td,
  Th,
} from "@/components/studio/bits";
import { Donut, InteractiveChart } from "@/components/studio/charts";
import { ProductThumb } from "@/components/shop/product-plate";
import { cn } from "@/lib/utils";

type Range = "7" | "30" | "90";
type Metric = "revenue" | "orders" | "visitors";
type ChannelFilter = "all" | "store" | "marketplace";

export default function MerchantOverview() {
  const { merchantId, merchant, products, updateProduct } = useFerixas();
  const [range, setRange] = useState<Range>("30");
  const [metric, setMetric] = useState<Metric>("revenue");
  const [channel, setChannel] = useState<ChannelFilter>("all");

  const days = Number(range);
  const stats = merchantStats(merchantId);
  const split = channelSplit(merchantId, days);
  const catalog = products.filter((p) => p.merchantId === merchantId);

  const series = useMemo(() => {
    const rows = seriesFor(merchantId, days);
    if (channel === "all") return rows;
    const scoped = ORDERS.filter(
      (o) => o.merchantIds.includes(merchantId) && o.channel === channel,
    );
    return rows.map((point) => {
      const dayOrders = scoped.filter((o) => o.placedAt.slice(0, 10) === point.date);
      return {
        ...point,
        revenue: dayOrders.reduce((s, o) => s + merchantSubtotal(o, merchantId), 0),
        orders: dayOrders.length,
      };
    });
  }, [merchantId, days, channel]);

  const previous = useMemo(
    () => seriesFor(merchantId, days * 2).slice(0, days),
    [merchantId, days],
  );

  const totals = useMemo(() => {
    const sum = (rows: typeof series, key: Metric) => rows.reduce((s, p) => s + p[key], 0);
    const revenue = sum(series, "revenue");
    const prevRevenue = sum(previous, "revenue");
    const orders = sum(series, "orders");
    const prevOrders = sum(previous, "orders");
    const visitors = sum(series, "visitors");
    const prevVisitors = sum(previous, "visitors");
    const growth = (a: number, b: number) => (b ? ((a - b) / b) * 100 : 0);
    return {
      revenue,
      orders,
      visitors,
      aov: orders ? revenue / orders : 0,
      conversion: visitors ? (orders / visitors) * 100 : 0,
      revenueGrowth: growth(revenue, prevRevenue),
      ordersGrowth: growth(orders, prevOrders),
      visitorsGrowth: growth(visitors, prevVisitors),
    };
  }, [series, previous]);

  const orders = recentOrders(merchantId, 7);
  const best = topProducts(merchantId, 5);
  const restock = lowStock(merchantId).slice(0, 4);
  const listedOnMarketplace = catalog.filter(
    (p) => p.status === "active" && p.channels.marketplace,
  ).length;

  const activity = useMemo(() => {
    const events: { at: string; icon: typeof ReceiptText; text: string; tone: string }[] = [];
    ORDERS.filter((o) => o.merchantIds.includes(merchantId))
      .slice(0, 4)
      .forEach((o) => {
        events.push({
          at: o.placedAt,
          icon: ReceiptText,
          text: `${o.channel === "marketplace" ? "Marketplace" : "Store"} order ${o.number} \u00b7 ${money(o.total)}`,
          tone: o.channel === "marketplace" ? "text-lime" : "text-chalk",
        });
      });
    DISPUTES.filter((d) => d.merchantId === merchantId)
      .slice(0, 2)
      .forEach((d) =>
        events.push({
          at: d.openedAt,
          icon: AlertTriangle,
          text: `Dispute on ${d.orderId} \u00b7 ${d.reason}`,
          tone: "text-ember-soft",
        }),
      );
    const review = catalog[0] ? reviewsOf(catalog[0].id)[0] : undefined;
    if (review) {
      events.push({
        at: review.date,
        icon: PackageCheck,
        text: `New ${review.rating}-star review on ${catalog[0].title}`,
        tone: "text-chalk",
      });
    }
    ORDERS.filter((o) => o.merchantIds.includes(merchantId) && o.fulfillment === "delivered")
      .slice(0, 2)
      .forEach((o) =>
        events.push({
          at: o.placedAt,
          icon: Truck,
          text: `${o.number} delivered via ${o.carrier}`,
          tone: "text-chalk-dim",
        }),
      );
    return events.sort((a, b) => (a.at < b.at ? 1 : -1)).slice(0, 7);
  }, [merchantId, catalog]);

  const chartPoints = series.map((point) => ({
    label: point.label,
    value: metric === "revenue" ? point.revenue : metric === "orders" ? point.orders : point.visitors,
    secondary:
      channel === "all"
        ? metric === "revenue"
          ? previous[series.indexOf(point)]?.revenue
          : metric === "orders"
            ? previous[series.indexOf(point)]?.orders
            : previous[series.indexOf(point)]?.visitors
        : undefined,
  }));

  const format = (v: number) =>
    metric === "revenue" ? money(v, { cents: false }) : num(v);

  return (
    <StudioShell
      title="Overview"
      subtitle={`${merchant.plan} plan \u00b7 ${merchant.marketplaceEnabled ? "selling on the Ferixas marketplace" : "store only"}`}
      actions={
        <SegmentedControl
          value={range}
          onChange={setRange}
          options={[
            { value: "7", label: "7d" },
            { value: "30", label: "30d" },
            { value: "90", label: "90d" },
          ]}
        />
      }
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Gross revenue"
          value={money(stats.revenue, { cents: false })}
          sub={`last 30 days \u00b7 ${money(split.commission, { cents: false })} marketplace commission`}
          delta={totals.revenueGrowth}
          spark={series.map((p) => p.revenue)}
        />
        <StatTile
          label="Orders"
          value={num(stats.totalOrders)}
          sub={`${stats.unfulfilled} awaiting fulfilment`}
          delta={totals.ordersGrowth}
          spark={series.map((p) => p.orders)}
          invertDelta
        />
        <StatTile
          label="Visitors"
          value={num(totals.visitors, { compact: true })}
          sub={`${totals.conversion.toFixed(2)}% conversion`}
          delta={totals.visitorsGrowth}
          spark={series.map((p) => p.visitors)}
        />
        <StatTile
          label="Average order"
          value={money(stats.aov, { cents: false })}
          sub={`${stats.customers} customers all time`}
          spark={series.map((p) => p.orders)}
        />
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-[1.55fr_1fr]">
        <Panel>
          <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-[15px] font-semibold text-chalk">
                Performance
              </h2>
              <p className="mt-1 text-[12.5px] text-chalk-dim">
                Solid line is this period, dashed is the previous one.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <SegmentedControl
                value={metric}
                onChange={setMetric}
                options={[
                  { value: "revenue", label: "Revenue" },
                  { value: "orders", label: "Orders" },
                  { value: "visitors", label: "Visitors" },
                ]}
              />
              <SegmentedControl
                value={channel}
                onChange={setChannel}
                options={[
                  { value: "all", label: "All" },
                  { value: "store", label: "Store" },
                  { value: "marketplace", label: "Market" },
                ]}
              />
            </div>
          </div>
          <InteractiveChart
            points={chartPoints}
            height={210}
            format={format}
            series={channel === "all" ? ["Current", "Previous"] : undefined}
          />
        </Panel>

        <div className="grid gap-3">
          <Panel>
            <PanelHead
              title="Where the sales came from"
              hint={`Last ${days} days, split by channel`}
            />
            <Donut
              centerLabel="orders"
              centerValue={num(split.store.orders + split.marketplace.orders)}
              segments={[
                {
                  label: "Merchant store",
                  value: split.store.orders,
                  color: "#c9f24d",
                },
                {
                  label: "Marketplace",
                  value: split.marketplace.orders,
                  color: "#e4572e",
                },
              ]}
            />
            <div className="mt-4 grid grid-cols-2 gap-3 border-t border-hairline pt-4">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-chalk-dim">
                  Store revenue
                </p>
                <p className="mt-1 font-mono text-[15px] tabular-nums text-chalk">
                  {money(split.store.revenue, { cents: false })}
                </p>
              </div>
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-chalk-dim">
                  Marketplace revenue
                </p>
                <p className="mt-1 font-mono text-[15px] tabular-nums text-chalk">
                  {money(split.marketplace.revenue, { cents: false })}
                </p>
              </div>
            </div>
          </Panel>

          <Panel className="bg-gradient-to-br from-panel to-panel-2">
            <PanelHead title="Marketplace participation" hint="One catalog, chosen channels" />
            <div className="flex items-end justify-between">
              <p className="font-mono text-[28px] font-semibold leading-none tabular-nums text-chalk">
                {listedOnMarketplace}
                <span className="text-[14px] text-chalk-dim">/{catalog.length}</span>
              </p>
              <Pill tone="lime">
                <Globe2 width={11} height={11} />
                Listed live
              </Pill>
            </div>
            <p className="mt-3 text-[12.5px] leading-relaxed text-chalk-dim">
              Products stay in one catalog. Tick the marketplace per product — unticked items keep
              selling on your own store only.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href="/merchant/products">
                <StudioButton variant="outline">
                  <Store width={14} height={14} />
                  Manage channels
                </StudioButton>
              </Link>
              <Link href="/merchant/design">
                <StudioButton variant="primary">
                  <PenTool width={14} height={14} />
                  Design Engine
                </StudioButton>
              </Link>
            </div>
          </Panel>
        </div>
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-[1.55fr_1fr]">
        <Panel flush>
          <div className="flex items-start justify-between gap-4 p-5 pb-4">
            <PanelHead
              title="Recent orders"
              hint="Every order carries the channel it came from"
            />
            <Link
              href="/merchant/orders"
              className="inline-flex shrink-0 items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-[0.14em] text-chalk-dim transition-colors hover:text-lime"
            >
              All orders <ArrowRight width={13} height={13} />
            </Link>
          </div>
          <div className="px-5 pb-5">
            <TableWrap>
              <thead>
                <tr>
                  <Th>Order</Th>
                  <Th>Customer</Th>
                  <Th>Channel</Th>
                  <Th>Payment</Th>
                  <Th>Fulfilment</Th>
                  <Th align="right">Total</Th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className="transition-colors hover:bg-panel-2/50">
                    <Td>
                      <Link
                        href={`/merchant/orders?order=${order.number}`}
                        className="font-mono text-[12px] text-chalk transition-colors hover:text-lime"
                      >
                        {order.number}
                      </Link>
                      <span className="mt-0.5 block font-mono text-[10px] text-chalk-dim">
                        {dateShort(order.placedAt)}
                      </span>
                    </Td>
                    <Td className="max-w-[150px] truncate text-[12.5px] text-chalk-dim">
                      {customerById(order.customerId)?.name ?? "Customer"}
                    </Td>
                    <Td>
                      <Pill tone={order.channel === "marketplace" ? "ember" : "lime"}>
                        {order.channel === "marketplace" ? "Marketplace" : "Merchant store"}
                      </Pill>
                    </Td>
                    <Td>
                      <Pill tone={order.payment === "paid" ? "success" : order.payment === "pending" ? "warn" : "danger"}>
                        {order.payment}
                      </Pill>
                    </Td>
                    <Td>
                      <Pill tone={order.fulfillment === "delivered" ? "success" : order.fulfillment === "cancelled" ? "danger" : "neutral"}>
                        {order.fulfillment}
                      </Pill>
                    </Td>
                    <Td align="right" className="font-mono text-[12.5px] tabular-nums">
                      {money(order.total)}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
          </div>
        </Panel>

        <div className="grid gap-3">
          <Panel>
            <PanelHead title="Best sellers" hint={`Revenue \u00b7 last 30 days`} />
            <ul className="space-y-3">
              {best.map((product) => (
                <li key={product.id} className="flex items-center gap-3">
                  <ProductThumb product={product} className="h-10 w-10 shrink-0 rounded-[2px]" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12.5px] text-chalk">{product.title}</p>
                    <p className="font-mono text-[10.5px] text-chalk-dim">
                      {product.sold30d} sold \u00b7 {product.stock} in stock
                    </p>
                  </div>
                  <span className="font-mono text-[12px] tabular-nums text-chalk">
                    {money(product.price * product.sold30d, { cents: false })}
                  </span>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel>
            <PanelHead
              title="Needs attention"
              hint={`${restock.length} products at or below their low-stock mark`}
            />
            <ul className="space-y-2.5">
              {restock.map((product) => (
                <li
                  key={product.id}
                  className="flex items-center gap-3 rounded-[2px] border border-hairline px-3 py-2.5"
                >
                  <ProductThumb product={product} className="h-8 w-8 shrink-0 rounded-[2px]" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12.5px] text-chalk">{product.title}</p>
                    <p className="font-mono text-[10.5px] text-ember-soft">
                      {product.stock === 0 ? "Sold out" : `${product.stock} left`}
                    </p>
                  </div>
                  <StudioButton
                    onClick={() => {
                      updateProduct(product.id, { stock: product.stock + 150 });
                      toast.success(`${product.title} restocked to ${product.stock + 150} units`);
                    }}
                  >
                    Restock
                  </StudioButton>
                </li>
              ))}
              {!restock.length ? (
                <li className="text-[12.5px] text-chalk-dim">Everything is above its low-stock mark.</li>
              ) : null}
            </ul>
          </Panel>
        </div>
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_1fr_1fr]">
        <Panel>
          <PanelHead title="Activity" hint="Store, marketplace and platform events" />
          <ul className="space-y-3.5">
            {activity.map((event, i) => (
              <li key={`${event.at}-${i}`} className="flex gap-3">
                <event.icon
                  width={15}
                  height={15}
                  className={cn("mt-0.5 shrink-0", event.tone)}
                />
                <div className="min-w-0">
                  <p className="text-[12.5px] leading-snug text-chalk">{event.text}</p>
                  <p className="font-mono text-[10px] text-chalk-dim">{relative(event.at)}</p>
                </div>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel>
          <PanelHead title="Money" hint="Your balance and the next payout" />
          <p className="font-mono text-[26px] font-semibold tabular-nums text-chalk">
            {money(merchant.balance, { cents: false })}
          </p>
          <p className="mt-1 font-mono text-[10.5px] uppercase tracking-[0.14em] text-chalk-dim">
            Available balance
          </p>
          <div className="mt-4 space-y-2.5 border-t border-hairline pt-4">
            {[
              ["Pending payout", money(merchant.pendingPayout)],
              ["Commission this period", money(split.commission)],
              ["Commission rate", `${merchant.commissionPct}% on marketplace sales`],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between gap-3">
                <span className="font-mono text-[11px] text-chalk-dim">{label}</span>
                <span className="font-mono text-[11.5px] tabular-nums text-chalk">{value}</span>
              </div>
            ))}
          </div>
          <Link href="/merchant/payouts" className="mt-4 block">
            <StudioButton variant="outline" className="w-full">
              <BadgePercent width={14} height={14} />
              Payouts and balance
            </StudioButton>
          </Link>
        </Panel>

        <Panel>
          <PanelHead title="Store health" hint="How the storefront is performing" />
          <div className="space-y-3">
            {[
              ["Order response rate", merchant.responseRate, `${merchant.responseRate}% answered within 4h`],
              ["Fulfilment rate", merchant.fulfilmentRate, `${merchant.fulfilmentRate}% shipped on time`],
              ["Store rating", (merchant.rating / 5) * 100, `${merchant.rating} from ${num(merchant.reviewCount)} reviews`],
            ].map(([label, value, detail]) => (
              <div key={String(label)}>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-chalk-dim">
                    {label}
                  </span>
                  <span className="font-mono text-[11.5px] tabular-nums text-chalk">
                    {(value as number).toFixed(1)}%
                  </span>
                </div>
                <span className="mt-2 block h-1.5 overflow-hidden rounded-[1px] bg-panel-2">
                  <span
                    className="block h-full bg-lime"
                    style={{ width: `${Math.min(100, value as number)}%` }}
                  />
                </span>
                <p className="mt-1.5 text-[11.5px] text-chalk-dim">{detail}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link href="/merchant/analytics">
              <StudioButton variant="ghost">
                <Eye width={14} height={14} />
                Analytics
              </StudioButton>
            </Link>
            <Link href="/merchant/promotions">
              <StudioButton variant="ghost">
                <ShoppingBag width={14} height={14} />
                Promotions
              </StudioButton>
            </Link>
            <Link href="/merchant/inventory">
              <StudioButton variant="ghost">
                <Undo2 width={14} height={14} />
                Inventory
              </StudioButton>
            </Link>
          </div>
        </Panel>
      </div>

      <p className="mt-5 text-center font-mono text-[10px] uppercase tracking-[0.16em] text-chalk-dim/70">
        {getMerchant(merchantId).domain} \u00b7 prototype data \u00b7 no live transactions
      </p>
    </StudioShell>
  );
}

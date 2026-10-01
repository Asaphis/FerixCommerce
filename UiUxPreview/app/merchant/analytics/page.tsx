"use client";

import { useMemo, useState } from "react";
import { ArrowRight, Eye, MousePointerClick, ShoppingCart, TrendingUp } from "lucide-react";
import { channelSplit, getMerchant, seriesFor, topProducts } from "@/lib/data";
import { money, num } from "@/lib/format";
import { useFerixas } from "@/lib/store";
import { StudioShell } from "@/components/studio/shell";
import {
  Panel,
  PanelHead,
  Pill,
  SegmentedControl,
  StatTile,
  TableWrap,
  Td,
  Th,
} from "@/components/studio/bits";
import { AreaSeries, BarRow, Donut, InteractiveChart } from "@/components/studio/charts";
import { ProductThumb } from "@/components/shop/product-plate";

type Range = "7" | "30" | "90";
type Metric = "revenue" | "orders" | "visitors";

export default function AnalyticsPage() {
  const { merchantId, merchant, products } = useFerixas();
  const [range, setRange] = useState<Range>("30");
  const [metric, setMetric] = useState<Metric>("revenue");
  const days = Number(range);

  const series = useMemo(() => seriesFor(merchantId, days), [merchantId, days]);
  const previous = useMemo(() => seriesFor(merchantId, days * 2).slice(0, days), [merchantId, days]);
  const split = channelSplit(merchantId, days);
  const best = topProducts(merchantId, 8);

  const totals = useMemo(() => {
    const revenue = series.reduce((s, p) => s + p.revenue, 0);
    const orders = series.reduce((s, p) => s + p.orders, 0);
    const visitors = series.reduce((s, p) => s + p.visitors, 0);
    const prevRevenue = previous.reduce((s, p) => s + p.revenue, 0);
    const prevVisitors = previous.reduce((s, p) => s + p.visitors, 0);
    return {
      revenue,
      orders,
      visitors,
      aov: orders ? revenue / orders : 0,
      conversion: visitors ? (orders / visitors) * 100 : 0,
      revenueGrowth: prevRevenue ? ((revenue - prevRevenue) / prevRevenue) * 100 : 0,
      visitorsGrowth: prevVisitors ? ((visitors - prevVisitors) / prevVisitors) * 100 : 0,
    };
  }, [series, previous]);

  const funnel = [
    { label: "Store visits", value: totals.visitors },
    { label: "Product viewed", value: Math.round(totals.visitors * 0.52) },
    { label: "Added to cart", value: Math.round(totals.visitors * 0.16) },
    { label: "Reached checkout", value: Math.round(totals.visitors * 0.075) },
    { label: "Purchased", value: totals.orders },
  ];
  const funnelMax = funnel[0].value || 1;

  const sources = [
    { label: "Ferixas marketplace search", share: 34, color: "#c9f24d" },
    { label: "Direct to your store", share: 26, color: "#e4572e" },
    { label: "Social / creator links", share: 17, color: "#2f6f8f" },
    { label: "Paid promotion", share: 13, color: "#c9a24d" },
    { label: "Email and returns", share: 10, color: "#6b4a5c" },
  ];

  const soldValue = best.reduce((s, p) => s + p.price * p.sold30d, 0);

  return (
    <StudioShell
      title="Analytics"
      subtitle={`${days} days \u00b7 compared with the ${days} days before`}
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
          label="Revenue"
          value={money(totals.revenue, { cents: false })}
          delta={totals.revenueGrowth}
          spark={series.map((p) => p.revenue)}
        />
        <StatTile
          label="Conversion rate"
          value={`${totals.conversion.toFixed(2)}%`}
          sub={`${num(totals.orders)} orders from ${num(totals.visitors, { compact: true })} visits`}
        />
        <StatTile
          label="Average order"
          value={money(totals.aov, { cents: false })}
          sub={`Store ${money(split.store.revenue / Math.max(1, split.store.orders), { cents: false })} \u00b7 market ${money(split.marketplace.revenue / Math.max(1, split.marketplace.orders), { cents: false })}`}
        />
        <StatTile
          label="Visitors"
          value={num(totals.visitors, { compact: true })}
          delta={totals.visitorsGrowth}
          spark={series.map((p) => p.visitors)}
        />
      </div>

      <Panel className="mt-3">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <PanelHead title="Traffic and revenue" hint="Hover the chart to read any day" />
          <SegmentedControl
            value={metric}
            onChange={setMetric}
            options={[
              { value: "revenue", label: "Revenue" },
              { value: "orders", label: "Orders" },
              { value: "visitors", label: "Visitors" },
            ]}
          />
        </div>
        <InteractiveChart
          height={240}
          series={["Current", "Previous"]}
          format={(v) => (metric === "revenue" ? money(v, { cents: false }) : num(v))}
          points={series.map((point, i) => ({
            label: point.label,
            value:
              metric === "revenue" ? point.revenue : metric === "orders" ? point.orders : point.visitors,
            secondary:
              metric === "revenue"
                ? previous[i]?.revenue
                : metric === "orders"
                  ? previous[i]?.orders
                  : previous[i]?.visitors,
          }))}
        />
      </Panel>

      <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_1fr_1fr]">
        <Panel>
          <PanelHead title="Where visits came from" hint="Share of sessions" />
          <div className="space-y-3">
            {sources.map((source) => (
              <BarRow
                key={source.label}
                label={source.label}
                value={source.share}
                max={100}
                display={`${source.share}%`}
                color={source.color}
              />
            ))}
          </div>
        </Panel>

        <Panel>
          <PanelHead title="Purchase funnel" hint="Visits through to orders" />
          <div className="space-y-3">
            {funnel.map((step, i) => (
              <div key={step.label}>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-chalk-dim">
                    {step.label}
                  </span>
                  <span className="font-mono text-[11.5px] tabular-nums text-chalk">
                    {num(step.value, { compact: true })}
                  </span>
                </div>
                <span className="mt-2 block h-6 overflow-hidden rounded-[2px] bg-panel-2">
                  <span
                    className="flex h-full items-center justify-end pr-2"
                    style={{
                      width: `${Math.max(4, (step.value / funnelMax) * 100)}%`,
                      background: i === funnel.length - 1 ? "#c9f24d" : "rgba(201,242,77,0.35)",
                    }}
                  >
                    <span className="font-mono text-[9.5px] text-void">
                      {i === 0 ? "100%" : `${((step.value / funnelMax) * 100).toFixed(1)}%`}
                    </span>
                  </span>
                </span>
                {i < funnel.length - 1 ? (
                  <p className="mt-1 flex items-center gap-1 font-mono text-[9.5px] text-chalk-dim">
                    <ArrowRight width={10} height={10} />
                    {(((funnel[i + 1].value / (step.value || 1)) * 100)).toFixed(1)}% move on
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </Panel>

        <div className="grid gap-3">
          <Panel>
            <PanelHead title="Channel mix" hint="Orders by sales channel" />
            <Donut
              centerLabel="orders"
              centerValue={num(split.store.orders + split.marketplace.orders)}
              segments={[
                { label: "Merchant store", value: split.store.orders, color: "#c9f24d" },
                { label: "Marketplace", value: split.marketplace.orders, color: "#e4572e" },
              ]}
            />
          </Panel>
          <Panel>
            <PanelHead title="Store vs marketplace" hint="Daily revenue" />
            <AreaSeries values={series.map((p) => p.revenue)} height={80} />
            <div className="mt-3 flex items-center justify-between font-mono text-[10.5px] text-chalk-dim">
              <span>{series[0]?.label}</span>
              <span>{series[series.length - 1]?.label}</span>
            </div>
            <div className="mt-4 border-t border-hairline pt-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-chalk-dim">
                  Commission paid
                </span>
                <span className="font-mono text-[12px] tabular-nums text-ember-soft">
                  {money(split.commission, { cents: false })}
                </span>
              </div>
            </div>
          </Panel>
        </div>
      </div>

      <Panel className="mt-3" flush>
        <div className="flex items-start justify-between gap-4 p-5 pb-4">
          <PanelHead
            title="Product performance"
            hint={`${money(soldValue, { cents: false })} of the last 30 days`}
          />
          <Pill tone="lime">
            <TrendingUp width={11} height={11} /> Top 8
          </Pill>
        </div>
        <div className="px-5 pb-5">
          <TableWrap>
            <thead>
              <tr>
                <Th>Product</Th>
                <Th align="right">Views</Th>
                <Th align="right">Sold 30d</Th>
                <Th align="right">Revenue</Th>
                <Th align="right">Conv.</Th>
                <Th>Channels</Th>
              </tr>
            </thead>
            <tbody>
              {best.map((product) => (
                <tr key={product.id} className="transition-colors hover:bg-panel-2/40">
                  <Td>
                    <div className="flex items-center gap-3">
                      <ProductThumb product={product} className="h-9 w-9 shrink-0 rounded-[2px]" />
                      <span className="max-w-[240px] truncate text-[13px] text-chalk">
                        {product.title}
                      </span>
                    </div>
                  </Td>
                  <Td align="right" className="font-mono text-[12px] tabular-nums text-chalk-dim">
                    {num(product.views30d, { compact: true })}
                  </Td>
                  <Td align="right" className="font-mono text-[12px] tabular-nums text-chalk-dim">
                    {product.sold30d}
                  </Td>
                  <Td align="right" className="font-mono text-[12px] tabular-nums">
                    {money(product.price * product.sold30d, { cents: false })}
                  </Td>
                  <Td align="right" className="font-mono text-[12px] tabular-nums text-chalk-dim">
                    {((product.sold30d / Math.max(1, product.views30d)) * 100).toFixed(2)}%
                  </Td>
                  <Td>
                    <div className="flex gap-1.5">
                      {product.channels.store ? <Pill tone="lime">Store</Pill> : null}
                      {product.channels.marketplace ? <Pill tone="ember">Market</Pill> : null}
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        </div>
      </Panel>

      <div className="mt-3 grid gap-3 lg:grid-cols-3">
        {[
          {
            icon: Eye,
            title: "What the numbers cover",
            body: `Views and sessions are modelled for the ${products.filter((p) => p.merchantId === merchantId).length} products in this catalog.`,
          },
          {
            icon: ShoppingCart,
            title: "Cart abandonment",
            body: "Roughly 46% of carts here are abandoned before checkout — the promotions page has the recovery tools.",
          },
          {
            icon: MousePointerClick,
            title: "Attribution",
            body: `Every order keeps the channel that produced it, so ${getMerchant(merchantId).name} can see store versus marketplace revenue separately.`,
          },
        ].map((card) => (
          <Panel key={card.title}>
            <card.icon width={18} height={18} className="text-lime" />
            <h3 className="mt-3 font-display text-[14.5px] font-semibold text-chalk">
              {card.title}
            </h3>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-chalk-dim">{card.body}</p>
          </Panel>
        ))}
      </div>

      <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.14em] text-chalk-dim/70">
        {merchant.plan} plan analytics \u00b7 figures are simulated for the prototype
      </p>
    </StudioShell>
  );
}

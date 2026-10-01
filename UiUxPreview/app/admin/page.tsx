"use client";

import Link from "next/link";
import { useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  Globe2,
  Percent,
  Server,
  Sparkles,
  Store,
  TrendingUp,
} from "lucide-react";
import {
  AI_USAGE,
  DISPUTES,
  INTEGRATIONS,
  MERCHANTS,
  ORDERS,
  REFUNDS,
  customerById,
  merchantStats,
  platformTotals,
  seriesFor,
} from "@/lib/data";
import { dateShort, money, num, relative } from "@/lib/format";
import { Panel, PanelHead, Pill, SegmentedControl, StatTile, StudioButton, TableWrap, Td, Th } from "@/components/studio/bits";
import { BarRow, Donut, InteractiveChart } from "@/components/studio/charts";

type Metric = "gmv" | "orders" | "visitors";

export default function AdminDashboard() {
  const [range, setRange] = useState<"30" | "90">("30");
  const [metric, setMetric] = useState<Metric>("gmv");
  const totals = platformTotals();
  const days = Number(range);
  const series = seriesFor(null, days);
  const previous = seriesFor(null, days * 2).slice(0, days);

  const gmv = series.reduce((s, p) => s + p.revenue, 0);
  const orders = series.reduce((s, p) => s + p.orders, 0);
  const visitors = series.reduce((s, p) => s + p.visitors, 0);
  const prevGmv = previous.reduce((s, p) => s + p.revenue, 0);
  const growth = prevGmv ? ((gmv - prevGmv) / prevGmv) * 100 : 0;

  const marketplaceOrders = ORDERS.filter((o) => o.channel === "marketplace");
  const storeOrders = ORDERS.filter((o) => o.channel === "store");

  const topMerchants = MERCHANTS.map((merchant) => ({
    merchant,
    stats: merchantStats(merchant.id),
  }))
    .sort((a, b) => b.stats.revenue - a.stats.revenue)
    .slice(0, 6);

  const openDisputes = DISPUTES.filter((d) => d.status !== "resolved");
  const pendingRefunds = REFUNDS.filter((r) => r.status === "pending");
  const reviewMerchants = MERCHANTS.filter((m) => m.status === "review");
  const degraded = INTEGRATIONS.filter((i) => i.status === "beta" || i.status === "planned");

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-[70ch] text-[13px] leading-relaxed text-chalk-dim">
          Platform-wide view across the marketplace and every merchant storefront. This control room
          administers tenants, money and governance \u2014 it never edits a merchant's design for them.
        </p>
        <SegmentedControl
          value={range}
          onChange={setRange}
          options={[
            { value: "30", label: "30d" },
            { value: "90", label: "90d" },
          ]}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="GMV (modelled)"
          value={money(gmv, { cents: false })}
          sub={`${num(orders)} orders \u00b7 ${num(totals.customers, { compact: true })} customers`}
          delta={growth}
          spark={series.map((p) => p.revenue)}
        />
        <StatTile
          label="Commission revenue"
          value={money(totals.commission, { cents: false })}
          sub="From marketplace orders only"
        />
        <StatTile
          label="Subscription MRR"
          value={money(totals.mrr, { cents: false })}
          sub={`${num(totals.merchants)} merchants on 4 plans`}
        />
        <StatTile
          label="Average order"
          value={money(totals.aov, { cents: false })}
          sub={`${money(totals.refunds, { cents: false })} refunded`}
        />
      </div>

      <div className="grid gap-3 lg:grid-cols-[1.55fr_1fr]">
        <Panel>
          <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
            <PanelHead title="Platform volume" hint="Solid is this period, dashed is the previous one" />
            <SegmentedControl
              value={metric}
              onChange={setMetric}
              options={[
                { value: "gmv", label: "GMV" },
                { value: "orders", label: "Orders" },
                { value: "visitors", label: "Visitors" },
              ]}
            />
          </div>
          <InteractiveChart
            height={230}
            series={["Current", "Previous"]}
            format={(v) => (metric === "gmv" ? money(v, { cents: false }) : num(v))}
            points={series.map((point, i) => ({
              label: point.label,
              value: metric === "gmv" ? point.revenue : metric === "orders" ? point.orders : point.visitors,
              secondary:
                metric === "gmv"
                  ? previous[i]?.revenue
                  : metric === "orders"
                    ? previous[i]?.orders
                    : previous[i]?.visitors,
            }))}
          />
        </Panel>

        <div className="grid gap-3">
          <Panel>
            <PanelHead title="Where volume comes from" hint="Marketplace versus merchant stores" />
            <Donut
              centerLabel="orders"
              centerValue={num(marketplaceOrders.length + storeOrders.length)}
              segments={[
                { label: "Ferixas Marketplace", value: marketplaceOrders.length, color: "#e4572e" },
                { label: "Merchant storefronts", value: storeOrders.length, color: "#c9f24d" },
              ]}
            />
            <div className="mt-4 grid grid-cols-2 gap-3 border-t border-hairline pt-4">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-chalk-dim">
                  Marketplace GMV
                </p>
                <p className="mt-1 font-mono text-[14px] tabular-nums text-chalk">
                  {money(
                    marketplaceOrders.reduce((s, o) => s + o.total, 0),
                    { cents: false },
                  )}
                </p>
              </div>
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-chalk-dim">
                  Storefront GMV
                </p>
                <p className="mt-1 font-mono text-[14px] tabular-nums text-chalk">
                  {money(
                    storeOrders.reduce((s, o) => s + o.total, 0),
                    { cents: false },
                  )}
                </p>
              </div>
            </div>
          </Panel>

          <Panel>
            <PanelHead title="Needs attention" hint="Queues that block merchants or money" />
            <ul className="space-y-2.5">
              {[
                {
                  icon: AlertTriangle,
                  label: `${openDisputes.length} open disputes`,
                  detail: `${money(openDisputes.reduce((s, d) => s + d.amount, 0), { cents: false })} in play`,
                  href: "/admin/disputes",
                  tone: "text-ember-soft",
                },
                {
                  icon: Banknote,
                  label: `${pendingRefunds.length} refunds pending`,
                  detail: "Awaiting platform approval",
                  href: "/admin/refunds",
                  tone: "text-sand",
                },
                {
                  icon: Store,
                  label: `${reviewMerchants.length} merchant in review`,
                  detail: reviewMerchants.map((m) => m.name).join(", ") || "Nothing queued",
                  href: "/admin/merchants",
                  tone: "text-azure",
                },
                {
                  icon: Server,
                  label: `${degraded.length} integrations not live`,
                  detail: degraded.map((i) => i.name).slice(0, 3).join(", "),
                  href: "/admin/integrations",
                  tone: "text-chalk-dim",
                },
              ].map((row) => (
                <li key={row.label}>
                  <Link
                    href={row.href}
                    className="flex items-start gap-3 rounded-[2px] border border-hairline px-3 py-2.5 transition-colors hover:border-chalk-dim"
                  >
                    <row.icon width={15} height={15} className={`mt-0.5 shrink-0 ${row.tone}`} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[12.5px] text-chalk">{row.label}</span>
                      <span className="mt-0.5 block truncate font-mono text-[10px] text-chalk-dim">
                        {row.detail}
                      </span>
                    </span>
                    <ArrowRight width={13} height={13} className="mt-1 shrink-0 text-chalk-dim" />
                  </Link>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-[1.4fr_1fr]">
        <Panel flush>
          <div className="flex items-start justify-between gap-4 p-5 pb-4">
            <PanelHead title="Top merchants" hint="Last 30 days, net of commission" />
            <Link
              href="/admin/merchants"
              className="shrink-0 font-mono text-[10px] uppercase tracking-[0.14em] text-chalk-dim transition-colors hover:text-lime"
            >
              All merchants
            </Link>
          </div>
          <div className="px-5 pb-5">
            <TableWrap>
              <thead>
                <tr>
                  <Th>Merchant</Th>
                  <Th>Plan</Th>
                  <Th align="right">Orders</Th>
                  <Th align="right">Revenue</Th>
                  <Th align="right">Commission</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody>
                {topMerchants.map(({ merchant, stats }) => (
                  <tr key={merchant.id} className="transition-colors hover:bg-panel-2/40">
                    <Td>
                      <div className="flex items-center gap-2.5">
                        <span
                          className="grid h-7 w-7 shrink-0 place-items-center rounded-[2px] font-display text-[11px] font-extrabold"
                          style={{ background: merchant.brand.accent, color: merchant.brand.accentInk }}
                        >
                          {merchant.name.slice(0, 1)}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-[12.5px] text-chalk">{merchant.name}</span>
                          <span className="block font-mono text-[10px] text-chalk-dim">
                            {merchant.customDomain ?? merchant.domain}
                          </span>
                        </span>
                      </div>
                    </Td>
                    <Td>
                      <Pill tone={merchant.plan === "Platform" ? "lime" : "neutral"}>
                        {merchant.plan}
                      </Pill>
                    </Td>
                    <Td align="right" className="font-mono text-[12px] tabular-nums text-chalk-dim">
                      {stats.totalOrders}
                    </Td>
                    <Td align="right" className="font-mono text-[12.5px] tabular-nums">
                      {money(stats.revenue, { cents: false })}
                    </Td>
                    <Td align="right" className="font-mono text-[12px] tabular-nums text-ember-soft">
                      {money(stats.commission, { cents: false })}
                    </Td>
                    <Td>
                      <Pill tone={merchant.status === "active" ? "success" : "warn"}>
                        {merchant.status}
                      </Pill>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
          </div>
        </Panel>

        <div className="grid gap-3">
          <Panel>
            <PanelHead title="Latest orders" hint="Across every merchant and channel" />
            <ul className="space-y-2.5">
              {ORDERS.slice(0, 6).map((order) => (
                <li key={order.id} className="flex items-center gap-3">
                  <span className="min-w-0 flex-1">
                    <span className="block font-mono text-[11.5px] text-chalk">{order.number}</span>
                    <span className="block truncate font-mono text-[10px] text-chalk-dim">
                      {customerById(order.customerId)?.name} \u00b7 {relative(order.placedAt)}
                    </span>
                  </span>
                  <Pill tone={order.channel === "marketplace" ? "ember" : "lime"}>
                    {order.channel === "marketplace" ? "Market" : "Store"}
                  </Pill>
                  <span className="font-mono text-[12px] tabular-nums text-chalk">
                    {money(order.total, { cents: false })}
                  </span>
                </li>
              ))}
            </ul>
            <Link
              href="/admin/orders"
              className="mt-4 inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-lime"
            >
              Open the order register <ArrowRight width={12} height={12} />
            </Link>
          </Panel>

          <Panel>
            <PanelHead title="AI design usage" hint="The Design Engine assistant" />
            <div className="flex items-end justify-between">
              <p className="font-mono text-[24px] font-semibold tabular-nums text-chalk">
                {num(AI_USAGE.proposals, { compact: true })}
              </p>
              <Pill tone="lime">
                <Sparkles width={11} height={11} /> {AI_USAGE.acceptedRate}% applied
              </Pill>
            </div>
            <p className="mt-2 font-mono text-[10.5px] text-chalk-dim">
              proposals this quarter \u00b7 {num(AI_USAGE.tokens, { compact: true })} tokens \u00b7{" "}
              {AI_USAGE.creditsPerProposal} credits each
            </p>
            <div className="mt-4 space-y-2.5 border-t border-hairline pt-4">
              {AI_USAGE.byTenant.slice(0, 5).map((row) => (
                <BarRow
                  key={row.merchantId}
                  label={row.name}
                  value={row.proposals}
                  max={AI_USAGE.byTenant[AI_USAGE.byTenant.length - 1].proposals}
                  display={num(row.proposals)}
                />
              ))}
            </div>
          </Panel>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <Panel>
          <PanelHead title="Distribution" hint="Merchants by country" action={<Globe2 width={15} height={15} className="text-chalk-dim" />} />
          <div className="space-y-3">
            {[
              { label: "Nigeria", share: 34 },
              { label: "United States", share: 24 },
              { label: "United Kingdom", share: 13 },
              { label: "Kenya", share: 10 },
              { label: "South Africa", share: 8 },
              { label: "Other", share: 11 },
            ].map((row) => (
              <BarRow key={row.label} label={row.label} value={row.share} max={34} display={`${row.share}%`} />
            ))}
          </div>
        </Panel>

        <Panel>
          <PanelHead title="Commission by plan" hint="Effective rate on marketplace sales" action={<Percent width={15} height={15} className="text-chalk-dim" />} />
          <div className="space-y-2.5">
            {MERCHANTS.map((merchant) => (
              <div key={merchant.id} className="flex items-center justify-between gap-3">
                <span className="truncate text-[12.5px] text-chalk-dim">{merchant.name}</span>
                <span className="font-mono text-[12px] tabular-nums text-chalk">
                  {merchant.commissionPct}%
                </span>
              </div>
            ))}
          </div>
          <p className="mt-4 border-t border-hairline pt-3 font-mono text-[10px] leading-relaxed text-chalk-dim">
            The first-party store carries no commission so its economics stay honest against every
            other tenant.
          </p>
        </Panel>

        <Panel>
          <PanelHead title="Recent platform activity" hint="Who changed what" action={<TrendingUp width={15} height={15} className="text-chalk-dim" />} />
          <ul className="space-y-2.5">
            {INTEGRATIONS.filter((i) => i.lastSync)
              .slice(0, 5)
              .map((integration) => (
                <li key={integration.id} className="flex items-center justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block truncate text-[12.5px] text-chalk">{integration.name}</span>
                    <span className="block font-mono text-[10px] text-chalk-dim">
                      {num(integration.events30d)} events \u00b7 last sync {dateShort(integration.lastSync ?? "")}
                    </span>
                  </span>
                  <Pill tone="success">Live</Pill>
                </li>
              ))}
          </ul>
          <Link href="/admin/integrations" className="mt-4 inline-block">
            <StudioButton variant="outline">
              Manage integrations
            </StudioButton>
          </Link>
        </Panel>
      </div>
    </div>
  );
}

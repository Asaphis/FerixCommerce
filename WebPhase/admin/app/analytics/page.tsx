import Link from "next/link";
import { requireAdmin } from "@/lib/data";
import { getAnalytics } from "@/lib/api";
import { Meter, Eyebrow, Empty, Panel, PanelHead, Pill, Readout } from "@/components/ops/bits";
import { CellLabel, DataTable, PageHeader, Row, Td, TdLead } from "@/components/ops/table";
import { TrendChart } from "@/components/ops/marks";
import { money, num } from "@/lib/format";
import { cn } from "@/lib/utils";

const RANGES = [7, 30, 60, 90];

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const { days } = await searchParams;
  const range = RANGES.includes(Number(days)) ? Number(days) : 30;
  const { session } = await requireAdmin();
  const data = await getAnalytics(session, range);

  const gmv = data.series.map((point) => point.gmv);
  const orders = data.series.map((point) => point.orders);
  const labels = data.series.map((point) => point.date);
  const totalGmv = gmv.reduce((sum, value) => sum + value, 0);
  const totalCommission = data.series.reduce((sum, point) => sum + point.commission, 0);
  const totalOrders = orders.reduce((sum, value) => sum + value, 0);
  const merchantMax = Math.max(...data.byMerchant.map((m) => m.gmv), 1);
  const categoryMax = Math.max(...data.byCategory.map((c) => c.revenue), 1);
  const channelMax = Math.max(data.byChannel.store, data.byChannel.marketplace, 1);
  const bestDay = data.series.reduce((top, point) => (point.gmv > top.gmv ? point : top), data.series[0]);

  return (
    <div className="grid min-w-0 gap-5">
      <PageHeader
        eyebrow="Platform analytics"
        title="Growth across the marketplace"
        description={`GMV, commission and order volume over the last ${range} days, split by merchant, channel, department and plan.`}
        action={RANGES.map((option) => (
          <Link
            key={option}
            href={`/analytics?days=${option}`}
            className={cn(
              "inline-flex min-h-[44px] items-center rounded-[2px] border px-3 font-mono text-[10px] uppercase tracking-[0.14em] transition-colors",
              range === option
                ? "border-signal/40 bg-signal/10 text-signal"
                : "border-hairline text-chalk-dim hover:border-chalk-dim hover:text-chalk",
            )}
          >
            {option} days
          </Link>
        ))}
      />

      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 xl:grid-cols-4">
        <Readout label={`GMV · ${range} days`} value={money(totalGmv, { cents: false })} sub={`All time ${money(data.totals.gmv, { cents: false })}`} tone="mint" />
        <Readout label={`Commission · ${range} days`} value={money(totalCommission, { cents: false })} sub={`${Math.round((totalCommission / Math.max(1, totalGmv)) * 100)}% take rate`} tone="violet" />
        <Readout label={`Orders · ${range} days`} value={num(totalOrders)} sub={`Average ${money(totalGmv / Math.max(1, totalOrders), { cents: false })}`} />
        <Readout label="Best day" value={money(bestDay?.gmv ?? 0, { cents: false })} sub={bestDay?.date ? `on ${bestDay.date}` : "—"} tone="amber" />
      </div>

      <div className="grid gap-3 lg:grid-cols-[1.5fr_1fr]">
        <Panel>
          <PanelHead title="GMV by day" hint={`Daily platform value over ${range} days`} />
          <TrendChart values={gmv} labels={labels} />
          <div className="mt-5 border-t border-hairline pt-4">
            <Eyebrow>Orders by day</Eyebrow>
            <TrendChart values={orders} labels={labels} tone="violet" />
          </div>
        </Panel>

        <div className="grid gap-3">
          <Panel>
            <PanelHead title="Channel mix" />
            <div className="space-y-4">
              <div className="grid gap-1.5">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[12.5px] text-chalk-dim">Ferixas marketplace</span>
                  <span className="font-mono text-[12.5px] tabular-nums text-chalk">
                    {money(data.byChannel.marketplace, { cents: false })}
                  </span>
                </div>
                <Meter value={data.byChannel.marketplace} max={channelMax} />
              </div>
              <div className="grid gap-1.5">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[12.5px] text-chalk-dim">Merchant storefronts</span>
                  <span className="font-mono text-[12.5px] tabular-nums text-chalk">
                    {money(data.byChannel.store, { cents: false })}
                  </span>
                </div>
                <Meter value={data.byChannel.store} max={channelMax} tone="violet" />
              </div>
            </div>
          </Panel>

          <Panel>
            <PanelHead title="Merchants by plan" />
            <ul className="space-y-2.5">
              {data.plans.map((row) => (
                <li key={row.plan} className="flex items-center justify-between gap-3">
                  <span className="text-[12.5px] text-chalk-dim">{row.plan}</span>
                  <span className="font-mono text-[12.5px] tabular-nums text-chalk">{row.merchants}</span>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel>
            <PanelHead title="Revenue by department" />
            <div className="space-y-3">
              {data.byCategory.slice(0, 6).map((row) => (
                <div key={row.category} className="grid gap-1.5">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[12.5px] text-chalk-dim">{row.name}</span>
                    <span className="font-mono text-[12px] tabular-nums text-chalk">{money(row.revenue, { cents: false })}</span>
                  </div>
                  <Meter value={row.revenue} max={categoryMax} />
                </div>
              ))}
              {!data.byCategory.length ? <p className="text-[12.5px] text-chalk-dim">No sales in this period.</p> : null}
            </div>
          </Panel>
        </div>
      </div>

      <Panel>
        <PanelHead title="Merchant leaderboard" />
        <div className="space-y-4">
          {data.byMerchant.map((merchant) => (
            <div key={merchant.id} className="grid gap-1.5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Link href={`/merchants/${merchant.id}`} className="text-[12.5px] text-chalk hover:text-signal">
                  {merchant.name}
                </Link>
                <span className="flex items-center gap-3 font-mono text-[12px] text-chalk-dim">
                  <span className="tabular-nums text-chalk">{money(merchant.gmv, { cents: false })}</span>
                  <span className="tabular-nums text-violet">{money(merchant.commission, { cents: false })}</span>
                  <span className="tabular-nums">{merchant.orders} orders</span>
                </span>
              </div>
              <Meter value={merchant.gmv} max={merchantMax} />
            </div>
          ))}
        </div>
      </Panel>

      <Panel flush>
        <div className="min-w-0 px-4 pb-3 pt-4 md:px-5 md:pt-5">
          <PanelHead title="Best performing products" />
        </div>
        {data.topProducts.length ? (
          <div className="min-w-0 px-4 pb-4 md:overflow-x-auto md:px-5 md:pb-5">
            <DataTable
              head={["Product", "Merchant", "Price", "Sold 30d", "Revenue"]}
              minWidthClass="md:min-w-[760px]"
            >
              {data.topProducts.map((product) => (
                <Row key={product.id}>
                  <TdLead className="text-[13px] text-chalk">{product.title}</TdLead>
                  <Td className="text-[12.5px] text-chalk-dim">
                    <CellLabel>Merchant</CellLabel>
                    {product.merchantName}
                  </Td>
                  <Td className="font-mono text-[12.5px] text-chalk-dim">
                    <CellLabel>Price</CellLabel>
                    {money(product.price)}
                  </Td>
                  <Td className="font-mono text-[12.5px] tabular-nums text-chalk">
                    <CellLabel>Sold 30d</CellLabel>
                    {num(product.sold30d)}
                  </Td>
                  <Td className="font-mono text-[12.5px] tabular-nums text-signal">
                    <CellLabel>Revenue</CellLabel>
                    {money(product.revenue, { cents: false })}
                  </Td>
                </Row>
              ))}
            </DataTable>
          </div>
        ) : (
          <div className="px-5 pb-5">
            <Empty title="No product revenue yet" body="Once orders land, the best sellers appear here." />
          </div>
        )}
      </Panel>

      <div className="flex flex-wrap items-center gap-2">
        <Pill tone="signal">{data.totals.merchants} merchants</Pill>
        <Pill tone="violet">{num(data.totals.marketplaceListings)} marketplace listings</Pill>
        <Pill tone="mint">{num(data.totals.soldUnits)} units sold</Pill>
        <Pill tone="neutral">{data.totals.deliveredRate}% delivered</Pill>
      </div>
    </div>
  );
}

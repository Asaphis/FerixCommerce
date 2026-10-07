import Link from "next/link";
import { requireMerchant } from "@/lib/data";
import { getAnalytics } from "@/lib/api";
import { Bar, Bar as BarRow, Eyebrow, Panel, PanelHead, Pill, StatTile } from "@/components/studio/bits";
import { BarChart } from "@/components/studio/marks";
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
  const { session } = await requireMerchant();
  const data = await getAnalytics(session, range);

  const revenue = data.series.map((point) => point.revenue);
  const orders = data.series.map((point) => point.orders);
  const labels = data.series.map((point) => point.date);
  const totalRevenue = revenue.reduce((sum, value) => sum + value, 0);
  const totalOrders = orders.reduce((sum, value) => sum + value, 0);
  const channelMax = Math.max(data.byChannel.store, data.byChannel.marketplace, 1);
  const categoryMax = Math.max(...data.byCategory.map((row) => row.revenue), 1);
  const best = data.series.reduce((top, point) => (point.revenue > top.revenue ? point : top), data.series[0]);

  return (
    <div className="grid gap-5">
      <header className="shrinkable flex flex-wrap items-start justify-between gap-4">
        <div>
          <Eyebrow>Analytics</Eyebrow>
          <h1 className="mt-1.5 font-display text-[23px] font-semibold text-chalk">How the store is performing</h1>
          <p className="mt-1.5 max-w-[72ch] text-[13px] leading-relaxed text-chalk-dim">
            Revenue, orders and traffic from both channels over the last {range} days, worked out from the
            orders on the backend.
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {RANGES.map((option) => (
            <Link
              key={option}
              href={`/analytics?days=${option}`}
              className={cn(
                "min-h-11 rounded-[2px] border px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] transition-colors",
                range === option
                  ? "border-lime/40 bg-lime/10 text-lime"
                  : "border-hairline text-chalk-dim hover:border-chalk-dim hover:text-chalk",
              )}
            >
              {option} days
            </Link>
          ))}
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label={`Revenue · ${range} days`}
          value={money(totalRevenue, { cents: false })}
          sub={`All time ${money(data.summary.revenueTotal, { cents: false })}`}
        />
        <StatTile label={`Orders · ${range} days`} value={num(totalOrders)} sub={`Average ${money(totalRevenue / Math.max(1, totalOrders), { cents: false })}`} accent="azure" />
        <StatTile
          label="Best day"
          value={money(best?.revenue ?? 0, { cents: false })}
          sub={best?.date ? `on ${best.date}` : "—"}
          accent="sand"
        />
        <StatTile
          label="Repeat buyers"
          value={`${data.customers.repeatRate}%`}
          sub={`${data.customers.repeat} of ${data.customers.buyers} ordered again`}
          accent="lime"
        />
      </div>

      <div className="grid gap-3 lg:grid-cols-[1.5fr_1fr]">
        <Panel>
          <PanelHead title="Revenue by day" hint={`Daily takings over ${range} days`} />
          <BarChart values={revenue} labels={labels} />
          <div className="mt-5 border-t border-hairline pt-4">
            <Eyebrow>Orders by day</Eyebrow>
            <BarChart values={orders} labels={labels} tone="azure" />
          </div>
        </Panel>

        <div className="grid gap-3">
          <Panel>
            <PanelHead title="Channel mix" hint="Where the money came from" />
            <div className="space-y-4">
              <div className="grid gap-1.5">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[12.5px] text-chalk-dim">Ferixas marketplace</span>
                  <span className="font-mono text-[12.5px] tabular-nums text-chalk">
                    {money(data.byChannel.marketplace, { cents: false })}
                  </span>
                </div>
                <BarRow value={data.byChannel.marketplace} max={channelMax} tone="azure" />
              </div>
              <div className="grid gap-1.5">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[12.5px] text-chalk-dim">Your own store</span>
                  <span className="font-mono text-[12.5px] tabular-nums text-chalk">
                    {money(data.byChannel.store, { cents: false })}
                  </span>
                </div>
                <BarRow value={data.byChannel.store} max={channelMax} />
              </div>
            </div>
            <p className="mt-4 border-t border-hairline pt-4 font-mono text-[10.5px] leading-relaxed text-chalk-dim">
              Commission on marketplace sales is {data.summary.commission30d > 0 ? money(data.summary.commission30d, { cents: false }) : "nothing"} over the last 30 days.
            </p>
          </Panel>

          <Panel>
            <PanelHead title="Revenue by department" />
            <div className="space-y-3">
              {data.byCategory.slice(0, 6).map((row) => (
                <div key={row.category} className="grid gap-1.5">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[12.5px] capitalize text-chalk-dim">{row.name}</span>
                    <span className="font-mono text-[12px] tabular-nums text-chalk">{money(row.revenue, { cents: false })}</span>
                  </div>
                  <BarRow value={row.revenue} max={categoryMax} />
                </div>
              ))}
              {!data.byCategory.length ? <p className="text-[12.5px] text-chalk-dim">No sales in this period.</p> : null}
            </div>
          </Panel>
        </div>
      </div>

      <Panel flush>
        <div className="p-5 pb-3">
          <PanelHead title="Best performing products" hint="Sold in the last 30 days" />
        </div>
        <div className="overflow-x-auto px-5 pb-5">
          <table className="w-full min-w-[760px] border-collapse text-left">
            <thead>
              <tr>
                {["Product", "Price", "Sold 30d", "Views 30d", "Conversion", "Revenue"].map((head) => (
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
              {data.topProducts.map((product) => (
                <tr key={product.id} className="border-b border-hairline/60 last:border-0">
                  <td className="py-3 pr-4">
                    <Link href={`/products/${product.slug}`} className="text-[13px] font-medium text-chalk hover:text-lime">
                      {product.title}
                    </Link>
                  </td>
                  <td className="py-3 pr-4 font-mono text-[12.5px] text-chalk-dim">{money(product.price)}</td>
                  <td className="py-3 pr-4 font-mono text-[12.5px] tabular-nums text-chalk">{num(product.sold30d)}</td>
                  <td className="py-3 pr-4 font-mono text-[12.5px] tabular-nums text-chalk-dim">{num(product.views30d)}</td>
                  <td className="py-3 pr-4">
                    <Pill tone={product.conversion >= 5 ? "success" : product.conversion >= 2 ? "warn" : "neutral"}>
                      {product.conversion}%
                    </Pill>
                  </td>
                  <td className="py-3 font-mono text-[12.5px] tabular-nums text-chalk">
                    {money(product.revenue, { cents: false })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

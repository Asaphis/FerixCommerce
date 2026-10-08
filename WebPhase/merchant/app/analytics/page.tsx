import Link from "next/link";
import { ArrowRight, ChartNoAxesCombined } from "lucide-react";
import { requireMerchant } from "@/lib/data";
import { getAnalytics } from "@/lib/api";
import { Bar as BarRow, Eyebrow, Panel, PanelHead, StatTile } from "@/components/studio/bits";
import { BarChart } from "@/components/studio/marks";
import { money, num } from "@/lib/format";
import { cn } from "@/lib/utils";

const RANGES = [7, 30, 60, 90];

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
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
    <div className="grid min-w-0 gap-4 sm:gap-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div><Eyebrow>Analytics</Eyebrow><h1 className="mt-1.5 font-display text-[23px] font-bold text-chalk sm:text-[27px]">Performance</h1><p className="mt-1 text-[12px] text-chalk-dim">Revenue and orders from recorded transactions.</p></div>
        <div className="flex flex-wrap gap-1">{RANGES.map((option) => <Link key={option} href={`/analytics?days=${option}`} className={cn("inline-flex min-h-9 items-center rounded-[2px] border px-2.5 text-[10px] font-semibold transition-colors", range === option ? "border-signal bg-[#fff0e9] text-signal" : "border-hairline bg-white text-chalk-dim hover:text-chalk")}>{option}d</Link>)}</div>
      </header>

      <div className="grid grid-cols-2 gap-2 sm:gap-3 xl:grid-cols-4">
        <StatTile label={`Revenue · ${range} days`} value={money(totalRevenue, { cents: false })} sub="Recorded orders" />
        <StatTile label={`Orders · ${range} days`} value={num(totalOrders)} sub="Across both channels" accent="azure" />
        <StatTile label="Best day" value={money(best?.revenue ?? 0, { cents: false })} sub={best?.date ?? "No recorded activity"} accent="sand" />
        <StatTile label="Repeat buyers" value={`${data.customers.repeatRate}%`} sub={`${data.customers.repeat} repeat buyers`} accent="lime" />
      </div>

      <div className="grid gap-3 xl:grid-cols-[1.45fr_1fr]">
        <Panel>
          <PanelHead title="Revenue by day" hint={`Recorded sales · ${range} days`} />
          {totalRevenue || totalOrders ? <><BarChart values={revenue} labels={labels} /><div className="mt-4 border-t border-hairline pt-3"><Eyebrow>Orders by day</Eyebrow><BarChart values={orders} labels={labels} tone="azure" /></div></> : <p className="py-5 text-[12px] text-chalk-dim">Your sales trend will appear when an order is recorded.</p>}
        </Panel>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
          <Panel>
            <PanelHead title="Channel mix" hint="Revenue from recorded orders" />
            <div className="grid gap-3">{[{ title: "Ferixas marketplace", amount: data.byChannel.marketplace, tone: "azure" as const }, { title: "Your store", amount: data.byChannel.store, tone: undefined }].map((row) => <div key={row.title}><div className="mb-1 flex items-center justify-between gap-2 text-[11px]"><span className="text-chalk-dim">{row.title}</span><span className="font-mono font-semibold text-chalk">{money(row.amount, { cents: false })}</span></div><BarRow value={row.amount} max={channelMax} tone={row.tone} /></div>)}</div>
          </Panel>
          <Panel>
            <PanelHead title="Traffic reports" />
            <div className="flex min-h-[68px] items-center justify-between gap-3 rounded-[2px] bg-[#fff7f2] px-3"><div><p className="text-[12px] font-semibold text-chalk">Coming soon</p><p className="mt-0.5 text-[10px] text-chalk-dim">Visitor and conversion tracking is not connected.</p></div><ChartNoAxesCombined width={19} height={19} className="shrink-0 text-signal" /></div>
          </Panel>
        </div>
      </div>

      <Panel>
        <PanelHead title="Revenue by department" hint="From recorded order lines" />
        {data.byCategory.length ? <div className="grid gap-3 sm:grid-cols-2">{data.byCategory.slice(0, 6).map((row) => <div key={row.category} className="grid gap-1.5"><div className="flex items-center justify-between gap-3"><span className="text-[11px] capitalize text-chalk-dim">{row.name}</span><span className="font-mono text-[11px] text-chalk">{money(row.revenue, { cents: false })}</span></div><BarRow value={row.revenue} max={categoryMax} /></div>)}</div> : <p className="text-[12px] text-chalk-dim">Department totals will appear after sales.</p>}
      </Panel>

      <Panel flush>
        <div className="p-4 pb-3 sm:p-5 sm:pb-4"><PanelHead title="Products sold" hint="Order units and revenue · last 30 days" /></div>
        {data.topProducts.length ? <>
          <ul className="grid gap-2 px-3 pb-3 sm:hidden">{data.topProducts.map((product) => <li key={product.id}><Link href={`/products/${product.slug}`} className="flex items-center justify-between gap-3 rounded-[3px] border border-hairline bg-white p-3"><span className="min-w-0"><span className="block truncate text-[11px] font-semibold text-chalk">{product.title}</span><span className="mt-1 block text-[9px] text-chalk-dim">{num(product.sold30d)} ordered</span></span><span className="shrink-0 text-right"><span className="block font-mono text-[11px] font-bold text-chalk">{money(product.revenue, { cents: false })}</span><span className="mt-1 inline-flex items-center gap-1 text-[9px] font-semibold text-signal">Details <ArrowRight width={10} height={10} /></span></span></Link></li>)}</ul>
          <div className="hidden overflow-x-auto px-5 pb-4 sm:block"><table className="w-full min-w-[540px] border-collapse text-left"><thead><tr>{["Product", "Price", "Units ordered", "Recorded revenue"].map((head) => <th key={head} className="border-b border-hairline pb-2.5 font-mono text-[9px] font-medium uppercase tracking-[0.12em] text-chalk-dim">{head}</th>)}</tr></thead><tbody>{data.topProducts.map((product) => <tr key={product.id} className="border-b border-hairline/60 last:border-0"><td className="py-3 pr-4"><Link href={`/products/${product.slug}`} className="text-[12px] font-medium text-chalk hover:text-signal">{product.title}</Link></td><td className="py-3 pr-4 font-mono text-[11px] text-chalk-dim">{money(product.price)}</td><td className="py-3 pr-4 font-mono text-[11px] text-chalk">{num(product.sold30d)}</td><td className="py-3 font-mono text-[11px] font-semibold text-chalk">{money(product.revenue, { cents: false })}</td></tr>)}</tbody></table></div>
        </> : <div className="px-4 pb-4 sm:px-5 sm:pb-5"><p className="text-[12px] text-chalk-dim">Product rankings will appear after an order is recorded.</p></div>}
      </Panel>
    </div>
  );
}

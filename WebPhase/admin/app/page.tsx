import Link from "next/link";
import { AlertTriangle, ArrowRight, Boxes, Building2, ChartNoAxesCombined, Package, Receipt, Store, Users } from "lucide-react";
import { requireAdmin } from "@/lib/data";
import { getOverview } from "@/lib/api";
import { signOutAction } from "@/lib/actions";
import { SubmitButton } from "@/components/ops/controls";
import { Meter } from "@/components/ops/bits";
import { Empty, Eyebrow, Panel, PanelHead, Pill, Readout } from "@/components/ops/bits";
import { compact, dateShort, money, num, relative, titleCase } from "@/lib/format";

function statusTone(status: string) {
  if (status === "delivered") return "mint" as const;
  if (status === "shipped") return "signal" as const;
  if (status === "cancelled") return "rose" as const;
  return "amber" as const;
}

const adminLinks = [
  { href: "/orders", title: "Orders", detail: "Review recorded transactions", Icon: Receipt },
  { href: "/merchants", title: "Merchants", detail: "Manage marketplace sellers", Icon: Store },
  { href: "/catalog", title: "Catalogue", detail: "Products and inventory", Icon: Package },
  { href: "/cms/homepage", title: "Content studio", detail: "Manage storefront content", Icon: Boxes },
];

export default async function OverviewPage() {
  const { session } = await requireAdmin();
  const data = await getOverview(session);
  const { settings, totals, windows, channels, statuses, topMerchants, needsAttention, recentOrders } = data;
  const channelMax = Math.max(channels.store, channels.marketplace, 1);
  const merchantMax = Math.max(...topMerchants.map((merchant) => merchant.gmv), 1);
  const orderPipeline = [
    { label: "Needs action", value: statuses.processing ?? 0, tone: "amber" as const },
    { label: "In transit", value: statuses.shipped ?? 0, tone: "signal" as const },
    { label: "Delivered", value: statuses.delivered ?? 0, tone: "mint" as const },
    { label: "Cancelled", value: statuses.cancelled ?? 0, tone: "rose" as const },
  ];

  return (
    <div className="grid min-w-0 gap-4 sm:gap-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div><Eyebrow>Platform operations</Eyebrow><h1 className="mt-1.5 font-display text-[23px] font-bold leading-tight text-chalk sm:text-[28px]">Overview</h1><p className="mt-1 text-[12px] text-chalk-dim">Orders, merchants and catalogue.</p></div>
        <form action={signOutAction}><SubmitButton variant="outline" pendingLabel="Signing out">Sign out</SubmitButton></form>
      </header>

      <div className="grid grid-cols-2 gap-2 sm:gap-3 xl:grid-cols-4">
        <Readout label="GMV · all time" value={money(totals.gmv, { cents: false })} sub={`${money(windows.today.gmv, { cents: false })} today`} icon={<ChartNoAxesCombined width={15} height={15} />} />
        <Readout label="Recorded orders" value={num(totals.orders)} sub={`${windows.month.orders} in 30 days`} icon={<Receipt width={15} height={15} />} tone="signal" />
        <Readout label="Active merchants" value={num(totals.activeMerchants)} sub={`${totals.merchants} total accounts`} icon={<Store width={15} height={15} />} tone="mint" />
        <Readout label="Catalogue" value={num(totals.products)} sub={`${compact(totals.marketplaceListings)} marketplace listings`} icon={<Package width={15} height={15} />} tone="violet" />
      </div>

      <nav aria-label="Platform quick actions" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {adminLinks.map(({ href, title, detail, Icon }) => <Link key={href} href={href} className="group flex min-h-[62px] items-center gap-2.5 rounded-[3px] rounded-tr-[11px] border border-hairline bg-panel px-3 py-2.5 transition-colors hover:border-signal/50 hover:bg-white">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[2px] bg-[#fff0e9] text-signal"><Icon width={15} height={15} /></span>
          <span className="min-w-0"><span className="block truncate text-[12px] font-bold text-chalk group-hover:text-signal">{title}</span><span className="mt-0.5 block truncate text-[10px] text-chalk-dim">{detail}</span></span>
          <ArrowRight width={13} height={13} className="ml-auto shrink-0 text-chalk-dim" />
        </Link>)}
      </nav>

      <div className="grid min-w-0 gap-3 xl:grid-cols-[1.4fr_1fr]">
        <Panel>
          <PanelHead title="Channel activity" hint="GMV from recorded orders" />
          <div className="grid grid-cols-2 gap-2.5">
            <div className="rounded-[3px] rounded-tr-[10px] border border-hairline bg-white p-3"><Eyebrow>Ferixas marketplace</Eyebrow><p className="mt-1.5 font-mono text-[18px] font-bold text-chalk">{money(channels.marketplace, { cents: false })}</p><p className="text-[10px] text-chalk-dim">GMV</p></div>
            <div className="rounded-[3px] rounded-tr-[10px] border border-hairline bg-white p-3"><Eyebrow>Merchant stores</Eyebrow><p className="mt-1.5 font-mono text-[18px] font-bold text-chalk">{money(channels.store, { cents: false })}</p><p className="text-[10px] text-chalk-dim">GMV</p></div>
          </div>
          <div className="mt-4 grid gap-3 border-t border-hairline pt-4">
            {[{ label: "Marketplace", value: channels.marketplace, tone: undefined }, { label: "Merchant stores", value: channels.store, tone: "violet" as const }].map((row) => <div key={row.label}>
              <div className="mb-1 flex justify-between gap-3 text-[11px]"><span className="text-chalk-dim">{row.label}</span><span className="font-mono text-chalk">{money(row.value, { cents: false })}</span></div><Meter value={row.value} max={channelMax} tone={row.tone} />
            </div>)}
          </div>
          <p className="mt-3 text-[10px] text-chalk-dim">Traffic and conversion reports: <span className="font-semibold text-signal">Coming soon</span></p>
        </Panel>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
          <Panel>
            <PanelHead title="Order pipeline" hint="Current recorded order status" />
            {totals.orders ? <div className="grid grid-cols-2 gap-2">
              {orderPipeline.map((row) => <div key={row.label} className="flex items-center justify-between gap-2 rounded-[2px] border border-hairline px-2.5 py-2"><span className="text-[10px] text-chalk-dim">{row.label}</span><Pill tone={row.tone}>{row.value}</Pill></div>)}
            </div> : <p className="text-[12px] text-chalk-dim">Order activity will appear when transactions are recorded.</p>}
          </Panel>
          <Panel>
            <PanelHead title="Merchants to review" action={<Link href="/merchants" className="text-[11px] font-bold text-signal">All merchants <ArrowRight className="inline" width={12} height={12} /></Link>} />
            {needsAttention.length ? <ul className="grid gap-2">{needsAttention.slice(0, 4).map((merchant) => <li key={merchant.id} className="flex items-center justify-between gap-2 rounded-[2px] border border-hairline px-2.5 py-2"><Link href={`/merchants/${merchant.id}`} className="truncate text-[11px] font-medium text-chalk hover:text-signal">{merchant.name}</Link><Pill tone={merchant.status === "suspended" ? "rose" : "amber"}><AlertTriangle width={10} height={10} /> {merchant.status}</Pill></li>)}</ul> : <p className="text-[12px] text-chalk-dim">No merchants need review.</p>}
          </Panel>
        </div>
      </div>

      <div className="grid gap-3 xl:grid-cols-2">
        <Panel>
          <PanelHead title="Top merchants" hint="By recorded order value" action={<Link href="/merchants" className="text-[11px] font-bold text-signal">View all <ArrowRight className="inline" width={12} height={12} /></Link>} />
          {topMerchants.some((merchant) => merchant.gmv > 0) ? <ul className="grid gap-3">{topMerchants.slice(0, 5).map((merchant) => <li key={merchant.id}>
            <div className="mb-1 flex items-center justify-between gap-2"><Link href={`/merchants/${merchant.id}`} className="truncate text-[12px] font-medium text-chalk hover:text-signal">{merchant.name}</Link><span className="font-mono text-[11px] font-semibold text-chalk">{money(merchant.gmv, { cents: false })}</span></div><Meter value={merchant.gmv} max={merchantMax} /><p className="mt-1 text-[9px] text-chalk-dim">{merchant.orders} recorded orders</p>
          </li>)}</ul> : <p className="text-[12px] text-chalk-dim">No recorded sales yet.</p>}
        </Panel>
        <Panel>
          <PanelHead title="Platform health" hint="Live operational counts" />
          <div className="grid grid-cols-2 gap-2">
            {[{ label: "Customers", value: data.registeredUsers, Icon: Users }, { label: "Suspended", value: totals.suspendedMerchants, Icon: Building2 }, { label: "Review queue", value: totals.reviewMerchants, Icon: AlertTriangle }, { label: "Units ordered", value: totals.soldUnits, Icon: Boxes }].map(({ label, value, Icon }) => <div key={label} className="flex min-h-[58px] items-center gap-2 rounded-[2px] border border-hairline bg-white px-2.5 py-2"><span className="grid h-7 w-7 place-items-center rounded-[2px] bg-[#fff0e9] text-signal"><Icon width={14} height={14} /></span><span className="min-w-0"><span className="block font-mono text-[13px] font-bold text-chalk">{num(value)}</span><span className="block truncate text-[9px] text-chalk-dim">{label}</span></span></div>)}
          </div>
        </Panel>
      </div>

      <Panel flush>
        <div className="flex items-center justify-between gap-3 p-4 pb-3 sm:p-5 sm:pb-4"><PanelHead title="Recent orders" hint="Newest recorded transactions" /><Link href="/orders" className="inline-flex min-h-9 shrink-0 items-center gap-1 text-[11px] font-bold text-signal">All orders <ArrowRight width={13} height={13} /></Link></div>
        {recentOrders.length ? <>
          <ul className="grid gap-2 px-3 pb-3 sm:hidden">{recentOrders.slice(0, 5).map((order) => <li key={order.id}><Link href={`/orders/${order.id}`} className="flex items-center justify-between gap-2 rounded-[3px] border border-hairline bg-white p-3"><span className="min-w-0"><span className="block truncate text-[12px] font-bold text-chalk">{order.number}</span><span className="mt-1 block truncate text-[10px] text-chalk-dim">{order.merchantName} · {order.customer.name}</span></span><span className="shrink-0 text-right"><span className="block font-mono text-[12px] font-bold text-chalk">{money(order.total)}</span><span className="mt-1 block"><Pill tone={statusTone(order.fulfillment)}>{titleCase(order.fulfillment)}</Pill></span></span></Link></li>)}</ul>
          <div className="hidden overflow-x-auto px-5 pb-4 sm:block"><table className="w-full min-w-[760px] border-collapse text-left"><thead><tr>{["Order", "Merchant", "Customer", "Channel", "Date", "Status", "Total"].map((head) => <th key={head} className="border-b border-hairline pb-2.5 font-mono text-[9px] font-medium uppercase tracking-[0.13em] text-chalk-dim">{head}</th>)}</tr></thead><tbody>{recentOrders.slice(0, 6).map((order) => <tr key={order.id} className="border-b border-hairline/60 last:border-0"><td className="py-3 pr-3"><Link href={`/orders/${order.id}`} className="font-mono text-[12px] font-bold text-chalk hover:text-signal">{order.number}</Link></td><td className="py-3 pr-3 text-[11px] text-chalk-dim">{order.merchantName}</td><td className="py-3 pr-3 text-[11px] text-chalk-dim">{order.customer.name}</td><td className="py-3 pr-3"><Pill tone={order.channel === "marketplace" ? "violet" : "neutral"}>{order.channel}</Pill></td><td className="py-3 pr-3 font-mono text-[10px] text-chalk-dim">{dateShort(order.placedAt)} · {relative(order.placedAt)}</td><td className="py-3 pr-3"><Pill tone={statusTone(order.fulfillment)}>{titleCase(order.fulfillment)}</Pill></td><td className="py-3 font-mono text-[12px] font-semibold text-chalk">{money(order.total)}</td></tr>)}</tbody></table></div>
        </> : <div className="px-4 pb-4 sm:px-5 sm:pb-5"><Empty title="No orders yet" body="Recorded platform orders will appear here." /></div>}
      </Panel>

      <p className="flex flex-wrap items-center gap-2 border-t border-hairline pt-3 font-mono text-[9px] uppercase tracking-[0.12em] text-chalk-dim"><Boxes width={11} height={11} /> {compact(totals.marketplaceListings)} marketplace listings · {settings.currency} · {settings.payoutCadence} payout cadence</p>
    </div>
  );
}

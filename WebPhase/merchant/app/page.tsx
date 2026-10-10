import Link from "next/link";
import { AlertTriangle, ArrowRight, Boxes, ChartNoAxesCombined, Mail, MapPin, Package, Phone, ShoppingCart, Users, Wallet } from "lucide-react";
import { requireMerchant } from "@/lib/data";
import { getDashboard } from "@/lib/api";
import { signOutAction } from "@/lib/actions";
import { SubmitButton } from "@/components/studio/controls";
import { Empty, Eyebrow, Panel, PanelHead, Pill, StatTile } from "@/components/studio/bits";
import { compact, dateShort, money, num, relative, titleCase } from "@/lib/format";

function statusTone(status: string) {
  if (status === "delivered") return "success" as const;
  if (status === "shipped") return "info" as const;
  if (status === "cancelled") return "danger" as const;
  return "warn" as const;
}

const quickLinks = [
  { href: "/products", title: "Products", Icon: Package },
  { href: "/orders", title: "Orders", Icon: ShoppingCart },
  { href: "/inventory", title: "Inventory", Icon: Boxes },
  { href: "/analytics", title: "Analytics", Icon: ChartNoAxesCombined },
  { href: "/audience", title: "Audience", Icon: Users },
];

export default async function DashboardPage() {
  const { session, merchant } = await requireMerchant();

  // An unreachable API must never replace the workspace with an error screen.
  let data: Awaited<ReturnType<typeof getDashboard>>;
  try {
    data = await getDashboard(session);
  } catch (error) {
    return <DataUnavailable title="Dashboard" reason={describeError(error)} />;
  }

  const { summary, counts, statuses, lowStock, recentOrders, settings } = data;
  const orderMix = [
    { label: "Needs action", value: statuses.processing ?? 0, tone: "bg-[#e4572e]" },
    { label: "In transit", value: statuses.shipped ?? 0, tone: "bg-[#2878b9]" },
    { label: "Delivered", value: statuses.delivered ?? 0, tone: "bg-[#2d875a]" },
    { label: "Cancelled", value: statuses.cancelled ?? 0, tone: "bg-[#9c5560]" },
  ];
  const maxStatus = Math.max(...orderMix.map((row) => row.value), 1);

  return (
    <div className="grid min-w-0 gap-4 sm:gap-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Eyebrow>Seller centre</Eyebrow>
          <h1 className="mt-1.5 font-display text-[23px] font-bold leading-tight text-chalk sm:text-[28px]">Welcome back, {merchant.name}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/products" className="inline-flex min-h-10 items-center gap-2 rounded-[2px] rounded-tr-[9px] bg-signal px-3.5 text-[12px] font-bold text-white transition-colors hover:bg-[#e4572e]">
            <Package width={14} height={14} /> Add product
          </Link>
          <form action={signOutAction}><SubmitButton variant="outline" pendingLabel="Signing out">Sign out</SubmitButton></form>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-2 sm:gap-3 xl:grid-cols-4">
        <StatTile label="Revenue · 30 days" value={money(summary.revenue30d, { cents: false })} sub="Recorded orders" icon={<ChartNoAxesCombined width={15} height={15} />} />
        <StatTile label="Orders · 30 days" value={num(summary.orders30d)} sub={`${statuses.processing ?? 0} need attention`} icon={<ShoppingCart width={15} height={15} />} accent="azure" />
        <StatTile label="Products" value={num(counts.products)} sub={`${counts.published} published`} icon={<Package width={15} height={15} />} accent="chalk" />
        <StatTile label="Marketplace followers" value={num(counts.followers)} sub="Real shopper follows" icon={<Users width={15} height={15} />} accent="sand" />
      </div>

      <nav aria-label="Seller quick actions" className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
        {quickLinks.map(({ href, title, Icon }) => (
          <Link key={href} href={href} className="group flex min-h-[62px] items-center gap-2.5 rounded-[3px] rounded-tr-[11px] border border-hairline bg-panel px-3 py-2.5 transition-colors hover:border-signal/50 hover:bg-white">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[2px] bg-[#fff0e9] text-signal"><Icon width={15} height={15} /></span>
            <span className="min-w-0 truncate text-[12px] font-bold text-chalk group-hover:text-signal">{title}</span>
            <ArrowRight width={13} height={13} className="ml-auto shrink-0 text-chalk-dim" />
          </Link>
        ))}
      </nav>

      <Panel>
        <PanelHead
          title="Your seller profile"
          action={<Pill tone={data.profileRequest?.status === "pending_review" ? "warn" : "neutral"}>{data.profileRequest?.status?.replaceAll("_", " ") ?? "profile setup"}</Pill>}
        />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex items-start gap-2.5 rounded-[2px] border border-hairline p-3"><MapPin width={14} height={14} className="mt-0.5 shrink-0 text-signal" /><div><p className="text-[10px] text-chalk-dim">Business location</p><p className="mt-0.5 text-[12px] font-medium text-chalk">{[data.profile.city, data.profile.region, data.profile.country].filter(Boolean).join(", ") || data.profile.location || "Add your location"}</p></div></div>
          <div className="flex items-start gap-2.5 rounded-[2px] border border-hairline p-3"><Mail width={14} height={14} className="mt-0.5 shrink-0 text-signal" /><div><p className="text-[10px] text-chalk-dim">Business email</p><p className="mt-0.5 break-all text-[12px] font-medium text-chalk">{data.profile.businessEmail || "Add a contact email"}</p></div></div>
          <div className="flex items-start gap-2.5 rounded-[2px] border border-hairline p-3"><Phone width={14} height={14} className="mt-0.5 shrink-0 text-signal" /><div><p className="text-[10px] text-chalk-dim">Business phone</p><p className="mt-0.5 text-[12px] font-medium text-chalk">{data.profile.businessPhone || "Add a contact phone"}</p></div></div>
          <div className="flex items-start gap-2.5 rounded-[2px] border border-hairline p-3"><MapPin width={14} height={14} className="mt-0.5 shrink-0 text-signal" /><div><p className="text-[10px] text-chalk-dim">Business address</p><p className="mt-0.5 text-[12px] font-medium text-chalk">{[data.profile.addressLine1, data.profile.city, data.profile.region, data.profile.postalCode, data.profile.country].filter(Boolean).join(", ") || "Add your business address"}</p></div></div>
        </div>
        {data.profileRequest?.note ? <p className="mt-3 rounded-[8px] border border-sand/30 bg-sand/5 p-3 text-[12px] text-sand">Profile review note: {data.profileRequest.note}</p> : null}
        <Link href="/settings#seller-profile" className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-semibold text-signal">Manage seller profile <ArrowRight width={12} height={12} /></Link>
      </Panel>

      <div className="grid min-w-0 gap-3 xl:grid-cols-[1.45fr_1fr]">
        <Panel flush>
          <div className="flex items-center justify-between gap-3 p-4 pb-3 sm:p-5 sm:pb-4">
            <PanelHead title="Recent orders" />
            <Link href="/orders" className="inline-flex min-h-9 shrink-0 items-center gap-1 text-[11px] font-bold text-signal">All orders <ArrowRight width={13} height={13} /></Link>
          </div>
          {recentOrders.length ? (
            <>
              <ul className="grid gap-2 px-3 pb-3 sm:hidden">
                {recentOrders.slice(0, 5).map((order) => (
                  <li key={order.id}>
                    <Link href={`/orders/${order.id}`} className="flex items-center justify-between gap-2 rounded-[3px] border border-hairline bg-white p-3">
                      <span className="min-w-0"><span className="block truncate text-[12px] font-bold text-chalk">{order.number}</span><span className="mt-1 block truncate text-[10px] text-chalk-dim">{order.customer.name} · {dateShort(order.placedAt)}</span></span>
                      <span className="shrink-0 text-right"><span className="block font-mono text-[12px] font-bold text-chalk">{money(order.total)}</span><span className="mt-1 block"><Pill tone={statusTone(order.fulfillment)}>{titleCase(order.fulfillment)}</Pill></span></span>
                    </Link>
                  </li>
                ))}
              </ul>
              <div className="hidden overflow-x-auto px-5 pb-4 sm:block">
                <table className="w-full min-w-[680px] border-collapse text-left">
                  <thead><tr>{["Order", "Customer", "Channel", "Date", "Status", "Total"].map((head) => <th key={head} className="border-b border-hairline pb-2.5 font-mono text-[9px] font-medium uppercase tracking-[0.13em] text-chalk-dim">{head}</th>)}</tr></thead>
                  <tbody>{recentOrders.slice(0, 6).map((order) => (
                    <tr key={order.id} className="border-b border-hairline/60 last:border-0">
                      <td className="py-3 pr-3"><Link href={`/orders/${order.id}`} className="font-mono text-[12px] font-bold text-chalk hover:text-signal">{order.number}</Link><p className="text-[10px] text-chalk-dim">{order.items.length} item(s)</p></td>
                      <td className="py-3 pr-3 text-[12px] text-chalk-dim">{order.customer.name}</td>
                      <td className="py-3 pr-3"><Pill tone={order.channel === "marketplace" ? "info" : "neutral"}>{order.channel}</Pill></td>
                      <td className="py-3 pr-3 font-mono text-[10px] text-chalk-dim">{dateShort(order.placedAt)} · {relative(order.placedAt)}</td>
                      <td className="py-3 pr-3"><Pill tone={statusTone(order.fulfillment)}>{titleCase(order.fulfillment)}</Pill></td>
                      <td className="py-3 font-mono text-[12px] font-semibold text-chalk">{money(order.total)}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </>
          ) : <div className="px-4 pb-4 sm:px-5 sm:pb-5"><Empty title="No orders yet" body="New orders will appear here." /></div>}
        </Panel>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
          <Panel>
            <PanelHead title="Order pipeline" />
            {summary.ordersTotal ? <div className="grid gap-3">
              {orderMix.map((row) => <div key={row.label}>
                <div className="mb-1 flex items-center justify-between gap-3"><span className="text-[11px] text-chalk-dim">{row.label}</span><span className="font-mono text-[11px] font-bold text-chalk">{row.value}</span></div>
                <div className="h-1.5 overflow-hidden rounded-[1px] bg-hairline"><div className={`h-full ${row.tone}`} style={{ width: `${(row.value / maxStatus) * 100}%` }} /></div>
              </div>)}
            </div> : <p className="text-[12px] text-chalk-dim">Order analytics will appear when orders are recorded.</p>}
          </Panel>

          <Panel>
            <PanelHead title="Stock watch" action={<Link href="/inventory" className="text-[11px] font-bold text-signal">Inventory <ArrowRight className="inline" width={12} height={12} /></Link>} />
            {lowStock.length ? <ul className="grid gap-2">
              {lowStock.slice(0, 4).map((item) => <li key={item.id} className="flex items-center justify-between gap-3 rounded-[2px] border border-hairline px-2.5 py-2">
                <Link href={`/products/${item.slug}`} className="min-w-0 truncate text-[11px] font-medium text-chalk hover:text-signal">{item.title}</Link>
                <Pill tone={item.stock <= 0 ? "danger" : "warn"}><AlertTriangle width={10} height={10} /> {item.stock} left</Pill>
              </li>)}
            </ul> : <p className="text-[12px] text-chalk-dim">No items are below your {settings.lowStockAt}-unit alert.</p>}
          </Panel>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Panel>
          <PanelHead title="Ferixas marketplace presence" action={<Link href="/audience" className="text-[11px] font-bold text-signal">View audience <ArrowRight className="inline" width={12} height={12} /></Link>} />
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-[2px] border border-hairline p-3"><Eyebrow>Approved listings</Eyebrow><p className="mt-1.5 font-mono text-[18px] font-bold text-chalk">{num(counts.published)}</p><p className="text-[10px] text-chalk-dim">visible on Ferixas</p></div>
            <div className="rounded-[2px] border border-hairline p-3"><Eyebrow>Followers</Eyebrow><p className="mt-1.5 font-mono text-[18px] font-bold text-chalk">{num(counts.followers)}</p><p className="text-[10px] text-chalk-dim">current shopper follows</p></div>
          </div>
          <p className="mt-3 text-[11px] text-chalk-dim">Shoppers see your approved Ferixas profile, not pages from your separate website.</p>
        </Panel>
        <Panel>
          <PanelHead title="Traffic insights" />
          <div className="flex min-h-[74px] items-center justify-between gap-3 rounded-[2px] bg-[#fff7f2] px-3.5">
            <div><p className="text-[13px] font-semibold text-chalk">Coming soon</p><p className="mt-0.5 text-[11px] text-chalk-dim">Visitor and conversion tracking is not connected.</p></div>
            <ChartNoAxesCombined width={20} height={20} className="shrink-0 text-signal" />
          </div>
        </Panel>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-hairline pt-3 text-[10px] text-chalk-dim">
        <span>{compact(counts.products)} products · {counts.published} published</span>
        <Link href="/payouts" className="inline-flex items-center gap-1 font-semibold text-signal"><Wallet width={12} height={12} /> View payout history <ArrowRight width={12} height={12} /></Link>
      </div>
    </div>
  );
}

function describeError(error: unknown) {
  return error instanceof Error ? error.message : "The request could not be completed.";
}

function DataUnavailable({ title, reason }: { title: string; reason: string }) {
  return (
    <div className="grid min-w-0 gap-4">
      <header>
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-chalk-dim">Console</p>
        <h1 className="mt-1.5 font-display text-[23px] font-bold leading-tight text-chalk">{title}</h1>
      </header>
      <section className="rounded-[14px] border border-hairline bg-panel p-5">
        <p className="font-display text-[16px] font-semibold text-chalk">The commerce API could not be reached</p>
        <p className="mt-1.5 max-w-[70ch] text-[13px] leading-relaxed text-chalk-dim">
          Nothing was lost and nothing was changed. Set FERIX_API_BASE in this app&apos;s environment to the address
          of the commerce API, then reload. Every other screen in the console keeps working.
        </p>
        <p className="mt-3 rounded-[10px] bg-panel-2 px-3 py-2 font-mono text-[11px] break-words text-chalk-dim">{reason}</p>
      </section>
    </div>
  );
}

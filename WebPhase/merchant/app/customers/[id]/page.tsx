import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Mail, MapPin, Phone } from "lucide-react";
import { requireMerchant } from "@/lib/data";
import { getCustomer, ApiError } from "@/lib/api";
import { Eyebrow, Panel, PanelHead, Pill, StatTile } from "@/components/studio/bits";
import { statusTone } from "@/components/studio/order-bits";
import { dateShort, money, titleCase } from "@/lib/format";

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { session } = await requireMerchant();
  let data;
  try {
    data = await getCustomer(session, id);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }
  const { customer, orders, address } = data;

  return (
    <div className="grid gap-5">
      <div>
        <Link
          href="/customers"
          className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-chalk-dim transition-colors hover:text-chalk"
        >
          <ArrowLeft width={12} height={12} /> All customers
        </Link>
      </div>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="grid h-14 w-14 place-items-center rounded-[3px] border border-hairline bg-panel-2 font-display text-[18px] font-extrabold text-lime">
            {customer.name.split(" ").map((part) => part[0]).slice(0, 2).join("")}
          </span>
          <div>
            <Eyebrow>Customer</Eyebrow>
            <h1 className="mt-1 font-display text-[22px] font-semibold text-chalk">{customer.name}</h1>
            <p className="mt-1 font-mono text-[10.5px] uppercase tracking-[0.14em] text-chalk-dim">{customer.location}</p>
          </div>
        </div>
        <Pill tone={customer.segment === "vip" ? "lime" : customer.segment === "returning" ? "info" : "neutral"}>
          {customer.segment}
        </Pill>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Orders" value={String(customer.orders ?? orders.length)} sub="With your store" />
        <StatTile label="Total spent" value={money(customer.spent ?? 0, { cents: false })} sub="Paid orders only" accent="lime" />
        <StatTile label="Average order" value={money(customer.averageOrder ?? 0, { cents: false })} sub="Across their orders" accent="azure" />
        <StatTile
          label="Last order"
          value={orders[0] ? dateShort(orders[0].placedAt) : "—"}
          sub={orders[0] ? orders[0].number : "No orders yet"}
          accent="sand"
        />
      </div>

      <div className="grid gap-3 lg:grid-cols-[1.4fr_1fr]">
        <Panel flush>
          <div className="p-5 pb-3">
            <PanelHead title="Order history" hint="Newest first" />
          </div>
          <div className="overflow-x-auto px-5 pb-5">
            <table className="w-full min-w-[520px] border-collapse text-left">
              <thead>
                <tr>
                  {["Order", "Placed", "Items", "Status", "Total"].map((head) => (
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
                {orders.map((order) => (
                  <tr key={order.id} className="border-b border-hairline/60 last:border-0">
                    <td className="py-3 pr-4">
                      <Link href={`/orders/${order.id}`} className="font-mono text-[12.5px] font-semibold text-chalk hover:text-lime">
                        {order.number}
                      </Link>
                    </td>
                    <td className="py-3 pr-4 font-mono text-[11.5px] text-chalk-dim">{dateShort(order.placedAt)}</td>
                    <td className="py-3 pr-4 text-[12px] text-chalk-dim">
                      {order.items.map((item) => `${item.qty}× ${item.title}`).join(", ")}
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
        </Panel>

        <div className="grid gap-3">
          <Panel>
            <PanelHead title="Contact" />
            <ul className="grid gap-2.5 text-[12.5px] text-chalk-dim">
              <li className="flex items-center gap-2">
                <Mail width={13} height={13} /> {customer.email || "No email on this order"}
              </li>
              <li className="flex items-center gap-2">
                <Phone width={13} height={13} /> {customer.phone}
              </li>
              <li className="flex items-start gap-2">
                <MapPin width={13} height={13} className="mt-[3px]" /> {customer.location}
              </li>
            </ul>
          </Panel>

          <Panel>
            <PanelHead title="Delivery address" hint="From their most recent order" />
            <p className="text-[13px] text-chalk">{address.name}</p>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-chalk-dim">
              {address.line1}
              {address.line2 ? `, ${address.line2}` : ""}
              <br />
              {address.city}, {address.region} {address.postcode}
              <br />
              {address.country}
            </p>
          </Panel>
        </div>
      </div>
    </div>
  );
}

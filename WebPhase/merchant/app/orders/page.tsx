import Link from "next/link";
import { Package, Search, Truck } from "lucide-react";
import { requireMerchant } from "@/lib/data";
import { listOrders } from "@/lib/api";
import { setOrderStatusAction } from "@/lib/actions";
import { FilterForm } from "@/components/studio/controls";
import { ConfirmAction } from "@/components/studio/confirm-action";
import { Empty, Eyebrow, Panel, PanelHead, Pill, StatTile } from "@/components/studio/bits";
import { CellLabel, DataTable, Row, TablePanel, Td, TdDetail, TdEnd, TdLead } from "@/components/studio/table";
import { carriersLabel, statusTone } from "@/components/studio/order-bits";
import { dateShort, money, num, relative, titleCase } from "@/lib/format";
import { cn } from "@/lib/utils";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "processing", label: "Awaiting action" },
  { id: "shipped", label: "In transit" },
  { id: "delivered", label: "Delivered" },
  { id: "cancelled", label: "Cancelled" },
];

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; channel?: string; search?: string }>;
}) {
  const { status, channel, search } = await searchParams;
  const { session } = await requireMerchant();
  const data = await listOrders(session, {
    status: status ?? "all",
    channel: channel ?? "all",
    search,
  });

  return (
    <div className="grid gap-5">
      <header className="shrinkable">
        <Eyebrow>Orders</Eyebrow>
        <h1 className="mt-1.5 font-display text-[23px] font-semibold text-chalk">Order queue</h1>
        <p className="mt-1.5 max-w-[72ch] text-[13px] leading-relaxed text-chalk-dim">
          Marketplace and storefront orders arrive in one queue.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 xl:grid-cols-4">
        <StatTile
          label="Waiting on you"
          value={num(data.awaiting)}
          sub="Not dispatched yet"
          icon={<Package width={15} height={15} />}
          accent="sand"
        />
        <StatTile label="In transit" value={num(data.counts.shipped ?? 0)} sub="With the carrier" icon={<Truck width={15} height={15} />} accent="azure" />
        <StatTile label="Delivered" value={num(data.counts.delivered ?? 0)} sub="Completed" accent="lime" />
        <StatTile label="Value of these orders" value={money(data.revenue, { cents: false })} sub={`${data.total} orders in view`} accent="chalk" />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((filter) => (
            <Link
              key={filter.id}
              href={filter.id === "all" ? "/orders" : `/orders?status=${filter.id}`}
              className={cn(
                "min-h-11 rounded-[2px] border px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] transition-colors",
                (status ?? "all") === filter.id
                  ? "border-lime/40 bg-lime/10 text-lime"
                  : "border-hairline text-chalk-dim hover:border-chalk-dim hover:text-chalk",
              )}
            >
              {filter.label}
              <span className="ml-2 opacity-70">{data.counts[filter.id] ?? 0}</span>
            </Link>
          ))}
        </div>

        <FilterForm action="/orders" className="flex flex-wrap items-center gap-2">
          <label className="relative flex items-center">
            <Search width={14} height={14} className="pointer-events-none absolute left-2.5 text-chalk-dim" />
            <input
              name="search"
              defaultValue={search ?? ""}
              placeholder="Order number, customer or product"
              className="h-11 w-[240px] rounded-[2px] border border-hairline bg-panel-2 pl-8 pr-3 text-[12.5px] text-chalk outline-none placeholder:text-chalk-dim/60 focus:border-chalk-dim"
            />
          </label>
          <select
            name="channel"
            defaultValue={channel ?? "all"}
            className="h-11 rounded-[2px] border border-hairline bg-panel-2 px-2 text-[12.5px] text-chalk outline-none focus:border-chalk-dim"
            aria-label="Channel"
          >
            <option value="all">Every channel</option>
            <option value="store">My store</option>
            <option value="marketplace">Marketplace</option>
          </select>
        </FilterForm>
      </div>

      {data.orders.length ? (
        <TablePanel>
          <DataTable
            head={["Order", "Customer", "Channel", "Placed", "Total", "Status", "Fulfilment"]}
            minWidth={980}
            className="p-5"
          >
            {data.orders.map((order) => (
              <Row key={order.id}>
                <TdLead>
                  <Link href={`/orders/${order.id}`} className="font-mono text-[12.5px] font-semibold text-chalk hover:text-lime">
                    {order.number}
                  </Link>
                  <p className="truncate text-[11.5px] text-chalk-dim md:max-w-[200px]">
                    {order.items.map((item) => item.title).join(", ")}
                  </p>
                  <p className="mt-0.5 text-[11.5px] text-chalk-dim md:hidden">
                    {order.customer.name} · {order.customer.location}
                  </p>
                </TdLead>
                <TdDetail>
                  <p className="text-[12.5px] text-chalk">{order.customer.name}</p>
                  <p className="font-mono text-[10px] text-chalk-dim">{order.customer.location}</p>
                </TdDetail>
                <TdDetail>
                  <Pill tone={order.channel === "marketplace" ? "info" : "neutral"}>{order.channel}</Pill>
                </TdDetail>
                <TdDetail>
                  <p className="font-mono text-[11.5px] text-chalk-dim">{dateShort(order.placedAt)}</p>
                  <p className="font-mono text-[10px] text-chalk-dim/70">{relative(order.placedAt)}</p>
                </TdDetail>
                <Td className="font-mono text-[12.5px] tabular-nums text-chalk">
                  <CellLabel>Total</CellLabel>
                  {money(order.total)}
                </Td>
                <Td>
                  <Pill tone={statusTone(order.fulfillment)}>{titleCase(order.fulfillment)}</Pill>
                  {order.tracking ? (
                    <p className="mt-1 font-mono text-[10px] text-chalk-dim">
                      {carriersLabel(order.carrier)} · {order.tracking}
                    </p>
                  ) : null}
                </Td>
                <TdEnd>
                  <div className="flex flex-wrap items-center justify-end gap-1.5">
                    {/* One action per order, matching where it rests in the
                        workflow, so there is never a choice to get wrong. */}
                    {order.fulfillment === "processing" ? (
                      <StatusButton id={order.id} to="shipped" label="Mark shipped" />
                    ) : null}
                    {order.fulfillment === "shipped" ? (
                      <StatusButton id={order.id} to="delivered" label="Mark delivered" />
                    ) : null}
                    {order.fulfillment !== "cancelled" && order.fulfillment !== "delivered" ? (
                      <ConfirmAction
                        action={setOrderStatusAction}
                        fields={{ id: order.id, fulfillment: "cancelled" }}
                        label="Cancel"
                        confirmLabel="Refund and cancel?"
                        tone="danger"
                      />
                    ) : null}
                    <Link
                      href={`/orders/${order.id}`}
                      className="inline-flex min-h-[44px] items-center rounded-[2px] border border-hairline px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-chalk-dim transition-colors hover:border-chalk-dim hover:text-chalk"
                    >
                      Open
                    </Link>
                  </div>
                </TdEnd>
              </Row>
            ))}
          </DataTable>
        </TablePanel>
      ) : (
        <Empty title="No orders in this view" body="Clear the filters, or wait for the next sale to come in." />
      )}

      <Panel>
        <PanelHead title="What the shopper sees" hint="Status changes are visible to the customer immediately" />
        <p className="text-[12.5px] leading-relaxed text-chalk-dim">
          Marking an order shipped adds the carrier and a tracking number to the customer&apos;s account.
          Delivered closes it out. Cancelling refunds the payment.
        </p>
      </Panel>
    </div>
  );
}

function StatusButton({
  id,
  to,
  label,
  danger,
}: {
  id: string;
  to: string;
  label: string;
  danger?: boolean;
}) {
  return (
    <form action={setOrderStatusAction}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="fulfillment" value={to} />
      <button
        type="submit"
        className={cn(
          "inline-flex min-h-11 cursor-pointer items-center rounded-[2px] border px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] transition-colors",
          danger
            ? "border-ember/40 text-ember-soft hover:bg-ember/12"
            : "border-lime/40 bg-lime/10 text-lime hover:bg-lime/20",
        )}
      >
        {label}
      </button>
    </form>
  );
}
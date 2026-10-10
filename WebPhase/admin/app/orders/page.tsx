import Link from "next/link";
import { Receipt, Search } from "lucide-react";
import { requireAdmin } from "@/lib/data";
import { listOrders } from "@/lib/api";
import { FilterForm } from "@/components/ops/controls";
import { Empty, Eyebrow, Panel, PanelHead, Pill, Readout } from "@/components/ops/bits";
import { Distribution } from "@/components/ops/marks";
import { compact, dateShort, money, num, relative, titleCase } from "@/lib/format";
import { cn } from "@/lib/utils";
import { CellLabel, DataTable, PageHeader, Row, Td, TdDetail, TdLead, TablePanel } from "@/components/ops/table";
import { CmsActionForm } from "@/components/ops/cms-action-form";
import { SubmitButton } from "@/components/ops/controls";
import { cancelOrderAction, resendOrderAction } from "@/lib/actions";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "processing", label: "Awaiting action" },
  { id: "shipped", label: "In transit" },
  { id: "delivered", label: "Delivered" },
  { id: "cancelled", label: "Cancelled" },
];

function statusTone(status: string) {
  if (status === "delivered") return "mint" as const;
  if (status === "shipped") return "signal" as const;
  if (status === "cancelled") return "rose" as const;
  return "amber" as const;
}

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; merchantId?: string; search?: string }>;
}) {
  const { status, merchantId, search } = await searchParams;
  const { session } = await requireAdmin();
  const data = await listOrders(session, {
    status: status ?? "all",
    merchantId: merchantId ?? "all",
    search,
  });
  const activeMerchant = data.merchants.find((m) => m.id === merchantId);

  return (
    <div className="grid min-w-0 gap-5">
      <header>
        <Eyebrow>Order oversight</Eyebrow>
        <h1 className="mt-1.5 font-display text-[23px] font-semibold text-chalk">Marketplace orders</h1>
        <p className="mt-1 max-w-[70ch] text-[12px] leading-relaxed text-chalk-dim">Only Ferixas marketplace orders appear here. Orders and sales from sellers&apos; separate websites are not part of this console.</p>
        
      </header>

      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 xl:grid-cols-4">
        <Readout label="Orders in view" value={num(data.total)} sub={`${data.counts.all ?? 0} on the platform`} icon={<Receipt width={15} height={15} />} />
        <Readout label="Value in view" value={money(data.gmv, { cents: false })} sub="Paid orders" tone="mint" />
        <Readout label="Commission in view" value={money(data.commission, { cents: false })} sub="Retained by the platform" tone="violet" />
        <Readout
          label="Payment state"
          value={`${data.counts.paid ?? 0} paid`}
          sub={`${data.counts.refunded ?? 0} refunded`}
          tone={(data.counts.refunded ?? 0) > 0 ? "amber" : "mint"}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((filter) => (
            <Link
              key={filter.id}
              href={filter.id === "all" ? "/orders" : `/orders?status=${filter.id}`}
              className={cn(
                "rounded-[2px] border px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] transition-colors",
                (status ?? "all") === filter.id
                  ? "border-signal/40 bg-signal/10 text-signal"
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
              placeholder="Order number, merchant or customer"
              className="h-9 w-[250px] rounded-[2px] border border-hairline bg-panel-2 pl-8 pr-3 text-[12.5px] text-chalk outline-none placeholder:text-chalk-dim/60 focus:border-signal/60"
            />
          </label>
          <select
            name="merchantId"
            defaultValue={merchantId ?? "all"}
            className="h-9 rounded-[2px] border border-hairline bg-panel-2 px-2 text-[12.5px] text-chalk outline-none focus:border-signal/60"
            aria-label="Merchant"
          >
            <option value="all">Every merchant</option>
            {data.merchants.map((merchant) => (
              <option key={merchant.id} value={merchant.id}>
                {merchant.name}
              </option>
            ))}
          </select>
        </FilterForm>
      </div>

      {activeMerchant ? (
        <p className="flex flex-wrap items-center gap-2 rounded-[2px] border border-signal/40 bg-signal/10 px-3 py-2.5 font-mono text-[11px] text-signal">
          Showing only {activeMerchant.name}.{" "}
          <Link href="/orders" className="underline decoration-2 underline-offset-4">
            Clear
          </Link>
        </p>
      ) : null}

      <div className="grid gap-3 lg:grid-cols-[1fr_280px]">
        <div>
          {data.orders.length ? (
            <TablePanel>
              <DataTable
                head={["Order", "Merchant", "Customer", "Placed", "Payment", "Status", "Commission", "Total", "Actions"]}
                minWidthClass="md:min-w-[1000px]"
              >
                {data.orders.map((order) => (
                  <Row key={`${order.id}-${order.merchantId}`}>
                    <TdLead>
                      <p className="font-mono text-[12px] text-chalk">{order.number}</p>
                      <p className="max-w-[170px] truncate text-[11px] text-chalk-dim">
                        {order.items.map((item) => item.title).join(", ")}
                      </p>
                    </TdLead>
                    <Td>
                      <CellLabel>Merchant</CellLabel>
                      <Link href={`/merchants/${order.merchantId}`} className="text-[12.5px] text-chalk hover:text-signal">
                        {order.merchantName}
                      </Link>
                    </Td>
                    <Td>
                      <CellLabel>Customer</CellLabel>
                      <p className="text-[12.5px] text-chalk-dim">{order.customer.name}</p>
                      <p className="font-mono text-[10px] text-chalk-dim/70">{order.customer.location}</p>
                    </Td>
                    <TdDetail className="font-mono text-[11.5px] text-chalk-dim">
                      {dateShort(order.placedAt)} · {relative(order.placedAt)}
                    </TdDetail>
                    <Td>
                      <CellLabel>Payment</CellLabel>
                      <Pill tone={order.payment === "paid" ? "mint" : order.payment === "refunded" ? "rose" : "amber"}>
                        {order.payment}
                      </Pill>
                    </Td>
                    <Td>
                      <CellLabel>Status</CellLabel>
                      <Pill tone={statusTone(order.fulfillment)}>{titleCase(order.fulfillment)}</Pill>
                      {order.tracking ? (
                        <p className="mt-1 font-mono text-[10px] text-chalk-dim">{order.carrier}</p>
                      ) : null}
                    </Td>
                    <TdDetail className="font-mono text-[12px] tabular-nums text-violet">{money(order.commission)}</TdDetail>
                    <Td className="ml-auto font-mono text-[12.5px] tabular-nums text-chalk md:ml-0">
                      <CellLabel>Total</CellLabel>
                      {money(order.total)}
                    </Td>
                  <Td>
                    <CellLabel>Actions</CellLabel>
                    <div className="flex flex-wrap items-center gap-2">
                      {new Set(["paid", "captured", "succeeded", "settled"]).has(order.payment) ? (
                        <CmsActionForm action={resendOrderAction} className="inline-flex">
                          <input type="hidden" name="id" value={order.id} />
                          <SubmitButton variant="outline" pendingLabel="…" className="px-2.5 py-1.5 text-[10.5px]">Resend</SubmitButton>
                        </CmsActionForm>
                      ) : <span className="text-[10px] text-chalk-dim">Awaiting confirmed payment</span>}
                      {new Set(["paid", "captured", "succeeded", "settled"]).has(order.payment) ? (
                        <button type="button" disabled title="A verified payment-provider refund flow is not connected" className="cursor-not-allowed rounded-[2px] border border-hairline px-2.5 py-1.5 text-[10.5px] text-chalk-dim opacity-60">Refund unavailable</button>
                      ) : order.fulfillment === "processing" ? (
                        <CmsActionForm action={cancelOrderAction} className="inline-flex">
                          <input type="hidden" name="id" value={order.id} />
                          <SubmitButton variant="danger" pendingLabel="…" className="px-2.5 py-1.5 text-[10.5px]">Cancel unpaid</SubmitButton>
                        </CmsActionForm>
                      ) : null}
                    </div>
                  </Td>

                  </Row>
                ))}
              </DataTable>
            </TablePanel>
          ) : (
            <Empty title="No orders in this view" body="Clear the filters to see the platform's order flow again." />
          )}
        </div>

        <div className="grid gap-3 lg:sticky lg:top-4 lg:self-start">
          <Panel>
            <PanelHead title="Pipeline" />
            <Distribution
              rows={[
                { label: "Awaiting action", value: data.counts.processing ?? 0, tone: "amber" },
                { label: "In transit", value: data.counts.shipped ?? 0, tone: "signal" },
                { label: "Delivered", value: data.counts.delivered ?? 0, tone: "mint" },
                { label: "Cancelled", value: data.counts.cancelled ?? 0, tone: "rose" },
              ]}
            />
          </Panel>

          <Panel>
            <PanelHead title="Reading this table" />
            <p className="text-[12.5px] leading-relaxed text-chalk-dim">
              Each row is one Ferixas marketplace order. Commission is calculated only from confirmed marketplace item sales.
            </p>
            <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.14em] text-chalk-dim/70">
              {compact(data.gmv)} of paid value · {compact(data.commission)} retained
            </p>
          </Panel>
        </div>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import {
  Download,
  Filter,
  PackageCheck,
  Printer,
  ReceiptText,
  RotateCcw,
  Search,
  Truck,
} from "lucide-react";
import { toast } from "sonner";
import {
  CARRIERS,
  customerById,
  getMerchant,
  merchantSubtotal,
  ordersForChannel,
  ordersOf,
} from "@/lib/data";
import { dateLong, dateShort, money, num } from "@/lib/format";
import { useFerixas } from "@/lib/store";
import type { FulfillmentStatus, Order, PaymentStatus } from "@/lib/types";
import { StudioShell } from "@/components/studio/shell";
import {
  Panel,
  Pill,
  SegmentedControl,
  StatTile,
  StudioButton,
  TableWrap,
  Td,
  Th,
  inputClass,
  selectClass,
} from "@/components/studio/bits";
import { KeyValue, SidePanel, Timeline } from "@/components/studio/side-panel";
import { ProductThumb } from "@/components/shop/product-plate";
import { cn } from "@/lib/utils";

export default function OrdersPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-void" />}>
      <OrdersPageInner />
    </Suspense>
  );
}

function OrdersPageInner() {
  const { merchantId, products, merchant } = useFerixas();
  const params = useSearchParams();
  const [channel, setChannel] = useState<"all" | "store" | "marketplace">("all");
  const [payment, setPayment] = useState<"all" | PaymentStatus>("all");
  const [fulfillment, setFulfillment] = useState<"all" | FulfillmentStatus>("all");
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [openId, setOpenId] = useState<string | null>(params.get("order"));
  const [edits, setEdits] = useState<Record<string, Partial<Order>>>({});

  const all = useMemo(
    () => ordersOf(merchantId).map((o) => (edits[o.id] ? { ...o, ...edits[o.id] } : o)),
    [merchantId, edits],
  );

  const rows = useMemo(
    () =>
      all.filter((o) => {
        if (channel !== "all" && o.channel !== channel) return false;
        if (payment !== "all" && o.payment !== payment) return false;
        if (fulfillment !== "all" && o.fulfillment !== fulfillment) return false;
        if (query.trim()) {
          const hay = `${o.number} ${customerById(o.customerId)?.name ?? ""} ${o.items
            .map((i) => i.title)
            .join(" ")}`.toLowerCase();
          if (!query.trim().toLowerCase().split(/\s+/).every((t) => hay.includes(t))) return false;
        }
        return true;
      }),
    [all, channel, payment, fulfillment, query],
  );

  const openOrder = openId ? all.find((o) => o.id === openId || o.number === openId) : undefined;

  const revenue = all.reduce((s, o) => s + merchantSubtotal(o, merchantId), 0);
  const awaiting = all.filter(
    (o) => o.fulfillment === "unfulfilled" || o.fulfillment === "processing",
  ).length;
  const storeOrders = ordersForChannel(merchantId, "store");
  const marketOrders = ordersForChannel(merchantId, "marketplace");
  const storeRevenue = storeOrders.reduce((s, o) => s + merchantSubtotal(o, merchantId), 0);
  const marketRevenue = marketOrders.reduce((s, o) => s + merchantSubtotal(o, merchantId), 0);

  return (
    <StudioShell
      title="Orders"
      subtitle={`${all.length} orders \u00b7 ${awaiting} awaiting fulfilment`}
      actions={
        <StudioButton onClick={() => toast.success("Packing slips queued for 14 orders")}>
          <Printer width={14} height={14} />
          Print slips
        </StudioButton>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Order value"
          value={money(revenue, { cents: false })}
          sub={`${all.length} orders all time`}
        />
        <StatTile
          label="From your store"
          value={money(storeRevenue, { cents: false })}
          sub={`${storeOrders.length} orders`}
        />
        <StatTile
          label="From the marketplace"
          value={money(marketRevenue, { cents: false })}
          sub={`${marketOrders.length} orders \u00b7 ${merchant.commissionPct}% commission`}
        />
        <StatTile label="Awaiting action" value={num(awaiting)} sub="Unfulfilled or processing" />
      </div>

      <Panel className="mt-3" flush>
        <div className="flex flex-wrap items-center gap-2 border-b border-hairline p-4">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-chalk-dim" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search order number, customer or product"
              aria-label="Search orders"
              className={cn(inputClass, "pl-9")}
            />
          </div>
          <SegmentedControl
            value={channel}
            onChange={setChannel}
            options={[
              { value: "all", label: "All channels" },
              { value: "store", label: "Store" },
              { value: "marketplace", label: "Marketplace" },
            ]}
          />
          <select
            value={fulfillment}
            onChange={(e) => setFulfillment(e.target.value as "all" | FulfillmentStatus)}
            className={cn(selectClass, "w-[162px]")}
            aria-label="Fulfilment filter"
          >
            {["all", "unfulfilled", "processing", "shipped", "delivered", "cancelled"].map((v) => (
              <option key={v} value={v}>
                {v === "all" ? "Any fulfilment" : v}
              </option>
            ))}
          </select>
          <select
            value={payment}
            onChange={(e) => setPayment(e.target.value as "all" | PaymentStatus)}
            className={cn(selectClass, "w-[150px]")}
            aria-label="Payment filter"
          >
            {["all", "paid", "pending", "refunded", "failed"].map((v) => (
              <option key={v} value={v}>
                {v === "all" ? "Any payment" : v}
              </option>
            ))}
          </select>
          <StudioButton onClick={() => toast.success("Exported as CSV (simulated)")}>
            <Download width={14} height={14} />
            Export
          </StudioButton>
        </div>

        <div className="p-4">
          <TableWrap>
            <thead>
              <tr>
                <Th>Order</Th>
                <Th>Date</Th>
                <Th>Customer</Th>
                <Th>Items</Th>
                <Th>Channel</Th>
                <Th>Payment</Th>
                <Th>Fulfilment</Th>
                <Th align="right">Total</Th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 60).map((order) => (
                <tr
                  key={order.id}
                  className="cursor-pointer transition-colors hover:bg-panel-2/40"
                  onClick={() => setOpenId(order.id)}
                >
                  <Td className="font-mono text-[12px]">{order.number}</Td>
                  <Td className="font-mono text-[11.5px] text-chalk-dim">
                    {dateShort(order.placedAt)}
                  </Td>
                  <Td className="max-w-[150px] truncate text-[12.5px] text-chalk-dim">
                    {customerById(order.customerId)?.name ?? "Customer"}
                  </Td>
                  <Td className="text-[12.5px] text-chalk-dim">
                    {order.items.reduce((s, i) => s + i.qty, 0)}
                  </Td>
                  <Td>
                    <Pill tone={order.channel === "marketplace" ? "ember" : "lime"}>
                      {order.channel === "marketplace" ? "Marketplace" : "Store"}
                    </Pill>
                  </Td>
                  <Td>
                    <Pill
                      tone={
                        order.payment === "paid"
                          ? "success"
                          : order.payment === "pending"
                            ? "warn"
                            : "danger"
                      }
                    >
                      {order.payment}
                    </Pill>
                  </Td>
                  <Td>
                    <Pill
                      tone={
                        order.fulfillment === "delivered"
                          ? "success"
                          : order.fulfillment === "cancelled" ||
                              order.fulfillment === "unfulfilled"
                            ? "danger"
                            : "neutral"
                      }
                    >
                      {order.fulfillment}
                    </Pill>
                  </Td>
                  <Td align="right" className="font-mono text-[12.5px] tabular-nums">
                    {money(order.total)}
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
          {!rows.length ? (
            <div className="flex flex-col items-center gap-3 py-14 text-center">
              <ReceiptText width={26} height={26} className="text-chalk-dim" />
              <p className="text-[13.5px] text-chalk">No orders match those filters.</p>
            </div>
          ) : (
            <p className="mt-3 font-mono text-[10.5px] uppercase tracking-[0.14em] text-chalk-dim">
              Showing {Math.min(60, rows.length)} of {rows.length} matching orders
            </p>
          )}
        </div>
      </Panel>

      <SidePanel
        open={Boolean(openOrder)}
        onClose={() => setOpenId(null)}
        title={openOrder ? `Order ${openOrder.number}` : ""}
        subtitle={
          openOrder
            ? `${openOrder.channel === "marketplace" ? "Ferixas Marketplace" : "Merchant store"} \u00b7 ${dateLong(
                openOrder.placedAt,
              )}`
            : undefined
        }
        footer={
          openOrder ? (
            <div className="flex flex-wrap gap-2">
              <StudioButton
                variant="primary"
                onClick={() => {
                  setEdits((prev) => ({
                    ...prev,
                    [openOrder.id]: {
                      fulfillment: "shipped",
                      carrier: "Ferixas Logistics",
                      tracking: `FX${Math.floor(Math.random() * 899999999 + 100000000)}`,
                    },
                  }));
                  toast.success(`${openOrder.number} marked as shipped`);
                }}
              >
                <Truck width={14} height={14} /> Mark shipped
              </StudioButton>
              <StudioButton
                onClick={() => {
                  setEdits((prev) => ({ ...prev, [openOrder.id]: { fulfillment: "delivered" } }));
                  toast.success(`${openOrder.number} marked as delivered`);
                }}
              >
                <PackageCheck width={14} height={14} /> Mark delivered
              </StudioButton>
              <StudioButton
                variant="danger"
                onClick={() => {
                  setEdits((prev) => ({
                    ...prev,
                    [openOrder.id]: { payment: "refunded", fulfillment: "cancelled" },
                  }));
                  toast.success(`${openOrder.number} refunded`);
                }}
              >
                <RotateCcw width={14} height={14} /> Refund
              </StudioButton>
            </div>
          ) : null
        }
      >
        {openOrder ? (
          <div className="grid gap-5">
            <div className="flex flex-wrap gap-2">
              <Pill tone={openOrder.channel === "marketplace" ? "ember" : "lime"}>
                {openOrder.channel === "marketplace"
                  ? "Came from the marketplace"
                  : "Came from your store"}
              </Pill>
              <Pill tone={openOrder.payment === "paid" ? "success" : "warn"}>
                {openOrder.payment}
              </Pill>
              <Pill tone={openOrder.fulfillment === "delivered" ? "success" : "neutral"}>
                {openOrder.fulfillment}
              </Pill>
            </div>

            <div>
              <p className="mb-2.5 font-mono text-[10px] uppercase tracking-[0.14em] text-chalk-dim">
                Items ({openOrder.items.length})
              </p>
              <ul className="space-y-3">
                {openOrder.items.map((item, i) => {
                  const product = products.find((p) => p.id === item.productId);
                  return (
                    <li key={`${item.productId}-${i}`} className="flex items-center gap-3">
                      {product ? (
                        <ProductThumb product={product} className="h-10 w-10 shrink-0 rounded-[2px]" />
                      ) : null}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[12.5px] text-chalk">{item.title}</p>
                        <p className="font-mono text-[10.5px] text-chalk-dim">
                          {item.variant ? `${item.variant} \u00b7 ` : ""}
                          {item.qty} \u00d7 {money(item.price)}
                        </p>
                      </div>
                      <span className="font-mono text-[12px] tabular-nums text-chalk">
                        {money(item.price * item.qty)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="rounded-[2px] border border-hairline p-4">
              <KeyValue
                rows={[
                  ["Subtotal", money(openOrder.subtotal)],
                  ["Shipping", openOrder.shipping ? money(openOrder.shipping) : "Free"],
                  ["Tax", money(openOrder.tax)],
                  [
                    "Commission",
                    openOrder.channel === "marketplace"
                      ? `\u2212${money(openOrder.commission)}`
                      : "Not charged on store orders",
                  ],
                  [
                    "Your payout",
                    money(merchantSubtotal(openOrder, merchantId) - openOrder.commission),
                  ],
                ]}
              />
              <div className="mt-3 flex items-center justify-between border-t border-hairline pt-3">
                <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-chalk-dim">
                  Order total
                </span>
                <span className="font-mono text-[16px] font-semibold tabular-nums text-lime">
                  {money(openOrder.total)}
                </span>
              </div>
            </div>

            <div>
              <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.14em] text-chalk-dim">
                Fulfilment
              </p>
              <Timeline
                steps={[
                  { label: "Order placed", done: true },
                  {
                    label: "Payment confirmed",
                    detail: openOrder.payment === "paid" ? "Captured" : openOrder.payment,
                    done: openOrder.payment === "paid",
                  },
                  {
                    label: "Processing",
                    done:
                      openOrder.fulfillment !== "unfulfilled" &&
                      openOrder.fulfillment !== "cancelled",
                  },
                  {
                    label: "Shipped",
                    detail: openOrder.carrier ?? undefined,
                    done:
                      openOrder.fulfillment === "shipped" || openOrder.fulfillment === "delivered",
                  },
                  { label: "Delivered", done: openOrder.fulfillment === "delivered" },
                ]}
              />
              <div className="mt-4">
                <KeyValue
                  rows={[
                    ["Carrier", openOrder.carrier ?? "Not assigned"],
                    ["Tracking", openOrder.tracking ?? "\u2014"],
                    ["Customer note", openOrder.note ?? "None"],
                  ]}
                />
              </div>
            </div>

            <div>
              <p className="mb-2.5 font-mono text-[10px] uppercase tracking-[0.14em] text-chalk-dim">
                Shipping address
              </p>
              <p className="text-[12.5px] leading-relaxed text-chalk">
                {openOrder.address.name}
                <br />
                {openOrder.address.line1}
                <br />
                {openOrder.address.city}, {openOrder.address.region} {openOrder.address.postcode}
                <br />
                {openOrder.address.country}
              </p>
            </div>

            <div>
              <p className="mb-2.5 font-mono text-[10px] uppercase tracking-[0.14em] text-chalk-dim">
                Store
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <Link href="/merchant/store" className="font-mono text-[11.5px] text-lime">
                  {getMerchant(merchantId).name}
                </Link>
                {openOrder.merchantIds.length > 1 ? (
                  <Pill tone="info">{openOrder.merchantIds.length} merchants in this cart</Pill>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
      </SidePanel>

      <p className="mt-4 flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.14em] text-chalk-dim">
        <Filter width={12} height={12} />
        {CARRIERS.length} carriers available \u00b7 simulated fulfilment in the prototype
      </p>
    </StudioShell>
  );
}

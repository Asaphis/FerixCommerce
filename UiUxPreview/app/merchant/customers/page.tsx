"use client";

import { useMemo, useState } from "react";
import { Mail, MapPin, Phone, Search, Users } from "lucide-react";
import { toast } from "sonner";
import { CUSTOMERS, customerById, merchantSubtotal, ordersOf } from "@/lib/data";
import { dateLong, dateShort, initials, money, num } from "@/lib/format";
import { useFerixas } from "@/lib/store";
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
} from "@/components/studio/bits";
import { KeyValue, SidePanel } from "@/components/studio/side-panel";
import { cn } from "@/lib/utils";

export default function CustomersPage() {
  const { merchantId } = useFerixas();
  const [query, setQuery] = useState("");
  const [segment, setSegment] = useState<"all" | "new" | "returning" | "vip">("all");
  const [openId, setOpenId] = useState<string | null>(null);

  const scoped = useMemo(() => {
    const orders = ordersOf(merchantId);
    const ids = new Set(orders.map((o) => o.customerId));
    return CUSTOMERS.filter((c) => ids.has(c.id)).map((c) => {
      const mine = orders.filter((o) => o.customerId === c.id);
      return {
        ...c,
        orderCount: mine.length,
        spent: mine.reduce((s, o) => s + merchantSubtotal(o, merchantId), 0),
        lastOrderAt: mine[0]?.placedAt ?? c.lastOrderAt,
      };
    });
  }, [merchantId]);

  const rows = useMemo(
    () =>
      [...scoped]
        .filter((c) => {
          if (segment !== "all" && c.segment !== segment) return false;
          if (!query.trim()) return true;
          const hay = `${c.name} ${c.email} ${c.location}`.toLowerCase();
          return query.trim().toLowerCase().split(/\s+/).every((t) => hay.includes(t));
        })
        .sort((a, b) => b.spent - a.spent),
    [scoped, segment, query],
  );

  const open = openId ? scoped.find((c) => c.id === openId) : undefined;
  const openOrders = open ? ordersOf(merchantId).filter((o) => o.customerId === open.id) : [];
  const totalSpent = scoped.reduce((s, c) => s + c.spent, 0);
  const repeatRate = scoped.length
    ? (scoped.filter((c) => c.orderCount > 1).length / scoped.length) * 100
    : 0;

  return (
    <StudioShell
      title="Customers"
      subtitle={`${scoped.length} customers have bought from this store`}
      actions={
        <StudioButton onClick={() => toast.success("Customer list exported (simulated)")}>
          <Users width={14} height={14} /> Export list
        </StudioButton>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Customers" value={num(scoped.length)} sub="Anyone with a paid order" />
        <StatTile
          label="Lifetime value"
          value={money(totalSpent / Math.max(1, scoped.length), { cents: false })}
          sub="Average per customer"
        />
        <StatTile label="Repeat rate" value={`${repeatRate.toFixed(1)}%`} sub="Bought more than once" />
        <StatTile
          label="Top market"
          value={scoped.length ? topMarket(scoped.map((c) => c.location)) : "\u2014"}
          sub="By customer count"
        />
      </div>

      <Panel className="mt-3" flush>
        <div className="flex flex-wrap items-center gap-2 border-b border-hairline p-4">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-chalk-dim" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, email or city"
              aria-label="Search customers"
              className={cn(inputClass, "pl-9")}
            />
          </div>
          <SegmentedControl
            value={segment}
            onChange={setSegment}
            options={[
              { value: "all", label: "All" },
              { value: "vip", label: "VIP" },
              { value: "returning", label: "Returning" },
              { value: "new", label: "New" },
            ]}
          />
        </div>
        <div className="p-4">
          <TableWrap>
            <thead>
              <tr>
                <Th>Customer</Th>
                <Th>Location</Th>
                <Th align="right">Orders</Th>
                <Th align="right">Spent</Th>
                <Th>Segment</Th>
                <Th>Last order</Th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 40).map((customer) => (
                <tr
                  key={customer.id}
                  className="cursor-pointer transition-colors hover:bg-panel-2/40"
                  onClick={() => setOpenId(customer.id)}
                >
                  <Td>
                    <div className="flex items-center gap-3">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-panel-2 font-mono text-[11px] text-chalk">
                        {initials(customer.name)}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-[13px] text-chalk">{customer.name}</p>
                        <p className="truncate font-mono text-[10.5px] text-chalk-dim">
                          {customer.email}
                        </p>
                      </div>
                    </div>
                  </Td>
                  <Td className="text-[12.5px] text-chalk-dim">{customer.location}</Td>
                  <Td align="right" className="font-mono text-[12.5px] tabular-nums">
                    {customer.orderCount}
                  </Td>
                  <Td align="right" className="font-mono text-[12.5px] tabular-nums">
                    {money(customer.spent, { cents: false })}
                  </Td>
                  <Td>
                    <Pill
                      tone={
                        customer.segment === "vip"
                          ? "lime"
                          : customer.segment === "returning"
                            ? "info"
                            : "neutral"
                      }
                    >
                      {customer.segment}
                    </Pill>
                  </Td>
                  <Td className="font-mono text-[11.5px] text-chalk-dim">
                    {dateShort(customer.lastOrderAt)}
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
          {!rows.length ? (
            <p className="py-14 text-center text-[13.5px] text-chalk">
              No customers match that search.
            </p>
          ) : null}
        </div>
      </Panel>

      <SidePanel
        open={Boolean(open)}
        onClose={() => setOpenId(null)}
        title={open?.name ?? ""}
        subtitle={open ? `${open.segment} \u00b7 customer since ${dateLong(open.since)}` : undefined}
        footer={
          open ? (
            <div className="flex flex-wrap gap-2">
              <StudioButton
                variant="primary"
                onClick={() => toast.success(`Message queued to ${open.name}`)}
              >
                <Mail width={14} height={14} /> Send a message
              </StudioButton>
              <StudioButton onClick={() => toast.success("Segment updated")}>
                Add to VIP segment
              </StudioButton>
            </div>
          ) : null
        }
      >
        {open ? (
          <div className="grid gap-5">
            <div className="grid gap-2.5">
              <p className="flex items-center gap-2 text-[12.5px] text-chalk-dim">
                <Mail width={13} height={13} /> {open.email}
              </p>
              <p className="flex items-center gap-2 text-[12.5px] text-chalk-dim">
                <Phone width={13} height={13} /> {open.phone}
              </p>
              <p className="flex items-center gap-2 text-[12.5px] text-chalk-dim">
                <MapPin width={13} height={13} /> {open.location}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[
                ["Orders", num(open.orderCount)],
                ["Spent here", money(open.spent, { cents: false })],
                ["Average order", money(open.spent / Math.max(1, open.orderCount), { cents: false })],
              ].map(([label, value]) => (
                <div key={label} className="rounded-[2px] border border-hairline p-3">
                  <p className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-chalk-dim">
                    {label}
                  </p>
                  <p className="mt-1.5 font-mono text-[15px] tabular-nums text-chalk">{value}</p>
                </div>
              ))}
            </div>

            <div>
              <p className="mb-2.5 font-mono text-[10px] uppercase tracking-[0.14em] text-chalk-dim">
                Order history here ({openOrders.length})
              </p>
              <ul className="space-y-2.5">
                {openOrders.slice(0, 6).map((order) => (
                  <li
                    key={order.id}
                    className="flex items-center justify-between gap-3 rounded-[2px] border border-hairline px-3 py-2.5"
                  >
                    <div>
                      <p className="font-mono text-[11.5px] text-chalk">{order.number}</p>
                      <p className="font-mono text-[10px] text-chalk-dim">
                        {dateShort(order.placedAt)} \u00b7{" "}
                        {order.channel === "marketplace" ? "marketplace" : "your store"}
                      </p>
                    </div>
                    <span className="font-mono text-[12px] tabular-nums text-chalk">
                      {money(merchantSubtotal(order, merchantId))}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-[2px] border border-hairline p-4">
              <KeyValue
                rows={[
                  ["Customer ID", <span key="id" className="font-mono">{open.id}</span>],
                  ["First seen", dateLong(open.since)],
                  ["Last order", dateLong(open.lastOrderAt)],
                  ["Segment", open.segment],
                  ["Customer since", open.since.slice(0, 4)],
                ]}
              />
            </div>
          </div>
        ) : null}
      </SidePanel>
    </StudioShell>
  );
}

function topMarket(locations: string[]) {
  const counts = new Map<string, number>();
  locations.forEach((loc) => {
    const country = loc.split(",")[1]?.trim() ?? loc;
    counts.set(country, (counts.get(country) ?? 0) + 1);
  });
  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "\u2014";
}

void customerById;

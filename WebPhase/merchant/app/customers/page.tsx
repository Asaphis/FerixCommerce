import Link from "next/link";
import { Search } from "lucide-react";
import { requireMerchant } from "@/lib/data";
import { listCustomers } from "@/lib/api";
import { FilterForm } from "@/components/studio/controls";
import { Empty, Eyebrow, Panel, PanelHead, Pill, StatTile } from "@/components/studio/bits";
import { money, num, relative } from "@/lib/format";
import { cn } from "@/lib/utils";

const SEGMENTS = [
  { id: "all", label: "Everyone" },
  { id: "vip", label: "VIP" },
  { id: "returning", label: "Returning" },
  { id: "new", label: "First order" },
];

function segmentTone(segment?: string) {
  if (segment === "vip") return "lime" as const;
  if (segment === "returning") return "info" as const;
  return "neutral" as const;
}

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; segment?: string }>;
}) {
  const { search, segment } = await searchParams;
  const { session } = await requireMerchant();
  const data = await listCustomers(session, { search, segment: segment ?? "all" });

  return (
    <div className="grid gap-5">
      <header>
        <Eyebrow>Customers</Eyebrow>
        <h1 className="mt-1.5 font-display text-[23px] font-semibold text-chalk">Who buys from you</h1>
        <p className="mt-1.5 max-w-[72ch] text-[13px] leading-relaxed text-chalk-dim">
          Everyone who has ordered from your store or your marketplace listings, with what they have spent
          and how recently they came back.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Buyers" value={num(data.segments.all ?? 0)} sub="Distinct customers" />
        <StatTile label="VIP" value={num(data.segments.vip ?? 0)} sub="Spent $600 or more" accent="lime" />
        <StatTile label="Returning" value={num(data.segments.returning ?? 0)} sub="Ordered more than once" accent="azure" />
        <StatTile label="Lifetime value" value={money(data.lifetime, { cents: false })} sub="Across every customer" accent="sand" />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {SEGMENTS.map((option) => (
            <Link
              key={option.id}
              href={option.id === "all" ? "/customers" : `/customers?segment=${option.id}`}
              className={cn(
                "rounded-[2px] border px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] transition-colors",
                (segment ?? "all") === option.id
                  ? "border-lime/40 bg-lime/10 text-lime"
                  : "border-hairline text-chalk-dim hover:border-chalk-dim hover:text-chalk",
              )}
            >
              {option.label}
              <span className="ml-2 opacity-70">{data.segments[option.id] ?? 0}</span>
            </Link>
          ))}
        </div>
        <FilterForm action="/customers" className="flex items-center gap-2">
          <label className="relative flex items-center">
            <Search width={14} height={14} className="pointer-events-none absolute left-2.5 text-chalk-dim" />
            <input
              name="search"
              defaultValue={search ?? ""}
              placeholder="Name or email"
              className="h-9 w-[220px] rounded-[2px] border border-hairline bg-panel-2 pl-8 pr-3 text-[12.5px] text-chalk outline-none placeholder:text-chalk-dim/60 focus:border-chalk-dim"
            />
          </label>
        </FilterForm>
      </div>

      {data.customers.length ? (
        <Panel flush>
          <div className="overflow-x-auto p-5">
            <table className="w-full min-w-0 border-collapse text-left md:min-w-[820px]">
              <thead>
                <tr className="hidden md:table-row">
                  {["Customer", "Location", "Orders", "Spent", "Average", "Last order", "Segment", ""].map((head) => (
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
                {data.customers.map((customer) => (
                  <tr
                    key={customer.id}
                    className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-hairline/60 py-3 last:border-0 md:table-row md:py-0"
                  >
                    <td className="w-full min-w-0 py-0 md:w-auto md:py-3 md:pr-4">
                      <p className="truncate text-[13px] font-medium text-chalk">{customer.name}</p>
                      <p className="truncate font-mono text-[10.5px] text-chalk-dim">{customer.email}</p>
                    </td>
                    <td className="hidden py-3 pr-4 text-[12.5px] text-chalk-dim md:table-cell">{customer.location}</td>
                    <td className="py-0 font-mono text-[12.5px] tabular-nums text-chalk md:py-3 md:pr-4">
                      {customer.orders} orders
                    </td>
                    <td className="py-0 font-mono text-[12.5px] tabular-nums text-chalk md:py-3 md:pr-4">
                      {money(customer.spent ?? 0, { cents: false })}
                    </td>
                    <td className="hidden py-3 pr-4 font-mono text-[12.5px] tabular-nums text-chalk-dim md:table-cell">
                      {money(customer.averageOrder ?? 0, { cents: false })}
                    </td>
                    <td className="hidden py-3 pr-4 font-mono text-[11.5px] text-chalk-dim md:table-cell">
                      {customer.lastOrderAt ? relative(customer.lastOrderAt) : "—"}
                    </td>
                    <td className="py-0 md:py-3 md:pr-4">
                      <Pill tone={segmentTone(customer.segment)}>{customer.segment}</Pill>
                    </td>
                    <td className="ml-auto py-0 text-right md:py-3">
                      <Link
                        href={`/customers/${customer.id}`}
                        className="inline-flex min-h-[44px] items-center font-mono text-[10px] uppercase tracking-[0.14em] text-lime hover:underline"
                      >
                        Open
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      ) : (
        <Empty title="No customers match" body="Clear the search and the segment filter to see everyone." />
      )}

      <Panel>
        <PanelHead title="Where customers come from" />
        <p className="text-[12.5px] leading-relaxed text-chalk-dim">
          Customer records are derived from orders, so this list is always in step with your order queue.
        </p>
      </Panel>
    </div>
  );
}

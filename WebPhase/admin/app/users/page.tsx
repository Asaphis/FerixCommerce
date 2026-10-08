import Link from "next/link";
import { Search, Users } from "lucide-react";
import { requireAdmin } from "@/lib/data";
import { listUsers } from "@/lib/api";
import { FilterForm } from "@/components/ops/controls";
import { Empty, Meter, Panel, PanelHead, Pill, Readout } from "@/components/ops/bits";
import { CellLabel, DataTable, PageHeader, Row, Td, TdDetail, TdLead, TablePanel } from "@/components/ops/table";
import { money, num, relative } from "@/lib/format";
import { cn } from "@/lib/utils";

const SEGMENTS = [
  { id: "all", label: "Every account" },
  { id: "vip", label: "VIP" },
  { id: "returning", label: "Returning" },
  { id: "new", label: "First order" },
];

function segmentTone(segment: string) {
  if (segment === "vip") return "violet" as const;
  if (segment === "returning") return "signal" as const;
  return "neutral" as const;
}

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; segment?: string }>;
}) {
  const { search, segment } = await searchParams;
  const { session } = await requireAdmin();
  const data = await listUsers(session, { search, segment: segment ?? "all" });
  const maxSpend = Math.max(...data.users.map((u) => u.spent), 1);
  const withOrders = data.users.filter((u) => u.orders > 0).length;

  return (
    <div className="grid min-w-0 gap-5">
      <PageHeader
        eyebrow="User oversight"
        title="Customer accounts"
        description="Every shopper registered on the platform, with their spending, saved items and order history. Accounts are shared across the marketplace and every merchant storefront."
      />

      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 xl:grid-cols-4">
        <Readout label="Accounts" value={num(data.counts.all ?? 0)} sub={`${withOrders} have placed an order`} icon={<Users width={15} height={15} />} />
        <Readout label="Orders placed" value={num(data.orders)} sub="Across every account" tone="signal" />
        <Readout label="Lifetime spend" value={money(data.lifetime, { cents: false })} sub={`Average ${money(data.lifetime / Math.max(1, data.counts.all ?? 1), { cents: false })} per account`} tone="mint" />
        <Readout
          label="Paying customers"
          value={`${Math.round((withOrders / Math.max(1, data.counts.all ?? 1)) * 100)}%`}
          sub={`${data.counts.vip ?? 0} VIP \u00b7 ${data.counts.returning ?? 0} returning`}
          tone="violet"
        />
      </div>

      <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {SEGMENTS.map((option) => (
            <Link
              key={option.id}
              href={option.id === "all" ? "/users" : `/users?segment=${option.id}`}
              className={cn(
                "inline-flex min-h-[44px] items-center rounded-[2px] border px-3 font-mono text-[10px] uppercase tracking-[0.14em] transition-colors",
                (segment ?? "all") === option.id
                  ? "border-signal/40 bg-signal/10 text-signal"
                  : "border-hairline text-chalk-dim hover:border-chalk-dim hover:text-chalk",
              )}
            >
              {option.label}
              <span className="ml-2 opacity-70">{data.counts[option.id] ?? 0}</span>
            </Link>
          ))}
        </div>
        <FilterForm action="/users" className="flex min-w-0 flex-wrap items-center gap-2">
          <label className="relative flex min-w-0 flex-1 items-center sm:flex-none">
            <Search width={14} height={14} className="pointer-events-none absolute left-2.5 text-chalk-dim" />
            <input
              name="search"
              defaultValue={search ?? ""}
              placeholder="Name or email"
              className="h-11 w-full min-w-0 rounded-[2px] border border-hairline bg-panel-2 pl-8 pr-3 text-[12.5px] text-chalk outline-none placeholder:text-chalk-dim/60 focus:border-signal/60 sm:w-[220px]"
            />
          </label>
        </FilterForm>
      </div>

      {data.users.length ? (
        <TablePanel>
          <DataTable
            head={["Account", "Location", "Joined", "Orders", "Spend", "Average", "Last order", "Segment", "Share"]}
            minWidthClass="md:min-w-[1040px]"
          >
            {data.users.map((user) => (
              <Row key={user.id}>
                <TdLead>
                  <div className="flex items-center gap-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[2px] border border-hairline bg-panel-2 font-display text-[13px] font-bold text-signal">
                      {user.initials}
                    </span>
                    <div className="min-w-0">
                      <Link
                        href={`/users/${user.id}`}
                        className="block truncate text-[13px] font-medium text-chalk hover:text-signal md:max-w-[200px]"
                      >
                        {user.name}
                      </Link>
                      <p className="truncate font-mono text-[10.5px] text-chalk-dim md:max-w-[200px]">{user.email}</p>
                    </div>
                  </div>
                </TdLead>
                <Td className="text-[12.5px] text-chalk-dim">
                  <CellLabel>Location</CellLabel>
                  {user.location}
                </Td>
                <TdDetail className="font-mono text-[11.5px] text-chalk-dim">
                  {new Date(user.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                </TdDetail>
                <Td className="font-mono text-[12.5px] tabular-nums text-chalk">
                  <CellLabel>Orders</CellLabel>
                  {user.orders}
                </Td>
                <Td className="font-mono text-[12.5px] tabular-nums text-chalk">
                  <CellLabel>Spend</CellLabel>
                  {money(user.spent, { cents: false })}
                </Td>
                <Td className="font-mono text-[12.5px] tabular-nums text-chalk-dim">
                  <CellLabel>Average</CellLabel>
                  {money(user.averageOrder, { cents: false })}
                </Td>
                <Td className="font-mono text-[11.5px] text-chalk-dim">
                  <CellLabel>Last order</CellLabel>
                  {user.lastOrderAt ? relative(user.lastOrderAt) : "\u2014"}
                </Td>
                <Td>
                  <Pill tone={segmentTone(user.segment)}>{user.segment}</Pill>
                </Td>
                <Td className="w-full md:w-[130px]">
                  <Meter value={user.spent} max={maxSpend} tone="violet" />
                  <p className="mt-1 font-mono text-[10px] text-chalk-dim">
                    {user.saved} saved · {user.reviews} reviews
                  </p>
                </Td>
              </Row>
            ))}
          </DataTable>
        </TablePanel>
      ) : (
        <Empty title="No accounts match" body="Clear the search and segment filter to see every registered shopper." />
      )}

      <Panel>
        <PanelHead title="What the platform can and cannot see" />
        <p className="text-[12.5px] leading-relaxed text-chalk-dim">
          This view reads the accounts, orders, addresses and reviews that shoppers created on the backend.
          Passwords are stored only as salted hashes and are never exposed here, and there is no way to sign in
          as a customer from the console.
        </p>
      </Panel>
    </div>
  );
}

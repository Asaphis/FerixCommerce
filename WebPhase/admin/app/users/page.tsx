import Link from "next/link";
import { Search, Users } from "lucide-react";
import { requireAdmin } from "@/lib/data";
import { listUsers } from "@/lib/api";
import { FilterForm } from "@/components/ops/controls";
import { Empty, Eyebrow, Meter, Panel, PanelHead, Pill, Readout } from "@/components/ops/bits";
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
    <div className="grid gap-5">
      <header>
        <Eyebrow>User oversight</Eyebrow>
        <h1 className="mt-1.5 font-display text-[23px] font-semibold text-chalk">Customer accounts</h1>
        <p className="mt-1.5 max-w-[74ch] text-[13px] leading-relaxed text-chalk-dim">
          Every shopper who has registered on the platform, with their spending, saved items and order
          history. Accounts are shared across the marketplace and every merchant storefront.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Readout label="Accounts" value={num(data.counts.all ?? 0)} sub={`${withOrders} have placed an order`} icon={<Users width={15} height={15} />} />
        <Readout label="Orders placed" value={num(data.orders)} sub="Across every account" tone="signal" />
        <Readout label="Lifetime spend" value={money(data.lifetime, { cents: false })} sub={`Average ${money(data.lifetime / Math.max(1, data.counts.all ?? 1), { cents: false })} per account`} tone="mint" />
        <Readout
          label="Paying customers"
          value={`${Math.round((withOrders / Math.max(1, data.counts.all ?? 1)) * 100)}%`}
          sub={`${data.counts.vip ?? 0} VIP · ${data.counts.returning ?? 0} returning`}
          tone="violet"
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {SEGMENTS.map((option) => (
            <Link
              key={option.id}
              href={option.id === "all" ? "/users" : `/users?segment=${option.id}`}
              className={cn(
                "rounded-[2px] border px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] transition-colors",
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
        <FilterForm action="/users" className="flex items-center gap-2">
          <label className="relative flex items-center">
            <Search width={14} height={14} className="pointer-events-none absolute left-2.5 text-chalk-dim" />
            <input
              name="search"
              defaultValue={search ?? ""}
              placeholder="Name or email"
              className="h-9 w-[220px] rounded-[2px] border border-hairline bg-panel-2 pl-8 pr-3 text-[12.5px] text-chalk outline-none placeholder:text-chalk-dim/60 focus:border-signal/60"
            />
          </label>
        </FilterForm>
      </div>

      {data.users.length ? (
        <Panel flush>
          <div className="overflow-x-auto p-5">
            <table className="w-full min-w-[1000px] border-collapse text-left">
              <thead>
                <tr>
                  {["Account", "Location", "Joined", "Orders", "Spend", "Average", "Last order", "Segment", "Share"].map((head) => (
                    <th key={head} className="border-b border-hairline pb-2.5 font-mono text-[10px] font-normal uppercase tracking-[0.14em] text-chalk-dim">
                      {head}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.users.map((user) => (
                  <tr key={user.id} className="border-b border-hairline/60 last:border-0">
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-3">
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[2px] border border-hairline bg-panel-2 font-display text-[13px] font-bold text-signal">
                          {user.initials}
                        </span>
                        <div className="min-w-0">
                          <Link href={`/users/${user.id}`} className="block max-w-[200px] truncate text-[13px] font-medium text-chalk hover:text-signal">
                            {user.name}
                          </Link>
                          <p className="max-w-[200px] truncate font-mono text-[10.5px] text-chalk-dim">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-[12.5px] text-chalk-dim">{user.location}</td>
                    <td className="py-3 pr-4 font-mono text-[11.5px] text-chalk-dim">
                      {new Date(user.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                    <td className="py-3 pr-4 font-mono text-[12.5px] tabular-nums text-chalk">{user.orders}</td>
                    <td className="py-3 pr-4 font-mono text-[12.5px] tabular-nums text-chalk">
                      {money(user.spent, { cents: false })}
                    </td>
                    <td className="py-3 pr-4 font-mono text-[12.5px] tabular-nums text-chalk-dim">
                      {money(user.averageOrder, { cents: false })}
                    </td>
                    <td className="py-3 pr-4 font-mono text-[11.5px] text-chalk-dim">
                      {user.lastOrderAt ? relative(user.lastOrderAt) : "—"}
                    </td>
                    <td className="py-3 pr-4">
                      <Pill tone={segmentTone(user.segment)}>{user.segment}</Pill>
                    </td>
                    <td className="w-[130px] py-3">
                      <Meter value={user.spent} max={maxSpend} tone="violet" />
                      <p className="mt-1 font-mono text-[10px] text-chalk-dim">
                        {user.saved} saved · {user.reviews} reviews
                      </p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      ) : (
        <Empty title="No accounts match" body="Clear the search and segment filter to see every registered shopper." />
      )}

      <Panel>
        <PanelHead title="What the platform can and cannot see" hint="Operator access, not a back door" />
        <p className="text-[12.5px] leading-relaxed text-chalk-dim">
          This view reads the accounts, orders, addresses and reviews that shoppers created on the backend.
          Passwords are stored only as salted hashes and are never exposed here, and there is no way to sign in
          as a customer from the console.
        </p>
      </Panel>
    </div>
  );
}

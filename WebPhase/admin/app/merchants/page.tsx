import Link from "next/link";
import { Search, Store } from "lucide-react";
import { requireAdmin } from "@/lib/data";
import { listMerchants } from "@/lib/api";
import { FilterForm } from "@/components/ops/controls";
import { Empty, Eyebrow, Meter, Panel, PanelHead, Pill, Readout } from "@/components/ops/bits";
import { money, num, titleCase } from "@/lib/format";
import { cn } from "@/lib/utils";

const FILTERS = [
  { id: "all", label: "Every merchant" },
  { id: "active", label: "Active" },
  { id: "review", label: "In review" },
  { id: "suspended", label: "Suspended" },
];

function statusTone(status: string) {
  if (status === "active") return "mint" as const;
  if (status === "review") return "amber" as const;
  return "rose" as const;
}

export default async function MerchantsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; status?: string; plan?: string }>;
}) {
  const { search, status, plan } = await searchParams;
  const { session } = await requireAdmin();
  const data = await listMerchants(session, { search, status: status ?? "all", plan: plan ?? "all" });
  const maxGmv = Math.max(...data.merchants.map((m) => m.gmv), 1);
  const totalGmv = data.merchants.reduce((sum, m) => sum + m.gmv, 0);
  const totalCommission = data.merchants.reduce((sum, m) => sum + m.commission, 0);

  return (
    <div className="grid gap-5">
      <header>
        <Eyebrow>Store management</Eyebrow>
        <h1 className="mt-1.5 font-display text-[23px] font-semibold text-chalk">Merchants</h1>
        <p className="mt-1.5 max-w-[74ch] text-[13px] leading-relaxed text-chalk-dim">
          Every store on the platform. Suspending a merchant stops them selling at once; commission and plan
          changes apply from the next order. Marketplace access controls whether their catalogue appears to
          shoppers on ferixas.com.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Readout label="Merchants" value={num(data.counts.all ?? 0)} sub={`${data.counts.active ?? 0} active`} icon={<Store width={15} height={15} />} />
        <Readout label="Combined GMV" value={money(totalGmv, { cents: false })} sub="Paid orders only" tone="mint" />
        <Readout label="Platform commission" value={money(totalCommission, { cents: false })} sub="Retained on marketplace sales" tone="violet" />
        <Readout
          label="Not selling"
          value={num((data.counts.review ?? 0) + (data.counts.suspended ?? 0))}
          sub={`${data.counts.review ?? 0} in review · ${data.counts.suspended ?? 0} suspended`}
          tone={((data.counts.review ?? 0) + (data.counts.suspended ?? 0)) > 0 ? "amber" : "mint"}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((filter) => (
            <Link
              key={filter.id}
              href={filter.id === "all" ? "/merchants" : `/merchants?status=${filter.id}`}
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

        <FilterForm action="/merchants" className="flex flex-wrap items-center gap-2">
          <label className="relative flex items-center">
            <Search width={14} height={14} className="pointer-events-none absolute left-2.5 text-chalk-dim" />
            <input
              name="search"
              defaultValue={search ?? ""}
              placeholder="Store name or location"
              className="h-9 w-[220px] rounded-[2px] border border-hairline bg-panel-2 pl-8 pr-3 text-[12.5px] text-chalk outline-none placeholder:text-chalk-dim/60 focus:border-signal/60"
            />
          </label>
          <select
            name="plan"
            defaultValue={plan ?? "all"}
            className="h-9 rounded-[2px] border border-hairline bg-panel-2 px-2 text-[12.5px] text-chalk outline-none focus:border-signal/60"
            aria-label="Plan"
          >
            <option value="all">Every plan</option>
            {data.plans.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </FilterForm>
      </div>

      {data.merchants.length ? (
        <Panel flush>
          <div className="overflow-x-auto p-5">
            <table className="w-full min-w-[1040px] border-collapse text-left">
              <thead>
                <tr>
                  {["Merchant", "Standing", "Plan", "Commission", "Products", "Orders", "GMV", "Share"].map((head) => (
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
                {data.merchants.map((merchant) => (
                  <tr key={merchant.id} className="border-b border-hairline/60 last:border-0">
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-3">
                        <span
                          className="grid h-9 w-9 shrink-0 place-items-center rounded-[2px] font-display text-[14px] font-extrabold"
                          style={{ background: merchant.brand.accent, color: merchant.brand.accentInk }}
                        >
                          {merchant.name.slice(0, 1)}
                        </span>
                        <div className="min-w-0">
                          <Link href={`/merchants/${merchant.id}`} className="block max-w-[220px] truncate text-[13px] font-medium text-chalk hover:text-signal">
                            {merchant.name}
                          </Link>
                          <p className="font-mono text-[10px] text-chalk-dim">{merchant.location}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      <Pill tone={statusTone(merchant.status)}>{merchant.status}</Pill>
                    </td>
                    <td className="py-3 pr-4 font-mono text-[11.5px] text-chalk-dim">{merchant.plan}</td>
                    <td className="py-3 pr-4 font-mono text-[12.5px] tabular-nums text-violet">{merchant.commissionPct}%</td>
                    <td className="py-3 pr-4 font-mono text-[12.5px] tabular-nums text-chalk-dim">
                      {merchant.productCount}
                      <span className="ml-1 text-[10px] text-chalk-dim/70">({merchant.marketplaceListings} listed)</span>
                    </td>
                    <td className="py-3 pr-4 font-mono text-[12.5px] tabular-nums text-chalk-dim">{num(merchant.orders)}</td>
                    <td className="py-3 pr-4 font-mono text-[12.5px] tabular-nums text-chalk">
                      {money(merchant.gmv, { cents: false })}
                    </td>
                    <td className="w-[140px] py-3">
                      <Meter value={merchant.gmv} max={maxGmv} />
                      <p className="mt-1 font-mono text-[10px] text-chalk-dim">
                        {Math.round((merchant.gmv / Math.max(1, totalGmv)) * 100)}% of platform
                      </p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      ) : (
        <Empty title="No merchants match" body="Clear the search and filters to see every store on the platform." />
      )}

      <Panel>
        <PanelHead title="How standing affects selling" hint="What shoppers see when you change it" />
        <div className="grid gap-3 text-[12.5px] leading-relaxed text-chalk-dim sm:grid-cols-3">
          <div className="rounded-[2px] border border-hairline p-3.5">
            <Pill tone="mint">Active</Pill>
            <p className="mt-2.5">Sells in their own storefront and, if enabled, on the marketplace.</p>
          </div>
          <div className="rounded-[2px] border border-hairline p-3.5">
            <Pill tone="amber">In review</Pill>
            <p className="mt-2.5">Held back from the marketplace while {titleCase("their")} account is checked.</p>
          </div>
          <div className="rounded-[2px] border border-hairline p-3.5">
            <Pill tone="rose">Suspended</Pill>
            <p className="mt-2.5">Removed from the marketplace and flagged in the console.</p>
          </div>
        </div>
      </Panel>
    </div>
  );
}

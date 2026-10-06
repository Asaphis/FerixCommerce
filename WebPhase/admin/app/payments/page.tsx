import { CreditCard } from "lucide-react";
import { requireAdmin } from "@/lib/data";
import { getPayments } from "@/lib/api";
import { Empty, Eyebrow, Panel, PanelHead, Pill, Readout } from "@/components/ops/bits";
import { money, num } from "@/lib/format";

const STATUS_TONE: Record<string, "mint" | "amber" | "rose" | "neutral"> = {
  settled: "mint",
  authorized: "amber",
  refunded: "rose",
};

export default async function PaymentsPage() {
  const { session } = await requireAdmin();
  const data = await getPayments(session);
  const { totals } = data;

  return (
    <div className="grid gap-5">
      <header>
        <Eyebrow>Commerce</Eyebrow>
        <h1 className="mt-1.5 font-display text-[23px] font-semibold text-chalk">Payments</h1>
        <p className="mt-1.5 max-w-[74ch] text-[13px] leading-relaxed text-chalk-dim">
          Every transaction the platform has recorded, with the commission it earned. An authorised payment is
          captured at checkout; it settles when the order is delivered.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Readout label="Gross taken" value={money(totals.gross, { cents: false })} sub="All orders" icon={<CreditCard width={15} height={15} />} />
        <Readout label="Platform commission" value={money(totals.commission, { cents: false })} sub="Retained" tone="violet" />
        <Readout label="Merchant net" value={money(totals.merchantNet, { cents: false })} sub="Payable to sellers" tone="mint" />
        <Readout label="Refunded" value={money(totals.refunds, { cents: false })} sub={`Net ${money(totals.net, { cents: false })}`} tone={totals.refunds > 0 ? "rose" : "mint"} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Readout label="Authorised, not settled" value={money(totals.authorized, { cents: false })} sub="Orders in progress" tone="amber" />
        <Readout label="Settled" value={money(totals.settled, { cents: false })} sub="Delivered orders" tone="mint" />
      </div>

      <Panel className="border-amber/30 bg-amber/5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Pill tone="amber">Coming soon</Pill>
              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-chalk-dim">
                provider: {data.provider}
              </span>
            </div>
            <p className="mt-2 max-w-[80ch] text-[13px] leading-relaxed text-chalk">{data.message}</p>
          </div>
        </div>
      </Panel>

      {data.transactions.length === 0 ? (
        <Empty title="No transactions yet" body="Orders placed on the storefront appear here with their commission." />
      ) : (
        <Panel flush className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] border-collapse text-left">
              <thead>
                <tr className="border-b border-hairline">
                  {["Order", "Placed", "Merchant", "Customer", "Channel", "Method", "Amount", "Commission", "Status"].map((head) => (
                    <th key={head} className="px-4 py-3 font-mono text-[9.5px] uppercase tracking-[0.14em] text-chalk-dim">
                      {head}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.transactions.map((transaction) => (
                  <tr key={transaction.id} className="border-b border-hairline last:border-0 hover:bg-panel-2">
                    <td className="px-4 py-3 font-mono text-[12px] text-chalk">{transaction.number}</td>
                    <td className="px-4 py-3 font-mono text-[11.5px] text-chalk-dim">
                      {new Date(transaction.placedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                    </td>
                    <td className="px-4 py-3 text-[12.5px] text-chalk-dim">{transaction.merchantName}</td>
                    <td className="px-4 py-3 text-[12.5px] text-chalk-dim">{transaction.customer}</td>
                    <td className="px-4 py-3">
                      <Pill tone={transaction.channel === "store" ? "mint" : "signal"}>{transaction.channel}</Pill>
                    </td>
                    <td className="px-4 py-3 text-[12.5px] text-chalk-dim">{transaction.method}</td>
                    <td className="px-4 py-3 font-mono text-[12.5px] tabular-nums text-chalk">{money(transaction.amount)}</td>
                    <td className="px-4 py-3 font-mono text-[12.5px] tabular-nums text-violet">
                      {money(transaction.commission)}
                    </td>
                    <td className="px-4 py-3">
                      <Pill tone={STATUS_TONE[transaction.status] ?? "neutral"}>{transaction.status}</Pill>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-chalk-dim">
        {num(data.transactions.length)} transaction{data.transactions.length === 1 ? "" : "s"} recorded
      </p>
    </div>
  );
}

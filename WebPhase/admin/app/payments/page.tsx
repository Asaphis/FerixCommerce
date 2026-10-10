import { CreditCard } from "lucide-react";
import { requireAdmin } from "@/lib/data";
import { getPayments } from "@/lib/api";
import { Empty, Eyebrow, Panel, PanelHead, Pill, Readout } from "@/components/ops/bits";
import { money, num } from "@/lib/format";

const STATUS_TONE: Record<string, "mint" | "amber" | "rose" | "neutral"> = {
  paid: "mint",
  captured: "mint",
  succeeded: "mint",
  settled: "mint",
  authorized: "amber",
  refunded: "rose",
};

export default async function PaymentsPage() {
  const { session } = await requireAdmin();
  const data = await getPayments(session);
  const { totals } = data;

  return (
    <div className="grid min-w-0 gap-5">
      <header>
        <Eyebrow>Commerce</Eyebrow>
        <h1 className="mt-1.5 font-display text-[23px] font-semibold text-chalk">Payments</h1>
        
      </header>

      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 xl:grid-cols-4">
        <Readout label="Recorded paid value" value={money(totals.gross, { cents: false })} sub="Confirmed marketplace payment states" icon={<CreditCard width={15} height={15} />} />
        <Readout label="Platform commission" value={money(totals.commission, { cents: false })} sub="Retained" tone="violet" />
        <Readout label="Merchant net" value={money(totals.merchantNet, { cents: false })} sub="Payable to sellers" tone="mint" />
        <Readout label="Provider-verified refunds" value={money(totals.refunds, { cents: false })} sub={`Recorded net ${money(totals.net, { cents: false })}`} tone={totals.refunds > 0 ? "rose" : "mint"} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Readout label="Authorised by provider" value={money(totals.authorized, { cents: false })} sub="Not available until provider connection" tone="amber" />
        <Readout label="Provider-settled" value={money(totals.settled, { cents: false })} sub="Only explicit settled payment states" tone="mint" />
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
        <Empty title="No confirmed marketplace transactions" body="Only paid Ferixas marketplace orders appear here. Separate seller websites are not included." />
      ) : (
        <Panel flush className="overflow-hidden">
          <div className="min-w-0 md:overflow-x-auto">
            <table className="w-full min-w-0 border-collapse text-left md:min-w-[980px]">
              <thead>
                <tr className="hidden border-b border-hairline md:table-row">
                  {["Order", "Placed", "Merchant", "Customer", "Channel", "Method", "Amount", "Commission", "Status"].map((head) => (
                    <th key={head} className="px-4 py-3 font-mono text-[9.5px] uppercase tracking-[0.14em] text-chalk-dim">
                      {head}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.transactions.map((transaction) => (
                  <tr
                    key={transaction.id}
                    className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-hairline px-4 py-3 last:border-0 hover:bg-panel-2 md:table-row md:px-0 md:py-0"
                  >
                    <td className="w-full min-w-0 px-0 py-0 md:w-auto md:px-4 md:py-3">
                      <p className="font-mono text-[12px] text-chalk">{transaction.number}</p>
                      <p className="font-mono text-[11px] text-chalk-dim">
                        {transaction.merchantName} · {transaction.customer}
                      </p>
                      <p className="mt-0.5 font-mono text-[10.5px] text-chalk-dim md:hidden">
                        {transaction.channel} · {transaction.method}
                      </p>
                    </td>
                    <td className="hidden px-4 py-3 font-mono text-[11.5px] text-chalk-dim md:table-cell">
                      {new Date(transaction.placedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                    </td>
                    <td className="hidden px-4 py-3 text-[12.5px] text-chalk-dim md:table-cell">{transaction.merchantName}</td>
                    <td className="hidden px-4 py-3 text-[12.5px] text-chalk-dim md:table-cell">{transaction.customer}</td>
                    <td className="hidden px-4 py-3 md:table-cell">
                      <Pill tone={transaction.channel === "store" ? "mint" : "signal"}>{transaction.channel}</Pill>
                    </td>
                    <td className="hidden px-4 py-3 text-[12.5px] text-chalk-dim md:table-cell">{transaction.method}</td>
                    <td className="px-0 py-0 font-mono text-[12.5px] tabular-nums text-chalk md:px-4 md:py-3">
                      {money(transaction.amount)}
                    </td>
                    <td className="px-0 py-0 font-mono text-[12.5px] tabular-nums text-violet md:px-4 md:py-3">
                      {money(transaction.commission)}
                    </td>
                    <td className="ml-auto px-0 py-0 md:ml-0 md:px-4 md:py-3">
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

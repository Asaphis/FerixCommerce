import { Wallet } from "lucide-react";
import { requireAdmin } from "@/lib/data";
import { listPayouts } from "@/lib/api";
import { SubmitButton } from "@/components/ops/controls";
import { Empty, Eyebrow, Panel, PanelHead, Pill, Readout } from "@/components/ops/bits";
import { updatePayoutAction } from "@/lib/ops-actions";
import { money, num } from "@/lib/format";

const STATUS_TONE: Record<string, "mint" | "amber" | "neutral"> = {
  paid: "mint",
  pending: "amber",
  held: "neutral",
};

export default async function PayoutsPage() {
  const { session } = await requireAdmin();
  const data = await listPayouts(session);

  return (
    <div className="grid min-w-0 gap-5">
      <header>
        <Eyebrow>Commerce</Eyebrow>
        <h1 className="mt-1.5 font-display text-[23px] font-semibold text-chalk">Payouts</h1>
        <p className="mt-1.5 max-w-[74ch] text-[13px] leading-relaxed text-chalk-dim">
          What the platform owes each merchant for a period, after commission. Marking a payout paid records the
          settlement against the merchant's ledger.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 xl:grid-cols-4">
        <Readout label="Awaiting payout" value={money(data.totals.pending ?? 0, { cents: false })} sub="Not yet settled" icon={<Wallet width={15} height={15} />} tone="amber" />
        <Readout label="Paid to date" value={money(data.totals.paid ?? 0, { cents: false })} sub="Settled to merchants" tone="mint" />
        <Readout label="Gross processed" value={money(data.totals.gross ?? 0, { cents: false })} sub="Across all periods" tone="violet" />
        <Readout label="Commission retained" value={money(data.totals.commission ?? 0, { cents: false })} sub="Platform share" />
      </div>

      <Panel className="border-amber/30 bg-amber/5">
        <div className="flex flex-wrap items-center gap-2">
          <Pill tone="amber">Coming soon</Pill>
          <p className="text-[13px] text-chalk">{data.message}</p>
        </div>
      </Panel>

      {data.payouts.length === 0 ? (
        <Empty title="Nothing to pay out yet" body="Payout periods appear once a merchant has taken orders." />
      ) : (
        <Panel flush className="overflow-hidden">
          <div className="min-w-0 md:overflow-x-auto">
            <table className="w-full min-w-0 border-collapse text-left md:min-w-[960px]">
              <thead>
                <tr className="hidden border-b border-hairline md:table-row">
                  {["Merchant", "Period", "Orders", "Gross", "Commission", "Net payable", "Method", "Status", ""].map((head) => (
                    <th key={head} className="px-4 py-3 font-mono text-[9.5px] uppercase tracking-[0.14em] text-chalk-dim">
                      {head}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.payouts.map((payout) => (
                  <tr
                    key={payout.id}
                    className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-hairline px-4 py-3 last:border-0 hover:bg-panel-2 md:table-row md:px-0 md:py-0"
                  >
                    <td className="w-full min-w-0 px-0 py-0 md:w-auto md:px-4 md:py-3">
                      <p className="text-[12.5px] text-chalk">{payout.merchantName}</p>
                      <p className="font-mono text-[11px] text-chalk-dim">
                        {payout.period} · {payout.method}
                      </p>
                    </td>
                    <td className="hidden px-4 py-3 font-mono text-[12px] text-chalk-dim md:table-cell">{payout.period}</td>
                    <td className="hidden px-4 py-3 font-mono text-[12.5px] tabular-nums text-chalk-dim md:table-cell">
                      {num(payout.orders)}
                    </td>
                    <td className="px-0 py-0 font-mono text-[12.5px] tabular-nums text-chalk-dim md:px-4 md:py-3">
                      {money(payout.gross)}
                    </td>
                    <td className="hidden px-4 py-3 font-mono text-[12.5px] tabular-nums text-violet md:table-cell">
                      {money(payout.commission)}
                    </td>
                    <td className="px-0 py-0 font-mono text-[12.5px] tabular-nums text-chalk md:px-4 md:py-3">
                      {money(payout.net)}
                    </td>
                    <td className="hidden px-4 py-3 text-[12.5px] text-chalk-dim md:table-cell">{payout.method}</td>
                    <td className="px-0 py-0 md:px-4 md:py-3">
                      <Pill tone={STATUS_TONE[payout.status] ?? "neutral"}>{payout.status}</Pill>
                    </td>
                    <td className="ml-auto px-0 py-0 md:ml-0 md:px-4 md:py-3">
                      <form action={updatePayoutAction} className="flex gap-2">
                        <input type="hidden" name="id" value={payout.id} />
                        <input type="hidden" name="status" value={payout.status === "paid" ? "pending" : "paid"} />
                        <SubmitButton variant={payout.status === "paid" ? "outline" : "primary"} pendingLabel="Saving">
                          {payout.status === "paid" ? "Reopen" : "Mark paid"}
                        </SubmitButton>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}
    </div>
  );
}

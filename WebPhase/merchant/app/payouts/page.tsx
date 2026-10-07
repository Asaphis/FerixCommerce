import { ArrowDownRight, ArrowUpRight, Landmark, Wallet } from "lucide-react";
import { requireMerchant } from "@/lib/data";
import { getPayouts } from "@/lib/api";
import { Eyebrow, Panel, PanelHead, Pill, StatTile } from "@/components/studio/bits";
import { money, num } from "@/lib/format";
import { cn } from "@/lib/utils";
import { CellLabel, DataTable, Row, TablePanel, Td, TdDetail, TdEnd, TdLead } from "@/components/studio/table";

export default async function PayoutsPage() {
  const { session, merchant } = await requireMerchant();
  const data = await getPayouts(session);

  return (
    <div className="grid gap-5">
      <header className="shrinkable">
        <Eyebrow>Payouts</Eyebrow>
        <h1 className="mt-1.5 font-display text-[23px] font-semibold text-chalk">Money</h1>
        <p className="mt-1.5 max-w-[72ch] text-[13px] leading-relaxed text-chalk-dim">
          What you have earned, what the platform has taken in commission, and when the next payout lands.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 xl:grid-cols-4">
        <StatTile
          label="Net lifetime"
          value={money(data.balance, { cents: false })}
          sub="After platform commission"
          icon={<Wallet width={15} height={15} />}
        />
        <StatTile label="Pending payout" value={money(data.pending, { cents: false })} sub={`${data.cadence} payouts`} accent="sand" />
        <StatTile label="Paid to date" value={money(data.paidToDate, { cents: false })} sub="Settled to your bank" accent="lime" />
        <StatTile label="Commission rate" value={`${data.commissionPct}%`} sub="On marketplace sales only" accent="azure" />
      </div>

      <Panel>
        <PanelHead
          title="Payout schedule"
          hint={`${data.cadence === "weekly" ? "Weekly" : data.cadence} settlement to ${data.method}`}
          action={<Pill tone="info">{data.method}</Pill>}
        />
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { label: "Sale value", body: "The full value of the order, including delivery and tax." },
            { label: "Platform commission", body: `${data.commissionPct}% of product value on marketplace sales. Nothing on your own store.` },
            { label: "Your net", body: "What arrives in your bank on the next payout run." },
          ].map((item) => (
            <div key={item.label} className="rounded-[2px] border border-hairline p-3.5">
              <p className="text-[12.5px] font-medium text-chalk">{item.label}</p>
              <p className="mt-1.5 text-[12px] leading-relaxed text-chalk-dim">{item.body}</p>
            </div>
          ))}
        </div>
      </Panel>

      <TablePanel>
        <div className="p-5 pb-3">
          <PanelHead title="Payout history" hint="Most recent period first" />
        </div>
        <DataTable
          head={["Period", "Orders", "Gross", "Commission", "Net", "Status", "Settled"]}
          minWidth={820}
          className="p-5 pt-0"
        >
          {data.payouts.map((payout) => (
            <Row key={payout.id}>
              <TdLead>
                <p className="font-mono text-[11.5px] text-chalk">{payout.period}</p>
                <p className="font-mono text-[10px] text-chalk-dim">{payout.id}</p>
              </TdLead>
              <TdDetail className="font-mono text-[12.5px] tabular-nums text-chalk-dim">
                {num(payout.orders)}
              </TdDetail>
              <Td className="font-mono text-[12.5px] tabular-nums text-chalk">
                <CellLabel>Gross</CellLabel>
                {money(payout.gross, { cents: false })}
              </Td>
              <TdDetail>
                <span className="inline-flex items-center gap-1 font-mono text-[12.5px] tabular-nums text-ember-soft">
                  <ArrowDownRight width={12} height={12} />
                  {money(payout.commission, { cents: false })}
                </span>
              </TdDetail>
              <Td>
                <span className="inline-flex items-center gap-1 font-mono text-[12.5px] font-semibold tabular-nums text-lime">
                  <ArrowUpRight width={12} height={12} />
                  {money(payout.net, { cents: false })}
                </span>
              </Td>
              <Td>
                <Pill tone={payout.status === "paid" ? "success" : "warn"}>{payout.status}</Pill>
              </Td>
              <TdEnd className="font-mono text-[11.5px] text-chalk-dim md:table-cell">
                {payout.date}
              </TdEnd>
            </Row>
          ))}
        </DataTable>
      </TablePanel>

      <Panel>
        <PanelHead title="Where payouts go" />
        <div className="flex flex-wrap items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-[2px] border border-hairline text-chalk-dim">
            <Landmark width={16} height={16} />
          </span>
          <div>
            <p className="text-[13px] text-chalk">{data.method}</p>
            <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-chalk-dim">
              Store {merchant.name} · {merchant.plan} plan · {data.cadence} settlement
            </p>
          </div>
        </div>
        <p className="mt-4 rounded-[2px] border border-hairline bg-panel-2 px-3 py-2.5 text-[12px] leading-relaxed text-chalk-dim">
          Payouts are worked out from the orders on this backend. When the production backend replaces it, the
          same figures will come from your settlement ledger without any change to this page.
        </p>
      </Panel>
    </div>
  );
}
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
        
      </header>

      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 xl:grid-cols-4">
        <StatTile
          label="Net lifetime"
          value={data.available ? money(data.balance, { cents: false }) : "Coming soon"}
          sub={data.available ? "From recorded payouts" : "Settlement is not connected"}
          icon={<Wallet width={15} height={15} />}
        />
        <StatTile label="Pending payout" value={data.available ? money(data.pending, { cents: false }) : "Coming soon"} sub={data.available ? `${data.cadence} payouts` : "No payout record yet"} accent="sand" />
        <StatTile label="Paid to date" value={data.available ? money(data.paidToDate, { cents: false }) : "Coming soon"} sub={data.available ? "Recorded as settled" : "No settlement record yet"} accent="lime" />
        <StatTile label="Commission rate" value={`${data.commissionPct}%`} sub="On marketplace sales only" accent="azure" />
      </div>

      <Panel>
        <PanelHead title="Payout schedule" hint={data.available ? `${data.cadence} settlement` : "Payout settlement is not configured yet"} action={<Pill tone={data.available ? "info" : "neutral"}>{data.available ? "Configured record" : "Coming soon"}</Pill>} />
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
          <PanelHead title="Payout history" />
        </div>
        {data.payouts.length ? <DataTable
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
        </DataTable> : <p className="px-5 pb-5 text-[13px] text-chalk-dim">No payout records have been created. Order totals are not shown as money received.</p>}
      </TablePanel>

      <Panel>
        <PanelHead title="Where payouts go" />
        <div className="flex flex-wrap items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-[2px] border border-hairline text-chalk-dim">
            <Landmark width={16} height={16} />
          </span>
          <div>
            <p className="text-[13px] text-chalk">{data.method ?? "Not configured"}</p>
            <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-chalk-dim">
              Store {merchant.name} · {merchant.plan} plan · {data.cadence} settlement
            </p>
          </div>
        </div>
        <p className="mt-4 rounded-[2px] border border-hairline bg-panel-2 px-3 py-2.5 text-[12px] leading-relaxed text-chalk-dim">
          Only recorded payout entries appear here. Payment capture and settlement are not connected, so order value is not treated as seller income.
        </p>
      </Panel>
    </div>
  );
}

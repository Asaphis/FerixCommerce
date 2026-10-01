"use client";

import { useState } from "react";
import {
  Banknote,
  CalendarClock,
  CheckCircle2,
  Clock,
  Landmark,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { channelSplit, payoutsOf } from "@/lib/data";
import { dateLong, money } from "@/lib/format";
import { useFerixas } from "@/lib/store";
import { StudioShell } from "@/components/studio/shell";
import {
  Panel,
  PanelHead,
  Pill,
  StatTile,
  StudioButton,
  TableWrap,
  Td,
  Th,
} from "@/components/studio/bits";
import { KeyValue } from "@/components/studio/side-panel";
import { AreaSeries } from "@/components/studio/charts";

export default function PayoutsPage() {
  const { merchantId, merchant } = useFerixas();
  const [requested, setRequested] = useState(false);
  const payouts = payoutsOf(merchantId);
  const split = channelSplit(merchantId, 30);
  const paidToDate = payouts
    .filter((p) => p.status === "paid")
    .reduce((s, p) => s + (p.amount - p.commission), 0);

  return (
    <StudioShell
      title="Payouts"
      subtitle={`${merchant.commissionPct}% marketplace commission \u00b7 paid every two weeks`}
      actions={
        <StudioButton
          variant="primary"
          disabled={requested}
          onClick={() => {
            setRequested(true);
            toast.success("Instant payout requested \u2014 simulated");
          }}
        >
          <Banknote width={14} height={14} />
          {requested ? "Payout requested" : "Request instant payout"}
        </StudioButton>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Available balance"
          value={money(merchant.balance, { cents: false })}
          sub="Cleared after delivery plus 4 days"
          spark={[12, 19, 16, 22, 26, 24, 31, 34, 38, 42, 46, 51]}
        />
        <StatTile
          label="Pending payout"
          value={money(merchant.pendingPayout, { cents: false })}
          sub="Scheduled for next Friday"
        />
        <StatTile
          label="Commission this period"
          value={money(split.commission, { cents: false })}
          sub="On marketplace sales only"
        />
        <StatTile
          label="Paid to date"
          value={money(paidToDate, { cents: false })}
          sub={`${payouts.filter((p) => p.status === "paid").length} completed payouts`}
        />
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_360px]">
        <Panel flush>
          <div className="p-5 pb-4">
            <PanelHead
              title="Payout history"
              hint="Two-week periods, commission deducted at source"
            />
          </div>
          <div className="px-5 pb-5">
            <TableWrap>
              <thead>
                <tr>
                  <Th>Period</Th>
                  <Th align="right">Gross</Th>
                  <Th align="right">Commission</Th>
                  <Th align="right">Net payout</Th>
                  <Th>Status</Th>
                  <Th>Method</Th>
                  <Th>Paid</Th>
                </tr>
              </thead>
              <tbody>
                {payouts.map((payout) => (
                  <tr key={payout.id} className="transition-colors hover:bg-panel-2/40">
                    <Td className="font-mono text-[12px]">{payout.period}</Td>
                    <Td align="right" className="font-mono text-[12.5px] tabular-nums">
                      {money(payout.amount, { cents: false })}
                    </Td>
                    <Td align="right" className="font-mono text-[12px] tabular-nums text-ember-soft">
                      {payout.commission ? `\u2212${money(payout.commission, { cents: false })}` : "\u2014"}
                    </Td>
                    <Td align="right" className="font-mono text-[12.5px] tabular-nums text-lime">
                      {money(payout.amount - payout.commission, { cents: false })}
                    </Td>
                    <Td>
                      <Pill
                        tone={
                          payout.status === "paid"
                            ? "success"
                            : payout.status === "in transit"
                              ? "info"
                              : payout.status === "on hold"
                                ? "danger"
                                : "warn"
                        }
                      >
                        {payout.status}
                      </Pill>
                    </Td>
                    <Td className="font-mono text-[11px] text-chalk-dim">{payout.method}</Td>
                    <Td className="font-mono text-[11.5px] text-chalk-dim">
                      {dateLong(payout.date)}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
          </div>
        </Panel>

        <div className="grid gap-3 self-start">
          <Panel>
            <PanelHead title="Balance trend" hint="Available balance over 90 days" />
            <AreaSeries
              values={[18, 22, 20, 27, 31, 29, 36, 41, 39, 47, 52, 58, 55, 62]}
              height={90}
            />
            <p className="mt-3 font-mono text-[10.5px] text-chalk-dim">
              Grows as marketplace orders clear their hold window.
            </p>
          </Panel>

          <Panel>
            <PanelHead title="Payout account" hint="Where money lands" />
            <div className="rounded-[2px] border border-hairline p-4">
              <div className="flex items-center gap-2.5">
                <Landmark width={16} height={16} className="text-lime" />
                <span className="text-[13px] text-chalk">
                  {merchant.location.split(",")[1]?.trim() ?? "Local"} bank transfer
                </span>
              </div>
              <div className="mt-3">
                <KeyValue
                  rows={[
                    ["Account name", merchant.name],
                    ["Account", "\u00b7\u00b7\u00b7\u00b7 8921"],
                    ["Currency", "USD"],
                    ["Schedule", "Every 2 weeks, Friday"],
                  ]}
                />
              </div>
              <StudioButton
                className="mt-4 w-full"
                onClick={() => toast.info("Bank details are simulated in this prototype")}
              >
                Update bank details
              </StudioButton>
            </div>
          </Panel>

          <Panel>
            <PanelHead title="How a payout is built" />
            <ul className="space-y-3">
              {[
                { icon: CheckCircle2, text: "Store orders pay out in full \u2014 no commission" },
                { icon: Clock, text: `Marketplace orders release ${merchant.commissionPct}% commission first` },
                { icon: ShieldCheck, text: "Refund and dispute amounts are withheld from the next run" },
                { icon: CalendarClock, text: "Released T+4 after delivery confirmation" },
              ].map((row) => (
                <li key={row.text} className="flex gap-2.5">
                  <row.icon width={14} height={14} className="mt-0.5 shrink-0 text-chalk-dim" />
                  <span className="text-[12.5px] leading-relaxed text-chalk-dim">{row.text}</span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
    </StudioShell>
  );
}

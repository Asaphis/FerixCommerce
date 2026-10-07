"use client";

import { useActionState } from "react";
import { RotateCcw, Save } from "lucide-react";
import type { SettingsPayload } from "@/lib/api";
import { Field, SubmitButton } from "@/components/ops/controls";
import { inputClass, selectClass } from "@/components/ops/table";
import { Notice } from "@/components/ops/notice";
import { Panel, PanelHead } from "@/components/ops/bits";
import { saveSettingsAction, type FormState } from "@/lib/actions";

export function SettingsForm({ payload }: { payload: SettingsPayload }) {
  const [state, action] = useActionState<FormState, FormData>(saveSettingsAction, {});
  const { settings, defaults } = payload;

  return (
    <form action={action} className="grid gap-3">
      <Panel>
        <PanelHead title="Platform identity" hint="Shown across the console and in communications" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field title="Platform name">
            <input name="platformName" defaultValue={settings.platformName} className={inputClass} required />
          </Field>
          <Field title="Support address">
            <input name="supportEmail" type="email" defaultValue={settings.supportEmail} className={inputClass} />
          </Field>
          <Field title="Settlement currency">
            <select name="currency" defaultValue={settings.currency} className={selectClass}>
              {["USD", "NGN", "GBP", "EUR", "ZAR"].map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
          </Field>
          <Field title="Payout cadence">
            <select name="payoutCadence" defaultValue={settings.payoutCadence} className={selectClass}>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </Field>
        </div>
      </Panel>

      <Panel>
        <PanelHead title="Commercial defaults" hint="Applied to new merchants and every checkout" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field title="Default commission (%)">
            <input
              name="defaultCommissionPct"
              type="number"
              step="0.5"
              min="0"
              max="50"
              defaultValue={settings.defaultCommissionPct}
              className={inputClass}
            />
          </Field>
          <Field title="Tax rate at checkout (%)">
            <input
              name="taxRatePct"
              type="number"
              step="0.5"
              min="0"
              max="30"
              defaultValue={settings.taxRatePct}
              className={inputClass}
            />
          </Field>
        </div>
        <p className="mt-3 font-mono text-[10px] leading-relaxed text-chalk-dim/80">
          Free delivery is charged over {settings.freeShippingOver} in {settings.currency}. Commission applies to
          marketplace sales only; merchant storefront orders always carry none.
        </p>
      </Panel>

      <Panel>
        <PanelHead title="Marketplace switches" hint="These bind every merchant on the platform" />
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex cursor-pointer items-start gap-3 rounded-[2px] border border-hairline p-3.5 transition-colors hover:border-chalk-dim">
            <input
              type="checkbox"
              name="marketplaceEnabled"
              defaultChecked={settings.marketplaceEnabled}
              className="mt-[3px] h-4 w-4 accent-[#6ee7ff]"
            />
            <span>
              <span className="block text-[13px] font-medium text-chalk">Marketplace is open</span>
              <span className="block text-[12px] text-chalk-dim">
                Turning this off hides the marketplace from every shopper while merchant storefronts keep selling.
              </span>
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-3 rounded-[2px] border border-hairline p-3.5 transition-colors hover:border-chalk-dim">
            <input
              type="checkbox"
              name="newMerchantsNeedReview"
              defaultChecked={settings.newMerchantsNeedReview}
              className="mt-[3px] h-4 w-4 accent-[#6ee7ff]"
            />
            <span>
              <span className="block text-[13px] font-medium text-chalk">Hold new merchants for review</span>
              <span className="block text-[12px] text-chalk-dim">A new store starts in review until an operator approves it.</span>
            </span>
          </label>
        </div>
      </Panel>

      <Panel>
        <PanelHead title="Factory defaults" hint="What the platform shipped with" />
        <ul className="grid gap-2 text-[12.5px] text-chalk-dim sm:grid-cols-2">
          {[
            ["Commission", `${defaults.defaultCommissionPct}%`],
            ["Tax", `${defaults.taxRatePct}%`],
            ["Currency", defaults.currency],
            ["Payout cadence", defaults.payoutCadence],
            ["Free delivery over", String(defaults.freeShippingOver)],
            ["New merchants", defaults.newMerchantsNeedReview ? "Review required" : "Open"],
          ].map(([label, value]) => (
            <li key={label} className="flex items-center justify-between gap-3 rounded-[2px] border border-hairline px-3 py-2">
              <span>{label}</span>
              <span className="font-mono text-chalk">{value}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-chalk-dim/70">
          <RotateCcw width={11} height={11} /> Save the factory value back at any time
        </p>
      </Panel>

      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton pendingLabel="Saving">
          <Save width={14} height={14} /> Save platform settings
        </SubmitButton>
        <Notice state={state} />
      </div>
    </form>
  );
}

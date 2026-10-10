"use client";

import { useActionState } from "react";
import { Save } from "lucide-react";
import type { Settings } from "@/lib/api";
import { SubmitButton } from "@/components/studio/controls";
import { Field, Notice, inputClass, selectClass } from "@/components/studio/forms";
import { Panel, PanelHead } from "@/components/studio/bits";
import { saveSettingsAction, type FormState } from "@/lib/actions";

export function SettingsForm({ settings }: { settings: Settings }) {
  const [state, action] = useActionState<FormState, FormData>(saveSettingsAction, {});

  return (
    <form action={action} className="grid gap-3">
      <Panel>
        <PanelHead title="Marketplace participation" hint="Ferixas listings and seller preferences" />
        <div className="grid gap-4">
          <label className="flex cursor-pointer items-start gap-3 rounded-[7px] border border-hairline p-3.5 transition-colors hover:border-chalk-dim">
            <input
              type="checkbox"
              name="marketplaceEnabled"
              defaultChecked={settings.marketplaceEnabled}
              className="mt-[3px] h-4 w-4 accent-[#e4572e]"
            />
            <span>
              <span className="block text-[13px] font-medium text-chalk">Sell on the Ferixas marketplace</span>
              <span className="block text-[12px] text-chalk-dim">
                Turn this off to pause your Ferixas listings. Your separate website is not displayed or managed as a Ferixas marketplace store.
              </span>
            </span>
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field title="Warn me when stock falls below">
              <input
                name="lowStockAt"
                type="number"
                min="0"
                defaultValue={settings.lowStockAt}
                className={inputClass}
              />
            </Field>
            <Field title="Preferred payout cadence · not active yet">
              <select name="payoutCadence" defaultValue={settings.payoutCadence} className={selectClass} aria-describedby="payout-cadence-note">
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
              <span id="payout-cadence-note" className="mt-1 block text-[10.5px] text-sand">Preference only; payment and automatic payout processing are not connected.</span>
            </Field>
          </div>
        </div>
      </Panel>

      <Panel>
        <PanelHead title="Working style" hint="How the workspace behaves" />
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex cursor-pointer items-start gap-3 rounded-[7px] border border-hairline p-3.5 transition-colors hover:border-chalk-dim">
            <input
              type="checkbox"
              name="orderEmails"
              defaultChecked={settings.orderEmails}
              className="mt-[3px] h-4 w-4 accent-[#e4572e]"
            />
            <span>
              <span className="block text-[13px] font-medium text-chalk">Email me on a Ferixas marketplace order</span>
              <span className="block text-[12px] text-chalk-dim">Sent as soon as the order lands</span>
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-3 rounded-[7px] border border-hairline p-3.5 transition-colors hover:border-chalk-dim">
            <input
              type="checkbox"
              name="autoFulfil"
              defaultChecked={settings.autoFulfil}
              className="mt-[3px] h-4 w-4 accent-[#e4572e]"
            />
            <span>
              <span className="block text-[13px] font-medium text-chalk">Start orders as processing</span>
              <span className="block text-[12px] text-chalk-dim">Skip the first manual step on every order</span>
            </span>
          </label>
        </div>
      </Panel>

      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton pendingLabel="Saving">
          <Save width={14} height={14} /> Save marketplace settings
        </SubmitButton>
        <Notice state={state} />
      </div>
    </form>
  );
}

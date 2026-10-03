"use client";

import { useActionState } from "react";
import { Save } from "lucide-react";
import type { Settings } from "@/lib/api";
import { SubmitButton } from "@/components/studio/controls";
import { Field, Notice, inputClass, selectClass, textareaClass } from "@/components/studio/forms";
import { Panel, PanelHead } from "@/components/studio/bits";
import { saveSettingsAction, type FormState } from "@/lib/actions";

export function SettingsForm({ settings, templates }: { settings: Settings; templates: string[] }) {
  const [state, action] = useActionState<FormState, FormData>(saveSettingsAction, {});

  return (
    <form action={action} className="grid gap-3">
      <Panel>
        <PanelHead title="Storefront identity" hint="What shoppers see" />
        <div className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field title="Store name">
              <input name="name" defaultValue={settings.name} className={inputClass} required />
            </Field>
            <Field title="Location">
              <input name="location" defaultValue={settings.location} className={inputClass} />
            </Field>
          </div>
          <Field title="Tagline">
            <input name="tagline" defaultValue={settings.tagline} className={inputClass} />
          </Field>
          <Field title="About the store">
            <textarea name="about" defaultValue={settings.about} className={textareaClass} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field title="Branded domain">
              <input
                name="customDomain"
                defaultValue={settings.customDomain}
                className={inputClass}
                placeholder="yourstore.com"
              />
            </Field>
            <Field title="Storefront template">
              <select name="template" defaultValue={settings.template} className={selectClass}>
                {templates.map((template) => (
                  <option key={template} value={template}>
                    {template}
                  </option>
                ))}
              </select>
            </Field>
            <Field title="Brand colour">
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  name="accent"
                  defaultValue={settings.accent}
                  aria-label="Brand colour"
                  className="h-10 w-12 cursor-pointer rounded-[2px] border border-hairline bg-panel-2"
                />
                <input
                  defaultValue={settings.accent}
                  className={inputClass}
                  aria-label="Brand colour value"
                  readOnly
                />
              </div>
            </Field>
          </div>
        </div>
      </Panel>

      <Panel>
        <PanelHead title="Selling" hint="Channels, stock warnings and payouts" />
        <div className="grid gap-4">
          <label className="flex cursor-pointer items-start gap-3 rounded-[2px] border border-hairline p-3.5 transition-colors hover:border-chalk-dim">
            <input
              type="checkbox"
              name="marketplaceEnabled"
              defaultChecked={settings.marketplaceEnabled}
              className="mt-[3px] h-4 w-4 accent-[#c9f24d]"
            />
            <span>
              <span className="block text-[13px] font-medium text-chalk">Sell on the Ferixas marketplace</span>
              <span className="block text-[12px] text-chalk-dim">
                Turn this off and your products stop appearing on ferixas.com while your own store keeps selling.
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
            <Field title="Payout cadence">
              <select name="payoutCadence" defaultValue={settings.payoutCadence} className={selectClass}>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </Field>
          </div>
        </div>
      </Panel>

      <Panel>
        <PanelHead title="Working style" hint="How the workspace behaves" />
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex cursor-pointer items-start gap-3 rounded-[2px] border border-hairline p-3.5 transition-colors hover:border-chalk-dim">
            <input
              type="checkbox"
              name="orderEmails"
              defaultChecked={settings.orderEmails}
              className="mt-[3px] h-4 w-4 accent-[#c9f24d]"
            />
            <span>
              <span className="block text-[13px] font-medium text-chalk">Email me on every new order</span>
              <span className="block text-[12px] text-chalk-dim">Sent as soon as the order lands</span>
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-3 rounded-[2px] border border-hairline p-3.5 transition-colors hover:border-chalk-dim">
            <input
              type="checkbox"
              name="autoFulfil"
              defaultChecked={settings.autoFulfil}
              className="mt-[3px] h-4 w-4 accent-[#c9f24d]"
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
          <Save width={14} height={14} /> Save store settings
        </SubmitButton>
        <Notice state={state} />
      </div>
    </form>
  );
}

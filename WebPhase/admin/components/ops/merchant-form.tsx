"use client";

import { useActionState } from "react";
import { Save } from "lucide-react";
import type { MerchantDetail } from "@/lib/api";
import { Field, SubmitButton } from "@/components/ops/controls";
import { inputClass, selectClass } from "@/components/ops/table";
import { Notice } from "@/components/ops/notice";
import { Panel, PanelHead } from "@/components/ops/bits";
import { saveMerchantAction, type FormState } from "@/lib/actions";

const PLANS = ["Starter", "Growth", "Scale", "Platform"];

export function MerchantForm({ detail }: { detail: MerchantDetail }) {
  const [state, action] = useActionState<FormState, FormData>(saveMerchantAction, {});
  const { merchant } = detail;

  return (
    <form action={action} className="grid gap-3">
      <input type="hidden" name="id" value={merchant.id} />

      <Panel>
        <PanelHead title="Commercial settings" hint="These settings do not edit the seller's public profile or account standing." />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field title="Plan">
            <select name="plan" defaultValue={merchant.plan} className={selectClass}>
              {PLANS.map((plan) => (
                <option key={plan} value={plan}>
                  {plan}
                </option>
              ))}
            </select>
          </Field>
          <Field title="Platform commission (%)">
            <input
              name="commissionPct"
              type="number"
              step="0.5"
              min="0"
              max="100"
              defaultValue={merchant.commissionPct}
              className={inputClass}
            />
          </Field>
          <Field title="Verified seller">
            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                name="verified"
                id="verified"
                defaultChecked={merchant.verified}
                className="h-4 w-4 accent-[#6ee7ff]"
              />
              <label htmlFor="verified" className="text-[12.5px] text-chalk-dim">
              Shows a verified badge on the Ferixas marketplace profile
              </label>
            </div>
          </Field>
        </div>
      </Panel>

      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton pendingLabel="Saving">
          <Save width={14} height={14} /> Save merchant
        </SubmitButton>
        <Notice state={state} />
      </div>
    </form>
  );
}

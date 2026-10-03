"use client";

import { useActionState } from "react";
import { Save } from "lucide-react";
import type { MerchantDetail } from "@/lib/api";
import { Field, SubmitButton, inputClass, selectClass } from "@/components/ops/controls";
import { Notice } from "@/components/ops/notice";
import { Panel, PanelHead } from "@/components/ops/bits";
import { saveMerchantAction, type FormState } from "@/lib/actions";

const STATUSES = [
  { value: "active", label: "Active — selling normally" },
  { value: "review", label: "In review — marketplace held" },
  { value: "suspended", label: "Suspended — removed from the marketplace" },
];

const PLANS = ["Starter", "Growth", "Scale", "Platform"];

export function MerchantForm({ detail }: { detail: MerchantDetail }) {
  const [state, action] = useActionState<FormState, FormData>(saveMerchantAction, {});
  const { merchant } = detail;

  return (
    <form action={action} className="grid gap-3">
      <input type="hidden" name="id" value={merchant.id} />

      <Panel>
        <PanelHead title="Standing and terms" hint="Applies to the next order placed with this merchant" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field title="Account standing">
            <select name="status" defaultValue={merchant.status} className={selectClass}>
              {STATUSES.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </Field>
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
              max="50"
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
                Shows a verified badge to shoppers
              </label>
            </div>
          </Field>
        </div>
      </Panel>

      <Panel>
        <PanelHead title="Marketplace access" hint="Their own storefront is never affected by this" />
        <label className="flex cursor-pointer items-start gap-3 rounded-[2px] border border-hairline p-3.5 transition-colors hover:border-chalk-dim">
          <input
            type="checkbox"
            name="marketplaceEnabled"
            defaultChecked={merchant.marketplaceEnabled}
            className="mt-[3px] h-4 w-4 accent-[#6ee7ff]"
          />
          <span>
            <span className="block text-[13px] font-medium text-chalk">Listed on the Ferixas marketplace</span>
            <span className="block text-[12px] text-chalk-dim">
              Turn this off and {merchant.name}&apos;s products disappear from ferixas.com while their own
              storefront keeps selling at the same stock count.
            </span>
          </span>
        </label>
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

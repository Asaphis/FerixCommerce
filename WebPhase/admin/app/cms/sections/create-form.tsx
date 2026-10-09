"use client";

import { useActionState } from "react";
import { Save } from "lucide-react";
import { Panel, PanelHead } from "@/components/ops/bits";
import { Field, SubmitButton } from "@/components/ops/controls";
import { inputClass, textareaClass } from "@/components/ops/table";
import { createCmsSectionAction, type FormState } from "@/lib/actions";

export function CreateCmsSectionForm() {
  const [state, action] = useActionState<FormState, FormData>(createCmsSectionAction, {});

  return (
    <Panel>
      <PanelHead title="Create new section" />
      <form action={action} className="grid gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field title="Section name">
            <input name="name" className={inputClass} placeholder="Flash Sale" required />
          </Field>
          <Field title="Slug (URL-friendly)">
            <input name="slug" className={inputClass} placeholder="flash-sale" />
          </Field>
        </div>
        <Field title="Description (optional)">
          <textarea name="description" className={textareaClass} placeholder="Limited-time offers with big discounts" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field title="Sort order">
            <input name="sort_order" type="number" defaultValue="0" className={inputClass} />
          </Field>
          <Field title="Active">
            <select name="is_active" defaultValue="true" className={inputClass}>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </Field>
        </div>
        <div className="flex items-center gap-3">
          <SubmitButton pendingLabel="Creating">
            <Save width={14} height={14} /> Create section
          </SubmitButton>
          {state.error && <p className="text-[12px] text-ember">{state.error}</p>}
          {state.message && <p className="text-[12px] text-mint">{state.message}</p>}
        </div>
      </form>
    </Panel>
  );
}

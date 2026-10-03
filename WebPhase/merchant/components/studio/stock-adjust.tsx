"use client";

import { useActionState, useState } from "react";
import { Check, Minus, Plus } from "lucide-react";
import { SubmitButton } from "@/components/studio/controls";
import { Notice, inputClass, selectClass } from "@/components/studio/forms";
import { adjustStockAction, type FormState } from "@/lib/actions";
import { cn } from "@/lib/utils";

const REASONS = ["Manual adjustment", "Restock from supplier", "Damaged in transit", "Stocktake correction", "Returned by customer"];

export function StockAdjust({ productId, title }: { productId: string; title: string }) {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState<FormState, FormData>(adjustStockAction, {});

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex cursor-pointer items-center gap-1.5 rounded-[2px] border border-hairline px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-chalk-dim transition-colors hover:border-chalk-dim hover:text-chalk"
      >
        <Plus width={11} height={11} /> Adjust
      </button>
    );
  }

  return (
    <form action={action} className="grid w-[280px] gap-2">
      <input type="hidden" name="id" value={productId} />
      <span className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-chalk-dim">
        Adjust stock for {title}
      </span>
      <div className="flex items-center gap-2">
        <input
          name="delta"
          type="number"
          defaultValue={10}
          className={cn(inputClass, "h-9 w-[92px]")}
          aria-label="Units to add or remove"
        />
        <select name="reason" defaultValue={REASONS[0]} className={cn(selectClass, "h-9 flex-1")} aria-label="Reason">
          {REASONS.map((reason) => (
            <option key={reason} value={reason}>
              {reason}
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-2">
        <SubmitButton pendingLabel="Saving" className="py-1.5">
          <Check width={12} height={12} /> Save
        </SubmitButton>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="cursor-pointer rounded-[2px] border border-hairline px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-chalk-dim hover:text-chalk"
        >
          <Minus width={11} height={11} /> Cancel
        </button>
      </div>
      <div className="text-[11.5px]">
        <Notice state={state} />
      </div>
      <p className="font-mono text-[9.5px] leading-relaxed text-chalk-dim/70">
        A negative number removes units.
      </p>
    </form>
  );
}

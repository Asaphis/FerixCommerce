"use client";

import { AlertCircle, Check } from "lucide-react";
import type { FormState } from "@/lib/actions";

export function Notice({ state }: { state: FormState }) {
  if (state?.error)
    return (
      <p className="flex items-start gap-2 rounded-[2px] border border-rose/40 bg-rose/10 px-3 py-2.5 text-[12.5px] text-rose">
        <AlertCircle width={14} height={14} className="mt-[1px] shrink-0" />
        {state.error}
      </p>
    );
  if (state?.message)
    return (
      <p className="flex items-start gap-2 rounded-[2px] border border-mint/40 bg-mint/10 px-3 py-2.5 text-[12.5px] text-mint">
        <Check width={14} height={14} className="mt-[1px] shrink-0" />
        {state.message}
      </p>
    );
  return null;
}

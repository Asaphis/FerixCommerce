"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * A single action button that asks for confirmation before it fires.
 *
 * Destructive operations (cancelling an order, removing a product, releasing a
 * payout) are two taps: the first arms it, the second commits. Nothing changes
 * on the server until the operator confirms, so a mis-tap never costs money.
 */
export function ConfirmAction({
  action,
  fields,
  label,
  confirmLabel,
  tone = "default",
}: {
  action: (data: FormData) => void | Promise<void>;
  fields: Record<string, string>;
  label: string;
  confirmLabel?: string;
  tone?: "default" | "primary" | "danger";
}) {
  const [armed, setArmed] = useState(false);

  const styles = {
    default: "border-hairline text-chalk-dim hover:border-chalk-dim hover:text-chalk",
    primary: "border-lime/40 bg-lime/10 text-lime hover:bg-lime/20",
    danger: "border-ember/40 text-ember-soft hover:bg-ember/12",
  }[tone];

  if (!armed) {
    return (
      <button
        type="button"
        onClick={() => setArmed(true)}
        className={cn(
          "inline-flex min-h-[36px] cursor-pointer items-center rounded-[2px] border px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime focus-visible:ring-offset-2 focus-visible:ring-offset-panel",
          styles,
        )}
      >
        {label}
      </button>
    );
  }

  return (
    <form
      action={action}
      className="inline-flex flex-wrap items-center gap-1.5 rounded-[2px] border border-ember/40 bg-ember/8 px-2 py-1"
    >
      {Object.entries(fields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-ember-soft">
        {confirmLabel ?? "Are you sure?"}
      </span>
      <button
        type="submit"
        className="inline-flex min-h-[32px] cursor-pointer items-center rounded-[2px] bg-ember px-2.5 font-mono text-[10px] uppercase tracking-[0.14em] text-ink transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember"
      >
        Yes
      </button>
      <button
        type="button"
        onClick={() => setArmed(false)}
        className="inline-flex min-h-[32px] cursor-pointer items-center rounded-[2px] border border-hairline px-2.5 font-mono text-[10px] uppercase tracking-[0.14em] text-chalk-dim transition-colors hover:text-chalk focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime"
      >
        No
      </button>
    </form>
  );
}

"use client";

import React from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "ghost" | "outline" | "danger" | "warn";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-signal text-void hover:bg-chalk border border-transparent",
  ghost: "text-chalk-dim hover:text-chalk hover:bg-panel-2 border border-transparent",
  outline: "border border-hairline text-chalk hover:border-chalk-dim hover:bg-panel-2",
  danger: "border border-rose/40 text-rose hover:bg-rose/12",
  warn: "border border-amber/40 text-amber hover:bg-amber/12",
};

export function OpsButton({
  children,
  variant = "ghost",
  className,
  type = "button",
  disabled,
}: {
  children: React.ReactNode;
  variant?: Variant;
  className?: string;
  type?: "button" | "submit";
  disabled?: boolean;
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      className={cn(
        "inline-flex cursor-pointer items-center justify-center gap-2 rounded-[2px] px-3 py-2 text-[12.5px] font-medium transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-40",
        VARIANTS[variant],
        className,
      )}
    >
      {children}
    </button>
  );
}

export function SubmitButton({
  children,
  variant = "primary",
  className,
  pendingLabel,
}: {
  children: React.ReactNode;
  variant?: Variant;
  className?: string;
  pendingLabel?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={cn(
        "inline-flex cursor-pointer items-center justify-center gap-2 rounded-[2px] px-3.5 py-2.5 text-[12.5px] font-medium transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-60",
        VARIANTS[variant],
        className,
      )}
    >
      {pending ? (
        <>
          <Loader2 width={13} height={13} className="animate-spin" />
          {pendingLabel ?? "Working"}
        </>
      ) : (
        children
      )}
    </button>
  );
}

/** Submits whenever a control inside changes — used for filters. */
export function FilterForm({ children, className, action }: { children: React.ReactNode; className?: string; action: string }) {
  const ref = React.useRef<HTMLFormElement>(null);
  return (
    <form ref={ref} action={action} method="get" onChange={() => ref.current?.requestSubmit()} className={className}>
      {children}
      <noscript>
        <button type="submit" className="rounded-[2px] border border-hairline px-3 py-2 text-[12px] text-chalk">
          Apply
        </button>
      </noscript>
    </form>
  );
}

export const inputClass =
  "h-10 w-full rounded-[2px] border border-hairline bg-panel-2 px-3 text-[13px] text-chalk outline-none transition-colors placeholder:text-chalk-dim/60 focus:border-signal/60";
export const selectClass = inputClass;
export const textareaClass = cn(inputClass, "h-[92px] resize-y py-2");
export const labelClass = "font-mono text-[9.5px] uppercase tracking-[0.14em] text-chalk-dim";

export function Field({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className={labelClass}>{title}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

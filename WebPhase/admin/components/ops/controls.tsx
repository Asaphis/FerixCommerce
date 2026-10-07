"use client";

import React from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { labelClass } from "@/components/ops/table";

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
        "inline-flex min-h-[44px] cursor-pointer items-center justify-center gap-2 rounded-[2px] px-3 py-2 text-[12.5px] font-medium transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-40",
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

export function FilterForm({ children, className, action, debounce = true }: { children: React.ReactNode; className?: string; action: string; debounce?: boolean }) {
  const ref = React.useRef<HTMLFormElement>(null);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Filters submit on change, which is right for a select but fires a request
  // per keystroke for a text field. Debounce text input to 350ms, submit
  // selects immediately.
  function onChange(event: React.FormEvent<HTMLFormElement>) {
    const target = event.target as HTMLInputElement;
    const isText = target.tagName === "INPUT" && (target.type === "text" || target.type === "search");
    if (timer.current) clearTimeout(timer.current);
    if (!debounce || !isText) {
      ref.current?.requestSubmit();
      return;
    }
    timer.current = setTimeout(() => ref.current?.requestSubmit(), 350);
  }

  return (
    <form ref={ref} action={action} method="get" onChange={onChange} className={className}>
      {children}
      <noscript>
        <button type="submit" className="rounded-[2px] border border-hairline px-3 py-2 text-[12px] text-chalk">
          Apply
        </button>
      </noscript>
    </form>
  );
}

export function Field({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className={labelClass}>{title}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

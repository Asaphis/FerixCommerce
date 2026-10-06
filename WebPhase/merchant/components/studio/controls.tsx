"use client";

import React from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function StudioButton({
  children,
  variant = "ghost",
  className,
  type = "button",
  disabled,
}: {
  children: React.ReactNode;
  variant?: "primary" | "ghost" | "outline" | "danger";
  className?: string;
  type?: "button" | "submit";
  disabled?: boolean;
}) {
  const variants = {
    primary: "bg-lime text-void hover:bg-chalk border border-transparent",
    ghost: "text-chalk-dim hover:text-chalk hover:bg-panel-2 border border-transparent",
    outline: "border border-hairline text-chalk hover:border-chalk-dim hover:bg-panel-2",
    danger: "border border-ember/40 text-ember-soft hover:bg-ember/12",
  };
  return (
    <button
      type={type}
      disabled={disabled}
      className={cn(
        "inline-flex cursor-pointer items-center justify-center gap-2 rounded-[2px] px-3 py-2 text-[12.5px] font-medium transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-40",
        variants[variant],
        className,
      )}
    >
      {children}
    </button>
  );
}

/** Submits its own form; shows progress while the action runs. */
export function SubmitButton({
  children,
  variant = "primary",
  className,
  pendingLabel,
}: {
  children: React.ReactNode;
  variant?: "primary" | "ghost" | "outline" | "danger";
  className?: string;
  pendingLabel?: string;
}) {
  const { pending } = useFormStatus();
  const variants = {
    primary: "bg-lime text-void hover:bg-chalk border border-transparent",
    ghost: "text-chalk-dim hover:text-chalk hover:bg-panel-2 border border-transparent",
    outline: "border border-hairline text-chalk hover:border-chalk-dim hover:bg-panel-2",
    danger: "border border-ember/40 text-ember-soft hover:bg-ember/12",
  };
  return (
    <button
      type="submit"
      disabled={pending}
      className={cn(
        "inline-flex cursor-pointer items-center justify-center gap-2 rounded-[2px] px-3.5 py-2.5 text-[12.5px] font-medium transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-60",
        variants[variant],
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

/** Re-submits whenever any control inside changes — used for filters. */
export function FilterForm({
  children,
  className,
  action,
}: {
  children: React.ReactNode;
  className?: string;
  action: string;
}) {
  const ref = React.useRef<HTMLFormElement>(null);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const onSubmit = React.useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const form = event.currentTarget;
      // Text inputs wait for a pause in typing; selects and checkboxes fire at
      // once, so choosing a filter still feels immediate.
      const target = event.target as HTMLElement;
      const isText = target instanceof HTMLInputElement && target.type === "search";
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => form.requestSubmit(), isText ? 350 : 0);
    },
    [],
  );

  React.useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  return (
    <form ref={ref} action={action} method="get" onSubmit={onSubmit} className={className}>
      {children}
      <noscript>
        <button type="submit" className="rounded-[2px] border border-hairline px-3 py-2 text-[12px] text-chalk">
          Apply
        </button>
      </noscript>
    </form>
  );
}

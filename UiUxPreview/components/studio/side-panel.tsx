"use client";

import { X } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Slide-over used by the studio on desktop; becomes a bottom sheet on mobile. */
export function SidePanel({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Close panel"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-void/70 backdrop-blur-sm"
      />
      <div className="absolute inset-x-0 bottom-0 flex max-h-[88vh] flex-col overflow-hidden rounded-t-[10px] border-t border-hairline bg-panel sm:inset-y-0 sm:left-auto sm:right-0 sm:max-h-none sm:w-[520px] sm:rounded-none sm:border-l sm:border-t-0">
        <div className="flex items-start justify-between gap-4 border-b border-hairline p-5">
          <div className="min-w-0">
            <h2 className="truncate font-display text-[16px] font-semibold text-chalk">{title}</h2>
            {subtitle ? (
              <p className="mt-1 truncate font-mono text-[11px] text-chalk-dim">{subtitle}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-[2px] border border-hairline text-chalk-dim transition-colors hover:text-chalk"
          >
            <X width={15} height={15} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
        {footer ? <div className="border-t border-hairline p-4">{footer}</div> : null}
      </div>
    </div>
  );
}

export function Timeline({
  steps,
}: {
  steps: { label: string; detail?: string; done: boolean }[];
}) {
  return (
    <ol className="relative space-y-4 pl-5">
      <span className="absolute bottom-2 left-[5px] top-2 w-[1px] bg-hairline" />
      {steps.map((step) => (
        <li key={step.label} className="relative">
          <span
            className={cn(
              "absolute -left-5 top-1 h-2.5 w-2.5 rounded-full border",
              step.done ? "border-lime bg-lime" : "border-hairline bg-panel",
            )}
          />
          <p className={cn("text-[13px]", step.done ? "text-chalk" : "text-chalk-dim")}>
            {step.label}
          </p>
          {step.detail ? (
            <p className="mt-0.5 font-mono text-[10.5px] text-chalk-dim">{step.detail}</p>
          ) : null}
        </li>
      ))}
    </ol>
  );
}

export function KeyValue({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <dl className="grid gap-2.5">
      {rows.map(([label, value]) => (
        <div key={label} className="flex items-start justify-between gap-4">
          <dt className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-chalk-dim">
            {label}
          </dt>
          <dd className="max-w-[62%] text-right text-[12.5px] text-chalk">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

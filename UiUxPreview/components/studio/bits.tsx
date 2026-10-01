"use client";

import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function Panel({
  children,
  className,
  flush,
}: {
  children: ReactNode;
  className?: string;
  flush?: boolean;
}) {
  return (
    <section
      className={cn(
        "rounded-[3px] border border-hairline bg-panel",
        !flush && "p-5",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function PanelHead({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-start justify-between gap-4">
      <div>
        <h2 className="font-display text-[15px] font-semibold text-chalk">{title}</h2>
        {hint ? <p className="mt-1 text-[12.5px] text-chalk-dim">{hint}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function Delta({ value, invert = false }: { value: number; invert?: boolean }) {
  const good = invert ? value < 0 : value > 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-mono text-[11px] tabular-nums",
        good ? "text-lime" : "text-ember-soft",
      )}
    >
      {value > 0 ? "\u25b2" : "\u25bc"}
      {Math.abs(value).toFixed(1)}%
    </span>
  );
}

export function StatTile({
  label,
  value,
  sub,
  delta,
  spark,
  invertDelta,
}: {
  label: string;
  value: string;
  sub?: string;
  delta?: number;
  spark?: number[];
  invertDelta?: boolean;
}) {
  return (
    <div className="rounded-[3px] border border-hairline bg-panel p-4">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-chalk-dim">
          {label}
        </span>
        {delta !== undefined ? <Delta value={delta} invert={invertDelta} /> : null}
      </div>
      <p className="mt-3 font-mono text-[24px] font-semibold tabular-nums leading-none text-chalk">
        {value}
      </p>
      {sub ? <p className="mt-1.5 text-[12px] text-chalk-dim">{sub}</p> : null}
      {spark ? <Spark values={spark} className="mt-3" /> : null}
    </div>
  );
}

function Spark({ values, className }: { values: number[]; className?: string }) {
  const max = Math.max(...values, 1);
  const line = values
    .map((v, i) => {
      const x = (i / Math.max(1, values.length - 1)) * 100;
      const y = 30 - (v / max) * 28;
      return `${i ? "L" : "M"}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
  return (
    <svg viewBox="0 0 100 30" preserveAspectRatio="none" className={cn("h-8 w-full", className)}>
      <path d={`${line} L100,30 L0,30 Z`} fill="rgba(201,242,77,0.10)" />
      <path d={line} fill="none" stroke="#c9f24d" strokeWidth={1.2} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

type Tone = "neutral" | "success" | "warn" | "danger" | "info" | "lime" | "ember";

const TONES: Record<Tone, string> = {
  neutral: "border-hairline text-chalk-dim",
  success: "border-lime/35 bg-lime/10 text-lime",
  warn: "border-sand/35 bg-sand/10 text-sand",
  danger: "border-ember/40 bg-ember/12 text-ember-soft",
  info: "border-azure/40 bg-azure/12 text-azure",
  lime: "border-lime/35 bg-lime/10 text-lime",
  ember: "border-ember/40 bg-ember/12 text-ember-soft",
};

export function Pill({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-[2px] border px-2 py-[3px] font-mono text-[10px] uppercase tracking-[0.12em]",
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Toolbar({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>{children}</div>
  );
}

export function StudioButton({
  children,
  onClick,
  variant = "ghost",
  className,
  type = "button",
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
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
      onClick={onClick}
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

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
}) {
  return (
    <div className={cn("inline-flex rounded-[2px] border border-hairline p-[3px]", className)}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            "cursor-pointer rounded-[2px] px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.12em] transition-colors",
            value === option.value
              ? "bg-panel-2 text-chalk"
              : "text-chalk-dim hover:text-chalk",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function TableWrap({ children }: { children: ReactNode }) {
  return (
    <div className="-mx-5 overflow-x-auto px-5">
      <table className="w-full min-w-[720px] border-collapse text-left">{children}</table>
    </div>
  );
}

export function Th({
  children,
  className,
  align = "left",
}: {
  children?: ReactNode;
  className?: string;
  align?: "left" | "right" | "center";
}) {
  return (
    <th
      className={cn(
        "border-b border-hairline pb-2.5 font-mono text-[10px] font-normal uppercase tracking-[0.14em] text-chalk-dim",
        align === "right" && "text-right",
        align === "center" && "text-center",
        className,
      )}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  className,
  align = "left",
}: {
  children?: ReactNode;
  className?: string;
  align?: "left" | "right" | "center";
}) {
  return (
    <td
      className={cn(
        "border-b border-hairline/60 py-3 text-[13px] text-chalk",
        align === "right" && "text-right",
        align === "center" && "text-center",
        className,
      )}
    >
      {children}
    </td>
  );
}

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-chalk-dim">
        {label}
      </span>
      <div className="mt-1.5">{children}</div>
      {hint ? <span className="mt-1 block text-[11.5px] text-chalk-dim">{hint}</span> : null}
    </label>
  );
}

export const inputClass =
  "h-9 w-full rounded-[2px] border border-hairline bg-void px-3 text-[13px] text-chalk outline-none transition-colors placeholder:text-chalk-dim/70 focus:border-chalk-dim";

export const selectClass = cn(inputClass, "cursor-pointer");

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  Eyebrow as SharedEyebrow,
  Pill as SharedPill,
  type Tone as SharedTone,
} from "@/components/shared/ui";

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
    <section className={cn("min-w-0 rounded-[14px] border border-hairline bg-panel shadow-[0_2px_14px_rgba(16,45,67,0.06)]", !flush && "p-3 sm:p-5", className)}>
      {children}
    </section>
  );
}

export function PanelHead({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h2 className="font-display text-[15px] font-bold text-chalk">{title}</h2>
        {hint ? <p className="mt-1 text-[12.5px] text-chalk-dim">{hint}</p> : null}
      </div>
      {action}
    </div>
  );
}

type Tone =
  | "neutral"
  | "success"
  | "warn"
  | "danger"
  | "info"
  | "signal"
  | "amber"
  | "rose"
  | "mint"
  | "violet";

/**
 * The palette names this console already used are aliases for the five shared
 * semantic tones, so a status that means "good" is spelled the same way here as
 * in the seller workspace. The rendering itself lives in the shared module.
 */
const ALIAS: Record<Tone, SharedTone> = {
  neutral: "neutral",
  success: "success",
  warn: "warn",
  danger: "danger",
  info: "info",
  signal: "info",
  amber: "warn",
  rose: "danger",
  mint: "success",
  violet: "info",
};

export function Pill({ children, tone = "neutral", className }: { children: ReactNode; tone?: Tone; className?: string }) {
  return (
    <SharedPill tone={ALIAS[tone]} className={className}>
      {children}
    </SharedPill>
  );
}

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <SharedEyebrow className={className}>{children}</SharedEyebrow>;
}

export function Readout({
  label,
  value,
  sub,
  icon,
  tone = "signal",
}: {
  label: string;
  value: string;
  sub?: string;
  icon?: ReactNode;
  tone?: Tone;
}) {
  const colors: Record<string, string> = {
    signal: "text-signal",
    amber: "text-amber",
    rose: "text-rose",
    mint: "text-mint",
    violet: "text-violet",
    neutral: "text-chalk",
  };
  const bars: Record<string, string> = {
    signal: "bg-signal",
    amber: "bg-amber",
    rose: "bg-rose",
    mint: "bg-mint",
    violet: "bg-violet",
    neutral: "bg-chalk-dim",
  };
  return (
    <div className="relative flex min-h-[72px] min-w-0 items-center gap-2 overflow-hidden rounded-[14px] border border-hairline bg-panel p-2 shadow-[0_2px_14px_rgba(16,45,67,0.06)] sm:min-h-[94px] sm:gap-2.5 sm:p-4 sm:pl-5">
      {icon ? <span className={cn("grid h-7 w-7 shrink-0 place-items-center rounded-[10px] bg-panel-2 [&>svg]:h-4 [&>svg]:w-4", colors[tone])}>{icon}</span> : null}
      <div className="min-w-0 flex-1">
        <span className="block truncate font-mono text-[8px] leading-tight uppercase tracking-[0.08em] text-chalk-dim sm:text-[10px] sm:tracking-[0.12em]">{label}</span>
        <p className="mt-1 font-display text-[17px] font-bold leading-none tabular-nums text-chalk sm:mt-2 sm:text-[22px]">{value}</p>
        {sub ? <p className="mt-1 hidden truncate text-[10px] text-chalk-dim sm:block sm:text-[12px]">{sub}</p> : null}
      </div>
      <span className={cn("absolute inset-y-0 left-0 w-[2px]", bars[tone])} />
    </div>
  );
}

export function Meter({ value, max, tone = "signal" }: { value: number; max: number; tone?: "signal" | "amber" | "rose" | "violet" }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  const colors = { signal: "bg-signal", amber: "bg-amber", rose: "bg-rose", violet: "bg-violet" };
  return (
    <span className="block h-1.5 w-full overflow-hidden rounded-full bg-panel-2">
      <span className={cn("block h-full rounded-full", colors[tone])} style={{ width: `${pct}%` }} />
    </span>
  );
}

export function Empty({ title, body }: { title: string; body: string }) {
  return (
    <div className="min-w-0 rounded-[14px] border border-dashed border-hairline px-6 py-12 text-center">
      <p className="font-display text-[16px] font-semibold text-chalk">{title}</p>
      <p className="mx-auto mt-2 max-w-[48ch] text-[13px] leading-relaxed text-chalk-dim">{body}</p>
    </div>
  );
}

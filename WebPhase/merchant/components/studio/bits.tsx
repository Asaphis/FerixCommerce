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
    <section className={cn("min-w-0 rounded-[2px] rounded-tr-[9px] border border-hairline bg-panel", !flush && "p-3 sm:p-5", className)}>
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
    <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <h2 className="font-display text-[15px] font-semibold text-chalk">{title}</h2>
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
  | "lime"
  | "signal"
  | "amber"
  | "rose"
  | "mint"
  | "violet";

/**
 * The palette names this console already used are aliases for the five shared
 * semantic tones, so a status that means "good" is spelled the same way here as
 * in the admin console. The rendering itself lives in the shared module.
 */
const ALIAS: Record<Tone, SharedTone> = {
  neutral: "neutral",
  success: "success",
  warn: "warn",
  danger: "danger",
  info: "info",
  lime: "success",
  signal: "info",
  amber: "warn",
  rose: "danger",
  mint: "success",
  violet: "info",
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
    <SharedPill tone={ALIAS[tone]} className={className}>
      {children}
    </SharedPill>
  );
}

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <SharedEyebrow className={className}>{children}</SharedEyebrow>;
}

export function StatTile({
  label,
  value,
  sub,
  icon,
  accent = "lime",
}: {
  label: string;
  value: string;
  sub?: string;
  icon?: ReactNode;
  accent?: "lime" | "ember" | "azure" | "sand" | "chalk";
}) {
  const colors = {
    lime: "text-lime",
    ember: "text-ember-soft",
    azure: "text-azure",
    sand: "text-sand",
    chalk: "text-chalk",
  };
  return (
    <div className="flex min-h-[82px] min-w-0 items-center gap-2.5 rounded-[2px] rounded-tr-[9px] border border-hairline bg-panel p-2.5 sm:min-h-[94px] sm:p-4">
      {icon ? <span className={cn("shrink-0 [&>svg]:h-4 [&>svg]:w-4", colors[accent])}>{icon}</span> : null}
      <div className="min-w-0 flex-1">
        <span className="block line-clamp-2 break-words font-mono text-[8.5px] leading-tight uppercase tracking-[0.08em] text-chalk-dim sm:line-clamp-none sm:text-[10px] sm:tracking-[0.16em]">{label}</span>
        <p className="mt-1 font-mono text-[17px] font-semibold leading-none tabular-nums text-chalk sm:mt-2 sm:text-[22px]">{value}</p>
        {sub ? <p className="mt-1 truncate text-[10px] text-chalk-dim sm:mt-1.5 sm:text-[12px]">{sub}</p> : null}
      </div>
    </div>
  );
}

export function Bar({ value, max, tone = "lime" }: { value: number; max: number; tone?: "lime" | "ember" | "azure" }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  const colors = { lime: "bg-lime", ember: "bg-ember", azure: "bg-azure" };
  return (
    <span className="block h-1.5 w-full overflow-hidden rounded-[1px] bg-panel-2">
      <span className={cn("block h-full rounded-[1px]", colors[tone])} style={{ width: `${pct}%` }} />
    </span>
  );
}

export function Empty({ title, body }: { title: string; body: string }) {
  return (
    <div className="min-w-0 rounded-[2px] border border-dashed border-hairline px-6 py-12 text-center">
      <p className="font-display text-[16px] font-semibold text-chalk">{title}</p>
      <p className="mx-auto mt-2 max-w-[46ch] text-[13px] leading-relaxed text-chalk-dim">{body}</p>
    </div>
  );
}

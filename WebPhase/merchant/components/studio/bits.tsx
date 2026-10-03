import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

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
    <section className={cn("rounded-[3px] border border-hairline bg-panel", !flush && "p-5", className)}>
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
      <div>
        <h2 className="font-display text-[15px] font-semibold text-chalk">{title}</h2>
        {hint ? <p className="mt-1 text-[12.5px] text-chalk-dim">{hint}</p> : null}
      </div>
      {action}
    </div>
  );
}

type Tone = "neutral" | "success" | "warn" | "danger" | "info" | "lime";

const TONES: Record<Tone, string> = {
  neutral: "border-hairline text-chalk-dim",
  success: "border-lime/35 bg-lime/10 text-lime",
  warn: "border-sand/35 bg-sand/10 text-sand",
  danger: "border-ember/40 bg-ember/12 text-ember-soft",
  info: "border-azure/40 bg-azure/12 text-azure",
  lime: "border-lime/35 bg-lime/10 text-lime",
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

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn("font-mono text-[10px] uppercase tracking-[0.16em] text-chalk-dim", className)}>
      {children}
    </span>
  );
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
    <div className="rounded-[3px] border border-hairline bg-panel p-4">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-chalk-dim">{label}</span>
        {icon ? <span className={colors[accent]}>{icon}</span> : null}
      </div>
      <p className="mt-3 font-mono text-[22px] font-semibold leading-none tabular-nums text-chalk">{value}</p>
      {sub ? <p className="mt-1.5 text-[12px] text-chalk-dim">{sub}</p> : null}
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
    <div className="rounded-[3px] border border-dashed border-hairline px-6 py-12 text-center">
      <p className="font-display text-[16px] font-semibold text-chalk">{title}</p>
      <p className="mx-auto mt-2 max-w-[46ch] text-[13px] leading-relaxed text-chalk-dim">{body}</p>
    </div>
  );
}

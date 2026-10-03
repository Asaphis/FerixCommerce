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

export function PanelHead({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
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

type Tone = "neutral" | "signal" | "amber" | "rose" | "mint" | "violet";

const TONES: Record<Tone, string> = {
  neutral: "border-hairline text-chalk-dim",
  signal: "border-signal/40 bg-signal/10 text-signal",
  amber: "border-amber/40 bg-amber/10 text-amber",
  rose: "border-rose/40 bg-rose/12 text-rose",
  mint: "border-mint/40 bg-mint/10 text-mint",
  violet: "border-violet/40 bg-violet/10 text-violet",
};

export function Pill({ children, tone = "neutral", className }: { children: ReactNode; tone?: Tone; className?: string }) {
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
  return <span className={cn("font-mono text-[10px] uppercase tracking-[0.18em] text-chalk-dim", className)}>{children}</span>;
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
    <div className="relative overflow-hidden rounded-[3px] border border-hairline bg-panel p-4 pl-5">
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-chalk-dim">{label}</span>
        {icon ? <span className={colors[tone]}>{icon}</span> : null}
      </div>
      <p className="mt-3 font-mono text-[22px] font-semibold leading-none tabular-nums text-chalk">{value}</p>
      {sub ? <p className="mt-1.5 text-[12px] text-chalk-dim">{sub}</p> : null}
      <span className={cn("absolute inset-y-0 left-0 w-[2px]", bars[tone])} />
    </div>
  );
}

export function Meter({ value, max, tone = "signal" }: { value: number; max: number; tone?: "signal" | "amber" | "rose" | "violet" }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  const colors = { signal: "bg-signal", amber: "bg-amber", rose: "bg-rose", violet: "bg-violet" };
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
      <p className="mx-auto mt-2 max-w-[48ch] text-[13px] leading-relaxed text-chalk-dim">{body}</p>
    </div>
  );
}

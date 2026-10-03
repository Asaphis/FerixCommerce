import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** The console mark — a signal glyph, distinct from the storefront and seller marks. */
export function OpsMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("h-7 w-7", className)} aria-hidden="true">
      <rect width="32" height="32" rx="6" fill="#16202c" />
      <path d="M7 22h4v-8H7zM14 22h4V8h-4zM21 22h4v-5h-4z" fill="#6ee7ff" />
    </svg>
  );
}

/** Daily bars for platform analytics. */
export function TrendChart({
  values,
  labels,
  tone = "signal",
  className,
}: {
  values: number[];
  labels?: string[];
  tone?: "signal" | "amber" | "violet";
  className?: string;
}) {
  const max = Math.max(...values, 1);
  const color = tone === "signal" ? "bg-signal" : tone === "amber" ? "bg-amber" : "bg-violet";
  return (
    <div className={className}>
      <div className="flex h-32 items-end gap-[3px]">
        {values.map((value, index) => (
          <span
            key={index}
            className={cn("flex-1 rounded-t-[1px]", color)}
            style={{ height: `${Math.max(2, (value / max) * 100)}%`, opacity: 0.4 + (value / max) * 0.6 }}
            title={labels?.[index] ? `${labels[index]}: ${value}` : String(value)}
          />
        ))}
      </div>
      {labels ? (
        <div className="mt-2 flex justify-between font-mono text-[9.5px] text-chalk-dim">
          <span>{labels[0]}</span>
          <span>{labels[Math.floor(labels.length / 2)]}</span>
          <span>{labels[labels.length - 1]}</span>
        </div>
      ) : null}
    </div>
  );
}

/** A distribution strip with a legend — used for order states and plan mix. */
export function Distribution({ rows }: { rows: { label: string; value: number; tone: string }[] }) {
  const total = rows.reduce((sum, row) => sum + row.value, 0) || 1;
  const colors: Record<string, string> = {
    signal: "bg-signal",
    amber: "bg-amber",
    rose: "bg-rose",
    mint: "bg-mint",
    violet: "bg-violet",
    neutral: "bg-chalk-dim",
  };
  return (
    <div>
      <div className="flex h-2 overflow-hidden rounded-[1px]">
        {rows.map((row) => (
          <span
            key={row.label}
            className={cn("h-full", colors[row.tone] ?? colors.neutral)}
            style={{ width: `${(row.value / total) * 100}%` }}
            title={`${row.label}: ${row.value}`}
          />
        ))}
      </div>
      <ul className="mt-3 space-y-1.5">
        {rows.map((row) => (
          <li key={row.label} className="flex items-center gap-2.5">
            <span className={cn("h-2 w-2 shrink-0 rounded-[1px]", colors[row.tone] ?? colors.neutral)} />
            <span className="flex-1 text-[12.5px] text-chalk-dim">{row.label}</span>
            <span className="font-mono text-[12.5px] tabular-nums text-chalk">{row.value}</span>
            <span className="w-12 text-right font-mono text-[11px] text-chalk-dim">
              {Math.round((row.value / total) * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Operator identity block for the sidebar. */
export function Operator({ email, platformName }: { email: string; platformName: string }) {
  return (
    <div className="mx-4 mb-4 rounded-[2px] border border-hairline bg-panel-2 p-3">
      <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-chalk-dim">Signed in as</p>
      <p className="mt-1 truncate text-[12.5px] font-medium text-chalk">{email}</p>
      <p className="font-mono text-[10px] text-signal">{platformName} console</p>
    </div>
  );
}

export function KeyValue({ label, value }: { label: string; value: ReactNode }) {
  return (
    <li className="flex items-center justify-between gap-3">
      <span className="text-chalk-dim">{label}</span>
      <span className="font-mono text-chalk">{value}</span>
    </li>
  );
}

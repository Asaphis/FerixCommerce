// GENERATED FILE — do not edit. Source: WebPhase/shared/ui.tsx (run `node sync-shared.mjs`).
/**
 * Ferixas shared UI primitives — the single source of truth.
 *
 * This file is copied verbatim into each app by `sync-shared.mjs`. Never edit
 * the generated copies; edit this file and run the sync.
 *
 * Tones resolve through CSS custom properties (`--tone-*`) that each app
 * defines in its own `globals.css`, keeping the same Ferixas orange/navy
 * identity and accessible status colors across every surface.
 */

import type { ReactNode } from "react";

export type Tone = "neutral" | "success" | "warn" | "danger" | "info";

const TONE_CLASS: Record<Tone, string> = {
  neutral: "border-hairline text-chalk-dim",
  success: "border-[color:var(--tone-success)]/40 bg-[color:var(--tone-success)]/10 text-[color:var(--tone-success)]",
  warn: "border-[color:var(--tone-warn)]/40 bg-[color:var(--tone-warn)]/10 text-[color:var(--tone-warn)]",
  danger: "border-[color:var(--tone-danger)]/40 bg-[color:var(--tone-danger)]/12 text-[color:var(--tone-danger)]",
  info: "border-[color:var(--tone-info)]/40 bg-[color:var(--tone-info)]/12 text-[color:var(--tone-info)]",
};

export function Pill({
  children,
  tone = "neutral",
  className = "",
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-[2px] rounded-tr-[7px] border px-2.5 py-1 font-sans text-[9.5px] font-bold uppercase tracking-[0.07em] ${TONE_CLASS[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

export function Eyebrow({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <span className={`font-sans text-[10px] font-bold uppercase tracking-[0.1em] text-chalk-dim ${className}`}>
      {children}
    </span>
  );
}

/** Inline label for a value in a phone card, so a bare number still reads. */
export function CellLabel({ children }: { children: ReactNode }) {
  return (
    <span className="mr-1.5 font-sans text-[9px] font-semibold uppercase tracking-[0.08em] text-chalk-dim/80 md:hidden">
      {children}
    </span>
  );
}

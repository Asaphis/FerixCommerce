import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * The shared table pattern for the seller workspace.
 *
 * Every list screen renders ONE `.map()` and ONE DOM node per record. Below
 * 768px the row is a flex card and the `TdDetail` columns drop out; from 768px
 * up it is a real table that scrolls inside its own panel. Because both layouts
 * come from the same markup they cannot drift apart, and the panel never widens
 * the page - see the `.grid > *` rule in globals.css.
 */

export function TablePanel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <section className={cn("min-w-0 rounded-[2px] border border-hairline bg-panel", className)}>
      {children}
    </section>
  );
}

export function DataTable({
  head,
  minWidth = 720,
  children,
  className,
}: {
  head: string[];
  /** Table min-width from 768px up, in px. */
  minWidth?: number;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0 overflow-x-auto", className)}>
      <table className="data-table" style={{ "--table-min": `${minWidth}px` } as CSSProperties}>
        <thead>
          <tr className="hidden md:table-row">
            {head.map((label, index) => (
              <th
                key={label || index}
                className="border-b border-hairline pb-2.5 font-mono text-[10px] font-normal uppercase tracking-[0.14em] text-chalk-dim"
              >
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

/** A record. Card below 768px, table row above. */
export function Row({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <tr
      className={cn(
        "mb-2 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-[12px] border border-hairline bg-panel p-3 last:mb-0",
        "md:mb-0 md:table-row md:rounded-none md:border-x-0 md:border-t-0 md:border-b md:border-hairline/60 md:bg-transparent md:p-0 md:py-0 md:align-top",
        className,
      )}
    >
      {children}
    </tr>
  );
}

/** The identifying column - always visible, takes the full card width on phones. */
export function TdLead({ children, className }: { children: ReactNode; className?: string }) {
  return <td className={cn("w-full min-w-0 py-0 md:w-auto md:py-3 md:pr-4", className)}>{children}</td>;
}

/** A column that stays visible in both layouts. */
export function Td({ children, className }: { children: ReactNode; className?: string }) {
  return <td className={cn("py-0 md:py-3 md:pr-4", className)}>{children}</td>;
}

/** A secondary column - hidden in the phone card, shown from 768px up. */
export function TdDetail({ children, className }: { children: ReactNode; className?: string }) {
  return <td className={cn("hidden py-3 pr-4 md:table-cell", className)}>{children}</td>;
}

/** The trailing action column - pushed right in the card, normal in the table. */
export function TdEnd({ children, className }: { children: ReactNode; className?: string }) {
  return <td className={cn("ml-auto py-0 text-right md:ml-0 md:py-3", className)}>{children}</td>;
}

/** Inline label for a value in the phone card, so a bare number still reads. */
export function CellLabel({ children }: { children: ReactNode }) {
  return (
    <span className="mr-1.5 font-mono text-[9.5px] uppercase tracking-[0.14em] text-chalk-dim/70 md:hidden">
      {children}
    </span>
  );
}

/**
 * ── The row-action rule ────────────────────────────────────────────────────
 * Every list row ends with the same two things, in the same order:
 *
 *   1. ONE labelled action that opens or manages the record.
 *   2. A ⋯ menu holding everything rare or destructive.
 *
 * Before this, actions were invented per page: catalogue rows had Delete only,
 * order, customer and merchant rows had nothing at all. A person could not tell
 * what a record allowed, because two lists disagreed.
 *
 * The menu is a <details> element, so it works in a server component with no
 * client JavaScript. Destructive items belong inside a form that confirms.
 */
export function RowActions({ children }: { children: ReactNode }) {
  return <div className="flex items-center justify-end gap-1.5">{children}</div>;
}

/** The one labelled action every row has. */
export function RowAction({
  children,
  href,
  tone = "quiet",
}: {
  children: ReactNode;
  href?: string;
  tone?: "quiet" | "primary";
}) {
  const cls = cn(
    "inline-flex min-h-8 shrink-0 items-center gap-1.5 rounded-[10px] border px-2.5 text-[11.5px] font-semibold transition-colors",
    tone === "primary"
      ? "border-signal bg-signal text-white hover:bg-[#e4572e]"
      : "border-hairline text-chalk-dim hover:border-signal/40 hover:text-signal",
  );
  if (href) return <Link href={href} className={cls}>{children}</Link>;
  return <span className={cls}>{children}</span>;
}

/** Rare and destructive actions, behind ⋯. No client JavaScript required. */
export function RowMenu({ label = "More actions", children }: { label?: string; children: ReactNode }) {
  return (
    <details className="relative">
      <summary
        aria-label={label}
        className="grid h-8 w-8 cursor-pointer list-none place-items-center rounded-[10px] border border-hairline text-chalk-dim transition-colors hover:border-signal/40 hover:text-signal [&::-webkit-details-marker]:hidden"
      >
        <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true">
          <circle cx="6" cy="12" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="18" cy="12" r="1.6" />
        </svg>
      </summary>
      <div className="absolute right-0 z-30 mt-1 grid min-w-[180px] gap-0.5 rounded-[12px] border border-hairline bg-panel p-1 shadow-[0_18px_40px_-22px_rgba(16,45,67,0.45)]">
        {children}
      </div>
    </details>
  );
}

export function RowMenuItem({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "danger";
}) {
  return (
    <button
      type="submit"
      className={cn(
        "flex w-full items-center gap-2 rounded-[8px] px-2.5 py-2 text-left text-[12px] font-medium transition-colors",
        tone === "danger" ? "text-[#c0392b] hover:bg-[#fdecea]" : "text-chalk hover:bg-[#f1f5f9]",
      )}
    >
      {children}
    </button>
  );
}

/** Empty state for a filtered list, so a person knows what to do next. */
export function RowEmpty({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-[12px] border border-dashed border-hairline px-6 py-10 text-center">
      <p className="font-display text-[15px] font-semibold text-chalk">{title}</p>
      <p className="mx-auto mt-1.5 max-w-[46ch] text-[12.5px] leading-relaxed text-chalk-dim">{body}</p>
    </div>
  );
}

import type { CSSProperties, ReactNode } from "react";
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
        "flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-hairline/60 py-3 last:border-0",
        "md:table-row md:py-0 md:align-top",
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

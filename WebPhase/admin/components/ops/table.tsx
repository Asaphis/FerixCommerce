import type { ReactNode } from "react";
import { Panel, Eyebrow } from "@/components/ops/bits";
import { cn } from "@/lib/utils";

/**
 * Form control classes.
 *
 * These MUST live outside a "use client" module. Pages are server components,
 * and a value imported from a client module into server code becomes an opaque
 * client reference — calling it throws. They previously sat in controls.tsx
 * (which is "use client") and were imported by ten server pages, so every
 * className came out as an error string and those fields lost all styling.
 */
export const inputClass =
  "h-11 w-full rounded-[2px] border border-hairline bg-panel-2 px-3 text-[13px] text-chalk outline-none transition-colors placeholder:text-chalk-dim/60 focus:border-signal/60";
export const selectClass = inputClass;
export const textareaClass = cn(inputClass, "h-[92px] resize-y py-2");
export const labelClass = "font-mono text-[9.5px] uppercase tracking-[0.14em] text-chalk-dim";

/**
 * Shared responsive table + page-header primitives for the platform console.
 *
 * The console is dense with tabular data. Below `md` a nine-column table is
 * unreadable, so every list renders twice from ONE set of row markup: a real
 * table from `md` up, and a card per record below it. The card and the table
 * row are the same element — `flex` becomes `table-row` at `md` — so pages keep
 * a single `.map()` and there is no duplicated markup to drift apart.
 *
 * A wrapper around a wide table MUST carry `min-w-0` (these components do) and
 * the table's own `min-width` must be `md:`-scoped. A grid/flex item defaults to
 * `min-width: auto`, so an unconditional `min-w-[1040px]` table refuses to be
 * clipped by its panel and instead widens the whole page, giving the document a
 * horizontal scrollbar. That single omission is why some pages scrolled
 * sideways at every width.
 */

/** Widths are literal Tailwind classes so the JIT can see them in source. */
type MinWidth = "md:min-w-[560px]" | "md:min-w-[620px]" | "md:min-w-[700px]" | "md:min-w-[760px]"
  | "md:min-w-[860px]" | "md:min-w-[880px]" | "md:min-w-[900px]" | "md:min-w-[960px]"
  | "md:min-w-[980px]" | "md:min-w-[1000px]" | "md:min-w-[1040px]" | "md:min-w-[1080px]";

/** Panel + padding, safe to hold a table that is wider than the viewport. */
export function TablePanel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <Panel flush className={className}>
      <div className="min-w-0 p-4 md:overflow-x-auto md:p-5">{children}</div>
    </Panel>
  );
}

/** Head that sits above a flush table without breaking its padding. */
export function TablePanelHead({ children }: { children: ReactNode }) {
  return <div className="min-w-0 px-4 pb-3 pt-4 md:px-5 md:pt-5">{children}</div>;
}

/** Table with a generated head row that disappears below `md`. */
export function DataTable({
  head,
  children,
  minWidthClass,
}: {
  head: string[];
  children: ReactNode;
  minWidthClass: MinWidth;
}) {
  return (
    <table className={cn("w-full min-w-0 border-collapse text-left", minWidthClass)}>
      <thead>
        <tr className="hidden border-b border-hairline md:table-row">
          {head.map((label) => (
            <th
              key={label}
              className="border-b border-hairline pb-2.5 font-mono text-[10px] font-normal uppercase tracking-[0.14em] text-chalk-dim"
            >
              {label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
  );
}

/** One record: a card below `md`, a table row from `md` up. */
export function Row({ children }: { children: ReactNode }) {
  return (
    <tr className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-hairline/60 py-3 last:border-0 md:table-row md:py-0">
      {children}
    </tr>
  );
}

/** Leading cell: full width below `md`, an ordinary cell above. */
export function TdLead({ children, className }: { children: ReactNode; className?: string }) {
  return <td className={cn("w-full min-w-0 py-0 md:w-auto md:py-3 md:pr-4", className)}>{children}</td>;
}

/** Ordinary cell. */
export function Td({ children, className }: { children: ReactNode; className?: string }) {
  return <td className={cn("py-0 md:py-3 md:pr-4", className)}>{children}</td>;
}

/** Field kept for the desktop table but dropped from the card. */
export function TdDetail({ children, className }: { children: ReactNode; className?: string }) {
  return <td className={cn("hidden py-0 md:table-cell md:py-3 md:pr-4", className)}>{children}</td>;
}

/** Trailing cell: right-aligned on the card, ordinary above `md`. */
export function TdEnd({ children, className }: { children: ReactNode; className?: string }) {
  return <td className={cn("ml-auto py-0 text-right md:ml-0 md:py-3", className)}>{children}</td>;
}

/** Inline label so a bare value still reads inside a card. */
export function CellLabel({ children }: { children: ReactNode }) {
  return (
    <span className="mr-1.5 font-mono text-[9.5px] uppercase tracking-[0.14em] text-chalk-dim/70 md:hidden">
      {children}
    </span>
  );
}

/**
 * Consistent page header: eyebrow, title, description, then actions stacked on
 * their own row. Keeps the same rhythm on every console screen instead of each
 * page inventing its own header layout.
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  back,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  back?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <header className="min-w-0">
      {back}
      {eyebrow ? <Eyebrow className={back ? "mt-2 block" : undefined}>{eyebrow}</Eyebrow> : null}
      <h1 className="mt-1.5 font-display text-[20px] font-semibold text-chalk sm:text-[23px]">{title}</h1>
      {description ? (
        <p className="mt-1.5 max-w-[74ch] text-[13px] leading-relaxed text-chalk-dim">{description}</p>
      ) : null}
      {action ? <div className="mt-3 flex flex-wrap items-center gap-1.5">{action}</div> : null}
    </header>
  );
}

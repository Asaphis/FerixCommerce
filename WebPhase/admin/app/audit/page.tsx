import Link from "next/link";
import { History } from "lucide-react";
import { requireAdmin } from "@/lib/data";
import { getAudit } from "@/lib/api";
import { Empty, Eyebrow, Panel, PanelHead, Pill } from "@/components/ops/bits";
import { titleCase } from "@/lib/format";
import { cn } from "@/lib/utils";

const GROUPS = [
  { id: "all", label: "Everything" },
  { id: "cms.", label: "Content" },
  { id: "catalog.", label: "Catalogue" },
  { id: "category.", label: "Departments" },
  { id: "collection.", label: "Collections" },
  { id: "promotion.", label: "Promotions" },
  { id: "merchant.", label: "Merchants" },
  { id: "settings.", label: "Settings" },
  { id: "staff.", label: "Team" },
];

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ group?: string }> }) {
  const { group } = await searchParams;
  const active = group ?? "all";
  const { session } = await requireAdmin();
  const { events } = await getAudit(session, 300);
  const filtered = active === "all" ? events : events.filter((event) => event.action.startsWith(active));

  return (
    <div className="grid min-w-0 gap-5">
      <header>
        <Eyebrow>Control</Eyebrow>
        <h1 className="mt-1.5 font-display text-[23px] font-semibold text-chalk">Audit log</h1>
        <p className="mt-1.5 max-w-[74ch] text-[13px] leading-relaxed text-chalk-dim">
          An append-only record of every change made through the console and the seller workspace. It cannot be
          edited from here.
        </p>
      </header>

      <div className="flex flex-wrap gap-1.5">
        {GROUPS.map((item) => (
          <Link
            key={item.id}
            href={item.id === "all" ? "/audit" : `/audit?group=${encodeURIComponent(item.id)}`}
            className={cn(
              "inline-flex min-h-[44px] items-center rounded-[2px] border px-3 font-mono text-[10px] uppercase tracking-[0.12em] transition-colors",
              active === item.id
                ? "border-signal/40 bg-signal/10 text-signal"
                : "border-hairline text-chalk-dim hover:bg-panel-2 hover:text-chalk",
            )}
          >
            {item.label}
          </Link>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Empty
          title="Nothing recorded here yet"
          body="Changes made in the console, the CMS and the seller workspace all land in this log."
        />
      ) : (
        <Panel flush className="overflow-hidden">
          <div className="min-w-0 md:overflow-x-auto">
            <table className="w-full min-w-0 border-collapse text-left md:min-w-[900px]">
              <thead>
                <tr className="hidden border-b border-hairline md:table-row">
                  {["When", "Actor", "Action", "Target", "Detail"].map((head) => (
                    <th key={head} className="px-4 py-3 font-mono text-[9.5px] uppercase tracking-[0.14em] text-chalk-dim">
                      {head}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((event) => (
                  <tr
                    key={event.id}
                    className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-hairline px-4 py-3 last:border-0 hover:bg-panel-2 md:table-row md:px-0 md:py-0"
                  >
                    <td className="w-full min-w-0 px-0 py-0 md:w-auto md:px-4 md:py-3">
                      <p className="font-mono text-[11.5px] text-chalk-dim">{new Date(event.at).toLocaleString("en-GB")}</p>
                      <p className="mt-0.5 font-mono text-[12px] text-chalk md:hidden">
                        {titleCase(event.action.replace(/\./g, " "))}
                      </p>
                      <p className="mt-0.5 font-mono text-[10.5px] text-chalk-dim md:hidden">
                        {event.actorType} {event.actorId}
                      </p>
                    </td>
                    <td className="hidden px-4 py-3 md:table-cell">
                      <div className="flex flex-wrap items-center gap-2">
                        <Pill tone={event.actorType === "admin" ? "violet" : "mint"}>{event.actorType}</Pill>
                        <span className="font-mono text-[11.5px] text-chalk-dim">{event.actorId}</span>
                      </div>
                    </td>
                    <td className="hidden px-4 py-3 font-mono text-[12px] text-chalk md:table-cell">
                      {titleCase(event.action.replace(/\./g, " "))}
                    </td>
                    <td className="hidden px-4 py-3 font-mono text-[11.5px] text-chalk-dim md:table-cell">{event.target || "—"}</td>
                    <td className="hidden px-4 py-3 text-[12.5px] text-chalk-dim md:table-cell">{event.detail || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-chalk-dim">
        <History width={11} height={11} className="mr-1 inline" />
        Showing {filtered.length} of {events.length} events
      </p>
    </div>
  );
}

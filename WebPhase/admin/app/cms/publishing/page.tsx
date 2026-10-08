import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireAdmin } from "@/lib/data";
import { getAudit, getDocument } from "@/lib/api";
import { SubmitButton } from "@/components/ops/controls";
import { Empty, Eyebrow, Panel, PanelHead, Pill } from "@/components/ops/bits";
import { restoreVersionAction } from "@/lib/ops-actions";
import { titleCase } from "@/lib/format";

const DOCUMENT_ID = "doc_marketplace_home";

export default async function PublishingPage() {
  const { session } = await requireAdmin();
  const [{ document, versions }, { events }] = await Promise.all([
    getDocument(session, DOCUMENT_ID),
    getAudit(session, 200),
  ]);
  const cmsEvents = events.filter((event) => event.action.startsWith("cms."));

  return (
    <div className="grid min-w-0 gap-5">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/cms"
            className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-chalk-dim transition-colors hover:text-chalk"
          >
            <ArrowLeft width={13} height={13} />
            Content
          </Link>
          <h1 className="mt-2 font-display text-[23px] font-semibold text-chalk">Publishing</h1>
          
        </div>
        <Pill tone={document.status === "published" ? "mint" : "amber"}>{document.status}</Pill>
      </header>

      <Panel>
        <PanelHead title="Homepage versions" hint={`Document ${DOCUMENT_ID}`} />
        {versions.length === 0 ? (
          <Empty title="No versions yet" body="Saving the homepage creates the first version." />
        ) : (
          <ul className="grid gap-2">
            {versions.map((version) => (
              <li
                key={version.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-[2px] border border-hairline bg-panel-2 px-4 py-3"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[12px] text-chalk">v{version.version}</span>
                    <Pill tone={version.status === "published" ? "mint" : "neutral"}>{version.status}</Pill>
                  </div>
                  <p className="mt-1 text-[12px] text-chalk-dim">
                    {version.note} · {version.createdBy} · {new Date(version.createdAt).toLocaleString("en-GB")}
                  </p>
                </div>
                <form action={restoreVersionAction}>
                  <input type="hidden" name="versionId" value={version.id} />
                  <SubmitButton variant="outline" pendingLabel="Restoring">
                    Restore this version
                  </SubmitButton>
                </form>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel>
        <PanelHead title="Content activity" />
        {cmsEvents.length === 0 ? (
          <Empty title="No content activity yet" body="CMS saves, publishes and restores are recorded here." />
        ) : (
          <ul className="grid gap-2">
            {cmsEvents.map((event) => (
              <li
                key={event.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-[2px] border border-hairline bg-panel-2 px-4 py-2.5"
              >
                <div className="min-w-0">
                  <p className="font-mono text-[11.5px] text-chalk">
                    {titleCase(event.action.replace("cms.", ""))}
                    {event.target ? ` · ${event.target}` : ""}
                  </p>
                  <p className="mt-0.5 truncate text-[11.5px] text-chalk-dim">
                    {event.actorId} {event.detail ? `· ${event.detail}` : ""}
                  </p>
                </div>
                <span className="font-mono text-[10.5px] text-chalk-dim">
                  {new Date(event.at).toLocaleString("en-GB")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

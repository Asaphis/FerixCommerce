import Link from "next/link";
import { ArrowLeft, Plus } from "lucide-react";
import { requireAdmin } from "@/lib/data";
import { listCmsSections } from "@/lib/api";
import { Empty, Panel, PanelHead, Pill } from "@/components/ops/bits";
import { PageHeader } from "@/components/ops/table";
import { CreateCmsSectionForm } from "./create-form";

export default async function CmsSectionsPage() {
  const { session } = await requireAdmin();
  const data = await listCmsSections(session).catch(() => ({ sections: [] }));
  const sections = data.sections;

  return (
    <div className="grid min-w-0 gap-5">
      <PageHeader
        back={
          <Link href="/cms" className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-chalk-dim transition-colors hover:text-chalk">
            <ArrowLeft width={13} height={13} /> CMS
          </Link>
        }
        eyebrow="Content"
        title="Promotional sections"
        description="Create and manage sections like Flash Sale, Trending, Best Selling, and Newest Arrivals. Sellers can request their products be featured in these sections."
        action={<Pill tone={sections.length ? "info" : "neutral"}>{sections.length} sections</Pill>}
      />

      <CreateCmsSectionForm />

      {sections.length ? (
        <div className="grid gap-4">
          {sections.map((section) => (
            <Panel key={section.id}>
              <PanelHead
                title={section.name}
                hint={section.slug}
                action={
                  <Pill tone={section.is_active ? "success" : "neutral"}>
                    {section.is_active ? "Active" : "Inactive"}
                  </Pill>
                }
              />
              {section.description && (
                <p className="text-[12.5px] leading-relaxed text-chalk-dim">{section.description}</p>
              )}
              <div className="mt-3 flex flex-wrap items-center gap-3 font-mono text-[10.5px] uppercase tracking-[0.14em] text-chalk-dim">
                <span>Sort order: {section.sort_order}</span>
              </div>
            </Panel>
          ))}
        </div>
      ) : (
        <Empty
          title="No sections yet"
          body="Create your first promotional section to let sellers request featuring their products."
        />
      )}
    </div>
  );
}

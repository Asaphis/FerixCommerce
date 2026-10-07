import Link from "next/link";
import { ArrowLeft, ArrowRight, Eye, EyeOff } from "lucide-react";
import { requireAdmin } from "@/lib/data";
import { getDocument } from "@/lib/api";
import { Field, SubmitButton } from "@/components/ops/controls";
import { inputClass, selectClass } from "@/components/ops/table";
import { Empty, Eyebrow, Panel, PanelHead, Pill } from "@/components/ops/bits";
import { CmsActionForm } from "@/components/ops/cms-action-form";
import { publishHomepageAction, restoreVersionAction, saveHomepageAction } from "@/lib/ops-actions";
import { titleCase } from "@/lib/format";

const DOCUMENT_ID = "doc_marketplace_home";

const TYPES = [
  "hero_banner",
  "promo_strip",
  "category_grid",
  "product_carousel",
  "featured_collection",
  "featured_stores",
  "editorial_story",
  "newsletter_signup",
  "rich_text",
];

const SECTION_DESTINATIONS: Record<string, { href: string; label: string }> = {
  hero_banner: { href: "/cms/banners", label: "Manage banners and hero media" },
  promo_strip: { href: "/cms/banners", label: "Manage promotional creatives" },
  category_grid: { href: "/cms/categories", label: "Manage departments and tile images" },
  product_carousel: { href: "/catalog", label: "Manage catalogue products" },
  featured_collection: { href: "/cms/collections", label: "Manage collections and cover images" },
  featured_stores: { href: "/merchants", label: "Manage merchant stores" },
  editorial_story: { href: "/cms/media", label: "Choose editorial media" },
};

export default async function HomepageCmsPage() {
  const { session } = await requireAdmin();
  const { document, versions } = await getDocument(session, DOCUMENT_ID);
  const sections = [...(document.data.sections ?? [])].sort((a, b) => a.position - b.position);

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
          <h1 className="mt-2 font-display text-[23px] font-semibold text-chalk">Homepage</h1>
          <p className="mt-1.5 max-w-[74ch] text-[13px] leading-relaxed text-chalk-dim">
            The order of these sections is the order shoppers scroll through on ferixas.com. Hiding a section
            keeps its content but removes it from the storefront.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Pill tone={document.status === "published" ? "mint" : "amber"}>{document.status}</Pill>
          <form action={publishHomepageAction}>
            <input type="hidden" name="documentId" value={DOCUMENT_ID} />
            <SubmitButton pendingLabel="Publishing">Publish</SubmitButton>
          </form>
        </div>
      </header>

      <CmsActionForm action={saveHomepageAction} className="grid gap-4">
        <input type="hidden" name="documentId" value={DOCUMENT_ID} />

        {sections.length === 0 ? (
          <Empty
            title="No sections yet"
            body="Add a section below to start shaping the storefront homepage."
          />
        ) : null}

        {sections.map((section, index) => (
          <Panel key={section.id} className="grid gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <Pill tone="signal">{titleCase(section.type)}</Pill>
                <span className="font-mono text-[10.5px] text-chalk-dim">{section.id}</span>
              </div>
              <label className="flex items-center gap-2 text-[12.5px] text-chalk-dim">
                <input type="checkbox" name={`visible_${section.id}`} defaultChecked={section.visible} className="size-4 accent-signal" />
                {section.visible ? <Eye width={14} height={14} /> : <EyeOff width={14} height={14} />}
                Visible
              </label>
              {SECTION_DESTINATIONS[section.type] ? (
                <Link href={SECTION_DESTINATIONS[section.type].href} className="inline-flex min-h-10 items-center gap-2 rounded-[.45rem] border border-hairline px-3 py-2 text-[12px] font-medium text-ink transition-colors hover:border-ember hover:text-ember">
                  {SECTION_DESTINATIONS[section.type].label}
                  <ArrowRight width={14} height={14} />
                </Link>
              ) : null}
            </div>

            <details className="rounded-[.55rem] border border-hairline bg-panel-2">
              <summary className="cursor-pointer px-4 py-3 font-mono text-[10px] uppercase tracking-[.14em] text-chalk-dim">
                Edit section title, description and layout
              </summary>
              <input type="hidden" name="sectionId" value={section.id} />
              <div className="grid gap-3 border-t border-hairline p-4 md:grid-cols-2">
              <Field title="Section type">
                <select name={`type_${section.id}`} defaultValue={section.type} className={selectClass}>
                  {TYPES.map((type) => (
                    <option key={type} value={type}>
                      {titleCase(type)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field title="Position">
                <input
                  name={`position_${section.id}`}
                  type="number"
                  min={1}
                  defaultValue={section.position || index + 1}
                  className={inputClass}
                />
              </Field>
              <Field title="Title">
                <input name={`title_${section.id}`} defaultValue={section.title ?? ""} className={inputClass} />
              </Field>
              <Field title="Section description">
                <input name={`subtitle_${section.id}`} defaultValue={section.subtitle ?? ""} className={inputClass} />
              </Field>
              <Field title="Action label">
                <input name={`ctaLabel_${section.id}`} defaultValue={section.ctaLabel ?? ""} className={inputClass} />
              </Field>
              <Field title="Action link">
                <input name={`ctaHref_${section.id}`} defaultValue={section.ctaHref ?? ""} placeholder="/browse" className={inputClass} />
              </Field>
              </div>
            </details>
          </Panel>
        ))}

        {sections.length > 0 ? (
          <div className="flex flex-wrap items-center gap-3">
            <SubmitButton pendingLabel="Saving draft">Save draft</SubmitButton>
            <span className="text-[12.5px] text-chalk-dim">
              Last saved {document.updatedBy || "—"} · {document.status}
            </span>
          </div>
        ) : null}
      </CmsActionForm>

      <Panel>
        <PanelHead
          title="Version history"
          hint="Restoring a version replaces the current draft content. Publish afterwards to go live."
        />
        {versions.length === 0 ? (
          <Empty title="No versions yet" body="The first save creates version 1." />
        ) : (
          <ul className="grid gap-2">
            {versions.map((version) => (
              <li
                key={version.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-[2px] border border-hairline bg-panel-2 px-4 py-3"
              >
                <div>
                  <p className="font-mono text-[12px] text-chalk">v{version.version}</p>
                  <p className="mt-0.5 text-[12px] text-chalk-dim">
                    {version.note} · {version.createdBy} · {version.status}
                  </p>
                </div>
                <form action={restoreVersionAction}>
                  <input type="hidden" name="versionId" value={version.id} />
                  <SubmitButton variant="outline" pendingLabel="Restoring">
                    Restore
                  </SubmitButton>
                </form>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

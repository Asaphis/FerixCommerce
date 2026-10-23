import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowDown, ArrowLeft, ArrowUp, Pencil, Trash2 } from "lucide-react";
import { requireAdmin, explain } from "@/lib/data";
import { getCmsPage, listCmsSectionTypes, type CmsSection, type CmsSectionTypes } from "@/lib/api";
import { CmsActionForm } from "@/components/ops/cms-action-form";
import { InfoPageFields } from "@/components/ops/info-page-fields";
import { FALLBACK_SECTION_TYPES, SectionPalette } from "@/components/ops/section-palette";
import { Empty, Panel, PanelHead, Pill } from "@/components/ops/bits";
import { PageHeader } from "@/components/ops/table";
import { SubmitButton } from "@/components/ops/controls";
import { moveCmsSectionAction, publishCmsPageAction, removeCmsSectionAction, toggleCmsSectionAction } from "@/lib/actions";

/** Section types in plain words. A type with no entry falls back to its own name. */
const SECTION_LABELS: Record<string, string> = {
  hero_banner: "Hero banner",
  hero_slim: "Banner",
  promo_strip: "Message strip",
  promo_slots: "Promotion slots",
  category_grid: "Department tiles",
  brand_carousel: "Brand row",
  product_carousel: "Product row",
  product_grid: "Product grid",
  featured_stores: "Stores",
  featured_collection: "Collection",
  footer: "Footer",
  product_gallery: "Gallery",
  buy_box: "Buy box",
  delivery_block: "Delivery and returns",
  reviews: "Reviews",
};

function sectionLabel(section: { type?: string; name?: string }) {
  return SECTION_LABELS[String(section.type)] ?? section.name ?? "Section";
}

/**
 * One line saying what this section is and where its content comes from.
 *
 * The distinction that used to be invisible: a manual section is filled from the
 * product form, an automatic one is filled by the catalogue, and neither is the
 * same thing as the section's own kind.
 */
function sectionMeta(section: CmsSection, sectionTypes: CmsSectionTypes): string {
  const parts: string[] = [sectionLabel(section)];
  const mode = String(section.selectionMode ?? "");
  if (mode === "manual") {
    parts.push("Manual — filled from the product form");
  } else if (mode === "automatic") {
    const source = String(section.source ?? "");
    const known = sectionTypes.automaticSources.find((item) => item.value === source);
    parts.push(`Automatic · ${known?.label ?? source}`);
  }
  if (String(section.presentation ?? "") === "flash_sale") parts.push("Flash sale campaign");
  return parts.join(" · ");
}

export default async function CmsPageSections({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { session } = await requireAdmin();

  let page;
  let loadError: string | null = null;
  try {
    page = (await getCmsPage(session, id)).page;
  } catch (error) {
    loadError = explain(error);
  }
  if (!loadError && !page) notFound();
  if (page && (page as { kind?: string }).kind === "information") {
    return <InfoPageFields page={page as never} />;
  }

  // The palette is the backend's contract. If it cannot be read the CMS still
  // works from the mirrored copy rather than showing an empty menu.
  let sectionTypes: CmsSectionTypes = FALLBACK_SECTION_TYPES;
  let paletteStale = false;
  try {
    sectionTypes = await listCmsSectionTypes(session, page?.documentType);
  } catch {
    paletteStale = true;
  }

  return (
    <div className="grid min-w-0 gap-5">
      <PageHeader
        back={
          <Link href="/cms" className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-chalk-dim transition-colors hover:text-chalk">
            <ArrowLeft width={13} height={13} /> Content
          </Link>
        }
        eyebrow={page?.documentType}
        title={page?.title ?? "That page"}
        action={
          page ? (
            <>
              {page.hasDraft ? <Pill tone="amber">Draft waiting</Pill> : null}
              <Pill tone={page.status === "published" ? "mint" : "amber"}>{page.status}</Pill>
              <CmsActionForm action={publishCmsPageAction} className="inline-flex items-center gap-2">
                <input type="hidden" name="id" value={page.id} />
                <SubmitButton pendingLabel="Publishing">Publish changes</SubmitButton>
              </CmsActionForm>
            </>
          ) : null
        }
      />

      {loadError ? (
        <div role="status" className="rounded-[12px] border border-[#e34d32]/40 bg-[#e34d32]/8 px-4 py-3 text-[13px] text-[#b23a24]">
          {loadError}
        </div>
      ) : null}

      {page ? (
        <Panel>
          <PanelHead
            title="Add a section"
            hint="Pick what the section is. Product sections then ask who chooses the products."
          />
          {paletteStale ? (
            <p className="mb-4 rounded-[10px] border border-hairline bg-panel-2 px-3.5 py-3 text-[12px] leading-relaxed text-chalk-dim">
              The section menu could not be refreshed, so the built-in list is shown. Saving still works and the
              storefront resolves it the same way.
            </p>
          ) : null}
          <div className="mt-4">
            <SectionPalette pageId={page.id} sectionTypes={sectionTypes} />
          </div>
        </Panel>
      ) : null}

      {page?.sections?.length ? (
        <Panel flush>
          <div className="p-4 pb-3 sm:p-5 sm:pb-3">
            <PanelHead title="Sections" hint="In the order they appear on the page." />
          </div>
          <ul className="grid gap-2 px-4 pb-4 sm:px-5 sm:pb-5">
            {page.sections.map((section, index) => (
              <li key={section.id} className="flex flex-wrap items-center gap-2.5 rounded-[12px] border border-hairline bg-panel px-3.5 py-3.5">
                <span className="w-5 shrink-0 text-center font-mono text-[11px] text-chalk-dim">{index + 1}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13.5px] font-semibold leading-snug text-chalk" title={section.name || section.type}>{section.name || section.type}</span>
                  <span className="mt-1 block font-mono text-[11.5px] uppercase tracking-[0.1em] text-chalk-dim">
                    {sectionMeta(section, sectionTypes)} · {section.visible ? "on the storefront" : "hidden"}
                  </span>
                </span>

                <CmsActionForm action={moveCmsSectionAction} className="flex items-center gap-1">
                  <input type="hidden" name="id" value={page.id} />
                  <input type="hidden" name="sectionId" value={section.id} />
                  <input type="hidden" name="direction" value="up" />
                  <SubmitButton variant="outline" pendingLabel="…" ariaLabel={`Move ${section.name || section.type} up`} className="min-h-11 min-w-11 px-2.5">
                    <ArrowUp width={13} height={13} />
                  </SubmitButton>
                </CmsActionForm>
                <CmsActionForm action={moveCmsSectionAction} className="flex items-center gap-1">
                  <input type="hidden" name="id" value={page.id} />
                  <input type="hidden" name="sectionId" value={section.id} />
                  <input type="hidden" name="direction" value="down" />
                  <SubmitButton variant="outline" pendingLabel="…" ariaLabel={`Move ${section.name || section.type} down`} className="min-h-11 min-w-11 px-2.5">
                    <ArrowDown width={13} height={13} />
                  </SubmitButton>
                </CmsActionForm>

                <CmsActionForm action={moveCmsSectionAction} className="flex items-center gap-1">
                  <input type="hidden" name="id" value={page.id} />
                  <input type="hidden" name="sectionId" value={section.id} />
                  <input type="hidden" name="direction" value="top" />
                  <SubmitButton variant="outline" pendingLabel="…" className="min-h-11 px-3 py-2 text-[11.5px]">
                    Top
                  </SubmitButton>
                </CmsActionForm>
                <CmsActionForm action={moveCmsSectionAction} className="flex items-center gap-1">
                  <input type="hidden" name="id" value={page.id} />
                  <input type="hidden" name="sectionId" value={section.id} />
                  <input type="hidden" name="direction" value="bottom" />
                  <SubmitButton variant="outline" pendingLabel="…" className="min-h-11 px-3 py-2 text-[11.5px]">
                    Bottom
                  </SubmitButton>
                </CmsActionForm>
                <CmsActionForm action={toggleCmsSectionAction} className="flex items-center gap-2">
                  <input type="hidden" name="id" value={page.id} />
                  <input type="hidden" name="sectionId" value={section.id} />
                  <input type="hidden" name="visible" value={section.visible ? "" : "on"} />
                  <SubmitButton variant="outline" pendingLabel="…" className="min-h-11 px-3.5 py-2">
                    {section.visible ? "Hide" : "Show"}
                  </SubmitButton>
                </CmsActionForm>

                <CmsActionForm action={removeCmsSectionAction} className="flex items-center gap-1">
                  <input type="hidden" name="id" value={page.id} />
                  <input type="hidden" name="sectionId" value={section.id} />
                  <SubmitButton variant="danger" pendingLabel="…" ariaLabel={`Delete ${section.name || section.type}`} className="min-h-11 min-w-11 px-2.5">
                    <Trash2 width={13} height={13} />
                  </SubmitButton>
                </CmsActionForm>

                <Link
                  href={`/cms/pages/${page.id}/${section.id}`}
                  className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-[10px] border border-signal bg-signal px-4 text-[12.5px] font-semibold text-white transition-colors hover:bg-[#e4572e]"
                >
                  <Pencil width={12} height={12} /> Edit
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      ) : (
        <Empty title="No sections on this page" body="Add a section above." />
      )}

      {page?.publishedSections?.length ? (
        <Panel>
          <PanelHead title="On the storefront now" hint="What shoppers see until you publish" />
          <ol className="grid gap-1.5">
            {page.publishedSections.map((section, index) => (
              <li key={section.id} className="flex items-center gap-2.5 text-[12.5px] text-chalk-dim">
                <span className="w-4 shrink-0 text-right font-mono text-[11px]">{index + 1}</span>
                <span className="min-w-0 truncate text-chalk">{section.name || section.type}</span>
                {section.visible ? null : <Pill tone="neutral">hidden</Pill>}
              </li>
            ))}
          </ol>
        </Panel>
      ) : null}
    </div>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowDown, ArrowLeft, ArrowUp, Pencil, Trash2 } from "lucide-react";
import { requireAdmin, explain } from "@/lib/data";
import { getCmsPage } from "@/lib/api";
import { CmsActionForm } from "@/components/ops/cms-action-form";
import { Empty, Panel, PanelHead, Pill } from "@/components/ops/bits";
import { PageHeader, inputClass, selectClass } from "@/components/ops/table";
import { Field, SubmitButton } from "@/components/ops/controls";
import { addCmsSectionAction, moveCmsSectionAction, publishCmsPageAction, removeCmsSectionAction, toggleCmsSectionAction } from "@/lib/actions";

/** Section types in plain words. A type with no entry falls back to its own name. */
const SECTION_LABELS: Record<string, string> = {
  hero_banner: "Hero banner",
  hero_slim: "Banner",
  promo_strip: "Message strip",
  promo_slots: "Promotion slots",
  category_grid: "Department tiles",
  brand_carousel: "Brand row",
  product_carousel: "Product row",
  product_grid: "Product list",
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

  return (
    <div className="grid min-w-0 gap-5">
      <PageHeader
        back={
          <Link href="/cms" className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-chalk-dim transition-colors hover:text-chalk">
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
          />
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <CmsActionForm action={addCmsSectionAction} className="flex flex-col items-start gap-3 rounded-[12px] border border-hairline bg-panel-2 p-4">
              <input type="hidden" name="id" value={page.id} />
              <input type="hidden" name="type" value="hero_banner" />
              <span className="flex items-center gap-2">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[10px] bg-panel text-signal">
                  <ImagePlus width={16} height={16} />
                </span>
                <span>
                  <span className="block font-display text-[14px] font-semibold text-chalk">Campaign hero</span>
                  <span className="block text-[12px] text-chalk-dim">Full-height hero with 2 buttons</span>
                </span>
              </span>
              <Field title="Name it (optional)">
                <input name="name" className={inputClass} placeholder="Autumn picks" />
              </Field>
              <SubmitButton pendingLabel="Adding" className="self-start">Add hero</SubmitButton>
            </CmsActionForm>

            <CmsActionForm action={addCmsSectionAction} className="flex flex-col items-start gap-3 rounded-[12px] border border-hairline bg-panel-2 p-4">
              <input type="hidden" name="id" value={page.id} />
              <input type="hidden" name="type" value="hero_slim" />
              <span className="flex items-center gap-2">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[10px] bg-panel text-signal">
                  <ImagePlus width={16} height={16} />
                </span>
                <span>
                  <span className="block font-display text-[14px] font-semibold text-chalk">Slim banner</span>
                  <span className="block text-[12px] text-chalk-dim">Compact strip with 1 button</span>
                </span>
              </span>
              <Field title="Name it (optional)">
                <input name="name" className={inputClass} placeholder="Audio deals" />
              </Field>
              <SubmitButton pendingLabel="Adding" className="self-start">Add banner</SubmitButton>
            </CmsActionForm>
          </div>

          <details className="mt-3 rounded-[12px] border border-hairline bg-panel-2">
            <summary className="cursor-pointer px-4 py-3 font-mono text-[10px] uppercase tracking-[0.16em] text-chalk-dim">
              Other sections
            </summary>
            <CmsActionForm action={addCmsSectionAction} className="grid gap-4 border-t border-hairline p-4">
              <input type="hidden" name="id" value={page.id} />
              <Field title="What kind of section">
                <select name="type" defaultValue="category_grid" className={selectClass}>
                  <option value="promo_strip">Message strip — one line of text</option>
                  <option value="category_grid">Department tiles</option>
                  <option value="brand_carousel">Brand row</option>
                  <option value="product_carousel">Product row</option>
                  <option value="featured_stores">Stores</option>
                  <option value="promo_slots">Promotion slots — adverts between content</option>
                  <option value="footer">Footer</option>
                </select>
              </Field>
              <Field title="Name it (optional)">
                <input name="name" className={inputClass} placeholder="Autumn picks" />
              </Field>
              <SubmitButton pendingLabel="Adding">Add section</SubmitButton>
            </CmsActionForm>
          </details>
        </Panel>
      ) : null}

      {page?.sections?.length ? (
        <Panel flush>
          <div className="p-4 pb-3 sm:p-5 sm:pb-3">
            <PanelHead title="Sections" />
          </div>
          <ul className="grid gap-2 px-4 pb-4 sm:px-5 sm:pb-5">
            {page.sections.map((section, index) => (
              <li key={section.id} className="flex flex-wrap items-center gap-3 rounded-[12px] border border-hairline bg-panel px-3.5 py-3">
                <span className="w-5 shrink-0 text-center font-mono text-[11px] text-chalk-dim">{index + 1}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13.5px] font-semibold text-chalk">{section.name || section.type}</span>
                  <span className="mt-0.5 block truncate font-mono text-[10px] uppercase tracking-[0.12em] text-chalk-dim">
                    {sectionLabel(section)} · {section.visible ? "on the storefront" : "hidden"}
                  </span>
                </span>

                <CmsActionForm action={moveCmsSectionAction} className="flex items-center gap-1">
                  <input type="hidden" name="id" value={page.id} />
                  <input type="hidden" name="sectionId" value={section.id} />
                  <input type="hidden" name="direction" value="up" />
                  <SubmitButton variant="outline" pendingLabel="…" ariaLabel={`Move ${section.name || section.type} up`} className="px-2 py-1.5">
                    <ArrowUp width={13} height={13} />
                  </SubmitButton>
                </CmsActionForm>
                <CmsActionForm action={moveCmsSectionAction} className="flex items-center gap-1">
                  <input type="hidden" name="id" value={page.id} />
                  <input type="hidden" name="sectionId" value={section.id} />
                  <input type="hidden" name="direction" value="down" />
                  <SubmitButton variant="outline" pendingLabel="…" ariaLabel={`Move ${section.name || section.type} down`} className="px-2 py-1.5">
                    <ArrowDown width={13} height={13} />
                  </SubmitButton>
                </CmsActionForm>

                <CmsActionForm action={moveCmsSectionAction} className="flex items-center gap-1">
                  <input type="hidden" name="id" value={page.id} />
                  <input type="hidden" name="sectionId" value={section.id} />
                  <input type="hidden" name="direction" value="top" />
                  <SubmitButton variant="outline" pendingLabel="…" className="px-2.5 py-1.5 text-[10.5px]">
                    Top
                  </SubmitButton>
                </CmsActionForm>
                <CmsActionForm action={moveCmsSectionAction} className="flex items-center gap-1">
                  <input type="hidden" name="id" value={page.id} />
                  <input type="hidden" name="sectionId" value={section.id} />
                  <input type="hidden" name="direction" value="bottom" />
                  <SubmitButton variant="outline" pendingLabel="…" className="px-2.5 py-1.5 text-[10.5px]">
                    Bottom
                  </SubmitButton>
                </CmsActionForm>
                <CmsActionForm action={toggleCmsSectionAction} className="flex items-center gap-2">
                  <input type="hidden" name="id" value={page.id} />
                  <input type="hidden" name="sectionId" value={section.id} />
                  <input type="hidden" name="visible" value={section.visible ? "" : "on"} />
                  <SubmitButton variant="outline" pendingLabel="…" className="px-3 py-1.5">
                    {section.visible ? "Hide" : "Show"}
                  </SubmitButton>
                </CmsActionForm>

                <CmsActionForm action={removeCmsSectionAction} className="flex items-center gap-1">
                  <input type="hidden" name="id" value={page.id} />
                  <input type="hidden" name="sectionId" value={section.id} />
                  <SubmitButton variant="danger" pendingLabel="…" ariaLabel={`Delete ${section.name || section.type}`} className="px-2.5 py-1.5">
                    <Trash2 width={13} height={13} />
                  </SubmitButton>
                </CmsActionForm>

                <Link
                  href={`/cms/pages/${page.id}/${section.id}`}
                  className="inline-flex min-h-8 shrink-0 items-center gap-1.5 rounded-[10px] border border-signal bg-signal px-2.5 text-[11.5px] font-semibold text-white transition-colors hover:bg-[#e4572e]"
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
                <span className="w-4 shrink-0 text-right font-mono text-[10px]">{index + 1}</span>
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

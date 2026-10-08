import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ImagePlus } from "lucide-react";
import { requireAdmin, explain } from "@/lib/data";
import { getCmsPage, type CmsSection } from "@/lib/api";
import { CmsActionForm } from "@/components/ops/cms-action-form";
import { Empty, Eyebrow, Panel, PanelHead, Pill } from "@/components/ops/bits";
import { PageHeader, inputClass, selectClass } from "@/components/ops/table";
import { Field, SubmitButton } from "@/components/ops/controls";
import { saveCmsSectionAction } from "@/lib/actions";

/** The fields each section type can be managed by, in the order they read. */
const TEXT_FIELDS: Record<string, { key: string; title: string; long?: boolean }[]> = {
  hero_banner: [
    { key: "eyebrow", title: "Eyebrow" },
    { key: "title", title: "Title" },
    { key: "subtitle", title: "Description", long: true },
    { key: "ctaLabel", title: "Button label" },
    { key: "ctaHref", title: "Button link" },
    { key: "secondaryLabel", title: "Second button" },
    { key: "secondaryHref", title: "Second button link" },
  ],
  hero_slim: [
    { key: "eyebrow", title: "Eyebrow" },
    { key: "title", title: "Title" },
    { key: "ctaLabel", title: "Button label" },
    { key: "ctaHref", title: "Button link" },
  ],
  promo_strip: [{ key: "message", title: "Message" }],
  footer: [],
};
const TITLED = ["category_grid", "brand_carousel", "product_carousel", "featured_stores", "product_grid"];
const FALLBACK: { key: string; title: string; long?: boolean }[] = [
  { key: "title", title: "Title" },
  { key: "subtitle", title: "Description", long: true },
];

function fieldsFor(section: CmsSection) {
  const key = String(section.type ?? "");
  if (TEXT_FIELDS[key]) return TEXT_FIELDS[key];
  const base = TITLED.includes(key) ? [...FALLBACK] : [];
  if ("limit" in section) base.push({ key: "limit", title: "How many to show" });
  return base;
}

export default async function CmsSectionEditor({
  params,
}: {
  params: Promise<{ id: string; sectionId: string }>;
}) {
  const { id, sectionId } = await params;
  const { session } = await requireAdmin();

  let page;
  let loadError: string | null = null;
  try {
    page = (await getCmsPage(session, id)).page;
  } catch (error) {
    loadError = explain(error);
  }
  const section = page?.sections?.find((item) => item.id === sectionId);
  if (!loadError && (!page || !section)) notFound();

  const fields = section ? fieldsFor(section) : [];

  return (
    <div className="grid min-w-0 gap-5">
      <PageHeader
        back={
          <Link href={`/cms/pages/${id}`} className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-chalk-dim transition-colors hover:text-chalk">
            <ArrowLeft width={13} height={13} /> {page?.title ?? "Content"}
          </Link>
        }
        eyebrow={section?.type}
        title={section?.name || "That section"}
        action={
          section ? (
            <>
              <Pill tone={section.visible ? "mint" : "neutral"}>{section.visible ? "On the storefront" : "Hidden"}</Pill>
              <Pill tone="neutral">Position {section.position}</Pill>
            </>
          ) : null
        }
      />

      {loadError ? (
        <div role="status" className="rounded-[12px] border border-[#e34d32]/40 bg-[#e34d32]/8 px-4 py-3 text-[13px] text-[#b23a24]">{loadError}</div>
      ) : null}

      {section ? (
        <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(300px,380px)] xl:items-start">
          <div className="grid min-w-0 gap-5">
            <Panel>
              <PanelHead title="Content" hint="Saved as a draft. Nothing reaches a shopper until you publish." />
              {fields.length ? (
                <CmsActionForm action={saveCmsSectionAction} className="grid gap-4">
                  <input type="hidden" name="id" value={id} />
                  <input type="hidden" name="sectionId" value={section.id} />
                  {fields.map((field) =>
                    field.long ? (
                      <Field key={field.key} title={field.title}>
                        <textarea
                          name={`field_${field.key}`}
                          rows={3}
                          defaultValue={String(section[field.key] ?? "")}
                          className={`${inputClass} min-h-[92px] py-2`}
                        />
                      </Field>
                    ) : (
                      <Field key={field.key} title={field.title}>
                        <input
                          name={`field_${field.key}`}
                          defaultValue={String(section[field.key] ?? "")}
                          className={inputClass}
                        />
                      </Field>
                    ),
                  )}
                  <div className="flex flex-wrap items-center gap-2">
                    <SubmitButton pendingLabel="Saving">Save draft</SubmitButton>
                  </div>
                </CmsActionForm>
              ) : (
                <Empty title="Nothing to edit on this section" body="This one is placed by the page rather than configured in it. Its content comes from its own library." />
              )}
            </Panel>

            {String(section.type) === "hero_banner" ? (
              <Panel>
                <PanelHead title="Slide media" hint="Images and video live in Banners, so one creative can be reused by any section." />
                <div className="grid gap-3">
                  <div className="flex items-center gap-3 rounded-[12px] border border-dashed border-hairline bg-panel-2 px-4 py-3.5">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[11px] border border-hairline bg-panel text-signal">
                      <ImagePlus width={18} height={18} />
                    </span>
                    <span className="min-w-0 flex-1 text-[12.5px] text-chalk-dim">
                      {Array.isArray(section.bannerIds) && section.bannerIds.length
                        ? `${section.bannerIds.length} banners linked to this hero.`
                        : "No banner linked yet — the hero will show its built-in artwork."}
                    </span>
                    <Link href="/cms/banners" className="shrink-0 rounded-[9px] border border-hairline px-3 py-1.5 text-[11px] font-semibold text-chalk transition-colors hover:bg-panel-2">
                      Manage banners
                    </Link>
                  </div>
                </div>
              </Panel>
            ) : null}

            <Panel>
              <PanelHead title="Placement" hint="Where the text sits over the image, and how the overlay reads." />
              <CmsActionForm action={saveCmsSectionAction} className="grid gap-4 sm:grid-cols-2">
                <input type="hidden" name="id" value={id} />
                <input type="hidden" name="sectionId" value={section.id} />
                <Field title="Text across">
                  <select name="field_align" defaultValue={String(section.align ?? "left")} className={selectClass}>
                    <option value="left">Left</option>
                    <option value="center">Centre</option>
                    <option value="right">Right</option>
                  </select>
                </Field>
                <Field title="Text height">
                  <select name="field_vertical" defaultValue={String(section.vertical ?? "middle")} className={selectClass}>
                    <option value="top">Top</option>
                    <option value="middle">Middle</option>
                    <option value="bottom">Bottom</option>
                  </select>
                </Field>
                <Field title="Overlay tone">
                  <select name="field_tone" defaultValue={String(section.tone ?? "dark")} className={selectClass}>
                    <option value="dark">Dark behind light text</option>
                    <option value="light">Light behind dark text</option>
                  </select>
                </Field>
                <Field title="Overlay strength">
                  <input name="field_scrim" type="number" min={0} max={100} defaultValue={String(section.scrim ?? 55)} className={inputClass} />
                </Field>
                <Field title="Slide duration (ms)">
                  <input name="field_duration" type="number" min={2000} step={500} defaultValue={String(section.duration ?? 7000)} className={inputClass} />
                </Field>
                <Field title="Text width (characters)">
                  <input name="field_width" type="number" min={18} max={64} defaultValue={String(section.width ?? 44)} className={inputClass} />
                </Field>
                <div className="sm:col-span-2"><SubmitButton pendingLabel="Saving">Save placement</SubmitButton></div>
              </CmsActionForm>
            </Panel>
          </div>

          <aside className="grid gap-5 xl:sticky xl:top-4">
            <Panel>
              <PanelHead title="Preview" action={<Pill tone="neutral">as it will render</Pill>} />
              <div className="overflow-hidden rounded-[14px] border border-hairline">
                <div className="relative flex min-h-[180px] flex-col justify-center bg-gradient-to-br from-[#8d5a3c] via-[#c98a5e] to-[#ecc4a3] px-5 py-6">
                  {section.eyebrow ? (
                    <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/40 bg-white/20 px-2.5 py-1 font-mono text-[9.5px] uppercase tracking-[0.16em] text-white">
                      {String(section.eyebrow)}
                    </span>
                  ) : null}
                  <span className="mt-3 block max-w-[26ch] font-display text-[21px] font-extrabold leading-tight text-white drop-shadow">
                    {String(section.title ?? section.name ?? "")}
                  </span>
                  {section.subtitle ? (
                    <span className="mt-2 block max-w-[34ch] text-[12px] leading-relaxed text-white/85">
                      {String(section.subtitle)}
                    </span>
                  ) : null}
                  {section.ctaLabel ? (
                    <span className="mt-4 inline-flex w-fit rounded-[10px] bg-white px-3.5 py-2 text-[12px] font-semibold text-[#c2441a]">
                      {String(section.ctaLabel)}
                    </span>
                  ) : null}
                </div>
              </div>
              <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.12em] text-chalk-dim">
                Text {String(section.align ?? "left")} · {String(section.vertical ?? "middle")} · overlay {String(section.tone ?? "dark")} {String(section.scrim ?? 55)}%
              </p>
            </Panel>

            <Panel>
              <PanelHead title="This section" />
              <dl className="grid gap-2 text-[12.5px]">
                <div className="flex justify-between gap-3"><dt className="text-chalk-dim">Type</dt><dd className="font-mono text-[11px] text-chalk">{String(section.type)}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-chalk-dim">Id</dt><dd className="font-mono text-[11px] text-chalk">{section.id}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-chalk-dim">Position</dt><dd className="font-mono text-[11px] text-chalk">{section.position}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-chalk-dim">On the shop</dt><dd className="font-mono text-[11px] text-chalk">{section.visible ? "yes" : "hidden"}</dd></div>
              </dl>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link href={`/cms/pages/${id}`} className="rounded-[9px] border border-hairline px-3 py-1.5 text-[11px] font-semibold text-chalk transition-colors hover:bg-panel-2">
                  All sections
                </Link>
                <Link href={`/cms/pages/${id}`} className="rounded-[9px] bg-signal px-3 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-[#e4572e]">
                  Publish from the page
                </Link>
              </div>
            </Panel>
          </aside>
        </div>
      ) : null}
    </div>
  );
}

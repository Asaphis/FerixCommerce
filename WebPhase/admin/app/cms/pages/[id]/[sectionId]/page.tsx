import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ImagePlus } from "lucide-react";
import { requireAdmin, explain } from "@/lib/data";
import { assetUrl, getCmsPage, listBanners, listMedia, type Banner, type CmsSection, type MediaAsset } from "@/lib/api";
import { CmsActionForm } from "@/components/ops/cms-action-form";
import { Empty, Panel, PanelHead, Pill } from "@/components/ops/bits";
import { PageHeader, inputClass, selectClass } from "@/components/ops/table";
import { Field, SubmitButton } from "@/components/ops/controls";
import { saveCmsSectionAction } from "@/lib/actions";
import { MediaUploadField } from "@/components/ops/media-upload-field";

/** The fields each section type can be managed by, in the order they read. */
type Choice = { value: string; label: string };
type EditorField = {
  key: string;
  title: string;
  /** A paragraph rather than a line. */
  long?: boolean;
  /** A number field. */
  numeric?: boolean;
  /** A set of options, rendered as a picker. */
  options?: Choice[];
};

const TEXT_FIELDS: Record<string, EditorField[]> = {
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
    { key: "subtitle", title: "Description", long: true },
    { key: "ctaLabel", title: "Button label" },
    { key: "ctaHref", title: "Button link" },
  ],
  promo_strip: [{ key: "message", title: "Message" }],
  footer: [],
};
const TITLED = ["category_grid", "brand_carousel", "product_carousel", "featured_stores", "product_grid"];
const FALLBACK: EditorField[] = [
  { key: "title", title: "Title" },
  { key: "subtitle", title: "Description", long: true },
];

/** The choices each kind of section carries. */

/** How a section arranges what it holds. Shared by everything that shows products. */
const ARRANGEMENT: EditorField[] = [
  { key: "across", title: "Across on a phone", options: [
    { value: "1", label: "One" },
    { value: "2", label: "Two" },
    { value: "3", label: "Three" },
    { value: "4", label: "Four" },
  ] },
  { key: "layout", title: "Arrangement", options: [
    { value: "grid", label: "Grid, wrapping down the page" },
    { value: "groups", label: "Sets of rows, swiped for the next set" },
    { value: "horizontal", label: "One row, running off the edge" },
  ] },
  { key: "swipe", title: "Swipe for more", options: [
    { value: "true", label: "Yes — swiped" },
    { value: "false", label: "No — everything at once" },
  ] },
  { key: "seeAll", title: "See all link", options: [
    { value: "true", label: "Show it" },
    { value: "false", label: "Hide it" },
  ] },
];

/** How far a shopper scrolls before the next section appears. */
const INTERRUPT: EditorField[] = [
  { key: "rowsPerSet", title: "Rows before a swipe", numeric: true },
  { key: "interruptAfter", title: "Rows before the next section", numeric: true },
];
const CHOICES: Record<string, EditorField[]> = {
  product_carousel: [
    { key: "source", title: "Which products", options: [
      { value: "flash", label: "Today's deals" },
      { value: "trending", label: "Trending" },
      { value: "new", label: "New arrivals" },
      { value: "related", label: "Related to a product" },
    ] },
    ...ARRANGEMENT,
  ],
  product_grid: [...ARRANGEMENT],
  category_grid: [
    { key: "across", title: "Across on a phone", options: [
      { value: "1", label: "One" },
      { value: "2", label: "Two" },
      { value: "3", label: "Three" },
      { value: "4", label: "Four" },
    ] },
    { key: "rowsPerSet", title: "Rows per face", options: [
      { value: "1", label: "One" },
      { value: "2", label: "Two" },
      { value: "3", label: "Three" },
    ] },
    { key: "layout", title: "Arrangement", options: [
      { value: "groups", label: "Groups, swiped" },
      { value: "grid", label: "One grid" },
      { value: "horizontal", label: "One row" },
    ] },
    { key: "seeAll", title: "See all link", options: [
      { value: "true", label: "Show it" },
      { value: "false", label: "Hide it" },
    ] },
  ],
  hero_banner: [{ key: "mediaOnly", title: "Hero display", options: [
    { value: "false", label: "Text and button over the media" },
    { value: "true", label: "Media only — no copy, buttons or shading" },
  ] }],
  hero_slim: [{ key: "mediaOnly", title: "Banner display", options: [
    { value: "false", label: "Text and button over the media" },
    { value: "true", label: "Media only — no copy, buttons or shading" },
  ] }],
  brand_carousel: [
    { key: "across", title: "Across on a phone", options: [
      { value: "1", label: "One" },
      { value: "2", label: "Two" },
      { value: "3", label: "Three" },
    ] },
    { key: "layout", title: "How they sit", options: [
      { value: "slider", label: "A sliding row" },
      { value: "wrap", label: "Wrapped rows" },
      { value: "groups", label: "Sets of rows, swiped for the next set" },
    ] },
    { key: "seeAll", title: "See all link", options: [
      { value: "true", label: "Show it — to the brand page" },
      { value: "false", label: "Hide it" },
    ] },
  ],
  featured_stores: [
    { key: "layout", title: "How they sit", options: [
      { value: "rows", label: "One per row" },
      { value: "cards", label: "Cards in a grid" },
    ] },
    { key: "showFollow", title: "Follow button", options: [
      { value: "true", label: "Show it" },
      { value: "false", label: "Hide it" },
    ] },
  ],
  promo_slots: [
    { key: "placement", title: "Which adverts", options: [
      { value: "home", label: "Those placed on the homepage" },
      { value: "explore", label: "Those placed on explore" },
      { value: "both", label: "Both" },
    ] },
  ],
};

/** The numbers each kind of section carries. */
const COUNTS: Record<string, EditorField[]> = {
  category_grid: [{ key: "limit", title: "How many departments (blank = all)", numeric: true }],
  product_carousel: [{ key: "limit", title: "How many products", numeric: true }, ...INTERRUPT],
  product_grid: [{ key: "limit", title: "How many products", numeric: true }, ...INTERRUPT],
  brand_carousel: [{ key: "limit", title: "How many brands", numeric: true }, ...INTERRUPT],
  featured_stores: [{ key: "limit", title: "How many stores", numeric: true }],
  promo_slots: [
    { key: "adEvery", title: "One advert every … products", numeric: true },
    { key: "limit", title: "At most how many adverts", numeric: true },
  ],
};

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

/** Where each kind of band gets its records, so the editor can point there. */
const DRAW_FROM: Record<string, { href: string; label: string }> = {
  category_grid: { href: "/departments", label: "departments" },
  brand_carousel: { href: "/brands", label: "brands" },
  featured_stores: { href: "/merchants", label: "sellers" },
  product_carousel: { href: "/catalog", label: "our products" },
  product_grid: { href: "/catalog", label: "our products" },
  promo_slots: { href: "/cms/adverts", label: "advertisements" },
};

function fieldsFor(section: CmsSection): EditorField[] {
  const key = String(section.type ?? "");
  const mediaOnly = section.mediaOnly === true || String(section.mediaOnly) === "true";
  const hasDirectMedia = Boolean(String(section.mediaUrl ?? "").trim());
  const text = key === "hero_banner"
    ? hasDirectMedia && !mediaOnly ? TEXT_FIELDS[key] : []
    : key === "category_grid"
      ? [{ key: "title", title: "Title" }]
    : key === "hero_slim"
      ? mediaOnly ? [] : TEXT_FIELDS[key]
      : TEXT_FIELDS[key] ?? (TITLED.includes(key) ? [...FALLBACK] : []);
  // Everything the section can carry: its words, then its choices, then its
  // counts. Each kind only ever sees fields it can act on.
  return [
    ...text,
    ...(CHOICES[key] ?? []),
    ...(COUNTS[key] ?? []),
  ];
}

/** A stored value as the option that represents it. */
function asOption(field: EditorField, value: unknown) {
  if (typeof value === "boolean") return value ? "true" : "false";
  return value === undefined || value === null ? "" : String(value);
}

function initialOption(field: EditorField, section: CmsSection) {
  const value = section[field.key];
  if (value !== undefined && value !== null) return asOption(field, value);
  const defaults: Record<string, Record<string, string>> = {
    category_grid: { across: "2", rowsPerSet: "2", layout: "groups", seeAll: "true" },
    hero_banner: { mediaOnly: "false" },
    hero_slim: { mediaOnly: "false" },
  };
  return defaults[String(section.type ?? "")]?.[field.key] ?? "";
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
  const isHeroSection = Boolean(section && ["hero_banner", "hero_slim"].includes(String(section.type)));
  const mediaOnly = section?.mediaOnly === true || String(section?.mediaOnly) === "true";
  const sectionMediaUrl = section ? assetUrl(String(section.mediaUrl ?? "")) : "";

  let mediaAssets: MediaAsset[] = [];
  if (isHeroSection) {
    try {
      mediaAssets = (await listMedia(session)).assets.map((asset) => ({ ...asset, url: assetUrl(asset.url) }));
    } catch {
      // Upload and URL fields still work if the media library cannot be reached.
    }
  }

  // A hero with no direct media renders the shared banner carousel, so the preview
  // shows that carousel's first active slide instead of an unrelated mock.
  let bannerPreview: Banner | null = null;
  if (section?.type === "hero_banner" && !sectionMediaUrl) {
    try {
      bannerPreview = (await listBanners(session)).banners.find((banner) => banner.active) ?? null;
    } catch {
      // The rest of the section editor stays usable when the banner list is unavailable.
    }
  }
  const previewMediaUrl = sectionMediaUrl || (bannerPreview ? assetUrl(bannerPreview.mediaUrl || bannerPreview.image || bannerPreview.videoUrl) : "");
  const previewVideo = String(section?.kind ?? bannerPreview?.kind) === "video" || /\.(mp4|webm|mov|m4v)(?:$|\?)/i.test(previewMediaUrl);
  const previewMediaOnly = mediaOnly || bannerPreview?.showText === false;
  const previewEyebrow = sectionMediaUrl ? section?.eyebrow : bannerPreview?.eyebrow ?? section?.eyebrow;
  const previewTitle = sectionMediaUrl ? section?.title : bannerPreview?.headline ?? section?.title ?? section?.name;
  const previewDescription = sectionMediaUrl ? section?.subtitle : bannerPreview?.body ?? section?.subtitle;
  const previewCtaLabel = sectionMediaUrl ? section?.ctaLabel : bannerPreview?.ctaLabel ?? section?.ctaLabel;
  const previewCtaHref = sectionMediaUrl ? section?.ctaHref : bannerPreview?.ctaHref ?? section?.ctaHref;
  const previewSecondaryLabel = sectionMediaUrl ? section?.secondaryLabel : bannerPreview?.secondaryLabel;
  const previewSecondaryHref = sectionMediaUrl ? section?.secondaryHref : bannerPreview?.secondaryHref;

  return (
    <div className="grid min-w-0 gap-5">
      <PageHeader
        back={
          <Link href={`/cms/pages/${id}`} className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-chalk-dim transition-colors hover:text-chalk">
            <ArrowLeft width={13} height={13} /> {page?.title ?? "Content"}
          </Link>
        }
        eyebrow={section ? sectionLabel(section) : undefined}
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
              {String(section.type) === "hero_banner" && !sectionMediaUrl ? (
                <p className="mb-4 rounded-[10px] border border-hairline bg-panel-2 px-3.5 py-3 text-[12px] leading-relaxed text-chalk-dim">The carousel's headline and button are set on each banner. Upload direct media here to add section-level title and description controls.</p>
              ) : null}
              {isHeroSection && mediaOnly ? (
                <p className="mb-4 rounded-[10px] border border-hairline bg-panel-2 px-3.5 py-3 text-[12px] leading-relaxed text-chalk-dim">Media-only mode hides copy, buttons and shading. Choose text mode to edit the overlay content and placement.</p>
              ) : null}
              {fields.length ? (
                <CmsActionForm action={saveCmsSectionAction} className="grid gap-4">
                  <input type="hidden" name="id" value={id} />
                  <input type="hidden" name="sectionId" value={section.id} />
                  {fields.map((field) =>
                    field.options ? (
                      <Field key={field.key} title={field.title}>
                        <select
                          name={`field_${field.key}`}
                          defaultValue={initialOption(field, section)}
                          className={selectClass}
                        >
                          {field.options.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                          ))}
                        </select>
                      </Field>
                    ) : field.long ? (
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
                          type={field.numeric ? "number" : "text"}
                          min={field.numeric ? 0 : undefined}
                          defaultValue={String(section[field.key] ?? "")}
                          className={inputClass}
                        />
                      </Field>
                    ),
                  )}
                  {isHeroSection ? (
                    <div className="grid gap-2 border-t border-hairline pt-4">
                      <p className="text-[12.5px] font-semibold text-chalk">Hero image or video</p>
                      <p className="-mt-1 text-[11.5px] leading-relaxed text-chalk-dim">Upload or choose the media here. Media-only mode shows this image/video with no copy, button, or shading.</p>
                      <MediaUploadField
                        urlName="field_mediaUrl"
                        fileName="field_mediaFile"
                        kind="auto"
                        kindName="field_kind"
                        defaultUrl={sectionMediaUrl}
                        libraryName="field_mediaLibraryUrl"
                        urlLabel="Media URL"
                        fileLabel="Upload image or video"
                        libraryAssets={mediaAssets.map((asset) => ({ url: asset.url, label: `${asset.kind} · ${asset.alt || asset.id}` }))}
                        selectedLibraryUrl={mediaAssets.some((asset) => asset.url === sectionMediaUrl) ? sectionMediaUrl : ""}
                      />
                    </div>
                  ) : null}
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
                <PanelHead title="Carousel slides" hint="The image/video above takes priority. Clear it to use the active banners from the shared library." />
                <div className="grid gap-3">
                  <div className="flex items-center gap-3 rounded-[12px] border border-dashed border-hairline bg-panel-2 px-4 py-3.5">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[11px] border border-hairline bg-panel text-signal">
                      <ImagePlus width={18} height={18} />
                    </span>
                    <span className="min-w-0 flex-1 text-[12.5px] text-chalk-dim">
                      {section.mediaUrl
                        ? "Direct hero media is set. It will show instead of the carousel."
                        : "No direct media is set. Active banners from the shared library will show here."}
                    </span>
                    <Link href="/cms/banners" className="shrink-0 rounded-[9px] border border-hairline px-3 py-1.5 text-[11px] font-semibold text-chalk transition-colors hover:bg-panel-2">
                      Manage banners
                    </Link>
                  </div>
                </div>
              </Panel>
            ) : null}

            {isHeroSection && !mediaOnly ? (
              <Panel>
                <PanelHead title="Placement" hint="Where text sits over the media and how its overlay reads." />
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
                  <Field title="Text width (characters)">
                    <input name="field_width" type="number" min={18} max={64} defaultValue={String(section.width ?? 44)} className={inputClass} />
                  </Field>
                  <div className="sm:col-span-2"><SubmitButton pendingLabel="Saving">Save placement</SubmitButton></div>
                </CmsActionForm>
              </Panel>
            ) : null}
          </div>

          <aside className="grid gap-5 xl:sticky xl:top-4">
            <Panel>
              <PanelHead title="Preview" action={<Pill tone="neutral">as it will render</Pill>} />
              <div className="overflow-hidden rounded-[14px] border border-hairline">
                {isHeroSection ? (
                  <div className="relative aspect-[16/8] min-h-[180px] overflow-hidden bg-transparent">
                    {previewMediaUrl ? (
                      previewVideo ? (
                        // eslint-disable-next-line jsx-a11y/media-has-caption
                        <video src={previewMediaUrl} controls muted playsInline preload="metadata" className="absolute inset-0 h-full w-full bg-[#17232b] object-cover" />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={previewMediaUrl} alt="Hero media preview" className="absolute inset-0 h-full w-full object-cover" />
                      )
                    ) : null}
                    {!previewMediaOnly ? (
                      <>
                        {previewMediaUrl ? (
                          <div aria-hidden className="absolute inset-0" style={{ background: String(section.tone ?? "dark") === "light" ? "linear-gradient(90deg,rgba(255,255,255,.65),rgba(255,255,255,0))" : "linear-gradient(90deg,rgba(7,20,35,.64),rgba(7,20,35,0))" }} />
                        ) : (
                          <div aria-hidden className="absolute inset-0 bg-gradient-to-br from-[#e85022] via-[#f17446] to-[#ffd6bd]" />
                        )}
                        <div className="absolute inset-0 z-10 flex flex-col justify-center p-5">
                          {previewEyebrow ? <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-white/80">{String(previewEyebrow)}</span> : null}
                          {previewTitle ? <span className="mt-2 block max-w-[26ch] font-display text-[21px] font-extrabold leading-tight text-white">{String(previewTitle)}</span> : null}
                          {previewDescription ? <span className="mt-2 block max-w-[34ch] text-[12px] leading-relaxed text-white/85">{String(previewDescription)}</span> : null}
                          {previewCtaLabel || previewSecondaryLabel ? (
                            <div className="mt-4 flex flex-wrap gap-2">
                              {previewCtaLabel ? <span className="inline-flex w-fit bg-white px-3.5 py-2 text-[12px] font-semibold text-[#c2441a]">{String(previewCtaLabel)}</span> : null}
                              {previewSecondaryLabel ? <span className="inline-flex w-fit border border-white/60 px-3.5 py-2 text-[12px] font-semibold text-white">{String(previewSecondaryLabel)}</span> : null}
                            </div>
                          ) : null}
                        </div>
                      </>
                    ) : !previewMediaUrl ? (
                      <div className="absolute inset-0 grid place-items-center bg-[#f4f6f8] px-5 text-center text-[12px] text-chalk-dim">Upload or choose an image/video to preview media-only mode.</div>
                    ) : null}
                  </div>
                ) : String(section.type) === "category_grid" ? (
                  <div className="grid min-h-[140px] place-items-center bg-[#f4f6f8] p-5 text-center">
                    <div>
                      <p className="font-display text-[16px] font-semibold text-chalk">Department faces</p>
                      <p className="mt-1 text-[12px] text-chalk-dim">{Number(section.across) || 2} across × {Number(section.rowsPerSet) || 2} rows = {(Number(section.across) || 2) * (Number(section.rowsPerSet) || 2)} departments per swipe.</p>
                      <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.14em] text-chalk-dim">{String(section.layout ?? "groups")} · {String(section.seeAll) === "false" ? "no See all link" : "See all link on"}</p>
                    </div>
                  </div>
                ) : (
                  <div className="grid min-h-[140px] place-items-center bg-[#f4f6f8] px-5 py-6 text-center text-[12px] text-chalk-dim">
                    {DRAW_FROM[String(section.type)] ? `This section draws from your ${DRAW_FROM[String(section.type)].label}. The storefront uses its live content and layout settings.` : "This section is rendered from its own content and the page's published settings."}
                  </div>
                )}
              </div>
              <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.12em] text-chalk-dim">
                {isHeroSection ? previewMediaOnly ? "Media only · no copy, button or shading" : `Text ${String(section.align ?? "left")} · ${previewMediaUrl ? "media overlay" : "brand fallback"}` : String(section.type) === "category_grid" ? "The actual department imagery and swipe faces appear on the storefront" : "Preview depends on the section's live content"}
              </p>
            </Panel>

            <Panel>
              <PanelHead title="This section" />
              <dl className="grid gap-2 text-[12.5px]">
                <div className="flex justify-between gap-3"><dt className="text-chalk-dim">Position</dt><dd className="font-mono text-[11px] text-chalk">{section.position}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-chalk-dim">On the shop</dt><dd className="font-mono text-[11px] text-chalk">{section.visible ? "yes" : "hidden"}</dd></div>
              </dl>
              {DRAW_FROM[String(section.type)] ? (
                <div className="mt-4 rounded-[12px] border border-hairline bg-panel-2 px-3.5 py-3">
                  <p className="text-[12.5px] leading-relaxed text-chalk-dim">
                    This band draws from your{" "}
                    <span className="text-chalk">{DRAW_FROM[String(section.type)].label}</span>. What it
                    holds, and how it is arranged, are set here; the {DRAW_FROM[String(section.type)].label}{" "}
                    themselves are added and edited on their own page.
                  </p>
                  <Link
                    href={DRAW_FROM[String(section.type)].href}
                    className="mt-2.5 inline-flex min-h-9 items-center rounded-[9px] border border-hairline px-3 text-[11.5px] font-semibold text-chalk transition-colors hover:bg-panel"
                  >
                    Manage the {DRAW_FROM[String(section.type)].label} →
                  </Link>
                </div>
              ) : null}

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

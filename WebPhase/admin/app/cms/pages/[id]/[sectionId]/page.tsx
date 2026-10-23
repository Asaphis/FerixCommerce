import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireAdmin, explain } from "@/lib/data";
import { assetUrl, getCmsPage, getCmsSectionPreview, listBanners, listCmsSectionTypes, listMedia, type Banner, type CmsSection, type CmsSectionTypes, type MediaAsset } from "@/lib/api";
import { FALLBACK_SECTION_TYPES } from "@/components/ops/section-palette";
import { CmsActionForm } from "@/components/ops/cms-action-form";
import { Empty, Panel, PanelHead, Pill } from "@/components/ops/bits";
import { PageHeader, inputClass, selectClass } from "@/components/ops/table";
import { Field, SubmitButton } from "@/components/ops/controls";
import { deleteCmsSectionAction, publishCmsPageNowAction, saveCmsSectionAction } from "@/lib/actions";
import { MediaUploadField } from "@/components/ops/media-upload-field";
import { MediaSlotsField } from "@/components/ops/media-slots-field";
import { CmsSectionPreview } from "@/components/ops/cms-section-preview";
import { LocalDateTimeInput } from "@/components/ops/local-datetime-input";
import { ColorInput } from "@/components/shared/color-input";

/** The fields each section type can be managed by, in the order they read. */
type Choice = { value: string; label: string };
type EditorField = {
  key: string;
  title: string;
  /** The contract's kind: text, number, datetime, color, choice, toggle. */
  kind?: string;
  /** One line of explanation under the control. */
  help?: string;
  default?: unknown;
  /** A paragraph rather than a line. */
  long?: boolean;
  /** A number field. */
  numeric?: boolean;
  allowGradient?: boolean;
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
];

/** The choices each kind of section carries. */

/** How a product section arranges the products assigned from the product form. */
const ACROSS_FIELD: EditorField = { key: "across", title: "Across on a phone", options: [
    { value: "1", label: "One" }, { value: "2", label: "Two" },
    { value: "3", label: "Three" }, { value: "4", label: "Four" },
  ] };
const ARRANGEMENT: EditorField[] = [
  ACROSS_FIELD,
  { key: "layout", title: "Arrangement", options: [
    { value: "grid", label: "Grid, wrapping down the page" },
    { value: "groups", label: "Sets of rows, swiped for the next set" },
    { value: "horizontal", label: "One row, running off the edge" },
  ] },
  { key: "seeAll", title: "See all link", options: [
    { value: "true", label: "Show it" },
    { value: "false", label: "Hide it" },
  ] },
];

const CHOICES: Record<string, EditorField[]> = {
  product_carousel: [
    // The source is not here: it is a product section's most important decision
    // and is rendered by `productContractFields` from the backend contract, so
    // the list can never disagree with what the storefront can resolve.
    ...ARRANGEMENT,
    { key: "rowsPerSet", title: "Rows per swipe", options: [
      { value: "1", label: "One" }, { value: "2", label: "Two" },
      { value: "3", label: "Three" }, { value: "4", label: "Four" },
      { value: "5", label: "Five" }, { value: "6", label: "Six" },
    ] },
  ],
  product_grid: [
    ...ARRANGEMENT,
    { key: "rowsPerSet", title: "Rows per swipe", options: [
      { value: "1", label: "One" }, { value: "2", label: "Two" },
      { value: "3", label: "Three" }, { value: "4", label: "Four" },
      { value: "5", label: "Five" }, { value: "6", label: "Six" },
    ] },
  ],
  category_grid: [
    { key: "across", title: "Across on a phone", options: [
      { value: "1", label: "One" },
      { value: "2", label: "Two" },
      { value: "3", label: "Three" },
      { value: "4", label: "Four" },
    ] },
    { key: "rowsPerSet", title: "Rows per page", options: [
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
  ],
};

/** The numbers each kind of section carries. */
const COUNTS: Record<string, EditorField[]> = {
  product_carousel: [{ key: "limit", title: "How many products", numeric: true }],
  product_grid: [{ key: "limit", title: "How many products", numeric: true }],
  brand_carousel: [{ key: "limit", title: "How many brands", numeric: true }],
  featured_stores: [{ key: "limit", title: "How many stores", numeric: true }],
  promo_slots: [{ key: "limit", title: "At most how many adverts", numeric: true }],
};

/** Where each kind of band gets its records, so the editor can point there. */
const DRAW_FROM: Record<string, { href: string; label: string }> = {
  category_grid: { href: "/departments", label: "departments" },
  brand_carousel: { href: "/brands", label: "brands" },
  featured_stores: { href: "/merchants", label: "sellers" },
  product_carousel: { href: "/catalog", label: "our products" },
  product_grid: { href: "/catalog", label: "our products" },
  promo_slots: { href: "/cms/adverts", label: "advertisements" },
};

/**
 * The settings carried by the timed-campaign visual treatment.
 *
 * A timed campaign is not just a row of products: it has its own words, its own
 * window, a countdown and a colour scheme. The per-product settings — the offer
 * price, the discount label, each product's own window — belong to the
 * placement and are filled in from the product form, not here.
 */
const FLASH_SALE_FIELDS: EditorField[] = [
  { key: "eyebrow", title: "Eyebrow" },
  { key: "subtitle", title: "Description", long: true },
  { key: "ctaLabel", title: "Button label" },
  { key: "ctaHref", title: "Button link" },
  { key: "startsAt", title: "Campaign starts (YYYY-MM-DDTHH:MM)" },
  { key: "endsAt", title: "Campaign ends (YYYY-MM-DDTHH:MM)" },
  { key: "countdownLabel", title: "Countdown label" },
  { key: "showCountdown", title: "Countdown", options: [
    { value: "true", label: "Show it" },
    { value: "false", label: "Hide it" },
  ] },
  { key: "showDiscountBadges", title: "Discount badges", options: [
    { value: "true", label: "Show them" },
    { value: "false", label: "Hide them" },
  ] },
  { key: "showViewAll", title: "View-all button", options: [
    { value: "true", label: "Show it" },
    { value: "false", label: "Hide it" },
  ] },
  { key: "layout", title: "Arrangement", options: [
    { value: "carousel", label: "One row, running off the edge" },
    { value: "grid", label: "A grid" },
  ] },
  ACROSS_FIELD,
  { key: "backgroundColor", title: "Background colour" },
  { key: "accentColor", title: "Accent colour" },
  { key: "textColor", title: "Text colour" },
  { key: "timerBackgroundColor", title: "Timer background" },
  { key: "timerTextColor", title: "Timer text colour" },
];

/**
 * How a product section's products are chosen.
 *
 * ``source`` is the whole answer: ``assigned`` means a person fills the section
 * from the product form; every other value is a catalogue feed the backend
 * computes. A source's own settings — a sales window, a minimum number sold —
 * are rendered only for the source actually selected, so the form never asks
 * about a rule that is not in use.
 */
function productContractFields(section: CmsSection, sectionTypes: CmsSectionTypes): EditorField[] {
  const source = String(section.source ?? "assigned").toLowerCase();
  const automatic = sectionTypes.automaticSources.filter((item) => item.value !== "related");
  const options: Choice[] = [
    { value: "assigned", label: "Manual — filled from the product form" },
    ...automatic.map((item) => ({ value: item.value, label: `${item.label} — ${item.hint}` })),
  ];
  // A section saved before the contract existed keeps its old source readable,
  // so changing it is a decision rather than a surprise.
  if (sectionTypes.legacySources.includes(source)) {
    options.push({ value: source, label: `${source} — kept from before, no longer offered` });
  }
  const fields: EditorField[] = [
    { key: "source", title: "Products come from", options },
    { key: "type", title: "Product display layout", options: [
      { value: "product_carousel", label: "Product row / carousel" },
      { value: "product_grid", label: "Product grid" },
    ] },
    { key: "presentation", title: "How it is dressed", options: [
      { value: "standard", label: "A standard product row" },
      { value: "flash_sale", label: "Timed campaign band — custom section name, countdown, colours, per-product prices" },
      { value: "sale", label: "Sale styling" },
      { value: "new_arrivals", label: "New arrivals styling" },
      { value: "featured", label: "Featured styling" },
    ] },
  ];
  for (const setting of automatic.find((item) => item.value === source)?.config ?? []) {
    fields.push({ key: setting.key, title: setting.label, numeric: setting.kind === "number" });
  }
  return fields;
}

function fieldsFor(section: CmsSection, documentType = "", sectionTypes: CmsSectionTypes = FALLBACK_SECTION_TYPES): EditorField[] {
  const key = String(section.type ?? "");
  // The contract owns the field list, so a field added in the backend appears here
  // with the right control and no frontend change.
  const served = sectionTypes.sectionFields?.[key];
  if (Array.isArray(served) && served.length) {
    return served.filter((item) => !(String(section.presentation ?? "") === "flash_sale" && item.key === "layout")).map((item) => ({
      key: String(item.key),
      title: String(item.label ?? item.key),
      kind: typeof item.kind === "string" ? item.kind : "text",
      help: typeof item.hint === "string" ? item.hint : undefined,
      default: item.default,
      long: item.long === true,
      numeric: item.kind === "number",
      allowGradient: item.allowGradient === true,
      options: Array.isArray(item.options) ? (item.options as Choice[]) : undefined,
    }));
  }
  const isExploreCatalogFeed = documentType === "marketplace_explore"
    && key === "product_grid"
    && section.perPage !== undefined;
  if (isExploreCatalogFeed) return [ACROSS_FIELD];
  const isProductSection = key === "product_carousel" || key === "product_grid";
  const isFlashSale = isProductSection && String(section.presentation ?? "") === "flash_sale";
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
  const exploreAdvertSettings = key === "promo_slots" && documentType === "marketplace_explore"
    ? [
        { key: "placement", title: "Advert placement", options: [
          { value: "explore", label: "Explore" }, { value: "home", label: "Home" },
        ] },
        { key: "adEvery", title: "Insert after every", options: [
          { value: "4", label: "Four products" }, { value: "6", label: "Six products" },
          { value: "8", label: "Eight products" }, { value: "12", label: "Twelve products" },
        ] },
      ] satisfies EditorField[]
    : [];
  return [
    ...text,
    ...(isProductSection ? productContractFields(section, sectionTypes) : []),
    ...(isFlashSale ? FLASH_SALE_FIELDS : (CHOICES[key] ?? [])),
    ...exploreAdvertSettings,
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
    hero_banner: { mediaOnly: "false" },
    hero_slim: { mediaOnly: "false" },
  };
  return defaults[String(section.type ?? "")]?.[field.key] ?? asOption(field, field.default);
}

function initialValue(field: EditorField, section: CmsSection, fallback = "") {
  const value = section[field.key];
  return value !== undefined && value !== null ? String(value) : field.default == null ? fallback : String(field.default);
}

function isOn(value: unknown) {
  return value === true || ["true", "1", "yes", "on"].includes(String(value).toLowerCase());
}

/** Where the section's own clock stands, read the same way the shop reads it. */
function windowPill(section: CmsSection): { tone: "mint" | "amber" | "rose"; label: string } {
  const now = Date.now();
  const starts = section.startsAt ? Date.parse(String(section.startsAt)) : NaN;
  const ends = section.endsAt ? Date.parse(String(section.endsAt)) : NaN;
  if (!Number.isNaN(ends) && now > ends) return { tone: "rose", label: "Closed" };
  if (!Number.isNaN(starts) && now < starts) return { tone: "amber", label: "Scheduled" };
  return { tone: "mint", label: "Live" };
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

  // The source list and its settings come from the backend contract. If it
  // cannot be read the editor still opens from the mirrored copy.
  let sectionTypes: CmsSectionTypes = FALLBACK_SECTION_TYPES;
  try {
    sectionTypes = await listCmsSectionTypes(session, page?.documentType);
  } catch {
    sectionTypes = FALLBACK_SECTION_TYPES;
  }

  const fields = section ? fieldsFor(section, page?.documentType ?? "", sectionTypes) : [];
  const isHeroSection = Boolean(section && ["hero_banner", "hero_slim"].includes(String(section.type)));
  const mediaOnly = section?.mediaOnly === true || String(section?.mediaOnly) === "true";
  const sectionMediaUrl = section ? assetUrl(String(section.mediaUrl ?? "")) : "";

  let previewData = null;
  let previewError: string | null = null;
  if (section) {
    try {
      previewData = await getCmsSectionPreview(session, id, sectionId);
    } catch (error) {
      previewError = explain(error);
    }
  }

  let mediaAssets: MediaAsset[] = [];
  let reusableBanners: Banner[] = [];
  if (isHeroSection) {
    try {
      mediaAssets = (await listMedia(session)).assets.map((asset) => ({ ...asset, url: assetUrl(asset.url) }));
    } catch {
      // Upload and URL fields still work if the media library cannot be reached.
    }
    try {
      reusableBanners = (await listBanners(session)).banners;
    } catch {
      // The section can still use direct media if the banner library is unavailable.
    }
  }

  const selectedBannerId = String(section?.bannerId ?? "");
  const cardDisplayFields = sectionTypes.cardDisplay ?? [];

  return (
    <div data-cms-section-preview-scope className="grid min-w-0 gap-5">
      <PageHeader
        back={
          <Link href={`/cms/pages/${id}`} className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-chalk-dim transition-colors hover:text-chalk">
            <ArrowLeft width={13} height={13} /> {page?.title ?? "Content"}
          </Link>
        }
        title={section?.name || "That section"}
        action={
          section ? (
            <>
              <Pill tone={windowPill(section).tone}>{windowPill(section).label}</Pill>
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
                <>
                <form action={publishCmsPageNowAction} className="flex flex-wrap items-center gap-2 rounded-[10px] border border-hairline bg-panel-2 px-3 py-2">
                  <input type="hidden" name="id" value={id} />
                  <span className="text-[11.5px] leading-relaxed text-chalk-dim">
                    Saving keeps a draft. Publish to put this page live without leaving it.
                  </span>
                  <SubmitButton pendingLabel="Publishing">Publish page</SubmitButton>
                </form>
                <CmsActionForm action={saveCmsSectionAction} className="grid gap-4">
                  <input type="hidden" name="id" value={id} />
                  <input type="hidden" name="sectionId" value={section.id} />
                  <Field title="Section name">
                    <input name="field_name" defaultValue={String(section.name ?? "")} required className={inputClass} placeholder="Give this section any name" />
                  </Field>
                  {isHeroSection ? (
                    <Field title="Reuse a saved campaign">
                      <select name="field_bannerId" defaultValue={selectedBannerId} className={selectClass}>
                        <option value="">{section.type === "hero_banner" ? "Use all active campaigns as a carousel" : "Use this section’s own media and copy"}</option>
                        {reusableBanners.map((banner) => (
                          <option key={banner.id} value={banner.id} disabled={!banner.active}>
                            {(banner.headline || banner.eyebrow || banner.id).slice(0, 80)}{banner.active ? "" : " (inactive)"}
                          </option>
                        ))}
                      </select>
                      <span className="text-[11px] leading-relaxed text-chalk-dim">
                        Choose an existing campaign to reuse its saved artwork, copy and buttons here. Edit the shared campaign in the Banner library; its updates will appear on every page using it.
                      </span>
                    </Field>
                  ) : null}
                  {fields.map((field) =>
                    field.kind === "toggle" ? (
                      <Field key={field.key} title={field.title}>
                        <label className="flex items-center gap-2.5 text-[12px] text-chalk">
                          <input type="hidden" name={`field_${field.key}`} value="false" />
                          <input
                            name={`field_${field.key}`}
                            type="checkbox"
                            value="true"
                            defaultChecked={isOn(section[field.key] ?? field.default)}
                            className="h-4 w-4 accent-[#e4572e]"
                          />
                          On
                        </label>
                        {field.help ? <span className="mt-1 block text-[11px] leading-relaxed text-chalk-dim">{field.help}</span> : null}
                      </Field>
                    ) : field.options ? (
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
                          defaultValue={initialValue(field, section)}
                          className={`${inputClass} min-h-[92px] py-2`}
                        />
                      </Field>
                    ) : field.kind === "color" ? (
                      <Field key={field.key} title={field.title}>
                        <ColorInput name={`field_${field.key}`} value={initialValue(field, section, "#FFFFFF")}
                          allowGradient={field.allowGradient} className={inputClass} />
                        {field.help ? <span className="mt-1 block text-[11px] leading-relaxed text-chalk-dim">{field.help}</span> : null}
                      </Field>
                    ) : field.kind === "datetime" ? (
                      <Field key={field.key} title={field.title}>
                        <LocalDateTimeInput name={`field_${field.key}`} value={initialValue(field, section)} className={inputClass} />
                        {field.help ? <span className="mt-1 block text-[11px] leading-relaxed text-chalk-dim">{field.help}</span> : null}
                      </Field>
                    ) : (
                      <Field key={field.key} title={field.title}>
                        <input
                          name={`field_${field.key}`}
                          type={field.numeric ? "number" : "text"}
                          min={field.numeric ? 0 : undefined}
                          defaultValue={initialValue(field, section)}
                          className={inputClass}
                        />
                        {field.help ? <span className="mt-1 block text-[11px] leading-relaxed text-chalk-dim">{field.help}</span> : null}
                      </Field>
                    ),
                  )}

                  {isHeroSection ? (
                    <MediaSlotsField
                      initial={Array.isArray((section as { slides?: { url: string; kind?: string }[] }).slides)
                        ? ((section as { slides?: { url: string; kind?: string }[] }).slides ?? [])
                        : []}
                      library={mediaAssets.map((asset) => ({
                        url: asset.url,
                        label: `${asset.kind} · ${asset.alt || asset.id}`,
                      }))}
                    />
                  ) : null}
                  <div className="flex flex-wrap items-center gap-2">
                    <SubmitButton pendingLabel="Saving">Save draft</SubmitButton>
                  </div>
                </CmsActionForm>
                <form action={deleteCmsSectionAction} className="mt-4 border-t border-hairline pt-4">
                  <input type="hidden" name="id" value={id} />
                  <input type="hidden" name="sectionId" value={section.id} />
                  <SubmitButton variant="outline" pendingLabel="Removing">Remove this section</SubmitButton>
                </form>
                </>
              ) : (
                <Empty title="Nothing to edit on this section" body="This one is placed by the page rather than configured in it. Its content comes from its own library." />
              )}
            </Panel>

            {["product_carousel", "product_grid"].includes(String(section.type)) ? (
              <Panel>
                <PanelHead title="What this section asks of each product" hint="The product form collects these for every product placed here. The section never stores a price." />
                <CmsActionForm action={saveCmsSectionAction} className="grid gap-3">
                  <input type="hidden" name="id" value={id} />
                  <input type="hidden" name="sectionId" value={section.id} />
                  <input type="hidden" name="requirementsCustom" value="on" />
                  <div className="grid gap-2 sm:grid-cols-2">
                    {Object.entries(sectionTypes.requirementLibrary ?? {}).map(([key, spec]) => {
                      const asked = new Set(((section.productConfigSchema as { key: string }[] | undefined) ?? []).map((f) => f.key));
                      return (
                        <label key={key} className="flex cursor-pointer items-start gap-2.5 rounded-[10px] border border-hairline bg-panel-2 p-3">
                          <input type="checkbox" name="requirement" value={key} defaultChecked={asked.has(key)} className="mt-0.5 accent-[#e4572e]" />
                          <span className="text-[12.5px] text-chalk">
                            {String(spec.label ?? key)}
                            {typeof spec.hint === "string" ? <span className="mt-0.5 block text-[11px] leading-relaxed text-chalk-dim">{spec.hint}</span> : null}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                  <div className="flex flex-wrap gap-2"><SubmitButton pendingLabel="Saving">Save what it asks for</SubmitButton></div>
                </CmsActionForm>
              </Panel>
            ) : null}

            {["product_carousel", "product_grid"].includes(String(section.type)) ? (
              <Panel>
                <PanelHead title="What each product card shows" hint="These are presentation switches only; product and section prices remain owned by the catalogue and placement." />
                <CmsActionForm action={saveCmsSectionAction} className="grid gap-3">
                  <input type="hidden" name="id" value={id} />
                  <input type="hidden" name="sectionId" value={section.id} />
                  <div className="grid gap-2 sm:grid-cols-2">
                    {cardDisplayFields.map((field) => {
                      const raw = section[field.key];
                      const checked = raw === undefined ? Boolean(field.default) : raw === true || String(raw).toLowerCase() === "true";
                      return (
                        <label key={field.key} className="flex cursor-pointer items-start gap-2.5 rounded-[10px] border border-hairline bg-panel-2 p-3">
                          <input type="hidden" name={`field_${field.key}`} value="false" />
                          <input type="checkbox" name={`field_${field.key}`} value="true" defaultChecked={checked} className="mt-0.5 accent-[#e4572e]" />
                          <span className="text-[12.5px] text-chalk">{field.label}{typeof field.hint === "string" ? <span className="mt-0.5 block text-[11px] leading-relaxed text-chalk-dim">{field.hint}</span> : null}</span>
                        </label>
                      );
                    })}
                  </div>
                  <div><SubmitButton pendingLabel="Saving">Save card display</SubmitButton></div>
                </CmsActionForm>
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
            <CmsSectionPreview
              key={section.id}
              section={section}
              products={previewData?.products ?? []}
              categories={previewData?.categories ?? []}
              brands={previewData?.brands ?? []}
              stores={previewData?.stores ?? []}
              adverts={previewData?.adverts ?? []}
              banners={reusableBanners}
              hasDraft={previewData?.hasDraft ?? page?.hasDraft ?? false}
              documentStatus={previewData?.documentStatus ?? page?.status ?? "draft"}
              error={previewError}
            />

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

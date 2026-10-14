import { Plus } from "lucide-react";
import { CmsActionForm } from "@/components/ops/cms-action-form";
import { Field, SubmitButton } from "@/components/ops/controls";
import { inputClass, selectClass } from "@/components/ops/table";
import { addCmsSectionAction } from "@/lib/actions";
import type { CmsPaletteEntry, CmsSectionTypes } from "@/lib/api";

/**
 * The add-section palette.
 *
 * A section is chosen with a button, not by filling in a form: the form an
 * operator used to meet first asked for the source, the layout and the count
 * before anything existed to configure. Here a button adds the section, and the
 * section's own editor asks the questions that belong to it.
 *
 * The palette itself comes from the backend contract, so a section type the
 * storefront cannot render is never offered, and an automatic feed is never
 * mistaken for something a person fills by hand.
 */

/**
 * Used only when the contract cannot be fetched. It mirrors the backend's
 * groups so the CMS is never unusable, and the two are kept in step by
 * `Backend/tests/test_section_contract.py`.
 */
export const FALLBACK_SECTION_TYPES: CmsSectionTypes = {
  palette: [
    {
      id: "campaign", label: "Hero and banners", hint: "The campaign at the top of a page.",
      entries: [
        { id: "hero_banner", label: "Hero banner", type: "hero_banner" },
        { id: "hero_slim", label: "Slim banner", type: "hero_slim" },
        { id: "promo_strip", label: "Message strip", type: "promo_strip" },
      ],
    },
    {
      id: "products", label: "Products", hint: "Pick the products yourself, or let the catalogue fill it.",
      entries: [
        { id: "product_row", label: "Product row", type: "product_carousel", asksSource: true, defaultSource: "assigned" },
        { id: "product_grid", label: "Product grid", type: "product_grid", asksSource: true, defaultSource: "assigned" },
        { id: "flash_sale", label: "Flash sale", type: "product_carousel", selectionMode: "manual", source: "assigned", presentation: "flash_sale" },
      ],
    },
    {
      id: "automatic_products", label: "Product rows that pick their own products",
      hint: "These never appear in the product form. The catalogue decides.",
      entries: [
        { id: "trending", label: "Trending", type: "product_carousel", selectionMode: "automatic", source: "trending", presentation: "standard" },
        { id: "new_arrivals", label: "New arrivals", type: "product_carousel", selectionMode: "automatic", source: "newest_arrivals", presentation: "new_arrivals" },
        { id: "best_sellers", label: "Best sellers", type: "product_carousel", selectionMode: "automatic", source: "best_sellers", presentation: "standard" },
        { id: "featured", label: "Featured products", type: "product_carousel", selectionMode: "automatic", source: "featured", presentation: "featured" },
        { id: "on_sale", label: "On sale", type: "product_carousel", selectionMode: "automatic", source: "on_sale", presentation: "sale" },
      ],
    },
    {
      id: "catalogue", label: "Live catalogue", hint: "Filled from the department, brand and seller managers.",
      entries: [
        { id: "category_grid", label: "Department tiles", type: "category_grid" },
        { id: "brand_carousel", label: "Brand row", type: "brand_carousel" },
        { id: "featured_stores", label: "Stores", type: "featured_stores" },
      ],
    },
    {
      id: "display", label: "Promotions and display", hint: "Adverts and page furniture.",
      entries: [
        { id: "promo_slots", label: "Advert slots", type: "promo_slots" },
        { id: "footer", label: "Footer", type: "footer" },
      ],
    },
    {
      id: "product_template", label: "Product page template",
      hint: "Only meaningful on the product page. Each reads the product being viewed.",
      entries: [
        { id: "product_gallery", label: "Gallery", type: "product_gallery" },
        { id: "buy_box", label: "Buy box", type: "buy_box" },
        { id: "delivery_block", label: "Delivery and returns", type: "delivery_block" },
        { id: "reviews", label: "Reviews", type: "reviews" },
      ],
    },
  ],
  selectionModes: ["automatic", "manual", "none"],
  presentations: ["standard", "flash_sale", "sale", "new_arrivals", "featured"],
  automaticSources: [
    { value: "trending", label: "Trending", hint: "Ranked by units sold in the window you choose.", config: [] },
    { value: "newest_arrivals", label: "New arrivals", hint: "Newest approved products first.", config: [] },
    { value: "best_sellers", label: "Best sellers", hint: "Highest paid quantity sold in the window you choose.", config: [] },
    { value: "featured", label: "Featured products", hint: "Products an Admin has flagged as featured.", config: [] },
    { value: "on_sale", label: "On sale", hint: "Products carrying a live discount.", config: [] },
    { value: "category", label: "One department", hint: "Everything approved inside a department.", config: [] },
    { value: "collection", label: "One collection", hint: "Everything approved inside a collection.", config: [] },
    { value: "related", label: "Related to the product being viewed", hint: "Product pages only.", config: [] },
  ],
  legacySources: ["flash_sale"],
  flashSaleDefaults: {},
  productConfigPresets: {},
  allSources: ["assigned", "trending", "newest_arrivals", "best_sellers", "featured", "on_sale", "category", "collection", "related", "flash_sale"],
};

/** A button that adds a section whose kind is already decided. */
function OneClickEntry({ pageId, entry }: { pageId: string; entry: CmsPaletteEntry }) {
  return (
    <CmsActionForm action={addCmsSectionAction} className="inline-flex">
      <input type="hidden" name="id" value={pageId} />
      <input type="hidden" name="type" value={entry.type} />
      <input type="hidden" name="name" value={entry.label} />
      {entry.selectionMode ? <input type="hidden" name="selectionMode" value={entry.selectionMode} /> : null}
      {entry.source ? <input type="hidden" name="source" value={entry.source} /> : null}
      {entry.presentation ? <input type="hidden" name="presentation" value={entry.presentation} /> : null}
      <span title={entry.hint ?? ""}>
        <SubmitButton variant="outline" pendingLabel="Adding" className="px-3 py-1.5 text-[12px]">
          {entry.label}
        </SubmitButton>
      </span>
    </CmsActionForm>
  );
}

/**
 * A button that opens the one question this kind of section cannot be added
 * without: whether a person picks its products or the catalogue does.
 */
function ChooseSourceEntry({ pageId, entry, sectionTypes }: {
  pageId: string;
  entry: CmsPaletteEntry;
  sectionTypes: CmsSectionTypes;
}) {
  const automatic = sectionTypes.automaticSources.filter((source) => source.value !== "related");
  return (
    <details className="rounded-[12px] border border-hairline bg-panel-2">
      <summary className="flex cursor-pointer list-none flex-wrap items-center gap-2 px-3.5 py-2.5 text-[12.5px] font-semibold text-chalk">
        <Plus width={13} height={13} className="text-signal" />
        {entry.label}
        <span className="text-[11.5px] font-normal text-chalk-dim">
          {entry.hint ?? "Choose who picks the products."}
        </span>
      </summary>
      <CmsActionForm action={addCmsSectionAction} className="grid gap-3 border-t border-hairline p-3.5">
        <input type="hidden" name="id" value={pageId} />
        <input type="hidden" name="type" value={entry.type} />
        <Field title="Section name">
          <input name="name" required className={inputClass} placeholder={entry.label} />
        </Field>
        <Field title="How it picks its products">
          <select name="source" defaultValue={entry.defaultSource ?? "assigned"} className={selectClass}>
            <option value="assigned">Manual — the product form fills it</option>
            {automatic.map((source) => (
              <option key={source.value} value={source.value}>
                {source.label} — {source.hint}
              </option>
            ))}
          </select>
        </Field>
        <Field title="How many products">
          <input name="limit" type="number" min="1" max="60" defaultValue="8" className={inputClass} />
        </Field>
        <SubmitButton pendingLabel="Adding" className="justify-self-start">Add section</SubmitButton>
      </CmsActionForm>
    </details>
  );
}

export function SectionPalette({ pageId, sectionTypes }: {
  pageId: string;
  sectionTypes: CmsSectionTypes;
}) {
  return (
    <div className="grid gap-5">
      {sectionTypes.palette.map((group) => (
        <div key={group.id} className="grid gap-2.5">
          <div>
            <p className="font-display text-[13px] font-semibold text-chalk">{group.label}</p>
            {group.hint ? <p className="mt-0.5 text-[11.5px] leading-relaxed text-chalk-dim">{group.hint}</p> : null}
          </div>
          <div className="flex flex-wrap items-start gap-2">
            {group.entries.map((entry) => (
              entry.asksSource ? (
                <div key={entry.id} className="w-full sm:w-auto">
                  <ChooseSourceEntry pageId={pageId} entry={entry} sectionTypes={sectionTypes} />
                </div>
              ) : (
                <OneClickEntry key={entry.id} pageId={pageId} entry={entry} />
              )
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

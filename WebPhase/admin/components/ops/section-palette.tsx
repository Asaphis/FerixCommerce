import { Plus } from "lucide-react";
import { CmsActionForm } from "@/components/ops/cms-action-form";
import { SubmitButton } from "@/components/ops/controls";
import { addCmsSectionAction } from "@/lib/actions";
import type { CmsPaletteEntry, CmsSectionTypes } from "@/lib/api";
import { ProductSectionBuilder } from "@/components/ops/product-section-builder";

/**
 * The add-section palette.
 *
 * The top-level controls are section families. Product opens its own builder
 * because product membership may be manual or automatic. Category, Brand,
 * Hero, Store, and other families retain their existing manager/library feeds.
 *
 * The palette itself comes from the backend contract, so a section type the
 * storefront cannot render is never offered, and an automatic feed is never
 * mistaken for something a person fills by hand.
 */

/**
 * Used only when the contract cannot be fetched. It mirrors the backend's
 * families so the CMS is never unusable, and the two are kept in step by
 * `Backend/tests/test_section_contract.py`.
 */
export const FALLBACK_SECTION_TYPES: CmsSectionTypes = {
  palette: [
    {
      id: "hero", label: "Hero section", hint: "Uses shared Media/Banner assets.",
      entries: [
        { id: "hero_banner", label: "Hero banner", type: "hero_banner" },
        { id: "hero_slim", label: "Slim banner", type: "hero_slim" },
      ],
    },
    {
      id: "product", label: "Product section", hint: "Only Product sections choose manual or automatic product data.",
      entries: [
        { id: "product_section", label: "Configure product section", type: "product_carousel", asksSource: true, defaultSource: "assigned" },
      ],
    },
    {
      id: "category", label: "Category section", hint: "Reads the shared Category manager records.",
      entries: [{ id: "category_grid", label: "Department tiles", type: "category_grid" }],
    },
    {
      id: "brand", label: "Brand section", hint: "Reads the shared Brand manager records.",
      entries: [{ id: "brand_carousel", label: "Brand row", type: "brand_carousel" }],
    },
    {
      id: "store", label: "Store section", hint: "Reads active seller/store records.",
      entries: [{ id: "featured_stores", label: "Stores", type: "featured_stores" }],
    },
    {
      id: "other", label: "Other sections", hint: "Adverts and page furniture use their existing sources.",
      entries: [
        { id: "promo_strip", label: "Message strip", type: "promo_strip" },
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
    { value: "on_sale", label: "On sale", hint: "Products carrying a live discount.", config: [] },
    { value: "category", label: "One department", hint: "Everything approved inside a department.", config: [] },
    { value: "collection", label: "One collection", hint: "Everything approved inside a collection.", config: [] },
    { value: "related", label: "Related to the product being viewed", hint: "Product pages only.", config: [] },
  ],
  legacySources: ["flash_sale"],
  flashSaleDefaults: {},
  productConfigPresets: {},
  allSources: ["assigned", "trending", "newest_arrivals", "best_sellers", "on_sale", "category", "collection", "related", "flash_sale", "featured"],
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
        <SubmitButton variant="outline" pendingLabel="Adding" className="min-h-11 px-3.5 py-2 text-[12.5px]">
          {entry.label}
        </SubmitButton>
      </span>
    </CmsActionForm>
  );
}

export function SectionPalette({ pageId, sectionTypes }: {
  pageId: string;
  sectionTypes: CmsSectionTypes;
}) {
  return (
    <div className="grid gap-5">
      {sectionTypes.palette.map((group) => (
        <details key={group.id} className="rounded-[12px] border border-hairline bg-panel">
          <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 px-3.5 py-3 font-display text-[13.5px] font-semibold text-chalk">
            <Plus width={14} height={14} className="text-signal" />
            {group.label}
          </summary>
          <div className="grid gap-3 border-t border-hairline p-3.5">
            {group.hint ? <p className="text-[11.5px] leading-relaxed text-chalk-dim">{group.hint}</p> : null}
            <div className="flex flex-wrap items-start gap-2">
              {group.entries.map((entry) => (
                entry.asksSource ? (
                  <div key={entry.id} className="w-full">
                    <ProductSectionBuilder pageId={pageId} sectionTypes={sectionTypes} />
                  </div>
                ) : (
                  <OneClickEntry key={entry.id} pageId={pageId} entry={entry} />
                )
              ))}
            </div>
          </div>
        </details>
      ))}
    </div>
  );
}

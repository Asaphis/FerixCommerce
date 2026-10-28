import Link from "next/link";
import { ArrowLeft, Upload } from "lucide-react";
import { requireAdmin } from "@/lib/data";
import { listCatalog, listMedia, listBrands, getProductSections, type SectionOption } from "@/lib/api";
import { MediaUploadField } from "@/components/ops/media-upload-field";
import { PlacementTerms } from "@/components/ops/placement-terms";
import { Field, SubmitButton } from "@/components/ops/controls";
import { inputClass, selectClass, textareaClass } from "@/components/ops/table";
import { Eyebrow, Panel, PanelHead, Pill } from "@/components/ops/bits";
import { createCatalogProductAction } from "@/lib/ops-actions";
import { titleCase } from "@/lib/format";

export default async function NewProductPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const [{ error }, { session }] = await Promise.all([searchParams, requireAdmin()]);
  const library = await listMedia(session).catch(() => ({ assets: [], storage: "" }));
  // An asset carries its human-readable bit under whichever name the record has used over
  // time. The picker needs one plain url and label, so it falls back through them.
  const libraryOptions = library.assets.map((asset) => {
    const row = asset as { url: string; label?: string; alt?: string; name?: string };
    return { url: row.url, label: row.label ?? row.alt ?? row.name ?? row.url };
  });
  const { available: sections, placements } = await getProductSections(session, "").catch(() => ({ available: [], placements: [] }));
  const [{ categories, collections }, { brands }] = await Promise.all([listCatalog(session, {}), listBrands(session).catch(() => ({ brands: [] }))]);
  const sectionGroups = sections.reduce<Record<string, SectionOption[]>>((groups, section) => {
    const key = section.documentTitle || "Marketplace";
    (groups[key] ??= []).push(section);
    return groups;
  }, {});

  return (
    <div className="grid min-w-0 gap-5">
      {error ? <p role="alert" className="rounded-[8px] border border-rose/30 bg-rose/10 px-3 py-2 text-[12px] text-rose">{error}</p> : null}
      <header>
        <Link
          href="/catalog"
          className="inline-flex items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-[0.16em] text-chalk-dim transition-colors hover:text-chalk"
        >
          <ArrowLeft width={13} height={13} />
          Catalogue
        </Link>
        <h1 className="mt-2 font-display text-[23px] font-semibold text-chalk">Upload a product</h1>
        <p className="mt-1.5 max-w-[74ch] text-[13px] leading-relaxed text-chalk-dim">
          This creates a product owned by <strong className="font-medium text-chalk">Ferixas Official</strong> — the
          platform store. It is listed for sale the moment you set it active and switch on a channel.
        </p>
      </header>

      <form action={createCatalogProductAction} className="grid gap-4">
        <Panel className="grid gap-4">
          <PanelHead title="Basics" />
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <Field title="Title">
              <input name="title" placeholder="Studio monitor headphones" className={inputClass} required />
            </Field>
            <Field title="Slug">
              <input name="slug" placeholder="studio-monitor-headphones" className={inputClass} />
            </Field>
            <Field title="Category">
              <select name="category" defaultValue={categories[0] ?? "home"} className={selectClass}>
                {categories.map((slug) => (
                  <option key={slug} value={slug}>
                    {titleCase(slug)}
                  </option>
                ))}
              </select>
            </Field>
            <Field title="Brand">
              <select name="brand" defaultValue="" className={selectClass}>
                <option value="">No brand</option>
                {brands.filter((brand) => brand.visible).map((brand) => <option key={brand.id} value={brand.slug}>{brand.name}</option>)}
              </select>
            </Field>
            <Field title="SKU">
              <input name="sku" placeholder="FX-A1001" className={inputClass} />
            </Field>
            <Field title="Price">
              <input name="price" type="number" step="0.01" min="0" defaultValue="0" className={inputClass} />
            </Field>
            <Field title="Compare-at price">
              <input name="compareAt" type="number" step="0.01" min="0" placeholder="Optional" className={inputClass} />
            </Field>
            <Field title="Stock on hand">
              <input name="stock" type="number" min="0" defaultValue="0" className={inputClass} />
            </Field>
            <Field title="Low-stock alert at">
              <input name="lowStockAt" type="number" min="1" defaultValue="8" className={inputClass} />
            </Field>
            <Field title="Status">
              <select name="status" defaultValue="draft" className={selectClass}>
                <option value="draft">Draft — not sellable</option>
                <option value="approved">Approved — sellable</option>
                <option value="archived">Archived</option>
              </select>
            </Field>
            <Field title="Collections">
              <input name="collections" placeholder="gift-guide, new-arrivals" className={inputClass} />
            </Field>
          </div>
          <Field title="Description">
            <textarea name="description" placeholder="What the product is, in one or two sentences." className={textareaClass} />
          </Field>
          <Field title="Highlights — one per line">
            <textarea name="bullets" placeholder={"Active noise cancelling\n40-hour battery"} className={textareaClass} />
          </Field>
          <Field title="Variants — one per line (Name: value | value)">
            <textarea name="variants" placeholder={"Colour: Black | White\nSize: Small | Large"} className={textareaClass} />
          </Field>
        </Panel>

        <Panel className="grid gap-4">
          <PanelHead title="Media, shipping and placement" />
          <MediaUploadField
            key="product-image"
            urlName="imageUrl"
            fileName="mediaFile"
            kind="image"
            libraryAssets={libraryOptions}
            urlLabel="Product image URL"
            fileLabel="Upload a product image"
          />
          <Field title="Additional image URLs — one per line">
            <textarea name="images" placeholder="https://cdn.example.com/product-side.jpg" className={textareaClass} />
          </Field>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <Field title="Shipping amount"><input name="shipping_amount" type="number" step="0.01" min="0" className={inputClass} placeholder="Optional" /></Field>
            <Field title="Estimated delivery (days)"><input name="estimated_delivery_days" type="number" min="0" className={inputClass} placeholder="Optional" /></Field>
            <Field title="Package weight (kg)"><input name="package_weight" type="number" step="0.01" min="0" className={inputClass} placeholder="Optional" /></Field>
            <Field title="Package dimensions"><input name="package_dimensions" className={inputClass} placeholder="30 × 20 × 10 cm" /></Field>
            <Field title="Shipping origin"><input name="shipping_origin" className={inputClass} placeholder="Lagos, NG" /></Field>
          </div>
          <Field title="Product sections">
            <p className="-mt-2 text-[11px] leading-relaxed text-chalk-dim">Only assigned product sections appear here. Automatic sections such as Trending or Newest arrivals choose products from their configured feed.</p>
            {sections.length ? (
              <div className="grid gap-4">
                {Object.entries(sectionGroups).map(([page, pageSections]) => <fieldset key={page} className="grid gap-2"><legend className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.14em] text-chalk-dim">{page}</legend><div className="grid gap-2 sm:grid-cols-2">{pageSections.map((section) => {
                  const slot = `${section.documentId}__${section.sectionId}`;
                  const placed = placements.some(
                    (row) => row.documentId === section.documentId && row.sectionId === section.sectionId,
                  );
                  return (
                    <div
                      key={slot}
                      className="group rounded-[10px] border border-hairline p-3 transition-colors has-[:checked]:border-signal has-[:checked]:bg-signal/5"
                    >
                      <label className="flex cursor-pointer items-start gap-3">
                        <input
                          type="checkbox"
                          name={`section__${slot}`}
                          defaultChecked={placed}
                          className="mt-0.5 size-4 shrink-0 accent-signal"
                        />
                        <span className="min-w-0">
                          <span className="block text-[12.5px] font-semibold text-chalk">{section.sectionName || "Unnamed section"}</span>
                          <span className="mt-1 inline-flex"><Pill tone={section.status === "published" ? "mint" : "amber"}>{section.status === "published" ? "Live" : "Unavailable"}</Pill></span>
                          <span className="mt-0.5 block font-mono text-[10.5px] uppercase tracking-[0.12em] text-chalk-dim">
                            {section.documentTitle || "Unknown page"} · Assigned products · {section.sectionType || "unknown type"}{section.placements ? ` · ${section.placements} already` : ""}
                          </span>
                        </span>
                      </label>
                      <PlacementTerms section={section} slot={slot} />
                    </div>
                  );
                })}</div></fieldset>)}
              </div>
            ) : (
              <p className="text-[12px] text-chalk-dim">
                No page has a product section yet. Add one in the CMS, then assign products to it here.
              </p>
            )}
          </Field>

          <input type="hidden" name="store" value="on" />
          <div className="grid gap-2">
            <label className="flex items-center gap-2 text-[12.5px] text-chalk-dim">
              <input type="checkbox" name="marketplace" defaultChecked className="size-4 accent-signal" />
              Publish on Ferixas Marketplace
            </label>
          </div>
          <Field title="Tags">
            <input name="tags" placeholder="audio, wireless" className={inputClass} />
          </Field>
        </Panel>

        <Panel className="grid gap-4">
          <PanelHead title="Search listing" />
          <div className="grid gap-3 md:grid-cols-2">
            <Field title="SEO title">
              <input name="seoTitle" className={inputClass} />
            </Field>
            <Field title="SEO description">
              <input name="seoDescription" className={inputClass} />
            </Field>
          </div>
        </Panel>

        <div className="flex flex-wrap items-center gap-3">
          <SubmitButton pendingLabel="Uploading">
            <Upload width={14} height={14} />
            Create product
          </SubmitButton>
          <Link href="/catalog" className="text-[12.5px] text-chalk-dim transition-colors hover:text-chalk">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}

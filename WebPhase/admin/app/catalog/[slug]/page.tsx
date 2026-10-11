import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Store } from "lucide-react";
import { requireAdmin } from "@/lib/data";
import { listCatalog, listMedia, listBrands, getProductSections, type SectionOption } from "@/lib/api";
import { MediaUploadField } from "@/components/ops/media-upload-field";
import { Field, SubmitButton } from "@/components/ops/controls";
import { inputClass, selectClass, textareaClass } from "@/components/ops/table";
import { Eyebrow, Panel, PanelHead, Pill, Readout } from "@/components/ops/bits";
import { deleteCatalogProductAction, updateCatalogProductAction } from "@/lib/ops-actions";
import { money, num, relative, titleCase } from "@/lib/format";

export default async function ProductEditorPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ error?: string }> }) {
  const [{ slug }, { error }, { session }] = await Promise.all([params, searchParams, requireAdmin()]);
  const library = await listMedia(session).catch(() => ({ assets: [], storage: "" }));
  // An asset carries its human-readable bit under whichever name the record has used over
  // time. The picker needs one plain url and label, so it falls back through them.
  const libraryOptions = library.assets.map((asset) => {
    const row = asset as { url: string; label?: string; alt?: string; name?: string };
    return { url: row.url, label: row.label ?? row.alt ?? row.name ?? row.url };
  });
  const { available: sections, placements } = await getProductSections(session, slug).catch(() => ({ available: [], placements: [] }));
  const [data, { brands }] = await Promise.all([listCatalog(session, {}), listBrands(session).catch(() => ({ brands: [] }))]);
  const product = data.products.find((row) => row.slug === slug);
  if (!product) notFound();
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
          className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-chalk-dim transition-colors hover:text-chalk"
        >
          <ArrowLeft width={13} height={13} />
          Catalogue
        </Link>
        <h1 className="mt-2 font-display text-[23px] font-semibold text-chalk">{product.title}</h1>
        <p className="mt-1.5 font-mono text-[11px] text-chalk-dim">
          {product.slug} · {product.sku || "no sku"} · updated {relative(product.updatedAt || new Date().toISOString())}
        </p>
      </header>

      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 xl:grid-cols-4">
        <Readout label="Price" value={money(product.price)} sub={product.compareAt ? `was ${money(product.compareAt)}` : "no compare price"} />
        <Readout label="Stock" value={num(product.stock)} sub="Units on hand" tone={product.stock > 0 ? "mint" : "rose"} />
        <Readout label="Sold, 30 days" value={num(product.sold30d)} sub="Across all channels" tone="violet" />
        <Readout label="Status" value={titleCase(product.status)} sub={`${product.channels.marketplace ? "marketplace" : "store only"}`} tone="amber" />
      </div>

      <Panel>
        <PanelHead title="Ownership" />
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-2 text-[13px] text-chalk">
            <Store width={14} height={14} className="text-signal" />
            {product.merchantName}
          </span>
          <Pill tone={product.merchantId === "ferixas-official" ? "violet" : "mint"}>
            {product.merchantId === "ferixas-official" ? "platform stock" : "merchant stock"}
          </Pill>
          {product.featured ? <Pill tone="signal">featured</Pill> : null}
        </div>
      </Panel>

      <form action={updateCatalogProductAction} className="grid gap-4">
        <input type="hidden" name="id" value={product.id} />
        <input type="hidden" name="slug" value={product.slug} />

        <Panel className="grid gap-4">
          <PanelHead title="Details" />
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <Field title="Title">
              <input name="title" defaultValue={product.title} className={inputClass} />
            </Field>
            <Field title="Category">
              <select name="category" defaultValue={product.category} className={selectClass}>
                {data.categories.map((option) => (
                  <option key={option} value={option}>
                    {titleCase(option)}
                  </option>
                ))}
              </select>
            </Field>
            <Field title="Brand">
              <select name="brand" defaultValue={product.brand ?? product.brandName ?? ""} className={selectClass}>
                <option value="">No brand</option>
                {brands.filter((brand) => brand.visible).map((brand) => <option key={brand.id} value={brand.slug}>{brand.name}</option>)}
              </select>
            </Field>
            <Field title="SKU">
              <input name="sku" defaultValue={product.sku} className={inputClass} />
            </Field>
            <Field title="Price">
              <input name="price" type="number" step="0.01" min="0" defaultValue={product.price} className={inputClass} />
            </Field>
            <Field title="Compare-at price">
              <input
                name="compareAt"
                type="number"
                step="0.01"
                min="0"
                defaultValue={product.compareAt ?? ""}
                className={inputClass}
              />
            </Field>
            <Field title="Stock on hand">
              <input name="stock" type="number" min="0" defaultValue={product.stock} className={inputClass} />
            </Field>
            <Field title="Low-stock alert at">
              <input name="lowStockAt" type="number" min="1" defaultValue={product.lowStockAt ?? 8} className={inputClass} />
            </Field>
            <Field title="Status">
              <select name="status" defaultValue={product.status} className={selectClass}>
                <option value="draft">Draft — not sellable</option>
                <option value="approved">Approved — sellable</option>
                <option value="archived">Archived</option>
              </select>
            </Field>
            <Field title="Collections">
              <input name="collections" defaultValue={product.collections.join(", ")} className={inputClass} />
            </Field>
            <Field title="Tags">
              <input name="tags" defaultValue={(product.tags ?? []).join(", ")} placeholder="comma separated" className={inputClass} />
            </Field>
          </div>
          <Field title="Description">
            <textarea name="description" defaultValue={product.description ?? ""} placeholder="Product description" className={textareaClass} />
          </Field>
          <Field title="Highlights — one per line">
            <textarea name="bullets" defaultValue={(product.bullets ?? []).join("\n")} placeholder={"One highlight per line"} className={textareaClass} />
          </Field>
          <Field title="Variants — one per line (Name: value | value)">
            <textarea name="variants" defaultValue={(product.variants ?? []).map((variant) => `${variant.name}: ${variant.values.join(" | ")}`).join("\n")} placeholder={"Colour: Black | White\nSize: Small | Large"} className={textareaClass} />
          </Field>
        </Panel>

        <Panel className="grid gap-4">
          <PanelHead title="Search listing" />
          <div className="grid gap-3 md:grid-cols-2">
            <Field title="SEO title"><input name="seoTitle" defaultValue={product.seoTitle ?? ""} className={inputClass} /></Field>
            <Field title="SEO description"><input name="seoDescription" defaultValue={product.seoDescription ?? ""} className={inputClass} /></Field>
          </div>
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
          <Field title="Images — one URL per line (existing images are kept unless removed here)">
            <textarea name="images" defaultValue={(product.images?.length ? product.images : [product.image]).filter(Boolean).join("\n")} className={textareaClass} />
          </Field>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <Field title="Shipping amount"><input name="shipping_amount" type="number" step="0.01" min="0" defaultValue={product.shipping_amount ?? ""} className={inputClass} placeholder="Optional" /></Field>
            <Field title="Estimated delivery (days)"><input name="estimated_delivery_days" type="number" min="0" defaultValue={product.estimated_delivery_days ?? ""} className={inputClass} placeholder="Optional" /></Field>
            <Field title="Package weight (kg)"><input name="package_weight" type="number" step="0.01" min="0" defaultValue={product.package_weight ?? ""} className={inputClass} placeholder="Optional" /></Field>
            <Field title="Package dimensions"><input name="package_dimensions" defaultValue={product.package_dimensions ?? ""} className={inputClass} placeholder="30 × 20 × 10 cm" /></Field>
            <Field title="Shipping origin"><input name="shipping_origin" defaultValue={product.shipping_origin ?? ""} className={inputClass} placeholder="Lagos, NG" /></Field>
          </div>
          <Field title="Product sections">
            {sections.length ? (
              <div className="grid gap-4">
                {Object.entries(sectionGroups).map(([page, pageSections]) => <fieldset key={page} className="grid gap-2"><legend className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-chalk-dim">{page}</legend><div className="grid gap-2 sm:grid-cols-2">{pageSections.map((section) => {
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
                          <span className="mt-0.5 block font-mono text-[10px] uppercase tracking-[0.12em] text-chalk-dim">
                            {section.documentTitle || "Unknown page"} · {section.sectionType || "unknown type"}{section.placements ? ` · ${section.placements} already` : ""}
                          </span>
                        </span>
                      </label>
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
              <input
                type="checkbox"
                name="marketplace"
                defaultChecked={product.channels.marketplace}
                className="size-4 accent-signal"
              />
              Publish on Ferixas Marketplace
            </label>
          </div>
        </Panel>

        <div className="flex flex-wrap items-center gap-3">
          <SubmitButton pendingLabel="Saving">Save product</SubmitButton>
          <Link href="/catalog" className="text-[12.5px] text-chalk-dim transition-colors hover:text-chalk">
            Back to catalogue
          </Link>
        </div>
      </form>

      <Panel className="border-rose/25">
        <PanelHead
          title="Remove product"
        />
        <form action={deleteCatalogProductAction}>
          <input type="hidden" name="id" value={product.id} />
          <input type="hidden" name="slug" value={product.slug} />
          <SubmitButton variant="danger" pendingLabel="Removing">
            Delete permanently
          </SubmitButton>
        </form>
      </Panel>
    </div>
  );
}

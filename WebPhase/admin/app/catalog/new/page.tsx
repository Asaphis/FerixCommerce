import Link from "next/link";
import { ArrowLeft, Upload } from "lucide-react";
import { requireAdmin } from "@/lib/data";
import { listCatalog } from "@/lib/api";
import { MediaUploadField } from "@/components/ops/media-upload-field";
import { Field, SubmitButton } from "@/components/ops/controls";
import { inputClass, selectClass, textareaClass } from "@/components/ops/table";
import { Eyebrow, Panel, PanelHead } from "@/components/ops/bits";
import { createCatalogProductAction } from "@/lib/ops-actions";
import { titleCase } from "@/lib/format";

export default async function NewProductPage() {
  const { session } = await requireAdmin();
  const { categories, collections } = await listCatalog(session, {});

  return (
    <div className="grid min-w-0 gap-5">
      <header>
        <Link
          href="/catalog"
          className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-chalk-dim transition-colors hover:text-chalk"
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
            <Field title="Status">
              <select name="status" defaultValue="draft" className={selectClass}>
                <option value="draft">Draft — not sellable</option>
                <option value="active">Active — sellable</option>
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
        </Panel>

        <Panel className="grid gap-4">
          <PanelHead title="Media and placement" />
          <MediaUploadField
            key="product-image"
            urlName="imageUrl"
            fileName="mediaFile"
            kind="image"
            urlLabel="Product image URL"
            fileLabel="Upload a product image"
          />
          <div className="grid gap-2 sm:grid-cols-3">
            <label className="flex items-center gap-2 text-[12.5px] text-chalk-dim">
              <input type="checkbox" name="store" defaultChecked className="size-4 accent-signal" />
              Sell on the Ferixas store
            </label>
            <label className="flex items-center gap-2 text-[12.5px] text-chalk-dim">
              <input type="checkbox" name="marketplace" defaultChecked className="size-4 accent-signal" />
              List in the marketplace
            </label>
            <label className="flex items-center gap-2 text-[12.5px] text-chalk-dim">
              <input type="checkbox" name="featured" className="size-4 accent-signal" />
              Feature on the homepage
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

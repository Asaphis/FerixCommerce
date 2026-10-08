import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Store } from "lucide-react";
import { requireAdmin } from "@/lib/data";
import { listCatalog } from "@/lib/api";
import { Field, SubmitButton } from "@/components/ops/controls";
import { inputClass, selectClass, textareaClass } from "@/components/ops/table";
import { Eyebrow, Panel, PanelHead, Pill, Readout } from "@/components/ops/bits";
import { deleteCatalogProductAction, updateCatalogProductAction } from "@/lib/ops-actions";
import { money, num, relative, titleCase } from "@/lib/format";

export default async function ProductEditorPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { session } = await requireAdmin();
  const data = await listCatalog(session, {});
  const product = data.products.find((row) => row.slug === slug);
  if (!product) notFound();

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
            <Field title="Status">
              <select name="status" defaultValue={product.status} className={selectClass}>
                <option value="draft">Draft — not sellable</option>
                <option value="active">Active — sellable</option>
                <option value="archived">Archived</option>
              </select>
            </Field>
            <Field title="Collections">
              <input name="collections" defaultValue={product.collections.join(", ")} className={inputClass} />
            </Field>
            <Field title="Tags">
              <input name="tags" placeholder="comma separated" className={inputClass} />
            </Field>
          </div>
          <Field title="Description">
            <textarea name="description" placeholder="Leave blank to keep the current description." className={textareaClass} />
          </Field>
          <Field title="Highlights — one per line">
            <textarea name="bullets" placeholder={"One highlight per line"} className={textareaClass} />
          </Field>
        </Panel>

        <Panel className="grid gap-4">
          <PanelHead title="Media and channels" />
          <Field title="Image URLs — one per line">
            <textarea name="images" placeholder="https://" className={textareaClass} />
          </Field>
          <div className="grid gap-2 sm:grid-cols-3">
            <label className="flex items-center gap-2 text-[12.5px] text-chalk-dim">
              <input type="checkbox" name="store" defaultChecked={product.channels.store} className="size-4 accent-signal" />
              Sell on the Ferixas store
            </label>
            <label className="flex items-center gap-2 text-[12.5px] text-chalk-dim">
              <input
                type="checkbox"
                name="marketplace"
                defaultChecked={product.channels.marketplace}
                className="size-4 accent-signal"
              />
              List in the marketplace
            </label>
            <label className="flex items-center gap-2 text-[12.5px] text-chalk-dim">
              <input type="checkbox" name="featured" defaultChecked={product.featured} className="size-4 accent-signal" />
              Feature on the homepage
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

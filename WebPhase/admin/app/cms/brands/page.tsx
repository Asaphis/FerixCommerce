import Link from "next/link";
import { ArrowLeft, Trash2 } from "lucide-react";
import { requireAdmin, explain } from "@/lib/data";
import { listBrands, listMedia, type AdminBrand } from "@/lib/api";
import { CmsActionForm } from "@/components/ops/cms-action-form";
import { MediaUploadField } from "@/components/ops/media-upload-field";
import { Empty, Panel, PanelHead, Pill } from "@/components/ops/bits";
import { PageHeader, inputClass } from "@/components/ops/table";
import { Field, SubmitButton } from "@/components/ops/controls";
import { deleteBrandAction, saveBrandAction } from "@/lib/actions";

/**
 * Brands, as their own page.
 *
 * This was a master-and-detail screen: the list was there, but the form only appeared
 * if you happened to click a row. Arriving on it looked like a page with nothing to
 * press, no way to add anything and no way to edit. Now every brand carries its own
 * form in place, and adding one is a panel at the top - which is how every other
 * library here works, departments included.
 */

/** One brand: its fields, its save, its delete. */
function BrandRow({ brand, position }: { brand: AdminBrand; position: number }) {
  return (
    <Panel>
      <PanelHead
        title={brand.name || "Untitled brand"}
        hint={brand.slug ? `/${brand.slug}` : undefined}
        action={
          <span className="flex items-center gap-2">
            {brand.featured ? <Pill tone="violet">Featured</Pill> : null}
            <Pill tone={brand.visible ? "mint" : "neutral"}>{brand.visible ? "Visible" : "Hidden"}</Pill>
            <Pill tone="neutral">Position {position}</Pill>
          </span>
        }
      />
      <CmsActionForm action={saveBrandAction} className="grid gap-3">
        <input type="hidden" name="id" value={brand.id} />
        <div className="grid gap-3 md:grid-cols-2">
          <Field title="Name">
            <input name="name" required defaultValue={brand.name} className={inputClass} />
          </Field>
          <Field title="Slug">
            <input name="slug" required defaultValue={brand.slug} className={inputClass} />
          </Field>
        </div>
        <Field title="Description">
          <input name="description" defaultValue={brand.description} className={inputClass} />
        </Field>
        <MediaUploadField
          key={`brand-image-${brand.id}`}
          urlName="imageUrl"
          fileName="imageFile"
          defaultUrl={brand.imageUrl}
          kind="image"
          urlLabel="Brand image URL"
          fileLabel="Upload brand image"
        />
        <div className="grid gap-3 sm:grid-cols-3">
          <Field title="Position">
            <input name="position" type="number" min={0} defaultValue={position} className={inputClass} />
          </Field>
          <label className="flex items-center gap-2 pt-6 text-[12.5px] text-chalk">
            <input type="checkbox" name="featured" defaultChecked={brand.featured} className="size-4 accent-[var(--ember)]" />
            Featured
          </label>
          <label className="flex items-center gap-2 pt-6 text-[12.5px] text-chalk">
            <input type="checkbox" name="visible" defaultChecked={brand.visible} className="size-4 accent-[var(--ember)]" />
            Visible on the shop
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SubmitButton pendingLabel="Saving">Save brand</SubmitButton>
        </div>
      </CmsActionForm>

      <CmsActionForm action={deleteBrandAction} className="mt-4 flex flex-wrap items-center gap-3 border-t border-hairline pt-4">
        <input type="hidden" name="id" value={brand.id} />
        <p className="text-[12px] text-chalk-dim">
          Deleting removes the brand for good. To take it off the shop, untick Visible and save instead.
        </p>
        <SubmitButton variant="danger" pendingLabel="Deleting">
          <Trash2 width={13} height={13} /> Delete brand
        </SubmitButton>
      </CmsActionForm>
    </Panel>
  );
}

export default async function BrandsPage() {
  const { session } = await requireAdmin();

  const library = await listMedia(session).catch(() => ({ assets: [], storage: "" }));
  const libraryOptions = library.assets.map((asset) => {
    const row = asset as { url: string; label?: string; alt?: string; name?: string };
    return { url: row.url, label: row.label ?? row.alt ?? row.name ?? row.url };
  });

  let brands: AdminBrand[] = [];
  let loadError: string | null = null;
  try {
    brands = (await listBrands(session)).brands;
  } catch (error) {
    loadError = explain(error);
  }

  const nextPosition = brands.length + 1;

  return (
    <div className="grid min-w-0 gap-5">
      <PageHeader
        back={
          <Link href="/cms" className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-chalk-dim transition-colors hover:text-chalk">
            <ArrowLeft width={13} height={13} /> Content
          </Link>
        }
        eyebrow="Marketplace"
        title="Brands"
        description="The makers a shopper can browse by. A brand band on a page shows these; how it arranges them is set in the CMS."
        action={<Pill tone="mint">{brands.length} brands</Pill>}
      />

      {loadError ? (
        <div role="status" className="rounded-[12px] border border-[#e34d32]/40 bg-[#e34d32]/8 px-4 py-3 text-[13px] text-[#b23a24]">
          {loadError}
        </div>
      ) : null}

      <Panel>
        <PanelHead
          title="Add a brand"
          hint="It appears on the shop once it is visible, in the position you give it."
        />
        <CmsActionForm action={saveBrandAction} className="mt-4 grid gap-3">
          <div className="grid gap-3 md:grid-cols-2">
            <Field title="Name">
              <input name="name" required className={inputClass} placeholder="AuraSound Audio" />
            </Field>
            <Field title="Slug">
              <input name="slug" required className={inputClass} placeholder="aurasound" />
            </Field>
          </div>
          <Field title="Description">
            <input name="description" className={inputClass} placeholder="Headphones, speakers and studio gear" />
          </Field>
          <MediaUploadField
            key="new-brand-image"
            urlName="imageUrl"
            fileName="imageFile"
            kind="image"
            urlLabel="Brand image URL"
            fileLabel="Upload brand image"
            libraryAssets={libraryOptions}
          />
          <div className="grid gap-3 sm:grid-cols-3">
            <Field title="Position">
              <input name="position" type="number" min={0} defaultValue={nextPosition} className={inputClass} />
            </Field>
            <label className="flex items-center gap-2 pt-6 text-[12.5px] text-chalk">
              <input type="checkbox" name="featured" className="size-4 accent-[var(--ember)]" />
              Featured
            </label>
            <label className="flex items-center gap-2 pt-6 text-[12.5px] text-chalk">
              <input type="checkbox" name="visible" defaultChecked className="size-4 accent-[var(--ember)]" />
              Visible on the shop
            </label>
          </div>
          <div>
            <SubmitButton pendingLabel="Adding">Add brand</SubmitButton>
          </div>
        </CmsActionForm>
      </Panel>

      {brands.length ? (
        <div className="grid gap-4">
          {brands.map((brand, index) => (
            <BrandRow key={brand.id || `new-${index}`} brand={brand} position={index + 1} />
          ))}
        </div>
      ) : (
        <Empty
          title="No brands yet"
          body="Add the first one above — a name, a slug and an image. It will appear in any brand band that a page shows."
        />
      )}
    </div>
  );
}

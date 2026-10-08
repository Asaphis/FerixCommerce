import Link from "next/link";
import { ArrowLeft, Plus } from "lucide-react";
import { requireAdmin } from "@/lib/data";
import { assetUrl, listCategories, listMedia } from "@/lib/api";
import { Field, SubmitButton } from "@/components/ops/controls";
import { inputClass } from "@/components/ops/table";
import { Empty, Eyebrow, Panel, PanelHead, Pill } from "@/components/ops/bits";
import { CmsActionForm } from "@/components/ops/cms-action-form";
import { MediaUploadField } from "@/components/ops/media-upload-field";
import { deleteCategoryAction, saveCategoryAction } from "@/lib/ops-actions";
import { num } from "@/lib/format";

function Switches({
  defaults,
}: {
  defaults: { showInNav: boolean; showAsTile: boolean; showAsText: boolean; visible: boolean };
}) {
  const rows = [
    { name: "showInNav", label: "Show in the header menu", value: defaults.showInNav },
    { name: "showAsTile", label: "Show as an image tile", value: defaults.showAsTile },
    { name: "showAsText", label: "Show as a text-only link", value: defaults.showAsText },
    { name: "visible", label: "Visible to shoppers", value: defaults.visible },
  ];
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {rows.map((row) => (
        <label key={row.name} className="flex items-center gap-2 text-[12.5px] text-chalk-dim">
          <input type="checkbox" name={row.name} defaultChecked={row.value} className="size-4 accent-signal" />
          {row.label}
        </label>
      ))}
    </div>
  );
}

export default async function CategoriesPage() {
  const { session } = await requireAdmin();

  const library = await listMedia(session).catch(() => ({ assets: [], storage: "" }));
  // The picker needs a plain url and label; an asset carries whichever of these it has.
  const libraryOptions = library.assets.map((asset) => {
    const row = asset as { url: string; label?: string; alt?: string; name?: string };
    return { url: row.url, label: row.label ?? row.alt ?? row.name ?? row.url };
  });
  const { categories } = await listCategories(session);

  return (
    <div className="grid min-w-0 gap-5">
      <header>
        <Link
          href="/cms"
          className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-chalk-dim transition-colors hover:text-chalk"
        >
          <ArrowLeft width={13} height={13} />
          Content
        </Link>
        <h1 className="mt-2 font-display text-[23px] font-semibold text-chalk">Departments</h1>
        
      </header>

      {categories.length === 0 ? (
        <Empty title="No departments yet" body="Add the first department below." />
      ) : (
        <div className="grid gap-3">
          {categories.map((category) => (
            <Panel key={category.slug} className="grid gap-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex min-w-0 items-start gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={assetUrl(category.image)}
                    alt={category.name}
                    className="h-14 w-14 shrink-0 rounded-[2px] border border-hairline object-cover"
                  />
                  <div className="min-w-0">
                    <p className="font-display text-[14px] font-semibold text-chalk">{category.name}</p>
                    <p className="mt-0.5 font-mono text-[10.5px] text-chalk-dim">
                      /{category.slug} · {num(category.count)} products
                    </p>
                    <p className="mt-1 max-w-[60ch] text-[12px] text-chalk-dim">{category.blurb || "No description"}</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {category.showAsTile ? <Pill tone="signal">tile</Pill> : null}
                  {category.showAsText ? <Pill tone="violet">text</Pill> : null}
                  {category.showInNav ? <Pill tone="mint">menu</Pill> : null}
                  <Pill tone={category.visible ? "mint" : "neutral"}>{category.visible ? "visible" : "hidden"}</Pill>
                  <Pill>#{category.position}</Pill>
                </div>
              </div>

              <details className="rounded-[2px] border border-hairline bg-panel-2">
                <summary className="cursor-pointer px-4 py-3 font-mono text-[10px] uppercase tracking-[0.16em] text-chalk-dim">
                  Edit department
                </summary>
                <CmsActionForm action={saveCategoryAction} className="grid gap-3 border-t border-hairline p-4">
                  <input type="hidden" name="slug" value={category.slug} />
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    <Field title="Name">
                      <input name="name" defaultValue={category.name} className={inputClass} />
                    </Field>
                    <Field title="Icon glyph">
                      <input name="glyph" defaultValue={category.glyph} className={inputClass} />
                    </Field>
                    <Field title="Position">
                      <input name="position" type="number" min={0} defaultValue={category.position} className={inputClass} />
                    </Field>
                    <Field title="Short description">
                      <input name="blurb" defaultValue={category.blurb} className={inputClass} />
                    </Field>
                  </div>
                  <MediaUploadField urlName="image" fileName="imageFile" defaultUrl={assetUrl(category.image)} kind="image" urlLabel="Image URL" fileLabel="Upload department image"
              libraryAssets={libraryOptions}
            />
                  <Switches
                    defaults={{
                      showInNav: category.showInNav,
                      showAsTile: category.showAsTile,
                      showAsText: category.showAsText,
                      visible: category.visible,
                    }}
                  />
                  <div>
                    <SubmitButton variant="outline" pendingLabel="Saving">
                      Save changes
                    </SubmitButton>
                  </div>
                </CmsActionForm>
                <form action={deleteCategoryAction} className="border-t border-hairline px-4 py-3">
                  <input type="hidden" name="slug" value={category.slug} />
                  <SubmitButton variant="danger" pendingLabel="Removing">
                    Delete department
                  </SubmitButton>
                </form>
              </details>
            </Panel>
          ))}
        </div>
      )}

      <Panel>
        <PanelHead title="New department" />
        <CmsActionForm action={saveCategoryAction} className="grid gap-3">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <Field title="Name">
              <input name="name" placeholder="Outdoor living" className={inputClass} />
            </Field>
            <Field title="Slug">
              <input name="slug" placeholder="outdoor-living" className={inputClass} />
            </Field>
            <Field title="Icon glyph">
              <input name="glyph" defaultValue="Tag" className={inputClass} />
            </Field>
            <Field title="Position">
              <input name="position" type="number" min={0} defaultValue={categories.length + 1} className={inputClass} />
            </Field>
            <Field title="Short description">
              <input name="blurb" placeholder="One short line." className={inputClass} />
            </Field>
          </div>
          <MediaUploadField urlName="image" fileName="imageFile" kind="image" urlLabel="Image URL" fileLabel="Upload department image"
              libraryAssets={libraryOptions}
            />
          <Switches defaults={{ showInNav: true, showAsTile: true, showAsText: false, visible: true }} />
          <div>
            <SubmitButton pendingLabel="Creating">
              <Plus width={14} height={14} />
              Create department
            </SubmitButton>
          </div>
        </CmsActionForm>
      </Panel>
    </div>
  );
}

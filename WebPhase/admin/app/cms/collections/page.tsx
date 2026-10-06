import Link from "next/link";
import { ArrowLeft, Plus } from "lucide-react";
import { requireAdmin } from "@/lib/data";
import { listCollections } from "@/lib/api";
import { Field, SubmitButton, inputClass } from "@/components/ops/controls";
import { Empty, Eyebrow, Panel, PanelHead, Pill } from "@/components/ops/bits";
import { deleteCollectionAction, saveCollectionAction } from "@/lib/ops-actions";
import { num } from "@/lib/format";

export default async function CollectionsPage() {
  const { session } = await requireAdmin();
  const { collections } = await listCollections(session);

  return (
    <div className="grid gap-5">
      <header>
        <Link
          href="/cms"
          className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-chalk-dim transition-colors hover:text-chalk"
        >
          <ArrowLeft width={13} height={13} />
          Content
        </Link>
        <h1 className="mt-2 font-display text-[23px] font-semibold text-chalk">Collections</h1>
        <p className="mt-1.5 max-w-[74ch] text-[13px] leading-relaxed text-chalk-dim">
          A collection is a curated grouping that cuts across departments — for example a gift guide. Products join
          a collection when a merchant or the catalogue team tags them with its slug.
        </p>
      </header>

      {collections.length === 0 ? (
        <Empty title="No collections yet" body="Add the first collection below." />
      ) : (
        <div className="grid gap-3">
          {collections.map((collection) => (
            <Panel key={collection.slug} className="grid gap-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex min-w-0 items-start gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={collection.image}
                    alt={collection.name}
                    className="h-14 w-14 shrink-0 rounded-[2px] border border-hairline object-cover"
                  />
                  <div className="min-w-0">
                    <p className="font-display text-[14px] font-semibold text-chalk">{collection.name}</p>
                    <p className="mt-0.5 font-mono text-[10.5px] text-chalk-dim">
                      /{collection.slug} · {num(collection.count)} products
                    </p>
                    <p className="mt-1 max-w-[60ch] text-[12px] text-chalk-dim">
                      {collection.blurb || "No description"}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Pill tone={collection.visible ? "mint" : "neutral"}>
                    {collection.visible ? "visible" : "hidden"}
                  </Pill>
                  <Pill>#{collection.position}</Pill>
                </div>
              </div>

              <details className="rounded-[2px] border border-hairline bg-panel-2">
                <summary className="cursor-pointer px-4 py-3 font-mono text-[10px] uppercase tracking-[0.16em] text-chalk-dim">
                  Edit collection
                </summary>
                <form action={saveCollectionAction} className="grid gap-3 border-t border-hairline p-4">
                  <input type="hidden" name="slug" value={collection.slug} />
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    <Field title="Name">
                      <input name="name" defaultValue={collection.name} className={inputClass} />
                    </Field>
                    <Field title="Position">
                      <input name="position" type="number" min={0} defaultValue={collection.position} className={inputClass} />
                    </Field>
                    <Field title="Image URL">
                      <input name="image" defaultValue={collection.image} className={inputClass} />
                    </Field>
                    <Field title="Short description">
                      <input name="blurb" defaultValue={collection.blurb} className={inputClass} />
                    </Field>
                  </div>
                  <label className="flex items-center gap-2 text-[12.5px] text-chalk-dim">
                    <input type="checkbox" name="visible" defaultChecked={collection.visible} className="size-4 accent-signal" />
                    Visible to shoppers
                  </label>
                  <div>
                    <SubmitButton variant="outline" pendingLabel="Saving">
                      Save changes
                    </SubmitButton>
                  </div>
                </form>
                <form action={deleteCollectionAction} className="border-t border-hairline px-4 py-3">
                  <input type="hidden" name="slug" value={collection.slug} />
                  <SubmitButton variant="danger" pendingLabel="Removing">
                    Delete collection
                  </SubmitButton>
                </form>
              </details>
            </Panel>
          ))}
        </div>
      )}

      <Panel>
        <PanelHead title="New collection" hint="Tag products with the slug to add them." />
        <form action={saveCollectionAction} className="grid gap-3">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <Field title="Name">
              <input name="name" placeholder="Gift guide" className={inputClass} />
            </Field>
            <Field title="Slug">
              <input name="slug" placeholder="gift-guide" className={inputClass} />
            </Field>
            <Field title="Position">
              <input name="position" type="number" min={0} defaultValue={collections.length + 1} className={inputClass} />
            </Field>
            <Field title="Image URL">
              <input name="image" placeholder="https://" className={inputClass} />
            </Field>
            <Field title="Short description">
              <input name="blurb" placeholder="One short line." className={inputClass} />
            </Field>
          </div>
          <label className="flex items-center gap-2 text-[12.5px] text-chalk-dim">
            <input type="checkbox" name="visible" defaultChecked className="size-4 accent-signal" />
            Visible to shoppers
          </label>
          <div>
            <SubmitButton pendingLabel="Creating">
              <Plus width={14} height={14} />
              Create collection
            </SubmitButton>
          </div>
        </form>
      </Panel>
    </div>
  );
}

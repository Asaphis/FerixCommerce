import Link from "next/link";
import { ArrowLeft, Plus } from "lucide-react";
import { requireAdmin } from "@/lib/data";
import { listMedia } from "@/lib/api";
import { Field, SubmitButton, inputClass, selectClass } from "@/components/ops/controls";
import { Empty, Eyebrow, Panel, PanelHead, Pill } from "@/components/ops/bits";
import { addMediaAction, removeMediaAction } from "@/lib/ops-actions";
import { relative, titleCase } from "@/lib/format";

export default async function MediaPage() {
  const { session } = await requireAdmin();
  const { assets, storage } = await listMedia(session);

  return (
    <div className="grid gap-5">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/cms"
            className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-chalk-dim transition-colors hover:text-chalk"
          >
            <ArrowLeft width={13} height={13} />
            Content
          </Link>
          <h1 className="mt-2 font-display text-[23px] font-semibold text-chalk">Media</h1>
          <p className="mt-1.5 max-w-[74ch] text-[13px] leading-relaxed text-chalk-dim">
            One library for banners, department tiles, collection covers and editorial imagery.
          </p>
        </div>
        <Pill tone={storage === "cloudinary" ? "mint" : "amber"}>
          {storage === "cloudinary" ? "cloudinary connected" : "storage pending"}
        </Pill>
      </header>

      {storage !== "cloudinary" ? (
        <Panel className="border-amber/30 bg-amber/5">
          <p className="text-[13px] leading-relaxed text-chalk">
            Cloudinary credentials are not set on the backend yet, so direct uploads are switched off. Pasting an
            image or video URL below works today and keeps the CMS fully usable.
          </p>
        </Panel>
      ) : null}

      <Panel>
        <PanelHead title="Add media" hint="Paste a hosted URL. Alt text keeps the storefront accessible." />
        <form action={addMediaAction} className="grid gap-3">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <Field title="Media URL">
              <input name="url" placeholder="https://" className={inputClass} />
            </Field>
            <Field title="Alt text">
              <input name="alt" placeholder="What the image shows" className={inputClass} />
            </Field>
            <Field title="Kind">
              <select name="kind" defaultValue="image" className={selectClass}>
                <option value="image">Image</option>
                <option value="video">Video</option>
              </select>
            </Field>
            <Field title="Folder">
              <input name="folder" defaultValue="platform" className={inputClass} />
            </Field>
          </div>
          <div>
            <SubmitButton pendingLabel="Adding">
              <Plus width={14} height={14} />
              Add to library
            </SubmitButton>
          </div>
        </form>
      </Panel>

      {assets.length === 0 ? (
        <Empty title="The library is empty" body="Add the first asset above. Banners, tiles and collections can all point at it." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {assets.map((asset) => (
            <Panel key={asset.id} className="grid gap-3 p-3">
              <div className="overflow-hidden rounded-[2px] border border-hairline bg-panel-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={asset.url} alt={asset.alt} className="h-32 w-full object-cover" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-[12.5px] text-chalk">{asset.alt || "No alt text"}</p>
                <p className="mt-0.5 font-mono text-[10px] text-chalk-dim">
                  {asset.folder} · {titleCase(asset.kind)} · {relative(asset.createdAt)}
                </p>
              </div>
              <form action={removeMediaAction}>
                <input type="hidden" name="id" value={asset.id} />
                <SubmitButton variant="danger" pendingLabel="Removing" className="w-full">
                  Remove
                </SubmitButton>
              </form>
            </Panel>
          ))}
        </div>
      )}

      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-chalk-dim">
        {assets.length} asset{assets.length === 1 ? "" : "s"} in the platform library
      </p>
    </div>
  );
}

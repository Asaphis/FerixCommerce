import Link from "next/link";
import { ArrowLeft, Plus } from "lucide-react";
import { requireAdmin } from "@/lib/data";
import { assetUrl, listMedia } from "@/lib/api";
import { Field, SubmitButton } from "@/components/ops/controls";
import { inputClass, selectClass } from "@/components/ops/table";
import { Empty, Eyebrow, Panel, PanelHead, Pill } from "@/components/ops/bits";
import { CmsActionForm } from "@/components/ops/cms-action-form";
import { MediaUploadField } from "@/components/ops/media-upload-field";
import { addMediaAction, removeMediaAction } from "@/lib/ops-actions";
import { relative, titleCase } from "@/lib/format";

export default async function MediaPage() {
  const { session } = await requireAdmin();
  const { assets: listedAssets, storage } = await listMedia(session);
  const assets = listedAssets.map((asset) => ({ ...asset, url: assetUrl(asset.url) }));

  return (
    <div className="grid min-w-0 gap-5">
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
          
        </div>
        <Pill tone={storage === "cloudinary" || storage === "local" ? "mint" : "amber"}>
          {storage === "cloudinary" ? "cloudinary connected" : "local MVP storage"}
        </Pill>
      </header>

      {storage !== "cloudinary" ? (
        <Panel className="border-amber/30 bg-amber/5">
          <p className="text-[13px] leading-relaxed text-chalk">
            Uploads use Cloudinary first because it is configured for this environment. If Cloudinary is temporarily
            unavailable, the MVP falls back to local storage so the CMS remains usable.
          </p>
        </Panel>
      ) : null}

      <Panel>
        <PanelHead title="Add media" />
        <CmsActionForm action={addMediaAction} className="grid gap-3">
          <MediaUploadField urlName="url" fileName="file" kind="auto" urlLabel="Media URL" fileLabel="Upload image or video" />
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 md:gap-3 xl:grid-cols-3">
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
        </CmsActionForm>
      </Panel>

      {assets.length === 0 ? (
        <Empty title="The library is empty" body="Upload a file or add a hosted URL above. Banners, tiles and collections can all point at it." />
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
        {assets.length} asset{assets.length === 1 ? "" : "s"} in the platform library · Cloudinary-first uploads enabled
      </p>
    </div>
  );
}

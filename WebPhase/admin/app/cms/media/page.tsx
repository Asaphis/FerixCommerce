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

export default async function MediaPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { session } = await requireAdmin();
  const params = (await searchParams) ?? {};
  const pick = (key: string) => {
    const value = params[key];
    return typeof value === "string" ? value : "";
  };
  const filters = { q: pick("q"), kind: pick("kind"), origin: pick("origin") };
  const { assets: listedAssets, storage, counts } = await listMedia(session, filters);
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
        <PanelHead title="Find media" />
        <form className="grid gap-2.5 sm:grid-cols-2 md:gap-3 xl:grid-cols-4">
          <Field title="Search label, tag or origin">
            <input name="q" defaultValue={filters.q} placeholder="campaign, hero, autumn…" className={inputClass} />
          </Field>
          <Field title="Kind">
            <select name="kind" defaultValue={filters.kind} className={selectClass}>
              <option value="">Any</option>
              <option value="image">Image</option>
              <option value="video">Video</option>
            </select>
          </Field>
          <Field title="Came from">
            <select name="origin" defaultValue={filters.origin} className={selectClass}>
              <option value="">Anywhere</option>
              <option value="marketplace_home">Home</option>
              <option value="marketplace_explore">Explore</option>
              <option value="marketplace_store">Storefront</option>
              <option value="marketplace_product">Product page</option>
              <option value="unused">Not used anywhere</option>
            </select>
          </Field>
          <div className="flex items-end">
            <SubmitButton pendingLabel="Filtering">Filter</SubmitButton>
          </div>
        </form>
      </Panel>

      <Panel>
        <PanelHead title="Add media" />
        <CmsActionForm action={addMediaAction} className="grid gap-3">
          <MediaUploadField urlName="url" fileName="file" kind="auto" urlLabel="Media URL" fileLabel="Upload image or video" />
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 md:gap-3 xl:grid-cols-3">
            <Field title="Label — what you will search for">
              <input name="label" placeholder="campaign-hero" className={inputClass} />
            </Field>
            <Field title="Tags — comma separated">
              <input name="tags" placeholder="hero, autumn, campaign" className={inputClass} />
            </Field>
            <Field title="Came from">
              <select name="originPage" defaultValue="marketplace_home" className={selectClass}>
                <option value="marketplace_home">Home</option>
                <option value="marketplace_explore">Explore</option>
                <option value="marketplace_store">Storefront</option>
                <option value="marketplace_product">Product page</option>
                <option value="platform">Somewhere else</option>
              </select>
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
                <p className="truncate text-[12.5px] text-chalk">{asset.label || asset.alt || "No label"}</p>
                <p className="mt-0.5 font-mono text-[10px] text-chalk-dim">
                  {asset.originPage || asset.folder} · {titleCase(asset.kind)} · {relative(asset.createdAt)}
                </p>
                {(asset.tags ?? []).length > 0 ? (
                  <p className="mt-1 truncate font-mono text-[10px] text-chalk-dim">{(asset.tags ?? []).join(" · ")}</p>
                ) : null}
              </div>
              {(asset.usedBy ?? []).length > 0 ? (
                <div className="rounded-[2px] border border-amber/40 bg-amber/10 px-2 py-1.5 text-center font-mono text-[10px] uppercase tracking-[0.12em] text-amber">
                  in use · {(asset.usedBy ?? []).length}
                </div>
              ) : (
                <div className="rounded-[2px] border border-mint/30 bg-mint/10 px-2 py-1.5 text-center font-mono text-[10px] uppercase tracking-[0.12em] text-mint">
                  unused
                </div>
              )}
              {(asset.usedBy ?? []).length > 0 ? null : (
                <form action={removeMediaAction}>
                  <input type="hidden" name="id" value={asset.id} />
                  <SubmitButton variant="danger" pendingLabel="Removing" className="w-full">
                    Remove
                  </SubmitButton>
                </form>
              )}
            </Panel>
          ))}
        </div>
      )}

      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-chalk-dim">
        {counts ? `${counts.shown} of ${counts.total} assets` : `${assets.length} assets`} · {counts?.unused ?? 0} unused · Cloudinary-first uploads enabled
      </p>
    </div>
  );
}

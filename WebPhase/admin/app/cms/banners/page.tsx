import Link from "next/link";
import { ArrowLeft, Plus } from "lucide-react";
import { requireAdmin } from "@/lib/data";
import { assetUrl, listBanners, listMedia, type MediaAsset } from "@/lib/api";
import { Field, SubmitButton } from "@/components/ops/controls";
import { inputClass, selectClass, textareaClass } from "@/components/ops/table";
import { Empty, Eyebrow, Panel, PanelHead, Pill } from "@/components/ops/bits";
import { CmsActionForm } from "@/components/ops/cms-action-form";
import { MediaUploadField } from "@/components/ops/media-upload-field";
import { deleteBannerAction, saveBannerAction } from "@/lib/ops-actions";
import { titleCase } from "@/lib/format";

export default async function BannersPage() {
  const { session } = await requireAdmin();

  const library = await listMedia(session).catch(() => ({ assets: [], storage: "" }));
  // The picker needs a plain url and label; an asset carries whichever of these it has.
  const libraryOptions = library.assets.map((asset) => {
    const row = asset as { url: string; label?: string; alt?: string; name?: string };
    return { url: row.url, label: row.label ?? row.alt ?? row.name ?? row.url };
  });
  const { banners } = await listBanners(session);
  let assets: MediaAsset[] = [];
  try { assets = (await listMedia(session)).assets.map((asset) => ({ ...asset, url: assetUrl(asset.url) })); } catch { /* the URL field remains available if the library is unavailable */ }

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
        <h1 className="mt-2 font-display text-[23px] font-semibold text-chalk">Banners</h1>
        
      </header>

      {banners.length === 0 ? (
        <Empty title="No banners yet" body="Create the first hero below. A banner needs a headline and a media URL." />
      ) : (
        <div className="grid gap-3">
          {banners.map((banner) => (
            <Panel key={banner.id} className="grid min-w-0 gap-4">
              <div className="flex min-w-0 flex-wrap items-start justify-between gap-4">
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={assetUrl(banner.image)}
                    alt={banner.headline}
                    className="h-16 w-24 shrink-0 rounded-[2px] border border-hairline object-cover"
                  />
                  <div className="min-w-0">
                    <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-chalk-dim">
                      {banner.eyebrow || "—"}
                    </p>
                    <p className="mt-1 truncate font-display text-[14px] font-semibold text-chalk">{banner.headline}</p>
                    <p className="mt-0.5 truncate text-[12px] text-chalk-dim">
                      {banner.ctaLabel} → {banner.ctaHref}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Pill tone={banner.active ? "mint" : "neutral"}>{banner.active ? "live" : "paused"}</Pill>
                  <Pill>{titleCase(banner.kind)}</Pill>
                  <Pill>#{banner.position}</Pill>
                </div>
              </div>

              <details className="rounded-[2px] border border-hairline bg-panel-2">
                <summary className="cursor-pointer px-4 py-3 font-mono text-[10px] uppercase tracking-[0.16em] text-chalk-dim">
                  Edit banner
                </summary>
                <CmsActionForm action={saveBannerAction} className="grid gap-3 border-t border-hairline p-4">
                  <input type="hidden" name="id" value={banner.id} />
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    <Field title="Media type">
                      <select name="kind" defaultValue={banner.kind} className={selectClass}>
                        <option value="image">Image</option>
                        <option value="video">Video</option>
                      </select>
                    </Field>
                    <Field title="Position">
                      <input name="order" type="number" min={1} defaultValue={banner.position} className={inputClass} />
                    </Field>
                    <Field title="Audience">
                      <select name="audience" defaultValue={banner.audience} className={selectClass}>
                        <option value="everyone">Everyone</option>
                        <option value="new">New shoppers</option>
                        <option value="returning">Returning shoppers</option>
                        <option value="merchants">Merchants</option>
                      </select>
                    </Field>
                    <Field title="Eyebrow">
                      <input name="eyebrow" defaultValue={banner.eyebrow} className={inputClass} />
                    </Field>
                    <Field title="Headline">
                      <input name="headline" defaultValue={banner.headline} className={inputClass} />
                    </Field>
                    <Field title="Accent colour">
                      <input name="accent" defaultValue={banner.accent} className={inputClass} />
                    </Field>
                    <Field title="Action label">
                      <input name="ctaLabel" defaultValue={banner.ctaLabel} className={inputClass} />
                    </Field>
                    <Field title="Action link">
                      <input name="ctaHref" defaultValue={banner.ctaHref} className={inputClass} />
                    </Field>
                    <Field title="Secondary label">
                      <input name="secondaryLabel" defaultValue={banner.secondaryLabel ?? ""} className={inputClass} />
                    </Field>
                    <Field title="Secondary link">
                      <input name="secondaryHref" defaultValue={banner.secondaryHref ?? ""} className={inputClass} />
                    </Field>
                  </div>
                  <MediaUploadField
                    urlName="mediaUrl"
                    fileName="mediaFile"
                    defaultUrl={assetUrl(banner.kind === "video" ? banner.videoUrl ?? banner.mediaUrl : banner.mediaUrl)}
                    kind="auto"
                    urlLabel="Media URL"
                    fileLabel="Upload banner image or video"
                    libraryAssets={assets.map((asset) =
              libraryAssets={libraryOptions}
            > ({ url: asset.url, label: `${asset.kind} · ${asset.alt || asset.id}` }))}
                    selectedLibraryUrl={assets.some((asset) => asset.url === assetUrl(banner.kind === "video" ? banner.videoUrl ?? banner.mediaUrl : banner.mediaUrl)) ? assetUrl(banner.kind === "video" ? banner.videoUrl ?? banner.mediaUrl : banner.mediaUrl) : ""}
                  />
                  <Field title="Body">
                    <textarea name="body" defaultValue={banner.body} className={textareaClass} />
                  </Field>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <label className="flex items-center gap-2 text-[12.5px] text-chalk-dim">
                      <input type="checkbox" name="active" defaultChecked={banner.active} className="size-4 accent-signal" />
                      Show on the storefront
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <SubmitButton variant="outline" pendingLabel="Saving">
                        Save changes
                      </SubmitButton>
                    </div>
                  </div>
                </CmsActionForm>
                <form action={deleteBannerAction} className="border-t border-hairline px-4 py-3">
                  <input type="hidden" name="id" value={banner.id} />
                  <SubmitButton variant="danger" pendingLabel="Removing">
                    Delete banner
                  </SubmitButton>
                </form>
              </details>
            </Panel>
          ))}
        </div>
      )}

      <Panel>
        <PanelHead title="New banner" />
        <CmsActionForm action={saveBannerAction} className="grid gap-3">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <Field title="Media type">
              <select name="kind" defaultValue="image" className={selectClass}>
                <option value="image">Image</option>
                <option value="video">Video</option>
              </select>
            </Field>
            <Field title="Position">
              <input name="order" type="number" min={1} defaultValue={banners.length + 1} className={inputClass} />
            </Field>
            <Field title="Audience">
              <select name="audience" defaultValue="everyone" className={selectClass}>
                <option value="everyone">Everyone</option>
                <option value="new">New shoppers</option>
                <option value="returning">Returning shoppers</option>
                <option value="merchants">Merchants</option>
              </select>
            </Field>
            <Field title="Eyebrow">
              <input name="eyebrow" placeholder="New season" className={inputClass} />
            </Field>
            <Field title="Headline">
              <input name="headline" placeholder="Up to 40% off home audio" className={inputClass} />
            </Field>
            <Field title="Accent colour">
              <input name="accent" defaultValue="#c8ff3d" className={inputClass} />
            </Field>
            <Field title="Action label">
              <input name="ctaLabel" defaultValue="Shop now" className={inputClass} />
            </Field>
            <Field title="Action link">
              <input name="ctaHref" defaultValue="/browse" className={inputClass} />
            </Field>
          </div>
          <MediaUploadField
            urlName="mediaUrl"
            fileName="mediaFile"
            kind="auto"
            urlLabel="Media URL"
            fileLabel="Upload banner image or video"
            libraryAssets={assets.map((asset) =
              libraryAssets={libraryOptions}
            > ({ url: asset.url, label: `${asset.kind} · ${asset.alt || asset.id}` }))}
          />
          <Field title="Body">
            <textarea name="body" placeholder="One short supporting line." className={textareaClass} />
          </Field>
          <label className="flex items-center gap-2 text-[12.5px] text-chalk-dim">
            <input type="checkbox" name="active" defaultChecked className="size-4 accent-signal" />
            Show on the storefront
          </label>
          <div>
            <SubmitButton pendingLabel="Creating">
              <Plus width={14} height={14} />
              Create banner
            </SubmitButton>
          </div>
        </CmsActionForm>
      </Panel>

      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-chalk-dim">
        {banners.length} banner{banners.length === 1 ? "" : "s"} · {banners.filter((b) => b.active).length} live
      </p>
    </div>
  );
}

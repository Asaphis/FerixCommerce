import { ImageOff } from "lucide-react";
import { requireMerchant } from "@/lib/data";
import { listMedia } from "@/lib/api";
import { MediaDelete, MediaForm } from "@/components/studio/media-library";
import { Empty, Eyebrow, Panel, PanelHead, Pill } from "@/components/studio/bits";
import { dateShort, relative } from "@/lib/format";

export default async function MediaPage() {
  const { session } = await requireMerchant();
  const data = await listMedia(session);
  const configured = data.storage === "cloudinary" || data.storage === "local";

  return (
    <div className="grid gap-5">
      <header className="shrinkable flex flex-wrap items-start justify-between gap-4">
        <div>
          <Eyebrow>Catalogue</Eyebrow>
          <h1 className="mt-1.5 font-display text-[23px] font-semibold text-chalk">Media</h1>
          <p className="mt-1.5 max-w-[72ch] text-[13px] leading-relaxed text-chalk-dim">
            Images and video for your products and your storefront, held against your seller account.
          </p>
        </div>
        <Pill tone={configured ? "success" : "warn"}>{data.storage === "cloudinary" ? "cloudinary connected" : "local MVP storage"}</Pill>
      </header>

      {!configured ? (
        <p className="rounded-[2px] border border-sand/35 bg-sand/10 px-3.5 py-3 text-[12.5px] leading-relaxed text-sand">
          Files upload to the backend's local media store for this MVP. Add Cloudinary later for durable,
          CDN-backed production storage; external image and video URLs remain supported.
        </p>
      ) : null}

      <div className="grid gap-3 lg:grid-cols-[1fr_2fr]">
        <div className="grid content-start gap-3">
          <MediaForm />
        </div>

        <Panel flush>
          <div className="flex flex-wrap items-center justify-between gap-3 p-5 pb-4">
            <PanelHead title="Library" hint={`${data.assets.length} asset(s) stored`} />
          </div>

          {data.assets.length ? (
            <ul className="grid gap-3 px-5 pb-5 sm:grid-cols-2 xl:grid-cols-3">
              {data.assets.map((asset) => (
                <li key={asset.id} className="grid gap-3 rounded-[3px] border border-hairline p-3">
                  <div className="overflow-hidden rounded-[2px] border border-hairline bg-panel-2">
                    {asset.kind === "video" ? (
                      <video
                        src={asset.url}
                        muted
                        playsInline
                        preload="metadata"
                        className="aspect-[4/3] w-full object-cover"
                      />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={asset.url}
                        alt={asset.alt || "Media asset"}
                        loading="lazy"
                        className="aspect-[4/3] w-full object-cover"
                      />
                    )}
                  </div>

                  <div className="min-w-0">
                    <p className="line-clamp-2 text-[12.5px] font-medium text-chalk">
                      {asset.alt || "No alt text"}
                    </p>
                    <p className="mt-1.5 flex flex-wrap items-center gap-2">
                      <Pill>{asset.kind}</Pill>
                      <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-chalk-dim">
                        {asset.folder}
                      </span>
                    </p>
                    <p className="mt-1.5 font-mono text-[10px] text-chalk-dim/70">
                      {dateShort(asset.createdAt)} · {relative(asset.createdAt)}
                    </p>
                  </div>

                  <MediaDelete id={asset.id} alt={asset.alt} />
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-5 pb-5">
              <Empty
                title="No media yet"
                body="Paste a link to an image or video on the left and it lands here, ready for your products and storefront."
              />
            </div>
          )}

          <p className="flex items-center gap-2 border-t border-hairline px-5 py-3.5 font-mono text-[9.5px] uppercase tracking-[0.14em] text-chalk-dim/70">
            <ImageOff width={11} height={11} /> Local uploads are available now; Cloudinary is an optional production adapter
          </p>
        </Panel>
      </div>
    </div>
  );
}

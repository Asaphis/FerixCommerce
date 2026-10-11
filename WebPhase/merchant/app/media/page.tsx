import { requireMerchant } from "@/lib/data";
import { apiImageUrl, listMedia } from "@/lib/api";
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
          
        </div>
        <Pill tone={configured ? "success" : "warn"}>{data.storage === "cloudinary" ? "cloudinary connected" : "local MVP storage"}</Pill>
      </header>


      <div className="grid gap-3 lg:grid-cols-[1fr_2fr]">
        <div className="grid content-start gap-3">
          <MediaForm />
        </div>

        <Panel flush>
          <div className="flex flex-wrap items-center justify-between gap-3 p-5 pb-4">
            <PanelHead title="Library" />
          </div>

          {data.assets.length ? (
            <ul className="grid gap-3 px-5 pb-5 sm:grid-cols-2 xl:grid-cols-3">
              {data.assets.map((asset) => (
                <li key={asset.id} className="grid gap-3 rounded-[3px] border border-hairline p-3">
                  <div className="overflow-hidden rounded-[2px] border border-hairline bg-panel-2">
                    {asset.kind === "video" ? (
                      <video
                        src={apiImageUrl(asset.url) ?? undefined}
                        muted
                        playsInline
                        preload="metadata"
                        className="aspect-[4/3] w-full object-cover"
                      />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={apiImageUrl(asset.url) ?? undefined}
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

        </Panel>
      </div>
    </div>
  );
}

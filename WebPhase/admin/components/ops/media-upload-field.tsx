"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Film, ImagePlus, Search, UploadCloud } from "lucide-react";
import { Field } from "@/components/ops/controls";
import { inputClass, selectClass } from "@/components/ops/table";

/**
 * Choosing an image or a video.
 *
 * The library used to be a bare dropdown: no thumbnails, nothing to search, and
 * an asset's label was its only handle. It is now a picker you browse - a grid of
 * what is already stored, filtered as you type by name or URL — with a tick on
 * the current choice. Pasting a URL and uploading a file still work exactly as
 * before, and the chosen asset posts under the same field name, so no page's form
 * contract changed.
 */

type LibraryAsset = { url: string; label: string };
type Props = {
  urlName: string;
  fileName: string;
  urlLabel?: string;
  fileLabel?: string;
  defaultUrl?: string;
  kind?: "image" | "video" | "auto";
  libraryAssets?: LibraryAsset[];
  libraryName?: string;
  selectedLibraryUrl?: string;
};

function isVideoUrl(url: string) {
  return /\.(mp4|webm|mov|m4v)(?:$|\?)/i.test(url);
}

export function MediaUploadField({
  urlName,
  fileName,
  urlLabel = "Hosted media URL",
  fileLabel = "Upload from device",
  defaultUrl = "",
  kind = "image",
  libraryAssets,
  libraryName = "mediaLibraryUrl",
  selectedLibraryUrl = "",
}: Props) {
  const [url, setUrl] = useState(defaultUrl);
  const [libraryUrl, setLibraryUrl] = useState(selectedLibraryUrl);
  const [file, setFile] = useState<File | null>(null);
  const [query, setQuery] = useState("");
  const [browsing, setBrowsing] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const objectUrl = useMemo(() => (file ? URL.createObjectURL(file) : ""), [file]);
  useEffect(() => () => { if (objectUrl) URL.revokeObjectURL(objectUrl); }, [objectUrl]);

  const previewUrl = objectUrl || libraryUrl || url;
  const isVideo = kind === "video" || (kind === "auto" && (file?.type.startsWith("video/") || isVideoUrl(previewUrl)));
  const accept = kind === "image" ? "image/*" : kind === "video" ? "video/*" : "image/*,video/*";

  const assets = libraryAssets ?? [];
  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return assets;
    return assets.filter((asset) => `${asset.label} ${asset.url}`.toLowerCase().includes(needle));
  }, [assets, query]);

  function clearFile() {
    setFile(null);
    if (fileInput.current) fileInput.current.value = "";
  }

  function choose(assetUrl: string) {
    setLibraryUrl(assetUrl === libraryUrl ? "" : assetUrl);
    if (assetUrl !== libraryUrl) {
      setUrl("");
      clearFile();
      setBrowsing(false);
    }
  }

  return (
    <div className="grid min-w-0 gap-3">
      {libraryAssets ? (
        <input type="hidden" name={libraryName} value={libraryUrl} />
      ) : null}

      {libraryAssets ? (
        <div className="rounded-[.55rem] border border-hairline">
          <button
            type="button"
            onClick={() => setBrowsing((open) => !open)}
            aria-expanded={browsing}
            className="flex w-full cursor-pointer items-center gap-2 px-3 py-2.5 text-left font-mono text-[9.5px] uppercase tracking-[.14em] text-chalk-dim transition-colors hover:text-chalk"
          >
            <ImagePlus width={13} height={13} className="text-ember" />
            Choose from media library
            <span className="ml-auto normal-case tracking-normal">
              {libraryUrl ? "1 selected" : `${assets.length} stored`}
            </span>
          </button>

          {browsing ? (
            <div className="border-t border-hairline p-3">
              {assets.length === 0 ? (
                <p className="text-[12px] text-chalk-dim">
                  Nothing in the library yet. Upload a file below and it will be stored here for next time.
                </p>
              ) : (
                <>
                  <label className="relative block">
                    <Search width={13} height={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-chalk-dim" />
                    <input
                      type="search"
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Search by name or address"
                      aria-label="Search the media library"
                      className={`${inputClass} pl-8`}
                    />
                  </label>

                  {matches.length === 0 ? (
                    <p className="mt-3 text-[12px] text-chalk-dim">Nothing matches that.</p>
                  ) : (
                    <ul className="mt-3 grid max-h-[280px] grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3">
                      {matches.map((asset) => {
                        const current = asset.url === libraryUrl;
                        return (
                          <li key={asset.url}>
                            <button
                              type="button"
                              onClick={() => choose(asset.url)}
                              className={current
                                ? "group block w-full cursor-pointer overflow-hidden rounded-[.45rem] border-2 border-signal bg-panel-2 text-left"
                                : "group block w-full cursor-pointer overflow-hidden rounded-[.45rem] border border-hairline bg-panel-2 text-left transition-colors hover:border-signal/50"}
                            >
                              <span className="relative block aspect-[4/3] w-full">
                                {isVideoUrl(asset.url) ? (
                                  <span className="grid h-full w-full place-items-center bg-[#17232b] text-white/70">
                                    <Film width={18} height={18} />
                                  </span>
                                ) : (
                                  /* eslint-disable-next-line @next/next/no-img-element */
                                  <img src={asset.url} alt={asset.label} loading="lazy" className="h-full w-full object-cover" />
                                )}
                                {current ? (
                                  <span className="absolute right-1.5 top-1.5 grid h-5 w-5 place-items-center rounded-full bg-signal text-white">
                                    <Check width={12} height={12} />
                                  </span>
                                ) : null}
                              </span>
                              <span className="block truncate px-2 py-1.5 text-[11px] text-chalk-dim group-hover:text-chalk">
                                {asset.label}
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}

                  {libraryUrl ? (
                    <button
                      type="button"
                      onClick={() => { setLibraryUrl(""); setBrowsing(false); }}
                      className="mt-3 cursor-pointer text-[12px] text-chalk-dim underline decoration-2 underline-offset-4 hover:text-chalk"
                    >
                      Clear the chosen asset
                    </button>
                  ) : null}
                </>
              )}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="grid min-w-0 gap-3 sm:grid-cols-2">
        <Field title={urlLabel}>
          <input
            name={urlName}
            value={url}
            onChange={(event) => {
              setUrl(event.target.value);
              setLibraryUrl("");
              clearFile();
            }}
            className={inputClass}
            placeholder="Paste a hosted URL, or upload a file"
          />
        </Field>
        <Field title={fileLabel}>
          <input
            ref={fileInput}
            name={fileName}
            type="file"
            accept={accept}
            onChange={(event) => {
              const nextFile = event.target.files?.[0] ?? null;
              setFile(nextFile);
              if (nextFile) setLibraryUrl("");
            }}
            className={inputClass}
          />
        </Field>
      </div>

      <div className="overflow-hidden rounded-[.55rem] border border-hairline bg-panel-2">
        <div className="flex items-center gap-2 border-b border-hairline px-3 py-2 font-mono text-[9px] uppercase tracking-[.14em] text-chalk-dim">
          {isVideo ? <Film width={13} height={13} /> : <ImagePlus width={13} height={13} />}
          Preview
          {file ? <span className="ml-auto truncate normal-case tracking-normal">{file.name}</span> : null}
          {!file && libraryUrl ? <span className="ml-auto truncate normal-case tracking-normal">from the library</span> : null}
        </div>
        {previewUrl ? (
          isVideo ? (
            // eslint-disable-next-line jsx-a11y/media-has-caption
            <video key={previewUrl} src={previewUrl} controls muted playsInline preload="metadata" className="max-h-64 w-full bg-[#17232b] object-contain" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={previewUrl} src={previewUrl} alt="Selected media preview" className="max-h-64 w-full object-contain" />
          )
        ) : (
          <div className="grid min-h-28 place-items-center px-4 text-center text-[12px] text-chalk-dim">
            <span><UploadCloud width={19} height={19} className="mx-auto mb-2 text-ember" />Choose a file, pick from the library, or paste a URL to preview it here.</span>
          </div>
        )}
      </div>
    </div>
  );
}

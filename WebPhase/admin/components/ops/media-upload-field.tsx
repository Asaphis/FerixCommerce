"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Film, ImagePlus, UploadCloud } from "lucide-react";
import { Field } from "@/components/ops/controls";
import { inputClass, selectClass } from "@/components/ops/table";

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
  const fileInput = useRef<HTMLInputElement>(null);
  const objectUrl = useMemo(() => (file ? URL.createObjectURL(file) : ""), [file]);
  useEffect(() => () => { if (objectUrl) URL.revokeObjectURL(objectUrl); }, [objectUrl]);

  const previewUrl = objectUrl || libraryUrl || url;
  const isVideo = kind === "video" || (kind === "auto" && (file?.type.startsWith("video/") || /\.(mp4|webm|mov|m4v)(?:$|\?)/i.test(previewUrl)));
  const accept = kind === "image" ? "image/*" : kind === "video" ? "video/*" : "image/*,video/*";

  function clearFile() {
    setFile(null);
    if (fileInput.current) fileInput.current.value = "";
  }

  return (
    <div className="grid min-w-0 gap-3">
      {libraryAssets ? (
        <Field title="Choose from media library">
          <select
            name={libraryName}
            value={libraryUrl}
            onChange={(event) => {
              setLibraryUrl(event.target.value);
              if (event.target.value) clearFile();
            }}
            className={selectClass}
          >
            <option value="">Select a saved asset (optional)</option>
            {libraryAssets.map((asset) => <option key={asset.url} value={asset.url}>{asset.label}</option>)}
          </select>
        </Field>
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
            <span><UploadCloud width={19} height={19} className="mx-auto mb-2 text-ember" />Choose a file or paste a URL to preview it here.</span>
          </div>
        )}
      </div>
    </div>
  );
}

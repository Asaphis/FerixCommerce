"use client";

import { useState } from "react";
import { Images, Plus, X } from "lucide-react";
import { MediaUploadField } from "@/components/ops/media-upload-field";

/**
 * A section's own media, as a list.
 *
 * Each row is the same picker the single-media field uses - upload from the
 * device, or take a file already in the library - so a hero holds several
 * slides, in order, with no second upload path existing.
 */
export type MediaSlot = { url: string; kind?: string };

export function MediaSlotsField({
  initial = [],
  library = [],
  label = "Slides",
  hint,
}: {
  initial?: MediaSlot[];
  library?: { url: string; label: string }[];
  label?: string;
  hint?: string;
}) {
  const [rows, setRows] = useState<{ key: string; url: string }[]>(() => {
    const seeded = (initial ?? []).filter((slot) => slot && (slot.url ?? "").trim());
    return seeded.length
      ? seeded.map((slot, index) => ({ key: `s${index}`, url: slot.url }))
      : [{ key: "s0", url: "" }];
  });

  const add = () => setRows((current) => [...current, { key: `s${Date.now()}`, url: "" }]);
  const remove = (key: string) =>
    setRows((current) => (current.length === 1 ? [{ key: "s0", url: "" }] : current.filter((row) => row.key !== key)));

  return (
    <div className="grid gap-3 rounded-[3px] border border-hairline bg-panel-2/40 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-[12.5px] font-semibold text-chalk">
          <Images width={14} height={14} />
          {label}
        </p>
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-chalk-dim">
          {rows.filter((row) => row.url.trim()).length} in order
        </span>
      </div>
      <p className="-mt-2 text-[11.5px] leading-relaxed text-chalk-dim">
        {hint ?? "Upload, or pick a file that is already in the library. The first slide leads; remove any you do not want."}
      </p>

      {rows.map((row, index) => (
        <div key={row.key} className="grid gap-2 rounded-[3px] border border-hairline bg-panel p-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-chalk-dim">
              {index === 0 ? "Slide 1 · lead" : `Slide ${index + 1}`}
            </span>
            <button
              type="button"
              onClick={() => remove(row.key)}
              aria-label={`Remove slide ${index + 1}`}
              className="grid h-6 w-6 cursor-pointer place-items-center rounded-[2px] border border-hairline text-chalk-dim transition-colors hover:border-rose/50 hover:text-rose"
            >
              <X width={12} height={12} />
            </button>
          </div>
          <MediaUploadField
            urlName="slideUrl"
            fileName="slideFile"
            kind="auto"
            kindName="slideKind"
            defaultUrl={row.url}
            urlLabel="Image or video URL"
            fileLabel="Upload image or video"
            libraryAssets={library}
          />
        </div>
      ))}

      <button
        type="button"
        onClick={add}
        className="inline-flex w-fit cursor-pointer items-center gap-1.5 rounded-[2px] border border-dashed border-hairline px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-chalk-dim transition-colors hover:border-chalk-dim hover:text-chalk"
      >
        <Plus width={12} height={12} />
        Add another slide
      </button>
    </div>
  );
}

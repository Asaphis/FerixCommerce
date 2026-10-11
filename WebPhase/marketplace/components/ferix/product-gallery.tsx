"use client";

import { useState } from "react";
import { assetUrl } from "@/lib/api";
import { Plate } from "@/components/ferix/marks";

export function ProductGallery({ slug, title, images }: { slug: string; title: string; images?: string[] }) {
  const items = images?.length ? images.slice(0, 8) : [];
  const [selected, setSelected] = useState(0);
  const active = items[selected] ?? null;

  return (
    <div>
      <Plate
        seed={slug}
        accent="#e4572e"
        src={assetUrl(active)}
        alt={title}
        className="aspect-[4/3] w-full"
      />
      <div className="mt-3 grid grid-cols-4 gap-3 sm:grid-cols-6">
        {(items.length ? items : [null, null, null, null]).map((image, index) => (
          <button
            key={image ?? index}
            type="button"
            aria-label={image ? `View ${title} image ${index + 1}` : `Image ${index + 1} unavailable`}
            disabled={!image}
            onClick={() => setSelected(index)}
            className={`overflow-hidden rounded-[3px] border ${index === selected ? "border-ink ring-2 ring-ink/15" : "border-line-warm opacity-70 hover:opacity-100"}`}
          >
            <Plate
              seed={`${slug}-${index + 1}`}
              accent="#e4572e"
              src={assetUrl(image)}
              alt={image ? `${title} view ${index + 1}` : ""}
              className="aspect-square w-full"
            />
          </button>
        ))}
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useState } from "react";
import { ShieldCheck, Tag, Truck, X } from "lucide-react";

const ICONS = { truck: Truck, shield: ShieldCheck, tag: Tag } as const;

export function CmsPromoStrip({
  message,
  accentColor,
  icon,
  ctaLabel,
  ctaHref,
  dismissible,
}: {
  message: string;
  accentColor?: string;
  icon?: string;
  ctaLabel?: string;
  ctaHref?: string;
  dismissible?: boolean;
}) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  const Icon = icon && Object.prototype.hasOwnProperty.call(ICONS, icon) ? ICONS[icon as keyof typeof ICONS] : null;
  const content = (
    <span className="inline-flex items-center justify-center gap-2">
      {Icon ? <Icon aria-hidden="true" width={14} height={14} /> : null}
      <span>{message}</span>
      {ctaLabel ? <span className="underline underline-offset-2">{ctaLabel}</span> : null}
    </span>
  );
  return (
    <div className="border-y border-line-warm bg-white px-4 py-2.5 text-center text-[11px] font-semibold text-ink-soft" style={accentColor ? { borderColor: accentColor } : undefined}>
      <div className="mx-auto flex max-w-[1440px] items-center justify-center gap-3">
        {ctaLabel && ctaHref ? <Link href={ctaHref} className="hover:underline" style={accentColor ? { color: accentColor } : undefined}>{content}</Link> : content}
        {dismissible ? (
          <button type="button" onClick={() => setDismissed(true)} aria-label="Dismiss message" className="grid h-7 w-7 shrink-0 place-items-center rounded-full hover:bg-black/5">
            <X width={13} height={13} />
          </button>
        ) : null}
      </div>
    </div>
  );
}

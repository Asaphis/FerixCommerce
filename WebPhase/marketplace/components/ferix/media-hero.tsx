import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { assetUrl } from "@/lib/api";
import { cn } from "@/lib/utils";

type Props = {
  mediaUrl?: string | null;
  kind?: string;
  mediaOnly?: boolean;
  eyebrow?: string;
  title?: string;
  description?: string;
  ctaLabel?: string;
  ctaHref?: string;
  secondaryLabel?: string | null;
  secondaryHref?: string | null;
  align?: "left" | "center" | "right" | string;
  vertical?: "top" | "middle" | "bottom" | string;
  tone?: "light" | "dark" | string;
  scrim?: number | string;
  heightClassName?: string;
  className?: string;
};

function isVideoUrl(url: string) {
  return /\.(mp4|webm|mov|m4v)(?:$|\?)/i.test(url);
}

/**
 * A CMS-controlled campaign surface. In media-only mode the media is the whole
 * component: no copy, CTA, scrim, colored fallback, or controls are rendered.
 */
export function MediaHero({
  mediaUrl,
  kind,
  mediaOnly = false,
  eyebrow,
  title,
  description,
  ctaLabel,
  ctaHref,
  secondaryLabel,
  secondaryHref,
  align = "left",
  vertical = "middle",
  tone = "dark",
  scrim = 48,
  heightClassName = "aspect-[16/8] min-h-[150px] sm:aspect-[16/6] lg:aspect-[16/5]",
  className,
}: Props) {
  const media = assetUrl(mediaUrl) ?? "";
  const video = kind === "video" || (kind !== "image" && isVideoUrl(media));
  const only = mediaOnly || false;
  if (only && !media) return null;

  const horizontal = align === "center" ? "items-center text-center" : align === "right" ? "items-end text-right" : "items-start text-left";
  const verticalPosition = vertical === "top" ? "justify-start pt-6 sm:pt-10" : vertical === "bottom" ? "justify-end pb-6 sm:pb-10" : "justify-center";
  const foreground = tone === "light" ? "text-ink" : "text-white";
  const rawStrength = Number(scrim);
  const strength = Math.max(0, Math.min(100, Number.isFinite(rawStrength) ? rawStrength : 48)) / 100;
  const tint = tone === "light" ? "255,255,255" : "7,20,35";
  const gradient = align === "right"
    ? `linear-gradient(270deg, rgba(${tint},${strength}) 0%, rgba(${tint},${strength * 0.68}) 42%, rgba(${tint},0) 82%)`
    : align === "center"
      ? `radial-gradient(120% 100% at 50% 50%, rgba(${tint},${strength}) 0%, rgba(${tint},${strength * 0.54}) 58%, rgba(${tint},0) 100%)`
      : `linear-gradient(90deg, rgba(${tint},${strength}) 0%, rgba(${tint},${strength * 0.68}) 42%, rgba(${tint},0) 82%)`;

  return (
    <section
      className={cn(
        "relative isolate w-full overflow-hidden",
        only ? "bg-transparent" : "bg-[#f05a28]",
        heightClassName,
        className,
      )}
    >
      {media ? (
        video ? (
          // eslint-disable-next-line jsx-a11y/media-has-caption
          <video src={media} autoPlay muted loop playsInline preload="metadata" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={media} alt="" className="absolute inset-0 h-full w-full object-cover" />
        )
      ) : (
        <div aria-hidden className="absolute inset-0" style={{ background: "linear-gradient(108deg, #e85022 0%, #f17446 54%, #ffd6bd 100%)" }} />
      )}

      {!only ? (
        <>
          {media ? <div aria-hidden className="absolute inset-0" style={{ background: gradient }} /> : null}
          <div className={cn("absolute inset-0 z-10 flex px-4 sm:px-8", verticalPosition)}>
            <div className={cn("mx-auto flex w-full max-w-[1240px]", align === "center" ? "justify-center" : align === "right" ? "justify-end" : "justify-start")}>
              <div className={cn("flex max-w-[36ch] flex-col", horizontal)}>
                {eyebrow ? <span className={cn("font-mono text-[9px] uppercase tracking-[0.18em] sm:text-[10px]", tone === "light" ? "text-ink/70" : "text-white/80")}>{eyebrow}</span> : null}
                {title ? <h2 className={cn("mt-1.5 font-display text-[20px] font-extrabold leading-tight tracking-[-0.02em] sm:text-[28px] lg:text-[34px]", foreground)}>{title}</h2> : null}
                {description ? <p className={cn("mt-1.5 line-clamp-2 max-w-[52ch] text-[11.5px] leading-relaxed sm:mt-2 sm:text-[13px]", tone === "light" ? "text-ink/80" : "text-white/85")}>{description}</p> : null}
                {ctaLabel || secondaryLabel ? (
                  <div className="mt-3 flex flex-wrap gap-2 sm:mt-5">
                    {ctaLabel ? (
                      <Link href={ctaHref || "/browse"} className="inline-flex min-h-10 w-fit items-center gap-2 bg-white px-4 py-2 text-[12px] font-bold text-[#bd421e] transition-colors hover:bg-[#fff3ed] sm:min-h-11 sm:px-5 sm:text-[13px]">
                        {ctaLabel}<ArrowRight width={14} height={14} />
                      </Link>
                    ) : null}
                    {secondaryLabel ? (
                      <Link href={secondaryHref || "/browse"} className="inline-flex min-h-10 w-fit items-center border border-white/60 bg-black/10 px-4 py-2 text-[12px] font-semibold text-white transition-colors hover:bg-white/15 sm:min-h-11 sm:px-5 sm:text-[13px]">
                        {secondaryLabel}
                      </Link>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </>
      ) : null}
    </section>
  );
}

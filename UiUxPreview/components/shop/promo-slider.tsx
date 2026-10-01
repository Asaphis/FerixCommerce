"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Pause, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { DEFAULT_OVERLAY } from "@/lib/data";
import type { Banner, BannerKind, BannerOverlay, HeroSlide } from "@/lib/types";

export type SliderSlide = {
  id: string;
  kind: BannerKind;
  eyebrow?: string;
  headline: string;
  body?: string;
  ctaLabel?: string;
  ctaHref?: string;
  secondaryLabel?: string;
  secondaryHref?: string;
  accent: string;
  hue: number;
  mediaUrl?: string | null;
  posterNote?: string;
  duration: number;
  overlay: BannerOverlay;
};

function toSlides(banners: Banner[]): SliderSlide[] {
  return banners
    .filter((b) => b.active)
    .sort((a, b) => a.order - b.order)
    .map((b) => ({
      id: b.id,
      kind: b.kind,
      eyebrow: b.eyebrow,
      headline: b.headline,
      body: b.body,
      ctaLabel: b.ctaLabel,
      ctaHref: b.ctaHref,
      secondaryLabel: b.secondaryLabel,
      secondaryHref: b.secondaryHref,
      accent: b.accent,
      hue: b.hue,
      mediaUrl: b.mediaUrl,
      posterNote: b.posterNote,
      duration: b.duration,
      overlay: b.overlay ?? DEFAULT_OVERLAY,
    }));
}

function heroToSlides(slides: HeroSlide[], accent: string, accentHue: number): SliderSlide[] {
  return slides.map((s, i) => ({
    id: s.id,
    kind: s.kind,
    headline: s.headline,
    body: s.body,
    ctaLabel: s.ctaLabel,
    ctaHref: s.ctaHref,
    accent,
    hue: (accentHue + i * 46) % 360,
    mediaUrl: s.mediaUrl,
    posterNote: s.mediaUrl ? "Uploaded media" : undefined,
    duration: s.duration,
    overlay: s.overlay ?? DEFAULT_OVERLAY,
  }));
}

/**
 * Promotional banner slider — the storefront hero.
 *
 * The uploaded image or video fills the banner edge to edge, and the copy sits
 * on top of it. Each slide carries its own overlay settings (alignment, vertical
 * position, scrim strength, text tone, column width), so one banner can be a
 * left-aligned headline over a dark scrim while the next is centred on a light
 * scrim. Autoplay stops on hover, on focus, and while the tab is hidden, and
 * never starts for visitors who ask for reduced motion.
 */
export function PromoSlider({
  banners,
  heroSlides,
  brand,
  accentHue = 18,
  viewportClassName,
  autoplay = true,
  className,
}: {
  banners?: Banner[];
  heroSlides?: HeroSlide[];
  brand?: { accent: string; accentInk: string };
  accentHue?: number;
  /** Height classes for the banner, e.g. "h-[620px]" or "h-[70vh]". */
  viewportClassName?: string;
  autoplay?: boolean;
  className?: string;
}) {
  const slides: SliderSlide[] = banners
    ? toSlides(banners)
    : heroSlides && brand
      ? heroToSlides(heroSlides, brand.accent, accentHue)
      : [];

  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(autoplay);
  const [reduced, setReduced] = useState(false);
  const [paused, setPaused] = useState(false);
  const timer = useRef<number | null>(null);
  const startX = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    if (mq.matches) setPlaying(false);
  }, []);

  useEffect(() => {
    if (index >= slides.length) setIndex(0);
  }, [slides.length, index]);

  const go = useCallback(
    (next: number) => {
      if (!slides.length) return;
      setIndex(((next % slides.length) + slides.length) % slides.length);
    },
    [slides.length],
  );

  useEffect(() => {
    if (timer.current) window.clearTimeout(timer.current);
    if (!playing || paused || reduced || slides.length < 2) return;
    timer.current = window.setTimeout(() => go(index + 1), slides[index]?.duration ?? 7000);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [index, playing, paused, reduced, slides, go]);

  useEffect(() => {
    const onVisibility = () => setPaused(document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  if (!slides.length) {
    return (
      <div className={cn("flex min-h-[320px] items-center justify-center bg-bone-soft px-4", className)}>
        <div className="text-center">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-soft">
            No banners are live
          </p>
          <p className="mt-2 text-[13px] text-ink-soft">
            Add and activate a banner in Admin &rarr; Marketplace.
          </p>
        </div>
      </div>
    );
  }

  const height = viewportClassName ?? "h-[560px] sm:h-[600px] lg:h-[680px]";

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Promotional banners"
      className={cn("relative isolate w-full overflow-hidden bg-void", height, className)}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") {
          e.preventDefault();
          go(index + 1);
        }
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          go(index - 1);
        }
      }}
      onPointerDown={(e) => {
        startX.current = e.clientX;
      }}
      onPointerUp={(e) => {
        if (startX.current === null) return;
        const delta = e.clientX - startX.current;
        startX.current = null;
        if (Math.abs(delta) > 48) go(index + (delta < 0 ? 1 : -1));
      }}
    >
      {slides.map((slide, i) => {
        const on = i === index;
        return (
          <article
            key={slide.id}
            aria-hidden={!on}
            aria-label={`Slide ${i + 1} of ${slides.length}`}
            className={cn(
              "absolute inset-0 transition-opacity duration-700 ease-out",
              on ? "z-10 opacity-100" : "pointer-events-none z-0 opacity-0",
            )}
          >
            <FullBleedMedia slide={slide} />
            {slide.overlay.enabled ? <Scrim overlay={slide.overlay} accent={slide.accent} /> : null}
            <OverlayContent slide={slide} on={on} />
          </article>
        );
      })}

      <div className="absolute inset-x-0 bottom-0 z-30 border-t border-white/12 bg-void/60 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1240px] items-center gap-3 px-4 py-3">
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-chalk-dim">
            {String(index + 1).padStart(2, "0")} / {String(slides.length).padStart(2, "0")}
          </span>

          <div className="flex flex-1 items-center gap-1.5 sm:gap-2">
            {slides.map((slide, i) => (
              <button
                key={slide.id}
                type="button"
                onClick={() => go(i)}
                aria-label={`Go to slide ${i + 1}`}
                aria-current={i === index}
                className="group relative h-1.5 flex-1 cursor-pointer overflow-hidden rounded-[1px] bg-chalk/25"
              >
                <span
                  key={`${slide.id}-${i === index ? "active" : "idle"}-${playing}-${paused}`}
                  className={cn("absolute inset-y-0 left-0 bg-chalk", i === index ? "" : "w-0 group-hover:w-1/4")}
                  style={
                    i === index && playing && !paused && !reduced
                      ? {
                          width: 0,
                          animation: `fxprogress ${slide.duration}ms linear forwards`,
                        }
                      : i === index
                        ? { width: "100%" }
                        : undefined
                  }
                />
              </button>
            ))}
          </div>

          <span className="hidden font-mono text-[10px] uppercase tracking-[0.16em] text-chalk-dim md:inline">
            {slides[index]?.kind === "video" ? "Video banner" : "Image banner"}
          </span>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPlaying((v) => !v)}
              aria-label={playing ? "Pause the banners" : "Play the banners"}
              className="grid h-8 w-8 cursor-pointer place-items-center rounded-[2px] text-chalk-dim transition-colors hover:bg-white/10 hover:text-chalk"
            >
              {playing ? <Pause width={13} height={13} /> : <Play width={13} height={13} />}
            </button>
            <button
              type="button"
              onClick={() => go(index - 1)}
              aria-label="Previous banner"
              className="grid h-8 w-8 cursor-pointer place-items-center rounded-[2px] text-chalk-dim transition-colors hover:bg-white/10 hover:text-chalk"
            >
              <ArrowLeft width={14} height={14} />
            </button>
            <button
              type="button"
              onClick={() => go(index + 1)}
              aria-label="Next banner"
              className="grid h-8 w-8 cursor-pointer place-items-center rounded-[2px] text-chalk-dim transition-colors hover:bg-white/10 hover:text-chalk"
            >
              <ArrowRight width={14} height={14} />
            </button>
          </div>
        </div>
      </div>

      <style>{`@keyframes fxsheen { 0% { transform: translateX(-120%); } 100% { transform: translateX(320%); } }
        @keyframes fxprogress { from { width: 0; } to { width: 100%; } }
        @media (prefers-reduced-motion: reduce) { [style*="fxprogress"] { animation: none !important; width: 100% !important; } }`}</style>
    </section>
  );
}

/** The uploaded image, uploaded video, or generated artwork — full width. */
function FullBleedMedia({ slide }: { slide: SliderSlide }) {
  if (slide.mediaUrl && slide.kind === "video") {
    return (
      <video
        src={slide.mediaUrl}
        className="absolute inset-0 h-full w-full object-cover"
        autoPlay
        muted
        loop
        playsInline
      />
    );
  }

  if (slide.mediaUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={slide.mediaUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
    );
  }

  const hue = slide.hue;
  return (
    <div
      className="absolute inset-0"
      style={{
        background: `linear-gradient(118deg, hsl(${hue} 26% 15%) 0%, hsl(${(hue + 38) % 360} 34% 10%) 52%, hsl(${(hue + 14) % 360} 22% 7%) 100%)`,
      }}
    >
      <div
        className="absolute inset-0 opacity-60"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.055) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.055) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
        }}
      />
      <span
        className="absolute -right-16 top-1/4 h-[420px] w-[420px] rounded-full opacity-50"
        style={{ background: `radial-gradient(circle, ${slide.accent}55, transparent 68%)` }}
      />
      {slide.kind === "video" ? (
        <>
          <span className="absolute inset-0 grid place-items-center">
            <span
              className="grid h-20 w-20 place-items-center rounded-full backdrop-blur-sm"
              style={{ background: `${slide.accent}33`, border: `1px solid ${slide.accent}88` }}
            >
              <Play width={26} height={26} className="text-chalk" />
            </span>
          </span>
          <span
            className="pointer-events-none absolute inset-y-0 w-1/4 opacity-20"
            style={{
              background: `linear-gradient(90deg, transparent, ${slide.accent}, transparent)`,
              animation: "fxsheen 5s linear infinite",
            }}
          />
          <span className="absolute bottom-20 left-4 font-mono text-[9.5px] uppercase tracking-[0.16em] text-chalk-dim">
            {slide.posterNote ?? "Video banner \u00b7 upload a file to replace this frame"}
          </span>
        </>
      ) : (
        <span className="absolute bottom-20 left-4 font-mono text-[9.5px] uppercase tracking-[0.16em] text-chalk-dim">
          {slide.posterNote ?? "Banner artwork"}
        </span>
      )}
    </div>
  );
}

/** Readability scrim, shaped by the overlay alignment. */
function Scrim({ overlay, accent }: { overlay: BannerOverlay; accent: string }) {
  const s = Math.max(0, Math.min(100, overlay.scrim)) / 100;
  const dark = overlay.tone === "light";
  const tint = dark ? "0,0,0" : "255,255,255";

  const byAlign: Record<BannerOverlay["align"], string> = {
    left: `linear-gradient(90deg, rgba(${tint},${s}) 0%, rgba(${tint},${s * 0.72}) 42%, rgba(${tint},0) 78%)`,
    right: `linear-gradient(270deg, rgba(${tint},${s}) 0%, rgba(${tint},${s * 0.72}) 42%, rgba(${tint},0) 78%)`,
    center: `radial-gradient(120% 90% at 50% 50%, rgba(${tint},${s}) 0%, rgba(${tint},${s * 0.6}) 55%, rgba(${tint},0) 100%)`,
  };

  return (
    <>
      <div className="absolute inset-0" style={{ background: byAlign[overlay.align] }} />
      <div
        className="absolute inset-x-0 bottom-0 h-2/5"
        style={{ background: `linear-gradient(to top, rgba(${tint},${s * 0.9}), transparent)` }}
      />
      <span
        className="pointer-events-none absolute inset-x-0 top-0 h-1"
        style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }}
      />
    </>
  );
}

/** The overlaid copy and buttons. */
function OverlayContent({ slide, on }: { slide: SliderSlide; on: boolean }) {
  const { overlay } = slide;
  const light = overlay.tone === "light";

  const justify =
    overlay.align === "center" ? "justify-center" : overlay.align === "right" ? "justify-end" : "justify-start";
  const align = overlay.align === "center" ? "items-center" : overlay.align === "right" ? "items-end" : "items-start";
  const vertical =
    overlay.vertical === "top" ? "items-start" : overlay.vertical === "bottom" ? "items-end" : "items-center";
  const textAlign =
    overlay.align === "center" ? "text-center" : overlay.align === "right" ? "text-right" : "text-left";

  return (
    <div className={cn("absolute inset-0 z-20 flex px-4 pb-16 pt-8 sm:px-6", vertical)}>
      <div className="mx-auto flex h-full w-full max-w-[1240px]">
        <div className={cn("flex w-full", justify)}>
          <div
            className={cn("flex flex-col", align, textAlign)}
            style={{ maxWidth: `${Math.max(18, Math.min(64, overlay.width))}ch` }}
          >
            {slide.eyebrow ? (
              <span
                className="inline-flex items-center gap-2 rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.16em] backdrop-blur-sm"
                style={{
                  borderColor: `${slide.accent}77`,
                  background: `${slide.accent}26`,
                  color: light ? "#f2f4f7" : "#14110e",
                }}
              >
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: slide.accent }} />
                {slide.eyebrow}
              </span>
            ) : null}

            <h1
              className={cn(
                "mt-4 font-display font-extrabold leading-[1.02] tracking-[-0.03em]",
                "text-[32px] sm:text-[46px] lg:text-[62px]",
                light ? "text-white" : "text-ink",
              )}
              style={{ textShadow: light ? "0 2px 24px rgba(0,0,0,0.35)" : "none" }}
            >
              {slide.headline.split("\n").map((line, li) => (
                <span key={`${line}-${li}`} className="block">
                  {line}
                </span>
              ))}
            </h1>

            {slide.body ? (
              <p
                className={cn(
                  "mt-4 text-[14.5px] leading-relaxed sm:text-[15.5px]",
                  light ? "text-white/85" : "text-ink/80",
                )}
              >
                {slide.body}
              </p>
            ) : null}

            <div
              className={cn(
                "mt-7 flex flex-wrap items-center gap-3",
                overlay.align === "center" ? "justify-center" : overlay.align === "right" ? "justify-end" : "",
              )}
            >
              {slide.ctaLabel ? (
                <Link
                  href={slide.ctaHref || "/browse"}
                  tabIndex={on ? 0 : -1}
                  className="inline-flex h-12 cursor-pointer items-center gap-2 rounded-[2px] px-5 text-[14px] font-semibold text-white shadow-[0_18px_40px_-18px_rgba(0,0,0,0.55)] transition-transform duration-200 hover:-translate-y-0.5"
                  style={{ background: slide.accent }}
                >
                  {slide.ctaLabel}
                  <ArrowRight width={15} height={15} />
                </Link>
              ) : null}
              {slide.secondaryLabel ? (
                <Link
                  href={slide.secondaryHref || "/browse"}
                  tabIndex={on ? 0 : -1}
                  className={cn(
                    "inline-flex h-12 cursor-pointer items-center gap-2 rounded-[2px] border px-5 text-[14px] font-medium backdrop-blur-sm transition-colors",
                    light
                      ? "border-white/40 text-white hover:border-white/80 hover:bg-white/10"
                      : "border-ink/25 text-ink hover:border-ink/70 hover:bg-ink/5",
                  )}
                >
                  {slide.secondaryLabel}
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

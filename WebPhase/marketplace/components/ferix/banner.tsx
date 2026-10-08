"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Pause, Play } from "lucide-react";
import type { Banner } from "@/lib/api";
import { assetUrl } from "@/lib/api";
import { cn } from "@/lib/utils";

/**
 * The storefront promotional banner. Each slide's uploaded image or video fills
 * the frame edge to edge, with the copy and buttons overlaid on top of it.
 */
export function PromoBanner({
  banners,
  className,
  heightClassName = "h-[300px] sm:h-[380px] lg:h-[440px]",
}: {
  banners: Banner[];
  className?: string;
  heightClassName?: string;
}) {
  const slides = banners ?? [];
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);
  const timer = useRef<number | null>(null);
  const startX = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    if (mq.matches) setPlaying(false);
  }, []);

  const go = (next: number) => {
    if (!slides.length) return;
    setIndex(((next % slides.length) + slides.length) % slides.length);
  };

  useEffect(() => {
    if (timer.current) window.clearTimeout(timer.current);
    if (!playing || paused || reduced || slides.length < 2) return;
    timer.current = window.setTimeout(() => go(index + 1), slides[index]?.duration ?? 7000);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [index, playing, paused, reduced, slides]);

  useEffect(() => {
    const onVisibility = () => setPaused(document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  if (!slides.length) {
    return (
      <div className={cn("flex items-center justify-center bg-[#fff0e9] px-4", heightClassName, className)}>
        <p className="font-display text-[15px] font-semibold text-ink">
          Discover something new on Ferixas
        </p>
      </div>
    );
  }

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Promotions"
      className={cn("relative isolate w-full overflow-hidden bg-[#f05a28]", heightClassName, className)}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
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
      {slides.map((slide, i) => (
        <article
          key={slide.id}
          aria-hidden={i !== index}
          className={cn(
            "absolute inset-0 transition-opacity duration-700 ease-out",
            i === index ? "z-10 opacity-100" : "pointer-events-none z-0 opacity-0",
          )}
        >
          <SlideMedia slide={slide} />
          {slide.overlay?.enabled ? <Scrim overlay={slide.overlay} accent={slide.accent} /> : null}
          <SlideCopy slide={slide} active={i === index} />
        </article>
      ))}

      <div className="absolute inset-x-0 bottom-0 z-30 bg-gradient-to-t from-black/70 to-transparent">
        <div className="mx-auto flex max-w-[1240px] items-center gap-3 px-4 py-2.5">
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-chalk-dim">
            {String(index + 1).padStart(2, "0")} / {String(slides.length).padStart(2, "0")}
          </span>
          <div className="flex flex-1 items-center gap-1.5">
            {slides.map((slide, i) => {
              const active = i === index;
              const animating = active && playing && !paused && !reduced;
              return (
                <button
                  key={slide.id}
                  type="button"
                  onClick={() => go(i)}
                  aria-label={`Go to promotion ${i + 1}`}
                  aria-current={active}
                  className="group relative h-1.5 flex-1 cursor-pointer overflow-hidden rounded-[1px] bg-chalk/25"
                >
                  <span
                    className={cn("absolute inset-y-0 left-0 bg-chalk", active ? "" : "w-0 group-hover:w-1/4")}
                    style={
                      animating
                        ? {
                            width: "100%",
                            transformOrigin: "left",
                            animation: `fxprogress ${slide.duration}ms linear forwards`,
                          }
                        : active
                          ? { width: "100%" }
                          : undefined
                    }
                  />
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPlaying((v) => !v)}
              aria-label={playing ? "Pause the promotions" : "Play the promotions"}
              className="grid h-8 w-8 cursor-pointer place-items-center rounded-[2px] text-chalk-dim transition-colors hover:bg-white/10 hover:text-chalk"
            >
              {playing ? <Pause width={13} height={13} /> : <Play width={13} height={13} />}
            </button>
            <button
              type="button"
              onClick={() => go(index - 1)}
              aria-label="Previous promotion"
              className="grid h-8 w-8 cursor-pointer place-items-center rounded-[2px] text-chalk-dim transition-colors hover:bg-white/10 hover:text-chalk"
            >
              <ArrowLeft width={14} height={14} />
            </button>
            <button
              type="button"
              onClick={() => go(index + 1)}
              aria-label="Next promotion"
              className="grid h-8 w-8 cursor-pointer place-items-center rounded-[2px] text-chalk-dim transition-colors hover:bg-white/10 hover:text-chalk"
            >
              <ArrowRight width={14} height={14} />
            </button>
          </div>
        </div>
      </div>

      <style>{`@keyframes fxprogress { from { transform: scaleX(0); } to { transform: scaleX(1); } }
        @media (prefers-reduced-motion: reduce) { [style*="fxprogress"] { animation: none !important; } }`}</style>
    </section>
  );
}

function SlideMedia({ slide }: { slide: Banner }) {
  const media = assetUrl(slide.mediaUrl);
  if (media && slide.kind === "video") {
    return (
      <video
        src={media}
        className="absolute inset-0 h-full w-full object-cover"
        autoPlay
        muted
        loop
        playsInline
        aria-hidden="true"
      />
    );
  }
  if (media) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={media} alt="" className="absolute inset-0 h-full w-full object-cover" />;
  }
  return (
    <div
      className="absolute inset-0"
      style={{ background: "linear-gradient(108deg, #e85022 0%, #f17446 54%, #ffd6bd 100%)" }}
    >
      <span
        className="absolute -right-24 -top-24 h-[380px] w-[380px] rounded-full opacity-45"
        style={{ background: `radial-gradient(circle, ${slide.accent || "#ff8d59"}, transparent 70%)` }}
      />
    </div>
  );
}

function Scrim({ overlay, accent }: { overlay: Banner["overlay"]; accent: string }) {
  const strength = Math.max(0, Math.min(100, overlay.scrim)) / 100;
  const tint = overlay.tone === "light" ? "0,0,0" : "255,255,255";
  const gradients: Record<string, string> = {
    left: `linear-gradient(90deg, rgba(${tint},${strength}) 0%, rgba(${tint},${strength * 0.72}) 42%, rgba(${tint},0) 78%)`,
    right: `linear-gradient(270deg, rgba(${tint},${strength}) 0%, rgba(${tint},${strength * 0.72}) 42%, rgba(${tint},0) 78%)`,
    center: `radial-gradient(120% 90% at 50% 50%, rgba(${tint},${strength}) 0%, rgba(${tint},${strength * 0.6}) 55%, rgba(${tint},0) 100%)`,
  };
  return (
    <>
      <div className="absolute inset-0" style={{ background: gradients[overlay.align] ?? gradients.left }} />
      <div
        className="absolute inset-x-0 bottom-0 h-2/5"
        style={{ background: `linear-gradient(to top, rgba(${tint},${strength * 0.9}), transparent)` }}
      />
      <span className="pointer-events-none absolute inset-x-0 top-0 h-1" style={{ background: accent }} />
    </>
  );
}

function SlideCopy({ slide, active }: { slide: Banner; active: boolean }) {
  const overlay = slide.overlay;
  const light = overlay.tone !== "dark";
  const showText = overlay.enabled && overlay.showText;
  const showButtons = overlay.enabled && overlay.showButtons;

  const horizontal = overlay.align === "center" ? "items-center text-center" : overlay.align === "right" ? "items-end text-right" : "items-start text-left";
  const vertical = overlay.vertical === "top" ? "items-start pt-10" : overlay.vertical === "bottom" ? "items-end pb-16" : "items-center";

  return (
    <div className={cn("absolute inset-0 z-20 flex px-4 pb-14 sm:px-6 sm:pb-16", vertical)}>
      <div className="mx-auto flex w-full max-w-[1240px]">
        <div className={cn("flex w-full", overlay.align === "center" ? "justify-center" : overlay.align === "right" ? "justify-end" : "justify-start")}>
          <div className={cn("flex flex-col", horizontal)} style={{ maxWidth: `${Math.max(18, Math.min(64, overlay.width))}ch` }}>
            {showText && slide.eyebrow ? (
              <span
                className="inline-flex items-center gap-2 rounded-full border px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.16em] backdrop-blur-sm sm:px-2.5 sm:py-1 sm:text-[10px]"
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

            {showText ? (
              <h1
                className={cn(
                  "mt-2.5 font-display font-extrabold leading-[1.06] tracking-[-0.025em] text-[19px] sm:mt-3.5 sm:text-[26px] lg:text-[32px]",
                  light ? "text-white" : "text-ink",
                )}
                style={{ textShadow: light ? "0 2px 20px rgba(0,0,0,0.45)" : "none" }}
              >
                {slide.headline.split("\n").map((line) => (
                  <span key={line} className="block">
                    {line}
                  </span>
                ))}
              </h1>
            ) : null}

            {showText && slide.body ? (
              <p className={cn("mt-2 line-clamp-1 text-[11.5px] leading-relaxed sm:mt-2.5 sm:line-clamp-2 sm:text-[13.5px]", light ? "text-white/85" : "text-ink/80")}>
                {slide.body}
              </p>
            ) : null}

            {showButtons ? (
              <div
                className={cn(
                  "mt-3.5 flex flex-wrap items-center gap-2 sm:mt-5 sm:gap-3",
                  overlay.align === "center" ? "justify-center" : overlay.align === "right" ? "justify-end" : "",
                )}
              >
                {slide.ctaLabel ? (
                  <Link
                    href={slide.ctaHref || "/browse"}
                    tabIndex={active ? 0 : -1}
                    className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-[2px] px-4 text-[12.5px] font-semibold text-white transition-transform duration-200 hover:-translate-y-0.5 sm:h-11 sm:px-5 sm:text-[13.5px]"
                    style={{ background: slide.accent }}
                  >
                    {slide.ctaLabel}
                    <ArrowRight width={15} height={15} />
                  </Link>
                ) : null}
                {slide.secondaryLabel ? (
                  <Link
                    href={slide.secondaryHref || "/browse"}
                    tabIndex={active ? 0 : -1}
                    className={cn(
                      "hidden h-10 cursor-pointer items-center gap-2 rounded-[2px] border px-4 text-[12.5px] font-medium backdrop-blur-sm transition-colors sm:inline-flex sm:h-11 sm:px-5 sm:text-[13.5px]",
                      light ? "border-white/40 text-white hover:border-white/80 hover:bg-white/10" : "border-ink/25 text-ink hover:border-ink/70",
                    )}
                  >
                    {slide.secondaryLabel}
                  </Link>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Zap } from "lucide-react";
import { ProductCard, type ProductCardDisplay } from "@/components/ferix/cards";
import type { Product } from "@/lib/api";

/**
 * A Flash Sale band.
 *
 * A timed campaign looks different from an ordinary product row: it carries its
 * own words, a countdown to its own end, and a colour scheme an operator sets in
 * the CMS. Everything here comes from the section, so two campaigns on the same
 * page can look nothing alike.
 *
 * The countdown renders as dashes on the server and starts ticking in the
 * browser, so the first paint never disagrees with the real clock.
 */

/** Only a plain colour is ever written into a style attribute. */
function safeColour(value: unknown, fallback: string): string {
  const text = String(value ?? "").trim();
  if (/^#[0-9a-fA-F]{6}$/.test(text)) return text;
  return fallback;
}

function splitRemaining(endsAt: string) {
  const end = Date.parse(endsAt);
  if (Number.isNaN(end)) return null;
  const ms = end - Date.now();
  if (ms <= 0) return null;
  const total = Math.floor(ms / 1000);
  return {
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  };
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

export function FlashSaleBand({
  title,
  eyebrow,
  subtitle,
  endsAt,
  countdownLabel,
  showCountdown = true,
  showDiscountBadges = true,
  showViewAll = true,
  href = "/browse?sort=discount",
  backgroundColor,
  accentColor,
  textColor,
  timerBackgroundColor,
  timerTextColor,
  products,
  savedIds,
  display,
}: {
  title: string;
  eyebrow?: string;
  subtitle?: string;
  endsAt?: string;
  countdownLabel?: string;
  showCountdown?: boolean;
  showDiscountBadges?: boolean;
  showViewAll?: boolean;
  href?: string;
  backgroundColor?: string;
  accentColor?: string;
  textColor?: string;
  timerBackgroundColor?: string;
  timerTextColor?: string;
  products: Product[];
  savedIds: string[];
  display?: ProductCardDisplay;
}) {
  const [remaining, setRemaining] = useState<ReturnType<typeof splitRemaining>>(null);

  useEffect(() => {
    if (!endsAt) return;
    const tick = () => setRemaining(splitRemaining(endsAt));
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [endsAt]);

  if (!products.length) return null;

  const background = safeColour(backgroundColor, "#1b1b1b");
  const accent = safeColour(accentColor, "#e4572e");
  const ink = safeColour(textColor, "#ffffff");
  const timerBackground = safeColour(timerBackgroundColor, "#000000");
  const timerInk = safeColour(timerTextColor, "#ffffff");
  const units: [string, number][] = remaining
    ? [["Days", remaining.days], ["Hours", remaining.hours], ["Mins", remaining.minutes], ["Secs", remaining.seconds]]
    : [["Days", 0], ["Hours", 0], ["Mins", 0], ["Secs", 0]];

  return (
    <section className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 sm:py-9">
      <div className="overflow-hidden rounded-[2px] rounded-tr-[18px] p-4 sm:p-6" style={{ backgroundColor: background, color: ink }}>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            {eyebrow ? (
              <span className="mb-1 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ backgroundColor: accent, color: "#ffffff" }}>
                <Zap width={11} height={11} /> {eyebrow}
              </span>
            ) : null}
            <h2 className="font-display text-[20px] font-bold leading-tight sm:text-[26px]">{title}</h2>
            {subtitle ? <p className="mt-1 max-w-[60ch] text-[12.5px] leading-relaxed opacity-80">{subtitle}</p> : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {showCountdown !== false && endsAt ? (
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] opacity-80">
                  {countdownLabel || "Ends in"}
                </span>
                <span className="flex items-center gap-1">
                  {units.map(([label, value]) => (
                    <span key={label} className="grid min-w-[38px] place-items-center rounded-[6px] px-1.5 py-1" style={{ backgroundColor: timerBackground, color: timerInk }}>
                      <span className="font-display text-[15px] font-bold tabular-nums leading-none">{pad(value)}</span>
                      <span className="mt-0.5 font-mono text-[8px] uppercase tracking-[0.1em] opacity-70">{label}</span>
                    </span>
                  ))}
                </span>
              </div>
            ) : null}
            {showViewAll !== false ? (
              <Link href={href} className="inline-flex items-center gap-1 rounded-[2px] border px-3 py-2 text-[12px] font-semibold transition-opacity hover:opacity-80" style={{ borderColor: accent, color: ink }}>
                See all <ArrowRight width={14} height={14} />
              </Link>
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-5">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={showDiscountBadges === false ? { ...product, discount: 0 } : product}
              saved={savedIds.includes(product.id)}
              display={display}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

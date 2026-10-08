import Link from "next/link";
import type { ReactNode } from "react";
import { money } from "@/lib/format";
import { cn } from "@/lib/utils";

export function FerixMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("h-6 w-6", className)} aria-hidden="true">
      <rect width="32" height="32" rx="6" fill="#14110e" />
      <path d="M9 23V9h13v4h-8v2.4h6.6v3.9H14V23z" fill="#e4572e" />
    </svg>
  );
}

function hash(value: string): number {
  let out = 0;
  for (let i = 0; i < value.length; i += 1) out = (out * 31 + value.charCodeAt(i)) % 100_000;
  return out;
}

/**
 * Product artwork.
 *
 * Renders the real catalogue photograph when one is available and falls back to
 * deterministic procedural artwork otherwise, so a product without imagery
 * still looks deliberate rather than broken.
 */
export function Plate({
  seed,
  accent = "#e4572e",
  src,
  alt,
  className,
}: {
  seed: string;
  accent?: string;
  src?: string | null;
  alt?: string;
  className?: string;
}) {
  const h = hash(seed);
  const hue = h % 360;
  const variant = h % 4;
  const spin = (h % 30) - 15;

  if (src) {
    return (
      <div className={cn("relative overflow-hidden rounded-[3px] bg-bone-soft", className)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt ?? ""}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover"
        />
      </div>
    );
  }

  return (
    <div
      className={cn("relative overflow-hidden rounded-[3px] bg-bone-soft", className)}
      style={{
        background: `linear-gradient(135deg, hsl(${hue} 24% 92%), hsl(${(hue + 28) % 360} 20% 88%) 60%, hsl(${(hue + 52) % 360} 26% 90%))`,
      }}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 h-full w-full"
        style={{ transform: `rotate(${spin}deg) scale(1.12)` }}
      >
        <g opacity="0.55">
          <rect x="8" y="8" width="84" height="84" rx="4" fill="none" stroke="#14110e" strokeOpacity="0.08" />
          {variant === 0 ? (
            <>
              <circle cx="50" cy="50" r={26 + (h % 8)} fill={accent} fillOpacity="0.13" />
              <circle cx="50" cy="50" r={40 + (h % 6)} fill="none" stroke={accent} strokeOpacity="0.35" />
              <path d="M18 74 Q50 40 82 74" fill="none" stroke="#14110e" strokeOpacity="0.16" strokeWidth="1.2" />
            </>
          ) : variant === 1 ? (
            <>
              <rect x="22" y="26" width="56" height="48" rx="8" fill={accent} fillOpacity="0.14" />
              <rect x="30" y="34" width="40" height="32" rx="6" fill="none" stroke="#14110e" strokeOpacity="0.18" />
              <line x1="16" y1="50" x2="22" y2="50" stroke="#14110e" strokeOpacity="0.2" />
              <line x1="78" y1="50" x2="84" y2="50" stroke="#14110e" strokeOpacity="0.2" />
            </>
          ) : variant === 2 ? (
            <>
              <path d="M20 78 L50 22 L80 78 Z" fill={accent} fillOpacity="0.12" />
              <path d="M32 78 L50 44 L68 78" fill="none" stroke="#14110e" strokeOpacity="0.18" />
              <circle cx="50" cy="22" r="4" fill={accent} fillOpacity="0.6" />
            </>
          ) : (
            <>
              <rect x="24" y="20" width="52" height="60" rx="10" fill="#ffffff" fillOpacity="0.55" />
              <rect x="24" y="20" width="52" height="60" rx="10" fill="none" stroke="#14110e" strokeOpacity="0.14" />
              <circle cx="50" cy="46" r="13" fill={accent} fillOpacity="0.2" />
              <rect x="35" y="64" width="30" height="6" rx="3" fill="#14110e" fillOpacity="0.12" />
            </>
          )}
        </g>
      </svg>
      <span className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent" />
    </div>
  );
}

export function Stars({ value, size = 12, className }: { value: number; size?: number; className?: string }) {
  const full = Math.round(value);
  return (
    <span className={cn("inline-flex items-center gap-[3px]", className)} aria-label={`${value.toFixed(1)} out of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M12 2.6l2.9 6.1 6.6.9-4.8 4.6 1.2 6.6L12 17.7 6.1 20.8l1.2-6.6L2.5 9.6l6.6-.9z"
            fill={i <= full ? "#e4572e" : "none"}
            stroke={i <= full ? "#e4572e" : "#14110e"}
            strokeOpacity={i <= full ? 1 : 0.25}
            strokeWidth="1.4"
          />
        </svg>
      ))}
    </span>
  );
}

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn("font-mono text-[10px] uppercase tracking-[0.18em] text-ink-soft", className)}>{children}</span>
  );
}

export function SectionHead({
  eyebrow,
  title,
  action,
  className,
}: {
  eyebrow: string;
  title: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-6 flex flex-wrap items-end justify-between gap-3", className)}>
      <div>
        <Eyebrow>{eyebrow}</Eyebrow>
        <h2 className="mt-1.5 font-display text-[22px] font-semibold leading-tight text-ink sm:text-[27px]">{title}</h2>
      </div>
      {action}
    </div>
  );
}

export function Pill({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: "neutral" | "success" | "warn" | "info" | "danger" | "ember";
  className?: string;
}) {
  const tones: Record<string, string> = {
    neutral: "border-line-warm text-ink-soft",
    success: "border-pine/40 bg-pine/10 text-pine",
    warn: "border-sand/50 bg-sand/12 text-[#8a6a1f]",
    info: "border-azure/40 bg-azure/10 text-azure",
    danger: "border-ember/40 bg-ember/10 text-ember",
    ember: "border-ember/40 bg-ember/10 text-ember",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-[2px] border px-2 py-[3px] font-mono text-[10px] uppercase tracking-[0.12em]",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Price({
  value,
  compareAt,
  discount,
  className,
}: {
  value: number;
  compareAt?: number | null;
  discount?: number | null;
  className?: string;
}) {
  return (
    <span className={cn("flex flex-wrap items-baseline gap-2", className)}>
      <span className="font-mono text-[14px] font-bold text-ember sm:text-[15px]">{money(value)}</span>
      {compareAt ? (
        <span className="font-mono text-[11.5px] text-ink-soft line-through">{money(compareAt)}</span>
      ) : null}
      {discount ? (
        <span className="rounded-[2px] bg-ember px-1.5 py-[1px] font-mono text-[10px] font-semibold text-white">
          −{discount}%
        </span>
      ) : null}
    </span>
  );
}

export function StockNote({ stock, low = 25 }: { stock: number; low?: number }) {
  if (stock <= 0) return <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-ember">Out of stock</span>;
  if (stock <= low)
    return <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-[#8a6a1f]">Only {stock} left</span>;
  return <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-soft">In stock · {stock}</span>;
}

export function LinkButton({
  href,
  children,
  variant = "solid",
  className,
}: {
  href: string;
  children: ReactNode;
  variant?: "solid" | "outline" | "ghost" | "light";
  className?: string;
}) {
  const variants = {
    solid: "bg-ember text-white hover:bg-ink",
    outline: "border border-ink/25 text-ink hover:border-ink hover:bg-ink hover:text-bone",
    ghost: "text-ink-soft hover:text-ink",
    light: "bg-white/90 text-ink hover:bg-white",
  };
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex cursor-pointer items-center justify-center gap-2 rounded-[2px] px-4 py-2.5 text-[13px] font-semibold transition-colors duration-200",
        variants[variant],
        className,
      )}
    >
      {children}
    </Link>
  );
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="rounded-[3px] border border-dashed border-line-warm bg-white/60 px-6 py-12 text-center">
      <p className="font-display text-[17px] font-semibold text-ink">{title}</p>
      <p className="mx-auto mt-2 max-w-[46ch] text-[13.5px] leading-relaxed text-ink-soft">{body}</p>
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}

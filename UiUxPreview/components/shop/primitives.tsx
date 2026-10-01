"use client";

import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { money } from "@/lib/format";

export function Rating({
  value,
  count,
  size = 12,
  className,
}: {
  value: number;
  count?: number;
  size?: number;
  className?: string;
}) {
  const rounded = Math.round(value);
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <span className="inline-flex items-center gap-[1px]">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            width={size}
            height={size}
            strokeWidth={1.5}
            className={i <= rounded ? "fill-ember text-ember" : "text-current opacity-30"}
          />
        ))}
      </span>
      <span className="font-mono text-[11px] tabular-nums opacity-70">
        {value.toFixed(1)}
        {count !== undefined ? ` (${count})` : ""}
      </span>
    </span>
  );
}

export function Price({
  price,
  compareAt,
  size = "md",
  className,
}: {
  price: number;
  compareAt?: number | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const discount = compareAt ? Math.round(((compareAt - price) / compareAt) * 100) : 0;
  const sizes = { sm: "text-[13px]", md: "text-[15px]", lg: "text-[22px]" };
  return (
    <span className={cn("flex items-baseline gap-2", className)}>
      <span className={cn("font-mono font-semibold tabular-nums tracking-tight", sizes[size])}>
        {money(price)}
      </span>
      {compareAt ? (
        <span className="font-mono text-[11px] line-through opacity-45">{money(compareAt)}</span>
      ) : null}
      {discount > 0 ? (
        <span className="rounded-[2px] bg-ember px-1.5 py-[2px] font-mono text-[10px] font-semibold text-white">
          \u2212{discount}%
        </span>
      ) : null}
    </span>
  );
}

export function StockHint({ stock, lowAt }: { stock: number; lowAt: number }) {
  if (stock <= 0)
    return (
      <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft">
        Sold out
      </span>
    );
  if (stock <= lowAt)
    return (
      <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ember">
        Only {stock} left
      </span>
    );
  return (
    <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft/70">
      {stock} in stock
    </span>
  );
}

export function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("font-mono text-[10px] uppercase tracking-[0.2em]", className)}>
      {children}
    </span>
  );
}

export function SectionHead({
  eyebrow,
  title,
  action,
  tone = "light",
}: {
  eyebrow: string;
  title: string;
  action?: React.ReactNode;
  tone?: "light" | "dark";
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <Eyebrow className={tone === "dark" ? "text-lime" : "text-ember"}>{eyebrow}</Eyebrow>
        <h2
          className={cn(
            "mt-2 font-display text-[26px] font-semibold leading-tight sm:text-[32px]",
            tone === "dark" ? "text-chalk" : "text-ink",
          )}
        >
          {title}
        </h2>
      </div>
      {action}
    </div>
  );
}

export function Chip({
  children,
  tone = "light",
  className,
}: {
  children: React.ReactNode;
  tone?: "light" | "dark" | "outline";
  className?: string;
}) {
  const tones = {
    light: "bg-bone-soft text-ink",
    dark: "bg-void text-lime",
    outline: "border border-ink/15 text-ink",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-[2px] px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em]",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

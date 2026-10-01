import { cn } from "@/lib/utils";

export function FerixasMark({ className, tone = "ember" }: { className?: string; tone?: "ember" | "ink" | "chalk" }) {
  const fill = tone === "ember" ? "#e4572e" : tone === "ink" ? "#14110e" : "#e9ecf1";
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn("h-6 w-6", className)}>
      <path d="M3 3h26v7.4H11.6v6.9H24v7.4H11.6V29H3z" fill={fill} />
      <rect x="22" y="20.4" width="7" height="3.2" fill={tone === "chalk" ? "#c9f24d" : "#14110e"} opacity={tone === "chalk" ? 1 : 0.5} />
    </svg>
  );
}

export function Wordmark({ className, sub }: { className?: string; sub?: string }) {
  return (
    <span className={cn("flex items-baseline gap-2", className)}>
      <span className="font-display text-[15px] font-extrabold uppercase tracking-[0.22em]">Ferixas</span>
      {sub ? (
        <span className="font-mono text-[9px] uppercase tracking-[0.2em] opacity-55">{sub}</span>
      ) : null}
    </span>
  );
}

import { cn } from "@/lib/utils";

export function FerixasMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("h-7 w-7", className)} aria-hidden="true">
      <rect width="32" height="32" rx="6" fill="#1a2130" />
      <path d="M9 23V9h13v4h-8v2.4h6.6v3.9H14V23z" fill="#c9f24d" />
    </svg>
  );
}

function hash(value: string): number {
  let out = 0;
  for (let i = 0; i < value.length; i += 1) out = (out * 31 + value.charCodeAt(i)) % 100_000;
  return out;
}

/** Procedural product artwork — deterministic per slug, no image files needed. */
export function Thumb({ seed, className }: { seed: string; className?: string }) {
  const h = hash(seed);
  const hue = h % 360;
  const variant = h % 4;
  return (
    <div
      className={cn("relative shrink-0 overflow-hidden rounded-[2px] border border-hairline", className)}
      style={{ background: `linear-gradient(135deg, hsl(${hue} 18% 16%), hsl(${(hue + 30) % 360} 22% 22%))` }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 100 100" className="h-full w-full" preserveAspectRatio="xMidYMid slice">
        <g opacity="0.85">
          {variant === 0 ? (
            <>
              <circle cx="50" cy="50" r="24" fill="#c9f24d" fillOpacity="0.16" />
              <circle cx="50" cy="50" r="36" fill="none" stroke="#c9f24d" strokeOpacity="0.35" />
            </>
          ) : variant === 1 ? (
            <>
              <rect x="24" y="28" width="52" height="44" rx="6" fill="#e9ecf1" fillOpacity="0.10" />
              <rect x="32" y="36" width="36" height="28" rx="4" fill="none" stroke="#e9ecf1" strokeOpacity="0.25" />
            </>
          ) : variant === 2 ? (
            <path d="M24 76 L50 24 L76 76 Z" fill="#2f6f8f" fillOpacity="0.25" />
          ) : (
            <>
              <circle cx="50" cy="46" r="14" fill="#e4572e" fillOpacity="0.28" />
              <rect x="34" y="64" width="32" height="6" rx="3" fill="#e9ecf1" fillOpacity="0.18" />
            </>
          )}
        </g>
      </svg>
    </div>
  );
}

/** A tiny inline area chart — no chart library needed. */
export function Spark({
  values,
  tone = "lime",
  className,
}: {
  values: number[];
  tone?: "lime" | "ember" | "azure";
  className?: string;
}) {
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const span = max - min || 1;
  const points = values
    .map((value, index) => {
      const x = (index / Math.max(1, values.length - 1)) * 100;
      const y = 34 - ((value - min) / span) * 30;
      return `${index ? "L" : "M"}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
  const stroke = tone === "lime" ? "#c9f24d" : tone === "ember" ? "#e4572e" : "#2f6f8f";
  return (
    <svg viewBox="0 0 100 38" preserveAspectRatio="none" className={cn("h-10 w-full", className)} aria-hidden="true">
      <path d={`${points} L100,38 L0,38 Z`} fill={stroke} fillOpacity="0.10" />
      <path d={points} fill="none" stroke={stroke} strokeWidth={1.4} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/** Daily bars for the analytics view. */
export function BarChart({
  values,
  labels,
  tone = "lime",
}: {
  values: number[];
  labels?: string[];
  tone?: "lime" | "ember" | "azure";
}) {
  const max = Math.max(...values, 1);
  const color = tone === "lime" ? "bg-lime" : tone === "ember" ? "bg-ember" : "bg-azure";
  return (
    <div>
      <div className="flex h-32 items-end gap-[3px]">
        {values.map((value, index) => (
          <span
            key={index}
            className={cn("flex-1 rounded-t-[1px] transition-colors", color)}
            style={{ height: `${Math.max(2, (value / max) * 100)}%`, opacity: 0.45 + (value / max) * 0.55 }}
            title={labels?.[index] ? `${labels[index]}: ${value}` : String(value)}
          />
        ))}
      </div>
      {labels ? (
        <div className="mt-2 flex justify-between font-mono text-[9.5px] text-chalk-dim">
          <span>{labels[0]}</span>
          <span>{labels[labels.length - 1]}</span>
        </div>
      ) : null}
    </div>
  );
}

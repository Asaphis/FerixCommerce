"use client";

/** Small inline trend line used across the admin tables and tiles. */
export function Sparkline({
  values,
  height = 30,
  stroke = "#c9f24d",
}: {
  values: number[];
  height?: number;
  stroke?: string;
}) {
  const max = Math.max(...values, 1);
  const path = values
    .map((value, index) => {
      const x = (index / Math.max(1, values.length - 1)) * 100;
      const y = 30 - (value / max) * 28;
      return `${index ? "L" : "M"}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
  return (
    <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="w-full" style={{ height }} aria-hidden>
      <path d={`${path} L100,30 L0,30 Z`} fill="rgba(201,242,77,0.10)" />
      <path d={path} fill="none" stroke={stroke} strokeWidth={1.2} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

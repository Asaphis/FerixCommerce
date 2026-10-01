"use client";

import { useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Hand-built SVG charts. Deliberately not a charting dependency: the studio is
 * meant to read like an instrument panel, and full control over the marks keeps
 * it consistent with the rest of the interface.
 */

export function AreaSeries({
  values,
  height = 120,
  stroke = "#c9f24d",
  fillFrom = "rgba(201,242,77,0.22)",
  fillTo = "rgba(201,242,77,0)",
  compare,
  compareStroke = "#8b95a6",
}: {
  values: number[];
  height?: number;
  stroke?: string;
  fillFrom?: string;
  fillTo?: string;
  compare?: number[];
  compareStroke?: string;
}) {
  const max = Math.max(...values, ...(compare ?? []), 1);
  const path = (rows: number[]) =>
    rows
      .map((v, i) => {
        const x = (i / Math.max(1, rows.length - 1)) * 100;
        const y = 40 - (v / max) * 38;
        return `${i ? "L" : "M"}${x.toFixed(2)},${y.toFixed(2)}`;
      })
      .join(" ");
  const id = useMemo(() => `grad${Math.random().toString(36).slice(2, 8)}`, []);
  return (
    <svg
      viewBox="0 0 100 40"
      preserveAspectRatio="none"
      className="w-full"
      style={{ height }}
      aria-hidden
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={fillFrom} />
          <stop offset="100%" stopColor={fillTo} />
        </linearGradient>
      </defs>
      {[0, 10, 20, 30, 40].map((y) => (
        <line key={y} x1="0" y1={y} x2="100" y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
      ))}
      {compare ? (
        <path
          d={path(compare)}
          fill="none"
          stroke={compareStroke}
          strokeWidth={1}
          strokeDasharray="3 3"
          vectorEffect="non-scaling-stroke"
        />
      ) : null}
      <path d={`${path(values)} L100,40 L0,40 Z`} fill={`url(#${id})`} />
      <path d={path(values)} fill="none" stroke={stroke} strokeWidth={1.6} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export function InteractiveChart({
  points,
  height = 200,
  format,
  series,
}: {
  points: { label: string; value: number; secondary?: number }[];
  height?: number;
  format: (v: number) => string;
  series?: [string, string];
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(...points.map((p) => Math.max(p.value, p.secondary ?? 0)), 1);
  const active = hover === null ? points.length - 1 : hover;
  const point = points[active];

  const xFor = (i: number) => (i / Math.max(1, points.length - 1)) * 100;
  const yFor = (v: number) => 100 - (v / max) * 92 - 4;
  const line = points
    .map((p, i) => `${i ? "L" : "M"}${xFor(i).toFixed(2)},${yFor(p.value).toFixed(2)}`)
    .join(" ");
  const secondaryLine = points.some((p) => p.secondary !== undefined)
    ? points.map((p, i) => `${i ? "L" : "M"}${xFor(i).toFixed(2)},${yFor(p.secondary ?? 0).toFixed(2)}`).join(" ")
    : null;

  return (
    <div
      ref={wrapRef}
      className="relative"
      onPointerMove={(e) => {
        const rect = wrapRef.current?.getBoundingClientRect();
        if (!rect) return;
        const ratio = (e.clientX - rect.left) / rect.width;
        setHover(Math.min(points.length - 1, Math.max(0, Math.round(ratio * (points.length - 1)))));
      }}
      onPointerLeave={() => setHover(null)}
    >
      <div className="mb-3 flex items-baseline justify-between gap-4">
        <div>
          <p className="font-mono text-[22px] font-semibold tabular-nums text-chalk">
            {format(point?.value ?? 0)}
          </p>
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-chalk-dim">
            {point?.label ?? ""}
          </p>
        </div>
        {point?.secondary !== undefined ? (
          <p className="font-mono text-[12px] tabular-nums text-chalk-dim">
            {format(point.secondary)} <span className="opacity-60">secondary</span>
          </p>
        ) : null}
      </div>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full" style={{ height }} aria-hidden>
        <defs>
          <linearGradient id="fx-chart" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(201,242,77,0.28)" />
            <stop offset="100%" stopColor="rgba(201,242,77,0)" />
          </linearGradient>
        </defs>
        {[0, 25, 50, 75, 100].map((y) => (
          <line key={y} x1="0" y1={y} x2="100" y2={y} stroke="rgba(255,255,255,0.055)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
        ))}
        <path d={`${line} L100,100 L0,100 Z`} fill="url(#fx-chart)" />
        <path d={line} fill="none" stroke="#c9f24d" strokeWidth={1.6} vectorEffect="non-scaling-stroke" />
        {secondaryLine ? (
          <path
            d={secondaryLine}
            fill="none"
            stroke="#8b95a6"
            strokeWidth={1}
            strokeDasharray="3 3"
            vectorEffect="non-scaling-stroke"
          />
        ) : null}
        <line
          x1={xFor(active)}
          y1="0"
          x2={xFor(active)}
          y2="100"
          stroke="rgba(233,236,241,0.35)"
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
        <circle cx={xFor(active)} cy={yFor(point?.value ?? 0)} r={2.6} fill="#c9f24d" />
      </svg>
      <div className="mt-2 flex justify-between font-mono text-[10px] text-chalk-dim">
        <span>{points[0]?.label}</span>
        {series ? <span>{series[0]} vs {series[1]}</span> : null}
        <span>{points[points.length - 1]?.label}</span>
      </div>
    </div>
  );
}

export function SplitBar({
  segments,
}: {
  segments: { label: string; value: number; color: string }[];
}) {
  const total = segments.reduce((s, seg) => s + seg.value, 0) || 1;
  return (
    <div>
      <div className="flex h-2.5 overflow-hidden rounded-[2px]">
        {segments.map((seg) => (
          <span
            key={seg.label}
            style={{ width: `${(seg.value / total) * 100}%`, background: seg.color }}
            className="h-full"
          />
        ))}
      </div>
      <div className="mt-3 space-y-2">
        {segments.map((seg) => (
          <div key={seg.label} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 font-mono text-[11px] text-chalk-dim">
              <span className="h-2 w-2 rounded-[1px]" style={{ background: seg.color }} />
              {seg.label}
            </span>
            <span className="font-mono text-[11px] tabular-nums text-chalk">
              {Math.round((seg.value / total) * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function BarRow({
  label,
  value,
  max,
  display,
  color = "#c9f24d",
}: {
  label: string;
  value: number;
  max: number;
  display: string;
  color?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-[42%] truncate text-[12.5px] text-chalk" title={label}>
        {label}
      </span>
      <span className="h-2 flex-1 overflow-hidden rounded-[2px] bg-panel-2">
        <span
          className={cn("block h-full rounded-[2px]")}
          style={{ width: `${Math.max(3, (value / (max || 1)) * 100)}%`, background: color }}
        />
      </span>
      <span className="w-[20%] text-right font-mono text-[11.5px] tabular-nums text-chalk-dim">
        {display}
      </span>
    </div>
  );
}

export function Donut({
  segments,
  size = 132,
  centerLabel,
  centerValue,
}: {
  segments: { label: string; value: number; color: string }[];
  size?: number;
  centerLabel: string;
  centerValue: string;
}) {
  const total = segments.reduce((s, seg) => s + seg.value, 0) || 1;
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  return (
    <div className="flex items-center gap-5">
      <div className="relative" style={{ width: size, height: size }}>
        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
          <circle cx="50" cy="50" r={radius} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={9} />
          {segments.map((seg) => {
            const length = (seg.value / total) * circumference;
            const dash = `${length} ${circumference - length}`;
            const el = (
              <circle
                key={seg.label}
                cx="50"
                cy="50"
                r={radius}
                fill="none"
                stroke={seg.color}
                strokeWidth={9}
                strokeDasharray={dash}
                strokeDashoffset={-offset}
                strokeLinecap="butt"
              />
            );
            offset += length;
            return el;
          })}
        </svg>
        <div className="absolute inset-0 grid place-items-center">
          <div className="text-center">
            <p className="font-mono text-[17px] font-semibold tabular-nums text-chalk">
              {centerValue}
            </p>
            <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-chalk-dim">
              {centerLabel}
            </p>
          </div>
        </div>
      </div>
      <div className="space-y-2.5">
        {segments.map((seg) => (
          <div key={seg.label}>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-[1px]" style={{ background: seg.color }} />
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-chalk-dim">
                {seg.label}
              </span>
            </div>
            <p className="mt-1 pl-4 font-mono text-[13px] tabular-nums text-chalk">
              {Math.round((seg.value / total) * 100)}%
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

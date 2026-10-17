"use client";

import { useEffect, useState } from "react";

function remaining(end: string): string | null {
  const endMs = Date.parse(end);
  if (!Number.isFinite(endMs)) return null;
  const seconds = Math.max(0, Math.floor((endMs - Date.now()) / 1000));
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return days > 0 ? `${days}d ${hours}h ${minutes}m` : `${hours}h ${minutes}m ${secs}s`;
}

/** Small per-card client timer; intentionally independent of the section-band clock. */
export function PlacementCountdown({ endsAt }: { endsAt?: string }) {
  const [label, setLabel] = useState<string | null>(null);
  useEffect(() => {
    if (!endsAt) return;
    const tick = () => setLabel(remaining(endsAt));
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [endsAt]);
  if (!endsAt || !label) return null;
  return (
    <span className="inline-flex items-center rounded-[3px] bg-ink px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-[0.08em] text-white" aria-label={`Offer ends in ${label}`}>
      <span aria-hidden="true">Ends in {label}</span>
      <span className="sr-only" aria-live="off">Offer ends in {label}</span>
    </span>
  );
}

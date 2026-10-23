// GENERATED FILE — do not edit. Source: WebPhase/shared/color-input.tsx (run `node sync-shared.mjs`).
"use client";

import { useRef, useState } from "react";
import { buildGradient, parseGradient, pickerHex, type GradientKind } from "./colors";

const GRADIENT_KINDS: { value: GradientKind; label: string }[] = [
  { value: "linear", label: "Linear" },
  { value: "radial", label: "Radial" },
  { value: "conic", label: "Conic" },
];
const POSITIONS = ["center", "top", "right", "bottom", "left", "top left", "top right", "bottom left", "bottom right"];

export function ColorInput({
  name,
  value = "",
  allowGradient = false,
  required = false,
  disabled = false,
  className = "",
}: {
  name: string;
  value?: string | null;
  allowGradient?: boolean;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  const initial = String(value ?? "");
  const initialGradient = parseGradient(initial);
  const [raw, setRaw] = useState(initial);
  const [gradient, setGradient] = useState(Boolean(initialGradient));
  const [kind, setKind] = useState<GradientKind>(initialGradient?.kind ?? "linear");
  const [angle, setAngle] = useState(initialGradient?.angle ?? 135);
  const [shape, setShape] = useState<"circle" | "ellipse">(initialGradient?.shape ?? "circle");
  const [position, setPosition] = useState(initialGradient?.position ?? "center");
  const [stops, setStops] = useState(initialGradient?.stops ?? [
    { color: pickerHex(initial || "#e4572e"), position: 0 },
    { color: "#12263a", position: 100 },
  ]);
  const hiddenRef = useRef<HTMLInputElement>(null);

  function publish(next: string) {
    setRaw(next);
    if (hiddenRef.current) {
      hiddenRef.current.value = next;
      hiddenRef.current.dispatchEvent(new Event("input", { bubbles: true }));
    }
  }

  function publishGradient(nextKind = kind, nextAngle = angle, nextShape = shape, nextPosition = position, nextStops = stops) {
    publish(buildGradient(nextKind, nextAngle, nextShape, nextPosition, nextStops));
  }

  function updateStop(index: number, patch: Partial<(typeof stops)[number]>) {
    const next = stops.map((stop, stopIndex) => stopIndex === index ? { ...stop, ...patch } : stop);
    setStops(next);
    publishGradient(kind, angle, shape, position, next);
  }

  function setMode(nextGradient: boolean) {
    if (!allowGradient) return;
    setGradient(nextGradient);
    if (nextGradient) {
      const parsed = parseGradient(raw);
      const nextKind = parsed?.kind ?? "linear";
      const nextAngle = parsed?.angle ?? 135;
      const nextShape = parsed?.shape ?? "circle";
      const nextPosition = parsed?.position ?? "center";
      const nextStops = parsed?.stops ?? [
        { color: /^#[\da-f]{6}$/i.test(raw) ? raw : "#e4572e", position: 0 },
        { color: "#12263a", position: 100 },
      ];
      setKind(nextKind);
      setAngle(nextAngle);
      setShape(nextShape);
      setPosition(nextPosition);
      setStops(nextStops);
      publishGradient(nextKind, nextAngle, nextShape, nextPosition, nextStops);
    } else {
      const first = stops[0]?.color ?? "#ffffff";
      publish(first);
    }
  }

  const codeValue = gradient ? raw : raw;
  // A hand-written origin such as `30% 20%` stays selectable rather than being lost.
  const positionOptions = POSITIONS.includes(position) ? POSITIONS : [position, ...POSITIONS];
  return (
    <div className="grid gap-2">
      <input ref={hiddenRef} type="hidden" name={name} defaultValue={initial} disabled={disabled} />
      {allowGradient ? (
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Color fill type">
          <button type="button" disabled={disabled} onClick={() => setMode(false)} aria-pressed={!gradient}
            className={`min-h-9 rounded border px-3 text-[11px] font-medium ${!gradient ? "border-signal bg-signal/10 text-chalk" : "border-hairline text-chalk-dim"}`}>Solid</button>
          <button type="button" disabled={disabled} onClick={() => setMode(true)} aria-pressed={gradient}
            className={`min-h-9 rounded border px-3 text-[11px] font-medium ${gradient ? "border-signal bg-signal/10 text-chalk" : "border-hairline text-chalk-dim"}`}>Gradient</button>
        </div>
      ) : null}
      {!gradient ? (
        <div className="flex min-w-0 items-center gap-2">
          <input type="color" aria-label="Choose a color" disabled={disabled} value={pickerHex(raw)} onChange={(event) => publish(event.currentTarget.value)}
            className="h-11 w-14 shrink-0 cursor-pointer rounded border border-hairline bg-panel-2 p-1 disabled:cursor-not-allowed disabled:opacity-50" />
          <input type="text" aria-label="Color code" required={required} disabled={disabled} value={codeValue} onChange={(event) => publish(event.currentTarget.value)}
            placeholder="#E4572E or rgb(228, 87, 46)" className={className || "min-w-0 flex-1 rounded border border-hairline bg-panel-2 px-3 py-2 font-mono text-[12px] text-chalk outline-none focus:border-signal disabled:opacity-50"} />
        </div>
      ) : (
        <div className="grid gap-2 rounded-lg border border-hairline bg-panel-2 p-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="grid gap-1 text-[11px] text-chalk-dim">Gradient type
              <select disabled={disabled} value={kind} onChange={(event) => {
                const next = event.currentTarget.value as GradientKind;
                setKind(next);
                publishGradient(next);
              }} className="min-h-10 rounded border border-hairline bg-panel px-2 text-[12px] text-chalk">
                {GRADIENT_KINDS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            {kind === "radial" ? (
              <>
                <label className="grid gap-1 text-[11px] text-chalk-dim">Shape
                  <select disabled={disabled} value={shape} onChange={(event) => {
                    const next = event.currentTarget.value as "circle" | "ellipse";
                    setShape(next);
                    publishGradient(kind, angle, next);
                  }} className="min-h-10 rounded border border-hairline bg-panel px-2 text-[12px] text-chalk">
                    <option value="circle">Circle</option><option value="ellipse">Ellipse</option>
                  </select>
                </label>
                <label className="grid gap-1 text-[11px] text-chalk-dim">Origin
                  <select disabled={disabled} value={position} onChange={(event) => {
                    const next = event.currentTarget.value;
                    setPosition(next);
                    publishGradient(kind, angle, shape, next);
                  }} className="min-h-10 rounded border border-hairline bg-panel px-2 text-[12px] text-chalk">
                    {positionOptions.map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                </label>
              </>
            ) : null}
            {kind !== "radial" ? (
              <label className="grid gap-1 text-[11px] text-chalk-dim">{kind === "conic" ? "Start angle" : "Angle"} · {angle}°
                <input type="range" min={0} max={360} value={angle} disabled={disabled} onChange={(event) => {
                  const next = Number(event.currentTarget.value);
                  setAngle(next);
                  publishGradient(kind, next);
                }} className="min-h-10 accent-[#e4572e]" />
              </label>
            ) : null}
          </div>
          <div className="grid gap-2">
            {stops.map((stop, index) => (
              <div key={index} className="grid items-end gap-2 sm:grid-cols-[minmax(0,1fr)_96px_44px]">
                <label className="grid gap-1 text-[11px] text-chalk-dim">Stop {index + 1} · color code
                  <input type="text" disabled={disabled} value={stop.color} onChange={(event) => updateStop(index, { color: event.currentTarget.value })}
                    className="min-h-10 min-w-0 rounded border border-hairline bg-panel px-2.5 font-mono text-[11px] text-chalk" />
                </label>
                <label className="grid gap-1 text-[11px] text-chalk-dim">Position · {stop.position}%
                  <input type="range" min={0} max={100} value={stop.position} disabled={disabled} onChange={(event) => updateStop(index, { position: Number(event.currentTarget.value) })}
                    className="min-h-10 accent-[#e4572e]" />
                </label>
                <input type="color" aria-label={`Choose gradient stop ${index + 1} color`} disabled={disabled} value={pickerHex(stop.color)} onChange={(event) => updateStop(index, { color: event.currentTarget.value })}
                  className="h-10 w-11 cursor-pointer rounded border border-hairline bg-panel p-1 disabled:opacity-50" />
              </div>
            ))}
            <div className="flex flex-wrap gap-2">
              {stops.length < 8 ? <button type="button" disabled={disabled} onClick={() => {
                const nextStops = [...stops, { color: "#ffffff", position: 100 }];
                setStops(nextStops);
                publishGradient(kind, angle, shape, position, nextStops);
              }} className="min-h-9 rounded border border-hairline px-3 text-[11px] text-chalk-dim">Add color stop</button> : null}
              {stops.length > 2 ? <button type="button" disabled={disabled} onClick={() => {
                const nextStops = stops.slice(0, -1);
                setStops(nextStops);
                publishGradient(kind, angle, shape, position, nextStops);
              }} className="min-h-9 rounded border border-hairline px-3 text-[11px] text-chalk-dim">Remove last stop</button> : null}
            </div>
          </div>
          <label className="grid gap-1 text-[11px] text-chalk-dim">CSS gradient code · editable
            <input type="text" disabled={disabled} value={raw} onChange={(event) => {
              const next = event.currentTarget.value;
              const parsed = parseGradient(next);
              setRaw(next);
              if (parsed) {
                setKind(parsed.kind); setAngle(parsed.angle); setShape(parsed.shape); setPosition(parsed.position); setStops(parsed.stops);
              }
              if (hiddenRef.current) {
                hiddenRef.current.value = next;
                hiddenRef.current.dispatchEvent(new Event("input", { bubbles: true }));
              }
            }} className="min-h-10 min-w-0 rounded border border-hairline bg-panel px-2.5 font-mono text-[11px] text-chalk" />
          </label>
          <p className="text-[11px] leading-relaxed text-chalk-dim">Gradients are supported for background fields. You can also edit the CSS directly; only safe color-stop gradients are accepted.</p>
        </div>
      )}
    </div>
  );
}

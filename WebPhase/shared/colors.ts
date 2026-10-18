export type GradientKind = "linear" | "radial" | "conic";

const HEX = /^#(?:[\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/i;
const RGB = /^rgba?\(\s*[-+\d.%]+\s*,\s*[-+\d.%]+\s*,\s*[-+\d.%]+(?:\s*,\s*[-+\d.%]+)?\s*\)$/i;
const HSL = /^hsla?\(\s*[-+\d.]+(?:deg|turn|rad)?\s*,\s*[-+\d.]+%\s*,\s*[-+\d.]+%(?:\s*,\s*[-+\d.%]+)?\s*\)$/i;
const NAMED = new Set([
  "transparent", "black", "white", "red", "green", "blue", "yellow", "orange", "purple", "pink",
  "gray", "grey", "silver", "maroon", "navy", "teal", "olive", "lime", "aqua", "fuchsia",
  "coral", "tomato", "gold", "indigo", "violet", "beige", "brown", "chocolate", "crimson",
  "khaki", "lavender", "plum", "salmon", "tan", "turquoise", "rebeccapurple",
]);

export function isSafeSolidColor(value: unknown): boolean {
  const color = String(value ?? "").trim();
  return Boolean(color && (HEX.test(color) || RGB.test(color) || HSL.test(color) || NAMED.has(color.toLowerCase())));
}

function splitTopLevel(value: string): string[] | null {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let index = 0; index < value.length; index++) {
    const char = value[index];
    if (char === "(") depth++;
    else if (char === ")") {
      depth--;
      if (depth < 0) return null;
    } else if (char === "," && depth === 0) {
      parts.push(value.slice(start, index).trim());
      start = index + 1;
    }
  }
  if (depth !== 0) return null;
  parts.push(value.slice(start).trim());
  return parts;
}

function isStop(value: string): boolean {
  const match = value.match(/^(.*?)(?:\s+([\d.]+)%)?$/);
  if (!match || !isSafeSolidColor(match[1])) return false;
  return match[2] === undefined || (Number(match[2]) >= 0 && Number(match[2]) <= 100);
}

export function isSafeGradient(value: unknown): boolean {
  const raw = String(value ?? "").trim();
  const match = raw.match(/^(linear|radial|conic)-gradient\((.*)\)$/i);
  if (!match) return false;
  const kind = match[1].toLowerCase() as GradientKind;
  const parts = splitTopLevel(match[2]);
  if (!parts) return false;
  let stops = parts;
  const first = parts[0] ?? "";
  // A gradient origin is a keyword, a percentage, or one of each - never free text.
  const position = "(?:center|left|right|top|bottom|[-+]?(?:\\d+(?:\\.\\d*)?|\\.\\d+)%)(?:\\s+(?:center|left|right|top|bottom|[-+]?(?:\\d+(?:\\.\\d*)?|\\.\\d+)%))?";
  const headers: Record<GradientKind, RegExp> = {
    linear: /^(?:to\s+(?:left|right|top|bottom)(?:\s+(?:left|right|top|bottom))?|[-+\d.]+deg)$/i,
    radial: new RegExp(`^(?:(?:circle|ellipse)(?:\\s+(?:closest-side|closest-corner|farthest-side|farthest-corner))?)?(?:\\s+at\\s+${position})?$`, "i"),
    conic: new RegExp(`^(?:from\\s+[-+]?[\\d.]+deg(?:\\s+at\\s+${position})?)$`, "i"),
  };
  if (!isStop(first)) {
    if (!headers[kind].test(first)) return false;
    stops = parts.slice(1);
  }
  return stops.length >= 2 && stops.length <= 8 && stops.every(isStop);
}

export function isSafeBackground(value: unknown): boolean {
  return isSafeSolidColor(value) || isSafeGradient(value);
}

export function safeColor(value: unknown, fallback?: string): string | undefined {
  const color = String(value ?? "").trim();
  return isSafeSolidColor(color) ? color : fallback;
}

/** CSS properties for a background setting; gradients use `background`, solids use `backgroundColor`. */
export function safeBackgroundStyle(value: unknown): { background?: string; backgroundColor?: string } {
  const color = String(value ?? "").trim();
  if (isSafeGradient(color)) return { background: color };
  if (isSafeSolidColor(color)) return { backgroundColor: color };
  return {};
}

/**
 * The same colour at reduced opacity.
 *
 * Six-digit hex keeps the familiar `#rrggbbaa` form; every other accepted code
 * uses `color-mix`, so an operator can write `rgb(...)` or a name and still get
 * a tinted border or badge.
 */
export function safeColorWithAlpha(value: unknown, alphaHex: string, percent = 30): string | undefined {
  const color = safeColor(value);
  if (!color) return undefined;
  if (/^#[\da-f]{6}$/i.test(color)) return `${color}${alphaHex}`;
  if (/^#[\da-f]{3}$/i.test(color)) return `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}${alphaHex}`;
  return `color-mix(in srgb, ${color} ${Math.max(0, Math.min(100, percent))}%, transparent)`;
}

function relativeLuminance(color: string): number {
  const hex = /^#([\da-f]{6})$/i.exec(color.trim());
  const rgb = hex
    ? [0, 2, 4].map((offset) => parseInt(hex[1].slice(offset, offset + 2), 16))
    : /^rgba?\(([^)]+)\)$/i.exec(color.trim())
      ? color.replace(/^rgba?\(|\)$/gi, "").split(",").slice(0, 3).map((part) => Number.parseFloat(part))
      : [255, 255, 255];
  const [r, g, b] = rgb.map((value) => {
    const channel = (Number.isFinite(value) ? value : 255) / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Text that stays readable on a filled badge, pill or button.
 *
 * A bright accent such as lime carries dark ink; a deep ember carries white.
 * Both are checked against the real fill, so an operator can pick any accent
 * and the label on top of it still reads.
 */
export function contrastInk(value: unknown, dark = "#12263A", light = "#ffffff"): string {
  const fill = safeColor(value);
  if (!fill) return light;
  const luminance = relativeLuminance(fill);
  const onLight = (1.05) / (luminance + 0.05);
  const onDark = (luminance + 0.05) / (relativeLuminance(dark) + 0.05);
  return onDark >= onLight ? dark : light;
}

export function pickerHex(value: unknown): string {
  const color = String(value ?? "").trim();
  if (/^#[\da-f]{6}$/i.test(color)) return color;
  if (/^#[\da-f]{3}$/i.test(color)) return `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`;
  return "#ffffff";
}

export function parseGradient(value: unknown): { kind: GradientKind; angle: number; shape: "circle" | "ellipse"; position: string; stops: { color: string; position: number }[] } | null {
  const raw = String(value ?? "").trim();
  const match = raw.match(/^(linear|radial|conic)-gradient\((.*)\)$/i);
  if (!match) return null;
  const kind = match[1].toLowerCase() as GradientKind;
  const parts = splitTopLevel(match[2]);
  if (!parts) return null;
  let header = "";
  let stopParts = parts;
  if (!isStop(parts[0] ?? "")) {
    header = parts[0] ?? "";
    stopParts = parts.slice(1);
  }
  const angleMatch = header.match(/(?:from\s+)?([-+\d.]+)deg/i);
  const shape = /ellipse/i.test(header) ? "ellipse" : "circle";
  const positionMatch = header.match(/\bat\s+((?:center|left|right|top|bottom|[-+]?[\d.]+%)(?:\s+(?:center|left|right|top|bottom|[-+]?[\d.]+%))?)/i);
  const position = positionMatch ? positionMatch[1].replace(/\s+/g, " ").trim() : "center";
  const stops = stopParts.map((part, index) => {
    const parsed = part.match(/^(.*?)(?:\s+([\d.]+)%)?$/);
    return { color: parsed?.[1] ?? "#000000", position: parsed?.[2] ? Number(parsed[2]) : Math.round(index * 100 / Math.max(1, stopParts.length - 1)) };
  });
  return { kind, angle: angleMatch ? Number(angleMatch[1]) : 135, shape, position, stops };
}

export function buildGradient(kind: GradientKind, angle: number, shape: "circle" | "ellipse", position: string, stops: { color: string; position: number }[]): string {
  const stopText = stops.map((stop) => `${stop.color} ${Math.max(0, Math.min(100, stop.position))}%`).join(", ");
  const origin = String(position || "center").trim() || "center";
  if (kind === "radial") return `radial-gradient(${shape} at ${origin}, ${stopText})`;
  if (kind === "conic") return `conic-gradient(from ${Math.max(0, Math.min(360, angle))}deg at ${origin}, ${stopText})`;
  return `linear-gradient(${Math.max(0, Math.min(360, angle))}deg, ${stopText})`;
}

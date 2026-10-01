import type { CSSProperties } from "react";
import type { DesignNode, NodeStyle, StoreBrand } from "@/lib/types";

export type Device = "desktop" | "tablet" | "mobile";

/** Brand tokens usable anywhere a colour is set, so one palette drives everything. */
export const COLOR_TOKENS = ["canvas", "surface", "ink", "muted", "accent", "accentInk", "line"] as const;
export type ColorToken = (typeof COLOR_TOKENS)[number];

export function resolveColor(value: string | undefined, brand: StoreBrand): string {
  if (!value) return "transparent";
  switch (value) {
    case "canvas":
      return brand.canvas;
    case "surface":
      return brand.surface;
    case "ink":
      return brand.ink;
    case "muted":
      return brand.muted;
    case "accent":
      return brand.accent;
    case "accentInk":
      return brand.accentInk;
    case "line":
      return brand.canvas.toLowerCase() > brand.surface.toLowerCase() ? "rgba(0,0,0,0.10)" : "rgba(255,255,255,0.12)";
    default:
      return value;
  }
}

export const SHADOWS: Record<number, string> = {
  0: "none",
  1: "0 1px 2px rgba(0,0,0,0.06)",
  2: "0 14px 34px -18px rgba(0,0,0,0.28)",
  3: "0 34px 70px -28px rgba(0,0,0,0.42)",
};

/** Converts a node's style into inline CSS for the current device. */
export function toCss(style: NodeStyle, brand: StoreBrand, device: Device): CSSProperties {
  const merged: NodeStyle =
    device === "desktop" ? style : { ...style, ...(style.responsive?.[device] ?? {}) };
  const css: CSSProperties = {
    width: merged.width,
    height: merged.height,
    opacity: merged.opacity,
    textAlign: merged.textAlign,
    display: merged.display,
    gap: merged.gap,
    columns: merged.columns,
  };

  if (merged.paddingY !== undefined || merged.paddingX !== undefined) {
    css.padding = `${merged.paddingY ?? 0}px ${merged.paddingX ?? 0}px`;
  }
  if (merged.marginY !== undefined) css.marginBlock = `${merged.marginY}px`;
  if (merged.marginX !== undefined) css.marginInline = `${merged.marginX}px`;

  if (merged.display === "flex") css.flexDirection = merged.direction ?? "column";
  if (merged.display === "grid") {
    css.display = "grid";
    css.gridTemplateColumns = `repeat(${merged.columns ?? 1}, minmax(0, 1fr))`;
  }
  if (merged.align) {
    css.alignItems =
      merged.align === "start" ? "flex-start" : merged.align === "end" ? "flex-end" : merged.align;
  }
  if (merged.justify) {
    css.justifyContent =
      merged.justify === "start"
        ? "flex-start"
        : merged.justify === "end"
          ? "flex-end"
          : merged.justify === "between"
            ? "space-between"
            : "center";
  }

  if (merged.background) css.background = resolveColor(merged.background, brand);
  if (merged.color) css.color = resolveColor(merged.color, brand);
  if (merged.fontSize !== undefined) css.fontSize = `${merged.fontSize}px`;
  if (merged.fontWeight !== undefined) css.fontWeight = merged.fontWeight;
  if (merged.lineHeight !== undefined) css.lineHeight = merged.lineHeight;
  if (merged.letterSpacing !== undefined) css.letterSpacing = `${merged.letterSpacing}em`;
  if (merged.fontFamily) css.fontFamily = merged.fontFamily;

  if (merged.borderWidth) {
    css.borderWidth = `${merged.borderWidth}px`;
    css.borderStyle = "solid";
    css.borderColor = resolveColor(merged.borderColor ?? "line", brand);
  }
  if (merged.radius !== undefined) css.borderRadius = `${merged.radius}px`;
  if (merged.shadow !== undefined) css.boxShadow = SHADOWS[merged.shadow];

  return css;
}

/** True when the value is a commerce binding rather than literal copy. */
export function isBinding(value: string | undefined): boolean {
  return Boolean(value && /^\{\{[^}]+\}\}$/.test(value.trim()));
}

export const TOKENS = [
  "{{product.title}}",
  "{{product.price}}",
  "{{product.compare_at}}",
  "{{product.rating}}",
  "{{product.stock}}",
  "{{product.sku}}",
  "{{store.name}}",
  "{{store.tagline}}",
  "{{store.followers}}",
  "{{collection.name}}",
  "{{cart.count}}",
];

// ── Tree helpers ─────────────────────────────────────────────────────

export function flatten(nodes: DesignNode[]): DesignNode[] {
  const out: DesignNode[] = [];
  const walk = (list: DesignNode[]) => {
    list.forEach((n) => {
      out.push(n);
      if (n.children?.length) walk(n.children);
    });
  };
  walk(nodes);
  return out;
}

export function findNode(nodes: DesignNode[], id: string): DesignNode | undefined {
  return flatten(nodes).find((n) => n.id === id);
}

export function mapNode(
  nodes: DesignNode[],
  id: string,
  fn: (node: DesignNode) => DesignNode,
): DesignNode[] {
  return nodes.map((node) => {
    if (node.id === id) return fn(node);
    if (node.children?.length) return { ...node, children: mapNode(node.children, id, fn) };
    return node;
  });
}

export function removeNode(nodes: DesignNode[], id: string): DesignNode[] {
  return nodes
    .filter((node) => node.id !== id)
    .map((node) =>
      node.children?.length ? { ...node, children: removeNode(node.children, id) } : node,
    );
}

/** Moves a top-level section up or down — the order merchants actually think in. */
export function moveSection(nodes: DesignNode[], id: string, direction: -1 | 1): DesignNode[] {
  const index = nodes.findIndex((n) => n.id === id);
  if (index === -1) return nodes;
  const target = index + direction;
  if (target < 0 || target >= nodes.length) return nodes;
  const next = [...nodes];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

export function cloneTree(nodes: DesignNode[]): DesignNode[] {
  return nodes.map((node) => ({
    ...node,
    style: { ...node.style, responsive: node.style.responsive ? { ...node.style.responsive } : undefined },
    tokens: node.tokens ? { ...node.tokens } : undefined,
    children: node.children ? cloneTree(node.children) : undefined,
  }));
}

export function countNodes(nodes: DesignNode[]): number {
  return flatten(nodes).length;
}

export function responsiveFields(style: NodeStyle, device: Device) {
  if (device === "desktop") return style;
  return { ...style, ...(style.responsive?.[device] ?? {}) };
}

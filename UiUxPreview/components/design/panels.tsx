"use client";

import { useRef, useState } from "react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowDown,
  ArrowUp,
  BadgePercent,
  Box,
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  FileText,
  Film,
  Heart,
  Image as ImageIcon,
  LayoutGrid,
  Layers,
  Megaphone,
  Menu as MenuIcon,
  MousePointerClick,
  Package,
  PanelBottom,
  PanelTop,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Square,
  Star,
  Trash2,
  Type,
  Upload,
  Video,
  type LucideIcon,
} from "lucide-react";
import { COLLECTIONS } from "@/lib/data";
import type { BannerOverlay, DesignNode, HeroSlide, NodeStyle, NodeType } from "@/lib/types";
import { DEFAULT_OVERLAY } from "@/lib/data";
import { COLOR_TOKENS, TOKENS, isBinding, responsiveFields, type Device } from "@/lib/design/tree";
import { useDesign } from "@/lib/design/design-store";
import { cn } from "@/lib/utils";

const ICONS: Record<NodeType, LucideIcon> = {
  section: Square,
  container: Box,
  header: PanelTop,
  nav: MenuIcon,
  hero: Sparkles,
  heading: Type,
  paragraph: AlignLeft,
  text: Type,
  image: ImageIcon,
  video: Video,
  button: MousePointerClick,
  productGrid: LayoutGrid,
  productCard: Package,
  collection: Layers,
  banner: Megaphone,
  promo: BadgePercent,
  reviews: Star,
  trust: ShieldCheck,
  cart: ShoppingBag,
  wishlist: Heart,
  productInfo: FileText,
  footer: PanelBottom,
};

const FONTS = [
  { label: "Display", value: "var(--font-bricolage)" },
  { label: "Interface", value: "var(--font-archivo)" },
  { label: "Mono", value: "var(--font-plex)" },
];

const TEXT_NODES: NodeType[] = ["heading", "paragraph", "text", "button"];

export function LayersPanel({ onPick }: { onPick?: () => void }) {
  const { nodes, selectedId, select, toggleHidden, moveSectionById } = useDesign();
  const [collapsed, setCollapsed] = useState<string[]>([]);

  const renderRow = (node: DesignNode, depth: number) => {
    const Icon = ICONS[node.type] ?? Square;
    const hasChildren = Boolean(node.children?.length);
    const isCollapsed = collapsed.includes(node.id);
    const selected = selectedId === node.id;
    const isSection = depth === 0;
    return (
      <li key={node.id}>
        <div
          className={cn(
            "group flex items-center gap-1.5 rounded-[2px] py-1.5 pr-1.5 transition-colors",
            selected ? "bg-panel-2 text-chalk" : "text-chalk-dim hover:bg-panel-2/60 hover:text-chalk",
          )}
          style={{ paddingLeft: 6 + depth * 12 }}
        >
          {hasChildren ? (
            <button
              type="button"
              aria-label={isCollapsed ? "Expand" : "Collapse"}
              onClick={() =>
                setCollapsed((prev) =>
                  isCollapsed ? prev.filter((id) => id !== node.id) : [...prev, node.id],
                )
              }
              className="grid h-4 w-4 shrink-0 cursor-pointer place-items-center text-chalk-dim"
            >
              {isCollapsed ? <ChevronRight width={11} height={11} /> : <ChevronDown width={11} height={11} />}
            </button>
          ) : (
            <span className="w-4 shrink-0" />
          )}
          <button
            type="button"
            onClick={() => {
              select(node.id);
              onPick?.();
            }}
            className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-left"
          >
            <Icon width={13} height={13} className={selected ? "text-lime" : ""} />
            <span className={cn("truncate text-[12.5px]", node.hidden && "line-through opacity-60")}>
              {node.name}
            </span>
          </button>
          {isSection ? (
            <span className="flex shrink-0 items-center opacity-0 transition-opacity group-hover:opacity-100">
              <button
                type="button"
                aria-label="Move section up"
                onClick={() => moveSectionById(node.id, -1)}
                className="grid h-6 w-6 cursor-pointer place-items-center rounded-[2px] text-chalk-dim hover:text-chalk"
              >
                <ArrowUp width={11} height={11} />
              </button>
              <button
                type="button"
                aria-label="Move section down"
                onClick={() => moveSectionById(node.id, 1)}
                className="grid h-6 w-6 cursor-pointer place-items-center rounded-[2px] text-chalk-dim hover:text-chalk"
              >
                <ArrowDown width={11} height={11} />
              </button>
            </span>
          ) : null}
          <button
            type="button"
            aria-label={node.hidden ? `Show ${node.name}` : `Hide ${node.name}`}
            onClick={() => toggleHidden(node.id)}
            className="grid h-6 w-6 shrink-0 cursor-pointer place-items-center rounded-[2px] text-chalk-dim hover:text-chalk"
          >
            {node.hidden ? <EyeOff width={12} height={12} /> : <Eye width={12} height={12} />}
          </button>
        </div>
        {hasChildren && !isCollapsed ? (
          <ul>{node.children!.map((child) => renderRow(child, depth + 1))}</ul>
        ) : null}
      </li>
    );
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-hairline px-3 py-2.5">
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-chalk-dim">
          Layers
        </span>
        <span className="font-mono text-[10px] text-chalk-dim">{nodes.length} sections</span>
      </div>
      <ul className="flex-1 overflow-y-auto p-2">{nodes.map((node) => renderRow(node, 0))}</ul>
      <div className="border-t border-hairline p-3">
        <p className="font-mono text-[9.5px] leading-relaxed text-chalk-dim">
          Select any element on the canvas or here. Hidden elements stay in the tree.
        </p>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-chalk-dim">
        {label}
      </span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

const controlClass =
  "h-8 w-full rounded-[2px] border border-hairline bg-void px-2 font-mono text-[11.5px] text-chalk outline-none transition-colors focus:border-chalk-dim";

function NumberField({
  value,
  onChange,
  step = 1,
  suffix,
}: {
  value: number | undefined;
  onChange: (v: number) => void;
  step?: number;
  suffix?: string;
}) {
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        aria-label="Decrease"
        onClick={() => onChange(Math.max(0, (value ?? 0) - step))}
        className="grid h-8 w-7 shrink-0 cursor-pointer place-items-center rounded-[2px] border border-hairline text-chalk-dim hover:text-chalk"
      >
        <ArrowDown width={11} height={11} />
      </button>
      <div className="relative flex-1">
        <input
          type="number"
          value={value ?? 0}
          onChange={(e) => onChange(Number(e.target.value))}
          className={cn(controlClass, "text-center")}
        />
        {suffix ? (
          <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 font-mono text-[10px] text-chalk-dim">
            {suffix}
          </span>
        ) : null}
      </div>
      <button
        type="button"
        aria-label="Increase"
        onClick={() => onChange((value ?? 0) + step)}
        className="grid h-8 w-7 shrink-0 cursor-pointer place-items-center rounded-[2px] border border-hairline text-chalk-dim hover:text-chalk"
      >
        <ArrowUp width={11} height={11} />
      </button>
    </div>
  );
}

function ColorField({ value, onChange }: { value: string | undefined; onChange: (v: string) => void }) {
  const isToken = value && (COLOR_TOKENS as readonly string[]).includes(value);
  return (
    <div className="flex items-center gap-1.5">
      {COLOR_TOKENS.map((token) => (
        <button
          key={token}
          type="button"
          aria-label={`Use ${token}`}
          onClick={() => onChange(token)}
          className={cn(
            "grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-[2px] border font-mono text-[8px] uppercase transition-colors",
            value === token ? "border-lime text-lime" : "border-hairline text-chalk-dim hover:text-chalk",
          )}
        >
          {token.slice(0, 3)}
        </button>
      ))}
      <input
        value={isToken ? "" : (value ?? "")}
        placeholder="#hex"
        onChange={(e) => onChange(e.target.value)}
        className={cn(controlClass, "flex-1")}
      />
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-2">{children}</div>;
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-hairline px-3 py-3.5">
      <p className="mb-2.5 font-mono text-[9.5px] uppercase tracking-[0.16em] text-lime">{title}</p>
      <div className="grid gap-2.5">{children}</div>
    </div>
  );
}

export function InspectorPanel() {
  const { selectedNode, updateStyle, updateTokens, device, select } = useDesign();

  if (!selectedNode) {
    return (
      <div className="grid h-full place-items-center p-6 text-center">
        <div>
          <MousePointerClick width={22} height={22} className="mx-auto text-chalk-dim" />
          <p className="mt-3 text-[13px] text-chalk">Nothing selected</p>
          <p className="mt-1.5 font-mono text-[10.5px] leading-relaxed text-chalk-dim">
            Tap an element on the canvas or pick one from the layers list.
          </p>
        </div>
      </div>
    );
  }

  const node = selectedNode;
  const isolated = device !== "desktop";
  const view = responsiveFields(node.style, device);

  const setField = (field: keyof NodeStyle, value: unknown) => {
    if (!isolated) {
      updateStyle(node.id, { [field]: value } as Partial<NodeStyle>);
      return;
    }
    const responsive = node.style.responsive ?? {};
    updateStyle(node.id, {
      responsive: {
        ...responsive,
        [device]: { ...(responsive[device as "tablet" | "mobile"] ?? {}), [field]: value },
      },
    } as Partial<NodeStyle>);
  };

  const supportsType = TEXT_NODES.includes(node.type) || node.type === "productCard" || node.type === "collection";
  const supportsBackground = !["heading", "paragraph", "text", "nav"].includes(node.type);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-hairline px-3 py-2.5">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate font-display text-[13px] font-semibold text-chalk">
            {node.name}
          </span>
          <button
            type="button"
            onClick={() => select(null)}
            className="shrink-0 cursor-pointer font-mono text-[9.5px] uppercase tracking-[0.12em] text-chalk-dim hover:text-chalk"
          >
            Close
          </button>
        </div>
        <p className="mt-1 flex items-center gap-2 font-mono text-[9.5px] text-chalk-dim">
          <span className="text-lime">{node.type}</span>
          <span>#{node.id}</span>
          {isolated ? <span className="text-sand">{device} override</span> : null}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {TEXT_NODES.includes(node.type) || node.type === "productCard" ? (
          <Group title="Content">
            {TEXT_NODES.includes(node.type) ? (
              <Field label="Text">
                <textarea
                  value={node.tokens?.text ?? ""}
                  onChange={(e) => updateTokens(node.id, { text: e.target.value })}
                  className={cn(controlClass, "h-[70px] resize-y py-1.5")}
                />
              </Field>
            ) : null}
            <Field label="Bind to commerce data">
              <select
                className={controlClass}
                value={isBinding(node.tokens?.text) ? node.tokens?.text : ""}
                onChange={(e) => {
                  if (!e.target.value) return;
                  updateTokens(node.id, { text: e.target.value });
                }}
              >
                <option value="">Literal text</option>
                {TOKENS.map((token) => (
                  <option key={token} value={token}>
                    {token}
                  </option>
                ))}
              </select>
            </Field>
            {node.type === "productCard" ? (
              <>
                <Field label="Title binding">
                  <select
                    className={controlClass}
                    value={node.tokens?.title ?? ""}
                    onChange={(e) => updateTokens(node.id, { title: e.target.value })}
                  >
                    {TOKENS.map((token) => (
                      <option key={token} value={token}>
                        {token}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Price binding">
                  <select
                    className={controlClass}
                    value={node.tokens?.price ?? ""}
                    onChange={(e) => updateTokens(node.id, { price: e.target.value })}
                  >
                    <option value="">None</option>
                    {TOKENS.map((token) => (
                      <option key={token} value={token}>
                        {token}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Rating binding">
                  <select
                    className={controlClass}
                    value={node.tokens?.rating ?? ""}
                    onChange={(e) => updateTokens(node.id, { rating: e.target.value })}
                  >
                    <option value="">None</option>
                    {TOKENS.map((token) => (
                      <option key={token} value={token}>
                        {token}
                      </option>
                    ))}
                  </select>
                </Field>
              </>
            ) : null}
            {node.type === "collection" ? (
              <p className="font-mono text-[10px] leading-relaxed text-chalk-dim">
                Shows {COLLECTIONS.length} collections from your catalog.
              </p>
            ) : null}
          </Group>
        ) : null}

        {node.type === "hero" ? <SlidesGroup node={node} /> : null}

        {supportsType ? (
          <Group title="Typography">
            <Row>
              <Field label="Font">
                <select
                  className={controlClass}
                  value={view.fontFamily ?? ""}
                  onChange={(e) => setField("fontFamily", e.target.value || undefined)}
                >
                  <option value="">Theme default</option>
                  {FONTS.map((font) => (
                    <option key={font.value} value={font.value}>
                      {font.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Size">
                <NumberField value={view.fontSize} onChange={(v) => setField("fontSize", v)} suffix="px" />
              </Field>
            </Row>
            <Row>
              <Field label="Weight">
                <select
                  className={controlClass}
                  value={view.fontWeight ?? 400}
                  onChange={(e) => setField("fontWeight", Number(e.target.value))}
                >
                  {[300, 400, 500, 600, 700, 800].map((w) => (
                    <option key={w} value={w}>
                      {w}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Line height">
                <NumberField value={view.lineHeight} onChange={(v) => setField("lineHeight", v)} step={0.05} />
              </Field>
            </Row>
            <Row>
              <Field label="Letter spacing">
                <NumberField
                  value={view.letterSpacing}
                  onChange={(v) => setField("letterSpacing", Number(v.toFixed(3)))}
                  step={0.01}
                  suffix="em"
                />
              </Field>
              <Field label="Align">
                <div className="flex gap-1">
                  {([
                    ["left", AlignLeft],
                    ["center", AlignCenter],
                    ["right", AlignRight],
                  ] as const).map(([value, Icon]) => (
                    <button
                      key={value}
                      type="button"
                      aria-label={`Align ${value}`}
                      onClick={() => setField("textAlign", value)}
                      className={cn(
                        "grid h-8 flex-1 cursor-pointer place-items-center rounded-[2px] border transition-colors",
                        view.textAlign === value ? "border-lime text-lime" : "border-hairline text-chalk-dim hover:text-chalk",
                      )}
                    >
                      <Icon width={13} height={13} />
                    </button>
                  ))}
                </div>
              </Field>
            </Row>
            <Field label="Text colour">
              <ColorField value={view.color} onChange={(v) => setField("color", v)} />
            </Field>
          </Group>
        ) : null}

        <Group title="Layout">
          <Row>
            <Field label="Display">
              <select
                className={controlClass}
                value={view.display ?? "block"}
                onChange={(e) => setField("display", e.target.value)}
              >
                {["block", "flex", "grid"].map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Direction">
              <select
                className={controlClass}
                value={view.direction ?? "column"}
                onChange={(e) => setField("direction", e.target.value)}
              >
                {["column", "row"].map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </Field>
          </Row>
          <Row>
            <Field label="Columns">
              <NumberField value={view.columns ?? 1} onChange={(v) => setField("columns", v)} />
            </Field>
            <Field label="Gap">
              <NumberField value={view.gap} onChange={(v) => setField("gap", v)} suffix="px" />
            </Field>
          </Row>
          <Row>
            <Field label="Padding X">
              <NumberField value={view.paddingX} onChange={(v) => setField("paddingX", v)} />
            </Field>
            <Field label="Padding Y">
              <NumberField value={view.paddingY} onChange={(v) => setField("paddingY", v)} />
            </Field>
          </Row>
          <Row>
            <Field label="Margin X">
              <NumberField value={view.marginX} onChange={(v) => setField("marginX", v)} />
            </Field>
            <Field label="Margin Y">
              <NumberField value={view.marginY} onChange={(v) => setField("marginY", v)} />
            </Field>
          </Row>
          <Row>
            <Field label="Align items">
              <select
                className={controlClass}
                value={view.align ?? "start"}
                onChange={(e) => setField("align", e.target.value)}
              >
                {["start", "center", "end", "stretch"].map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Justify">
              <select
                className={controlClass}
                value={view.justify ?? "start"}
                onChange={(e) => setField("justify", e.target.value)}
              >
                {["start", "center", "between", "end"].map((j) => (
                  <option key={j} value={j}>
                    {j}
                  </option>
                ))}
              </select>
            </Field>
          </Row>
          <Row>
            <Field label="Width">
              <input
                className={controlClass}
                value={view.width ?? ""}
                placeholder="auto"
                onChange={(e) => setField("width", e.target.value || undefined)}
              />
            </Field>
            <Field label="Height">
              <input
                className={controlClass}
                value={view.height ?? ""}
                placeholder="auto"
                onChange={(e) => setField("height", e.target.value || undefined)}
              />
            </Field>
          </Row>
        </Group>

        {supportsBackground ? (
          <Group title="Appearance">
            <Field label="Background">
              <ColorField value={view.background} onChange={(v) => setField("background", v)} />
            </Field>
            <Row>
              <Field label="Border">
                <NumberField value={view.borderWidth} onChange={(v) => setField("borderWidth", v)} suffix="px" />
              </Field>
              <Field label="Radius">
                <NumberField value={view.radius} onChange={(v) => setField("radius", v)} suffix="px" />
              </Field>
            </Row>
            <Field label="Border colour">
              <ColorField value={view.borderColor} onChange={(v) => setField("borderColor", v)} />
            </Field>
            <Row>
              <Field label="Shadow">
                <select
                  className={controlClass}
                  value={view.shadow ?? 0}
                  onChange={(e) => setField("shadow", Number(e.target.value))}
                >
                  {[0, 1, 2, 3].map((s) => (
                    <option key={s} value={s}>
                      {s === 0 ? "None" : `Level ${s}`}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Opacity">
                <NumberField
                  value={view.opacity === undefined ? 1 : Number(view.opacity.toFixed(2))}
                  onChange={(v) => setField("opacity", Math.min(1, Math.max(0, v)))}
                  step={0.05}
                />
              </Field>
            </Row>
          </Group>
        ) : null}

        <Group title={`Responsive \u00b7 ${device}`}>
          <p className="font-mono text-[10px] leading-relaxed text-chalk-dim">
            {isolated
              ? "Changes here are overrides for this device only. Desktop values stay untouched."
              : "Switch to tablet or mobile in the toolbar to write overrides for those breakpoints."}
          </p>
          {isolated ? (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() =>
                  updateStyle(node.id, {
                    responsive: {
                      ...(node.style.responsive ?? {}),
                      [device]: {
                        fontSize: node.style.fontSize,
                        paddingY: node.style.paddingY,
                        paddingX: node.style.paddingX,
                        gap: node.style.gap,
                        columns: node.style.columns,
                        display: node.style.display,
                      },
                    },
                  } as Partial<NodeStyle>)
                }
                className="h-8 flex-1 cursor-pointer rounded-[2px] border border-hairline font-mono text-[10px] uppercase tracking-[0.12em] text-chalk-dim transition-colors hover:text-chalk"
              >
                Copy from desktop
              </button>
              <button
                type="button"
                onClick={() => {
                  const responsive = { ...(node.style.responsive ?? {}) };
                  delete responsive[device as "tablet" | "mobile"];
                  updateStyle(node.id, { responsive } as Partial<NodeStyle>);
                }}
                className="h-8 flex-1 cursor-pointer rounded-[2px] border border-hairline font-mono text-[10px] uppercase tracking-[0.12em] text-chalk-dim transition-colors hover:text-chalk"
              >
                Clear overrides
              </button>
            </div>
          ) : null}
        </Group>
      </div>
    </div>
  );
}

export type { Device };

const OVERLAY_TONE_OPTIONS: { value: BannerOverlay["tone"]; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

const OVERLAY_ALIGN_OPTIONS: { value: BannerOverlay["align"]; label: string }[] = [
  { value: "left", label: "Left" },
  { value: "center", label: "Centre" },
  { value: "right", label: "Right" },
];

const OVERLAY_VERTICAL_OPTIONS: { value: BannerOverlay["vertical"]; label: string }[] = [
  { value: "top", label: "Top" },
  { value: "middle", label: "Middle" },
  { value: "bottom", label: "Bottom" },
];

const chipRow = "flex gap-1";
const chip = (active: boolean) =>
  cn(
    "h-7 flex-1 cursor-pointer rounded-[2px] border font-mono text-[9.5px] uppercase tracking-[0.1em] transition-colors",
    active ? "border-lime text-lime" : "border-hairline text-chalk-dim hover:text-chalk",
  );

/**
 * Banner slides for the storefront hero. A hero with slides renders the
 * promotional slider instead of the static text block, so this is where a
 * merchant manages their own campaign banners, video and overlay placement.
 */
function SlidesGroup({ node }: { node: DesignNode }) {
  const { setSlides } = useDesign();
  const imageRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const targetSlide = useRef<number | null>(null);
  const slides = node.slides ?? [];

  const patchSlide = (index: number, patch: Partial<HeroSlide>) => {
    setSlides(
      node.id,
      slides.map((s, i) => (i === index ? { ...s, ...patch } : s)),
    );
  };

  const ov = (slide: HeroSlide): BannerOverlay => slide.overlay ?? DEFAULT_OVERLAY;

  const patchOverlay = (index: number, slide: HeroSlide, patch: Partial<BannerOverlay>) => {
    patchSlide(index, { overlay: { ...ov(slide), ...patch } });
  };

  const attach = (file: File | undefined) => {
    if (!file || targetSlide.current === null) return;
    const url = URL.createObjectURL(file);
    const isVideo = file.type.startsWith("video");
    patchSlide(targetSlide.current, { mediaUrl: url, kind: isVideo ? "video" : "image" });
    targetSlide.current = null;
  };

  const move = (index: number, direction: -1 | 1) => {
    const next = [...slides];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setSlides(node.id, next);
  };

  return (
    <Group title="Banner slides">
      <p className="font-mono text-[10px] leading-relaxed text-chalk-dim">
        {slides.length
          ? `${slides.length} slides \u00b7 the hero plays these instead of the text block below.`
          : "No slides yet \u2014 the hero renders as a static text block."}
      </p>

      <input
        ref={imageRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => attach(e.target.files?.[0])}
      />
      <input
        ref={videoRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={(e) => attach(e.target.files?.[0])}
      />

      <ul className="space-y-2">
        {slides.map((slide, index) => (
          <li key={slide.id} className="rounded-[2px] border border-hairline p-2.5">
            <div className="flex items-center gap-1.5">
              {slide.kind === "video" ? (
                <Film width={12} height={12} className="shrink-0 text-azure" />
              ) : (
                <ImageIcon width={12} height={12} className="shrink-0 text-chalk-dim" />
              )}
              <span className="min-w-0 flex-1 truncate font-mono text-[9.5px] uppercase tracking-[0.12em] text-chalk-dim">
                Slide {index + 1} \u00b7 {slide.duration / 1000}s
              </span>
              <button
                type="button"
                aria-label="Move slide up"
                onClick={() => move(index, -1)}
                className="grid h-6 w-6 cursor-pointer place-items-center rounded-[2px] text-chalk-dim hover:text-chalk"
              >
                <ArrowUp width={11} height={11} />
              </button>
              <button
                type="button"
                aria-label="Move slide down"
                onClick={() => move(index, 1)}
                className="grid h-6 w-6 cursor-pointer place-items-center rounded-[2px] text-chalk-dim hover:text-chalk"
              >
                <ArrowDown width={11} height={11} />
              </button>
              <button
                type="button"
                aria-label="Delete slide"
                onClick={() => setSlides(node.id, slides.filter((_, i) => i !== index))}
                className="grid h-6 w-6 cursor-pointer place-items-center rounded-[2px] text-chalk-dim hover:text-ember-soft"
              >
                <Trash2 width={11} height={11} />
              </button>
            </div>

            <div className="mt-2 grid gap-2">
              <input
                value={slide.headline}
                onChange={(e) => patchSlide(index, { headline: e.target.value })}
                placeholder="Slide headline"
                aria-label={`Headline for slide ${index + 1}`}
                className={controlClass}
              />
              <input
                value={slide.body}
                onChange={(e) => patchSlide(index, { body: e.target.value })}
                placeholder="Supporting line"
                aria-label={`Body for slide ${index + 1}`}
                className={controlClass}
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  value={slide.ctaLabel}
                  onChange={(e) => patchSlide(index, { ctaLabel: e.target.value })}
                  placeholder="Button label"
                  aria-label={`Button label for slide ${index + 1}`}
                  className={controlClass}
                />
                <input
                  value={slide.ctaHref}
                  onChange={(e) => patchSlide(index, { ctaHref: e.target.value })}
                  placeholder="/browse"
                  aria-label={`Button link for slide ${index + 1}`}
                  className={controlClass}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={slide.kind}
                  onChange={(e) => patchSlide(index, { kind: e.target.value as HeroSlide["kind"] })}
                  aria-label={`Slide type for slide ${index + 1}`}
                  className={controlClass}
                >
                  <option value="image">Image</option>
                  <option value="video">Video</option>
                </select>
                <NumberField
                  value={slide.duration / 1000}
                  onChange={(v) => patchSlide(index, { duration: Math.max(2, v) * 1000 })}
                  suffix="s"
                />
              </div>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    targetSlide.current = index;
                    imageRef.current?.click();
                  }}
                  className="inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-[2px] border border-hairline px-2 font-mono text-[9.5px] uppercase tracking-[0.12em] text-chalk-dim transition-colors hover:text-chalk"
                >
                  <Upload width={11} height={11} /> Image
                </button>
                <button
                  type="button"
                  onClick={() => {
                    targetSlide.current = index;
                    videoRef.current?.click();
                  }}
                  className="inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-[2px] border border-hairline px-2 font-mono text-[9.5px] uppercase tracking-[0.12em] text-chalk-dim transition-colors hover:text-chalk"
                >
                  <Film width={11} height={11} /> Video
                </button>
                {slide.mediaUrl ? (
                  <span className="inline-flex h-7 items-center rounded-[2px] bg-lime/12 px-2 font-mono text-[9.5px] uppercase tracking-[0.12em] text-lime">
                    Media attached
                  </span>
                ) : null}
              </div>

              <div className="rounded-[2px] border border-hairline/70 p-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-chalk-dim">
                    Text overlay
                  </span>
                  <button
                    type="button"
                    onClick={() => patchOverlay(index, slide, { enabled: !ov(slide).enabled })}
                    className={cn(
                      "h-6 cursor-pointer rounded-[2px] border px-2 font-mono text-[9px] uppercase tracking-[0.12em] transition-colors",
                      ov(slide).enabled ? "border-lime text-lime" : "border-hairline text-chalk-dim",
                    )}
                  >
                    {ov(slide).enabled ? "On" : "Off"}
                  </button>
                </div>

                <div
                  className={cn(
                    "mt-2 grid gap-2",
                    !ov(slide).enabled && "pointer-events-none opacity-50",
                  )}
                >
                  <div className={chipRow}>
                    {OVERLAY_ALIGN_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => patchOverlay(index, slide, { align: option.value })}
                        className={chip(ov(slide).align === option.value)}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                  <div className={chipRow}>
                    {OVERLAY_VERTICAL_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => patchOverlay(index, slide, { vertical: option.value })}
                        className={chip(ov(slide).vertical === option.value)}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                  <div className={chipRow}>
                    {OVERLAY_TONE_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => patchOverlay(index, slide, { tone: option.value })}
                        className={chip(ov(slide).tone === option.value)}
                      >
                        {option.label} text
                      </button>
                    ))}
                  </div>
                  <label className="block">
                    <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-chalk-dim">
                      Scrim {ov(slide).scrim}%
                    </span>
                    <input
                      type="range"
                      min={0}
                      max={92}
                      step={2}
                      value={ov(slide).scrim}
                      aria-label={`Scrim strength for slide ${index + 1}`}
                      onChange={(e) => patchOverlay(index, slide, { scrim: Number(e.target.value) })}
                      className="mt-1 w-full cursor-pointer accent-[#c9f24d]"
                    />
                  </label>
                  <label className="block">
                    <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-chalk-dim">
                      Column {ov(slide).width}ch
                    </span>
                    <input
                      type="range"
                      min={18}
                      max={64}
                      step={2}
                      value={ov(slide).width}
                      aria-label={`Text column width for slide ${index + 1}`}
                      onChange={(e) => patchOverlay(index, slide, { width: Number(e.target.value) })}
                      className="mt-1 w-full cursor-pointer accent-[#c9f24d]"
                    />
                  </label>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={() =>
          setSlides(node.id, [
            ...slides,
            {
              id: `slide-${Date.now().toString(36)}`,
              kind: "image",
              headline: "New banner headline",
              body: "One line about the promotion.",
              ctaLabel: "Shop now",
              ctaHref: "/browse",
              mediaUrl: null,
              duration: 7000,
            },
          ])
        }
        className="h-8 w-full cursor-pointer rounded-[2px] border border-hairline font-mono text-[10px] uppercase tracking-[0.12em] text-chalk-dim transition-colors hover:border-lime/40 hover:text-lime"
      >
        Add a slide
      </button>
    </Group>
  );
}

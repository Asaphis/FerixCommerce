"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Copy,
  Eye,
  EyeOff,
  Film,
  Image as ImageIcon,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { useFerixas } from "@/lib/store";
import { dateLong, num } from "@/lib/format";
import type { Banner, BannerKind, BannerOverlay } from "@/lib/types";
import {
  Panel,
  PanelHead,
  Pill,
  SegmentedControl,
  StatTile,
  StudioButton,
  inputClass,
  selectClass,
} from "@/components/studio/bits";
import { PromoSlider } from "@/components/shop/promo-slider";
import { cn } from "@/lib/utils";

const AUDIENCES = [
  "All shoppers",
  "New visitors",
  "Returning customers",
  "Marketplace buyers",
  "Audio buyers",
];

export function BannerManager() {
  const { banners, addBanner, updateBanner, removeBanner, moveBanner } = useFerixas();
  const [editingId, setEditingId] = useState<string | null>(banners[0]?.id ?? null);

  const ordered = [...banners].sort((a, b) => a.order - b.order);
  const selected = ordered.find((b) => b.id === editingId) ?? null;
  const liveCount = ordered.filter((b) => b.active).length;
  const impressions = ordered.reduce((s, b) => s + b.impressions, 0);
  const clicks = ordered.reduce((s, b) => s + b.clicks, 0);
  const ctr = impressions ? (clicks / impressions) * 100 : 0;
  const preview = selected ?? ordered.find((b) => b.active) ?? ordered[0] ?? null;

  const addSlide = (kind: BannerKind) => {
    const created = addBanner(kind);
    setEditingId(created.id);
    toast.success(
      kind === "video"
        ? "Video banner added \u2014 attach the video, then put it live"
        : "Image banner added \u2014 edit the content, then put it live",
    );
  };

  return (
    <div className="grid gap-3">
      <p className="max-w-[86ch] text-[13px] leading-relaxed text-chalk-dim">
        The sliding banners at the top of ferixas.com. This is the first thing every shopper sees,
        so slides are ordered, scheduled and measured here. A slide can be a still image or a video,
        and it can be taken offline without being deleted.
      </p>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Slides"
          value={String(ordered.length)}
          sub={`${liveCount} live on the storefront`}
        />
        <StatTile
          label="Impressions"
          value={num(impressions, { compact: true })}
          sub="Across every slide"
        />
        <StatTile
          label="Clicks"
          value={num(clicks, { compact: true })}
          sub={`${ctr.toFixed(2)}% click through`}
        />
        <StatTile
          label="Video slides"
          value={String(ordered.filter((b) => b.kind === "video").length)}
          sub="Everything else is a still banner"
        />
      </div>

      <div className="grid gap-3 lg:grid-cols-[1fr_1.35fr]">
        <Panel flush>
          <div className="flex items-start justify-between gap-3 p-5 pb-4">
            <PanelHead title="Slides in order" hint="The first live slide plays first" />
            <div className="flex shrink-0 gap-1.5">
              <StudioButton onClick={() => addSlide("image")}>
                <ImageIcon width={13} height={13} />
                Image
              </StudioButton>
              <StudioButton variant="primary" onClick={() => addSlide("video")}>
                <Film width={13} height={13} />
                Video
              </StudioButton>
            </div>
          </div>

          <ul className="px-5 pb-5">
            {ordered.map((banner, index) => (
              <SlideRow
                key={banner.id}
                banner={banner}
                index={index}
                total={ordered.length}
                selected={banner.id === editingId}
                onSelect={() => setEditingId(banner.id)}
                onMove={(direction) => moveBanner(banner.id, direction)}
                onToggle={() => {
                  updateBanner(banner.id, { active: !banner.active });
                  toast.success(
                    banner.active
                      ? "Slide taken offline \u2014 it stays in the library"
                      : "Slide is live on the storefront",
                  );
                }}
                onDelete={() => {
                  removeBanner(banner.id);
                  if (editingId === banner.id) setEditingId(null);
                  toast.success("Slide deleted");
                }}
              />
            ))}
          </ul>
        </Panel>

        {selected ? (
          <BannerEditor
            banner={selected}
            onChange={(patch) => updateBanner(selected.id, patch)}
          />
        ) : (
          <Panel>
            <PanelHead title="Slide editor" hint="Choose a slide on the left" />
            <p className="text-[13px] text-chalk-dim">
              Nothing selected. Add an image or video slide to get started.
            </p>
          </Panel>
        )}
      </div>

      <Panel>
        <PanelHead
          title="Preview"
          hint="How the slide reads on the storefront"
          action={preview ? <Pill tone={preview.kind === "video" ? "info" : "neutral"}>{preview.kind}</Pill> : null}
        />
        {preview ? <BannerPreview banner={preview} /> : (
          <p className="text-[13px] text-chalk-dim">No slides yet.</p>
        )}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-hairline pt-3">
          <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-chalk-dim">
            Live on ferixas.com \u00b7 visible to {preview?.audience ?? "all shoppers"}
          </span>
          <Link
            href="/"
            className="inline-flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.14em] text-lime"
          >
            Open the storefront
            <ArrowRight width={12} height={12} />
          </Link>
        </div>
      </Panel>
    </div>
  );
}

function SlideRow({
  banner,
  index,
  total,
  selected,
  onSelect,
  onMove,
  onToggle,
  onDelete,
}: {
  banner: Banner;
  index: number;
  total: number;
  selected: boolean;
  onSelect: () => void;
  onMove: (direction: -1 | 1) => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const heading = banner.headline.split("\n")[0];
  const ctr = banner.impressions ? (banner.clicks / banner.impressions) * 100 : 0;

  return (
    <li
      className={cn(
        "mb-2 rounded-[2px] border p-3 transition-colors",
        selected ? "border-lime/40 bg-lime/[0.05]" : "border-hairline hover:border-chalk-dim",
      )}
    >
      <div className="flex items-start gap-3">
        <button type="button" onClick={onSelect} className="min-w-0 flex-1 cursor-pointer text-left">
          <span className="flex items-center gap-2">
            <span className="font-mono text-[10px] text-chalk-dim">
              {String(index + 1).padStart(2, "0")}
            </span>
            {banner.kind === "video" ? (
              <Film width={12} height={12} className="shrink-0 text-azure" />
            ) : (
              <ImageIcon width={12} height={12} className="shrink-0 text-chalk-dim" />
            )}
            <span className="truncate text-[12.5px] text-chalk">{heading}</span>
          </span>
          <span className="mt-1 block truncate font-mono text-[10px] text-chalk-dim">
            {banner.eyebrow} \u00b7 {banner.duration / 1000}s \u00b7 {banner.posterNote}
          </span>
        </button>

        <div className="flex shrink-0 items-center gap-0.5">
          <RowIconButton label="Move slide up" disabled={index === 0} onClick={() => onMove(-1)}>
            <ArrowLeft width={12} height={12} className="rotate-90" />
          </RowIconButton>
          <RowIconButton
            label="Move slide down"
            disabled={index === total - 1}
            onClick={() => onMove(1)}
          >
            <ArrowRight width={12} height={12} className="rotate-90" />
          </RowIconButton>
          <RowIconButton
            label={banner.active ? "Take the slide offline" : "Put the slide live"}
            onClick={onToggle}
          >
            {banner.active ? <Eye width={13} height={13} /> : <EyeOff width={13} height={13} />}
          </RowIconButton>
          <RowIconButton label="Delete slide" danger onClick={onDelete}>
            <Trash2 width={12} height={12} />
          </RowIconButton>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <Pill tone={banner.active ? "success" : "neutral"}>{banner.active ? "Live" : "Off"}</Pill>
        <Pill tone={banner.kind === "video" ? "info" : "neutral"}>{banner.kind}</Pill>
        <Pill tone="neutral">{ctr.toFixed(2)}% CTR</Pill>
      </div>
    </li>
  );
}

function RowIconButton({
  label,
  onClick,
  disabled,
  danger,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "grid h-7 w-7 cursor-pointer place-items-center rounded-[2px] text-chalk-dim transition-colors disabled:cursor-not-allowed disabled:opacity-30",
        danger ? "hover:bg-ember/12 hover:text-ember-soft" : "hover:bg-panel-2 hover:text-chalk",
      )}
    >
      {children}
    </button>
  );
}

function BannerPreview({ banner }: { banner: Banner }) {
  // The preview is the real slider with one forced-live slide, so what you see
  // here is exactly what a shopper gets, overlay included.
  return (
    <div className="overflow-hidden rounded-[2px] border border-hairline">
      <PromoSlider
        banners={[{ ...banner, active: true }]}
        viewportClassName="h-[300px] sm:h-[340px]"
        autoplay={false}
      />
    </div>
  );
}

function BannerEditor({
  banner,
  onChange,
}: {
  banner: Banner;
  onChange: (patch: Partial<Banner>) => void;
}) {
  const imageRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);

  const attach = (file: File | undefined) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    const kind: BannerKind = file.type.startsWith("video") ? "video" : "image";
    onChange({
      mediaUrl: url,
      kind,
      posterNote: `${file.name} \u00b7 ${(file.size / 1024 / 1024).toFixed(1)} MB`,
    });
    toast.success(`${file.name} attached to this slide`);
  };

  return (
    <Panel>
      <PanelHead
        title="Slide editor"
        hint="Content, media and timing"
        action={<Pill tone={banner.kind === "video" ? "info" : "neutral"}>{banner.kind}</Pill>}
      />

      <div className="grid gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Labelled label="Slide type">
            <select
              className={selectClass}
              value={banner.kind}
              onChange={(e) => onChange({ kind: e.target.value as BannerKind })}
            >
              <option value="image">Still image banner</option>
              <option value="video">Video banner</option>
            </select>
          </Labelled>
          <Labelled label="Eyebrow">
            <input
              className={inputClass}
              value={banner.eyebrow}
              onChange={(e) => onChange({ eyebrow: e.target.value })}
            />
          </Labelled>
        </div>

        <Labelled label="Headline \u00b7 press enter for a line break">
          <textarea
            className={cn(inputClass, "h-[66px] resize-y py-2")}
            value={banner.headline}
            onChange={(e) => onChange({ headline: e.target.value })}
          />
        </Labelled>

        <Labelled label="Supporting line">
          <textarea
            className={cn(inputClass, "h-[60px] resize-y py-2")}
            value={banner.body}
            onChange={(e) => onChange({ body: e.target.value })}
          />
        </Labelled>

        <div className="grid gap-4 sm:grid-cols-2">
          <Labelled label="Button label">
            <input
              className={inputClass}
              value={banner.ctaLabel}
              onChange={(e) => onChange({ ctaLabel: e.target.value })}
            />
          </Labelled>
          <Labelled label="Button link">
            <input
              className={inputClass}
              value={banner.ctaHref}
              onChange={(e) => onChange({ ctaHref: e.target.value })}
            />
          </Labelled>
          <Labelled label="Secondary label">
            <input
              className={inputClass}
              value={banner.secondaryLabel}
              onChange={(e) => onChange({ secondaryLabel: e.target.value })}
            />
          </Labelled>
          <Labelled label="Secondary link">
            <input
              className={inputClass}
              value={banner.secondaryHref}
              onChange={(e) => onChange({ secondaryHref: e.target.value })}
            />
          </Labelled>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Labelled label="Accent colour">
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={banner.accent}
                aria-label="Accent colour picker"
                onChange={(e) => onChange({ accent: e.target.value })}
                className="h-9 w-12 cursor-pointer rounded-[2px] border border-hairline bg-void"
              />
              <input
                className={inputClass}
                aria-label="Accent colour value"
                value={banner.accent}
                onChange={(e) => onChange({ accent: e.target.value })}
              />
            </div>
          </Labelled>
          <Labelled label={`On screen for ${banner.duration / 1000}s`}>
            <input
              type="range"
              min={3000}
              max={15000}
              step={1000}
              value={banner.duration}
              aria-label="Slide duration"
              onChange={(e) => onChange({ duration: Number(e.target.value) })}
              className="mt-3 w-full cursor-pointer accent-[#c9f24d]"
            />
          </Labelled>
          <Labelled label="Audience">
            <select
              className={selectClass}
              value={banner.audience}
              onChange={(e) => onChange({ audience: e.target.value })}
            >
              {AUDIENCES.map((audience) => (
                <option key={audience} value={audience}>
                  {audience}
                </option>
              ))}
            </select>
          </Labelled>
        </div>

        <div className="rounded-[2px] border border-hairline p-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-chalk-dim">
            Banner media
          </p>
          <p className="mt-2 text-[12.5px] leading-relaxed text-chalk-dim">
            {banner.mediaUrl
              ? `Attached: ${banner.posterNote}. It plays in the slider straight away.`
              : banner.kind === "video"
                ? "No video attached yet \u2014 the slide shows a generated video frame until you upload one."
                : "Using generated artwork. Upload an image to replace it."}
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
          <div className="mt-3 flex flex-wrap gap-2">
            <StudioButton onClick={() => imageRef.current?.click()}>
              <Upload width={13} height={13} /> Upload image
            </StudioButton>
            <StudioButton onClick={() => videoRef.current?.click()}>
              <Film width={13} height={13} /> Upload video
            </StudioButton>
            {banner.mediaUrl ? (
              <StudioButton
                variant="danger"
                onClick={() => onChange({ mediaUrl: null, posterNote: "Generated artwork" })}
              >
                <Trash2 width={13} height={13} /> Remove media
              </StudioButton>
            ) : null}
          </div>
          <p className="mt-3 font-mono text-[10px] leading-relaxed text-chalk-dim/80">
            Uploads live in this browser session only \u2014 the real banner library belongs to the
            mock API.
          </p>
        </div>

        <OverlayControls
          overlay={banner.overlay}
          onChange={(patch) => onChange({ overlay: { ...banner.overlay, ...patch } })}
        />

        <div className="grid gap-3 rounded-[2px] border border-hairline p-4 sm:grid-cols-2">
          <div>
            <p className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-chalk-dim">
              Schedule
            </p>
            <p className="mt-1.5 flex items-center gap-2 text-[12.5px] text-chalk">
              <Check width={12} height={12} className="text-lime" />
              {dateLong(banner.startsAt)} to {dateLong(banner.endsAt)}
            </p>
          </div>
          <div>
            <p className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-chalk-dim">
              Performance
            </p>
            <p className="mt-1.5 font-mono text-[12px] text-chalk">
              {num(banner.impressions)} impressions \u00b7 {num(banner.clicks)} clicks
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-hairline pt-4">
          <StudioButton
            variant={banner.active ? "outline" : "primary"}
            onClick={() => {
              onChange({ active: !banner.active });
              toast.success(banner.active ? "Slide taken offline" : "Slide is live");
            }}
          >
            {banner.active ? <EyeOff width={13} height={13} /> : <Eye width={13} height={13} />}
            {banner.active ? "Take offline" : "Put live"}
          </StudioButton>
          <StudioButton onClick={() => toast.success("Saved to the banner library")}>
            <Copy width={13} height={13} /> Save as template
          </StudioButton>
          <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.14em] text-chalk-dim">
            {banner.active ? "Serving now" : "Not serving"}
          </span>
        </div>
      </div>
    </Panel>
  );
}

/** Overlay options: where the copy sits on top of the full-bleed media. */
function OverlayControls({
  overlay,
  onChange,
}: {
  overlay: BannerOverlay;
  onChange: (patch: Partial<BannerOverlay>) => void;
}) {
  return (
    <div className="rounded-[2px] border border-hairline p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-chalk-dim">
            Text overlay
          </p>
          <p className="mt-1 text-[12.5px] text-chalk-dim">
            The media fills the whole banner. These settings place the copy and buttons on top.
          </p>
        </div>
        <StudioButton
          variant={overlay.enabled ? "outline" : "primary"}
          onClick={() => onChange({ enabled: !overlay.enabled })}
        >
          {overlay.enabled ? <EyeOff width={13} height={13} /> : <Eye width={13} height={13} />}
          {overlay.enabled ? "Overlay on" : "Overlay off"}
        </StudioButton>
      </div>

      <div
        className={cn(
          "mt-4 grid gap-4 sm:grid-cols-2",
          !overlay.enabled && "pointer-events-none opacity-50",
        )}
      >
        <div>
          <p className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-chalk-dim">
            Horizontal
          </p>
          <SegmentedControl
            className="mt-1.5"
            value={overlay.align}
            onChange={(v) => onChange({ align: v })}
            options={[
              { value: "left", label: "Left" },
              { value: "center", label: "Centre" },
              { value: "right", label: "Right" },
            ]}
          />
        </div>
        <div>
          <p className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-chalk-dim">
            Vertical
          </p>
          <SegmentedControl
            className="mt-1.5"
            value={overlay.vertical}
            onChange={(v) => onChange({ vertical: v })}
            options={[
              { value: "top", label: "Top" },
              { value: "middle", label: "Middle" },
              { value: "bottom", label: "Bottom" },
            ]}
          />
        </div>
        <div>
          <p className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-chalk-dim">
            Text colour
          </p>
          <SegmentedControl
            className="mt-1.5"
            value={overlay.tone}
            onChange={(v) => onChange({ tone: v })}
            options={[
              { value: "light", label: "Light" },
              { value: "dark", label: "Dark" },
            ]}
          />
        </div>
        <div>
          <p className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-chalk-dim">
            Text column {overlay.width}ch
          </p>
          <input
            type="range"
            min={18}
            max={64}
            step={2}
            value={overlay.width}
            aria-label="Overlay text column width"
            onChange={(e) => onChange({ width: Number(e.target.value) })}
            className="mt-3 w-full cursor-pointer accent-[#c9f24d]"
          />
        </div>
        <div className="sm:col-span-2">
          <p className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-chalk-dim">
            Readability scrim {overlay.scrim}%
          </p>
          <input
            type="range"
            min={0}
            max={92}
            step={2}
            value={overlay.scrim}
            aria-label="Overlay scrim strength"
            onChange={(e) => onChange({ scrim: Number(e.target.value) })}
            className="mt-3 w-full cursor-pointer accent-[#c9f24d]"
          />
          <p className="mt-1.5 font-mono text-[10px] text-chalk-dim/80">
            {overlay.scrim < 20
              ? "Very light \u2014 only safe on an already dark image"
              : overlay.scrim > 70
                ? "Strong \u2014 safe on busy images, but covers more of the picture"
                : "Balanced for most product photography"}
          </p>
        </div>
      </div>
    </div>
  );
}

function Labelled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-chalk-dim">
        {label}
      </span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

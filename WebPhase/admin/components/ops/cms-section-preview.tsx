"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Clock3, ExternalLink, Image as ImageIcon, ShieldCheck, ShoppingBag, Tag, Truck, X } from "lucide-react";
import { Panel, PanelHead, Pill } from "@/components/ops/bits";
import { assetUrl, type CmsSection, type CmsSectionPreviewProduct } from "@/lib/api";
import { money } from "@/lib/format";

type PreviewBanner = {
  id: string;
  active?: boolean;
  mediaUrl?: string;
  image?: string;
  videoUrl?: string | null;
  kind?: string;
  headline?: string;
  eyebrow?: string;
  body?: string;
  ctaLabel?: string;
  ctaHref?: string;
  secondaryLabel?: string | null;
  secondaryHref?: string | null;
  showText?: boolean;
  overlay?: { align?: string; vertical?: string; tone?: string; scrim?: number };
};

type Props = {
  section: CmsSection;
  products: CmsSectionPreviewProduct[];
  banners?: PreviewBanner[];
  hasDraft: boolean;
  documentStatus: string;
  error?: string | null;
};

function text(value: unknown, fallback = "") {
  return value === null || value === undefined ? fallback : String(value);
}

function color(value: unknown, fallback: string) {
  const raw = text(value).trim();
  return /^#[0-9a-f]{6}$/i.test(raw) ? raw : fallback;
}

function isOn(value: unknown, fallback = false) {
  if (value === undefined || value === null || value === "") return fallback;
  return value === true || ["true", "1", "yes", "on"].includes(String(value).toLowerCase());
}

function clockValue(value: unknown): number | null {
  const raw = text(value).trim();
  if (!raw) return null;
  // The backend treats timezone-naive CMS datetime-local values as UTC.
  const normalized = /^\d{4}-\d\d-\d\dT\d\d:\d\d(?::\d\d(?:\.\d+)?)?$/.test(raw) ? `${raw}Z` : raw;
  const parsed = Date.parse(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatClock(value: unknown) {
  const parsed = clockValue(value);
  return parsed === null ? "Not set" : new Date(parsed).toLocaleString();
}

function countdown(target: number | null, now: number) {
  if (target === null) return "No end time set";
  const remaining = Math.max(0, Math.floor((target - now) / 1000));
  if (remaining <= 0) return "Ended";
  const days = Math.floor(remaining / 86400);
  const hours = Math.floor((remaining % 86400) / 3600);
  const minutes = Math.floor((remaining % 3600) / 60);
  const seconds = remaining % 60;
  return `${days ? `${days}d ` : ""}${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function statusFor(section: CmsSection, now: number) {
  const starts = clockValue(section.startsAt);
  const ends = clockValue(section.endsAt);
  if (starts !== null && now < starts) return "Scheduled";
  if (ends !== null && now >= ends) return "Closed";
  return "Live window";
}

function ProductCardPreview({ product, section }: { product: CmsSectionPreviewProduct; section: CmsSection }) {
  const showLabel = isOn(section.showLabel, true);
  const showRemaining = isOn(section.showRemaining, false);
  const showSectionPrice = isOn(section.showSectionPrice, true);
  const showCompareAt = isOn(section.showCompareAt, true);
  const showDiscountBadges = isOn(section.showDiscountBadges, true);
  const imageUrl = assetUrl(product.images?.[0]);
  const displayPrice = showSectionPrice ? Number(product.price ?? 0) : Number(product.basePrice ?? product.price ?? 0);
  const discount = showDiscountBadges
    ? Number(showSectionPrice ? product.discount ?? 0 : product.baseDiscount ?? product.discount ?? 0)
    : 0;
  const compareAt = showCompareAt
    ? Number(showSectionPrice ? product.compareAt ?? 0 : product.baseCompareAt ?? product.compareAt ?? 0)
    : 0;
  return (
    <article className="min-w-0 overflow-hidden rounded-[10px] border border-[#d9dee2] bg-white text-[#17232b] shadow-sm">
      <div className="relative aspect-[4/3] bg-[#f2f4f6]">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt={product.title} className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full place-items-center text-[#82909b]"><ImageIcon size={22} /></div>
        )}
        {showLabel && product.sectionLabel ? (
          <span className="absolute left-2 top-2 rounded-[3px] px-2 py-1 font-mono text-[9px] font-semibold uppercase tracking-wide text-white"
            style={{ backgroundColor: color(product.sectionBadgeColor, color(section.accentColor, "#e4572e")) }}>
            {product.sectionLabel}
          </span>
        ) : null}
        {discount > 0 ? (
          <span className="absolute right-2 top-2 rounded-[3px] bg-[#e4572e] px-2 py-1 font-mono text-[9px] font-semibold text-white">−{discount}%</span>
        ) : null}
        {showRemaining && Number(product.sectionRemaining) > 0 ? (
          <span className="absolute bottom-2 left-2 rounded-[3px] bg-white/95 px-2 py-1 font-mono text-[9px] font-semibold text-[#324552]">
            {product.sectionRemaining} left in this section
          </span>
        ) : null}
      </div>
      <div className="p-2.5">
        <p className="truncate font-mono text-[9px] uppercase tracking-wide text-[#697782]">{product.merchantName || "Store"}</p>
        <p className="mt-1 line-clamp-2 min-h-[2.5em] text-[12px] font-semibold leading-snug">{product.title || "Untitled product"}</p>
        <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="font-semibold text-[12px]">{money(displayPrice)}</span>
          {compareAt > displayPrice ? <span className="text-[10px] text-[#7a8791] line-through">{money(compareAt)}</span> : null}
        </div>
        {!product.publicNow ? (
          <p className="mt-2 rounded-md bg-[#fff0dc] px-2 py-1 text-[9px] font-medium text-[#744a08]">Preview only · {product.previewStatus}</p>
        ) : null}
      </div>
    </article>
  );
}

export function CmsSectionPreview({ section: initialSection, products, banners = [], hasDraft, documentStatus, error }: Props) {
  const [section, setSection] = useState<CmsSection>(initialSection);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    setSection(initialSection);
  }, [initialSection]);

  useEffect(() => {
    const scope = document.querySelector("[data-cms-section-preview-scope]");
    if (!scope) return;
    const update = (event: Event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement)) return;
      if (!scope.contains(target) || !target.name.startsWith("field_")) return;
      if (target instanceof HTMLInputElement && target.type === "file") return;
      const key = target.name.slice("field_".length);
      const value: unknown = target instanceof HTMLInputElement && target.type === "checkbox" ? target.checked : target.value;
      setSection((current) => ({ ...current, [key]: value }));
    };
    const updateMedia = (event: Event) => {
      const detail = (event as CustomEvent<{ url?: string; kind?: string }>).detail;
      if (!detail) return;
      setSection((current) => ({ ...current, mediaUrl: detail.url ?? "", kind: detail.kind ?? "image" }));
    };
    document.addEventListener("input", update, true);
    document.addEventListener("change", update, true);
    window.addEventListener("ferix:cms-section-media", updateMedia as EventListener);
    return () => {
      document.removeEventListener("input", update, true);
      document.removeEventListener("change", update, true);
      window.removeEventListener("ferix:cms-section-media", updateMedia as EventListener);
    };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const type = text(section.type);
  const presentation = text(section.presentation, "standard");
  const title = text(section.title || section.name, type.replaceAll("_", " "));
  const startsAt = clockValue(section.startsAt);
  const endsAt = clockValue(section.endsAt);
  const isScheduled = startsAt !== null && now < startsAt;
  const isClosed = endsAt !== null && now >= endsAt;
  const activeBanner = useMemo(() => {
    const chosen = text(section.bannerId);
    if (chosen) return banners.find((banner) => banner.id === chosen) ?? null;
    return type === "hero_banner" ? banners.find((banner) => banner.active) ?? null : null;
  }, [banners, section.bannerId, type]);
  const directMedia = text(section.mediaUrl).trim();
  const bannerMedia = activeBanner?.mediaUrl || activeBanner?.image || activeBanner?.videoUrl || "";
  const useSectionMedia = Boolean(directMedia) && !activeBanner;
  const mediaUrl = useSectionMedia ? directMedia : bannerMedia || directMedia;
  const mediaOnly = isOn(section.mediaOnly, false) || (activeBanner?.showText === false && !directMedia);
  const isVideo = text(section.kind || activeBanner?.kind) === "video" || /\.(mp4|webm|mov|m4v)(?:$|\?)/i.test(mediaUrl);
  const background = color(section.backgroundColor, "#ffffff");
  const accent = color(section.accentColor, "#e4572e");
  const foreground = color(section.textColor, "#17232b");
  const timerBackground = color(section.timerBackgroundColor, "#12263a");
  const timerForeground = color(section.timerTextColor, "#ffffff");
  const count = Math.max(1, Math.min(8, Number(section.limit) || 4));
  const visibleProducts = products.slice(0, count);
  const layout = text(section.layout, type === "product_grid" ? "grid" : "horizontal");
  const titleColor = foreground;
  const scheduledOrClosed = isScheduled || isClosed;

  let preview: ReactNode;
  if (type === "hero_banner" || type === "hero_slim") {
    const tone = text(section.tone || activeBanner?.overlay?.tone, "dark");
    const scrim = Math.max(0, Math.min(100, Number(section.scrim ?? activeBanner?.overlay?.scrim ?? 55))) / 100;
    const align = text(section.align || activeBanner?.overlay?.align, "left");
    const vertical = text(section.vertical || activeBanner?.overlay?.vertical, "middle");
    const heroTitle = useSectionMedia ? text(section.title || section.name) : text(activeBanner?.headline || section.title || section.name);
    const eyebrow = useSectionMedia ? text(section.eyebrow) : text(activeBanner?.eyebrow || section.eyebrow);
    const subtitle = useSectionMedia ? text(section.subtitle) : text(activeBanner?.body || section.subtitle);
    const ctaLabel = useSectionMedia ? text(section.ctaLabel) : text(activeBanner?.ctaLabel || section.ctaLabel);
    const secondaryLabel = useSectionMedia ? text(section.secondaryLabel) : text(activeBanner?.secondaryLabel || section.secondaryLabel);
    preview = (
      <div className={`relative min-h-[210px] overflow-hidden ${type === "hero_banner" ? "aspect-[16/8]" : "aspect-[16/4]"} bg-gradient-to-br from-[#e85022] via-[#f17446] to-[#ffd6bd]`}>
        {mediaUrl ? isVideo ? (
          // eslint-disable-next-line jsx-a11y/media-has-caption
          <video key={mediaUrl} src={assetUrl(mediaUrl)} muted playsInline controls className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={assetUrl(mediaUrl)} alt="Current draft hero" className="absolute inset-0 h-full w-full object-cover" />
        ) : <div className="absolute inset-0 grid place-items-center text-white/80"><ImageIcon size={26} /><span className="ml-2 text-xs">No hero media selected</span></div>}
        {!mediaOnly ? <>
          <div className="absolute inset-0" style={{ background: tone === "light" ? `linear-gradient(90deg,rgba(255,255,255,${scrim}),rgba(255,255,255,0))` : `linear-gradient(90deg,rgba(7,20,35,${scrim}),rgba(7,20,35,0))` }} />
          <div className={`absolute inset-0 flex flex-col p-5 ${align === "center" ? "items-center text-center" : align === "right" ? "items-end text-right" : "items-start text-left"} ${vertical === "top" ? "justify-start" : vertical === "bottom" ? "justify-end" : "justify-center"}`} style={{ color: tone === "light" ? "#17232b" : "#ffffff" }}>
            {eyebrow ? <p className="font-mono text-[9px] uppercase tracking-[.16em] opacity-80">{eyebrow}</p> : null}
            <h3 className="mt-2 max-w-[28ch] font-display text-xl font-extrabold leading-tight">{heroTitle || "Your section title"}</h3>
            {subtitle ? <p className="mt-2 max-w-[38ch] text-xs leading-relaxed opacity-90">{subtitle}</p> : null}
            {ctaLabel || secondaryLabel ? <div className="mt-4 flex flex-wrap gap-2">
              {ctaLabel ? <span className="inline-flex items-center gap-1 bg-white px-3 py-2 text-xs font-semibold text-[#c2441a]">{ctaLabel}<ExternalLink size={11} /></span> : null}
              {secondaryLabel ? <span className="border border-current/50 px-3 py-2 text-xs font-semibold">{secondaryLabel}</span> : null}
            </div> : null}
          </div>
        </> : null}
      </div>
    );
  } else if (type === "product_carousel" || type === "product_grid") {
    const campaign = presentation === "flash_sale";
    preview = (
      <div className="p-4" style={{ background, color: foreground }}>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            {section.eyebrow ? <p className="font-mono text-[9px] uppercase tracking-[.14em]" style={{ color: accent }}>{text(section.eyebrow)}</p> : null}
            <h3 className="font-display text-lg font-semibold" style={{ color: titleColor }}>{title}</h3>
            {section.subtitle ? <p className="mt-1 text-xs opacity-80">{text(section.subtitle)}</p> : null}
          </div>
          {isOn(section.seeAll, true) || isOn(section.showViewAll, campaign) ? <span className="text-[11px] font-semibold" style={{ color: accent }}>{text(section.ctaLabel, "See all products")} →</span> : null}
        </div>
        {campaign && isOn(section.showCountdown, true) ? <div className="mt-3 inline-flex items-center gap-2 rounded-md px-2.5 py-1.5 font-mono text-[11px]" style={{ backgroundColor: timerBackground, color: timerForeground }}>
          <Clock3 size={13} />{text(section.countdownLabel, "Ends in")} {countdown(endsAt, now)}
        </div> : null}
        {visibleProducts.length ? <div className={`mt-3 ${layout === "grid" || type === "product_grid" ? "grid" : "flex overflow-x-auto"} gap-2`} style={layout === "grid" || type === "product_grid" ? { gridTemplateColumns: `repeat(${Math.max(1, Math.min(4, Number(section.across) || 2))}, minmax(0, 1fr))` } : undefined}>
          {visibleProducts.map((product) => <div key={product.placement.id} className={layout === "grid" || type === "product_grid" ? "min-w-0" : "w-[44%] shrink-0 sm:w-[32%]"}><ProductCardPreview product={product} section={section} /></div>)}
        </div> : <div className="mt-3 rounded-lg border border-dashed border-current/25 bg-white/60 px-4 py-7 text-center">
          <ShoppingBag size={20} className="mx-auto opacity-60" />
          <p className="mt-2 text-sm font-semibold">No assigned products to preview yet</p>
          <p className="mt-1 text-xs opacity-75">Assign a product in the catalogue. The private draft preview will show its real image, price, label and placement status here.</p>
        </div>}
        <div className="mt-2 flex flex-wrap gap-2 text-[10px] opacity-70">
          <span>{products.length} assigned</span><span>·</span><span>{products.filter((product) => product.publicNow).length} currently eligible for public display</span>
          {presentation !== "standard" && !campaign ? <span>· {presentation.replaceAll("_", " ")} presentation</span> : null}
        </div>
      </div>
    );
  } else if (type === "promo_strip") {
    const iconName = text(section.icon).toLowerCase();
    const PromoIcon = iconName === "truck" ? Truck : iconName === "shield" ? ShieldCheck : iconName === "tag" ? Tag : null;
    preview = <div className="flex flex-wrap items-center justify-center gap-2 px-4 py-3 text-center text-xs font-semibold" style={{ backgroundColor: background, color: foreground, borderColor: accent, borderTopWidth: 1, borderBottomWidth: 1 }}>
      {PromoIcon ? <PromoIcon size={14} aria-hidden="true" /> : null}<span>{text(section.message, "Your message appears here")}</span>{section.ctaLabel ? <span style={{ color: accent }}>{text(section.ctaLabel)} →</span> : null}{isOn(section.dismissible, false) ? <span className="ml-auto grid h-6 w-6 place-items-center rounded-full border border-current/20 text-[10px]" aria-label="Dismissible"><X size={12} /></span> : null}
    </div>;
  } else if (type === "footer") {
    preview = <div className="px-5 py-6 text-center" style={{ backgroundColor: background, color: foreground }}>
      {section.title ? <h3 className="font-display text-lg font-semibold">{text(section.title)}</h3> : null}
      <p className="mt-1 text-xs opacity-80">{text(section.message, "Your footer closing line")}</p>
      {section.ctaLabel ? <span className="mt-3 inline-flex text-xs font-semibold" style={{ color: accent }}>{text(section.ctaLabel)} →</span> : null}
    </div>;
  } else if (type === "category_grid" || type === "brand_carousel" || type === "featured_stores") {
    const nouns: Record<string, string> = { category_grid: "Departments", brand_carousel: "Brands", featured_stores: "Stores" };
    preview = <div className="p-4" style={{ backgroundColor: background, color: foreground }}>
      <div className="flex items-center justify-between gap-2"><h3 className="font-display text-lg font-semibold">{title || nouns[type]}</h3>{isOn(section.seeAll, true) ? <span className="text-[11px] font-semibold" style={{ color: accent }}>{text(section.ctaLabel, type === "featured_stores" ? "All stores" : "See all")} →</span> : null}</div>
      <div className={`mt-3 grid gap-2 ${type === "featured_stores" && text(section.layout) === "rows" ? "grid-cols-1" : "grid-cols-2 sm:grid-cols-3"}`}>
        {Array.from({ length: Math.max(1, Math.min(6, Number(section.limit) || 4)) }, (_, index) => <div key={index} className="grid min-h-[64px] place-items-center rounded-lg border border-current/15 bg-white/70 px-2 py-3 text-center text-xs" style={{ color: foreground }}>{nouns[type]} {index + 1}<span className="block text-[9px] opacity-60">Live manager content</span></div>)}
      </div>
    </div>;
  } else if (type === "promo_slots") {
    preview = <div className="p-4" style={{ backgroundColor: background, color: foreground }}>
      <h3 className="font-display text-lg font-semibold">{title || "Advertisements"}</h3>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">{Array.from({ length: Math.max(1, Math.min(4, Number(section.limit) || 2)) }, (_, index) => <div key={index} className="grid min-h-[70px] place-items-center rounded-lg border border-dashed border-current/25 bg-white/50 text-xs">{text(section.subtitle, "Sponsored placement")} {index + 1}</div>)}</div>
    </div>;
  } else {
    preview = <div className="p-5 text-sm" style={{ backgroundColor: background, color: foreground }}><h3 className="font-display font-semibold">{title}</h3><p className="mt-2 text-xs opacity-75">Product-page section · {type.replaceAll("_", " ")}</p></div>;
  }

  const windowLabel = isScheduled ? "Scheduled" : isClosed ? "Closed" : statusFor(section, now);
  const draftLabel = hasDraft ? "Saved draft preview" : documentStatus === "published" ? "Unsaved private preview" : "Private page preview";

  return (
    <Panel>
      <PanelHead title="Live preview" action={<Pill tone="amber">{draftLabel}</Pill>} />
      <p className="mb-3 text-[11px] leading-relaxed text-chalk-dim">This preview reads your current unsaved settings and real assigned products. It is private to Admin; shoppers see changes only after you publish.</p>
      {error ? <p role="status" className="mb-3 rounded-lg border border-[#e4572e]/35 bg-[#e4572e]/10 p-3 text-xs text-chalk">Assigned-product preview could not load: {error}</p> : null}
      <div className="overflow-hidden rounded-[12px] border border-hairline bg-white">{preview}</div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Pill tone={windowLabel === "Live window" ? "mint" : windowLabel === "Scheduled" ? "amber" : "rose"}>{windowLabel}</Pill>
        <span className="font-mono text-[10px] text-chalk-dim">Section: {formatClock(section.startsAt)} → {formatClock(section.endsAt)}</span>
      </div>
      {type === "product_carousel" || type === "product_grid" ? <div className="mt-2 flex flex-wrap gap-2 text-[10px] text-chalk-dim">
        <span>Layout: {layout}</span><span>·</span><span>{Number(section.across) || 2} across</span><span>·</span><span>Campaign: {presentation.replaceAll("_", " ")}</span>
      </div> : null}
      {products.some((product) => !product.publicNow) ? <details className="mt-3 rounded-lg border border-hairline bg-panel-2 p-3 text-[11px]">
        <summary className="cursor-pointer font-semibold text-chalk">Why some assigned products are not public</summary>
        <ul className="mt-2 grid gap-1 text-chalk-dim">{products.filter((product) => !product.publicNow).map((product) => <li key={product.placement.id}>{product.title}: {product.previewStatus} · product window {formatClock(product.placement.startsAt)} → {formatClock(product.placement.endsAt)}</li>)}</ul>
      </details> : null}
    </Panel>
  );
}

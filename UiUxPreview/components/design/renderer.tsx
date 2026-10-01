"use client";

import type { CSSProperties, ReactNode } from "react";
import {
  Check,
  Minus,
  Plus,
  RotateCcw,
  ShieldCheck,
  Star,
  Store,
  Truck,
} from "lucide-react";
import { COLLECTIONS, REVIEWS } from "@/lib/data";
import { money, num } from "@/lib/format";
import type { DesignNode, Merchant, Product, StoreBrand } from "@/lib/types";
import { isBinding, resolveColor, toCss, type Device } from "@/lib/design/tree";
import { PromoSlider } from "@/components/shop/promo-slider";

const GRID_FONT = "var(--font-archivo)";

type Scope = {
  brand: StoreBrand;
  merchant: Merchant;
  products: Product[];
  device: Device;
  editing: boolean;
  selectedId: string | null;
  onSelect?: (id: string) => void;
  showBindings: boolean;
  cartCount: number;
  interactive: boolean;
  onAddToCart?: (product: Product) => void;
  product?: Product;
  collection?: string;
};

function resolve(value: string | undefined, scope: Scope): string {
  if (!value) return "";
  const match = value.trim().match(/^\{\{(.+?)\}\}$/);
  if (!match) return value;
  const key = match[1].trim();
  const { product, merchant, collection, cartCount } = scope;
  switch (key) {
    case "product.title":
      return product?.title ?? "Product title";
    case "product.price":
      return product ? money(product.price) : "$0.00";
    case "product.compare_at":
      return product?.compareAt ? money(product.compareAt) : "";
    case "product.rating":
      return product ? product.rating.toFixed(1) : "4.8";
    case "product.stock":
      return product
        ? product.stock > product.lowStockAt
          ? "In stock"
          : `${product.stock} left`
        : "In stock";
    case "product.sku":
      return product?.sku ?? "";
    case "product.image":
      return "";
    case "store.name":
      return merchant.name;
    case "store.tagline":
      return merchant.tagline;
    case "store.followers":
      return num(merchant.followers, { compact: true });
    case "collection.name":
      return collection ?? "New arrivals";
    case "cart.count":
      return String(cartCount);
    default:
      return value;
  }
}

function hashHue(seed: string, range = 360) {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) h = (h * 31 + seed.charCodeAt(i)) % 100000;
  return h % range;
}

function Plate({
  scope,
  product,
  index = 0,
  style,
}: {
  scope: Scope;
  product?: Product;
  index?: number;
  style?: CSSProperties;
}) {
  const hue = product
    ? (product.id.split("").reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) % 360, 7) + index * 37) % 360
    : 24;
  return (
    <div
      style={{
        background: `linear-gradient(140deg, hsl(${hue} 26% 90%) 0%, hsl(${(hue + 40) % 360} 30% 80%) 100%)`,
        display: "grid",
        placeItems: "center",
        overflow: "hidden",
        position: "relative",
        ...style,
      }}
    >
      <span
        style={{
          fontFamily: "var(--font-plex)",
          fontSize: 11,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: "rgba(20,17,14,0.45)",
        }}
      >
        {resolve("{{product.image}}", { ...scope, product }) ? "" : (product?.category ?? "catalog")}
      </span>
    </div>
  );
}

function Stars({ value, color = "#e4572e", size = 11 }: { value: number; color?: string; size?: number }) {
  return (
    <span style={{ display: "inline-flex", gap: 1 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          width={size}
          height={size}
          strokeWidth={1.5}
          style={{
            fill: i <= Math.round(value) ? color : "transparent",
            color: i <= Math.round(value) ? color : "rgba(128,128,128,0.4)",
          }}
        />
      ))}
    </span>
  );
}

function BindingChip({ token, visible }: { token: string; visible: boolean }) {
  if (!visible) return null;
  return (
    <span
      style={{
        display: "inline-block",
        fontFamily: "var(--font-plex)",
        fontSize: 9,
        letterSpacing: "0.06em",
        color: "#c9f24d",
        background: "rgba(11,13,17,0.86)",
        padding: "2px 5px",
        borderRadius: 2,
        marginBottom: 4,
        whiteSpace: "nowrap",
      }}
    >
      {token}
    </span>
  );
}

export function DesignRenderer({
  nodes,
  brand,
  merchant,
  products,
  device = "desktop",
  editing = false,
  selectedId = null,
  onSelect,
  showBindings = false,
  cartCount = 0,
  interactive = false,
  onAddToCart,
}: {
  nodes: DesignNode[];
  brand: StoreBrand;
  merchant: Merchant;
  products: Product[];
  device?: Device;
  editing?: boolean;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  showBindings?: boolean;
  cartCount?: number;
  interactive?: boolean;
  onAddToCart?: (product: Product) => void;
}) {
  const scope: Scope = {
    brand,
    merchant,
    products,
    device,
    editing,
    selectedId,
    onSelect,
    showBindings,
    cartCount,
    interactive,
    onAddToCart,
  };

  return (
    <div
      style={{
        fontFamily: GRID_FONT,
        background: brand.canvas,
        color: brand.ink,
        width: "100%",
      }}
    >
      {editing ? (
        <style>{`
          .fxd-node { position: relative; }
          .fxd-node:hover { outline: 1px dashed rgba(201,242,77,0.55); outline-offset: -1px; }
          .fxd-node[data-selected="true"] { outline: 2px solid #c9f24d; outline-offset: -2px; }
          .fxd-label { position: absolute; top: -22px; left: 0; z-index: 20; background: #c9f24d; color: #0b0d11;
            font-family: var(--font-plex); font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase;
            padding: 2px 6px; border-radius: 2px; white-space: nowrap; }
          .fxd-hidden { opacity: 0.28; }
        `}</style>
      ) : null}
      {nodes.map((node) => renderNode(node, scope, 0))}
    </div>
  );
}

function wrap(node: DesignNode, scope: Scope, content: ReactNode, key: string) {
  if (!scope.editing) return <div key={key}>{content}</div>;
  const selected = scope.selectedId === node.id;
  return (
    <div
      key={key}
      data-node-id={node.id}
      data-selected={selected ? "true" : "false"}
      className={`fxd-node${node.hidden ? " fxd-hidden" : ""}`}
      onClick={(event) => {
        event.stopPropagation();
        scope.onSelect?.(node.id);
      }}
    >
      {selected ? <span className="fxd-label">{node.name}</span> : null}
      {content}
    </div>
  );
}

function childrenOf(node: DesignNode, scope: Scope) {
  return (node.children ?? []).map((child) => renderNode(child, scope, 0));
}

function renderNode(node: DesignNode, scope: Scope, index: number): ReactNode {
  const { brand } = scope;
  const style = toCss(node.style, brand, scope.device);
  const merged = node.style.responsive && scope.device !== "desktop"
    ? { ...node.style, ...(node.style.responsive[scope.device] ?? {}) }
    : node.style;
  const headingFont = node.type === "heading" || node.type === "text" ? merged.fontFamily ?? brand.displayFont : merged.fontFamily;
  const base = { ...style, fontFamily: merged.fontFamily ? headingFont : style.fontFamily ?? (node.type === "heading" ? brand.displayFont : GRID_FONT) };
  const key = `${node.id}-${index}`;

  const text = node.tokens?.text ?? "";
  const bindingVisible = scope.showBindings && isBinding(text);

  switch (node.type) {
    case "header":
      return wrap(
        node,
        scope,
        <div style={base}>{childrenOf(node, scope)}</div>,
        key,
      );

    case "nav":
      return wrap(
        node,
        scope,
        <nav
          style={{
            ...base,
            display: "flex",
            flexDirection: "row",
            gap: merged.gap ?? 22,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          {(scope.merchant.nav ?? []).slice(0, 5).map((item) => (
            <span
              key={item}
              style={{
                fontFamily: GRID_FONT,
                fontSize: merged.fontSize ?? 12.5,
                color: resolveColor(merged.color ?? "ink", brand),
                opacity: 0.85,
              }}
            >
              {item}
            </span>
          ))}
        </nav>,
        key,
      );

    case "cart":
      return wrap(
        node,
        scope,
        <span
          style={{
            ...base,
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 10px",
            borderRadius: brand.radius,
            background: resolveColor("accent", brand),
            color: resolveColor("accentInk", brand),
            fontSize: merged.fontSize ?? 12,
            fontFamily: GRID_FONT,
          }}
        >
          Cart \u00b7 {scope.cartCount}
        </span>,
        key,
      );

    case "wishlist":
      return wrap(
        node,
        scope,
        <span
          style={{
            ...base,
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: merged.fontSize ?? 12.5,
            fontFamily: GRID_FONT,
            color: resolveColor(merged.color ?? "muted", brand),
          }}
        >
          Wishlist
        </span>,
        key,
      );

    case "hero": {
      if (node.slides?.length) {
        return wrap(
          node,
          scope,
          <PromoSlider
            heroSlides={node.slides}
            brand={scope.brand}
            accentHue={hashHue(scope.merchant.id, 360)}
            autoplay={!scope.editing}
          />,
          key,
        );
      }
      const media = (node.children ?? []).filter((c) => c.type === "image" || c.type === "video");
      const copy = (node.children ?? []).filter((c) => !media.includes(c));
      const twoColumn = (merged.columns ?? 1) > 1 && media.length > 0;
      const alignment = merged.align === "center" ? "center" : merged.align === "end" ? "flex-end" : "flex-start";
      return wrap(
        node,
        scope,
        <div
          style={{
            ...base,
            display: "grid",
            gridTemplateColumns: twoColumn ? "1.05fr 0.95fr" : "1fr",
            gap: merged.gap ?? 48,
            alignItems: "center",
            justifyItems: twoColumn ? "stretch" : alignment,
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: Math.round((merged.gap ?? 48) * 0.55),
              alignItems: alignment,
              textAlign: merged.textAlign ?? "left",
              minWidth: 0,
            }}
          >
            {copy.map((child, i) => renderNode(child, scope, i))}
          </div>
          {media.length ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%" }}>
              {media.map((child, i) => renderNode(child, scope, i))}
            </div>
          ) : null}
        </div>,
        key,
      );
    }

    case "heading":
    case "paragraph":
    case "text": {
      const Tag = node.type === "heading" ? "h2" : "p";
      const value = resolve(text, scope);
      const lines = String(value).split("\n");
      return wrap(
        node,
        scope,
        <div>
          {bindingVisible ? <BindingChip token={text} visible /> : null}
          <Tag style={{ ...base, margin: 0 }}>
            {lines.map((line, i) => (
              <span key={`${line}-${i}`} style={{ display: "block" }}>
                {line}
              </span>
            ))}
          </Tag>
        </div>,
        key,
      );
    }

    case "button":
      return wrap(
        node,
        scope,
        <span
          style={{
            ...base,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            fontFamily: GRID_FONT,
          }}
        >
          {resolve(text, scope)}
        </span>,
        key,
      );

    case "image":
    case "video":
      return wrap(
        node,
        scope,
        node.type === "video" ? (
          <div
            style={{
              ...base,
              display: "grid",
              placeItems: "center",
              background: "#0b0d11",
              color: "#8b95a6",
              minHeight: 180,
              fontFamily: "var(--font-plex)",
              fontSize: 11,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
            }}
          >
            Product video
          </div>
        ) : (
          <Plate
            scope={scope}
            product={scope.product ?? scope.products[index % Math.max(1, scope.products.length)]}
            index={index}
            style={{ width: merged.width ?? "100%", ...base, minHeight: merged.height ?? 260 }}
          />
        ),
        key,
      );

    case "collection":
      return wrap(
        node,
        scope,
        <div
          style={{
            ...base,
            display: "flex",
            flexDirection: "row",
            flexWrap: "wrap",
            gap: merged.gap ?? 10,
          }}
        >
          {COLLECTIONS.slice(0, 5).map((name) => (
            <span
              key={name}
              style={{
                fontFamily: "var(--font-plex)",
                fontSize: 10.5,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                padding: "8px 12px",
                borderRadius: brand.radius,
                border: `1px solid ${resolveColor("line", brand)}`,
                color: resolveColor(merged.color ?? "ink", brand),
              }}
            >
              {name}
            </span>
          ))}
        </div>,
        key,
      );

    case "productGrid": {
      const columns = merged.columns ?? 4;
      const count = columns * 2;
      const items = scope.products.length
        ? scope.products.slice(0, count)
        : Array.from({ length: count }, () => undefined);
      const cards = (node.children ?? []).filter((c) => c.type === "productCard");
      const template = cards.length ? cards : node.children ?? [];
      return wrap(
        node,
        scope,
        <div style={base}>
          {items.map((product, i) => (
            <div key={`${node.id}-item-${i}`}>
              {template.map((card, ci) =>
                renderNode(card, { ...scope, product }, ci + i * template.length),
              )}
            </div>
          ))}
        </div>,
        key,
      );
    }

    case "productCard": {
      const product = scope.product;
      const titleToken = node.tokens?.title ?? "{{product.title}}";
      const priceToken = node.tokens?.price ?? "{{product.price}}";
      const ratingToken = node.tokens?.rating;
      return wrap(
        node,
        scope,
        <div
          style={{
            ...base,
            display: "flex",
            flexDirection: "column",
            gap: merged.gap ?? 8,
            overflow: "hidden",
          }}
        >
          <Plate
            scope={scope}
            product={product}
            style={{ width: "100%", height: 170, borderRadius: merged.radius ?? brand.radius }}
          />
          {scope.showBindings && isBinding(titleToken) ? (
            <BindingChip token={titleToken} visible />
          ) : null}
          <span
            style={{
              fontFamily: brand.displayFont,
              fontSize: 14,
              fontWeight: 600,
              lineHeight: 1.3,
              color: resolveColor("ink", brand),
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {resolve(titleToken, scope)}
          </span>
          {ratingToken ? (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <Stars value={product?.rating ?? 4.8} />
              <span
                style={{
                  fontFamily: "var(--font-plex)",
                  fontSize: 10.5,
                  color: resolveColor("muted", brand),
                }}
              >
                {resolve(ratingToken, scope)}
              </span>
            </span>
          ) : null}
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                fontFamily: "var(--font-plex)",
                fontSize: 14,
                fontWeight: 600,
                color: resolveColor("ink", brand),
              }}
            >
              {resolve(priceToken, scope)}
            </span>
            {product?.compareAt ? (
              <span
                style={{
                  fontFamily: "var(--font-plex)",
                  fontSize: 11,
                  textDecoration: "line-through",
                  color: resolveColor("muted", brand),
                }}
              >
                {money(product.compareAt)}
              </span>
            ) : null}
          </span>
          <a
            href={scope.interactive ? "/cart" : undefined}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              marginTop: 4,
              padding: "8px 10px",
              borderRadius: merged.radius ?? brand.radius,
              background: resolveColor("accent", brand),
              color: resolveColor("accentInk", brand),
              fontFamily: GRID_FONT,
              fontSize: 12,
              fontWeight: 500,
              cursor: scope.interactive ? "pointer" : "default",
              textDecoration: "none",
            }}
            onClick={
              scope.interactive && product
                ? (event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    scope.onAddToCart?.(product);
                  }
                : undefined
            }
          >
            <Plus width={12} height={12} /> Add to cart
          </a>
        </div>,
        key,
      );
    }

    case "trust":
      return wrap(
        node,
        scope,
        <div style={{ ...base, display: "grid", gridTemplateColumns: `repeat(${merged.columns ?? 4}, minmax(0,1fr))` }}>
          {[
            { icon: Truck, label: "Tracked delivery", detail: "2\u20135 working days" },
            { icon: RotateCcw, label: "30-day returns", detail: "No questions asked" },
            { icon: ShieldCheck, label: "Buyer protection", detail: "Refunded if lost" },
            { icon: Store, label: "Sold by the store", detail: "Support from the seller" },
          ].map((item) => (
            <span
              key={item.label}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                color: resolveColor(merged.color ?? "muted", brand),
              }}
            >
              <item.icon width={16} height={16} strokeWidth={1.5} style={{ marginTop: 1, flexShrink: 0 }} />
              <span>
                <span
                  style={{
                    display: "block",
                    fontFamily: GRID_FONT,
                    fontSize: 12.5,
                    fontWeight: 500,
                    color: resolveColor("ink", brand),
                  }}
                >
                  {item.label}
                </span>
                <span style={{ display: "block", fontFamily: "var(--font-plex)", fontSize: 10.5, opacity: 0.75 }}>
                  {item.detail}
                </span>
              </span>
            </span>
          ))}
        </div>,
        key,
      );

    case "reviews": {
      const rows = scope.products.length
        ? REVIEWS.filter((r) => scope.products.some((p) => p.id === r.productId)).slice(0, 3)
        : REVIEWS.slice(0, 3);
      return wrap(
        node,
        scope,
        <div style={base}>
          {rows.map((review) => (
            <div
              key={review.id}
              style={{
                border: `1px solid ${resolveColor("line", brand)}`,
                borderRadius: brand.radius,
                padding: 18,
                background: resolveColor("surface", brand),
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <Stars value={review.rating} color={resolveColor("accent", brand)} />
              <span
                style={{
                  fontFamily: brand.displayFont,
                  fontSize: 13.5,
                  fontWeight: 600,
                  color: resolveColor("ink", brand),
                }}
              >
                {review.title}
              </span>
              <span
                style={{
                  fontFamily: GRID_FONT,
                  fontSize: 12.5,
                  lineHeight: 1.6,
                  color: resolveColor("muted", brand),
                }}
              >
                {review.body.slice(0, 116)}\u2026
              </span>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  fontFamily: "var(--font-plex)",
                  fontSize: 10.5,
                  color: resolveColor("muted", brand),
                }}
              >
                {review.verified ? <Check width={11} height={11} /> : <Minus width={11} height={11} />}
                {review.author}
              </span>
            </div>
          ))}
        </div>,
        key,
      );
    }

    case "section":
    case "container":
    case "banner":
    case "promo":
    case "footer":
      return wrap(
        node,
        scope,
        <div style={base}>{childrenOf(node, scope)}</div>,
        key,
      );

    case "productInfo":
      return wrap(
        node,
        scope,
        <div style={{ ...base, display: "flex", flexDirection: "column", gap: 10 }}>
          <span style={{ fontFamily: brand.displayFont, fontSize: 22, fontWeight: 700, color: resolveColor("ink", brand) }}>
            {resolve("{{product.title}}", scope)}
          </span>
          <Stars value={scope.product?.rating ?? 4.8} color={resolveColor("accent", brand)} size={13} />
          <span style={{ fontFamily: "var(--font-plex)", fontSize: 20, fontWeight: 600, color: resolveColor("ink", brand) }}>
            {resolve("{{product.price}}", scope)}
          </span>
          <span style={{ fontFamily: GRID_FONT, fontSize: 13.5, lineHeight: 1.7, color: resolveColor("muted", brand) }}>
            {scope.product?.description ?? ""}
          </span>
        </div>,
        key,
      );

    default:
      return null;
  }
}

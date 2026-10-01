// Ferixas Commerce — prototype domain model.
// Frontend-only: every record below is mock data held in local state.

export type Channel = "store" | "marketplace";
export type SalesChannels = { store: boolean; marketplace: boolean };

export type ProductStatus = "active" | "draft" | "archived";
export type MerchantStatus = "active" | "review" | "suspended";
export type PaymentStatus = "paid" | "pending" | "refunded" | "failed";
export type FulfillmentStatus =
  | "unfulfilled"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled";

export type StoreBrand = {
  template: string;
  canvas: string;
  surface: string;
  ink: string;
  muted: string;
  accent: string;
  accentInk: string;
  displayFont: string;
  radius: number;
  hero: "split" | "centered" | "banner";
};

export type StorePage = {
  id: string;
  name: string;
  slug: string;
  visible: boolean;
  system: boolean;
};

export type Merchant = {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  about: string;
  domain: string;
  customDomain: string | null;
  plan: "Starter" | "Growth" | "Scale" | "Platform";
  status: MerchantStatus;
  verified: boolean;
  location: string;
  since: string;
  rating: number;
  reviewCount: number;
  followers: number;
  commissionPct: number;
  balance: number;
  pendingPayout: number;
  marketplaceEnabled: boolean;
  brand: StoreBrand;
  responseRate: number;
  fulfilmentRate: number;
  /** Storefront structure — owned by the Store pages, not the Design Engine. */
  nav?: string[];
  pages?: StorePage[];
  visibility?: "public" | "unlisted" | "password";
  storePassword?: string | null;
  seoHidden?: boolean;
};

export type Category = {
  slug: string;
  name: string;
  glyph: string;
  blurb: string;
};

export type Variant = { name: string; values: string[] };

export type Product = {
  id: string;
  slug: string;
  title: string;
  merchantId: string;
  category: string;
  collections: string[];
  description: string;
  bullets: string[];
  price: number;
  compareAt: number | null;
  cost: number;
  sku: string;
  stock: number;
  lowStockAt: number;
  rating: number;
  reviewCount: number;
  variants: Variant[];
  plates: number;
  status: ProductStatus;
  channels: SalesChannels;
  seo: { title: string; description: string; handle: string };
  tags: string[];
  createdAt: string;
  sold30d: number;
  views30d: number;
};

export type Address = {
  name: string;
  line1: string;
  city: string;
  region: string;
  country: string;
  postcode: string;
};

export type OrderItem = {
  productId: string;
  title: string;
  variant: string | null;
  qty: number;
  price: number;
  merchantId: string;
};

export type Order = {
  id: string;
  number: string;
  customerId: string;
  placedAt: string;
  channel: Channel;
  merchantIds: string[];
  items: OrderItem[];
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  commission: number;
  payment: PaymentStatus;
  fulfillment: FulfillmentStatus;
  carrier: string | null;
  tracking: string | null;
  address: Address;
  note: string | null;
};

export type Customer = {
  id: string;
  name: string;
  email: string;
  phone: string;
  location: string;
  since: string;
  segment: "new" | "returning" | "vip";
  orderCount: number;
  spent: number;
  lastOrderAt: string;
};

export type Review = {
  id: string;
  productId: string;
  author: string;
  rating: number;
  title: string;
  body: string;
  date: string;
  helpful: number;
  verified: boolean;
};

export type Payout = {
  id: string;
  period: string;
  amount: number;
  commission: number;
  status: "paid" | "in transit" | "pending" | "on hold";
  date: string;
  method: string;
};

export type Dispute = {
  id: string;
  orderId: string;
  merchantId: string;
  customerName: string;
  reason: string;
  amount: number;
  status: "open" | "under review" | "resolved" | "escalated";
  openedAt: string;
};

export type Promotion = {
  id: string;
  name: string;
  type: "percentage" | "fixed" | "free shipping" | "bundle";
  value: string;
  scope: "store" | "product" | "collection" | "marketplace";
  status: "scheduled" | "active" | "ended" | "draft";
  uses: number;
  revenue: number;
  startsAt: string;
  endsAt: string;
};

export type SeriesPoint = { label: string; date: string; revenue: number; orders: number; visitors: number };

// ── Design Engine ────────────────────────────────────────────────────

export type NodeType =
  | "section"
  | "container"
  | "header"
  | "nav"
  | "hero"
  | "heading"
  | "paragraph"
  | "text"
  | "image"
  | "video"
  | "button"
  | "productGrid"
  | "productCard"
  | "collection"
  | "banner"
  | "promo"
  | "reviews"
  | "trust"
  | "cart"
  | "wishlist"
  | "productInfo"
  | "footer";

export type NodeStyle = {
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: number;
  lineHeight?: number;
  letterSpacing?: number;
  textAlign?: "left" | "center" | "right";
  color?: string;
  width?: string;
  height?: string;
  marginX?: number;
  marginY?: number;
  paddingX?: number;
  paddingY?: number;
  gap?: number;
  align?: "start" | "center" | "end" | "stretch";
  justify?: "start" | "center" | "between" | "end";
  display?: "block" | "flex" | "grid";
  direction?: "row" | "column";
  columns?: number;
  background?: string;
  borderWidth?: number;
  borderColor?: string;
  radius?: number;
  shadow?: 0 | 1 | 2 | 3;
  opacity?: number;
  responsive?: Partial<Record<"tablet" | "mobile", Partial<NodeStyle>>>;
};

// ── Promotional banners ──────────────────────────────────────────────

export type BannerKind = "image" | "video";

export type OverlayAlign = "left" | "center" | "right";
export type OverlayVertical = "top" | "middle" | "bottom";

export type OverlayTone = "light" | "dark";

/**
 * How the copy sits on top of a banner. The media always fills the whole banner
 * edge to edge; this controls the overlaid text and buttons.
 */
export type BannerOverlay = {
  enabled: boolean;
  align: OverlayAlign;
  vertical: OverlayVertical;
  /** Strength of the readability scrim, 0-100. */
  scrim: number;
  tone: OverlayTone;
  /** Maximum width of the text column, in characters. */
  width: number;
};

/** A promotional banner slide. Marketplace banners are platform-managed. */
export type Banner = {
  id: string;
  kind: BannerKind;
  eyebrow: string;
  headline: string;
  body: string;
  ctaLabel: string;
  ctaHref: string;
  secondaryLabel: string;
  secondaryHref: string;
  accent: string;
  hue: number;
  /** Object URL from an uploaded file, or null to use generated artwork. */
  mediaUrl: string | null;
  posterNote: string;
  /** Milliseconds this slide stays up. */
  duration: number;
  active: boolean;
  order: number;
  audience: string;
  startsAt: string;
  endsAt: string;
  impressions: number;
  clicks: number;
  overlay: BannerOverlay;
};

/** A banner slide inside a merchant's storefront hero. */
export type HeroSlide = {
  id: string;
  kind: BannerKind;
  headline: string;
  body: string;
  ctaLabel: string;
  ctaHref: string;
  mediaUrl: string | null;
  duration: number;
  overlay?: BannerOverlay;
};

export type DesignNode = {
  id: string;
  type: NodeType;
  name: string;
  locked?: boolean;
  hidden?: boolean;
  style: NodeStyle;
  /** Commerce bindings — e.g. "{{product.title}}" */
  tokens?: Record<string, string>;
  /** Present on hero nodes to turn the hero into a promotional banner slider. */
  slides?: HeroSlide[];
  children?: DesignNode[];
};

export type DesignVersion = {
  id: string;
  label: string;
  createdAt: string;
  author: string;
  source: "manual" | "ai" | "system";
  nodes: DesignNode[];
};

export type DesignDoc = {
  merchantId: string;
  template: string;
  nodes: DesignNode[];
  versions: DesignVersion[];
  publishedVersionId: string | null;
  dirty: boolean;
};

export type AiProposal = {
  id: string;
  prompt: string;
  summary: string;
  reasoning: string;
  changes: { nodeId: string; nodeName: string; field: string; from: string; to: string }[];
  patch: { nodeId: string; style?: Partial<NodeStyle>; tokens?: Record<string, string>; move?: -1 | 1 }[];
  status: "draft" | "applied" | "cancelled";
  createdAt: string;
};

export type AiMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  proposalId?: string;
  createdAt: string;
};

export type CartLine = {
  key: string;
  productId: string;
  merchantId: string;
  variant: string | null;
  qty: number;
};

export type AdminSection = {
  slug: string;
  name: string;
  group: string;
  glyph: string;
};

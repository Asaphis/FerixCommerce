/**
 * The seller app's only door to the outside world.
 *
 * Every screen and every action goes through here. Point FERIX_API_BASE at
 * the live commerce backend and the whole app follows. Local development uses
 * the real FastAPI service on port 8000 rather than the retired mock runtime.
 */

const KEY = process.env.CODEWORDS_API_KEY ?? "";

// Falls back to the local FastAPI service so a fresh clone installs, builds and
// renders without any environment setup. Point FERIX_API_BASE at the deployed
// API in production.
export const apiBase =
  process.env.FERIX_API_BASE ?? process.env.NEXT_PUBLIC_FERIX_API_BASE ?? "http://127.0.0.1:8000";

export type Brand = {
  template: string;
  canvas: string;
  surface: string;
  ink: string;
  muted: string;
  accent: string;
  accentInk: string;
  displayFont: string;
  radius: number;
  hero: string;
};

export type Merchant = {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  location: string;
  rating: number;
  reviewCount: number;
  followers: number;
  verified: boolean;
  commissionPct: number;
  brand: Brand;
  domain: string;
  customDomain: string | null;
  plan: string;
  since: string;
  productCount?: number;
};

export type Variant = { name: string; values: string[] };

export type Channels = { store: boolean; marketplace: boolean };

export type Product = {
  id: string;
  slug: string;
  title: string;
  category: string;
  description: string;
  bullets: string[];
  price: number;
  compareAt: number | null;
  discount: number | null;
  sku: string;
  stock: number;
  lowStockAt: number;
  rating: number;
  reviewCount: number;
  variants: Variant[];
  status: "active" | "draft" | "archived";
  channels: Channels;
  tags: string[];
  createdAt: string;
  sold30d: number;
  views30d: number;
};

export type Summary = {
  revenueTotal: number;
  revenueToday: number;
  revenue7d: number;
  revenue30d: number;
  ordersTotal: number;
  orders30d: number;
  commission30d: number;
  averageOrder: number;
};

export type OrderItem = {
  productId: string;
  title: string;
  variant: string | null;
  qty: number;
  price: number;
  merchantId: string;
  merchantName: string;
};

export type Customer = {
  id: string;
  name: string;
  email: string;
  phone: string;
  location: string;
  since?: string;
  orders?: number;
  spent?: number;
  averageOrder?: number;
  segment?: "new" | "returning" | "vip";
  lastOrderAt?: string;
};

export type Address = {
  label: string;
  name: string;
  phone: string;
  line1: string;
  line2: string | null;
  city: string;
  region: string;
  postcode: string;
  country: string;
};

export type Order = {
  id: string;
  number: string;
  placedAt: string;
  channel: "store" | "marketplace";
  customer: Customer;
  items: OrderItem[];
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  commission: number;
  payment: string;
  fulfillment: "processing" | "shipped" | "delivered" | "cancelled";
  carrier: string | null;
  tracking: string | null;
  address: Address;
  note: string | null;
};

export type Activity = { id: string; label: string; detail: string; at: string; tone: string };

export type Settings = {
  name: string;
  tagline: string;
  about: string;
  location: string;
  customDomain: string;
  marketplaceEnabled: boolean;
  accent: string;
  template: string;
  lowStockAt: number;
  autoFulfil: boolean;
  orderEmails: boolean;
  payoutCadence: string;
};

export type Dashboard = {
  merchant: Merchant;
  settings: Settings;
  summary: Summary;
  statuses: Record<string, number>;
  counts: {
    products: number;
    published: number;
    drafts: number;
    lowStock: number;
    customers: number;
    marketplaceOrders: number;
    storeOrders: number;
  };
  traffic: {
    storeVisitors: number;
    marketplaceImpressions: number;
    conversionStore: number;
    conversionMarketplace: number;
    sold30d: number;
  };
  lowStock: { id: string; title: string; sku: string; stock: number; slug: string }[];
  recentOrders: Order[];
  activity: Activity[];
};

export type ProductList = {
  items: Product[];
  total: number;
  counts: { all: number; active: number; draft: number; archived: number; lowStock: number };
  categories: string[];
  lowStockAt: number;
};

export type ProductDetail = {
  product: Product;
  stock: number;
  sold: number;
  lowStockAt: number;
  categories: string[];
};

export type InventoryRow = {
  id: string;
  slug: string;
  title: string;
  sku: string;
  stock: number;
  reserved: number;
  available: number;
  sold30d: number;
  status: string;
  channels: Channels;
  category: string;
  state: "ok" | "low" | "out";
};

export type Inventory = {
  rows: InventoryRow[];
  lowStockAt: number;
  totals: { skus: number; units: number; reserved: number; low: number; out: number; value: number };
};

export type OrderList = {
  orders: Order[];
  total: number;
  counts: Record<string, number>;
  revenue: number;
  awaiting: number;
};

export type CustomerList = {
  customers: Customer[];
  total: number;
  segments: Record<string, number>;
  lifetime: number;
};

export type Analytics = {
  merchant: Merchant;
  series: { date: string; revenue: number; orders: number; visitors: number }[];
  summary: Summary;
  byChannel: { store: number; marketplace: number };
  topProducts: { id: string; slug: string; title: string; sold30d: number; views30d: number; price: number; revenue: number; conversion: number }[];
  byCategory: { category: string; name: string; revenue: number }[];
  customers: { buyers: number; repeat: number; repeatRate: number };
};

export type Payout = {
  id: string;
  period: string;
  orders: number;
  gross: number;
  commission: number;
  net: number;
  status: string;
  date: string;
  method: string;
};

export type Payouts = {
  payouts: Payout[];
  balance: number;
  pending: number;
  paidToDate: number;
  commissionPct: number;
  cadence: string;
  method: string;
};

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

type Params = Record<string, string | number | boolean | undefined | null>;

async function call<T>(
  method: string,
  path: string,
  opts: { params?: Params; body?: Record<string, unknown>; session?: string | null } = {},
): Promise<T> {
  const url = new URL(`${apiBase}/${path}`);
  for (const [key, value] of Object.entries(opts.params ?? {})) {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
  }
  // The backend does not receive custom headers through the runtime proxy, so
  // the merchant session travels inside the request itself.
  const payload: Record<string, unknown> = { ...(opts.body ?? {}) };
  if (opts.session) {
    payload.session = opts.session;
    if (method === "GET") url.searchParams.set("session", opts.session);
  }

  const response = await fetch(url.toString(), {
    method,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${KEY}` },
    body: method === "GET" ? undefined : JSON.stringify(payload),
    cache: "no-store",
  });

  if (!response.ok) {
    let detail = `Request failed (${response.status})`;
    try {
      const parsed = (await response.json()) as { detail?: string };
      if (parsed?.detail) detail = parsed.detail;
    } catch {
      // keep the status message
    }
    throw new ApiError(response.status, detail);
  }
  return (await response.json()) as T;
}

// ── Session ────────────────────────────────────────────────────────────

export const merchantLogin = (body: { email: string; password: string }) =>
  call<{ token: string; merchant: Merchant }>("POST", "merchant/login", { body });

export const merchantLogout = (session: string | null) =>
  call<{ ok: boolean }>("POST", "merchant/logout", { session });

export const merchantMe = (session: string | null) =>
  call<{ merchant: Merchant | null }>("GET", "merchant/me", { session });

// ── Workspace ──────────────────────────────────────────────────────────

export const getDashboard = (session: string | null) =>
  call<Dashboard>("GET", "merchant/dashboard", { session });

export const listProducts = (session: string | null, params: Params = {}) =>
  call<ProductList>("GET", "merchant/products", { params, session });

export const getProduct = (session: string | null, slug: string) =>
  call<ProductDetail>("GET", "merchant/product", { params: { slug }, session });

export const createProduct = (
  session: string | null,
  body: {
    title: string;
    category: string;
    price: number;
    compareAt?: number | null;
    stock: number;
    status: string;
    store: boolean;
    marketplace: boolean;
    description?: string | null;
  },
) => call<{ product: Product }>("POST", "merchant/product", { body: body as unknown as Record<string, unknown>, session });

export const updateProduct = (session: string | null, body: Record<string, unknown>) =>
  call<{ product: Product }>("PATCH", "merchant/product", { body, session });

export const deleteProduct = (session: string | null, id: string) =>
  call<{ removed: string; remaining: number }>("DELETE", "merchant/product", { body: { id }, session });

export const getInventory = (session: string | null) => call<Inventory>("GET", "merchant/inventory", { session });

export const adjustStock = (session: string | null, body: { id: string; delta: number; reason: string }) =>
  call<{ stock: number; log: { id: string; title: string; delta: number; stock: number; reason: string; at: string }[] }>(
    "POST",
    "merchant/inventory/adjust",
    { body, session },
  );

export const listOrders = (session: string | null, params: Params = {}) =>
  call<OrderList>("GET", "merchant/orders", { params, session });

export const getOrder = (session: string | null, id: string) =>
  call<{ order: Order; carriers: string[] }>("GET", "merchant/order", { params: { id }, session });

export const setOrderStatus = (
  session: string | null,
  body: { id: string; fulfillment: string; carrier?: string | null; tracking?: string | null },
) => call<{ order: Order }>("POST", "merchant/orders/status", { body, session });

export const listCustomers = (session: string | null, params: Params = {}) =>
  call<CustomerList>("GET", "merchant/customers", { params, session });

export const getCustomer = (session: string | null, id: string) =>
  call<{ customer: Customer; orders: Order[]; address: Address }>("GET", "merchant/customer", {
    params: { id },
    session,
  });

export const getAnalytics = (session: string | null, days = 30) =>
  call<Analytics>("GET", "merchant/analytics", { params: { days }, session });

export const getPayouts = (session: string | null) => call<Payouts>("GET", "merchant/payouts", { session });

export const getSettings = (session: string | null) =>
  call<{ settings: Settings; merchant: Merchant; email: string; plan: string; templates: string[]; domain: string }>(
    "GET",
    "merchant/settings",
    { session },
  );

export const updateSettings = (session: string | null, body: Record<string, unknown>) =>
  call<{ settings: Settings }>("PATCH", "merchant/settings", { body, session });

// ── Storefront (Store Design) ──────────────────────────────────────────

export type StorefrontSection = {
  id: string;
  type: string;
  title?: string;
  subtitle?: string;
  position: number;
  visible: boolean;
};

export type StorefrontDocument = {
  id: string;
  ownerType: string;
  ownerId: string;
  documentType: string;
  title: string;
  status: string;
  data: {
    theme?: Record<string, unknown>;
    navigation?: { label: string; href: string }[];
    sections?: StorefrontSection[];
    pages?: { slug: string; title: string; body: string }[];
  };
  updatedAt: string;
  updatedBy: string;
  designEngine: string;
};

export const getStorefront = (session: string | null) =>
  call<{ document: StorefrontDocument; designEngine: string; message: string }>("GET", "merchant/storefront", {
    session,
  });

export const saveStorefront = (session: string | null, body: Record<string, unknown>) =>
  call<{ document: StorefrontDocument }>("PATCH", "merchant/storefront", { body, session });

export const publishStorefront = (session: string | null) =>
  call<{ document: StorefrontDocument }>("POST", "merchant/storefront/publish", { session });

// ── Media library ──────────────────────────────────────────────────────

export type MerchantMedia = {
  id: string;
  kind: string;
  url: string;
  alt: string;
  folder: string;
  createdAt: string;
};

export const listMedia = (session: string | null) =>
  call<{ assets: MerchantMedia[]; storage: string }>("GET", "merchant/media", { session });

export const addMedia = (session: string | null, body: Record<string, unknown>) =>
  call<{ asset: MerchantMedia }>("POST", "merchant/media", { body, session });

export async function uploadMedia(session: string, file: File, metadata: { kind: string; alt: string; folder: string }) {
  const url = new URL(`${apiBase}/merchant/media/upload`);
  url.searchParams.set("session", session);
  const form = new FormData();
  form.append("file", file);
  form.append("kind", metadata.kind);
  form.append("alt", metadata.alt);
  form.append("folder", metadata.folder);
  const response = await fetch(url, { method: "POST", headers: { Authorization: `Bearer ${KEY}` }, body: form, cache: "no-store" });
  if (!response.ok) {
    let detail = `Request failed (${response.status})`;
    try { detail = ((await response.json()) as { detail?: string }).detail ?? detail; } catch {}
    throw new ApiError(response.status, detail);
  }
  return (await response.json()) as { asset: MerchantMedia; storage: string };
}

export const removeMedia = (session: string | null, id: string) =>
  call<{ removed: string }>("DELETE", "merchant/media", { body: { id }, session });

// ── Promotions ─────────────────────────────────────────────────────────

export type MerchantSaleItem = {
  id: string;
  productId: string;
  salePrice: number;
  quantityLimit: number;
  soldQuantity: number;
  title: string;
};

export type MerchantSale = {
  id: string;
  name: string;
  headline: string;
  bannerUrl: string;
  startsAt: string;
  endsAt: string;
  status: string;
  items: MerchantSaleItem[];
};

export const listPromotions = (session: string | null) =>
  call<{ sales: MerchantSale[]; products: { id: string; title: string; price: number; slug: string }[] }>(
    "GET",
    "merchant/promotions",
    { session },
  );

export const createPromotion = (session: string | null, body: Record<string, unknown>) =>
  call<{ sale: { id: string; name: string; status: string } }>("POST", "merchant/promotions", { body, session });

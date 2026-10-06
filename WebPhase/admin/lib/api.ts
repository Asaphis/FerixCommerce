/**
 * The admin console's only door to the outside world.
 *
 * Every screen and every action goes through here. Point FERIX_API_BASE at
 * the live commerce backend and the console follows. Local development uses
 * the real FastAPI service on port 8000 rather than the retired mock runtime.
 */

const KEY = process.env.CODEWORDS_API_KEY ?? "";

export const apiBase = process.env.FERIX_API_BASE ?? process.env.NEXT_PUBLIC_FERIX_API_BASE ?? "";

export type Admin = { email: string; platformName: string };

export type Settings = {
  platformName: string;
  supportEmail: string;
  defaultCommissionPct: number;
  currency: string;
  marketplaceEnabled: boolean;
  newMerchantsNeedReview: boolean;
  payoutCadence: string;
  taxRatePct: number;
  freeShippingOver: number;
};

export type Totals = {
  gmv: number;
  commission: number;
  merchantNet: number;
  orders: number;
  averageOrder: number;
  deliveredRate: number;
  merchants: number;
  activeMerchants: number;
  reviewMerchants: number;
  suspendedMerchants: number;
  products: number;
  marketplaceListings: number;
  soldUnits: number;
};

export type Brand = {
  template: string;
  canvas: string;
  surface: string;
  ink: string;
  muted: string;
  accent: string;
  accentInk: string;
};

export type MerchantRow = {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  location: string;
  rating: number;
  reviewCount: number;
  followers: number;
  verified: boolean;
  brand: Brand;
  domain: string;
  customDomain: string | null;
  plan: string;
  since: string;
  status: "active" | "review" | "suspended";
  commissionPct: number;
  productCount: number;
  marketplaceListings: number;
  gmv: number;
  commission: number;
  orders: number;
  template?: string;
};

export type OrderRow = {
  id: string;
  number: string;
  placedAt: string;
  channel: "store" | "marketplace";
  customer: { id: string; name: string; email: string; phone: string; location: string };
  items: { productId: string; title: string; qty: number; price: number; variant: string | null }[];
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  commission: number;
  payment: string;
  fulfillment: "processing" | "shipped" | "delivered" | "cancelled";
  carrier: string | null;
  tracking: string | null;
  merchantId: string;
  merchantName: string;
  merchantSlug: string;
};

export type MerchantDetail = {
  merchant: MerchantRow & {
    responseRate: number;
    fulfilmentRate: number;
    marketplaceEnabled: boolean;
  };
  about: string;
  summary: {
    revenueTotal: number;
    revenue30d: number;
    ordersTotal: number;
    commission30d: number;
    averageOrder: number;
  };
  statuses: Record<string, number>;
  catalog: {
    id: string;
    slug: string;
    title: string;
    sku: string;
    price: number;
    stock: number;
    status: string;
    category: string;
    channels: { store: boolean; marketplace: boolean };
    sold30d: number;
  }[];
  orders: OrderRow[];
  commissionEarned: number;
};

export type UserRow = {
  id: string;
  name: string;
  email: string;
  phone: string;
  initials: string;
  createdAt: string;
  location: string;
  orders: number;
  spent: number;
  averageOrder: number;
  addresses: number;
  reviews: number;
  saved: number;
  segment: "new" | "returning" | "vip";
  lastOrderAt: string | null;
};

export type UserDetail = {
  user: {
    id: string;
    name: string;
    email: string;
    phone: string;
    initials: string;
    createdAt: string;
    settings: Record<string, unknown>;
  };
  orders: OrderRow[];
  addresses: { id: string; label: string; name: string; line1: string; city: string; country: string; isDefault: boolean }[];
  reviews: { id: string; productId: string; rating: number; title: string; body: string; date: string }[];
  wishlist: { id: string; slug: string; title: string; price: number; merchantName: string }[];
  follows: string[];
  stats: {
    orders: number;
    spent: number;
    averageOrder: number;
    addresses: number;
    reviews: number;
    saved: number;
    follows: number;
  };
};

export type Overview = {
  settings: Settings;
  totals: Totals;
  windows: Record<"today" | "week" | "month", { gmv: number; commission: number; orders: number }>;
  channels: { store: number; marketplace: number };
  statuses: Record<string, number>;
  topMerchants: { id: string; name: string; slug: string; gmv: number; orders: number }[];
  needsAttention: MerchantRow[];
  recentOrders: OrderRow[];
  registeredUsers: number;
};

export type MerchantList = {
  merchants: MerchantRow[];
  total: number;
  counts: Record<string, number>;
  plans: string[];
};

export type UserList = {
  users: UserRow[];
  total: number;
  counts: Record<string, number>;
  lifetime: number;
  orders: number;
};

export type OrderList = {
  orders: OrderRow[];
  total: number;
  counts: Record<string, number>;
  gmv: number;
  commission: number;
  merchants: { id: string; name: string }[];
};

export type Analytics = {
  series: { date: string; gmv: number; commission: number; orders: number }[];
  totals: Totals;
  byMerchant: { id: string; name: string; slug: string; gmv: number; commission: number; orders: number }[];
  byChannel: { store: number; marketplace: number };
  byCategory: { category: string; name: string; revenue: number }[];
  topProducts: {
    id: string;
    slug: string;
    title: string;
    merchantName: string;
    sold30d: number;
    price: number;
    revenue: number;
  }[];
  plans: { plan: string; merchants: number }[];
};

export type SettingsPayload = {
  settings: Settings;
  admin: { email: string };
  admins: string[];
  counts: { merchants: number; categories: number; collections: number; products: number };
  defaults: Settings;
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
  // The backend does not receive custom headers through the runtime proxy, so the
  // operator session travels inside the request itself.
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

export const adminLogin = (body: { email: string; password: string }) =>
  call<{ token: string; admin: Admin }>("POST", "admin/login", { body });

export const adminLogout = (session: string | null) => call<{ ok: boolean }>("POST", "admin/logout", { session });

export const adminMe = (session: string | null) => call<{ admin: Admin | null }>("GET", "admin/me", { session });

// ── Console ────────────────────────────────────────────────────────────

export const getOverview = (session: string | null) => call<Overview>("GET", "admin/overview", { session });

export const listMerchants = (session: string | null, params: Params = {}) =>
  call<MerchantList>("GET", "admin/merchants", { params, session });

export const getMerchant = (session: string | null, id: string) =>
  call<MerchantDetail>("GET", "admin/merchant", { params: { id }, session });

export const updateMerchant = (session: string | null, body: Record<string, unknown>) =>
  call<{ merchant: MerchantRow }>("PATCH", "admin/merchant", { body, session });

export const listUsers = (session: string | null, params: Params = {}) =>
  call<UserList>("GET", "admin/users", { params, session });

export const getUser = (session: string | null, id: string) =>
  call<UserDetail>("GET", "admin/user", { params: { id }, session });

export const listOrders = (session: string | null, params: Params = {}) =>
  call<OrderList>("GET", "admin/orders", { params, session });

export const getAnalytics = (session: string | null, days = 30) =>
  call<Analytics>("GET", "admin/analytics", { params: { days }, session });

export const getSettings = (session: string | null) => call<SettingsPayload>("GET", "admin/settings", { session });

export const updateSettings = (session: string | null, body: Record<string, unknown>) =>
  call<{ settings: Settings }>("PATCH", "admin/settings", { body, session });

// ── Catalogue ──────────────────────────────────────────────────────────

export type CatalogRow = {
  id: string;
  slug: string;
  title: string;
  sku: string;
  price: number;
  compareAt: number | null;
  stock: number;
  status: string;
  category: string;
  merchantId: string;
  merchantName: string;
  image: string;
  channels: { store: boolean; marketplace: boolean };
  featured: boolean;
  collections: string[];
  sold30d: number;
  updatedAt: string;
};

export type CatalogList = {
  products: CatalogRow[];
  total: number;
  counts: Record<string, number>;
  categories: string[];
  collections: { slug: string; name: string }[];
};

export const listCatalog = (session: string | null, params: Params = {}) =>
  call<CatalogList>("GET", "admin/catalog/products", { params, session });

export const createCatalogProduct = (session: string | null, body: Record<string, unknown>) =>
  call<{ product: Record<string, unknown> }>("POST", "admin/catalog/product", { body, session });

export const updateCatalogProduct = (session: string | null, body: Record<string, unknown>) =>
  call<{ product: Record<string, unknown> }>("PATCH", "admin/catalog/product", { body, session });

export const deleteCatalogProduct = (session: string | null, id: string) =>
  call<{ removed: string }>("DELETE", "admin/catalog/product", { body: { id }, session });

// ── Categories and collections ─────────────────────────────────────────

export type AdminCategory = {
  id: string;
  slug: string;
  name: string;
  blurb: string;
  glyph: string;
  image: string;
  count: number;
  showInNav: boolean;
  showAsTile: boolean;
  showAsText: boolean;
  visible: boolean;
  position: number;
};

export type AdminCollection = {
  id: string;
  slug: string;
  name: string;
  blurb: string;
  image: string;
  count: number;
  visible: boolean;
  position: number;
};

export const listCategories = (session: string | null) =>
  call<{ categories: AdminCategory[] }>("GET", "admin/catalog/categories", { session });

export const saveCategory = (session: string | null, body: Record<string, unknown>) =>
  call<{ category: AdminCategory }>("POST", "admin/catalog/category", { body, session });

export const deleteCategory = (session: string | null, slug: string) =>
  call<{ removed: string }>("DELETE", "admin/catalog/category", { body: { slug }, session });

export const listCollections = (session: string | null) =>
  call<{ collections: AdminCollection[] }>("GET", "admin/catalog/collections", { session });

export const saveCollection = (session: string | null, body: Record<string, unknown>) =>
  call<{ collection: AdminCollection }>("POST", "admin/catalog/collection", { body, session });

export const deleteCollection = (session: string | null, slug: string) =>
  call<{ removed: string }>("DELETE", "admin/catalog/collection", { body: { slug }, session });

// ── CMS: banners ───────────────────────────────────────────────────────

export type Banner = {
  id: string;
  kind: string;
  eyebrow: string;
  headline: string;
  body: string;
  ctaLabel: string;
  ctaHref: string;
  secondaryLabel: string | null;
  secondaryHref: string | null;
  mediaUrl: string;
  image: string;
  videoUrl: string | null;
  accent: string;
  audience: string;
  active: boolean;
  position: number;
  status: string;
};

export const listBanners = (session: string | null) =>
  call<{ banners: Banner[] }>("GET", "admin/cms/banners", { session });

export const saveBanner = (session: string | null, body: Record<string, unknown>) =>
  call<{ banner: Banner }>("POST", "admin/cms/banner", { body, session });

export const deleteBanner = (session: string | null, id: string) =>
  call<{ removed: string }>("DELETE", "admin/cms/banner", { body: { id }, session });

// ── CMS: documents ─────────────────────────────────────────────────────

export type ContentSection = {
  id: string;
  type: string;
  title?: string;
  subtitle?: string;
  ctaLabel?: string;
  ctaHref?: string;
  position: number;
  visible: boolean;
};

export type ContentDocument = {
  id: string;
  ownerType: string;
  ownerId: string;
  documentType: string;
  title: string;
  status: string;
  data: { sections?: ContentSection[]; [key: string]: unknown };
  updatedAt: string;
  updatedBy: string;
};

export type ContentVersion = {
  id: string;
  version: number;
  status: string;
  note: string;
  createdBy: string;
  createdAt: string;
};

export const listDocuments = (session: string | null) =>
  call<{ documents: ContentDocument[] }>("GET", "admin/cms/documents", { session });

export const getDocument = (session: string | null, id: string) =>
  call<{ document: ContentDocument; versions: ContentVersion[] }>("GET", "admin/cms/document", {
    params: { id },
    session,
  });

export const saveDocument = (session: string | null, body: Record<string, unknown>) =>
  call<{ document: ContentDocument }>("PATCH", "admin/cms/document", { body, session });

export const publishDocument = (session: string | null, id: string) =>
  call<{ document: ContentDocument }>("POST", "admin/cms/document/publish", { body: { id }, session });

export const restoreDocumentVersion = (session: string | null, versionId: string) =>
  call<{ document: ContentDocument }>("POST", "admin/cms/document/restore", { body: { versionId }, session });

// ── Media library ──────────────────────────────────────────────────────

export type MediaAsset = {
  id: string;
  kind: string;
  url: string;
  alt: string;
  folder: string;
  width: number;
  height: number;
  createdAt: string;
};

export const listMedia = (session: string | null) =>
  call<{ assets: MediaAsset[]; storage: string }>("GET", "admin/media", { session });

export const addMedia = (session: string | null, body: Record<string, unknown>) =>
  call<{ asset: MediaAsset }>("POST", "admin/media", { body, session });

export async function uploadMedia(session: string, file: File, metadata: { kind: string; alt: string; folder: string }) {
  const url = new URL(`${apiBase}/admin/media/upload`);
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
  return (await response.json()) as { asset: MediaAsset; storage: string };
}

export const removeMedia = (session: string | null, id: string) =>
  call<{ removed: string }>("DELETE", "admin/media", { body: { id }, session });

// ── Promotions ─────────────────────────────────────────────────────────

export type SaleItem = {
  id: string;
  productId: string;
  merchantId: string;
  salePrice: number;
  quantityLimit: number;
  soldQuantity: number;
  title: string;
};

export type Sale = {
  id: string;
  name: string;
  headline: string;
  bannerUrl: string;
  startsAt: string;
  endsAt: string;
  status: string;
  ownerType: string;
  ownerId: string;
  items: SaleItem[];
};

export const listPromotions = (session: string | null) =>
  call<{ sales: Sale[]; products: { id: string; title: string; price: number; merchantName: string }[] }>(
    "GET",
    "admin/promotions",
    { session },
  );

export const savePromotion = (session: string | null, body: Record<string, unknown>) =>
  call<{ sale: Sale }>("POST", "admin/promotions", { body, session });

export const deletePromotion = (session: string | null, id: string) =>
  call<{ removed: string }>("DELETE", "admin/promotions", { body: { id }, session });

// ── Payments and payouts ───────────────────────────────────────────────

export type Transaction = {
  id: string;
  orderId: string;
  number: string;
  placedAt: string;
  merchantId: string;
  merchantName: string;
  customer: string;
  amount: number;
  commission: number;
  channel: string;
  status: string;
  method: string;
};

export type Payments = {
  transactions: Transaction[];
  totals: {
    gross: number;
    commission: number;
    merchantNet: number;
    refunds: number;
    net: number;
    authorized: number;
    settled: number;
  };
  provider: string;
  message: string;
};

export const getPayments = (session: string | null) => call<Payments>("GET", "admin/payments", { session });

export type AdminPayout = {
  id: string;
  merchantId: string;
  merchantName: string;
  period: string;
  orders: number;
  gross: number;
  commission: number;
  net: number;
  status: string;
  date: string;
  method: string;
};

export const listPayouts = (session: string | null) =>
  call<{ payouts: AdminPayout[]; totals: Record<string, number>; message: string }>("GET", "admin/payouts", {
    session,
  });

export const updatePayout = (session: string | null, body: Record<string, unknown>) =>
  call<{ payout: { id: string; status: string } }>("PATCH", "admin/payouts", { body, session });

// ── Team and audit ─────────────────────────────────────────────────────

export type StaffMember = {
  id: string;
  name: string;
  email: string;
  role: string;
  permissions: string[];
  createdAt: string;
};

export const listStaff = (session: string | null) =>
  call<{ staff: StaffMember[]; roles: { role: string; permissions: string[] }[] }>("GET", "admin/staff", {
    session,
  });

export const saveStaff = (session: string | null, body: Record<string, unknown>) =>
  call<{ staff: StaffMember }>("POST", "admin/staff", { body, session });

export const deleteStaff = (session: string | null, id: string) =>
  call<{ removed: string }>("DELETE", "admin/staff", { body: { id }, session });

export type AuditEvent = {
  id: string;
  actorType: string;
  actorId: string;
  action: string;
  target: string;
  detail: string;
  at: string;
};

export const getAudit = (session: string | null, limit = 120) =>
  call<{ events: AuditEvent[] }>("GET", "admin/audit", { params: { limit }, session });

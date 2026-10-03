/**
 * The admin console's only door to the outside world.
 *
 * Every screen and every action goes through here. Point FERIX_API_BASE (or
 * FERIX_API_SERVICE) at the live commerce backend and the console follows.
 */

const RUNTIME = process.env.CODEWORDS_RUNTIME_URI ?? "https://runtime.codewords.ai";
const KEY = process.env.CODEWORDS_API_KEY ?? "";
const SERVICE = process.env.FERIX_API_SERVICE ?? "ferix_backend_mock_1efc4bd3";

export const apiBase = process.env.FERIX_API_BASE ?? `${RUNTIME}/run/${SERVICE}`;

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

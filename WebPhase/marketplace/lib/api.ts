/**
 * The customer app's only door to the outside world.
 *
 * Every screen and every action goes through here, so nothing in the UI ever
 * holds its own data. Point FERIX_API_SERVICE (or FERIX_API_BASE) at the live
 * commerce backend and the whole app follows without a code change.
 */

const RUNTIME = process.env.CODEWORDS_RUNTIME_URI ?? "https://runtime.codewords.ai";
const KEY = process.env.CODEWORDS_API_KEY ?? "";
const SERVICE = process.env.FERIX_API_SERVICE ?? "ferix_backend_mock_1efc4bd3";

export const apiBase = process.env.FERIX_API_BASE ?? `${RUNTIME}/run/${SERVICE}`;

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
  brand: Brand;
  domain: string;
  customDomain: string | null;
  plan: string;
  since: string;
  productCount?: number;
  categories?: string[];
};

export type Variant = { name: string; values: string[] };

export type Product = {
  id: string;
  slug: string;
  title: string;
  merchantId: string;
  merchantName: string;
  merchantSlug: string;
  category: string;
  collections: string[];
  description: string;
  bullets: string[];
  price: number;
  compareAt: number | null;
  discount: number | null;
  sku: string;
  stock: number;
  rating: number;
  reviewCount: number;
  ratingBreakdown: Record<string, number>;
  variants: Variant[];
  plates: number;
  tags: string[];
  sold30d: number;
  createdAt: string;
};

export type Category = { slug: string; name: string; glyph: string; blurb: string; count: number };
export type Collection = { slug: string; name: string; blurb: string; count: number; products?: Product[] };

export type BannerOverlay = {
  enabled: boolean;
  align: "left" | "center" | "right";
  vertical: "top" | "middle" | "bottom";
  scrim: number;
  tone: "light" | "dark";
  width: number;
  showText: boolean;
  showButtons: boolean;
};

export type Banner = {
  id: string;
  kind: "image" | "video";
  eyebrow: string;
  headline: string;
  body: string;
  ctaLabel: string;
  ctaHref: string;
  secondaryLabel: string;
  secondaryHref: string;
  accent: string;
  mediaUrl: string | null;
  posterNote: string;
  duration: number;
  overlay: BannerOverlay;
};

export type HomeFeed = {
  banners: Banner[];
  categories: Category[];
  collections: Collection[];
  featured: Product[];
  trending: Product[];
  newArrivals: Product[];
  under100: Product[];
  official: Product[];
  stores: Merchant[];
  stats: { products: number; merchants: number; categories: number };
};

export type Facets = {
  categories: { slug: string; name: string; count: number }[];
  stores: { slug: string; name: string; count: number }[];
  priceBuckets: { id: string; label: string; count: number }[];
};

export type ProductList = {
  items: Product[];
  total: number;
  page: number;
  perPage: number;
  pages: number;
  facets: Facets;
};

export type Review = {
  id: string;
  productId: string;
  author?: string;
  rating: number;
  title: string;
  body: string;
  date: string;
  helpful: number;
  verified: boolean;
  product?: Product | null;
};

export type ProductDetail = {
  product: Product;
  merchant: Merchant;
  reviews: Review[];
  related: Product[];
  shipping: { label: string; detail: string }[];
  returns: string;
};

export type CartLine = {
  key: string;
  product: Product;
  variant: string | null;
  qty: number;
  lineTotal: number;
  merchant: Merchant;
  inStock: boolean;
};

export type CartGroup = {
  merchant: Merchant;
  items: CartLine[];
  subtotal: number;
  shipping: number;
  freeShipping: boolean;
};

export type Cart = {
  cartId: string | null;
  lines: CartLine[];
  merchants: CartGroup[];
  count: number;
  distinctItems: number;
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  freeShippingOver: number;
};

export type Address = {
  id: string;
  label: string;
  name: string;
  phone: string;
  line1: string;
  line2: string | null;
  city: string;
  region: string;
  postcode: string;
  country: string;
  isDefault: boolean;
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

export type Order = {
  id: string;
  number: string;
  placedAt: string;
  channel: string;
  items: OrderItem[];
  merchantIds: string[];
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  commission: number;
  payment: string;
  fulfillment: string;
  carrier: string | null;
  tracking: string | null;
  address: Address;
  note: string | null;
  timeline: { label: string; at: string | null }[];
};

export type AccountUser = {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatarInitials: string;
  createdAt: string;
  /** Shopper tier reported by the store's backend, e.g. "vip". */
  segment?: string;
  settings: Record<string, unknown>;
};

export type Account = {
  user: AccountUser;
  orders: Order[];
  activeOrders: number;
  wishlist: Product[];
  addresses: Address[];
  reviews: Review[];
  follows: string[];
  stats: {
    orderCount: number;
    spent: number;
    averageOrder: number;
    wishlistCount: number;
    addressCount: number;
    reviewCount: number;
    since: string;
  };
};

export type ShippingOption = { id: string; label: string; eta: string; price: number };
export type PaymentMethod = { id: string; label: string; detail: string };

export type CheckoutQuote = {
  cart: Cart;
  groups: CartGroup[];
  address: Address | null;
  shippingOption: ShippingOption;
  totals: { subtotal: number; shipping: number; tax: number; total: number; commission: number; itemCount: number };
  freeShippingOver: number;
};

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

type Creds = { session?: string | null; cartId?: string | null };
type Params = Record<string, string | number | boolean | undefined | null>;

async function call<T>(
  method: string,
  path: string,
  opts: { params?: Params; body?: Record<string, unknown>; creds?: Creds } = {},
): Promise<T> {
  const url = new URL(`${apiBase}/${path}`);
  for (const [key, value] of Object.entries(opts.params ?? {})) {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
  }

  // The backend does not receive custom headers through the runtime proxy, so
  // the session and cart travel inside the request itself.
  const payload: Record<string, unknown> = { ...(opts.body ?? {}) };
  if (opts.creds?.session) {
    payload.session = opts.creds.session;
    if (method === "GET") url.searchParams.set("session", opts.creds.session);
  }
  if (opts.creds?.cartId) {
    payload.cartId = opts.creds.cartId;
    if (method === "GET") url.searchParams.set("cartId", opts.creds.cartId);
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

// ── Catalogue ──────────────────────────────────────────────────────────

export const getHome = () => call<HomeFeed>("GET", "catalog/home");

export const listProducts = (params: Params) => call<ProductList>("GET", "catalog/products", { params });

export const getProduct = (slug: string) => call<ProductDetail>("GET", "catalog/product", { params: { slug } });

export const getCategories = () => call<{ categories: Category[] }>("GET", "catalog/categories");

export const getCategory = (slug: string, sort = "relevance") =>
  call<{ category: Category } & ProductList>("GET", "catalog/category", { params: { slug, sort } });

export const getCollections = () => call<{ collections: Collection[] }>("GET", "catalog/collections");

export const getCollection = (slug: string, sort = "relevance") =>
  call<{ collection: Collection } & ProductList>("GET", "catalog/collection", { params: { slug, sort } });

export const listStores = (params: Params = {}) =>
  call<{ stores: Merchant[]; total: number }>("GET", "catalog/stores", { params });

export const getStore = (slug: string) =>
  call<{
    store: Merchant;
    about: string;
    responseRate: number;
    fulfilmentRate: number;
    products: Product[];
    categories: Category[];
    stats: { products: number; rating: number; reviewCount: number; followers: number };
  }>("GET", "catalog/store", { params: { slug } });

export const searchAll = (q: string) =>
  call<{ query: string; products: Product[]; stores: Merchant[]; categories: Category[]; suggestions: string[] }>(
    "GET",
    "search",
    { params: { q } },
  );

// ── Auth ───────────────────────────────────────────────────────────────

export const register = (body: { name: string; email: string; password: string }, creds?: Creds) =>
  call<{ token: string; user: AccountUser; cartId: string }>("POST", "auth/register", { body, creds });

export const login = (body: { email: string; password: string }, creds?: Creds) =>
  call<{ token: string; user: AccountUser; cartId: string }>("POST", "auth/login", { body, creds });

export const logout = (creds: Creds) => call<{ ok: boolean }>("POST", "auth/logout", { creds });

export const getUser = (creds: Creds) => call<{ user: AccountUser | null }>("GET", "auth/me", { creds });

// ── Cart ───────────────────────────────────────────────────────────────

export const getCart = (creds: Creds) => call<Cart>("GET", "cart", { creds });

export const addCartItem = (body: { productId: string; variant?: string | null; qty?: number }, creds: Creds) =>
  call<Cart>("POST", "cart/items", { body, creds });

export const setCartQty = (body: { key: string; qty: number }, creds: Creds) =>
  call<Cart>("PATCH", "cart/items", { body, creds });

export const removeCartItem = (body: { key: string }, creds: Creds) =>
  call<Cart>("DELETE", "cart/items", { body, creds });

export const saveForLater = (body: { key: string }, creds: Creds) =>
  call<Cart>("POST", "cart/save-for-later", { body, creds });

export const clearCart = (creds: Creds) => call<Cart>("POST", "cart/clear", { creds });

// ── Account ────────────────────────────────────────────────────────────

export const getAccount = (creds: Creds) => call<Account>("GET", "account", { creds });

export const getOrders = (creds: Creds, status?: string) =>
  call<{ orders: Order[]; counts: Record<string, number> }>("GET", "account/orders", { params: { status }, creds });

export const getOrder = (orderId: string, creds: Creds) =>
  call<{ order: Order; merchants: (Merchant & { items: OrderItem[] })[] }>("GET", "account/orders/detail", {
    params: { orderId },
    creds,
  });

export const reorder = (orderId: string, creds: Creds) =>
  call<{ added: number; cart: Cart }>("POST", "account/orders/reorder", { body: { orderId }, creds });

export const getAddresses = (creds: Creds) => call<{ addresses: Address[] }>("GET", "account/addresses", { creds });

export const addAddress = (body: Omit<Address, "id">, creds: Creds) =>
  call<{ addresses: Address[]; address: Address }>("POST", "account/addresses", {
    body: body as unknown as Record<string, unknown>,
    creds,
  });

export const updateAddress = (body: Partial<Address> & { id: string }, creds: Creds) =>
  call<{ addresses: Address[]; address: Address }>("PATCH", "account/addresses", {
    body: body as unknown as Record<string, unknown>,
    creds,
  });

export const deleteAddress = (id: string, creds: Creds) =>
  call<{ addresses: Address[] }>("DELETE", "account/addresses", { body: { id }, creds });

export const getWishlist = (creds: Creds) => call<{ wishlist: Product[] }>("GET", "account/wishlist", { creds });

export const toggleWishlist = (productId: string, creds: Creds) =>
  call<{ saved: boolean; wishlist: Product[] }>("POST", "account/wishlist/toggle", { body: { productId }, creds });

export const getMyReviews = (creds: Creds) => call<{ reviews: Review[] }>("GET", "account/reviews", { creds });

export const createReview = (body: { productId: string; rating: number; title: string; body: string }, creds: Creds) =>
  call<{ reviews: Review[] }>("POST", "account/reviews", { body, creds });

export const updateReview = (body: { id: string; rating?: number; title?: string; body?: string }, creds: Creds) =>
  call<{ reviews: Review[] }>("PATCH", "account/reviews", { body, creds });

export const deleteReview = (id: string, creds: Creds) =>
  call<{ reviews: Review[] }>("DELETE", "account/reviews", { body: { id }, creds });

export const getSettings = (creds: Creds) =>
  call<{ user: AccountUser; settings: Record<string, unknown> }>("GET", "account/settings", { creds });

export const updateSettings = (body: Record<string, unknown>, creds: Creds) =>
  call<{ user: AccountUser; settings: Record<string, unknown> }>("PATCH", "account/settings", { body, creds });

// ── Checkout ───────────────────────────────────────────────────────────

export const getShipping = () =>
  call<{ options: ShippingOption[]; paymentMethods: PaymentMethod[]; freeShippingOver: number; taxRate: number }>(
    "GET",
    "shipping/options",
  );

export const quoteCheckout = (body: { addressId: string; shippingMethod: string }, creds: Creds) =>
  call<CheckoutQuote>("POST", "checkout/quote", { body, creds });

export const placeOrder = (
  body: { addressId: string; shippingMethod: string; paymentMethod: string; note?: string },
  creds: Creds,
) => call<{ order: Order }>("POST", "checkout/place", { body, creds });

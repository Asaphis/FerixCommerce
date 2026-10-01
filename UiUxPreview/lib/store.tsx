"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Banner, BannerKind, CartLine, Merchant, Order, Product, SalesChannels, StorePage } from "@/lib/types";
import { CUSTOMERS, DEFAULT_OVERLAY, MARKETPLACE_BANNERS, MERCHANTS, PRODUCTS, getMerchant, getProduct, isoDaysBack } from "@/lib/data";

/** Storefront structure defaults, overridable from the Store pages. */
export const BASE_NAV = ["Home", "Shop all", "New in", "Collections", "About", "Contact"];

export const BASE_PAGES: StorePage[] = [
  { id: "home", name: "Home", slug: "/", visible: true, system: true },
  { id: "shop", name: "Shop all", slug: "/shop", visible: true, system: true },
  { id: "about", name: "About the store", slug: "/about", visible: true, system: false },
  { id: "shipping", name: "Shipping & returns", slug: "/shipping", visible: true, system: false },
  { id: "contact", name: "Contact", slug: "/contact", visible: true, system: false },
  { id: "lookbook", name: "Lookbook", slug: "/lookbook", visible: false, system: false },
];

/**
 * Ferixas client state. Everything here is local to the prototype: no backend,
 * no persistence, no real payments. Cart, wishlist, channel flags and merchant
 * edits all live in memory so the prototype stays honest about what it is.
 */

type PlaceOrderInput = {
  address: Order["address"];
  channel: Order["channel"];
  shipping: number;
  note?: string | null;
};

type Ctx = {
  merchantId: string;
  setMerchantId: (id: string) => void;
  merchant: Merchant;
  merchants: Merchant[];
  updateMerchant: (id: string, patch: Partial<Merchant>) => void;
  products: Product[];
  productById: (id: string) => Product | undefined;
  productBySlug: (slug: string) => Product | undefined;
  cart: CartLine[];
  cartCount: number;
  wishlist: string[];
  follows: string[];
  localOrders: Order[];
  addToCart: (productId: string, variant?: string | null, qty?: number) => void;
  setQty: (key: string, qty: number) => void;
  removeLine: (key: string) => void;
  clearCart: () => void;
  toggleWishlist: (productId: string) => void;
  toggleFollow: (merchantId: string) => void;
  updateProduct: (id: string, patch: Partial<Product>) => void;
  setChannels: (id: string, channels: SalesChannels) => void;
  createProduct: (input: Partial<Product> & { title: string }) => Product;
  duplicateProduct: (id: string) => Product | undefined;
  deleteProduct: (id: string) => void;
  placeOrder: (input: PlaceOrderInput) => Order;
  banners: Banner[];
  addBanner: (kind?: BannerKind) => Banner;
  updateBanner: (id: string, patch: Partial<Banner>) => void;
  removeBanner: (id: string) => void;
  moveBanner: (id: string, direction: -1 | 1) => void;
};

const FerixasContext = createContext<Ctx | null>(null);

const slugify = (v: string) =>
  v
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

export function FerixasProvider({ children }: { children: ReactNode }) {
  const [merchantId, setMerchantId] = useState("abc-electronics");
  const [merchantOverrides, setMerchantOverrides] = useState<Record<string, Partial<Merchant>>>({});
  const [overrides, setOverrides] = useState<Record<string, Partial<Product>>>({});
  const [extraProducts, setExtraProducts] = useState<Product[]>([]);
  const [removed, setRemoved] = useState<string[]>([]);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [follows, setFollows] = useState<string[]>(["nova-fashion", "sahel-supply"]);
  const [localOrders, setLocalOrders] = useState<Order[]>([]);
  const [banners, setBanners] = useState<Banner[]>(MARKETPLACE_BANNERS);

  const products = useMemo(() => {
    const base = PRODUCTS.filter((p) => !removed.includes(p.id)).map((p) =>
      overrides[p.id] ? { ...p, ...overrides[p.id] } : p,
    );
    return [...extraProducts, ...base];
  }, [overrides, extraProducts, removed]);

  const productById = useCallback(
    (id: string) => products.find((p) => p.id === id),
    [products],
  );
  const productBySlug = useCallback(
    (slug: string) => products.find((p) => p.slug === slug),
    [products],
  );

  const addToCart = useCallback((productId: string, variant: string | null = null, qty = 1) => {
    setCart((prev) => {
      const key = `${productId}::${variant ?? ""}`;
      const existing = prev.find((l) => l.key === key);
      if (existing) {
        return prev.map((l) => (l.key === key ? { ...l, qty: l.qty + qty } : l));
      }
      return [
        ...prev,
        {
          key,
          productId,
          merchantId: getProduct(productId)?.merchantId ?? "ferixas-official",
          variant,
          qty,
        },
      ];
    });
  }, []);

  const setQty = useCallback((key: string, qty: number) => {
    setCart((prev) =>
      qty <= 0
        ? prev.filter((l) => l.key !== key)
        : prev.map((l) => (l.key === key ? { ...l, qty } : l)),
    );
  }, []);

  const removeLine = useCallback((key: string) => {
    setCart((prev) => prev.filter((l) => l.key !== key));
  }, []);

  const clearCart = useCallback(() => setCart([]), []);

  const toggleWishlist = useCallback((productId: string) => {
    setWishlist((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId],
    );
  }, []);

  const toggleFollow = useCallback((id: string) => {
    setFollows((prev) => (prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]));
  }, []);

  const updateProduct = useCallback((id: string, patch: Partial<Product>) => {
    setOverrides((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  }, []);

  const setChannels = useCallback((id: string, channels: SalesChannels) => {
    setOverrides((prev) => ({ ...prev, [id]: { ...prev[id], channels } }));
  }, []);

  const createProduct = useCallback((input: Partial<Product> & { title: string }) => {
    const seed = PRODUCTS[0];
    const product: Product = {
      ...seed,
      id: `prd_new_${Date.now().toString(36)}`,
      slug: slugify(input.title),
      title: input.title,
      merchantId: input.merchantId ?? merchantId,
      sku: input.sku ?? `${(input.merchantId ?? merchantId).slice(0, 3).toUpperCase()}-NEW-${Math.floor(Math.random() * 900 + 100)}`,
      status: input.status ?? "draft",
      stock: input.stock ?? 0,
      price: input.price ?? 0,
      compareAt: input.compareAt ?? null,
      category: input.category ?? "electronics",
      channels: input.channels ?? { store: true, marketplace: false },
      createdAt: new Date().toISOString(),
      sold30d: 0,
      views30d: 0,
      reviewCount: 0,
      rating: 0,
      ...(input.description ? { description: input.description } : {}),
    };
    setExtraProducts((prev) => [product, ...prev]);
    return product;
  }, [merchantId]);

  const duplicateProduct = useCallback(
    (id: string) => {
      const source = products.find((p) => p.id === id);
      if (!source) return undefined;
      const copy: Product = {
        ...source,
        id: `prd_copy_${Date.now().toString(36)}`,
        title: `${source.title} (copy)`,
        slug: `${source.slug}-copy`,
        sku: `${source.sku}-C`,
        status: "draft",
        sold30d: 0,
        views30d: 0,
        createdAt: new Date().toISOString(),
      };
      setExtraProducts((prev) => [copy, ...prev]);
      return copy;
    },
    [products],
  );

  const deleteProduct = useCallback((id: string) => {
    setRemoved((prev) => [...prev, id]);
    setExtraProducts((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const placeOrder = useCallback(
    (input: PlaceOrderInput) => {
      const items = cart.map((line) => {
        const product = productById(line.productId);
        return {
          productId: line.productId,
          title: product?.title ?? "Product",
          variant: line.variant,
          qty: line.qty,
          price: product?.price ?? 0,
          merchantId: line.merchantId,
        };
      });
      const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
      const tax = Math.round(subtotal * 0.075 * 100) / 100;
      const commission =
        input.channel === "marketplace"
          ? Math.round(
              items.reduce(
                (s, i) => s + i.price * i.qty * (getMerchant(i.merchantId).commissionPct / 100),
                0,
              ) * 100,
            ) / 100
          : 0;
      const seq = 4720 + localOrders.length;
      const order: Order = {
        id: `ord_${seq}`,
        number: `FX-${seq}`,
        customerId: CUSTOMERS[0].id,
        placedAt: new Date().toISOString(),
        channel: input.channel,
        merchantIds: Array.from(new Set(items.map((i) => i.merchantId))),
        items,
        subtotal: Math.round(subtotal * 100) / 100,
        shipping: input.shipping,
        tax,
        total: Math.round((subtotal + input.shipping + tax) * 100) / 100,
        commission,
        payment: "paid",
        fulfillment: "processing",
        carrier: null,
        tracking: null,
        address: input.address,
        note: input.note ?? null,
      };
      setLocalOrders((prev) => [order, ...prev]);
      setCart([]);
      return order;
    },
    [cart, localOrders.length, productById],
  );

  const merchants = useMemo<Merchant[]>(
    () =>
      MERCHANTS.map((m) => ({
        ...m,
        nav: m.nav ?? BASE_NAV,
        pages: m.pages ?? BASE_PAGES,
        visibility: m.visibility ?? "public",
        storePassword: m.storePassword ?? null,
        seoHidden: m.seoHidden ?? false,
        ...merchantOverrides[m.id],
      })),
    [merchantOverrides],
  );

  const merchant = merchants.find((m) => m.id === merchantId) ?? merchants[0];

  const updateMerchant = useCallback((id: string, patch: Partial<Merchant>) => {
    setMerchantOverrides((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  }, []);

  const addBanner = useCallback((kind: BannerKind = "image") => {
    const banner: Banner = {
      id: `bnr_new_${Date.now().toString(36)}`,
      kind,
      eyebrow: kind === "video" ? "New video banner" : "New banner",
      headline: kind === "video" ? "Your promotion headline" : "Your banner headline",
      body: "Describe the promotion in one line \u2014 what it is and why now.",
      ctaLabel: "Shop now",
      ctaHref: "/browse",
      secondaryLabel: "",
      secondaryHref: "",
      accent: "#e4572e",
      hue: 18,
      mediaUrl: null,
      posterNote: kind === "video" ? "No video attached yet" : "Generated artwork",
      duration: kind === "video" ? 9000 : 7000,
      active: false,
      order: banners.length,
      audience: "All shoppers",
      startsAt: new Date().toISOString(),
      endsAt: isoDaysBack(-30, 23),
      impressions: 0,
      clicks: 0,
      overlay: { ...DEFAULT_OVERLAY },
    };
    setBanners((prev) => [...prev, banner]);
    return banner;
  }, [banners.length]);

  const updateBanner = useCallback((id: string, patch: Partial<Banner>) => {
    setBanners((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  }, []);

  const removeBanner = useCallback((id: string) => {
    setBanners((prev) => prev.filter((b) => b.id !== id));
  }, []);

  const moveBanner = useCallback((id: string, direction: -1 | 1) => {
    setBanners((prev) => {
      const sorted = [...prev].sort((a, b) => a.order - b.order);
      const index = sorted.findIndex((b) => b.id === id);
      const target = index + direction;
      if (index === -1 || target < 0 || target >= sorted.length) return prev;
      [sorted[index], sorted[target]] = [sorted[target], sorted[index]];
      return sorted.map((b, i) => ({ ...b, order: i }));
    });
  }, []);

  const value: Ctx = {
    merchantId,
    setMerchantId,
    merchant,
    merchants,
    updateMerchant,
    products,
    productById,
    productBySlug,
    cart,
    cartCount: cart.reduce((s, l) => s + l.qty, 0),
    wishlist,
    follows,
    localOrders,
    addToCart,
    setQty,
    removeLine,
    clearCart,
    toggleWishlist,
    toggleFollow,
    updateProduct,
    setChannels,
    createProduct,
    duplicateProduct,
    deleteProduct,
    placeOrder,
    banners,
    addBanner,
    updateBanner,
    removeBanner,
    moveBanner,
  };

  return <FerixasContext.Provider value={value}>{children}</FerixasContext.Provider>;
}

export function useFerixas() {
  const ctx = useContext(FerixasContext);
  if (!ctx) throw new Error("useFerixas must be used inside FerixasProvider");
  return ctx;
}

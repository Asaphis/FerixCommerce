import type {
  Channel,
  Customer,
  Dispute,
  FulfillmentStatus,
  Order,
  OrderItem,
  PaymentStatus,
  Payout,
  Promotion,
  Review,
  SeriesPoint,
} from "@/lib/types";
import {
  CARRIERS,
  CUSTOMER_SEEDS,
  REVIEW_BODIES,
  REVIEW_TITLES,
  addressFor,
  createRng,
  dateDaysBack,
  isoDaysBack,
  pickMany,
  pickOne,
} from "./core";
import { MERCHANTS, getMerchant } from "./merchants";
import { PRODUCTS, getProduct } from "./catalog";

const activeProducts = PRODUCTS.filter((p) => p.status === "active");
const storePool = activeProducts.filter((p) => p.channels.store);
const marketPool = activeProducts.filter((p) => p.channels.marketplace);

function buildOrders(): Order[] {
  const rnd = createRng(90210);
  const out: Order[] = [];
  let seq = 4180;

  for (let d = 90; d >= 0; d -= 1) {
    const date = dateDaysBack(d);
    const dow = date.getUTCDay();
    const weekend = dow === 0 || dow === 6 ? 1.3 : 1;
    const growth = 1 + ((90 - d) / 90) * 0.55;
    const count = Math.round((5 + rnd() * 4) * weekend * growth);

    for (let k = 0; k < count; k += 1) {
      const channel: Channel = rnd() < 0.66 ? "marketplace" : "store";
      const pool = channel === "marketplace" ? marketPool : storePool;
      const lineCount = 1 + Math.floor(rnd() * 3);
      const merchantIds: string[] = [];
      const items: OrderItem[] = [];
      const maxMerchants = channel === "marketplace" ? 2 : 1;

      for (let l = 0; l < lineCount; l += 1) {
        const p = pickOne(pool, rnd);
        if (!merchantIds.includes(p.merchantId)) {
          if (merchantIds.length >= maxMerchants) continue;
          merchantIds.push(p.merchantId);
        }
        const variant = p.variants.length
          ? `${p.variants[0].name}: ${pickOne(p.variants[0].values, rnd)}`
          : null;
        items.push({
          productId: p.id,
          title: p.title,
          variant,
          qty: 1 + Math.floor(rnd() * 2),
          price: p.price,
          merchantId: p.merchantId,
        });
      }
      if (!items.length) continue;

      const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
      const shipping = channel === "marketplace" ? (subtotal > 120 ? 0 : 9.9) : subtotal > 200 ? 0 : 6.5;
      const tax = Math.round(subtotal * 0.075 * 100) / 100;
      const commission =
        channel === "marketplace"
          ? Math.round(
              items.reduce((s, i) => s + i.price * i.qty * (getMerchant(i.merchantId).commissionPct / 100), 0) * 100,
            ) / 100
          : 0;

      let payment: PaymentStatus = "paid";
      const roll = rnd();
      if (roll > 0.966) payment = "failed";
      else if (roll > 0.932) payment = "refunded";
      else if (roll > 0.9) payment = "pending";

      let fulfillment: FulfillmentStatus;
      if (payment === "failed") fulfillment = "cancelled";
      else if (d <= 1) fulfillment = rnd() < 0.5 ? "unfulfilled" : "processing";
      else if (d <= 5) fulfillment = rnd() < 0.55 ? "processing" : "shipped";
      else if (d <= 12) fulfillment = rnd() < 0.5 ? "shipped" : "delivered";
      else fulfillment = rnd() < 0.97 ? "delivered" : "cancelled";

      const shipped = fulfillment === "shipped" || fulfillment === "delivered";
      const ci = Math.floor(rnd() * CUSTOMER_SEEDS.length);
      const seed = CUSTOMER_SEEDS[ci];

      out.push({
        id: `ord_${seq}`,
        number: `FX-${seq}`,
        customerId: seed.id,
        placedAt: isoDaysBack(d, 8 + Math.floor(rnd() * 11), Math.floor(rnd() * 60)),
        channel,
        merchantIds,
        items,
        subtotal: Math.round(subtotal * 100) / 100,
        shipping,
        tax,
        total: Math.round((subtotal + shipping + tax) * 100) / 100,
        commission,
        payment,
        fulfillment,
        carrier: shipped ? pickOne(CARRIERS, rnd) : null,
        tracking: shipped ? `FX${Math.floor(100000000 + rnd() * 899999999)}` : null,
        address: addressFor(ci),
        note: rnd() > 0.88 ? pickOne(["Leave with the concierge", "Call on arrival", "Gift wrap please", "Deliver after 6pm"], rnd) : null,
      });
      seq += 1;
    }
  }

  return out.sort((a, b) => (a.placedAt < b.placedAt ? 1 : -1));
}

export const ORDERS: Order[] = buildOrders();

export function ordersOf(merchantId: string): Order[] {
  return ORDERS.filter((o) => o.merchantIds.includes(merchantId));
}

export function ordersForChannel(merchantId: string, channel: Channel): Order[] {
  return ORDERS.filter((o) => o.merchantIds.includes(merchantId) && o.channel === channel);
}

export function merchantSubtotal(order: Order, merchantId: string) {
  return order.items
    .filter((i) => i.merchantId === merchantId)
    .reduce((s, i) => s + i.price * i.qty, 0);
}

export function orderAge(order: Order) {
  return Math.round((Date.now() - new Date(order.placedAt).getTime()) / 86400000);
}

export const CUSTOMERS: Customer[] = CUSTOMER_SEEDS.map((seed) => {
  const mine = ORDERS.filter((o) => o.customerId === seed.id);
  const spent = mine.reduce((s, o) => s + o.total, 0);
  const last = mine[0]?.placedAt ?? seed.since;
  return {
    ...seed,
    orderCount: mine.length,
    spent: Math.round(spent * 100) / 100,
    lastOrderAt: last,
  };
}).sort((a, b) => b.spent - a.spent);

export function customerById(id: string) {
  return CUSTOMERS.find((c) => c.id === id);
}

export const REVIEWS: Review[] = PRODUCTS.flatMap((p, pi) => {
  const rnd = createRng(3100 + pi * 17);
  const count = 2 + Math.floor(rnd() * 5);
  const rows: Review[] = [];
  for (let i = 0; i < count; i += 1) {
    const seed = pickOne(CUSTOMER_SEEDS, rnd);
    const skew = rnd();
    const rating = skew > 0.82 ? 3 : skew > 0.55 ? 4 : 5;
    rows.push({
      id: `rev_${pi}_${i}`,
      productId: p.id,
      author: seed.name,
      rating,
      title: pickOne(REVIEW_TITLES, rnd),
      body: pickOne(REVIEW_BODIES, rnd),
      date: isoDaysBack(3 + Math.floor(rnd() * 150), 12, Math.floor(rnd() * 60)),
      helpful: Math.floor(rnd() * 42),
      verified: rnd() > 0.18,
    });
  }
  return rows;
});

export function reviewsOf(productId: string) {
  return REVIEWS.filter((r) => r.productId === productId);
}

export function ratingBreakdown(productId: string) {
  const rows = reviewsOf(productId);
  const total = rows.length || 1;
  return [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: rows.filter((r) => r.rating === star).length,
    share: Math.round((rows.filter((r) => r.rating === star).length / total) * 100),
  }));
}

export function seriesFor(merchantId: string | null, days = 30): SeriesPoint[] {
  const rnd = createRng(merchantId ? merchantId.length * 977 + 5 : 4242);
  const scoped = merchantId
    ? ORDERS.filter((o) => o.merchantIds.includes(merchantId))
    : ORDERS;
  const points: SeriesPoint[] = [];
  for (let d = days - 1; d >= 0; d -= 1) {
    const date = dateDaysBack(d);
    const key = date.toISOString().slice(0, 10);
    const dayOrders = scoped.filter((o) => o.placedAt.slice(0, 10) === key);
    const revenue = dayOrders.reduce(
      (s, o) => s + (merchantId ? merchantSubtotal(o, merchantId) : o.total),
      0,
    );
    points.push({
      label: date.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }),
      date: key,
      revenue: Math.round(revenue * 100) / 100,
      orders: dayOrders.length,
      visitors: Math.round(dayOrders.length * (26 + rnd() * 18) + 40 + rnd() * 60),
    });
  }
  return points;
}

export function totalsFor(merchantId: string | null, days = 30) {
  const points = seriesFor(merchantId, days);
  const prev = seriesFor(merchantId, days * 2).slice(0, days);
  const sum = (rows: SeriesPoint[], key: "revenue" | "orders" | "visitors") =>
    rows.reduce((s, p) => s + p[key], 0);
  const revenue = sum(points, "revenue");
  const prevRevenue = sum(prev, "revenue");
  const orders = sum(points, "orders");
  const prevOrders = sum(prev, "orders");
  const visitors = sum(points, "visitors");
  const prevVisitors = sum(prev, "visitors");
  const growth = (now: number, before: number) => (before ? ((now - before) / before) * 100 : 0);
  return {
    revenue,
    orders,
    visitors,
    aov: orders ? revenue / orders : 0,
    conversion: visitors ? (orders / visitors) * 100 : 0,
    revenueGrowth: growth(revenue, prevRevenue),
    ordersGrowth: growth(orders, prevOrders),
    visitorsGrowth: growth(visitors, prevVisitors),
    points,
    previous: prev,
  };
}

export function topProducts(merchantId: string, count = 6) {
  return PRODUCTS.filter((p) => p.merchantId === merchantId)
    .slice()
    .sort((a, b) => b.sold30d * b.price - a.sold30d * a.price)
    .slice(0, count);
}

export function lowStock(merchantId: string) {
  return PRODUCTS.filter((p) => p.merchantId === merchantId && p.stock <= p.lowStockAt).sort(
    (a, b) => a.stock - b.stock,
  );
}

export function recentOrders(merchantId: string, count = 8) {
  return ordersOf(merchantId).slice(0, count);
}

export function channelSplit(merchantId: string, days = 30) {
  const cutoff = isoDaysBack(days);
  const rows = ordersOf(merchantId).filter((o) => o.placedAt >= cutoff);
  const storeRows = rows.filter((o) => o.channel === "store");
  const marketRows = rows.filter((o) => o.channel === "marketplace");
  return {
    store: {
      orders: storeRows.length,
      revenue: storeRows.reduce((s, o) => s + merchantSubtotal(o, merchantId), 0),
    },
    marketplace: {
      orders: marketRows.length,
      revenue: marketRows.reduce((s, o) => s + merchantSubtotal(o, merchantId), 0),
    },
    commission: marketRows.reduce((s, o) => s + o.commission, 0),
  };
}

export function merchantStats(merchantId: string) {
  const rows = ordersOf(merchantId);
  const cutoff = isoDaysBack(30);
  const last30 = rows.filter((o) => o.placedAt >= cutoff);
  const revenue = last30.reduce((s, o) => s + merchantSubtotal(o, merchantId), 0);
  const commission = last30.filter((o) => o.channel === "marketplace").reduce((s, o) => s + o.commission, 0);
  const unfulfilled = rows.filter((o) => o.fulfillment === "unfulfilled" || o.fulfillment === "processing").length;
  return {
    totalOrders: rows.length,
    revenue,
    commission,
    net: revenue - commission,
    unfulfilled,
    customers: new Set(rows.map((o) => o.customerId)).size,
    aov: last30.length ? revenue / last30.length : 0,
  };
}

export const PAYOUTS: Payout[] = MERCHANTS.flatMap((m, mi) =>
  Array.from({ length: 8 }, (_, i) => {
    const rnd = createRng(700 + mi * 31 + i * 7);
    const amount = Math.round((3400 + rnd() * 11000) * 100) / 100;
    const commission = Math.round(amount * (m.commissionPct / 100) * 100) / 100;
    const endDays = 3 + i * 14;
    const startDays = endDays + 13;
    return {
      id: `pay_${m.id}_${i}`,
      period: `${dateDaysBack(startDays).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })} \u2013 ${dateDaysBack(endDays).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })}`,
      amount,
      commission,
      status: i === 0 ? "pending" : i === 1 ? "in transit" : i === 5 && mi % 3 === 1 ? "on hold" : "paid",
      date: isoDaysBack(endDays + 4, 11),
      method: pickOne(["Bank transfer \u00b7 GTB \u00b7\u00b7\u00b78921", "Bank transfer \u00b7 Chase \u00b7\u00b74210", "Payoneer \u00b7 USD", "Stripe Connect"], rnd),
    };
  }),
);

export function payoutsOf(merchantId: string) {
  return PAYOUTS.filter((p) => p.id.includes(merchantId));
}

const DISPUTE_REASONS = [
  "Item not as described",
  "Package arrived damaged",
  "Never delivered",
  "Wrong size shipped",
  "Unauthorised charge",
  "Late delivery, refused",
];

export const DISPUTES: Dispute[] = Array.from({ length: 11 }, (_, i) => {
  const rnd = createRng(5150 + i * 13);
  const order = ORDERS[Math.floor(rnd() * 120)];
  const merchantId = order.merchantIds[0] ?? MERCHANTS[0].id;
  return {
    id: `dsp_${2100 + i}`,
    orderId: order.number,
    merchantId,
    customerName: customerById(order.customerId)?.name ?? "Customer",
    reason: pickOne(DISPUTE_REASONS, rnd),
    amount: Math.round(order.total * 100) / 100,
    status: pickOne(["open", "under review", "resolved", "escalated"], rnd) as Dispute["status"],
    openedAt: isoDaysBack(1 + Math.floor(rnd() * 40), 10),
  };
});

export const PROMOTIONS: Promotion[] = MERCHANTS.flatMap((m, mi) => {
  const rnd = createRng(880 + mi * 19);
  const rows: Promotion[] = [
    {
      id: `prm_${m.id}_1`,
      name: "Autumn 15% off",
      type: "percentage",
      value: "15% off storewide",
      scope: "store",
      status: "active",
      uses: 218 + mi * 12,
      revenue: 18420 + mi * 940,
      startsAt: isoDaysBack(12, 9),
      endsAt: isoDaysBack(-9, 23),
    },
    {
      id: `prm_${m.id}_2`,
      name: "Free shipping over $120",
      type: "free shipping",
      value: "Orders above $120",
      scope: "store",
      status: "active",
      uses: 486 + mi * 21,
      revenue: 32110 + mi * 1620,
      startsAt: isoDaysBack(40, 9),
      endsAt: isoDaysBack(-20, 23),
    },
    {
      id: `prm_${m.id}_3`,
      name: "Marketplace spotlight",
      type: "bundle",
      value: "Top 8 products featured",
      scope: "marketplace",
      status: mi % 4 === 3 ? "scheduled" : "active",
      uses: 96 + mi * 7,
      revenue: 9870 + mi * 620,
      startsAt: isoDaysBack(6, 9),
      endsAt: isoDaysBack(-14, 23),
    },
    {
      id: `prm_${m.id}_4`,
      name: "Clearance bundle",
      type: "fixed",
      value: "$25 off two items",
      scope: "collection",
      status: "draft",
      uses: 0,
      revenue: 0,
      startsAt: isoDaysBack(-4, 9),
      endsAt: isoDaysBack(-32, 23),
    },
  ];
  return rows;
});

export function promotionsOf(merchantId: string) {
  return PROMOTIONS.filter((p) => p.id.includes(merchantId));
}

export function platformTotals() {
  const gmv = ORDERS.reduce((s, o) => s + o.total, 0);
  const commission = ORDERS.reduce((s, o) => s + o.commission, 0);
  const refunds = ORDERS.filter((o) => o.payment === "refunded").reduce((s, o) => s + o.total, 0);
  const planPrices: Record<string, number> = { Starter: 29, Growth: 99, Scale: 299, Platform: 0 };
  const planCounts: Record<string, number> = { Starter: 284, Growth: 168, Scale: 54, Platform: 1 };
  const mrr = Object.keys(planPrices).reduce(
    (s, name) => s + planPrices[name] * planCounts[name],
    0,
  );
  return {
    gmv,
    commission,
    refunds,
    mrr,
    orders: ORDERS.length,
    merchants: 507,
    modelledTenants: MERCHANTS.length,
    customers: 41234,
    modelledCustomers: CUSTOMERS.length,
    aov: gmv / ORDERS.length,
  };
}

export const AUDIT_LOG = Array.from({ length: 18 }, (_, i) => {
  const rnd = createRng(2600 + i * 11);
  const actor = pickOne(CUSTOMER_SEEDS, rnd).name;
  const merchant = pickOne(MERCHANTS, rnd);
  return {
    id: `aud_${4100 + i}`,
    at: isoDaysBack(Math.floor(rnd() * 20), 8 + Math.floor(rnd() * 10), Math.floor(rnd() * 60)),
    actor: rnd() > 0.6 ? `${actor} (admin)` : `${merchant.name} (owner)`,
    action: pickOne(
      [
        "Updated store design and published",
        "Changed marketplace participation for 3 products",
        "Approved payout batch",
        "Suspended a merchant account",
        "Applied commission override",
        "Restored a refunded order",
        "Issued a domain verification token",
        "Enabled AI design assistant for tenant",
      ],
      rnd,
    ),
    target: rnd() > 0.5 ? merchant.name : `Order FX-${4180 + Math.floor(rnd() * 400)}`,
    ip: `102.89.${Math.floor(rnd() * 250)}.${Math.floor(rnd() * 250)}`,
  };
});

const INTEGRATION_NAMES = [
  ["Stripe", "Payments", "connected"],
  ["Paystack", "Payments", "connected"],
  ["Flutterwave", "Payments", "connected"],
  ["DHL Express", "Shipping", "connected"],
  ["GIG Logistics", "Shipping", "connected"],
  ["Sendbox", "Shipping", "beta"],
  ["Cloudflare", "Domains", "connected"],
  ["Resend", "Transactional email", "connected"],
  ["Termii", "SMS", "connected"],
  ["Slack", "Notifications", "connected"],
  ["Meta Ads", "Advertising", "available"],
  ["Google Shopping", "Advertising", "available"],
  ["OpenAI", "AI design assistant", "connected"],
  ["Cloudinary", "Media", "connected"],
  ["Algolia", "Search", "connected"],
  ["QuickBooks", "Accounting", "available"],
  ["Wise", "Payouts", "connected"],
  ["TikTok Shop", "Sales channel", "planned"],
] as const;

export const INTEGRATIONS = INTEGRATION_NAMES.map(([name, category, status], i) => ({
  id: `int_${i}`,
  name,
  category,
  status: status as "connected" | "available" | "beta" | "planned",
  events30d: status === "connected" ? 1200 + i * 417 : 0,
  lastSync: status === "connected" ? isoDaysBack(0, 6 + (i % 12), (i * 7) % 60) : null,
}));

export const SUBSCRIPTION_PLANS = [
  { name: "Starter", price: 29, merchants: 284, features: "1 store · 500 products · 2% extra commission" },
  { name: "Growth", price: 99, merchants: 168, features: "1 store · custom domain · abandoned cart" },
  { name: "Scale", price: 299, merchants: 54, features: "3 stores · AI design · priority support" },
  { name: "Platform", price: 0, merchants: 1, features: "First-party store · no commission" },
];

export const STORE_TEMPLATES = [
  { id: "FERRUM", name: "Ferrum", style: "Engineered dark, mono labels", tenants: 96 },
  { id: "CIRCUIT", name: "Circuit", style: "Technical light, dense grids", tenants: 154 },
  { id: "ATELIER", name: "Atelier", style: "Editorial fashion, wide margins", tenants: 212 },
  { id: "HEARTH", name: "Hearth", style: "Warm natural, soft radii", tenants: 168 },
  { id: "GRID", name: "Grid", style: "Terminal green, high contrast", tenants: 74 },
  { id: "CARAVAN", name: "Caravan", style: "Earthy, story-led", tenants: 121 },
  { id: "VELOCITY", name: "Velocity", style: "Sport, bold condensed", tenants: 88 },
];

export const AI_USAGE = {
  proposals: 18420,
  applied: 12060,
  acceptedRate: 65.5,
  tokens: 412_000_000,
  costUsd: 2840,
  creditsPerProposal: 2,
  byTenant: MERCHANTS.map((m, i) => ({
    merchantId: m.id,
    name: m.name,
    proposals: 240 + i * 137,
    applied: 160 + i * 96,
  })),
};

export const REFUNDS = ORDERS.filter((o) => o.payment === "refunded")
  .slice(0, 14)
  .map((o, i) => ({
    id: `rfd_${3100 + i}`,
    orderId: o.number,
    merchantId: o.merchantIds[0] ?? MERCHANTS[0].id,
    amount: o.total,
    reason: pickOne(["Customer changed mind", "Damaged in transit", "Duplicate order", "Item never arrived", "Wrong item shipped"], createRng(i + 3)),
    status: i % 4 === 0 ? "pending" : "refunded",
    at: o.placedAt,
  }));

export const REPORT_EXPORTS = [
  { id: "rep_1", name: "GMV by channel", cadence: "Monthly · CSV", lastRun: isoDaysBack(2, 6), rows: 12 },
  { id: "rep_2", name: "Merchant payouts", cadence: "Bi-weekly · CSV", lastRun: isoDaysBack(4, 6), rows: 168 },
  { id: "rep_3", name: "Commission statement", cadence: "Monthly · PDF", lastRun: isoDaysBack(6, 6), rows: 168 },
  { id: "rep_4", name: "Product performance", cadence: "Weekly · CSV", lastRun: isoDaysBack(1, 6), rows: 492 },
  { id: "rep_5", name: "AI design usage", cadence: "Weekly · CSV", lastRun: isoDaysBack(1, 7), rows: 7 },
  { id: "rep_6", name: "Dispute register", cadence: "On demand · CSV", lastRun: isoDaysBack(9, 6), rows: 11 },
];

export const ADMIN_SETTINGS_ROWS = [
  { group: "Marketplace", rows: [
    { label: "Base commission", value: "12%", detail: "Applies to every marketplace sale" },
    { label: "Payout schedule", value: "Bi-weekly", detail: "Fridays, T+4 after period close" },
    { label: "Payout hold", value: "4 days", detail: "After delivery confirmation" },
    { label: "Auto-approve stores", value: "On", detail: "Under $10k monthly GMV" },
  ]},
  { group: "Design Engine", rows: [
    { label: "AI assistant", value: "Enabled", detail: "2 credits per proposal, drafts only" },
    { label: "Auto-publish AI changes", value: "Off", detail: "Merchants approve every change" },
    { label: "Custom code blocks", value: "Scale plan", detail: "Blocked on Starter and Growth" },
    { label: "Template gallery", value: "7 templates", detail: "Curated, versioned with the platform" },
  ]},
  { group: "Platform", rows: [
    { label: "Default currency", value: "USD", detail: "6 currencies supported" },
    { label: "Marketplace countries", value: "7", detail: "Nigeria, US, UK, Kenya, South Africa, Ghana, UAE" },
    { label: "Guest checkout", value: "On", detail: "Account created on first order" },
    { label: "Review moderation", value: "Post-moderated", detail: "Auto-flag below 3 stars" },
  ]},
];

export const ADMIN_SECTIONS = [
  { slug: "dashboard", name: "Dashboard", group: "Overview", glyph: "LayoutDashboard" },
  { slug: "merchants", name: "Merchants", group: "Overview", glyph: "Store" },
  { slug: "customers", name: "Customers", group: "Overview", glyph: "Users" },
  { slug: "products", name: "Products", group: "Commerce", glyph: "Package" },
  { slug: "orders", name: "Orders", group: "Commerce", glyph: "ReceiptText" },
  { slug: "marketplace", name: "Marketplace", group: "Commerce", glyph: "Images" },
  { slug: "stores", name: "Stores", group: "Commerce", glyph: "Storefront" },
  { slug: "domains", name: "Domains", group: "Commerce", glyph: "Globe" },
  { slug: "categories", name: "Categories", group: "Commerce", glyph: "LayoutGrid" },
  { slug: "promotions", name: "Promotions", group: "Commerce", glyph: "BadgePercent" },
  { slug: "payments", name: "Payments", group: "Money", glyph: "CreditCard" },
  { slug: "payouts", name: "Payouts", group: "Money", glyph: "Banknote" },
  { slug: "commissions", name: "Commissions", group: "Money", glyph: "Percent" },
  { slug: "refunds", name: "Refunds", group: "Money", glyph: "Undo2" },
  { slug: "subscriptions", name: "Subscriptions", group: "Money", glyph: "Repeat" },
  { slug: "templates", name: "Templates", group: "Platform", glyph: "LayoutTemplate" },
  { slug: "ai-usage", name: "AI usage", group: "Platform", glyph: "Sparkles" },
  { slug: "countries", name: "Countries", group: "Platform", glyph: "MapPin" },
  { slug: "currencies", name: "Currencies", group: "Platform", glyph: "CircleDollarSign" },
  { slug: "integrations", name: "Integrations", group: "Platform", glyph: "Plug" },
  { slug: "disputes", name: "Disputes", group: "Governance", glyph: "Scale" },
  { slug: "reports", name: "Reports", group: "Governance", glyph: "FileSpreadsheet" },
  { slug: "audit-logs", name: "Audit logs", group: "Governance", glyph: "ScrollText" },
  { slug: "settings", name: "Settings", group: "Governance", glyph: "Settings" },
];

export function marketplaceFeed() {
  return PRODUCTS.filter((p) => p.status === "active" && p.channels.marketplace);
}

export function searchCatalog(
  query: string,
  opts: { category?: string; merchantId?: string; minPrice?: number; maxPrice?: number; rating?: number; channel?: Channel } = {},
) {
  const q = query.trim().toLowerCase();
  return PRODUCTS.filter((p) => {
    if (p.status !== "active") return false;
    if (opts.channel === "marketplace" && !p.channels.marketplace) return false;
    if (opts.category && p.category !== opts.category) return false;
    if (opts.merchantId && p.merchantId !== opts.merchantId) return false;
    if (opts.minPrice !== undefined && p.price < opts.minPrice) return false;
    if (opts.maxPrice !== undefined && p.price > opts.maxPrice) return false;
    if (opts.rating !== undefined && p.rating < opts.rating) return false;
    if (!q) return true;
    const haystack = `${p.title} ${p.category} ${p.tags.join(" ")} ${getMerchant(p.merchantId).name}`.toLowerCase();
    return q.split(/\s+/).every((token) => haystack.includes(token));
  });
}

export const COLLECTION_COUNTS = (() => {
  const map = new Map<string, number>();
  marketplaceFeed().forEach((p) => {
    p.collections.forEach((c) => map.set(c, (map.get(c) ?? 0) + 1));
  });
  return Array.from(map.entries()).map(([name, count]) => ({ name, count }));
})();

export const RELATED_LIMIT = 4;

export function relatedProducts(productId: string, count = RELATED_LIMIT) {
  const base = getProduct(productId);
  if (!base) return [];
  return PRODUCTS.filter(
    (p) =>
      p.id !== base.id &&
      p.status === "active" &&
      p.channels.marketplace &&
      (p.category === base.category || p.merchantId === base.merchantId),
  ).slice(0, count);
}

export function pickSeed<T>(arr: T[], n: number) {
  return pickMany(arr, n, createRng(n + 42));
}

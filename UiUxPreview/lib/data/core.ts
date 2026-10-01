import type { Address, Category, Customer } from "@/lib/types";

/** Seeded RNG — deterministic on server and client, so no hydration drift. */
export function createRng(seed: number) {
  let s = seed >>> 0;
  return function next() {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The prototype is presented as a snapshot of 1 Oct 2026. */
export const NOW = new Date("2026-10-01T09:00:00.000Z");

export function isoDaysBack(days: number, hour = 10, minute = 0) {
  const d = new Date(NOW);
  d.setUTCDate(d.getUTCDate() - days);
  d.setUTCHours(hour, minute, 0, 0);
  return d.toISOString();
}

export function dateDaysBack(days: number) {
  const d = new Date(NOW);
  d.setUTCDate(d.getUTCDate() - days);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export function pickOne<T>(arr: T[], rnd: () => number): T {
  return arr[Math.min(arr.length - 1, Math.floor(rnd() * arr.length))];
}

export function pickMany<T>(arr: T[], count: number, rnd: () => number): T[] {
  const copy = [...arr];
  const out: T[] = [];
  for (let i = 0; i < count && copy.length; i += 1) {
    out.push(copy.splice(Math.floor(rnd() * copy.length), 1)[0]);
  }
  return out;
}

export const PLATFORM = {
  name: "Ferixas Commerce",
  marketplaceDomain: "ferixas.com",
  merchantDomainSuffix: ".ferixas.com",
  currency: "USD",
  baseCommission: 12,
  founded: "2024",
  snapshot: NOW.toISOString(),
  countries: [
    { code: "NG", name: "Nigeria", stores: 412, share: 34 },
    { code: "US", name: "United States", stores: 286, share: 24 },
    { code: "GB", name: "United Kingdom", stores: 154, share: 13 },
    { code: "KE", name: "Kenya", stores: 121, share: 10 },
    { code: "ZA", name: "South Africa", stores: 96, share: 8 },
    { code: "GH", name: "Ghana", stores: 74, share: 6 },
    { code: "AE", name: "United Arab Emirates", stores: 61, share: 5 },
  ],
  currencies: [
    { code: "USD", symbol: "$", rate: 1, stores: 640, primary: true },
    { code: "NGN", symbol: "\u20a6", rate: 1580, stores: 398, primary: false },
    { code: "GBP", symbol: "\u00a3", rate: 0.79, stores: 149, primary: false },
    { code: "KES", symbol: "KSh", rate: 129, stores: 118, primary: false },
    { code: "ZAR", symbol: "R", rate: 18.4, stores: 92, primary: false },
    { code: "AED", symbol: "AED", rate: 3.67, stores: 58, primary: false },
  ],
};

export const CATEGORIES: Category[] = [
  { slug: "electronics", name: "Electronics", glyph: "Cpu", blurb: "Smart tech, cameras, power and home devices" },
  { slug: "audio", name: "Audio", glyph: "Headphones", blurb: "Headphones, speakers and studio gear" },
  { slug: "computing", name: "Computing", glyph: "Laptop", blurb: "Laptops, monitors, storage and peripherals" },
  { slug: "gaming", name: "Gaming", glyph: "Gamepad2", blurb: "Consoles, chairs, keyboards and mice" },
  { slug: "phones", name: "Phones & Tablets", glyph: "Smartphone", blurb: "Handsets, tablets and mobile accessories" },
  { slug: "fashion", name: "Fashion", glyph: "Shirt", blurb: "Tailoring, knitwear, bags and jewellery" },
  { slug: "home", name: "Home & Living", glyph: "Sofa", blurb: "Furniture, lighting, textiles and ceramics" },
  { slug: "beauty", name: "Beauty & Care", glyph: "Sparkles", blurb: "Skin, hair and personal care" },
  { slug: "sports", name: "Sports & Outdoor", glyph: "Dumbbell", blurb: "Training, running and recovery" },
  { slug: "pantry", name: "Pantry", glyph: "ShoppingBasket", blurb: "Coffee, tea, honey and staples" },
];

export const COLLECTIONS = [
  "New Arrivals",
  "Best Sellers",
  "Autumn Edit",
  "Under $100",
  "Premium Picks",
  "Home Refresh",
  "Work From Anywhere",
];

export type CustomerSeed = Omit<Customer, "orderCount" | "spent" | "lastOrderAt">;

const CUSTOMER_ROWS: [string, string, string, string, string][] = [
  ["Amara Okafor", "Lagos, Nigeria", "+234 803 411 2290", "2024-02-11", "vip"],
  ["Daniel Whitfield", "Manchester, United Kingdom", "+44 7700 900412", "2024-05-02", "returning"],
  ["Zainab Bello", "Abuja, Nigeria", "+234 806 220 7734", "2025-01-19", "returning"],
  ["Marcus Lindqvist", "Stockholm, Sweden", "+46 70 123 4488", "2024-11-08", "vip"],
  ["Chiamaka Eze", "Enugu, Nigeria", "+234 810 556 1180", "2025-06-21", "new"],
  ["Priya Raman", "Bengaluru, India", "+91 98450 33112", "2024-08-30", "returning"],
  ["Tomas Ferreira", "Lisbon, Portugal", "+351 912 004 551", "2025-03-14", "returning"],
  ["Grace Mwangi", "Nairobi, Kenya", "+254 722 445 109", "2024-09-25", "vip"],
  ["Jonah Berger", "Austin, United States", "+1 512 550 8871", "2025-02-03", "returning"],
  ["Halima Yusuf", "Kano, Nigeria", "+234 802 771 6634", "2025-07-11", "new"],
  ["Elena Petrova", "Berlin, Germany", "+49 151 2233 8890", "2024-06-17", "returning"],
  ["Kwame Mensah", "Accra, Ghana", "+233 24 551 9902", "2025-04-08", "returning"],
  ["Sofia Marchetti", "Milan, Italy", "+39 340 118 2277", "2024-12-01", "vip"],
  ["Ibrahim Diallo", "Dakar, Senegal", "+221 77 445 1120", "2025-05-26", "new"],
  ["Ruth Adeyemi", "Ibadan, Nigeria", "+234 805 993 4471", "2024-04-22", "returning"],
  ["Oliver Grant", "Toronto, Canada", "+1 416 220 7734", "2025-01-30", "returning"],
  ["Nadia Haddad", "Dubai, United Arab Emirates", "+971 50 447 8821", "2024-10-14", "vip"],
  ["Peter Nkemdirim", "Port Harcourt, Nigeria", "+234 807 118 2299", "2025-08-02", "new"],
  ["Lucia Santos", "S\u00e3o Paulo, Brazil", "+55 11 94002 8871", "2025-03-27", "returning"],
  ["Fatima Zahra", "Casablanca, Morocco", "+212 661 447 220", "2024-07-09", "returning"],
  ["Ethan Brooks", "Seattle, United States", "+1 206 883 1104", "2025-06-05", "new"],
  ["Adaeze Nwosu", "Lagos, Nigeria", "+234 809 221 7745", "2024-03-16", "vip"],
  ["Henrik Sørensen", "Copenhagen, Denmark", "+45 20 447 118", "2025-02-18", "returning"],
  ["Yusuf Kariuki", "Mombasa, Kenya", "+254 733 118 990", "2025-07-29", "new"],
  ["Mei Lin", "Singapore", "+65 8123 4471", "2024-11-21", "returning"],
  ["Samuel Oduya", "Kampala, Uganda", "+256 772 118 440", "2025-09-04", "new"],
];

export const CUSTOMER_SEEDS: CustomerSeed[] = CUSTOMER_ROWS.map(
  ([name, location, phone, since, segment], i) => ({
    id: `cus_${(1041 + i).toString(36)}${i}`,
    name,
    email: `${name.toLowerCase().replace(/[^a-z]+/g, ".")}@${["gmail.com", "outlook.com", "proton.me", "yahoo.com"][i % 4]}`,
    phone,
    location,
    since,
    segment: segment as Customer["segment"],
  }),
);

const ADDRESS_POOL: Address[] = CUSTOMER_SEEDS.map((c, i) => ({
  name: c.name,
  line1: `${[12, 44, 7, 121, 63, 8][i % 6]} ${["Marina Road", "Ademola Street", "Kingsway", "Rue de la Paix", "Uganda Road", "Awolowo Way"][i % 6]}`,
  city: c.location.split(",")[0],
  region: c.location.split(",")[1]?.trim() ?? "",
  country: c.location.split(",")[1]?.trim() ?? "",
  postcode: `${1000 + ((i * 137) % 8999)}`,
}));

export function addressFor(index: number): Address {
  return ADDRESS_POOL[index % ADDRESS_POOL.length];
}

export const CARRIERS = ["Ferixas Logistics", "DHL Express", "GIG Logistics", "Aramex", "Sendbox"];

export const REVIEW_TITLES = [
  "Exactly as described",
  "Better than I expected",
  "Great value for the price",
  "Solid, would buy again",
  "Good — with one caveat",
  "Premium feel, arrived fast",
  "Works perfectly",
  "Impressive build quality",
  "Not quite what I pictured",
  "My third order from this store",
];

export const REVIEW_BODIES = [
  "Packaging was clean, delivery took three days and everything matched the listing. No complaints at all.",
  "I use it daily now. The finish is better in person than in the photos and it feels like it will last.",
  "For the price this is hard to beat. I compared two other options before settling on this one.",
  "Ordered a second one for my brother. Setup took minutes and it has not skipped once.",
  "Does everything I need. Took a day to get used to, but now I would not swap it out.",
  "The store answered my question within an hour and shipped the same day. That sold me.",
  "Very happy. I deducted nothing — it simply does what was promised, which is rare.",
  "Solid build, thoughtful details. The instructions were thin, but I figured it out quickly.",
  "Quality is there. Slightly smaller than I imagined, so check the measurements before ordering.",
  "Been buying from this seller for a while. Consistent quality every single time.",
];

"use client";

import Link from "next/link";
import { ArrowRight, Boxes, Layers, PenTool, Store, Wrench } from "lucide-react";
import { ShopShell } from "@/components/shop/shop-shell";
import { Eyebrow } from "@/components/shop/primitives";

const PILLARS = [
  {
    icon: Boxes,
    name: "Commerce core",
    blurb: "One record per thing, shared by every storefront.",
    rows: [
      ["Products", "One catalog per merchant. Price, media, variants, SEO and inventory live once."],
      ["Orders", "Every order keeps the channel it came from: marketplace or merchant store."],
      ["Payments", "One payment from the customer, then split per seller with commission applied where it applies."],
      ["Customers", "Buyers are platform-level. Merchants see their own customers, the platform sees the aggregate."],
      ["Inventory", "One stock count per product, decremented by whichever channel sold it."],
      ["Sales channels", "Per product: my store, the marketplace, and any channel added later."],
    ],
  },
  {
    icon: PenTool,
    name: "Design engine",
    blurb: "A visual editor that produces a document, not a screenshot.",
    rows: [
      ["Visual canvas", "Three panels: layers, a live storefront canvas, and an inspector for the selected element."],
      ["Components", "Commerce-aware by default: product cards, grids, price, rating, add to cart, collections, reviews, stock state."],
      ["Responsive design", "Every element can carry its own tablet and mobile values, edited with the device switcher."],
      ["AI design assistant", "Conversational changes, always delivered as a draft with Apply, Revise and Cancel."],
      ["Templates", "Rhythm presets that change spacing, type scale and surfaces without touching content."],
      ["Versioning", "Save draft, preview, undo, redo, full history, revert, publish."],
    ],
  },
  {
    icon: Store,
    name: "Storefronts",
    blurb: "Three surfaces, one document format.",
    rows: [
      ["Ferixas marketplace", "The central shopping experience at ferixas.com, spanning every merchant."],
      ["Merchant stores", "Branded storefronts on merchant.ferixas.com, driven by that merchant's published design document."],
      ["Custom domains", "The same storefront served on the merchant's own domain once DNS is verified."],
      ["Ferixas Official Store", "The platform selling its own products through identical infrastructure, with no special cases."],
    ],
  },
];

export default function StructurePage() {
  return (
    <ShopShell>
      <div className="border-b border-line-warm bg-bone-soft/50">
        <div className="mx-auto max-w-[1240px] px-4 py-10">
          <Eyebrow className="text-ember">Product structure</Eyebrow>
          <h1 className="mt-3 max-w-[22ch] font-display text-[30px] font-bold leading-[1.05] tracking-[-0.02em] text-ink sm:text-[42px]">
            How Ferixas Commerce is put together
          </h1>
          <p className="mt-4 max-w-[68ch] text-[15px] leading-relaxed text-ink-soft">
            Three parts, deliberately separated. The commerce core owns facts. The design engine owns
            appearance. Storefronts are just places that render both. That split is why a merchant
            can redesign their store without touching an order, and why one product can appear in
            several places at once without being duplicated.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-[1240px] px-4 py-12">
        <div className="grid gap-4 lg:grid-cols-3">
          {PILLARS.map((pillar) => (
            <section
              key={pillar.name}
              className="rounded-[3px] border border-line-warm bg-white p-6"
            >
              <pillar.icon width={22} height={22} strokeWidth={1.5} className="text-ember" />
              <h2 className="mt-4 font-display text-[19px] font-semibold text-ink">{pillar.name}</h2>
              <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-soft">{pillar.blurb}</p>
              <dl className="mt-5 space-y-4 border-t border-line-warm pt-5">
                {pillar.rows.map(([label, body]) => (
                  <div key={label}>
                    <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink">
                      {label}
                    </dt>
                    <dd className="mt-1 text-[12.5px] leading-relaxed text-ink-soft">{body}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>

        <section className="mt-6 rounded-[3px] border border-line-warm bg-void p-6 text-chalk">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="max-w-[58ch]">
              <Eyebrow className="text-lime">The relationship in one line</Eyebrow>
              <p className="mt-3 font-display text-[20px] leading-snug text-chalk sm:text-[24px]">
                A product is a set of facts. A design document is a set of decisions. A storefront is
                the two rendered together for a specific audience.
              </p>
            </div>
            <div className="flex flex-col gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-chalk-dim">
              {[
                ["Products", "Ordered once"],
                ["Channels", "Chosen per product"],
                ["Design", "Published per merchant"],
                ["Checkout", "Shared by everything"],
              ].map(([label, detail]) => (
                <span key={label} className="flex items-center gap-3">
                  <span className="h-1.5 w-1.5 rounded-full bg-lime" />
                  <span className="text-chalk">{label}</span>
                  <span className="text-chalk-dim">{detail}</span>
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className="rounded-[3px] border border-line-warm bg-white p-6">
            <Layers width={20} height={20} strokeWidth={1.5} className="text-ember" />
            <h2 className="mt-4 font-display text-[18px] font-semibold text-ink">
              One product, many channels
            </h2>
            <p className="mt-2 text-[13.5px] leading-relaxed text-ink-soft">
              Untick the marketplace on a product and it disappears from ferixas.com immediately while
              the merchant's own storefront keeps selling it. Stock is shared, orders are tagged with
              the channel that produced them, and commission only applies where the platform made the
              sale.
            </p>
            <Link
              href="/merchant/products"
              className="mt-5 inline-flex cursor-pointer items-center gap-2 rounded-[2px] bg-ink px-4 py-2.5 text-[13px] text-bone transition-colors hover:bg-ember"
            >
              See it in product management <ArrowRight width={14} height={14} />
            </Link>
          </div>
          <div className="rounded-[3px] border border-line-warm bg-white p-6">
            <Wrench width={20} height={20} strokeWidth={1.5} className="text-ember" />
            <h2 className="mt-4 font-display text-[18px] font-semibold text-ink">
              What this prototype leaves out
            </h2>
            <ul className="mt-2 space-y-2 text-[13.5px] leading-relaxed text-ink-soft">
              <li>No production backend, database or authentication.</li>
              <li>No real payments, payouts, shipping or DNS.</li>
              <li>State lives in the browser session and resets on reload.</li>
              <li>Images are generated plates rather than licensed photography.</li>
            </ul>
            <Link
              href="/admin"
              className="mt-5 inline-flex cursor-pointer items-center gap-2 rounded-[2px] border border-ink/20 px-4 py-2.5 text-[13px] text-ink transition-colors hover:border-ink"
            >
              Open the control room <ArrowRight width={14} height={14} />
            </Link>
          </div>
        </section>
      </div>
    </ShopShell>
  );
}

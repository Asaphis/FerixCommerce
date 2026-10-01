"use client";

import Link from "next/link";
import {
  ArrowRight,
  Boxes,
  Check,
  Cpu,
  Dumbbell,
  Gamepad2,
  Globe2,
  Headphones,
  Laptop,
  Layers,
  Plus,
  RotateCcw,
  ShieldCheck,
  Shirt,
  ShoppingBasket,
  Smartphone,
  Sofa,
  Sparkles,
  Store,
  Truck,
  type LucideIcon,
} from "lucide-react";
import { CATEGORIES, getMerchant } from "@/lib/data";
import { money, num } from "@/lib/format";
import { useFerixas } from "@/lib/store";
import { ShopShell } from "@/components/shop/shop-shell";
import { PromoSlider } from "@/components/shop/promo-slider";
import { ProductCard, ProductRail } from "@/components/shop/product-card";
import { ProductPlate } from "@/components/shop/product-plate";
import { Eyebrow, Rating, SectionHead } from "@/components/shop/primitives";
import { cn } from "@/lib/utils";

const CATEGORY_GLYPHS: Record<string, LucideIcon> = {
  electronics: Cpu,
  audio: Headphones,
  computing: Laptop,
  gaming: Gamepad2,
  phones: Smartphone,
  fashion: Shirt,
  home: Sofa,
  beauty: Sparkles,
  sports: Dumbbell,
  pantry: ShoppingBasket,
};

export default function MarketplaceHome() {
  const { products, merchants, banners } = useFerixas();

  const feed = products.filter((p) => p.status === "active" && p.channels.marketplace);
  const trending = [...feed].sort((a, b) => b.sold30d - a.sold30d).slice(0, 8);
  const fresh = [...feed].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)).slice(0, 8);
  const under = feed.filter((p) => p.price < 100).slice(0, 8);
  const official = feed.filter((p) => p.merchantId === "ferixas-official").slice(0, 4);
  const channelsProduct =
    products.find((p) => p.slug === "aurasound-pro-anc-headphones") ?? feed[0];
  const liveBanners = banners.filter((b) => b.active);

  return (
    <ShopShell>
      <PromoSlider banners={banners} />

      {liveBanners.length < 2 ? (
        <div className="border-b border-line-warm bg-bone-soft/60 px-4 py-3">
          <p className="mx-auto flex max-w-[1240px] flex-wrap items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-soft">
            <span className="text-ember">{liveBanners.length} live banner{liveBanners.length === 1 ? "" : "s"}</span>
            <span>\u00b7</span>
            <Link href="/admin/marketplace" className="text-ink underline decoration-ember decoration-2 underline-offset-4">
              Manage the promotional banners
            </Link>
          </p>
        </div>
      ) : null}

      <section className="mx-auto max-w-[1240px] px-4 py-12">
        <SectionHead
          eyebrow="Categories"
          title="Shop the whole platform by department"
          action={
            <Link
              href="/browse"
              className="group inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft transition-colors hover:text-ember"
            >
              All {CATEGORIES.length} departments
              <ArrowRight width={14} height={14} className="transition-transform group-hover:translate-x-0.5" />
            </Link>
          }
        />
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
          {CATEGORIES.map((category) => {
            const Icon = CATEGORY_GLYPHS[category.slug] ?? Boxes;
            const count = feed.filter((p) => p.category === category.slug).length;
            return (
              <Link
                key={category.slug}
                href={`/browse?category=${category.slug}`}
                className="group relative overflow-hidden rounded-[3px] border border-line-warm bg-white p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-ink/25"
              >
                <Icon width={22} height={22} strokeWidth={1.4} className="text-ember" />
                <p className="mt-8 font-display text-[15px] font-semibold text-ink">{category.name}</p>
                <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft">
                  {count} listed
                </p>
                <span className="absolute -bottom-6 -right-4 opacity-[0.06] transition-opacity duration-300 group-hover:opacity-[0.12]">
                  <Icon width={84} height={84} strokeWidth={0.8} />
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-[1240px] px-4 pb-12">
        <SectionHead
          eyebrow="Trending this month"
          title="What the marketplace is buying"
          action={
            <Link
              href="/browse?sort=best"
              className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft transition-colors hover:text-ember"
            >
              See all
            </Link>
          }
        />
        <ProductRail products={trending} />
      </section>

      <section className="border-y border-hairline bg-void">
        <div className="mx-auto max-w-[1240px] px-4 py-14">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <Eyebrow className="text-lime">Platform as merchant</Eyebrow>
              <h2 className="mt-3 font-display text-[30px] font-semibold leading-tight text-chalk sm:text-[38px]">
                Ferixas Official Store
              </h2>
              <p className="mt-4 max-w-[46ch] text-[14.5px] leading-relaxed text-chalk-dim">
                The platform sells its own hardware through exactly the same catalog, the same
                channels and the same checkout as every other tenant. Nothing special-cased,
                nothing privileged.
              </p>
              <div className="mt-6 flex flex-wrap gap-2.5">
                {["Same product model", "Same storefront engine", "Same checkout"].map((item) => (
                  <span
                    key={item}
                    className="inline-flex items-center gap-1.5 rounded-[2px] border border-hairline px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-chalk-dim"
                  >
                    <Check width={12} height={12} className="text-lime" />
                    {item}
                  </span>
                ))}
              </div>
              <Link
                href="/store/ferixas-official"
                className="mt-7 inline-flex cursor-pointer items-center gap-2 rounded-[2px] bg-lime px-5 py-3 text-[13.5px] font-semibold text-void transition-colors hover:bg-chalk"
              >
                <Store width={16} height={16} />
                Open the official store
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {official.map((product) => (
                <ProductCard key={product.id} product={product} tone="dark" />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1240px] px-4 py-14">
        <SectionHead eyebrow="One product, every channel" title="Nothing is duplicated per storefront" />
        <div className="grid gap-10 lg:grid-cols-[1fr_1.05fr] lg:items-center">
          <div className="rounded-[3px] border border-line-warm bg-white p-5">
            <div className="flex items-start gap-4">
              {channelsProduct ? (
                <ProductPlate product={channelsProduct} className="h-24 w-24 shrink-0 rounded-[3px]" />
              ) : null}
              <div className="min-w-0">
                <Eyebrow className="text-ink-soft">Single product record</Eyebrow>
                <p className="mt-1.5 font-display text-[16px] font-semibold text-ink">
                  {channelsProduct?.title}
                </p>
                <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft">
                  SKU {channelsProduct?.sku} \u00b7 {channelsProduct?.stock} in stock
                </p>
                <p className="mt-2 font-mono text-[12px] text-ink-soft">
                  price, variants, media and inventory live in one place
                </p>
              </div>
            </div>
            <div className="mt-5 space-y-2.5 border-t border-line-warm pt-5">
              {[
                { label: "My own store", detail: "abc.ferixas.com", on: channelsProduct?.channels.store },
                { label: "Ferixas Marketplace", detail: "ferixas.com", on: channelsProduct?.channels.marketplace },
                { label: "Future channel", detail: "not enabled yet", on: false },
              ].map((row) => (
                <div
                  key={row.label}
                  className={cn(
                    "flex items-center gap-3 rounded-[2px] border px-3 py-2.5",
                    row.on ? "border-ink/20 bg-bone" : "border-line-warm bg-bone-soft/50 opacity-60",
                  )}
                >
                  <span
                    className={cn(
                      "grid h-4 w-4 shrink-0 place-items-center rounded-[2px] border",
                      row.on ? "border-ink bg-ink text-lime" : "border-ink/25 text-transparent",
                    )}
                  >
                    <Check width={11} height={11} />
                  </span>
                  <span className="text-[13.5px] font-medium text-ink">{row.label}</span>
                  <span className="ml-auto font-mono text-[10.5px] text-ink-soft">{row.detail}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[15px] leading-relaxed text-ink-soft">
              A merchant has one catalog. Each product decides where it is sold. Turn the
              marketplace off and the product disappears from ferixas.com while the merchant store
              keeps selling it at the same stock count.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {[
                { icon: Layers, title: "One inventory", body: "Stock decrements once, whichever channel the order came from." },
                { icon: Globe2, title: "Two storefronts", body: "A branded merchant store and a listing on the marketplace." },
                { icon: Boxes, title: "Split reporting", body: "Every order is tagged with the channel that produced it." },
                { icon: Plus, title: "More channels later", body: "The same model carries social and retail channels." },
              ].map((item) => (
                <div key={item.title} className="rounded-[3px] border border-line-warm bg-white p-4">
                  <item.icon width={19} height={19} strokeWidth={1.5} className="text-ember" />
                  <p className="mt-3 font-display text-[14.5px] font-semibold text-ink">{item.title}</p>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-ink-soft">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1240px] px-4 pb-14">
        <SectionHead
          eyebrow="New arrivals"
          title="Fresh from merchant catalogs"
          action={
            <Link
              href="/browse?sort=new"
              className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft transition-colors hover:text-ember"
            >
              See all
            </Link>
          }
        />
        <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
          {fresh.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      <section className="border-y border-line-warm bg-bone-soft/60">
        <div className="mx-auto max-w-[1240px] px-4 py-14">
          <SectionHead
            eyebrow="Merchant stores"
            title="Shop a single brand, end to end"
            action={
              <Link
                href="/stores"
                className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft transition-colors hover:text-ember"
              >
                All {merchants.length} stores
              </Link>
            }
          />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {merchants.slice(0, 6).map((merchant) => {
              const count = products.filter(
                (p) => p.merchantId === merchant.id && p.status === "active",
              ).length;
              return (
                <Link
                  key={merchant.id}
                  href={`/store/${merchant.slug}`}
                  className="group relative overflow-hidden rounded-[3px] border border-line-warm bg-white p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-ink/25"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div
                      className="grid h-11 w-11 place-items-center rounded-[2px] font-display text-[16px] font-extrabold"
                      style={{ background: merchant.brand.accent, color: merchant.brand.accentInk }}
                    >
                      {merchant.name.slice(0, 1)}
                    </div>
                    <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft">
                      {merchant.brand.template}
                    </span>
                  </div>
                  <p className="mt-4 font-display text-[16px] font-semibold text-ink">{merchant.name}</p>
                  <p className="mt-1.5 line-clamp-2 text-[13px] leading-relaxed text-ink-soft">
                    {merchant.tagline}
                  </p>
                  <div className="mt-4 flex items-center justify-between border-t border-line-warm pt-3">
                    <Rating value={merchant.rating} count={merchant.reviewCount} size={11} />
                    <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft">
                      {count} products
                    </span>
                  </div>
                  <span
                    className="absolute inset-x-0 bottom-0 h-[3px] scale-x-0 transition-transform duration-300 group-hover:scale-x-100"
                    style={{ background: merchant.brand.accent }}
                  />
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1240px] px-4 py-14">
        <SectionHead eyebrow="Under $100" title="Small things, real quality" />
        <ProductRail products={under} />
      </section>

      <section className="border-t border-line-warm bg-bone-soft/40">
        <div className="mx-auto grid max-w-[1240px] gap-6 px-4 py-10 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Truck, title: "Delivery in 2-5 days", body: "Tracked across 7 countries" },
            { icon: ShieldCheck, title: "Buyer protection", body: "Refunded if it never arrives" },
            { icon: RotateCcw, title: "30-day returns", body: "Free on orders above $120" },
            { icon: Store, title: "Merchant support", body: "Answered by the seller, not a bot" },
          ].map((item) => (
            <div key={item.title} className="flex items-start gap-3">
              <item.icon width={20} height={20} strokeWidth={1.5} className="mt-0.5 shrink-0 text-ember" />
              <div>
                <p className="font-display text-[14px] font-semibold text-ink">{item.title}</p>
                <p className="mt-0.5 text-[12.5px] text-ink-soft">{item.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <p className="mx-auto max-w-[1240px] px-4 pb-10 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-soft/70">
        {num(feed.length)} products \u00b7 {merchants.length} merchant stores \u00b7 one cart and one checkout
      </p>
    </ShopShell>
  );
}

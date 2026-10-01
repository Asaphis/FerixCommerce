"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, BadgeCheck, MapPin, Package, Search, Star } from "lucide-react";
import { num } from "@/lib/format";
import { useFerixas } from "@/lib/store";
import { ShopShell } from "@/components/shop/shop-shell";
import { ProductCard } from "@/components/shop/product-card";
import { Rating, SectionHead } from "@/components/shop/primitives";
import { cn } from "@/lib/utils";

export default function StoresPage() {
  const { merchants, products, follows, toggleFollow } = useFerixas();
  const [query, setQuery] = useState("");

  const rows = merchants.filter((merchant) => {
    if (!query.trim()) return true;
    const hay = `${merchant.name} ${merchant.tagline} ${merchant.location}`.toLowerCase();
    return query.trim().toLowerCase().split(/\s+/).every((t) => hay.includes(t));
  });

  const featured = products
    .filter((p) => p.status === "active" && p.channels.marketplace)
    .sort((a, b) => b.sold30d - a.sold30d)
    .slice(0, 4);

  return (
    <ShopShell>
      <div className="border-b border-line-warm bg-bone-soft/50">
        <div className="mx-auto max-w-[1240px] px-4 py-8">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ember">
            Merchant stores
          </span>
          <h1 className="mt-3 font-display text-[28px] font-bold tracking-[-0.02em] text-ink sm:text-[34px]">
            Every brand here runs its own storefront
          </h1>
          <p className="mt-2 max-w-[64ch] text-[14px] leading-relaxed text-ink-soft">
            Each merchant designs their store in the Ferixas Design Engine, connects a domain, and
            chooses which products also appear on the marketplace. Buying from a store uses the same
            cart and the same checkout.
          </p>
          <div className="relative mt-6 max-w-[420px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search stores"
              aria-label="Search stores"
              className="h-11 w-full rounded-[2px] border border-ink/15 bg-white pl-9 pr-3 text-[13.5px] outline-none focus:border-ink"
            />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1240px] px-4 py-10">
        <div className="grid gap-4 lg:grid-cols-2">
          {rows.map((merchant) => {
            const catalog = products.filter(
              (p) => p.merchantId === merchant.id && p.status === "active",
            );
            const listed = catalog.filter((p) => p.channels.marketplace).length;
            return (
              <article
                key={merchant.id}
                className="overflow-hidden rounded-[3px] border border-line-warm bg-white transition-all duration-300 hover:-translate-y-0.5 hover:border-ink/25"
              >
                <div className="h-2" style={{ background: merchant.brand.accent }} />
                <div className="p-5">
                  <div className="flex items-start gap-4">
                    <span
                      className="grid h-12 w-12 shrink-0 place-items-center rounded-[2px] font-display text-[18px] font-extrabold"
                      style={{ background: merchant.brand.accent, color: merchant.brand.accentInk }}
                    >
                      {merchant.name.slice(0, 1)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/store/${merchant.slug}`}
                        className="flex items-center gap-1.5 font-display text-[17px] font-semibold text-ink transition-colors hover:text-ember"
                      >
                        {merchant.name}
                        {merchant.verified ? (
                          <BadgeCheck width={14} height={14} className="text-ember" />
                        ) : null}
                      </Link>
                      <p className="mt-1 text-[13px] leading-relaxed text-ink-soft">{merchant.tagline}</p>
                      <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft">
                        <span className="flex items-center gap-1.5">
                          <MapPin width={11} height={11} /> {merchant.location}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Package width={11} height={11} /> {catalog.length} products
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Star width={11} height={11} /> {merchant.rating}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-3 border-t border-line-warm pt-4">
                    {[
                      ["Followers", num(merchant.followers, { compact: true })],
                      ["On marketplace", `${listed}`],
                      ["Theme", merchant.brand.template],
                    ].map(([label, value]) => (
                      <div key={label}>
                        <p className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-ink-soft">
                          {label}
                        </p>
                        <p className="mt-1 font-mono text-[13px] text-ink">{value}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link
                      href={`/store/${merchant.slug}`}
                      className="inline-flex cursor-pointer items-center gap-2 rounded-[2px] bg-ink px-4 py-2.5 text-[13px] text-bone transition-colors hover:bg-ember"
                    >
                      Open store <ArrowRight width={14} height={14} />
                    </Link>
                    <button
                      type="button"
                      onClick={() => toggleFollow(merchant.id)}
                      className={cn(
                        "cursor-pointer rounded-[2px] border px-4 py-2.5 text-[13px] transition-colors",
                        follows.includes(merchant.id)
                          ? "border-ember bg-ember text-white"
                          : "border-ink/20 text-ink hover:border-ink",
                      )}
                    >
                      {follows.includes(merchant.id) ? "Following" : "Follow"}
                    </button>
                    <span className="ml-auto self-center">
                      <Rating value={merchant.rating} count={merchant.reviewCount} size={11} />
                    </span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        <div className="mt-14">
          <SectionHead
            eyebrow="Selling across the platform"
            title="Best sellers right now"
            action={
              <Link
                href="/browse?sort=best"
                className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-soft transition-colors hover:text-ember"
              >
                See the full ranking
              </Link>
            }
          />
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-4">
            {featured.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </div>
    </ShopShell>
  );
}

"use client";

import Link from "next/link";
import {
  ArrowRight,
  Minus,
  PackageCheck,
  Plus,
  ShoppingBag,
  Trash2,
  Truck,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { getMerchant } from "@/lib/data";
import { money } from "@/lib/format";
import { useFerixas } from "@/lib/store";
import { ShopShell } from "@/components/shop/shop-shell";
import { ProductPlate } from "@/components/shop/product-plate";
import { ProductRail } from "@/components/shop/product-card";
import { Eyebrow } from "@/components/shop/primitives";

export default function CartPage() {
  const { cart, products, productById, setQty, removeLine, clearCart } = useFerixas();

  const lines = cart.map((line) => ({ line, product: productById(line.productId) }));
  const groups = new Map<string, { merchantId: string; rows: typeof lines; subtotal: number }>();

  lines.forEach((entry) => {
    if (!entry.product) return;
    const merchantId = entry.product.merchantId;
    const group = groups.get(merchantId) ?? { merchantId, rows: [], subtotal: 0 };
    group.rows.push(entry);
    group.subtotal += entry.product.price * entry.line.qty;
    groups.set(merchantId, group);
  });

  const grouped = Array.from(groups.values());
  const subtotal = grouped.reduce((s, g) => s + g.subtotal, 0);
  const shipping = subtotal === 0 ? 0 : subtotal > 120 ? 0 : 9.9 * Math.max(1, grouped.length);
  const tax = Math.round(subtotal * 0.075 * 100) / 100;
  const total = Math.round((subtotal + shipping + tax) * 100) / 100;

  const suggestions = products
    .filter(
      (p) =>
        p.status === "active" && p.channels.marketplace && !cart.some((l) => l.productId === p.id),
    )
    .slice(0, 6);

  if (!grouped.length) {
    return (
      <ShopShell>
        <div className="mx-auto max-w-[680px] px-4 py-20 text-center">
          <ShoppingBag width={28} height={28} className="mx-auto text-ink-soft" />
          <h1 className="mt-4 font-display text-[24px] font-semibold text-ink">Your cart is empty</h1>
          <p className="mt-2 text-[13.5px] leading-relaxed text-ink-soft">
            Products from any merchant on the platform go into this one cart. Add something and you
            will see it grouped by seller, with one checkout at the end.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href="/browse"
              className="inline-flex cursor-pointer items-center gap-2 rounded-[2px] bg-ink px-5 py-3 text-[13.5px] text-bone transition-colors hover:bg-ember"
            >
              Browse the marketplace <ArrowRight width={15} height={15} />
            </Link>
            <Link
              href="/stores"
              className="inline-flex cursor-pointer items-center gap-2 rounded-[2px] border border-ink/20 px-5 py-3 text-[13.5px] text-ink transition-colors hover:border-ink"
            >
              Visit a merchant store
            </Link>
          </div>
          <div className="mt-14 text-left">
            <Eyebrow className="text-ember">Popular right now</Eyebrow>
            <div className="mt-4">
              <ProductRail products={suggestions} />
            </div>
          </div>
        </div>
      </ShopShell>
    );
  }

  return (
    <ShopShell>
      <div className="mx-auto max-w-[1240px] px-4 py-8">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line-warm pb-5">
          <div>
            <Eyebrow className="text-ember">One cart, many sellers</Eyebrow>
            <h1 className="mt-2 font-display text-[26px] font-bold tracking-[-0.02em] text-ink sm:text-[32px]">
              Your cart
            </h1>
            <p className="mt-1.5 flex items-center gap-2 text-[13px] text-ink-soft">
              <Users width={14} height={14} />
              {grouped.length} merchant{grouped.length === 1 ? "" : "s"} \u00b7{" "}
              {lines.reduce((s, l) => s + l.line.qty, 0)} items \u00b7 one checkout
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              clearCart();
              toast.success("Cart cleared");
            }}
            className="cursor-pointer font-mono text-[10.5px] uppercase tracking-[0.12em] text-ink-soft transition-colors hover:text-ember"
          >
            Clear cart
          </button>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1.55fr_1fr] lg:gap-12">
          <div className="mt-6 space-y-6">
            {grouped.map((group) => {
              const merchant = getMerchant(group.merchantId);
              return (
                <section key={group.merchantId} className="rounded-[3px] border border-line-warm bg-white">
                  <header className="flex flex-wrap items-center gap-3 border-b border-line-warm px-4 py-3">
                    <span
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-[2px] font-display text-[13px] font-extrabold"
                      style={{ background: merchant.brand.accent, color: merchant.brand.accentInk }}
                    >
                      {merchant.name.slice(0, 1)}
                    </span>
                    <div className="min-w-0">
                      <Link
                        href={`/store/${merchant.slug}`}
                        className="block truncate text-[13.5px] font-medium text-ink transition-colors hover:text-ember"
                      >
                        {merchant.name}
                      </Link>
                      <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft">
                        Ships from {merchant.location.split(",")[0]} \u00b7 {merchant.fulfilmentRate}% on time
                      </p>
                    </div>
                    <span className="ml-auto font-mono text-[13px] tabular-nums text-ink">
                      {money(group.subtotal)}
                    </span>
                  </header>

                  <ul className="divide-y divide-line-warm">
                    {group.rows.map(({ line, product }) => {
                      if (!product) return null;
                      return (
                        <li key={line.key} className="flex gap-4 p-4">
                          <Link href={`/product/${product.slug}`} className="shrink-0">
                            <ProductPlate
                              product={product}
                              className="h-[92px] w-[92px] rounded-[2px]"
                              showSku={false}
                            />
                          </Link>
                          <div className="min-w-0 flex-1">
                            <Link
                              href={`/product/${product.slug}`}
                              className="font-display text-[14.5px] font-semibold text-ink transition-colors hover:text-ember"
                            >
                              {product.title}
                            </Link>
                            {line.variant ? (
                              <p className="mt-1 font-mono text-[10.5px] uppercase tracking-[0.12em] text-ink-soft">
                                {line.variant}
                              </p>
                            ) : null}
                            <p className="mt-1.5 font-mono text-[12.5px] text-ink-soft">
                              {money(product.price)} each
                            </p>
                            <div className="mt-3 flex flex-wrap items-center gap-3">
                              <div className="flex items-center rounded-[2px] border border-ink/15">
                                <button
                                  type="button"
                                  onClick={() => setQty(line.key, line.qty - 1)}
                                  aria-label="Decrease quantity"
                                  className="grid h-9 w-9 cursor-pointer place-items-center text-ink transition-colors hover:bg-bone-soft"
                                >
                                  <Minus width={13} height={13} />
                                </button>
                                <span className="w-8 text-center font-mono text-[13px] tabular-nums text-ink">
                                  {line.qty}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setQty(line.key, line.qty + 1)}
                                  aria-label="Increase quantity"
                                  className="grid h-9 w-9 cursor-pointer place-items-center text-ink transition-colors hover:bg-bone-soft"
                                >
                                  <Plus width={13} height={13} />
                                </button>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  removeLine(line.key);
                                  toast.success(`${product.title} removed`);
                                }}
                                className="inline-flex cursor-pointer items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-[0.12em] text-ink-soft transition-colors hover:text-ember"
                              >
                                <Trash2 width={12} height={12} /> Remove
                              </button>
                            </div>
                          </div>
                          <span className="shrink-0 font-mono text-[14px] font-semibold tabular-nums text-ink">
                            {money(product.price * line.qty)}
                          </span>
                        </li>
                      );
                    })}
                  </ul>

                  <footer className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-line-warm bg-bone-soft/40 px-4 py-3">
                    <span className="flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.12em] text-ink-soft">
                      <Truck width={12} height={12} />
                      {group.subtotal > 120 ? "Free delivery from this seller" : "Delivery calculated at checkout"}
                    </span>
                    <span className="flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.12em] text-ink-soft">
                      <PackageCheck width={12} height={12} /> Packed separately by this seller
                    </span>
                  </footer>
                </section>
              );
            })}
          </div>

          <div className="lg:sticky lg:top-[132px] lg:mt-6 lg:self-start">
            <div className="rounded-[3px] border border-line-warm bg-white p-5">
              <h2 className="font-display text-[16px] font-semibold text-ink">Order summary</h2>
              <dl className="mt-4 grid gap-2.5">
                <div className="flex items-center justify-between">
                  <dt className="text-[13px] text-ink-soft">Subtotal</dt>
                  <dd className="font-mono text-[13px] tabular-nums text-ink">{money(subtotal)}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-[13px] text-ink-soft">
                    Delivery ({grouped.length} seller{grouped.length === 1 ? "" : "s"})
                  </dt>
                  <dd className="font-mono text-[13px] tabular-nums text-ink">
                    {shipping ? money(shipping) : "Free"}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-[13px] text-ink-soft">Estimated tax</dt>
                  <dd className="font-mono text-[13px] tabular-nums text-ink">{money(tax)}</dd>
                </div>
                <div className="mt-1 flex items-center justify-between border-t border-line-warm pt-3">
                  <dt className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft">
                    Total
                  </dt>
                  <dd className="font-mono text-[18px] font-semibold tabular-nums text-ink">
                    {money(total)}
                  </dd>
                </div>
              </dl>

              <Link
                href="/checkout"
                className="mt-5 flex h-12 cursor-pointer items-center justify-center gap-2 rounded-[2px] bg-ink text-[14px] font-medium text-bone transition-colors hover:bg-ember"
              >
                Checkout \u00b7 {money(total)} <ArrowRight width={15} height={15} />
              </Link>

              <p className="mt-4 border-t border-line-warm pt-4 font-mono text-[10.5px] leading-relaxed text-ink-soft">
                Each seller is paid separately by Ferixas: marketplace orders carry the platform
                commission, store orders do not. You pay once.
              </p>
            </div>

            <div className="mt-4 rounded-[3px] border border-line-warm bg-white p-5">
              <Eyebrow className="text-ember">Add before you check out</Eyebrow>
              <div className="mt-3">
                <ProductRail products={suggestions.slice(0, 4)} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </ShopShell>
  );
}

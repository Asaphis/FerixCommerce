"use client";

import Link from "next/link";
import { Heart, Plus, Store } from "lucide-react";
import { cn } from "@/lib/utils";
import { getMerchant } from "@/lib/data";
import { useFerixas } from "@/lib/store";
import type { Product } from "@/lib/types";
import { ProductPlate } from "./product-plate";
import { Price, Rating, StockHint } from "./primitives";

export function ProductCard({
  product,
  layout = "grid",
  tone = "light",
  className,
}: {
  product: Product;
  layout?: "grid" | "rail";
  tone?: "light" | "dark";
  className?: string;
}) {
  const { wishlist, toggleWishlist, addToCart } = useFerixas();
  const merchant = getMerchant(product.merchantId);
  const saved = wishlist.includes(product.id);
  const dark = tone === "dark";

  return (
    <article
      className={cn(
        "group relative flex flex-col",
        layout === "rail" && "w-[190px] shrink-0 snap-start sm:w-[230px]",
        className,
      )}
    >
      <Link
        href={`/product/${product.slug}`}
        className="relative block aspect-square overflow-hidden rounded-[3px]"
        aria-label={product.title}
      >
        <ProductPlate
          product={product}
          className="h-full w-full transition-transform duration-[600ms] ease-out group-hover:scale-[1.045]"
          tone={tone}
        />
        <span className="pointer-events-none absolute inset-0 border border-ink/8 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        {product.compareAt ? (
          <span className="absolute bottom-2.5 left-2.5 rounded-[2px] bg-ink px-2 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-lime">
            On offer
          </span>
        ) : null}
      </Link>

      <button
        type="button"
        onClick={() => toggleWishlist(product.id)}
        aria-label={saved ? "Remove from wishlist" : "Save to wishlist"}
        className={cn(
          "absolute right-2.5 top-2.5 grid h-8 w-8 cursor-pointer place-items-center rounded-full border backdrop-blur-sm transition-all duration-200",
          saved
            ? "border-ember bg-ember text-white"
            : "border-transparent bg-white/75 text-ink hover:border-ink/15 hover:bg-white",
        )}
      >
        <Heart width={15} height={15} className={saved ? "fill-white" : ""} />
      </button>

      <div className="mt-3 flex flex-1 flex-col">
        <Link
          href={`/store/${merchant.slug}`}
          className={cn(
            "inline-flex items-center gap-1.5 font-mono text-[9.5px] uppercase tracking-[0.16em] transition-colors",
            dark ? "text-chalk-dim hover:text-lime" : "text-ink-soft hover:text-ember",
          )}
        >
          <Store width={11} height={11} />
          {merchant.name}
        </Link>

        <h3 className="mt-1.5">
          <Link
            href={`/product/${product.slug}`}
            className={cn(
              "font-display text-[14.5px] font-semibold leading-snug transition-colors line-clamp-2",
              dark ? "text-chalk hover:text-lime" : "text-ink hover:text-ember",
            )}
          >
            {product.title}
          </Link>
        </h3>

        <div className={cn("mt-1.5", dark ? "text-chalk-dim" : "text-ink-soft")}>
          <Rating value={product.rating} count={product.reviewCount} />
        </div>

        <div className="mt-2.5 flex items-end justify-between gap-2">
          <div className={dark ? "text-chalk" : "text-ink"}>
            <Price price={product.price} compareAt={product.compareAt} />
          </div>
          <button
            type="button"
            disabled={product.stock <= 0}
            onClick={() => addToCart(product.id, null, 1)}
            aria-label={`Add ${product.title} to cart`}
            className={cn(
              "grid h-8 w-8 cursor-pointer place-items-center rounded-[2px] border transition-all duration-200",
              product.stock <= 0
                ? "cursor-not-allowed border-ink/10 text-ink/25"
                : dark
                  ? "border-hairline text-chalk hover:border-lime hover:bg-lime hover:text-void"
                  : "border-ink/15 text-ink hover:border-ink hover:bg-ink hover:text-bone",
            )}
          >
            <Plus width={15} height={15} />
          </button>
        </div>

        <div className={cn("mt-2", dark ? "text-chalk-dim" : "text-ink-soft")}>
          <StockHint stock={product.stock} lowAt={product.lowStockAt} />
        </div>
      </div>
    </article>
  );
}

export function ProductRail({
  products,
  tone = "light",
}: {
  products: Product[];
  tone?: "light" | "dark";
}) {
  return (
    <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-3 sm:mx-0 sm:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} layout="rail" tone={tone} />
      ))}
    </div>
  );
}

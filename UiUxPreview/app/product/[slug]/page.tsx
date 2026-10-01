"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  Check,
  Heart,
  Link2,
  Minus,
  Package,
  Plus,
  RotateCcw,
  Share2,
  ShieldCheck,
  Star,
  Truck,
} from "lucide-react";
import { toast } from "sonner";
import { RELATED_LIMIT, getMerchant, ratingBreakdown, relatedProducts, reviewsOf } from "@/lib/data";
import { dateShort, money, num } from "@/lib/format";
import { useFerixas } from "@/lib/store";
import type { Review } from "@/lib/types";
import { ShopShell } from "@/components/shop/shop-shell";
import { ProductRail } from "@/components/shop/product-card";
import { ProductPlate } from "@/components/shop/product-plate";
import { Eyebrow, Price, Rating, StockHint } from "@/components/shop/primitives";
import { cn } from "@/lib/utils";

const TABS = ["Description", "Specifications", "Reviews", "Shipping & returns"] as const;
type Tab = (typeof TABS)[number];

export default function ProductPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const { products, productBySlug, addToCart, wishlist, toggleWishlist, follows, toggleFollow, cartCount } =
    useFerixas();

  const product = productBySlug(params.slug) ?? products.find((p) => p.slug === params.slug);
  const [activePlate, setActivePlate] = useState(0);
  const [tab, setTab] = useState<Tab>("Description");
  const [selectedVariant, setSelectedVariant] = useState<Record<string, string>>({});
  const [qty, setQty] = useState(1);
  const [extraReviews, setExtraReviews] = useState<Review[]>([]);
  const [reviewForm, setReviewForm] = useState({ rating: 5, title: "", body: "" });
  const [helpful, setHelpful] = useState<string[]>([]);

  const seeded = product ? reviewsOf(product.id) : [];
  const reviews = useMemo(() => [...extraReviews, ...seeded], [extraReviews, seeded]);
  const breakdown = useMemo(
    () =>
      product
        ? ratingBreakdown(product.id).map((row) => ({
            ...row,
            count:
              row.count +
              extraReviews.filter((r) => r.rating === row.star).length,
          }))
        : [],
    [product, extraReviews],
  );
  const related = product ? relatedProducts(product.id, RELATED_LIMIT) : [];

  if (!product) {
    return (
      <ShopShell>
        <div className="mx-auto max-w-[620px] px-4 py-24 text-center">
          <Package width={26} height={26} className="mx-auto text-ink-soft" />
          <h1 className="mt-4 font-display text-[22px] font-semibold text-ink">
            That product is no longer listed
          </h1>
          <p className="mt-2 text-[13.5px] text-ink-soft">
            It may have been removed from the marketplace by its merchant, or archived.
          </p>
          <Link
            href="/browse"
            className="mt-6 inline-flex cursor-pointer items-center gap-2 rounded-[2px] bg-ink px-4 py-2.5 text-[13px] text-bone"
          >
            Back to browsing <ArrowRight width={14} height={14} />
          </Link>
        </div>
      </ShopShell>
    );
  }

  const merchant = getMerchant(product.merchantId);
  const saved = wishlist.includes(product.id);
  const variantKey = product.variants[0]?.name;
  const activeVariant = variantKey ? selectedVariant[variantKey] ?? product.variants[0].values[0] : null;
  const variantLabel = activeVariant ? `${variantKey}: ${activeVariant}` : null;
  const specs: [string, string][] = [
    ["SKU", product.sku],
    ["Category", product.category],
    ["Collections", product.collections.join(", ") || "\u2014"],
    ["Variants", product.variants.map((v) => `${v.name} (${v.values.length})`).join(", ") || "Single variant"],
    ["Sold by", merchant.name],
    ["Ships from", merchant.location],
    ["Sold last 30 days", String(product.sold30d)],
    ["Warranty", "2 years, handled by the merchant"],
  ];

  return (
    <ShopShell>
      <div className="border-b border-line-warm bg-bone-soft/40">
        <nav className="mx-auto flex max-w-[1240px] items-center gap-2 px-4 py-3 font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-soft">
          <Link href="/" className="transition-colors hover:text-ember">
            Marketplace
          </Link>
          <span>/</span>
          <Link href={`/browse?category=${product.category}`} className="transition-colors hover:text-ember">
            {product.category}
          </Link>
          <span>/</span>
          <span className="truncate text-ink">{product.title}</span>
        </nav>
      </div>

      <div className="mx-auto grid max-w-[1240px] gap-10 px-4 py-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
        <div>
          <div className="overflow-hidden rounded-[3px] border border-line-warm bg-white">
            <ProductPlate product={product} index={activePlate} className="aspect-square w-full" />
          </div>
          <div className="mt-3 flex gap-3">
            {Array.from({ length: product.plates }).map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setActivePlate(i)}
                aria-label={`View image ${i + 1}`}
                className={cn(
                  "h-[74px] w-[74px] cursor-pointer overflow-hidden rounded-[2px] border transition-colors",
                  activePlate === i ? "border-ink" : "border-line-warm hover:border-ink/40",
                )}
              >
                <ProductPlate product={product} index={i} className="h-full w-full" showSku={false} />
              </button>
            ))}
          </div>

          <div className="mt-8 hidden lg:block">
            <div className="flex flex-wrap gap-3">
              {[
                { icon: Truck, title: "Delivery in 2\u20135 days", body: `Dispatched from ${merchant.location.split(",")[0]}` },
                { icon: RotateCcw, title: "30-day returns", body: "Free over $120" },
                { icon: ShieldCheck, title: "Buyer protection", body: "Covered by Ferixas" },
              ].map((item) => (
                <div
                  key={item.title}
                  className="flex flex-1 items-start gap-3 rounded-[3px] border border-line-warm bg-white p-3.5"
                >
                  <item.icon width={17} height={17} className="mt-0.5 shrink-0 text-ember" />
                  <div>
                    <p className="font-display text-[13px] font-semibold text-ink">{item.title}</p>
                    <p className="mt-0.5 text-[12px] text-ink-soft">{item.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div>
          <Link
            href={`/store/${merchant.slug}`}
            className="inline-flex items-center gap-2.5 rounded-[2px] border border-line-warm bg-white px-3 py-2 transition-colors hover:border-ink/30"
          >
            <span
              className="grid h-7 w-7 place-items-center rounded-[2px] font-display text-[12px] font-extrabold"
              style={{ background: merchant.brand.accent, color: merchant.brand.accentInk }}
            >
              {merchant.name.slice(0, 1)}
            </span>
            <span>
              <span className="flex items-center gap-1.5 text-[12.5px] font-medium text-ink">
                {merchant.name}
                {merchant.verified ? <BadgeCheck width={13} height={13} className="text-ember" /> : null}
              </span>
              <span className="block font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft">
                {num(merchant.followers, { compact: true })} followers \u00b7 {merchant.rating} rating
              </span>
            </span>
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.preventDefault();
                toggleFollow(merchant.id);
                toast.success(follows.includes(merchant.id) ? `Unfollowed ${merchant.name}` : `Following ${merchant.name}`);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  toggleFollow(merchant.id);
                }
              }}
              className={cn(
                "ml-2 shrink-0 cursor-pointer rounded-[2px] border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] transition-colors",
                follows.includes(merchant.id)
                  ? "border-ember bg-ember text-white"
                  : "border-ink/20 text-ink hover:border-ink",
              )}
            >
              {follows.includes(merchant.id) ? "Following" : "Follow"}
            </span>
          </Link>

          <h1 className="mt-5 font-display text-[28px] font-bold leading-tight tracking-[-0.02em] text-ink sm:text-[34px]">
            {product.title}
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-4">
            <Rating value={product.rating} count={product.reviewCount} size={13} />
            <button
              type="button"
              onClick={() => setTab("Reviews")}
              className="cursor-pointer font-mono text-[10.5px] uppercase tracking-[0.12em] text-ember"
            >
              Read all reviews
            </button>
            <span className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-ink-soft">
              {product.sold30d} sold this month
            </span>
          </div>

          <div className="mt-5 border-y border-line-warm py-5">
            <Price price={product.price} compareAt={product.compareAt} size="lg" />
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <StockHint stock={product.stock} lowAt={product.lowStockAt} />
              <span className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-ink-soft">
                Tax calculated at checkout
              </span>
            </div>
          </div>

          {product.variants.map((variant) => (
            <div key={variant.name} className="mt-5">
              <Eyebrow className="text-ink-soft">
                {variant.name} \u00b7 {selectedVariant[variant.name] ?? variant.values[0]}
              </Eyebrow>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {variant.values.map((value) => {
                  const on = (selectedVariant[variant.name] ?? variant.values[0]) === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setSelectedVariant((prev) => ({ ...prev, [variant.name]: value }))}
                      className={cn(
                        "cursor-pointer rounded-[2px] border px-3 py-2 text-[13px] transition-colors",
                        on ? "border-ink bg-ink text-bone" : "border-ink/20 text-ink hover:border-ink/50",
                      )}
                    >
                      {value}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          <div className="mt-6 flex flex-wrap items-stretch gap-3">
            <div className="flex items-center rounded-[2px] border border-ink/20">
              <button
                type="button"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                aria-label="Decrease quantity"
                className="grid h-12 w-11 cursor-pointer place-items-center text-ink transition-colors hover:bg-bone-soft"
              >
                <Minus width={15} height={15} />
              </button>
              <span className="w-9 text-center font-mono text-[14px] tabular-nums text-ink">{qty}</span>
              <button
                type="button"
                onClick={() => setQty((q) => q + 1)}
                aria-label="Increase quantity"
                className="grid h-12 w-11 cursor-pointer place-items-center text-ink transition-colors hover:bg-bone-soft"
              >
                <Plus width={15} height={15} />
              </button>
            </div>
            <button
              type="button"
              disabled={product.stock <= 0}
              onClick={() => {
                addToCart(product.id, variantLabel, qty);
                toast.success(`${qty} \u00d7 ${product.title} added to your cart`);
              }}
              className="inline-flex h-12 flex-1 cursor-pointer items-center justify-center gap-2 rounded-[2px] bg-ink px-5 text-[14px] font-medium text-bone transition-colors hover:bg-ember disabled:cursor-not-allowed disabled:opacity-40"
            >
              {product.stock <= 0 ? "Sold out" : "Add to cart"}
            </button>
            <button
              type="button"
              onClick={() => {
                if (product.stock <= 0) return;
                addToCart(product.id, variantLabel, qty);
                router.push("/checkout");
              }}
              disabled={product.stock <= 0}
              className="inline-flex h-12 cursor-pointer items-center justify-center rounded-[2px] border border-ink px-5 text-[14px] font-medium text-ink transition-colors hover:bg-bone-soft disabled:opacity-40"
            >
              Buy now
            </button>
            <button
              type="button"
              onClick={() => {
                toggleWishlist(product.id);
                toast.success(saved ? "Removed from your wishlist" : "Saved to your wishlist");
              }}
              aria-label={saved ? "Remove from wishlist" : "Save to wishlist"}
              className={cn(
                "grid h-12 w-12 cursor-pointer place-items-center rounded-[2px] border transition-colors",
                saved ? "border-ember bg-ember text-white" : "border-ink/20 text-ink hover:border-ink",
              )}
            >
              <Heart width={17} height={17} className={saved ? "fill-white" : ""} />
            </button>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(`https://ferixas.com/product/${product.slug}`);
                  toast.success("Product link copied");
                } catch {
                  toast.info(`https://ferixas.com/product/${product.slug}`);
                }
              }}
              className="inline-flex cursor-pointer items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.12em] text-ink-soft transition-colors hover:text-ember"
            >
              <Link2 width={13} height={13} /> Copy link
            </button>
            <button
              type="button"
              onClick={() => toast.success("Share sheet opened (simulated)")}
              className="inline-flex cursor-pointer items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.12em] text-ink-soft transition-colors hover:text-ember"
            >
              <Share2 width={13} height={13} /> Share
            </button>
            <span className="ml-auto font-mono text-[10.5px] uppercase tracking-[0.12em] text-ink-soft">
              {cartCount} in cart
            </span>
          </div>

          <div className="mt-6 rounded-[3px] border border-line-warm bg-white p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <Eyebrow className="text-ember">Sold and shipped by</Eyebrow>
                <p className="mt-2 flex items-center gap-2 font-display text-[15px] font-semibold text-ink">
                  {merchant.name}
                  {merchant.verified ? <BadgeCheck width={14} height={14} className="text-ember" /> : null}
                </p>
                <p className="mt-1 text-[12.5px] text-ink-soft">{merchant.tagline}</p>
              </div>
              <Link
                href={`/store/${merchant.slug}`}
                className="shrink-0 cursor-pointer rounded-[2px] border border-ink/20 px-3 py-2 font-mono text-[10.5px] uppercase tracking-[0.12em] text-ink transition-colors hover:border-ink"
              >
                Visit store
              </Link>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3 border-t border-line-warm pt-4">
              {[
                ["Store rating", `${merchant.rating}`],
                ["Response rate", `${merchant.responseRate}%`],
                ["On-time shipping", `${merchant.fulfilmentRate}%`],
              ].map(([label, value]) => (
                <div key={label}>
                  <p className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-ink-soft">
                    {label}
                  </p>
                  <p className="mt-1 font-mono text-[14px] tabular-nums text-ink">{value}</p>
                </div>
              ))}
            </div>
            <p className="mt-4 border-t border-line-warm pt-3 font-mono text-[10.5px] leading-relaxed text-ink-soft">
              This product is sold on the Ferixas marketplace and, if the merchant chose, on their
              own storefront too. Same stock, same product record.
            </p>
          </div>
        </div>
      </div>

      <div className="border-y border-line-warm bg-white">
        <div className="mx-auto max-w-[1240px] px-4">
          <div className="flex gap-1 overflow-x-auto border-b border-line-warm [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {TABS.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setTab(item)}
                className={cn(
                  "cursor-pointer whitespace-nowrap px-4 py-3.5 font-mono text-[10.5px] uppercase tracking-[0.14em] transition-colors",
                  tab === item ? "border-b-2 border-ember text-ember" : "border-b-2 border-transparent text-ink-soft hover:text-ink",
                )}
              >
                {item}
                {item === "Reviews" ? ` (${reviews.length})` : ""}
              </button>
            ))}
          </div>

          <div className="py-8">
            {tab === "Description" ? (
              <div className="grid gap-8 lg:grid-cols-[1.3fr_1fr]">
                <div>
                  <p className="max-w-[70ch] text-[14.5px] leading-relaxed text-ink">
                    {product.description}
                  </p>
                  {product.bullets.length ? (
                    <ul className="mt-5 space-y-2.5">
                      {product.bullets.map((bullet) => (
                        <li key={bullet} className="flex gap-3 text-[13.5px] leading-relaxed text-ink-soft">
                          <Check width={15} height={15} className="mt-0.5 shrink-0 text-ember" />
                          {bullet}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  <p className="mt-6 max-w-[70ch] text-[13.5px] leading-relaxed text-ink-soft">
                    In the prototype this description is merchant-authored mock copy. In production
                    it is written once and rendered everywhere the product is sold, including on
                    the merchant's own storefront through the Design Engine.
                  </p>
                </div>
                <div className="rounded-[3px] border border-line-warm p-5">
                  <Eyebrow className="text-ink-soft">At a glance</Eyebrow>
                  <dl className="mt-3 grid gap-2.5">
                    {specs.slice(0, 5).map(([label, value]) => (
                      <div key={label} className="flex items-start justify-between gap-4">
                        <dt className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-ink-soft">
                          {label}
                        </dt>
                        <dd className="max-w-[58%] text-right text-[12.5px] text-ink">{value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              </div>
            ) : null}

            {tab === "Specifications" ? (
              <div className="max-w-[720px]">
                <dl className="divide-y divide-line-warm">
                  {specs.map(([label, value]) => (
                    <div key={label} className="flex items-start justify-between gap-6 py-3.5">
                      <dt className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-ink-soft">
                        {label}
                      </dt>
                      <dd className="max-w-[62%] text-right text-[13px] text-ink">{value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ) : null}

            {tab === "Reviews" ? (
              <div className="grid gap-10 lg:grid-cols-[320px_1fr]">
                <div>
                  <div className="rounded-[3px] border border-line-warm p-5">
                    <p className="font-display text-[34px] font-bold leading-none text-ink">
                      {product.rating.toFixed(1)}
                    </p>
                    <div className="mt-2">
                      <Rating value={product.rating} />
                    </div>
                    <p className="mt-2 font-mono text-[10.5px] uppercase tracking-[0.12em] text-ink-soft">
                      {reviews.length} reviews from verified buyers
                    </p>
                    <div className="mt-4 space-y-2">
                      {breakdown.map((row) => (
                        <div key={row.star} className="flex items-center gap-3">
                          <span className="flex w-8 items-center gap-1 font-mono text-[11px] text-ink-soft">
                            {row.star}
                            <Star width={10} height={10} className="fill-ember text-ember" />
                          </span>
                          <span className="h-1.5 flex-1 overflow-hidden rounded-[1px] bg-bone-soft">
                            <span
                              className="block h-full bg-ember"
                              style={{
                                width: `${reviews.length ? (row.count / reviews.length) * 100 : 0}%`,
                              }}
                            />
                          </span>
                          <span className="w-6 text-right font-mono text-[11px] text-ink-soft">
                            {row.count}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 rounded-[3px] border border-line-warm p-5">
                    <Eyebrow className="text-ember">Write a review</Eyebrow>
                    <div className="mt-3 flex gap-1.5">
                      {[1, 2, 3, 4, 5].map((value) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setReviewForm((prev) => ({ ...prev, rating: value }))}
                          aria-label={`${value} stars`}
                          className="cursor-pointer"
                        >
                          <Star
                            width={18}
                            height={18}
                            className={
                              value <= reviewForm.rating ? "fill-ember text-ember" : "text-ink-soft"
                            }
                          />
                        </button>
                      ))}
                    </div>
                    <input
                      value={reviewForm.title}
                      onChange={(e) => setReviewForm((prev) => ({ ...prev, title: e.target.value }))}
                      placeholder="Headline"
                      className="mt-3 h-10 w-full rounded-[2px] border border-ink/15 px-3 text-[13px] outline-none focus:border-ink"
                    />
                    <textarea
                      value={reviewForm.body}
                      onChange={(e) => setReviewForm((prev) => ({ ...prev, body: e.target.value }))}
                      placeholder="What should other buyers know?"
                      className="mt-2 h-[84px] w-full resize-y rounded-[2px] border border-ink/15 px-3 py-2 text-[13px] outline-none focus:border-ink"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (!reviewForm.title.trim() && !reviewForm.body.trim()) {
                          toast.error("Add a headline or a comment first");
                          return;
                        }
                        setExtraReviews((prev) => [
                          {
                            id: `rev_new_${Date.now().toString(36)}`,
                            productId: product.id,
                            author: "Ferix Course",
                            rating: reviewForm.rating,
                            title: reviewForm.title.trim() || "Review",
                            body: reviewForm.body.trim() || "No comment left.",
                            date: new Date().toISOString(),
                            helpful: 0,
                            verified: true,
                          },
                          ...prev,
                        ]);
                        setReviewForm({ rating: 5, title: "", body: "" });
                        toast.success("Review posted to this prototype session");
                      }}
                      className="mt-3 w-full cursor-pointer rounded-[2px] bg-ink py-2.5 text-[13px] text-bone transition-colors hover:bg-ember"
                    >
                      Post review
                    </button>
                  </div>
                </div>

                <ul className="space-y-4">
                  {reviews.map((review) => (
                    <li key={review.id} className="rounded-[3px] border border-line-warm p-5">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span className="grid h-8 w-8 place-items-center rounded-full bg-bone-soft font-mono text-[11px] text-ink">
                            {review.author
                              .split(" ")
                              .map((part) => part[0])
                              .slice(0, 2)
                              .join("")}
                          </span>
                          <div>
                            <p className="text-[13px] text-ink">{review.author}</p>
                            <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft">
                              {review.verified ? "Verified purchase" : "Unverified"} \u00b7{" "}
                              {dateShort(review.date)}
                            </p>
                          </div>
                        </div>
                        <Rating value={review.rating} />
                      </div>
                      <p className="mt-3 font-display text-[14.5px] font-semibold text-ink">
                        {review.title}
                      </p>
                      <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-soft">
                        {review.body}
                      </p>
                      <button
                        type="button"
                        onClick={() => setHelpful((prev) => (prev.includes(review.id) ? prev : [...prev, review.id]))}
                        className={cn(
                          "mt-3 cursor-pointer font-mono text-[10.5px] uppercase tracking-[0.12em] transition-colors",
                          helpful.includes(review.id) ? "text-ember" : "text-ink-soft hover:text-ink",
                        )}
                      >
                        Helpful ({review.helpful + (helpful.includes(review.id) ? 1 : 0)})
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {tab === "Shipping & returns" ? (
              <div className="grid max-w-[900px] gap-6 sm:grid-cols-2">
                <div className="rounded-[3px] border border-line-warm p-5">
                  <Truck width={18} height={18} className="text-ember" />
                  <p className="mt-3 font-display text-[15px] font-semibold text-ink">Delivery</p>
                  <ul className="mt-3 space-y-2 text-[13px] leading-relaxed text-ink-soft">
                    <li>Dispatched from {merchant.location.split(",")[0]} in 1 working day.</li>
                    <li>Tracked delivery in 2\u20135 working days within country.</li>
                    <li>International delivery in 4\u20139 working days, duties prepaid.</li>
                    <li>Free delivery on marketplace orders above $120.</li>
                  </ul>
                </div>
                <div className="rounded-[3px] border border-line-warm p-5">
                  <RotateCcw width={18} height={18} className="text-ember" />
                  <p className="mt-3 font-display text-[15px] font-semibold text-ink">Returns</p>
                  <ul className="mt-3 space-y-2 text-[13px] leading-relaxed text-ink-soft">
                    <li>30 days to return, unused and in original packaging.</li>
                    <li>Return label generated in your account, free over $120.</li>
                    <li>Refunds are issued by the merchant within 3 working days.</li>
                    <li>Ferixas buyer protection covers anything that never arrives.</li>
                  </ul>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <section className="mx-auto max-w-[1240px] px-4 py-12">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <Eyebrow className="text-ember">You might also need</Eyebrow>
            <h2 className="mt-2 font-display text-[24px] font-semibold text-ink">
              Related on the marketplace
            </h2>
          </div>
          <Link
            href={`/browse?category=${product.category}`}
            className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-soft transition-colors hover:text-ember"
          >
            More in this department
          </Link>
        </div>
        <ProductRail products={related} />
      </section>

      <div className="fixed inset-x-0 bottom-[58px] z-30 border-t border-line-warm bg-bone/95 px-4 py-3 backdrop-blur-md md:hidden">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate font-mono text-[11px] text-ink-soft">{product.title}</p>
            <Price price={product.price} compareAt={product.compareAt} />
          </div>
          <button
            type="button"
            disabled={product.stock <= 0}
            onClick={() => {
              addToCart(product.id, variantLabel, qty);
              toast.success("Added to your cart");
            }}
            className="h-11 shrink-0 cursor-pointer rounded-[2px] bg-ink px-5 text-[13.5px] font-medium text-bone disabled:opacity-40"
          >
            Add to cart
          </button>
        </div>
      </div>
    </ShopShell>
  );
}

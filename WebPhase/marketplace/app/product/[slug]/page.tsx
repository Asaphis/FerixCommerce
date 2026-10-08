import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowRight, Check, Heart, MapPin, RotateCcw, ShieldCheck, Truck } from "lucide-react";
import { getProduct, ApiError, assetUrl } from "@/lib/api";
import { savedIds } from "@/lib/data";
import { toggleWishlistAction } from "@/lib/actions";
import { AddToCartButton, AddToCartForm } from "@/components/ferix/add-to-cart";
import { ReviewForm } from "@/components/ferix/forms";
import { ProductRail, RatingBars, ReviewList } from "@/components/ferix/cards";
import { Eyebrow, LinkButton, Plate, Pill, Price, SectionHead, Stars, StockNote } from "@/components/ferix/marks";
import { compact, dateShort, money } from "@/lib/format";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  try {
    const { product, merchant } = await getProduct(slug);
    return {
      title: `${product.title} — ${merchant.name}`,
      description: product.description.slice(0, 150),
    };
  } catch {
    return { title: "Product not found" };
  }
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let detail;
  try {
    detail = await getProduct(slug);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }
  const { product, merchant, reviews, related, shipping, returns } = detail;
  const saved = await savedIds();
  const isSaved = saved.includes(product.id);

  return (
    <div className="mx-auto max-w-[1240px] px-4 py-8">
      <nav className="flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-soft">
        <Link href="/" className="transition-colors hover:text-ember">
          Home
        </Link>
        <span>/</span>
        <Link href={`/browse?category=${product.category}`} className="capitalize transition-colors hover:text-ember">
          {product.category}
        </Link>
        <span>/</span>
        <span className="text-ink">{product.title}</span>
      </nav>

      <div className="mt-6 grid gap-10 lg:grid-cols-[1.05fr_0.95fr]">
        <div>
          <Plate
            seed={product.slug}
            accent="#e4572e"
            src={assetUrl(product.images?.[0])}
            alt={product.title}
            className="aspect-[4/3] w-full"
          />
          <div className="mt-3 grid grid-cols-4 gap-3">
            {(product.images?.length ? product.images.slice(0, 4) : [null, null, null, null]).map((image, index) => (
              <Plate
                key={image ?? index}
                seed={`${product.slug}-${index + 1}`}
                accent="#e4572e"
                src={assetUrl(image)}
                alt={`${product.title} view ${index + 1}`}
                className={`aspect-square w-full ${index === 0 ? "ring-2 ring-ink" : "opacity-70"}`}
              />
            ))}
          </div>
        </div>

        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Pill tone={merchant.verified ? "success" : "neutral"}>
              <Check width={10} height={10} /> {merchant.verified ? "Verified seller" : "Marketplace seller"}
            </Pill>
            {product.discount ? <Pill tone="ember">−{product.discount}% today</Pill> : null}
          </div>

          {/* Who is selling this. A name alone tells a shopper nothing; the card
              gives the seller a face, a place and a rating before they buy. */}
          <div className="mt-3 flex items-center gap-3 rounded-[14px] border border-line-warm bg-white p-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[11px] bg-ink font-display text-[15px] font-extrabold text-bone">
              {merchant.name.slice(0, 1)}
            </span>
            <div className="min-w-0 flex-1 leading-tight">
              <div className="flex items-center gap-1.5">
                <Link
                  href={`/store/${merchant.slug}`}
                  className="truncate text-[13px] font-semibold text-ink transition-colors hover:text-ember"
                >
                  {merchant.name}
                </Link>
                {merchant.verified ? (
                  <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-pine text-white">
                    <Check width={10} height={10} />
                  </span>
                ) : null}
              </div>
              <span className="mt-0.5 block truncate font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft">
                {merchant.location}
                {typeof merchant.rating === "number" ? ` · ${merchant.rating.toFixed(1)} ★` : ""}
              </span>
            </div>
            <Link
              href={`/store/${merchant.slug}`}
              className="shrink-0 rounded-[9px] border border-line-warm px-3 py-1.5 text-[11px] font-semibold text-ink transition-colors hover:border-ember hover:text-ember"
            >
              Visit store
            </Link>
          </div>
          <h1 className="mt-1.5 font-display text-[27px] font-semibold leading-tight text-ink sm:text-[32px]">
            {product.title}
          </h1>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Stars value={product.rating} />
            <span className="font-mono text-[11px] text-ink-soft">
              {product.rating.toFixed(1)} · {compact(product.reviewCount)} reviews
            </span>
            <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-soft">SKU {product.sku}</span>
          </div>

          <div className="mt-5 flex flex-wrap items-end gap-4 border-y border-line-warm py-4">
            <Price value={product.price} compareAt={product.compareAt} discount={product.discount} className="text-[18px]" />
            <StockNote stock={product.stock} />
          </div>

          <AddToCartForm
            productId={product.id}
            className="mt-5 grid gap-4"
            showButton={false}
          >
            <input type="hidden" name="productId" value={product.id} />
            {product.variants.length ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {product.variants.map((variant) => (
                  <label key={variant.name} className="block">
                    <span className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-ink-soft">{variant.name}</span>
                    <select
                      name={`variant_${variant.name}`}
                      className="mt-1.5 h-10 w-full rounded-[2px] border border-line-warm bg-white px-2 text-[13px] text-ink outline-none focus:border-ink"
                    >
                      {variant.values.map((value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2">
                <span className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-ink-soft">Qty</span>
                <select
                  name="qty"
                  defaultValue="1"
                  className="h-10 rounded-[2px] border border-line-warm bg-white px-2 text-[13px] text-ink outline-none focus:border-ink"
                >
                  {Array.from({ length: Math.max(1, Math.min(10, product.stock)) }, (_, i) => i + 1).map((qty) => (
                    <option key={qty} value={qty}>
                      {qty}
                    </option>
                  ))}
                </select>
              </label>
              <AddToCartButton
                label={product.stock > 0 ? "Add to cart" : "Out of stock"}
                disabled={product.stock <= 0}
                className="flex-1 sm:flex-none sm:px-8"
              />
            </div>

            {/* On a phone the buy control scrolls away, so it travels with the
                shopper. Two submit buttons, one form, one action — no extra state. */}
            <div className="sticky bottom-[72px] z-20 -mx-4 mt-1 flex items-center gap-3 border-t border-line-warm bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
              <span className="min-w-0 shrink-0">
                <span className="block font-display text-[17px] font-bold leading-none text-ink">
                  {money(product.price)}
                </span>
                {product.compareAt ? (
                  <span className="mt-0.5 block font-mono text-[10px] text-ink-soft line-through">
                    {money(product.compareAt)}
                  </span>
                ) : null}
              </span>
              <span className="flex-1">
                <AddToCartButton
                  label={product.stock > 0 ? "Add to cart" : "Out of stock"}
                  disabled={product.stock <= 0}
                  className="w-full"
                />
              </span>
            </div>
          </AddToCartForm>

          <form action={toggleWishlistAction} className="mt-3">
            <input type="hidden" name="productId" value={product.id} />
            <input type="hidden" name="back" value={`/product/${product.slug}`} />
            <button
              type="submit"
              className="inline-flex cursor-pointer items-center gap-2 rounded-[2px] border border-line-warm px-4 py-2.5 text-[13px] font-medium text-ink transition-colors hover:border-ink/40"
            >
              <Heart width={15} height={15} fill={isSaved ? "currentColor" : "none"} className={isSaved ? "text-ember" : ""} />
              {isSaved ? "Saved for later" : "Save for later"}
            </button>
          </form>

          <p className="mt-5 text-[14px] leading-relaxed text-ink-soft">{product.description}</p>
          <ul className="mt-4 grid gap-2">
            {product.bullets.map((bullet) => (
              <li key={bullet} className="flex items-start gap-2.5 text-[13.5px] text-ink">
                <Check width={14} height={14} className="mt-[3px] shrink-0 text-ember" />
                {bullet}
              </li>
            ))}
          </ul>

          <div className="mt-6 grid gap-3 rounded-[3px] border border-line-warm bg-white p-4">
            {shipping.map((option) => (
              <div key={option.label} className="flex items-start gap-2.5">
                <Truck width={15} height={15} className="mt-[2px] shrink-0 text-ember" />
                <span className="text-[13px] text-ink">
                  <span className="font-medium">{option.label}</span>
                  <span className="block text-[12.5px] text-ink-soft">{option.detail}</span>
                </span>
              </div>
            ))}
            <div className="flex items-start gap-2.5 border-t border-line-warm pt-3">
              <RotateCcw width={15} height={15} className="mt-[2px] shrink-0 text-ember" />
              <span className="text-[13px] text-ink">{returns}</span>
            </div>
            <div className="flex items-start gap-2.5">
              <ShieldCheck width={15} height={15} className="mt-[2px] shrink-0 text-ember" />
              <span className="text-[13px] text-ink">Buyer protection on every marketplace order</span>
            </div>
            <div className="flex items-start gap-2.5">
              <MapPin width={15} height={15} className="mt-[2px] shrink-0 text-ember" />
              <span className="text-[13px] text-ink">Dispatched from {merchant.location}</span>
            </div>
          </div>
        </div>
      </div>

      <section className="mt-14 grid gap-10 lg:grid-cols-[280px_1fr]">
        <div>
          <Eyebrow>Ratings</Eyebrow>
          <div className="mt-3">
            <RatingBars breakdown={product.ratingBreakdown} total={product.reviewCount} rating={product.rating} />
          </div>
        </div>
        <div>
          <SectionHead eyebrow="Reviews" title="What buyers say about this product" />
          <ReviewList reviews={reviews} />

          <div className="mt-8 rounded-[3px] border border-line-warm bg-white p-5">
            <Eyebrow>Write a review</Eyebrow>
            <p className="mt-1.5 text-[13px] text-ink-soft">
              Reviews are attached to your account, so you can edit or delete them later.
            </p>
            <div className="mt-4">
              <ReviewForm productId={product.id} />
            </div>
          </div>
        </div>
      </section>

      {related.length ? (
        <section className="mt-14">
          <SectionHead
            eyebrow="More like this"
            title={`Also from ${merchant.name} and this department`}
            action={
              <Link
                href={`/store/${merchant.slug}`}
                className="group inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft transition-colors hover:text-ember"
              >
                Visit the store
                <ArrowRight width={14} height={14} className="transition-transform group-hover:translate-x-0.5" />
              </Link>
            }
          />
          <ProductRail products={related} savedIds={saved} />
        </section>
      ) : null}

      <p className="mt-12 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft/70">
        Listed {dateShort(product.createdAt)} · {compact(product.sold30d)} sold in the last 30 days · one cart and one
        checkout across every seller
      </p>
    </div>
  );
}

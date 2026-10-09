import Link from "next/link";
import { ArrowRight, Check, Heart, MapPin, Minus, Plus, Trash2, Truck } from "lucide-react";
import type { Category, Collection, Merchant, Product, Review } from "@/lib/api";
import { assetUrl } from "@/lib/api";
import { Eyebrow, Plate, Price, Stars, StockNote, Pill } from "@/components/ferix/marks";
import { AddToCartForm, WishlistForm } from "@/components/ferix/add-to-cart";
import { removeLineAction, saveForLaterAction, setQtyAction } from "@/lib/actions";
import { compact, dateShort, money } from "@/lib/format";
import { cn } from "@/lib/utils";

export function ProductCard({
  product,
  saved = false,
  className,
  showAdd = true,
}: {
  product: Product;
  saved?: boolean;
  className?: string;
  showAdd?: boolean;
}) {
  const href = `/product/${product.slug}`;
  return (
    <article
      className={cn(
        "group relative flex min-w-0 flex-col overflow-hidden rounded-[2px] rounded-tr-[14px] border border-line-warm bg-white shadow-[0_2px_10px_rgba(16,45,67,0.05)] transition-all duration-200 hover:-translate-y-0.5 hover:border-ember/40 hover:shadow-[0_8px_24px_rgba(16,45,67,0.12)]",
        className,
      )}
    >
      <Link href={href} className="relative block">
        <Plate
          seed={product.slug}
          accent="#e4572e"
          src={assetUrl(product.images?.[0])}
          alt={product.title}
            className="aspect-[1/1] w-full rounded-none sm:aspect-[4/3]"
        />
        <span className="absolute left-2.5 top-2.5 flex flex-wrap gap-1.5">
          {product.discount ? <Pill tone="ember">−{product.discount}%</Pill> : null}
          {product.stock <= 25 && product.stock > 0 ? <Pill tone="warn">Low stock</Pill> : null}
          {product.stock <= 0 ? <Pill tone="danger">Sold out</Pill> : null}
        </span>
      </Link>

      <div className="flex flex-1 flex-col p-2.5 sm:p-3.5">
        <Link href={`/store/${product.merchantSlug}`} className="hidden truncate font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft transition-colors hover:text-ember sm:block">
          {product.merchantName}
        </Link>
        <Link href={href} className="mt-1 line-clamp-2 min-h-[2.25em] font-display text-[12.5px] font-semibold leading-snug text-ink transition-colors group-hover:text-ember sm:mt-1.5 sm:text-[14.5px]">
          {product.title}
        </Link>
        <div className="mt-2 hidden items-center gap-2 sm:flex">
          <Stars value={product.rating} />
          <span className="font-mono text-[10.5px] text-ink-soft">({compact(product.reviewCount)})</span>
        </div>
        <div className="mt-2 flex items-end justify-between gap-2 sm:mt-3">
          <Price value={product.price} compareAt={product.compareAt} discount={product.discount} />
        </div>
        {product.stock > 0 && product.stock <= 25 ? (
          <div className="mt-1.5">
            <StockNote stock={product.stock} />
          </div>
        ) : null}

        {showAdd ? (
          <div className="mt-2 flex items-center gap-1.5 border-t border-line-warm pt-2 sm:mt-3 sm:pt-3">
            {product.stock > 0 ? <AddToCartForm productId={product.id} /> : <span className="flex-1"><button type="button" disabled className="w-full rounded-[2px] bg-bone-soft py-2 text-[13px] font-semibold text-ink-soft">Sold out</button></span>}
            <WishlistForm productId={product.id} back="/browse" saved={saved} />
          </div>
        ) : null}
      </div>
    </article>
  );
}

export function ProductGrid({
  products,
  savedIds = [],
  className,
  columns = 4,
  across,
}: {
  products: Product[];
  savedIds?: string[];
  className?: string;
  columns?: 3 | 4;
  /**
   * How many sit side by side on a phone, set per section in the CMS.
   *
   * The phone width was fixed at two, so a section could not be told to show three or
   * one. Wider screens take proportionally more, so two across on a phone is four on a
   * desktop - a large screen showing two enormous cards reads as a mistake.
   */
  across?: number;
}) {
  const phone = Math.min(4, Math.max(1, Math.round(Number(across) || (columns === 3 ? 3 : 2))));
  const width: Record<number, string> = {
    1: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    2: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4",
    3: "grid-cols-3 sm:grid-cols-4 lg:grid-cols-6",
    4: "grid-cols-4 sm:grid-cols-6 lg:grid-cols-6",
  };
  return (
    <div
      className={cn(
        "grid gap-x-2.5 gap-y-4 sm:gap-x-3.5 sm:gap-y-6",
        width[phone],
        className,
      )}
    >
      {products.map((product) => (
        <ProductCard key={product.id} product={product} saved={savedIds.includes(product.id)} />
      ))}
    </div>
  );
}

export function ProductRail({ products, savedIds = [] }: { products: Product[]; savedIds?: string[] }) {
  return (
    <div className="grid grid-cols-2 gap-x-2.5 gap-y-3 sm:grid-cols-3 sm:gap-x-3.5 sm:gap-y-5 lg:grid-cols-4 xl:grid-cols-5">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} saved={savedIds.includes(product.id)} />
      ))}
    </div>
  );
}

export function CategoryTile({
  category,
  size = "default",
}: {
  category: Category;
  /** "large" is the poster: artwork filling the tile, the name beneath it. */
  size?: "default" | "large";
}) {
  if (size === "large") {
    return (
      <Link
        href={`/browse?category=${category.slug}`}
        className="group flex flex-col overflow-hidden rounded-[14px] border border-line-warm bg-white transition-colors hover:border-ember/40"
      >
        <span className="block aspect-[4/3] w-full overflow-hidden">
          <Plate
            seed={category.slug}
            accent="#e4572e"
            src={assetUrl(category.image)}
            alt={category.name}
            className="h-full w-full"
          />
        </span>
        <span className="block px-3 py-2.5">
          <span className="block truncate font-display text-[13px] font-semibold text-ink group-hover:text-ember">
            {category.name}
          </span>
          <span className="mt-0.5 block font-mono text-[9.4px] uppercase tracking-[0.12em] text-ink-soft">
            {category.count} listed
          </span>
        </span>
      </Link>
    );
  }

  return (
    <Link
      href={`/browse?category=${category.slug}`}
      className="group relative flex min-h-[72px] items-center gap-2.5 overflow-hidden rounded-[2px] rounded-tr-[9px] border border-line-warm bg-white p-2.5 transition-all duration-300 hover:-translate-y-0.5 hover:border-ink/25 sm:block sm:p-4"
    >
      <Plate
        seed={category.slug}
        accent="#e4572e"
        src={assetUrl(category.image)}
        alt={category.name}
        className="h-10 w-10 shrink-0 rounded-[2px] sm:h-16 sm:w-16"
      />
      <span className="min-w-0 flex-1 sm:block">
        <p className="truncate font-display text-[12.5px] font-semibold text-ink sm:mt-3.5 sm:text-[14.5px]">{category.name}</p>
        <p className="mt-0.5 hidden line-clamp-2 text-[12px] leading-relaxed text-ink-soft sm:block">{category.blurb}</p>
        <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.12em] text-ink-soft sm:mt-2.5 sm:text-[10px] sm:tracking-[0.14em]">{category.count} listed</p>
      </span>
      <span className="absolute right-3 top-3 hidden text-ink-soft transition-transform duration-300 group-hover:translate-x-0.5 sm:block">
        <ArrowRight width={14} height={14} />
      </span>
    </Link>
  );
}

export function CollectionCard({ collection }: { collection: Collection }) {
  return (
    <Link
      href={`/browse?collection=${collection.slug}`}
      className="group relative overflow-hidden rounded-[2px] rounded-tr-[9px] border border-line-warm bg-void p-3 transition-all duration-300 hover:-translate-y-0.5 sm:p-5"
    >
      <Eyebrow className="text-[9px] text-lime sm:text-[10px]">{collection.count} products</Eyebrow>
      <p className="mt-1 truncate font-display text-[14px] font-semibold text-chalk sm:mt-2 sm:text-[18px]">{collection.name}</p>
      <p className="mt-1.5 hidden max-w-[34ch] text-[12.5px] leading-relaxed text-chalk-dim sm:block">{collection.blurb}</p>
      <span className="mt-2 inline-flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.12em] text-chalk sm:mt-4 sm:gap-2 sm:text-[10px] sm:tracking-[0.14em]">
        Shop the edit
        <ArrowRight width={13} height={13} className="transition-transform group-hover:translate-x-0.5" />
      </span>
      <span
        className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-30"
        style={{ background: "radial-gradient(circle, #e4572e, transparent 70%)" }}
      />
    </Link>
  );
}

/**
 * A store, as a shopper sees it.
 *
 * Below tablet width the old card hid the tagline, the location and the rating,
 * leaving a letter, a name and a number — and it printed the store's internal
 * layout name, which no shopper should ever read.
 *
 * The card now carries the same information at every width: the store's own
 * accent as a cover, the logo sitting on it, the tagline, the location, the
 * rating and the product count, with a visit button that turns on hover.
 */
export function StoreCard({ store }: { store: Merchant }) {
  return (
    <Link
      href={`/store/${store.slug}`}
      className="group relative flex flex-col overflow-hidden rounded-[14px] border border-line-warm bg-white transition-all duration-300 hover:-translate-y-0.5 hover:border-ink/25"
    >
      <span aria-hidden className="relative block h-[60px] w-full" style={{ background: store.brand.accent }}>
        <span
          className="absolute inset-0 opacity-25"
          style={{ background: "radial-gradient(circle at 88% 8%, #ffffff, transparent 62%)" }}
        />
        <span
          className="absolute -bottom-[18px] left-3.5 grid h-11 w-11 place-items-center overflow-hidden rounded-[12px] border-[3px] border-white font-display text-[15px] font-extrabold sm:left-4"
          style={{ background: store.brand.accent, color: store.brand.accentInk }}
        >
          {store.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={assetUrl(store.logo) ?? ""} alt={store.name} loading="lazy" className="h-full w-full object-cover" />
          ) : (
            store.name.slice(0, 1)
          )}
        </span>
      </span>

      <span className="flex min-w-0 flex-1 flex-col px-3.5 pt-[26px] pb-3.5 sm:px-4">
        <span className="flex items-center gap-1.5 font-display text-[14px] font-semibold text-ink sm:text-[15px]">
          <span className="truncate">{store.name}</span>
          {store.verified ? (
            <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-pine text-white">
              <Check width={10} height={10} />
            </span>
          ) : null}
        </span>

        {store.tagline ? (
          <span className="mt-1.5 line-clamp-2 text-[12.5px] leading-relaxed text-ink-soft">{store.tagline}</span>
        ) : null}

        <span className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft">
          <span className="inline-flex items-center gap-1.5">
            <MapPin width={11} height={11} />
            {store.location}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Stars value={store.rating} size={11} />
            {store.rating.toFixed(1)}
          </span>
        </span>

        <span className="mt-auto flex items-center justify-between gap-2 border-t border-line-warm pt-3">
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft">
            {store.productCount} products
          </span>
          <span className="rounded-[9px] bg-ink px-3 py-1.5 text-[11px] font-semibold text-bone transition-colors group-hover:bg-ember">
            Visit store
          </span>
        </span>
      </span>
    </Link>
  );
}

export function RatingBars({ breakdown, total, rating }: { breakdown: Record<string, number>; total: number; rating: number }) {
  return (
    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-[auto_1fr]">
      <div className="sm:w-[130px]">
        <p className="font-display text-[34px] font-extrabold leading-none text-ink">{rating.toFixed(1)}</p>
        <Stars value={rating} size={13} className="mt-2" />
        <p className="mt-1.5 font-mono text-[10.5px] text-ink-soft">{compact(total)} reviews</p>
      </div>
      <div className="space-y-1.5">
        {[5, 4, 3, 2, 1].map((star) => {
          const count = breakdown?.[String(star)] ?? 0;
          const pct = total ? Math.round((count / total) * 100) : 0;
          return (
            <div key={star} className="flex items-center gap-2.5">
              <span className="w-8 font-mono text-[10.5px] text-ink-soft">{star}★</span>
              <span className="h-1.5 flex-1 overflow-hidden rounded-[1px] bg-bone-soft">
                <span className="block h-full rounded-[1px] bg-ember" style={{ width: `${pct}%` }} />
              </span>
              <span className="w-10 text-right font-mono text-[10.5px] text-ink-soft">{pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ReviewList({ reviews }: { reviews: Review[] }) {
  if (!reviews.length)
    return <p className="text-[13.5px] text-ink-soft">No reviews on this product yet.</p>;
  return (
    <ul className="divide-y divide-line-warm border-y border-line-warm">
      {reviews.map((review) => (
        <li key={review.id} className="py-4">
          <div className="flex flex-wrap items-center gap-2.5">
            <Stars value={review.rating} size={11} />
            <p className="font-display text-[14px] font-semibold text-ink">{review.title}</p>
            {review.verified ? <Pill tone="success">Verified buyer</Pill> : null}
          </div>
          <p className="mt-2 text-[13.5px] leading-relaxed text-ink-soft">{review.body}</p>
          <p className="mt-2 font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-soft">
            {review.author} · {dateShort(review.date)} · {review.helpful} found this helpful
          </p>
        </li>
      ))}
    </ul>
  );
}

export function QtyStepper({ lineKey, qty }: { lineKey: string; qty: number }) {
  return (
    <div className="inline-flex items-center rounded-[2px] border border-line-warm bg-white">
      <form action={setQtyAction}>
        <input type="hidden" name="key" value={lineKey} />
        <input type="hidden" name="qty" value={qty - 1} />
        <button
          type="submit"
          aria-label="Decrease quantity"
          className="grid h-9 w-9 cursor-pointer place-items-center text-ink-soft transition-colors hover:bg-bone-soft hover:text-ink"
        >
          <Minus width={13} height={13} />
        </button>
      </form>
      <span className="w-9 text-center font-mono text-[13px] tabular-nums text-ink">{qty}</span>
      <form action={setQtyAction}>
        <input type="hidden" name="key" value={lineKey} />
        <input type="hidden" name="qty" value={qty + 1} />
        <button
          type="submit"
          aria-label="Increase quantity"
          className="grid h-9 w-9 cursor-pointer place-items-center text-ink-soft transition-colors hover:bg-bone-soft hover:text-ink"
        >
          <Plus width={13} height={13} />
        </button>
      </form>
    </div>
  );
}

export function CartLineRow({ line }: { line: { key: string; product: Product; variant: string | null; qty: number; lineTotal: number } }) {
  return (
    <li className="flex gap-4 py-4">
      <Link href={`/product/${line.product.slug}`} className="shrink-0">
        <Plate
          seed={line.product.slug}
          src={assetUrl(line.product.images?.[0])}
          alt={line.product.title}
          className="h-24 w-24 rounded-[3px]"
        />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft">{line.product.merchantName}</p>
            <Link href={`/product/${line.product.slug}`} className="mt-0.5 block font-display text-[15px] font-semibold text-ink hover:text-ember">
              {line.product.title}
            </Link>
            {line.variant ? <p className="mt-1 font-mono text-[10.5px] text-ink-soft">{line.variant}</p> : null}
          </div>
          <p className="font-mono text-[14px] font-semibold text-ink">{money(line.lineTotal)}</p>
        </div>
        <div className="mt-auto flex flex-wrap items-center gap-3 pt-3">
          <QtyStepper lineKey={line.key} qty={line.qty} />
          <form action={saveForLaterAction}>
            <input type="hidden" name="key" value={line.key} />
            <button type="submit" className="inline-flex cursor-pointer items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft transition-colors hover:text-ember">
              <Heart width={12} height={12} /> Save for later
            </button>
          </form>
          <form action={removeLineAction}>
            <input type="hidden" name="key" value={line.key} />
            <button type="submit" className="inline-flex cursor-pointer items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft transition-colors hover:text-ember">
              <Trash2 width={12} height={12} /> Remove
            </button>
          </form>
        </div>
      </div>
    </li>
  );
}

export function TrustStrip() {
  return (
    <section className="border-y border-line-warm bg-bone-soft/60">
      <div className="mx-auto grid max-w-[1240px] gap-6 px-4 py-8 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { title: "Delivery in 2-5 days", body: "Tracked across seven countries" },
          { title: "Buyer protection", body: "Refunded if it never arrives" },
          { title: "30-day returns", body: "Free on orders above $120" },
          { title: "Merchant support", body: "Answered by the seller, not a bot" },
        ].map((item) => (
          <div key={item.title} className="flex items-start gap-3">
            <Truck width={19} height={19} strokeWidth={1.5} className="mt-0.5 shrink-0 text-ember" />
            <div>
              <p className="font-display text-[14px] font-semibold text-ink">{item.title}</p>
              <p className="mt-0.5 text-[12.5px] text-ink-soft">{item.body}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

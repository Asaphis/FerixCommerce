"use client";

import Link from "next/link";
import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  Check,
  Filter,
  LayoutGrid,
  Rows3,
  Search,
  SlidersHorizontal,
  Star,
  X,
} from "lucide-react";
import { CATEGORIES, COLLECTIONS, getMerchant } from "@/lib/data";
import { money, num } from "@/lib/format";
import { useFerixas } from "@/lib/store";
import type { Product } from "@/lib/types";
import { ShopShell } from "@/components/shop/shop-shell";
import { ProductCard } from "@/components/shop/product-card";
import { ProductPlate } from "@/components/shop/product-plate";
import { Eyebrow, Price, Rating } from "@/components/shop/primitives";
import { cn } from "@/lib/utils";

type Sort = "relevant" | "price-asc" | "price-desc" | "newest" | "rating" | "best";

const SORTS: { value: Sort; label: string }[] = [
  { value: "relevant", label: "Most relevant" },
  { value: "best", label: "Best selling" },
  { value: "newest", label: "Newest first" },
  { value: "rating", label: "Highest rated" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
];

export default function BrowsePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-bone" />}>
      <BrowseInner />
    </Suspense>
  );
}

function BrowseInner() {
  const params = useSearchParams();
  const router = useRouter();
  const { products, merchants, follows, toggleFollow } = useFerixas();

  const [query, setQuery] = useState(params.get("q") ?? "");
  const [category, setCategory] = useState(params.get("category") ?? "all");
  const [sort, setSort] = useState<Sort>((params.get("sort") as Sort) ?? "relevant");
  const [maxPrice, setMaxPrice] = useState(2000);
  const [minRating, setMinRating] = useState(0);
  const [merchantIds, setMerchantIds] = useState<string[]>([]);
  const [collection, setCollection] = useState<string>("all");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const feed = useMemo(
    () => products.filter((p) => p.status === "active" && p.channels.marketplace),
    [products],
  );

  const rows = useMemo(() => {
    const filtered = feed.filter((p) => {
      if (category !== "all" && p.category !== category) return false;
      if (collection !== "all" && !p.collections.includes(collection)) return false;
      if (p.price > maxPrice) return false;
      if (minRating && p.rating < minRating) return false;
      if (merchantIds.length && !merchantIds.includes(p.merchantId)) return false;
      if (query.trim()) {
        const hay = `${p.title} ${p.category} ${p.tags.join(" ")} ${getMerchant(p.merchantId).name} ${p.collections.join(" ")}`.toLowerCase();
        if (!query.trim().toLowerCase().split(/\s+/).every((t) => hay.includes(t))) return false;
      }
      return true;
    });
    const sorted = [...filtered];
    switch (sort) {
      case "price-asc":
        sorted.sort((a, b) => a.price - b.price);
        break;
      case "price-desc":
        sorted.sort((a, b) => b.price - a.price);
        break;
      case "newest":
        sorted.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
        break;
      case "rating":
        sorted.sort((a, b) => b.rating - a.rating);
        break;
      case "best":
        sorted.sort((a, b) => b.sold30d - a.sold30d);
        break;
      default:
        sorted.sort((a, b) => b.rating * b.reviewCount - a.rating * a.reviewCount);
    }
    return sorted;
  }, [feed, category, collection, maxPrice, minRating, merchantIds, query, sort]);

  const activeCategory = CATEGORIES.find((c) => c.slug === category);
  const activeFilters =
    (category !== "all" ? 1 : 0) +
    (collection !== "all" ? 1 : 0) +
    (maxPrice < 2000 ? 1 : 0) +
    (minRating ? 1 : 0) +
    merchantIds.length + 1;

  const reset = () => {
    setCategory("all");
    setCollection("all");
    setMaxPrice(2000);
    setMinRating(0);
    setMerchantIds([]);
    setSort("relevant");
  };

  const filterRail = (
    <div className="space-y-6">
      <div>
        <Eyebrow className="text-ember">Departments</Eyebrow>
        <ul className="mt-3 space-y-1">
          <li>
            <button
              type="button"
              onClick={() => setCategory("all")}
              className={cn(
                "flex w-full cursor-pointer items-center justify-between gap-2 rounded-[2px] px-2.5 py-2 text-left text-[13.5px] transition-colors",
                category === "all" ? "bg-ink text-bone" : "text-ink-soft hover:bg-bone-soft",
              )}
            >
              All departments
              <span className="font-mono text-[10.5px]">{feed.length}</span>
            </button>
          </li>
          {CATEGORIES.map((cat) => {
            const count = feed.filter((p) => p.category === cat.slug).length;
            if (!count) return null;
            return (
              <li key={cat.slug}>
                <button
                  type="button"
                  onClick={() => setCategory(cat.slug)}
                  className={cn(
                    "flex w-full cursor-pointer items-center justify-between gap-2 rounded-[2px] px-2.5 py-2 text-left text-[13.5px] transition-colors",
                    category === cat.slug ? "bg-ink text-bone" : "text-ink-soft hover:bg-bone-soft",
                  )}
                >
                  {cat.name}
                  <span className="font-mono text-[10.5px]">{count}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="border-t border-line-warm pt-5">
        <Eyebrow className="text-ember">Collections</Eyebrow>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setCollection("all")}
            className={cn(
              "cursor-pointer rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.1em] transition-colors",
              collection === "all" ? "border-ink bg-ink text-bone" : "border-line-warm text-ink-soft",
            )}
          >
            Any
          </button>
          {COLLECTIONS.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => setCollection(name)}
              className={cn(
                "cursor-pointer rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.1em] transition-colors",
                collection === name ? "border-ink bg-ink text-bone" : "border-line-warm text-ink-soft",
              )}
            >
              {name}
            </button>
          ))}
        </div>
      </div>

      <div className="border-t border-line-warm pt-5">
        <Eyebrow className="text-ember">Maximum price</Eyebrow>
        <input
          type="range"
          min={10}
          max={2000}
          step={10}
          value={maxPrice}
          onChange={(e) => setMaxPrice(Number(e.target.value))}
          aria-label="Maximum price"
          className="mt-3 w-full cursor-pointer accent-[#e4572e]"
        />
        <div className="mt-1 flex items-center justify-between font-mono text-[11px] text-ink-soft">
          <span>$10</span>
          <span className="text-ink">up to {money(maxPrice, { cents: false })}</span>
        </div>
      </div>

      <div className="border-t border-line-warm pt-5">
        <Eyebrow className="text-ember">Rating</Eyebrow>
        <div className="mt-3 space-y-1.5">
          {[0, 4, 4.5].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setMinRating(value)}
              className={cn(
                "flex w-full cursor-pointer items-center gap-2 rounded-[2px] border px-2.5 py-2 text-[13px] transition-colors",
                minRating === value ? "border-ink bg-bone-soft" : "border-line-warm text-ink-soft",
              )}
            >
              {value === 0 ? (
                "Any rating"
              ) : (
                <>
                  <Star width={12} height={12} className="fill-ember text-ember" />
                  {value} and above
                </>
              )}
              {minRating === value ? <Check width={12} height={12} className="ml-auto text-ember" /> : null}
            </button>
          ))}
        </div>
      </div>

      <div className="border-t border-line-warm pt-5">
        <Eyebrow className="text-ember">Merchant</Eyebrow>
        <ul className="mt-3 space-y-1.5">
          {merchants.map((merchant) => {
            const count = feed.filter((p) => p.merchantId === merchant.id).length;
            if (!count) return null;
            const on = merchantIds.includes(merchant.id);
            return (
              <li key={merchant.id} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setMerchantIds((prev) =>
                      on ? prev.filter((id) => id !== merchant.id) : [...prev, merchant.id],
                    )
                  }
                  className={cn(
                    "grid h-4 w-4 shrink-0 cursor-pointer place-items-center rounded-[2px] border transition-colors",
                    on ? "border-ink bg-ink text-lime" : "border-ink/25 text-transparent",
                  )}
                  aria-label={`Filter by ${merchant.name}`}
                >
                  <Check width={10} height={10} />
                </button>
                <span className="min-w-0 flex-1 truncate text-[13px] text-ink-soft">{merchant.name}</span>
                <span className="font-mono text-[10.5px] text-ink-soft/70">{count}</span>
                <button
                  type="button"
                  onClick={() => toggleFollow(merchant.id)}
                  className={cn(
                    "cursor-pointer font-mono text-[9.5px] uppercase tracking-[0.1em]",
                    follows.includes(merchant.id) ? "text-ember" : "text-ink-soft/60",
                  )}
                >
                  {follows.includes(merchant.id) ? "Following" : "Follow"}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="border-t border-line-warm pt-5">
        <button
          type="button"
          onClick={reset}
          className="w-full cursor-pointer rounded-[2px] border border-ink/20 py-2 font-mono text-[10.5px] uppercase tracking-[0.12em] text-ink transition-colors hover:bg-bone-soft"
        >
          Reset all filters
        </button>
      </div>
    </div>
  );

  return (
    <ShopShell>
      <div className="border-b border-line-warm bg-bone-soft/50">
        <div className="mx-auto max-w-[1240px] px-4 py-5">
          <nav className="flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-soft">
            <Link href="/" className="transition-colors hover:text-ember">
              Marketplace
            </Link>
            <span>/</span>
            <span className="text-ink">{activeCategory ? activeCategory.name : "All products"}</span>
          </nav>
          <h1 className="mt-3 font-display text-[26px] font-bold tracking-[-0.02em] text-ink sm:text-[32px]">
            {activeCategory ? activeCategory.name : "Everything on the marketplace"}
          </h1>
          <p className="mt-1.5 max-w-[62ch] text-[13.5px] text-ink-soft">
            {activeCategory?.blurb ??
              `${feed.length} products from ${merchants.length} merchant stores, all bought through one checkout.`}
          </p>
        </div>
      </div>

      <div className="mx-auto flex max-w-[1240px] gap-8 px-4 py-8">
        <aside className="hidden w-[230px] shrink-0 lg:block">
          <div className="sticky top-[132px]">{filterRail}</div>
        </aside>

        <div className="min-w-0 flex-1">
          <div className="mb-5 flex flex-wrap items-center gap-2">
            <div className="relative min-w-[180px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-soft" />
              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  router.replace(e.target.value ? `/browse?q=${encodeURIComponent(e.target.value)}` : "/browse");
                }}
                placeholder="Search within results"
                aria-label="Search products"
                className="h-10 w-full rounded-[2px] border border-ink/15 bg-white pl-9 pr-3 text-[13.5px] outline-none transition-colors focus:border-ink"
              />
            </div>
            <button
              type="button"
              onClick={() => setFiltersOpen(true)}
              className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-[2px] border border-ink/15 px-3 text-[13px] text-ink lg:hidden"
            >
              <Filter width={14} height={14} />
              Filters
              <span className="rounded-[2px] bg-ink px-1.5 font-mono text-[10px] text-bone">
                {activeFilters}
              </span>
            </button>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as Sort)}
              aria-label="Sort products"
              className="h-10 cursor-pointer rounded-[2px] border border-ink/15 bg-white px-3 text-[13px] text-ink outline-none focus:border-ink"
            >
              {SORTS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <div className="hidden items-center gap-0.5 rounded-[2px] border border-ink/15 p-[3px] sm:flex">
              {([
                ["grid", LayoutGrid],
                ["list", Rows3],
              ] as const).map(([value, Icon]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setView(value)}
                  aria-label={`${value} view`}
                  className={cn(
                    "grid h-7 w-8 cursor-pointer place-items-center rounded-[2px] transition-colors",
                    view === value ? "bg-ink text-bone" : "text-ink-soft",
                  )}
                >
                  <Icon width={14} height={14} />
                </button>
              ))}
            </div>
          </div>

          <div className="mb-4 flex items-center justify-between border-b border-line-warm pb-3">
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft">
              {num(rows.length)} results
              {query ? ` for \u201c${query}\u201d` : ""}
            </p>
            {merchantIds.length ? (
              <button
                type="button"
                onClick={() => setMerchantIds([])}
                className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-ember"
              >
                Clear merchants
              </button>
            ) : null}
          </div>

          {rows.length ? (
            view === "grid" ? (
              <div className="grid grid-cols-2 gap-x-4 gap-y-9 sm:grid-cols-3 xl:grid-cols-4">
                {rows.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <ul className="divide-y divide-line-warm">
                {rows.map((product) => (
                  <ListRow key={product.id} product={product} />
                ))}
              </ul>
            )
          ) : (
            <div className="flex flex-col items-center gap-3 rounded-[3px] border border-line-warm bg-white py-20 text-center">
              <SlidersHorizontal width={22} height={22} className="text-ink-soft" />
              <p className="font-display text-[16px] font-semibold text-ink">
                Nothing matches those filters yet
              </p>
              <p className="max-w-[38ch] text-[13px] text-ink-soft">
                Try widening the price range or clearing the merchant filter.
              </p>
              <button
                type="button"
                onClick={reset}
                className="mt-1 cursor-pointer rounded-[2px] bg-ink px-4 py-2 text-[13px] text-bone"
              >
                Reset filters
              </button>
            </div>
          )}

          <div className="mt-10 rounded-[3px] border border-line-warm bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <Eyebrow className="text-ember">Merchant stores</Eyebrow>
                <p className="mt-2 font-display text-[16px] font-semibold text-ink">
                  Shop a single brand instead
                </p>
                <p className="mt-1 max-w-[46ch] text-[13px] text-ink-soft">
                  Every merchant here also runs a branded storefront with its own design, domain
                  and promotions.
                </p>
              </div>
              <Link
                href="/stores"
                className="inline-flex cursor-pointer items-center gap-2 rounded-[2px] bg-ink px-4 py-2.5 text-[13px] text-bone transition-colors hover:bg-ember"
              >
                Browse stores <ArrowRight width={14} height={14} />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {filtersOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close filters"
            onClick={() => setFiltersOpen(false)}
            className="absolute inset-0 cursor-default bg-ink/60 backdrop-blur-sm"
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[86vh] overflow-y-auto rounded-t-[10px] border-t border-line-warm bg-bone p-4">
            <div className="mb-4 flex items-center justify-between">
              <span className="font-display text-[15px] font-semibold text-ink">Filters</span>
              <button
                type="button"
                onClick={() => setFiltersOpen(false)}
                aria-label="Close"
                className="grid h-8 w-8 cursor-pointer place-items-center rounded-[2px] border border-ink/15 text-ink"
              >
                <X width={15} height={15} />
              </button>
            </div>
            {filterRail}
            <button
              type="button"
              onClick={() => setFiltersOpen(false)}
              className="mt-5 w-full cursor-pointer rounded-[2px] bg-ink py-3 font-mono text-[11px] uppercase tracking-[0.14em] text-bone"
            >
              Show {rows.length} results
            </button>
          </div>
        </div>
      ) : null}
    </ShopShell>
  );
}

function ListRow({ product }: { product: Product }) {
  const merchant = getMerchant(product.merchantId);
  return (
    <li className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center">
      <Link href={`/product/${product.slug}`} className="shrink-0">
        <ProductPlate product={product} className="h-[132px] w-[132px] rounded-[3px]" />
      </Link>
      <div className="min-w-0 flex-1">
        <Link
          href={`/store/${merchant.slug}`}
          className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft transition-colors hover:text-ember"
        >
          {merchant.name}
        </Link>
        <h2 className="mt-1.5">
          <Link
            href={`/product/${product.slug}`}
            className="font-display text-[17px] font-semibold text-ink transition-colors hover:text-ember"
          >
            {product.title}
          </Link>
        </h2>
        <p className="mt-1.5 line-clamp-2 max-w-[68ch] text-[13px] leading-relaxed text-ink-soft">
          {product.description} {product.bullets[0] ? `\u00b7 ${product.bullets[0]}` : ""}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-4">
          <Rating value={product.rating} count={product.reviewCount} />
          <span className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-ink-soft">
            {product.collections.slice(0, 2).join(" \u00b7 ")}
          </span>
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
        <Price price={product.price} compareAt={product.compareAt} size="lg" />
        <Link
          href={`/product/${product.slug}`}
          className="inline-flex cursor-pointer items-center gap-2 rounded-[2px] bg-ink px-4 py-2 text-[13px] text-bone transition-colors hover:bg-ember"
        >
          View product
        </Link>
      </div>
    </li>
  );
}

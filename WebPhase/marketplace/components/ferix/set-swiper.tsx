"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Product } from "@/lib/api";
import { ProductCard } from "@/components/ferix/cards";
import { cn } from "@/lib/utils";

/**
 * Products in sets of rows, swiped for the next set.
 *
 * The set arrangement is what stops a page becoming an endless column: the section
 * stands exactly as tall as the rows it was told to show, and the rest of its
 * products wait one swipe away instead of pushing everything below them out of reach.
 *
 * The swipe is the platform's own - a scroll container with snap points, which is
 * what a finger already does - so nothing here fights the browser's scrolling and no
 * touch handling is written by hand. The dots follow the scroll position, so they say
 * where you are rather than decorating the space.
 */
export function SetSwiper({
  products,
  savedIds = [],
  across = 2,
  rowsPerSet = 2,
  className,
}: {
  products: Product[];
  savedIds?: string[];
  across?: number;
  rowsPerSet?: number;
  className?: string;
}) {
  const columns = Math.min(4, Math.max(1, Math.round(Number(across) || 2)));
  const rows = Math.min(6, Math.max(1, Math.round(Number(rowsPerSet) || 2)));
  const perSet = columns * rows;

  const sets: Product[][] = [];
  for (let index = 0; index < products.length; index += perSet) {
    sets.push(products.slice(index, index + perSet));
  }

  const rail = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  const onScroll = useCallback(() => {
    const element = rail.current;
    if (!element) return;
    const width = element.clientWidth || 1;
    setActive(Math.min(sets.length - 1, Math.max(0, Math.round(element.scrollLeft / width))));
  }, [sets.length]);

  useEffect(() => {
    setActive(0);
    if (rail.current) rail.current.scrollLeft = 0;
  }, [products.length, perSet]);

  const width: Record<number, string> = {
    1: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    2: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4",
    3: "grid-cols-3 sm:grid-cols-4 lg:grid-cols-6",
    4: "grid-cols-4 sm:grid-cols-6 lg:grid-cols-6",
  };
  const grid = cn("grid gap-x-2.5 gap-y-4 sm:gap-x-3.5 sm:gap-y-6", width[columns]);

  // One set is not a carousel: it is simply a grid, and a rail you cannot move is
  // worse than no rail at all.
  if (sets.length <= 1) {
    return (
      <div className={cn(grid, className)}>
        {products.map((product) => (
          <ProductCard key={product.id} product={product} saved={savedIds.includes(product.id)} />
        ))}
      </div>
    );
  }

  return (
    <div className={className}>
      <div
        ref={rail}
        onScroll={onScroll}
        className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto pb-1"
        role="group"
        aria-label={`Products in ${sets.length} sets`}
      >
        {sets.map((set, index) => (
          <div key={index} className="w-full shrink-0 snap-start pr-3 last:pr-0">
            <div className={grid}>
              {set.map((product) => (
                <ProductCard key={product.id} product={product} saved={savedIds.includes(product.id)} />
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-center gap-1.5">
        {sets.map((_, index) => (
          <span
            key={index}
            className={index === active ? "h-1.5 w-[18px] rounded-full bg-ember" : "h-1.5 w-1.5 rounded-full bg-line-warm"}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * One row of products, running off the edge.
 *
 * The third arrangement a section can choose. It is not a set: there is a single row and it
 * scrolls continuously, so the shopper drags sideways rather than turning a page. The items
 * are sized from the section's "across", which is why a wider screen shows more of them
 * rather than the same two, enormous.
 */
export function HorizontalRail({
  products,
  savedIds = [],
  across = 2,
  className,
}: {
  products: Product[];
  savedIds?: string[];
  across?: number;
  className?: string;
}) {
  const visible = Math.min(4, Math.max(1, Math.round(Number(across) || 2)));

  // A peek of the next card, so it is visibly draggable rather than looking cut off.
  const basis: Record<number, string> = {
    1: "w-[82%] sm:w-[46%] lg:w-[31%]",
    2: "w-[46%] sm:w-[31%] lg:w-[23%]",
    3: "w-[31%] sm:w-[23%] lg:w-[15%]",
    4: "w-[23%] sm:w-[15%] lg:w-[12%]",
  };

  return (
    <div className={className}>
      <div
        className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:gap-3.5 sm:px-0"
        role="group"
        aria-label="Products in a row, swipe sideways for more"
      >
        {products.map((product) => (
          <div key={product.id} className={cn("shrink-0 snap-start", basis[visible])}>
            <ProductCard product={product} saved={savedIds.includes(product.id)} />
          </div>
        ))}
      </div>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Category } from "@/lib/api";
import { CategoryTile } from "@/components/ferix/cards";
import { cn } from "@/lib/utils";

/**
 * Departments in sets of rows, swiped for the next set.
 *
 * The same arrangement the product rows use, for tiles: the band stands exactly as tall
 * as the rows it was told to show, and the remaining departments wait one swipe away
 * rather than pushing everything below them down the page.
 *
 * As with the products, the swipe is the platform's own - a scroll container with snap
 * points - so no touch handling is written by hand, and the dots follow the scroll.
 */
export function TileSwiper({
  categories,
  across = 3,
  rowsPerSet = 2,
  size = "default",
  className,
}: {
  categories: Category[];
  across?: number;
  rowsPerSet?: number;
  size?: "default" | "large";
  className?: string;
}) {
  const columns = Math.min(4, Math.max(1, Math.round(Number(across) || 3)));
  const rows = Math.min(6, Math.max(1, Math.round(Number(rowsPerSet) || 2)));
  const perSet = columns * rows;

  const sets: Category[][] = [];
  for (let index = 0; index < categories.length; index += perSet) {
    sets.push(categories.slice(index, index + perSet));
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
  }, [categories.length, perSet]);

  const width: Record<number, string> = {
    1: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    2: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4",
    3: "grid-cols-3 sm:grid-cols-4 lg:grid-cols-6",
    4: "grid-cols-4 sm:grid-cols-6 lg:grid-cols-6",
  };
  const grid = cn("grid gap-2 sm:gap-3", width[columns]);

  if (sets.length <= 1) {
    return (
      <div className={cn(grid, className)}>
        {categories.map((category) => (
          <CategoryTile key={category.slug} category={category} size={size} />
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
        aria-label={`Departments in ${sets.length} sets`}
      >
        {sets.map((set, index) => (
          <div key={index} className="w-full shrink-0 snap-start pr-3 last:pr-0">
            <div className={grid}>
              {set.map((category) => (
                <CategoryTile key={category.slug} category={category} size={size} />
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

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Category } from "@/lib/api";
import { CategoryTile } from "@/components/ferix/cards";
import { cn } from "@/lib/utils";

function columnsAtWidth(phoneColumns: number, width: number) {
  if (width >= 1024) return phoneColumns <= 2 ? 4 : 6;
  if (width >= 640) {
    if (phoneColumns === 1) return 2;
    if (phoneColumns === 2) return 3;
    if (phoneColumns === 3) return 4;
    return 6;
  }
  return phoneColumns;
}

function numberWord(value: number) {
  const words = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
  return words[value] ?? String(value);
}

/** Departments grouped into full responsive faces with scroll-snap pagination. */
export function TileSwiper({
  categories,
  across = 2,
  rowsPerSet = 2,
  size = "default",
  className,
}: {
  categories: Category[];
  /** Number of tiles per row on a phone; larger breakpoints scale up. */
  across?: number;
  rowsPerSet?: number;
  size?: "default" | "large";
  className?: string;
}) {
  const phoneColumns = Math.min(4, Math.max(1, Math.round(Number(across) || 2)));
  const rows = Math.min(3, Math.max(1, Math.round(Number(rowsPerSet) || 2)));
  const [visibleColumns, setVisibleColumns] = useState(phoneColumns);
  const perFace = visibleColumns * rows;
  const sets: Category[][] = [];
  for (let index = 0; index < categories.length; index += perFace) {
    sets.push(categories.slice(index, index + perFace));
  }

  const rail = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const update = () => setVisibleColumns(columnsAtWidth(phoneColumns, window.innerWidth));
    update();
    window.addEventListener("resize", update, { passive: true });
    return () => window.removeEventListener("resize", update);
  }, [phoneColumns]);

  const onScroll = useCallback(() => {
    const element = rail.current;
    if (!element) return;
    const width = element.clientWidth || 1;
    setActive(Math.min(sets.length - 1, Math.max(0, Math.round(element.scrollLeft / width))));
  }, [sets.length]);

  useEffect(() => {
    setActive(0);
    if (rail.current) rail.current.scrollLeft = 0;
  }, [categories.length, perFace]);

  const gridStyle = { gridTemplateColumns: `repeat(${visibleColumns}, minmax(0, 1fr))` };
  const grid = cn("grid gap-2 sm:gap-3");

  if (sets.length <= 1) {
    return (
      <div className={cn(grid, className)} style={gridStyle}>
        {categories.map((category) => <CategoryTile key={category.slug} category={category} size={size} />)}
      </div>
    );
  }

  const goToFace = (index: number) => {
    const element = rail.current;
    if (!element) return;
    element.scrollTo({ left: index * element.clientWidth, behavior: "smooth" });
  };

  return (
    <div className={className}>
      <div
        ref={rail}
        onScroll={onScroll}
        className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto pb-1"
        role="group"
        aria-label={`Departments in ${sets.length} swipe faces`}
      >
        {sets.map((set, index) => (
          <div key={index} className="w-full shrink-0 snap-start pr-3 last:pr-0">
            <div className={grid} style={gridStyle}>
              {set.map((category) => <CategoryTile key={category.slug} category={category} size={size} />)}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-2.5 flex flex-col items-center gap-1.5 text-center">
        <div className="flex items-center justify-center" role="group" aria-label="Choose department face">
          {sets.map((_, index) => (
            <button
              key={index}
              type="button"
              onClick={() => goToFace(index)}
              aria-label={`Show face ${index + 1} of ${sets.length}`}
              aria-current={index === active ? "page" : undefined}
              className="grid h-7 w-7 cursor-pointer place-items-center"
            >
              <span className={index === active ? "h-1.5 w-4 rounded-full bg-ember" : "h-1.5 w-1.5 rounded-full bg-line-warm"} />
            </button>
          ))}
        </div>
        <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-ink-soft" aria-live="polite">
          Face {active + 1} of {sets.length}
        </p>
        <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-ink-soft">
          Swipe for the next {numberWord(perFace)}
        </p>
      </div>
    </div>
  );
}

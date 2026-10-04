/** Route-level loading skeleton: a generic page — header lines plus a card grid. */
export default function Loading() {
  return (
    <div className="mx-auto max-w-[1240px] px-4 py-8" aria-busy="true">
      <span className="sr-only">Loading this page</span>

      <div className="h-3 w-24 animate-pulse rounded-[2px] bg-bone-soft" />
      <div className="mt-3 h-7 w-full max-w-[420px] animate-pulse rounded-[2px] bg-bone-soft" />
      <div className="mt-3 h-3 w-full max-w-[520px] animate-pulse rounded-[2px] bg-bone-soft" />

      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="rounded-[3px] border border-line-warm bg-white p-3">
            <div className="aspect-[4/5] w-full animate-pulse rounded-[2px] bg-bone-soft" />
            <div className="mt-3 h-3 w-3/4 animate-pulse rounded-[2px] bg-bone-soft" />
            <div className="mt-2 h-3 w-1/2 animate-pulse rounded-[2px] bg-bone-soft" />
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="rounded-[3px] border border-line-warm bg-white p-4">
            <div className="h-3 w-20 animate-pulse rounded-[2px] bg-bone-soft" />
            <div className="mt-3 h-4 w-2/3 animate-pulse rounded-[2px] bg-bone-soft" />
            <div className="mt-2 h-3 w-full animate-pulse rounded-[2px] bg-bone-soft" />
          </div>
        ))}
      </div>
    </div>
  );
}

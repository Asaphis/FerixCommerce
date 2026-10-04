"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RotateCcw } from "lucide-react";

/**
 * Route-level error boundary.
 *
 * Renders inside the root layout, so the header, footer and mobile tab bar stay
 * in place and the shopper always has a way out. Every access is defensive: this
 * component must never throw, whatever shape `error` arrives in.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const message = typeof error?.message === "string" ? error.message : "";
  const digest = typeof error?.digest === "string" ? error.digest : undefined;

  useEffect(() => {
    try {
      console.error(error);
    } catch {
      /* logging must never break the fallback */
    }
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-[440px] flex-col justify-center px-4 py-10">
      <div className="rounded-[3px] border border-line-warm bg-white p-5 lg:p-6">
        <span className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-ember">Something went wrong</span>
        <h1 className="mt-2 font-display text-[26px] font-semibold leading-tight text-ink">
          This page stopped loading
        </h1>
        <p className="mt-2.5 text-[13.5px] leading-relaxed text-ink-soft">
          A temporary problem on our side interrupted the page. Trying again usually fixes it; nothing in your cart or
          account has been lost.
        </p>

        <div className="mt-6 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              try {
                reset();
              } catch {
                /* if the retry itself fails, stay on this screen */
              }
            }}
            className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-[2px] bg-ink px-4 py-2.5 text-[13px] font-semibold text-bone transition-colors duration-200 hover:bg-ember"
          >
            <RotateCcw width={15} height={15} strokeWidth={1.8} />
            Try again
          </button>
          <Link
            href="/"
            className="inline-flex cursor-pointer items-center justify-center rounded-[2px] border border-ink/25 px-4 py-2.5 text-[13px] font-semibold text-ink transition-colors duration-200 hover:border-ink hover:bg-ink hover:text-bone"
          >
            Back to home
          </Link>
        </div>

        <div className="mt-6 rounded-[2px] border border-line-warm bg-bone-soft px-3 py-2.5">
          <p className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-ink-soft">
            {digest ? `Reference ${digest}` : "No reference code"}
          </p>
          <p className="mt-1 break-words text-[12px] leading-relaxed text-ink-soft">
            {message ? message : "No further detail was reported."}
          </p>
        </div>

        <p className="mt-4 text-[12.5px] leading-relaxed text-ink-soft">
          Still stuck?{" "}
          <Link href="/help" className="text-ink underline decoration-ember decoration-2 underline-offset-4">
            Tell the help centre
          </Link>{" "}
          what you were doing when it broke.
        </p>
      </div>
    </div>
  );
}

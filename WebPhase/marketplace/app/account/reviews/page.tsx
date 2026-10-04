import Link from "next/link";
import { Pencil, Trash2 } from "lucide-react";
import { requireAccount } from "@/lib/data";
import { deleteReviewAction } from "@/lib/actions";
import { AccountShell } from "@/components/ferix/account-shell";
import { ReviewForm } from "@/components/ferix/forms";
import { Pill, Stars } from "@/components/ferix/marks";
import { dateShort } from "@/lib/format";

export default async function ReviewsPage() {
  const account = await requireAccount();
  const { reviews } = account;

  return (
    <AccountShell
      account={account}
      title="Your reviews"
      description="Everything you have written, ready to edit or remove. Reviews are attached to your account, not the browser."
    >
      {reviews.length ? (
        <div className="space-y-3">
          {reviews.map((review) => (
            <section key={review.id} className="rounded-[3px] border border-line-warm bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  {review.product ? (
                    <Link
                      href={`/product/${review.product.slug}`}
                      className="font-display text-[15px] font-semibold text-ink transition-colors hover:text-ember"
                    >
                      {review.product.title}
                    </Link>
                  ) : (
                    <p className="font-display text-[15px] font-semibold text-ink">Product no longer listed</p>
                  )}
                  <div className="mt-1.5 flex flex-wrap items-center gap-2.5">
                    <Stars value={review.rating} size={11} />
                    <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft">
                      {dateShort(review.date)}
                    </span>
                    {review.verified ? <Pill tone="success">Verified buyer</Pill> : null}
                  </div>
                </div>
                <form action={deleteReviewAction}>
                  <input type="hidden" name="id" value={review.id} />
                  <button
                    type="submit"
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-[2px] border border-line-warm px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft transition-colors hover:border-ember/40 hover:text-ember"
                  >
                    <Trash2 width={12} height={12} /> Delete
                  </button>
                </form>
              </div>

              <p className="mt-3 font-display text-[14px] font-semibold text-ink">{review.title}</p>
              <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-soft">{review.body}</p>

              <details className="mt-4 border-t border-line-warm pt-4">
                <summary className="inline-flex cursor-pointer items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft transition-colors hover:text-ink">
                  <Pencil width={12} height={12} /> Edit this review
                </summary>
                <div className="mt-4">
                  <ReviewForm review={review} />
                </div>
              </details>
            </section>
          ))}
        </div>
      ) : (
        <div className="rounded-[3px] border border-dashed border-line-warm px-6 py-12 text-center">
          <p className="font-display text-[16px] font-semibold text-ink">No reviews yet</p>
          <p className="mx-auto mt-2 max-w-[48ch] text-[13.5px] text-ink-soft">
            Open any product you have bought and use the review form at the bottom of the page. It will appear here
            straight away.
          </p>
          <Link
            href="/account/orders"
            className="mt-5 inline-block font-mono text-[10px] uppercase tracking-[0.14em] text-ember underline decoration-2 underline-offset-4"
          >
            Go to your orders
          </Link>
        </div>
      )}
    </AccountShell>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { Check, Clock, RotateCcw, ShieldCheck, X } from "lucide-react";
import { Eyebrow, LinkButton } from "@/components/ferix/marks";

export const metadata: Metadata = {
  title: "Return policy — Ferixas",
  description:
    "How returns work on Ferixas: 30 days from delivery, free return delivery on orders above $120, refunds within five working days.",
};

const STEPS = [
  {
    step: "01",
    title: "Start the return from the order",
    body: "Open the order in your account, pick the item and choose a reason. Nothing to print and no phone call needed.",
  },
  {
    step: "02",
    title: "The seller issues a label or a slot",
    body: "You get a carrier label by email within one working day, or a collection slot if the parcel is large.",
  },
  {
    step: "03",
    title: "Send it back within 14 days",
    body: "Once the label is issued, post it within 14 days. Keep the drop-off receipt until the refund lands.",
  },
  {
    step: "04",
    title: "Refund within five working days",
    body: "We refund as soon as the seller confirms receipt, back to the method you paid with.",
  },
];

const ELIGIBLE = [
  "Anything unused, in its original packaging, within 30 days of delivery",
  "Faulty or damaged items, at any point in the first 30 days",
  "Items that are not what you ordered, including the wrong size or colour",
  "Parcels that never arrived — refunded under buyer protection",
];

const NOT_ELIGIBLE = [
  "Perishable goods and anything with a use-by date",
  "Opened personal care, cosmetics or hygiene products",
  "Items cut, mixed or made to your specification",
  "Digital downloads and gift cards once they are redeemed",
  "Items returned more than 30 days after delivery, unless faulty",
];

export default function ReturnsPage() {
  return (
    <div className="mx-auto max-w-[1240px] px-4 py-8 lg:px-6">
      <Eyebrow>Policy</Eyebrow>
      <h1 className="mt-2 font-display text-[26px] font-semibold text-ink">Return policy</h1>
      <p className="mt-2 max-w-[72ch] text-[13.5px] leading-relaxed text-ink-soft">
        Thirty days to change your mind, whichever merchant you bought from. Return delivery is free on orders above
        $120, and the refund comes from Ferixas rather than the seller, so you are never stuck in the middle.
      </p>

      <section className="mt-8">
        <h2 className="font-display text-[19px] font-semibold text-ink">How a return works</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((item) => (
            <article key={item.step} className="flex flex-col rounded-[3px] border border-line-warm bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="grid h-8 w-8 place-items-center rounded-[2px] bg-bone-soft text-ember">
                  <RotateCcw width={15} height={15} strokeWidth={1.8} />
                </span>
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft">{item.step}</span>
              </div>
              <h3 className="mt-3 font-display text-[14.5px] font-semibold text-ink">{item.title}</h3>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-soft">{item.body}</p>
            </article>
          ))}
        </div>
        <p className="mt-4 flex flex-wrap items-center gap-2 rounded-[2px] border border-line-warm bg-bone-soft px-3 py-2.5 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft">
          <Clock width={13} height={13} />
          30 days from delivery · return delivery free above $120 · $4.50 below it, waived on faults
        </p>
      </section>

      <section className="mt-8">
        <h2 className="font-display text-[19px] font-semibold text-ink">What can and cannot be returned</h2>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          <div className="rounded-[3px] border border-line-warm bg-white p-4">
            <p className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-ink-soft">Accepted</p>
            <ul className="mt-3 space-y-2.5">
              {ELIGIBLE.map((line) => (
                <li key={line} className="flex items-start gap-2.5 text-[12.5px] leading-relaxed text-ink">
                  <Check width={14} height={14} strokeWidth={2} className="mt-[2px] shrink-0 text-pine" />
                  {line}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-[3px] border border-line-warm bg-white p-4">
            <p className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-ink-soft">Not accepted</p>
            <ul className="mt-3 space-y-2.5">
              {NOT_ELIGIBLE.map((line) => (
                <li key={line} className="flex items-start gap-2.5 text-[12.5px] leading-relaxed text-ink-soft">
                  <X width={14} height={14} strokeWidth={2} className="mt-[2px] shrink-0 text-ember" />
                  {line}
                </li>
              ))}
            </ul>
            <p className="mt-3 border-t border-line-warm pt-3 text-[12px] leading-relaxed text-ink-soft">
              Merchants must show these exclusions on the product page before you buy. If they are not shown, the
              standard 30-day window applies.
            </p>
          </div>
        </div>
      </section>

      <section className="mt-8 rounded-[3px] border border-hairline bg-void px-5 py-7 sm:px-8">
        <Eyebrow className="text-lime">Money back</Eyebrow>
        <h2 className="mt-2 font-display text-[22px] font-semibold text-chalk sm:text-[26px]">
          Refunds, timing and buyer protection
        </h2>
        <div className="mt-6 grid gap-6 sm:grid-cols-3">
          {[
            { title: "Five working days", body: "From the seller confirming receipt of the return to the refund leaving our account." },
            { title: "Original method", body: "Card, wallet or bank transfer — the same way you paid. Card posting can add a few days." },
            { title: "Delivery refunded", body: "On faulty, damaged or wrong items, and on any order that never arrived, delivery is refunded too." },
          ].map((item) => (
            <div key={item.title}>
              <p className="flex items-center gap-2 font-display text-[15px] font-semibold text-lime">
                <ShieldCheck width={15} height={15} strokeWidth={1.8} />
                {item.title}
              </p>
              <p className="mt-2 text-[12.5px] leading-relaxed text-chalk-dim">{item.body}</p>
            </div>
          ))}
        </div>
        <div className="mt-6 flex flex-wrap gap-2.5">
          <LinkButton href="/account/orders" variant="light">
            Start a return
          </LinkButton>
          <LinkButton href="/contact" variant="ghost" className="text-chalk-dim hover:text-lime">
            Problem with a return
          </LinkButton>
        </div>
        <p className="mt-5 font-mono text-[10px] uppercase tracking-[0.14em] text-chalk-dim">
          Related:{" "}
          <Link href="/shipping-policy" className="text-chalk transition-colors hover:text-lime">
            Shipping policy
          </Link>{" "}
          ·{" "}
          <Link href="/faq#returns" className="text-chalk transition-colors hover:text-lime">
            Returns FAQ
          </Link>
        </p>
      </section>
    </div>
  );
}

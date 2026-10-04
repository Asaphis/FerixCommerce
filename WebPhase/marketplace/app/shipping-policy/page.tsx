import type { Metadata } from "next";
import Link from "next/link";
import { Globe, MapPin, Package, ShieldCheck, Truck } from "lucide-react";
import { Eyebrow, LinkButton } from "@/components/ferix/marks";

export const metadata: Metadata = {
  title: "Shipping policy — Ferixas",
  description:
    "Delivery options, timelines and costs on Ferixas: standard 2–5 working days, express 1–2 days, collect from seller in 24 hours, free over $120.",
};

const OPTIONS = [
  {
    title: "Standard delivery",
    eta: "2–5 working days",
    price: "Free over $120",
    body: "Tracked door delivery from the seller’s own dispatch. Below $120 the fee is a flat $6.90 per order, however many sellers are in it.",
  },
  {
    title: "Express delivery",
    eta: "1–2 working days",
    price: "$14.50",
    body: "Offered by sellers who can meet it. Order before 14:00 on a working day and the parcel leaves the same afternoon.",
  },
  {
    title: "Collect from seller",
    eta: "Ready in 24 hours",
    price: "Free",
    body: "Pick the parcel up from the merchant’s counter or a Ferixas collect point. You get a code when it is ready and 7 days to collect it.",
  },
  {
    title: "Cross-border tracked",
    eta: "2–5 working days",
    price: "$9.40",
    body: "Available to the seven countries we serve. Customs paperwork is handled by the seller, and the parcel is tracked the whole way.",
  },
];

export default function ShippingPolicyPage() {
  return (
    <div className="mx-auto max-w-[1240px] px-4 py-8 lg:px-6">
      <Eyebrow>Policy</Eyebrow>
      <h1 className="mt-2 font-display text-[26px] font-semibold text-ink">Shipping policy</h1>
      <p className="mt-2 max-w-[72ch] text-[13.5px] leading-relaxed text-ink-soft">
        Every merchant on Ferixas packs and dispatches their own items, so delivery is a promise between you and the
        seller — backed by the platform. Here is what the timelines, prices and tracking actually mean.
      </p>

      <section className="mt-8">
        <h2 className="font-display text-[19px] font-semibold text-ink">Delivery options and timelines</h2>
        <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
          {OPTIONS.map((option) => (
            <div key={option.title} className="rounded-[3px] border border-line-warm bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="font-display text-[15px] font-semibold text-ink">{option.title}</p>
                <p className="font-mono text-[12.5px] font-semibold text-ink">{option.price}</p>
              </div>
              <p className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft">{option.eta}</p>
              <p className="mt-2 text-[12.5px] leading-relaxed text-ink-soft">{option.body}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 flex flex-wrap items-center gap-2 rounded-[2px] border border-line-warm bg-bone-soft px-3 py-2.5 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft">
          <Truck width={13} height={13} />
          One delivery fee per order · free above $120 · timelines run from dispatch, not checkout
        </p>
      </section>

      <section className="mt-8">
        <h2 className="font-display text-[19px] font-semibold text-ink">One order, more than one parcel</h2>
        <div className="mt-4 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="max-w-[72ch] space-y-3">
            <p className="text-[13.5px] leading-relaxed text-ink-soft">
              A cart can hold items from several independent stores. Each of those sellers packs and ships what they
              own, on their own carrier account, so a single Ferixas order often arrives as two or three parcels on
              different days.
            </p>
            <p className="text-[13.5px] leading-relaxed text-ink-soft">
              You are never charged extra for that split: the delivery fee is calculated once per order at checkout,
              and if the order qualifies for free delivery above $120, every parcel in it ships free. Each parcel gets
              its own tracking entry in your account, so you can see which part is moving and which is still being
              packed.
            </p>
          </div>
          <ul className="grid content-start gap-3 rounded-[3px] border border-line-warm bg-white p-4">
            {[
              { Icon: Package, text: "Sellers dispatch within two working days of accepting an order." },
              { Icon: MapPin, text: "Tracking appears on the order as soon as the first scan is recorded." },
              { Icon: Globe, text: "Cross-border parcels are tracked across all seven countries we serve." },
              { Icon: ShieldCheck, text: "Delays are the seller’s problem to solve, not yours to chase." },
            ].map((item) => (
              <li key={item.text} className="flex items-start gap-2.5 text-[12.5px] leading-relaxed text-ink-soft">
                <item.Icon width={15} height={15} strokeWidth={1.7} className="mt-[2px] shrink-0 text-ember" />
                {item.text}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mt-8 rounded-[3px] border border-hairline bg-void px-5 py-7 sm:px-8">
        <Eyebrow className="text-lime">When something goes wrong</Eyebrow>
        <h2 className="mt-2 font-display text-[22px] font-semibold text-chalk sm:text-[26px]">
          Late, damaged or never delivered
        </h2>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              title: "Past the estimate",
              body: "If tracking has not moved for five working days beyond the estimate, tell us and we chase the seller and carrier for you.",
            },
            {
              title: "Arrived damaged",
              body: "Send photos through the order within 48 hours of delivery and the seller issues a replacement or a full refund, return delivery paid.",
            },
            {
              title: "Never arrived",
              body: "Buyer protection refunds the item and its delivery in full, without you having to negotiate with the merchant.",
            },
          ].map((item) => (
            <div key={item.title} className="rounded-[3px] border border-hairline bg-panel p-4">
              <p className="font-display text-[14.5px] font-semibold text-chalk">{item.title}</p>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-chalk-dim">{item.body}</p>
            </div>
          ))}
        </div>
        <div className="mt-6 flex flex-wrap gap-2.5">
          <LinkButton href="/account/orders" variant="light">
            Track an order
          </LinkButton>
          <LinkButton href="/contact" variant="ghost" className="text-chalk-dim hover:text-lime">
            Report a delivery problem
          </LinkButton>
        </div>
        <p className="mt-5 font-mono text-[10px] uppercase tracking-[0.14em] text-chalk-dim">
          Related:{" "}
          <Link href="/returns" className="text-chalk transition-colors hover:text-lime">
            Return policy
          </Link>{" "}
          ·{" "}
          <Link href="/faq#delivery" className="text-chalk transition-colors hover:text-lime">
            Delivery FAQ
          </Link>
        </p>
      </section>
    </div>
  );
}

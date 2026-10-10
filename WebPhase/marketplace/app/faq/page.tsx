import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Eyebrow, LinkButton } from "@/components/ferix/marks";

export const metadata: Metadata = {
  title: "Frequently asked questions — Ferixas",
  description:
    "Answers about orders, payment, delivery, returns, your account and selling on the Ferixas multi-merchant marketplace.",
};

type Group = {
  id: string;
  title: string;
  note: string;
  items: { q: string; a: string }[];
};

const GROUPS: Group[] = [
  {
    id: "orders",
    title: "Orders",
    note: "One cart, several sellers, sometimes several parcels.",
    items: [
      {
        q: "Why has only part of my order arrived?",
        a: "Because each merchant packs and ships their own items. A four-item order from three sellers becomes three parcels, each with its own tracking. Nothing is missing — the rest is still in transit and will appear in your orders as it moves.",
      },
      {
        q: "How do I track a parcel?",
        a: "Open your orders and pick the order. Once a seller dispatches, the carrier and tracking number appear on that order and update as the parcel moves between the seven countries we serve.",
      },
      {
        q: "Can I cancel or change an order?",
        a: "You can cancel anything still marked Processing from your order page. Once a seller has packed and dispatched, cancellation closes and the return window takes over — you have 30 days from delivery.",
      },
      {
        q: "Can I add an item after checkout?",
        a: "No. Orders are sent to each seller immediately, so we cannot merge or amend them. Place a second order; it will be shipped and tracked separately.",
      },
    ],
  },
  {
    id: "payment",
    title: "Payment and pricing",
    note: "One payment for the whole cart, split behind the scenes.",
    items: [
      {
        q: "When am I charged?",
        a: "Your card is authorised when you place the order and captured when the first seller accepts it. If every seller declines, the authorisation is released within 3–5 working days and nothing is taken.",
      },
      {
        q: "Am I charged once per seller?",
        a: "No. You pay Ferixas once for the entire cart, including one delivery fee per order. We settle with each merchant afterwards, so your statement shows a single Ferixas line.",
      },
      {
        q: "Which currencies do you accept?",
        a: "USD, GBP, EUR, NGN and ZAR. You choose a display currency in your account settings and the total is converted at checkout, with any conversion fee shown before you confirm.",
      },
      {
        q: "Do you price match a later discount?",
        a: "We do not refund the difference if an item drops after you order. If the order has not shipped you can cancel and buy again at the lower price.",
      },
    ],
  },
  {
    id: "delivery",
    title: "Delivery",
    note: "2–5 working days standard, 1–2 express, 24 hours to collect.",
    items: [
      {
        q: "How long will delivery take?",
        a: "Standard delivery is 2–5 working days, express is 1–2 working days, and collect-from-seller orders are ready to pick up within 24 hours. Timelines run from dispatch, not from checkout.",
      },
      {
        q: "Is delivery free?",
        a: "Delivery is free on orders above $120. Below that, standard delivery is a flat $6.90 per order, however many sellers are involved.",
      },
      {
        q: "Do you deliver to my country?",
        a: "We ship to seven countries. Add your address at checkout and the available methods appear with their timelines and prices; if a method is missing, that country is not yet served for that seller.",
      },
      {
        q: "The tracking has not moved for days.",
        a: "Carriers often scan only at hubs, so a quiet tracking page is normal. If nothing has changed for five working days past the estimate, contact us and we will chase the seller and carrier — and refund you under buyer protection if the parcel never arrives.",
      },
    ],
  },
  {
    id: "returns",
    title: "Returns and refunds",
    note: "30 days, free return delivery above $120.",
    items: [
      {
        q: "How long do I have to return something?",
        a: "30 days from the day the parcel is delivered. Start the return from your order page and the seller issues a label or a collection slot.",
      },
      {
        q: "Who pays for return delivery?",
        a: "Ferixas does, on orders above $120. On smaller orders the return costs $4.50, deducted from the refund, unless the item arrived damaged or was not what you ordered — then it is free at any value.",
      },
      {
        q: "When will my refund arrive?",
        a: "We refund within five working days of the seller receiving the return, back to the payment method you used. Bank posting can add a few days on card refunds.",
      },
      {
        q: "What if my parcel never arrives?",
        a: "Buyer protection covers it. Report it once the estimate has passed and we refund the item and its delivery in full — you do not need to negotiate with the seller yourself.",
      },
    ],
  },
  {
    id: "account",
    title: "Your account",
    note: "Sign-in, addresses, saved cards and reviews.",
    items: [
      {
        q: "How do I reset my password?",
        a: "Use the sign-in page and choose Forgot password. We email a reset link that stays valid for one hour. If it does not arrive, check your spam folder before asking us to resend it.",
      },
      {
        q: "Can I delete my account?",
        a: "Yes, from account settings. Any order still in progress has to finish first, because the seller needs your delivery details to complete it. Data we must keep for tax purposes is retained, then deleted.",
      },
      {
        q: "Why is my review not showing?",
        a: "Reviews publish once the order is marked delivered, and are held briefly if they contain contact details, links or another person's personal information. Ratings are never edited by merchants.",
      },
      {
        q: "How do I stop marketing emails?",
        a: "Account settings has separate switches for order updates, offers and SMS delivery alerts. Turning off offers never affects order confirmations, which are part of the contract.",
      },
    ],
  },
  {
    id: "selling",
    title: "Selling on Ferixas",
    note: "Approved seller profiles and marketplace listings.",
    items: [
      {
        q: "How do I open a merchant store?",
        a: "Contact Ferixas to apply. Admin reviews seller details and each product listing before it appears in the marketplace. Ferixas shows your approved seller profile and approved listings, not pages from your separate website.",
      },
      {
        q: "What does Ferixas charge?",
        a: "Your Seller Center shows the commission rate assigned to your account. It applies to confirmed Ferixas marketplace sales. Automatic payment capture and payout processing are not connected yet, so no weekly payout schedule is promised.",
      },
      {
        q: "Who handles delivery?",
        a: "Sellers manage delivery for paid Ferixas marketplace orders and can add carrier and tracking information in Seller Center. An order must have confirmed payment before it can be marked shipped or delivered.",
      },
      {
        q: "Can I sell in more than one country?",
        a: "Shipping destinations are shown only when they are configured for a Ferixas marketplace listing. Your independent website shipping settings are not controlled here.",
      },
    ],
  },
];

export default function FaqPage() {
  return (
    <div className="mx-auto max-w-[1240px] px-4 py-8 lg:px-6">
      <Eyebrow>Support</Eyebrow>
      <h1 className="mt-2 font-display text-[26px] font-semibold text-ink">Frequently asked questions</h1>
      <p className="mt-2 max-w-[62ch] text-[13.5px] leading-relaxed text-ink-soft">
        Everything shoppers and sellers ask us most, grouped by topic. Tap a question to open it.
      </p>

      <div className="mt-5 flex flex-wrap gap-1.5">
        {GROUPS.map((group) => (
          <a
            key={group.id}
            href={`#${group.id}`}
            className="rounded-[2px] border border-line-warm bg-white px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft transition-colors hover:border-ink/30 hover:text-ink"
          >
            {group.title}
          </a>
        ))}
      </div>

      <section className="mt-8">
        <h2 className="font-display text-[19px] font-semibold text-ink">Common questions, answered</h2>
        <div className="mt-5 grid max-w-[80ch] gap-8">
          {GROUPS.map((group) => (
            <div key={group.id} id={group.id} className="scroll-mt-24">
              <h3 className="font-display text-[15.5px] font-semibold text-ink">{group.title}</h3>
              <p className="mt-1 font-mono text-[10.5px] text-ink-soft">{group.note}</p>
              <div className="mt-3 border-t border-line-warm">
                {group.items.map((item) => (
                  <details key={item.q} className="group border-b border-line-warm">
                    <summary className="flex cursor-pointer list-none items-start justify-between gap-4 py-3.5 text-[13.5px] font-medium text-ink [&::-webkit-details-marker]:hidden">
                      {item.q}
                      <Plus
                        width={15}
                        height={15}
                        strokeWidth={1.8}
                        className="mt-[2px] shrink-0 text-ink-soft transition-transform duration-200 group-open:rotate-45"
                      />
                    </summary>
                    <p className="max-w-[68ch] pb-4 pr-1 text-[13px] leading-relaxed text-ink-soft sm:pr-8">{item.a}</p>
                  </details>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10 max-w-[80ch] rounded-[3px] border border-line-warm bg-white p-5">
        <h2 className="font-display text-[17px] font-semibold text-ink">Question not here?</h2>
        <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">
          Send it to us and we will answer it, then add it to this page. Most platform questions get a reply within one
          working day.
        </p>
        <div className="mt-4 flex flex-wrap gap-2.5">
          <LinkButton href="/contact">Contact support</LinkButton>
          <LinkButton href="/help" variant="outline">
            Back to the help centre
          </LinkButton>
        </div>
      </section>

      <p className="mt-8 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft">
        Looking for a policy?{" "}
        <Link href="/shipping-policy" className="text-ink transition-colors hover:text-ember">
          Shipping
        </Link>{" "}
        ·{" "}
        <Link href="/returns" className="text-ink transition-colors hover:text-ember">
          Returns
        </Link>{" "}
        ·{" "}
        <Link href="/terms" className="text-ink transition-colors hover:text-ember">
          Terms
        </Link>{" "}
        ·{" "}
        <Link href="/privacy" className="text-ink transition-colors hover:text-ember">
          Privacy
        </Link>
      </p>
    </div>
  );
}

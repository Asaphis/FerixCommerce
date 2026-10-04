import type { Metadata } from "next";
import Link from "next/link";
import { Eyebrow } from "@/components/ferix/marks";

export const metadata: Metadata = {
  title: "Terms of service — Ferixas",
  description:
    "The terms that cover buying and selling on Ferixas: accounts, payment, delivery, returns, buyer protection and merchant obligations.",
};

type Clause = { id: string; title: string; body: string[] };

const CLAUSES: Clause[] = [
  {
    id: "who-we-are",
    title: "1. Who we are and what these terms cover",
    body: [
      "Ferixas Commerce Limited operates the Ferixas marketplace, which brings independent merchant stores together behind one cart and one checkout. These terms apply to everyone who browses, buys or sells here.",
      "Each item you buy is also covered by the selling merchant’s own terms, shown on their store page. Where those conflict with these terms on payment, delivery or returns, these terms win.",
    ],
  },
  {
    id: "your-account",
    title: "2. Your account",
    body: [
      "You must be 18 or older to hold a Ferixas account. Keep your name, email and delivery details accurate, because sellers rely on them to ship your order.",
      "You are responsible for activity carried out with your sign-in details. Tell us immediately if you think someone else has access, and change your password from account settings.",
    ],
  },
  {
    id: "buying",
    title: "3. Buying on a multi-merchant marketplace",
    body: [
      "Your order can contain items from several sellers. Each line is a separate contract between you and the merchant who owns it; Ferixas is the platform, not the seller of those goods.",
      "We take one payment for the whole cart, hold it, and release it to each seller once the parcel is delivered. Because every seller packs and dispatches their own items, a single order may arrive in more than one parcel, each with its own tracking.",
    ],
  },
  {
    id: "prices",
    title: "4. Prices, payment and currency",
    body: [
      "Sellers set their own prices. We show them in the display currency you choose, and convert at checkout at the rate shown, including any conversion fee, before you confirm.",
      "If an item is listed at an obviously wrong price, the seller may cancel that line and refund it in full. We will tell you which line was cancelled and why.",
    ],
  },
  {
    id: "delivery",
    title: "5. Delivery",
    body: [
      "Standard delivery takes 2–5 working days, express 1–2 working days, and collect-from-seller orders are ready within 24 hours. Delivery is free on orders above $120; below that, standard delivery is a flat $6.90 per order.",
      "We deliver to seven countries. Estimated dates run from dispatch, and the risk in the goods passes to you when the parcel is delivered to the address you gave.",
    ],
  },
  {
    id: "returns",
    title: "6. Returns, refunds and buyer protection",
    body: [
      "You have 30 days from delivery to return most items. Return delivery is free on orders above $120 and $4.50 on smaller orders, unless the item was damaged, faulty or not what you ordered.",
      "If a tracked parcel never arrives, buyer protection applies: we refund the item and its delivery in full without you having to resolve it with the seller.",
    ],
  },
  {
    id: "selling",
    title: "7. Selling on Ferixas",
    body: [
      "Merchants must describe items accurately, hold the stock they list, dispatch within two working days of accepting an order, upload tracking, and provide a returns address in every country they ship to.",
      "Ferixas charges commission per category on completed sales. There is no listing fee and no monthly minimum. Payouts for delivered orders run weekly, net of refunds.",
    ],
  },
  {
    id: "prohibited",
    title: "8. Prohibited items",
    body: [
      "No weapons, counterfeit or stolen goods, live animals, human remains, unlicensed medicines, or anything whose sale is unlawful in the country it ships to.",
      "We remove prohibited listings and may suspend the store that posted them. Buyers who receive a prohibited item can return it at no cost for a full refund.",
    ],
  },
  {
    id: "reviews",
    title: "9. Reviews and content",
    body: [
      "Reviews must describe your own experience with the item you bought. We publish them after delivery and hold anything that contains contact details, links or another person’s private information.",
      "Merchants cannot edit or delete reviews, and we do not remove a review simply because a seller disagrees with it.",
    ],
  },
  {
    id: "suspension",
    title: "10. Suspension and closing your account",
    body: [
      "We may suspend an account for fraud, abuse, repeated non-delivery or a breach of these terms. Where it is reasonable to do so, we will explain why and give you a chance to respond.",
      "You can close your account from account settings. Orders already in progress must finish first, because the seller needs your delivery details to complete them.",
    ],
  },
  {
    id: "liability",
    title: "11. Our liability",
    body: [
      "We are responsible for running the platform, taking payment correctly and honouring buyer protection. We are not the manufacturer or seller of merchant goods, and we do not promise that every listing is error-free.",
      "Nothing in these terms limits rights you have as a consumer that cannot be limited by law, including your right to a remedy when goods are faulty.",
    ],
  },
  {
    id: "changes",
    title: "12. Changes and governing law",
    body: [
      "We will give at least 14 days’ notice by email before a material change to these terms takes effect. Continuing to use Ferixas after that date means you accept the change.",
      "These terms are governed by the laws of England and Wales, and disputes go to the courts there. That does not remove the protection of the consumer law in your own country of residence.",
    ],
  },
];

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-[1240px] px-4 py-8 lg:px-6">
      <Eyebrow>Legal</Eyebrow>
      <h1 className="mt-2 font-display text-[26px] font-semibold text-ink">Terms of service</h1>
      <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft">
        Last updated 1 October 2026 · Applies to every Ferixas marketplace
      </p>
      <p className="mt-3 max-w-[72ch] text-[13.5px] leading-relaxed text-ink-soft">
        These terms explain what you can expect from Ferixas, what we expect from you, and how the marketplace handles
        money, deliveries and disputes. If anything here is unclear, ask us before you order — we would rather answer a
        question than argue about a clause.
      </p>

      <div className="mt-8 grid gap-10 lg:grid-cols-[210px_1fr]">
        <div className="hidden lg:block">
          <nav aria-label="On this page" className="sticky top-24">
            <p className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-ink-soft">On this page</p>
            <ul className="mt-3 space-y-2 border-l border-line-warm pl-3">
              {CLAUSES.map((clause) => (
                <li key={clause.id}>
                  <a
                    href={`#${clause.id}`}
                    className="block text-[12px] leading-snug text-ink-soft transition-colors hover:text-ember"
                  >
                    {clause.title}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="max-w-[72ch]">
          {CLAUSES.map((clause) => (
            <section key={clause.id} id={clause.id} className="scroll-mt-24 border-b border-line-warm py-6 first:pt-0 last:border-b-0">
              <h2 className="font-display text-[16.5px] font-semibold leading-snug text-ink">{clause.title}</h2>
              {clause.body.map((paragraph, index) => (
                <p key={`${clause.id}-${index}`} className="mt-2.5 text-[13.5px] leading-relaxed text-ink-soft">
                  {paragraph}
                </p>
              ))}
            </section>
          ))}

          <div className="mt-6 rounded-[3px] border border-line-warm bg-white p-4">
            <p className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-ink-soft">Questions about these terms</p>
            <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">
              Write to legal@ferixas.com or use the{" "}
              <Link href="/contact" className="text-ink underline decoration-ember decoration-2 underline-offset-4">
                contact form
              </Link>
              . For delivery and refund detail, read the{" "}
              <Link href="/shipping-policy" className="text-ink underline decoration-ember decoration-2 underline-offset-4">
                shipping policy
              </Link>{" "}
              and the{" "}
              <Link href="/returns" className="text-ink underline decoration-ember decoration-2 underline-offset-4">
                return policy
              </Link>
              .
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

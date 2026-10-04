import type { Metadata } from "next";
import Link from "next/link";
import { Eyebrow } from "@/components/ferix/marks";

export const metadata: Metadata = {
  title: "Privacy policy — Ferixas",
  description:
    "How Ferixas collects, uses, shares and protects personal data across a multi-merchant marketplace, and the choices you have.",
};

type Clause = { id: string; title: string; body: string[] };

const CLAUSES: Clause[] = [
  {
    id: "who-controls",
    title: "1. Who controls your data",
    body: [
      "Ferixas Commerce Limited is the controller of the account, payment and browsing data described below. We decide how the marketplace handles it.",
      "The merchant you buy from is a separate controller for the details they need to fulfil your order: your name, delivery address, phone number and the contents of the parcel they are packing.",
    ],
  },
  {
    id: "what-we-collect",
    title: "2. What we collect",
    body: [
      "Account data such as your name, email, phone number, password hash, saved addresses and wishlist. Order data such as what you bought, from which seller, the totals and the delivery status of each parcel.",
      "Payment data is handled by our payment processor. We receive a token and the last four digits of the card, never the full number. We also keep device and browser information, the pages you viewed and the messages you exchange with sellers.",
    ],
  },
  {
    id: "why",
    title: "3. Why we use it",
    body: [
      "To take your order and route each line to the seller who owns it, to take payment and release it on delivery, to arrange delivery and tracking, and to handle returns and refunds.",
      "To prevent fraud and abuse, to answer support requests, to keep records for tax and consumer law, and to improve search, recommendations and the reliability of the platform.",
    ],
  },
  {
    id: "sharing",
    title: "4. Who we share it with",
    body: [
      "The seller or sellers in your order, the carrier delivering each parcel, our payment processor, fraud-prevention and hosting providers, and tax authorities where the law requires it. Each processor is bound by contract to use your data only for the service we bought.",
      "We never sell personal data, and we do not pass your email address to merchants for their own marketing. If you want to hear from a particular store, you opt in with that store directly.",
    ],
  },
  {
    id: "cookies",
    title: "5. Cookies and analytics",
    body: [
      "Essential cookies keep your cart, session and sign-in working. They cannot be switched off without breaking checkout.",
      "Analytics and advertising cookies are optional. Refusing them costs you nothing: search, the cart and checkout all behave identically, and we simply see less about how you found us.",
    ],
  },
  {
    id: "choices",
    title: "6. Your marketing choices",
    body: [
      "Account settings has separate switches for order updates, offers and SMS delivery alerts. Turning off offers never stops order confirmations, which are part of your contract with the seller.",
      "Every marketing email carries an unsubscribe link. Unsubscribing takes effect immediately and covers all merchants, not only the store you were reading about.",
    ],
  },
  {
    id: "retention",
    title: "7. How long we keep it",
    body: [
      "Order and tax records are kept for seven years. Account data is kept while your account is open and for 30 days after you close it, in case you change your mind.",
      "Support conversations are kept for 24 months, and analytics data for 14 months. Reviews you publish stay on the product page unless you delete them.",
    ],
  },
  {
    id: "security",
    title: "8. Keeping it secure",
    body: [
      "Data is encrypted in transit, card details are tokenised by our processor, staff access is limited to what a support case requires, and the platform is penetration-tested every year.",
      "No system is perfect. If a breach affects your data, we will tell you what happened, what we are doing and what you should do, without waiting to be asked.",
    ],
  },
  {
    id: "rights",
    title: "9. Your rights",
    body: [
      "You can ask for a copy of your data, correct it, delete it, receive it in a portable format, or object to a particular use. You can withdraw consent for marketing at any time.",
      "Use account settings or write to privacy@ferixas.com. We answer within 30 days and never charge for a routine request. You can also complain to the data protection authority in your country.",
    ],
  },
  {
    id: "children-transfers",
    title: "10. Children and international transfers",
    body: [
      "Ferixas is for shoppers aged 18 and over, and we do not knowingly collect data from anyone younger. If we learn that we have, we delete it.",
      "We operate across seven countries and use processors in others. Where data leaves your country, transfers are covered by standard contractual clauses and equivalent safeguards.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-[1240px] px-4 py-8 lg:px-6">
      <Eyebrow>Legal</Eyebrow>
      <h1 className="mt-2 font-display text-[26px] font-semibold text-ink">Privacy policy</h1>
      <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft">
        Last updated 1 October 2026 · Covers shoppers and merchants
      </p>
      <p className="mt-3 max-w-[72ch] text-[13.5px] leading-relaxed text-ink-soft">
        A marketplace needs to move your name and address between you, the seller and the carrier. This page explains
        exactly what moves, why, how long we keep it, and how to stop any of it that is optional.
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
            <p className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-ink-soft">Data requests</p>
            <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">
              Email privacy@ferixas.com, or use the{" "}
              <Link href="/contact" className="text-ink underline decoration-ember decoration-2 underline-offset-4">
                contact form
              </Link>{" "}
              and choose the account topic. Include the email address on the account and we will confirm within one
              working day. See also the{" "}
              <Link href="/terms" className="text-ink underline decoration-ember decoration-2 underline-offset-4">
                terms of service
              </Link>
              .
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { Clock, CreditCard, Mail, Store, Truck } from "lucide-react";
import { ContactForm } from "@/components/ferix/contact-form";
import { Eyebrow } from "@/components/ferix/marks";

export const metadata: Metadata = {
  title: "Contact Ferixas",
  description:
    "Reach the Ferixas platform team about an order, a payment, a delivery, a return, your account or selling on the marketplace.",
};

const DESKS = [
  {
    Icon: Truck,
    label: "Order and delivery",
    desk: "The seller",
    body: "Dispatch dates, part-shipments, sizing, a missing part or an exchange. The merchant who owns the order answers directly.",
  },
  {
    Icon: CreditCard,
    label: "Payment and account",
    desk: "Ferixas",
    body: "A charge taken twice, a refund that has not landed, sign-in problems or closing an account. Platform support, one working day.",
  },
  {
    Icon: Store,
    label: "Selling on Ferixas",
    desk: "Merchant team",
    body: "Opening a store, commission by category, payout schedule and delivery rules for your own catalogue.",
  },
];

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-[1240px] px-4 py-8 lg:px-6">
      <Eyebrow>Support</Eyebrow>
      <h1 className="mt-2 font-display text-[26px] font-semibold text-ink">Contact Ferixas</h1>
      <p className="mt-2 max-w-[62ch] text-[13.5px] leading-relaxed text-ink-soft">
        Two ways in: the seller who owns your order, or the platform team. If it is about a specific parcel, the seller
        will always be faster.
      </p>

      <section className="mt-8">
        <h2 className="font-display text-[19px] font-semibold text-ink">Send us a message</h2>
        <div className="mt-4 grid gap-6 lg:grid-cols-[1.5fr_0.5fr]">
          <div className="rounded-[3px] border border-line-warm bg-white p-4 sm:p-5">
            <ContactForm />
          </div>

          <aside className="grid content-start gap-4">
            <div className="rounded-[3px] border border-line-warm bg-white p-4">
              <p className="flex items-center gap-2 font-mono text-[9.5px] uppercase tracking-[0.14em] text-ink-soft">
                <Clock width={13} height={13} /> Response times
              </p>
              <ul className="mt-3 space-y-2 text-[12.5px] leading-relaxed text-ink-soft">
                <li>Platform support — within one working day</li>
                <li>Sellers — usually within four hours</li>
                <li>Merchant onboarding — two to three working days</li>
              </ul>
            </div>

            <div className="rounded-[3px] border border-line-warm bg-white p-4">
              <p className="flex items-center gap-2 font-mono text-[9.5px] uppercase tracking-[0.14em] text-ink-soft">
                <Mail width={13} height={13} /> Direct addresses
              </p>
              <ul className="mt-3 space-y-2 font-mono text-[12px] text-ink">
                <li>help@ferixas.com</li>
                <li>merchants@ferixas.com</li>
                <li>press@ferixas.com</li>
              </ul>
              <p className="mt-3 text-[12px] leading-relaxed text-ink-soft">
                Monday to Friday, 09:00–18:00 GMT. Weekend messages are answered the next working day.
              </p>
            </div>

            <p className="text-[12px] leading-relaxed text-ink-soft">
              Faster answers live in the{" "}
              <Link href="/faq" className="text-ink underline decoration-ember decoration-2 underline-offset-4">
                FAQ
              </Link>{" "}
              and the{" "}
              <Link href="/help" className="text-ink underline decoration-ember decoration-2 underline-offset-4">
                help centre
              </Link>
              .
            </p>
          </aside>
        </div>
      </section>

      <section className="mt-8 rounded-[3px] border border-hairline bg-void px-5 py-7 sm:px-8">
        <Eyebrow className="text-lime">Route it right</Eyebrow>
        <h2 className="mt-2 font-display text-[22px] font-semibold text-chalk sm:text-[26px]">Which desk answers what</h2>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {DESKS.map((desk) => (
            <div key={desk.label} className="rounded-[3px] border border-hairline bg-panel p-4">
              <desk.Icon width={17} height={17} strokeWidth={1.7} className="text-lime" />
              <p className="mt-3 font-mono text-[9.5px] uppercase tracking-[0.14em] text-chalk-dim">{desk.label}</p>
              <p className="mt-1.5 font-display text-[15px] font-semibold text-chalk">{desk.desk}</p>
              <p className="mt-2 text-[12.5px] leading-relaxed text-chalk-dim">{desk.body}</p>
            </div>
          ))}
        </div>
        <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.14em] text-chalk-dim">
          Messages about a parcel move faster with the order number in the subject
        </p>
      </section>
    </div>
  );
}

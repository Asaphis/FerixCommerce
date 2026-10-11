import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CreditCard, Package, RotateCcw, Store, Truck, UserRound } from "lucide-react";
import { LinkButton } from "@/components/ferix/marks";

export const metadata: Metadata = {
  title: "Help — Ferixas",
  description: "Orders, payment, delivery, returns, account and selling support.",
};

const TOPICS = [
  {
    id: "orders",
    Icon: Package,
    title: "Orders",
    links: [
      { label: "Your orders", href: "/account/orders" },
      { label: "Order questions", href: "/faq#orders" },
    ],
  },
  {
    id: "payment",
    Icon: CreditCard,
    title: "Payment",
    links: [
      { label: "Payment questions", href: "/faq#payment" },
      { label: "Contact us", href: "/contact" },
    ],
  },
  {
    id: "delivery",
    Icon: Truck,
    title: "Delivery",
    links: [
      { label: "Shipping policy", href: "/shipping-policy" },
      { label: "Delivery questions", href: "/faq#delivery" },
    ],
  },
  {
    id: "returns",
    Icon: RotateCcw,
    title: "Returns",
    links: [
      { label: "Return policy", href: "/returns" },
      { label: "Returns questions", href: "/faq#returns" },
    ],
  },
  {
    id: "account",
    Icon: UserRound,
    title: "Account",
    links: [
      { label: "Account settings", href: "/account/profile" },
      { label: "Account questions", href: "/faq#account" },
    ],
  },
  {
    id: "selling",
    Icon: Store,
    title: "Selling",
    links: [
      { label: "Selling questions", href: "/faq#selling" },
      { label: "Start onboarding", href: "/contact" },
    ],
  },
];

export default function HelpPage() {
  return (
    <div className="mx-auto max-w-[1240px] px-4 py-8 lg:px-6">
      <h1 className="mt-2 font-display text-[26px] font-semibold text-ink">Help</h1>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {TOPICS.map((topic) => (
          <article key={topic.id} className="flex flex-col rounded-[3px] border border-line-warm bg-white p-4">
            <span className="grid h-9 w-9 place-items-center rounded-[2px] bg-bone-soft text-ember">
              <topic.Icon width={17} height={17} strokeWidth={1.7} />
            </span>
            <h2 className="mt-3.5 font-display text-[15.5px] font-semibold text-ink">{topic.title}</h2>
            <div className="mt-auto flex flex-wrap gap-x-4 gap-y-2 border-t border-line-warm pt-3.5">
              {topic.links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft transition-colors hover:text-ember"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </article>
        ))}
      </div>

      <section className="mt-8 rounded-[3px] border border-hairline bg-void px-5 py-7 sm:px-8">
        <h2 className="font-display text-[20px] font-semibold text-chalk">Contact</h2>
        <p className="mt-2 max-w-[62ch] text-[13px] leading-relaxed text-chalk-dim">
          Product, stock and dispatch questions go to the seller who owns the order. Payment, account and platform
          questions come to Ferixas.
        </p>
        <div className="mt-5 flex flex-wrap gap-2.5">
          <LinkButton href="/contact" variant="light">
            Contact support
          </LinkButton>
          <LinkButton href="/faq" variant="ghost" className="text-chalk-dim hover:text-lime">
            FAQ <ArrowRight width={14} height={14} />
          </LinkButton>
        </div>
      </section>
    </div>
  );
}

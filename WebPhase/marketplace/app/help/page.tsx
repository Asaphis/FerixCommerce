import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CreditCard, Package, RotateCcw, Store, Truck, UserRound } from "lucide-react";
import { TrustStrip } from "@/components/ferix/cards";
import { Eyebrow, LinkButton } from "@/components/ferix/marks";

export const metadata: Metadata = {
  title: "Help centre — Ferixas",
  description:
    "Help with orders, payment, delivery, returns, your Ferixas account and selling as a marketplace merchant.",
};

const TOPICS = [
  {
    id: "orders",
    Icon: Package,
    title: "Orders",
    body: "Find an order, understand why it can arrive in more than one parcel, and cancel before the seller packs.",
    links: [
      { label: "Your orders", href: "/account/orders" },
      { label: "Order questions", href: "/faq#orders" },
    ],
  },
  {
    id: "payment",
    Icon: CreditCard,
    title: "Payment",
    body: "Cards, wallets, currencies and the moment you are actually charged. One payment covers the whole cart.",
    links: [
      { label: "Payment questions", href: "/faq#payment" },
      { label: "Contact us", href: "/contact" },
    ],
  },
  {
    id: "delivery",
    Icon: Truck,
    title: "Delivery",
    body: "Standard is 2–5 working days, express is 1–2, and collect-from-seller is ready within 24 hours.",
    links: [
      { label: "Shipping policy", href: "/shipping-policy" },
      { label: "Delivery questions", href: "/faq#delivery" },
    ],
  },
  {
    id: "returns",
    Icon: RotateCcw,
    title: "Returns",
    body: "30 days to change your mind, free return delivery on orders above $120, refunds in five working days.",
    links: [
      { label: "Return policy", href: "/returns" },
      { label: "Returns questions", href: "/faq#returns" },
    ],
  },
  {
    id: "account",
    Icon: UserRound,
    title: "Account",
    body: "Signing in, saved addresses, payment methods, wishlists and the emails you receive from us.",
    links: [
      { label: "Account settings", href: "/account/profile" },
      { label: "Account questions", href: "/faq#account" },
    ],
  },
  {
    id: "selling",
    Icon: Store,
    title: "Selling on Ferixas",
    body: "Open a merchant store, list your catalogue, set your own delivery rules and get paid weekly.",
    links: [
      { label: "Selling questions", href: "/faq#selling" },
      { label: "Start onboarding", href: "/contact" },
    ],
  },
];

export default function HelpPage() {
  return (
    <div className="mx-auto max-w-[1240px] px-4 py-8 lg:px-6">
      <Eyebrow>Support</Eyebrow>
      <h1 className="mt-2 font-display text-[26px] font-semibold text-ink">Help centre</h1>
      <p className="mt-2 max-w-[62ch] text-[13.5px] leading-relaxed text-ink-soft">
        Six places to look before you write to anyone. Most answers about a specific parcel live with the seller who
        shipped it; everything about payment, accounts and the platform itself is ours.
      </p>

      <section className="mt-8">
        <h2 className="font-display text-[19px] font-semibold text-ink">Browse help topics</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {TOPICS.map((topic) => (
            <article key={topic.id} className="flex flex-col rounded-[3px] border border-line-warm bg-white p-4">
              <span className="grid h-9 w-9 place-items-center rounded-[2px] bg-bone-soft text-ember">
                <topic.Icon width={17} height={17} strokeWidth={1.7} />
              </span>
              <h3 className="mt-3.5 font-display text-[15.5px] font-semibold text-ink">{topic.title}</h3>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-soft">{topic.body}</p>
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
      </section>

      <section className="mt-8 rounded-[3px] border border-hairline bg-void px-5 py-7 sm:px-8">
        <Eyebrow className="text-lime">Still need a person</Eyebrow>
        <h2 className="mt-2 font-display text-[22px] font-semibold text-chalk sm:text-[26px]">
          Two desks, two different jobs
        </h2>
        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <div className="rounded-[3px] border border-hairline bg-panel p-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-chalk-dim">The seller</p>
            <p className="mt-2 text-[13px] leading-relaxed text-chalk-dim">
              Sizing, stock, dispatch, a missing part, an exchange. The merchant who owns the order answers, usually
              within four hours on a working day — AuraSound Audio, Nova Fashion, Sahel Supply, PixelForge and Lumen
              Home all run their own support inbox.
            </p>
          </div>
          <div className="rounded-[3px] border border-hairline bg-panel p-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-chalk-dim">Ferixas</p>
            <p className="mt-2 text-[13px] leading-relaxed text-chalk-dim">
              Payment taken twice, an account you cannot get into, a parcel that never arrived, or a store you want to
              open. Platform support replies within one working day.
            </p>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap gap-2.5">
          <LinkButton href="/contact" variant="light">
            Contact support
          </LinkButton>
          <LinkButton href="/faq" variant="ghost" className="text-chalk-dim hover:text-lime">
            Read the FAQ <ArrowRight width={14} height={14} />
          </LinkButton>
        </div>
      </section>

      <div className="mt-8">
        <TrustStrip />
      </div>
    </div>
  );
}

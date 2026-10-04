import type { Metadata } from "next";
import { Globe, Package, Receipt, Store } from "lucide-react";
import { TrustStrip } from "@/components/ferix/cards";
import { Eyebrow, LinkButton } from "@/components/ferix/marks";

export const metadata: Metadata = {
  title: "About Ferixas",
  description:
    "Ferixas is a multi-merchant marketplace: independent stores sell through one cart and one checkout, with buyer protection on every order.",
};

const STEPS = [
  {
    Icon: Store,
    step: "01",
    title: "Every seller keeps their own store",
    body: "A merchant joins with their own brand, catalogue, pricing and delivery rules. AuraSound Audio sells audio hardware, Nova Fashion sells clothing, Sahel Supply sells home and garden, PixelForge sells computing and Lumen Home sells lighting — each on their own storefront.",
  },
  {
    Icon: Package,
    step: "02",
    title: "One cart, one checkout, one payment",
    body: "You can mix five sellers in a single cart and pay once. We split that payment behind the scenes and route each line to the merchant who owns it, so your statement shows one Ferixas charge, not five.",
  },
  {
    Icon: Receipt,
    step: "03",
    title: "Each seller ships, we hold the promise",
    body: "Because merchants pack their own items, an order can arrive in more than one parcel — each tracked separately. Whatever happens, buyer protection sits with Ferixas: if it never arrives, you are refunded in full.",
  },
];

const FACTS = [
  { value: "7", label: "Countries with tracked delivery" },
  { value: "2–5", label: "Working days, standard delivery" },
  { value: "30", label: "Days to return an order" },
  { value: "$120", label: "Free delivery and free returns above" },
];

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-[1240px] px-4 py-8 lg:px-6">
      <Eyebrow>About</Eyebrow>
      <h1 className="mt-2 font-display text-[26px] font-semibold text-ink">
        A marketplace where every seller keeps their own store
      </h1>
      <p className="mt-2 max-w-[62ch] text-[13.5px] leading-relaxed text-ink-soft">
        Ferixas is not one shop with one warehouse. It is a place for independent merchants to sell properly — with
        their own identity — while the shopper gets a single cart, a single checkout and one set of guarantees.
      </p>

      <section className="mt-8">
        <h2 className="font-display text-[19px] font-semibold text-ink">How the marketplace works</h2>
        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          {STEPS.map((step) => (
            <article key={step.step} className="flex flex-col rounded-[3px] border border-line-warm bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-[2px] bg-bone-soft text-ember">
                  <step.Icon width={17} height={17} strokeWidth={1.7} />
                </span>
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft">{step.step}</span>
              </div>
              <h3 className="mt-3.5 font-display text-[15.5px] font-semibold text-ink">{step.title}</h3>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-soft">{step.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-8 rounded-[3px] border border-hairline bg-void px-5 py-7 sm:px-8">
        <Eyebrow className="text-lime">Where we are today</Eyebrow>
        <h2 className="mt-2 font-display text-[22px] font-semibold text-chalk sm:text-[26px]">
          The same promises in every country we ship to
        </h2>
        <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {FACTS.map((fact) => (
            <div key={fact.label}>
              <p className="font-display text-[30px] font-extrabold leading-none text-lime">{fact.value}</p>
              <p className="mt-2 text-[12px] leading-relaxed text-chalk-dim">{fact.label}</p>
            </div>
          ))}
        </div>
        <div className="mt-6 flex flex-wrap gap-2.5">
          <LinkButton href="/stores" variant="light">
            <Globe width={15} height={15} />
            Browse merchant stores
          </LinkButton>
          <LinkButton href="/contact" variant="ghost" className="text-chalk-dim hover:text-lime">
            Sell on Ferixas
          </LinkButton>
        </div>
      </section>

      <div className="mt-8">
        <TrustStrip />
      </div>
    </div>
  );
}

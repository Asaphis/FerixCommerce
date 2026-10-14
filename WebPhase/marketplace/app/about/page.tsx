import type { Metadata } from "next";
import { getPageContent } from "@/lib/api";
import { Globe, Store } from "lucide-react";
import { LinkButton } from "@/components/ferix/marks";

export const metadata: Metadata = {
  title: "About Ferixas",
  description: "Approved marketplace listings from independent sellers.",
};

const STEPS = [
  {
    step: "01",
    title: "Seller profiles",
    body: "Approved seller profiles appear here. Their independent websites remain separate.",
  },
  {
    step: "02",
    title: "Marketplace listings",
    body: "Products are reviewed before they appear here.",
  },
  {
    step: "03",
    title: "Checkout",
    body: "Unavailable until payment processing is configured. No payment or order is created.",
  },
];

export default async function AboutPage() {
  // The page must never fail to render because the CMS is momentarily
  // unreachable - especially at build time when the API may not be running.
  let c: {
    heading?: string;
    intro?: string;
    howItWorksHeading?: string;
    steps?: { step: string; title: string; body: string }[];
    actions?: { label: string; href: string; variant?: string }[];
  } = {};
  try {
    const cms = await getPageContent("marketplace_about");
    c = cms.content as typeof c;
  } catch {
    // Fall through to the hardcoded content below.
  }
  const heading = c.heading ?? "Ferixas marketplace";
  const intro = c.intro ?? "Approved products from independent sellers. Checkout is unavailable while payment processing is unconfigured.";
  const stepsHeading = c.howItWorksHeading ?? "How it works";
  const STEPS_RENDERED = (c.steps && c.steps.length ? c.steps : STEPS);
  return (
    <div className="mx-auto max-w-[1240px] px-4 py-8 lg:px-6">
      <h1 className="mt-2 font-display text-[26px] font-semibold text-ink">{heading}</h1>
      <p className="mt-2 max-w-[62ch] text-[13.5px] leading-relaxed text-ink-soft">
        {intro}
      </p>

      <section className="mt-8">
        <h2 className="font-display text-[19px] font-semibold text-ink">{stepsHeading}</h2>
        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          {STEPS_RENDERED.map((step) => (
            <article key={step.step} className="flex flex-col rounded-[3px] border border-line-warm bg-white p-4">
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft">{step.step}</span>
              <h3 className="mt-3 font-display text-[15.5px] font-semibold text-ink">{step.title}</h3>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-soft">{step.body}</p>
            </article>
          ))}
        </div>
      </section>

      <div className="mt-8 flex flex-wrap gap-2.5">
        <LinkButton href="/stores" variant="light">
          <Store width={15} height={15} />
          Stores
        </LinkButton>
        <LinkButton href="/browse" variant="outline">
          <Globe width={15} height={15} />
          Browse products
        </LinkButton>
      </div>
    </div>
  );
}

import type { Metadata } from "next";
import { Compass, Home, LifeBuoy, Search } from "lucide-react";
import { Eyebrow, LinkButton } from "@/components/ferix/marks";

export const metadata: Metadata = {
  title: "Page not found — Ferixas",
  description: "That page has moved or never existed. Search the marketplace instead.",
};

const routes = [
  { href: "/", label: "Home", detail: "Start from the front page", Icon: Home },
  { href: "/browse", label: "Browse", detail: "Every department and store", Icon: Compass },
  { href: "/help", label: "Help", detail: "Orders, returns and delivery", Icon: LifeBuoy },
];

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-[440px] flex-col justify-center px-4 py-10">
      <div className="rounded-[3px] border border-line-warm bg-white p-5 lg:p-6">
        <Eyebrow>Error 404</Eyebrow>
        <h1 className="mt-2 font-display text-[26px] font-semibold leading-tight text-ink">
          We could not find that page
        </h1>
        <p className="mt-2.5 text-[13.5px] leading-relaxed text-ink-soft">
          The link may be out of date, or the product or store behind it has been taken down. Searching usually gets
          you there faster than guessing at the address.
        </p>

        <form action="/search" className="relative mt-6 flex items-center">
          <Search width={15} height={15} className="pointer-events-none absolute left-3 text-ink-soft" />
          <input
            type="search"
            name="q"
            placeholder="Search products and stores"
            aria-label="Search products, stores and categories"
            className="h-10 w-full min-w-0 rounded-[2px] border border-line-warm bg-white pl-9 pr-3 text-[13.5px] text-ink outline-none transition-colors placeholder:text-ink-soft/70 focus:border-ink"
          />
          <button
            type="submit"
            className="ml-2 inline-flex h-10 shrink-0 cursor-pointer items-center justify-center rounded-[2px] bg-ink px-4 text-[13px] font-semibold text-bone transition-colors hover:bg-ember"
          >
            Search
          </button>
        </form>

        <ul className="mt-6 grid gap-2 border-t border-line-warm pt-5">
          {routes.map(({ href, label, detail, Icon }) => (
            <li key={href}>
              <LinkButton href={href} variant="outline" className="w-full justify-start gap-3 text-left">
                <Icon width={15} height={15} strokeWidth={1.6} className="shrink-0" />
                <span className="flex min-w-0 flex-col">
                  <span className="text-[13px] font-semibold">{label}</span>
                  <span className="text-[12px] font-normal opacity-70">{detail}</span>
                </span>
              </LinkButton>
            </li>
          ))}
        </ul>
      </div>

      <p className="mt-5 text-center font-mono text-[9.5px] uppercase tracking-[0.14em] text-ink-soft">
        Ref 404 · one catalogue, every channel
      </p>
    </div>
  );
}

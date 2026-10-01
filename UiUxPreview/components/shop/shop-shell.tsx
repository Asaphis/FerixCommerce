"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import {
  Heart,
  Home,
  LayoutGrid,
  Menu,
  Search,
  ShoppingBag,
  User,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useFerixas } from "@/lib/store";
import { CATEGORIES } from "@/lib/data";
import { FerixasMark, Wordmark } from "@/components/brand/mark";

export function ShopShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-bone text-ink">
      <ShopHeader />
      <main className="pb-24 md:pb-0">{children}</main>
      <ShopFooter />
      <ShopMobileNav />
    </div>
  );
}

function ShopHeader() {
  const router = useRouter();
  const { cartCount, wishlist } = useFerixas();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(query.trim() ? `/browse?q=${encodeURIComponent(query.trim())}` : "/browse");
    setOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-line-warm bg-bone/92 backdrop-blur-md">
      <div className="bg-void px-4 py-1.5 text-center">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-lime">
          Free delivery over $120 &middot; 7 merchant stores &middot; one cart, many sellers
        </span>
      </div>

      <div className="mx-auto flex max-w-[1240px] items-center gap-4 px-4 py-3.5">
        <Link href="/" className="flex shrink-0 items-center gap-2.5">
          <FerixasMark className="h-7 w-7" />
          <Wordmark sub="Marketplace" className="hidden sm:flex" />
        </Link>

        <form onSubmit={submit} className="relative hidden flex-1 md:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search 49 products across 7 stores"
            aria-label="Search the marketplace"
            className="h-11 w-full rounded-[2px] border border-ink/15 bg-white pl-9 pr-3 text-[14px] text-ink outline-none transition-colors placeholder:text-ink-soft/70 focus:border-ink"
          />
        </form>

        <div className="ml-auto flex items-center gap-1">
          <HeaderLink href="/merchant" label="Sell" className="hidden lg:inline-flex" />
          <HeaderIcon href="/account?tab=saved" label="Wishlist" count={wishlist.length}>
            <Heart width={18} height={18} />
          </HeaderIcon>
          <HeaderIcon href="/cart" label="Cart" count={cartCount}>
            <ShoppingBag width={18} height={18} />
          </HeaderIcon>
          <HeaderIcon href="/account" label="Account">
            <User width={18} height={18} />
          </HeaderIcon>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label="Open menu"
            className="grid h-10 w-10 cursor-pointer place-items-center rounded-[2px] text-ink transition-colors hover:bg-bone-soft md:hidden"
          >
            {open ? <X width={18} height={18} /> : <Menu width={18} height={18} />}
          </button>
        </div>
      </div>

      <div className="border-t border-line-warm/70">
        <div className="mx-auto hidden max-w-[1240px] items-center gap-5 px-4 py-2 md:flex">
          <Link
            href="/browse"
            className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink transition-colors hover:text-ember"
          >
            All products
          </Link>
          {CATEGORIES.slice(0, 8).map((c) => (
            <Link
              key={c.slug}
              href={`/browse?category=${c.slug}`}
              className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft transition-colors hover:text-ember"
            >
              {c.name}
            </Link>
          ))}
          <Link
            href="/stores"
            className="ml-auto font-mono text-[11px] uppercase tracking-[0.14em] text-ember"
          >
            Browse stores &rarr;
          </Link>
        </div>
      </div>

      {open ? (
        <div className="border-t border-line-warm bg-bone px-4 pb-4 pt-3 md:hidden">
          <form onSubmit={submit} className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search products"
              aria-label="Search the marketplace"
              className="h-11 w-full rounded-[2px] border border-ink/15 bg-white pl-9 pr-3 text-[14px] outline-none focus:border-ink"
            />
          </form>
          <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5">
            {CATEGORIES.map((c) => (
              <Link
                key={c.slug}
                href={`/browse?category=${c.slug}`}
                onClick={() => setOpen(false)}
                className="py-1.5 font-mono text-[11px] uppercase tracking-[0.12em] text-ink-soft"
              >
                {c.name}
              </Link>
            ))}
          </div>
          <Link
            href="/merchant"
            onClick={() => setOpen(false)}
            className="mt-3 inline-flex font-mono text-[11px] uppercase tracking-[0.14em] text-ember"
          >
            Sell on Ferixas &rarr;
          </Link>
        </div>
      ) : null}
    </header>
  );
}

function HeaderLink({ href, label, className }: { href: string; label: string; className?: string }) {
  return (
    <Link
      href={href}
      className={cn(
        "items-center px-2 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft transition-colors hover:text-ink",
        className,
      )}
    >
      {label}
    </Link>
  );
}

function HeaderIcon({
  href,
  label,
  count,
  children,
}: {
  href: string;
  label: string;
  count?: number;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="relative grid h-10 w-10 cursor-pointer place-items-center rounded-[2px] text-ink transition-colors hover:bg-bone-soft"
    >
      {children}
      {count ? (
        <span className="absolute right-0.5 top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-ember px-1 font-mono text-[9px] font-semibold text-white">
          {count}
        </span>
      ) : null}
    </Link>
  );
}

function ShopMobileNav() {
  const pathname = usePathname();
  const { cartCount, wishlist } = useFerixas();
  const items = [
    { href: "/", label: "Home", icon: Home },
    { href: "/browse", label: "Browse", icon: LayoutGrid },
    { href: "/account?tab=saved", label: "Saved", icon: Heart, count: wishlist.length },
    { href: "/cart", label: "Cart", icon: ShoppingBag, count: cartCount },
    { href: "/account", label: "Account", icon: User },
  ];
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line-warm bg-bone/95 backdrop-blur-md md:hidden">
      <div className="grid grid-cols-5">
        {items.map((item) => {
          const active = pathname === item.href.split("?")[0];
          const Icon = item.icon;
          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                "relative flex flex-col items-center gap-1 py-2.5 font-mono text-[9px] uppercase tracking-[0.12em] transition-colors",
                active ? "text-ember" : "text-ink-soft",
              )}
            >
              <Icon width={19} height={19} />
              {item.label}
              {item.count ? (
                <span className="absolute right-1/4 top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-ember px-1 font-mono text-[9px] text-white">
                  {item.count}
                </span>
              ) : null}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function ShopFooter() {
  return (
    <footer className="mt-20 border-t border-line-warm bg-bone-soft">
      <div className="mx-auto max-w-[1240px] px-4 py-14">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-2.5">
              <FerixasMark className="h-7 w-7" />
              <Wordmark sub="Commerce" />
            </div>
            <p className="mt-4 max-w-[34ch] text-[13.5px] leading-relaxed text-ink-soft">
              One catalog, every channel. Merchants run branded stores, list on the Ferixas
              marketplace, and design both from the same studio.
            </p>
            <p className="mt-5 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-soft/80">
              Prototype build &middot; mock data only
            </p>
          </div>
          {[
            { title: "Shop", links: [
              ["Marketplace", "/browse"],
              ["Stores", "/stores"],
              ["Cart", "/cart"],
              ["Wishlist", "/account?tab=saved"],
            ] },
            { title: "Sell", links: [
              ["Merchant studio", "/merchant"],
              ["Design Engine", "/merchant/design"],
              ["Products", "/merchant/products"],
              ["Payouts", "/merchant/payouts"],
            ] },
            { title: "Platform", links: [
              ["Ferixas Official Store", "/store/ferixas-official"],
              ["Admin control room", "/admin"],
              ["Product structure", "/docs/structure"],
              ["Store templates", "/admin/templates"],
            ] },
          ].map((col) => (
            <div key={col.title}>
              <h3 className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink">
                {col.title}
              </h3>
              <ul className="mt-4 space-y-2.5">
                {col.links.map(([label, href]) => (
                  <li key={href}>
                    <Link
                      href={href}
                      className="text-[13.5px] text-ink-soft transition-colors hover:text-ember"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-line-warm pt-6">
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-soft">
            &copy; 2026 Ferixas Commerce &middot; Lagos &middot; Nairobi &middot; London
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-soft">
            USD &middot; 7 countries &middot; 6 currencies
          </span>
        </div>
      </div>
    </footer>
  );
}

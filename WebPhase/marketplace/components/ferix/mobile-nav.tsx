"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, Heart, Home, ShoppingBag, User2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The mobile bottom navigation.
 *
 * Below 1024px this is the only navigation the shopper needs: the header keeps
 * the logo, search and cart, and everything else lives here in the thumb zone.
 * It is deliberately five destinations — Home, Explore, Wishlist, Cart, Account —
 * and it disappears on focused flows (checkout, sign-in) where the shopper
 * should not be pulled away mid-task.
 *
 * The spacer above the bar is rendered in normal flow so page content can never
 * end up underneath it, and `env(safe-area-inset-bottom)` keeps the labels clear
 * of the iPhone home indicator.
 */

type Item = {
  href: string;
  label: string;
  Icon: typeof Home;
  badge?: number;
  match: (pathname: string) => boolean;
};

export function FerixMobileNav({ cartCount, signedIn }: { cartCount: number; signedIn: boolean }) {
  const pathname = usePathname();

  const focused = ["/checkout", "/login", "/register", "/forgot-password", "/reset-password", "/verify"];
  if (focused.some((route) => pathname.startsWith(route))) return null;

  const items: Item[] = [
    { href: "/", label: "Home", Icon: Home, match: (p) => p === "/" },
    { href: "/browse", label: "Explore", Icon: Compass, match: (p) => p.startsWith("/browse") || p.startsWith("/search") || p.startsWith("/category") || p.startsWith("/collection") || p.startsWith("/stores") || p.startsWith("/store") },
    { href: "/account/wishlist", label: "Wishlist", Icon: Heart, match: (p) => p.startsWith("/account/wishlist") },
    { href: "/cart", label: "Cart", Icon: ShoppingBag, badge: cartCount, match: (p) => p.startsWith("/cart") },
    {
      href: signedIn ? "/account" : "/login",
      label: "Account",
      Icon: User2,
      match: (p) => p.startsWith("/account") || p.startsWith("/order") || p === "/login" || p === "/register",
    },
  ];

  return (
    <>
      <div aria-hidden="true" className="h-[72px] lg:hidden" />
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-50 border-t border-line-warm bg-bone/95 shadow-[0_-8px_24px_rgba(20,17,14,0.08)] backdrop-blur-md lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <ul className="mx-auto grid max-w-[560px] grid-cols-5">
          {items.map(({ href, label, Icon, badge, match }) => {
            const active = match(pathname);
            return (
              <li key={label}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative flex min-h-[56px] flex-col items-center gap-1 py-2.5 font-mono text-[9.5px] uppercase tracking-[0.1em] transition-colors",
                    active ? "text-ink" : "text-ink-soft",
                  )}
                >
                  <span
                    className={cn(
                      "absolute inset-x-4 top-0 h-[2px] rounded-full bg-ember transition-opacity",
                      active ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <span className="relative">
                    <Icon width={20} height={20} strokeWidth={active ? 2.3 : 1.9} />
                    {badge ? (
                      <span className="absolute -right-2.5 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-ember px-1 font-mono text-[9px] font-semibold tabular-nums text-white">
                        {badge > 99 ? "99+" : badge}
                      </span>
                    ) : null}
                  </span>
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}

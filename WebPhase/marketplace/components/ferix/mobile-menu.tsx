"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  ChevronRight,
  Heart,
  HelpCircle,
  Info,
  LayoutGrid,
  LogOut,
  MapPin,
  Menu,
  Package,
  Search,
  Settings,
  ShieldCheck,
  Star,
  Store,
  User2,
  X,
} from "lucide-react";
import type { AccountUser, Category } from "@/lib/api";
import { signOutAction } from "@/lib/actions";

/**
 * The mobile "Menu" button and its drawer.
 *
 * Everything that used to sit in a second and third header row on small screens
 * now lives behind this one control: search, departments and every account
 * shortcut. The bottom tab bar stays reserved for the five destinations a
 * shopper uses constantly.
 */

const ACCOUNT_LINKS = [
  { href: "/account", label: "Overview", Icon: LayoutGrid },
  { href: "/account/orders", label: "Orders", Icon: Package },
  { href: "/account/wishlist", label: "Wishlist", Icon: Heart },
  { href: "/account/addresses", label: "Addresses", Icon: MapPin },
  { href: "/account/reviews", label: "Reviews", Icon: Star },
  { href: "/account/notifications", label: "Notifications", Icon: Bell },
  { href: "/account/preferences", label: "Preferences", Icon: Settings },
];

const INFO_LINKS = [
  { href: "/stores", label: "All stores", Icon: Store },
  { href: "/collections", label: "Collections", Icon: LayoutGrid },
  { href: "/help", label: "Help centre", Icon: HelpCircle },
  { href: "/about", label: "About Ferixas", Icon: Info },
  { href: "/track-order", label: "Track an order", Icon: Package },
];

export function FerixMobileMenu({ categories, user }: { categories: Category[]; user: AccountUser | null }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  // The header is backdrop-blurred, which makes it a containing block for
  // `position: fixed`. The drawer is therefore portalled to <body> so it covers
  // the whole screen instead of being trapped inside the 56px header.
  useEffect(() => setMounted(true), []);

  // Close on navigation.
  useEffect(() => setOpen(false), [pathname]);

  // Escape closes; the page behind must not scroll while the drawer is open.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    const previous = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.documentElement.style.overflow = previous;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        aria-expanded={open}
        className="grid h-10 w-10 shrink-0 cursor-pointer place-items-center rounded-[2px] text-ink-soft transition-colors hover:bg-bone-soft hover:text-ink lg:hidden"
      >
        <Menu width={20} height={20} />
      </button>

      {mounted && open
        ? createPortal(
        <div className="fixed inset-0 z-[70] lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 cursor-default bg-void/50 backdrop-blur-[2px]"
          />

          <div className="absolute inset-y-0 left-0 flex w-[88%] max-w-[380px] flex-col overflow-y-auto bg-bone shadow-2xl">
            <div className="flex items-center justify-between gap-3 border-b border-line-warm bg-white px-4 py-3">
              <span className="flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-[6px] bg-ink">
                  <svg viewBox="0 0 32 32" className="h-8 w-8" aria-hidden="true">
                    <path d="M9 23V9h13v4h-8v2.4h6.6v3.9H14V23z" fill="#e4572e" />
                  </svg>
                </span>
                <span className="font-display text-[14px] font-extrabold tracking-[0.16em] text-ink">FERIXAS</span>
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="grid h-9 w-9 cursor-pointer place-items-center rounded-[2px] text-ink-soft transition-colors hover:bg-bone-soft hover:text-ink"
              >
                <X width={18} height={18} />
              </button>
            </div>

            <div className="border-b border-line-warm bg-white px-4 py-3">
              {user ? (
                <Link href="/account" className="flex items-center gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-ink font-display text-[13px] font-extrabold text-lime">
                    {user.avatarInitials}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-semibold text-ink">{user.name}</span>
                    <span className="block truncate font-mono text-[9.5px] uppercase tracking-[0.14em] text-ink-soft">
                      View your account
                    </span>
                  </span>
                  <ChevronRight width={16} height={16} className="shrink-0 text-ink-soft" />
                </Link>
              ) : (
                <div className="flex gap-2">
                  <Link
                    href="/login"
                    className="flex-1 rounded-[2px] bg-ink px-3 py-2.5 text-center font-mono text-[10px] uppercase tracking-[0.14em] text-bone"
                  >
                    Sign in
                  </Link>
                  <Link
                    href="/register"
                    className="flex-1 rounded-[2px] border border-ink/25 px-3 py-2.5 text-center font-mono text-[10px] uppercase tracking-[0.14em] text-ink"
                  >
                    Create account
                  </Link>
                </div>
              )}
            </div>

            <form action="/search" className="relative flex items-center border-b border-line-warm bg-white px-4 py-3">
              <Search width={16} height={16} className="pointer-events-none absolute left-7 text-ink-soft" />
              <input
                type="search"
                name="q"
                placeholder="Search products, stores and categories"
                aria-label="Search"
                className="h-10 w-full rounded-[2px] border border-line-warm bg-white pl-9 pr-3 text-[13.5px] text-ink outline-none placeholder:text-ink-soft/70 focus:border-ink"
              />
            </form>

            <nav aria-label="Departments" className="px-4 py-4">
              <p className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-ink-soft">Departments</p>
              <ul className="mt-2.5 space-y-0.5">
                <li>
                  <Link
                    href="/browse"
                    className="flex items-center justify-between gap-3 rounded-[2px] px-2 py-2.5 text-[13.5px] font-medium text-ink transition-colors hover:bg-bone-soft"
                  >
                    All departments
                    <ChevronRight width={15} height={15} className="text-ink-soft" />
                  </Link>
                </li>
                {categories.map((category) => (
                  <li key={category.slug}>
                    <Link
                      href={`/category/${category.slug}`}
                      className="flex items-center justify-between gap-3 rounded-[2px] px-2 py-2.5 text-[13.5px] text-ink-soft transition-colors hover:bg-bone-soft hover:text-ink"
                    >
                      {category.name}
                      <span className="font-mono text-[10px] tabular-nums text-ink-soft/70">{category.count}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            <nav aria-label="Account" className="border-t border-line-warm px-4 py-4">
              <p className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-ink-soft">Your account</p>
              <ul className="mt-2.5 space-y-0.5">
                {ACCOUNT_LINKS.map(({ href, label, Icon }) => (
                  <li key={href}>
                    <Link
                      href={user ? href : `/login?return=${encodeURIComponent(href)}`}
                      className="flex items-center gap-3 rounded-[2px] px-2 py-2.5 text-[13.5px] text-ink-soft transition-colors hover:bg-bone-soft hover:text-ink"
                    >
                      <Icon width={16} height={16} className="shrink-0" />
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            <nav aria-label="Information" className="border-t border-line-warm px-4 py-4">
              <p className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-ink-soft">Shopping with us</p>
              <ul className="mt-2.5 space-y-0.5">
                {INFO_LINKS.map(({ href, label, Icon }) => (
                  <li key={href}>
                    <Link
                      href={href}
                      className="flex items-center gap-3 rounded-[2px] px-2 py-2.5 text-[13.5px] text-ink-soft transition-colors hover:bg-bone-soft hover:text-ink"
                    >
                      <Icon width={16} height={16} className="shrink-0" />
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            <div className="mt-auto border-t border-line-warm px-4 py-4">
              {user ? (
                <form action={signOutAction}>
                  <button
                    type="submit"
                    className="flex w-full cursor-pointer items-center gap-3 rounded-[2px] px-2 py-2.5 text-left text-[13.5px] text-ink-soft transition-colors hover:bg-bone-soft hover:text-ember"
                  >
                    <LogOut width={16} height={16} />
                    Sign out
                  </button>
                </form>
              ) : (
                <p className="flex items-center gap-2 font-mono text-[9.5px] uppercase tracking-[0.14em] text-ink-soft">
                  <ShieldCheck width={13} height={13} />
                  Buyer protection on every order
                </p>
              )}
            </div>
          </div>
        </div>
        ,
        document.body,
      )
        : null}
    </>
  );
}

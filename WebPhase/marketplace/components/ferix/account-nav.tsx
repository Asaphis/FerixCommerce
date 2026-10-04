"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  Heart,
  HelpCircle,
  LayoutGrid,
  LogOut,
  MapPin,
  Package,
  ShieldCheck,
  SlidersHorizontal,
  Star,
  Store,
  User2,
} from "lucide-react";
import { signOutAction } from "@/lib/actions";
import { cn } from "@/lib/utils";

/**
 * Account navigation in two shapes.
 *
 * `AccountSidebar` is the sticky desktop column; `AccountChips` is the
 * horizontally scrolling strip used below 1024px. Both expose every account
 * area with live counts — the account dashboard is where most shoppers start
 * looking for one of these, so nothing may be more than one tap away.
 */

export type AccountCounts = {
  orders: number;
  wishlist: number;
  addresses: number;
  reviews: number;
  following: number;
};

type Entry = { href: string; label: string; Icon: typeof LayoutGrid; count?: number };

function entries(counts: AccountCounts): Entry[] {
  return [
    { href: "/account", label: "Overview", Icon: LayoutGrid },
    { href: "/account/orders", label: "Orders", Icon: Package, count: counts.orders },
    { href: "/account/wishlist", label: "Wishlist", Icon: Heart, count: counts.wishlist },
    { href: "/account/addresses", label: "Addresses", Icon: MapPin, count: counts.addresses },
    { href: "/account/reviews", label: "Reviews", Icon: Star, count: counts.reviews },
    { href: "/account/following", label: "Followed stores", Icon: Store, count: counts.following },
    { href: "/account/notifications", label: "Notifications", Icon: Bell },
    { href: "/account/profile", label: "Profile", Icon: User2 },
    { href: "/account/security", label: "Security", Icon: ShieldCheck },
    { href: "/account/preferences", label: "Preferences", Icon: SlidersHorizontal },
    { href: "/account/support", label: "Support", Icon: HelpCircle },
  ];
}

const GROUPS: { title: string; hrefs: string[] }[] = [
  { title: "Shopping", hrefs: ["/account", "/account/orders", "/account/wishlist"] },
  { title: "Your details", hrefs: ["/account/profile", "/account/addresses", "/account/reviews", "/account/following"] },
  { title: "Settings", hrefs: ["/account/notifications", "/account/security", "/account/preferences"] },
  { title: "Help", hrefs: ["/account/support"] },
];

export function AccountSidebar({ counts }: { counts: AccountCounts }) {
  const pathname = usePathname();
  const all = entries(counts);

  return (
    <nav aria-label="Account sections" className="rounded-[3px] border border-line-warm bg-white p-1.5">
      {GROUPS.map((group, index) => (
        <div key={group.title} className={cn(index > 0 && "mt-1.5 border-t border-line-warm pt-1.5")}>
          <p className="px-2.5 py-1.5 font-mono text-[9.5px] uppercase tracking-[0.16em] text-ink-soft">{group.title}</p>
          {group.hrefs.map((href) => {
            const entry = all.find((item) => item.href === href);
            if (!entry) return null;
            const active = pathname === entry.href;
            return (
              <Link
                key={entry.href}
                href={entry.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2.5 rounded-[2px] px-2.5 py-2 text-[13px] transition-colors",
                  active ? "bg-ink font-medium text-bone" : "text-ink-soft hover:bg-bone-soft hover:text-ink",
                )}
              >
                <entry.Icon width={15} height={15} className="shrink-0" />
                <span className="flex-1">{entry.label}</span>
                {entry.count ? (
                  <span className={cn("font-mono text-[10px] tabular-nums", active ? "text-bone/70" : "text-ink-soft")}>
                    {entry.count}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </div>
      ))}

      <div className="mt-1.5 border-t border-line-warm pt-1.5">
        <form action={signOutAction}>
          <button
            type="submit"
            className="flex w-full cursor-pointer items-center gap-2.5 rounded-[2px] px-2.5 py-2 text-left text-[13px] text-ink-soft transition-colors hover:bg-bone-soft hover:text-ember"
          >
            <LogOut width={15} height={15} className="shrink-0" />
            Sign out
          </button>
        </form>
      </div>
    </nav>
  );
}

export function AccountChips({ counts }: { counts: AccountCounts }) {
  const pathname = usePathname();
  const all = entries(counts);

  return (
    <nav
      aria-label="Account sections"
      className="sticky top-14 z-30 -mx-4 border-b border-line-warm bg-bone/95 px-4 py-2 backdrop-blur-md lg:hidden"
    >
      <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
        {all.map((entry) => {
          const active = pathname === entry.href;
          return (
            <Link
              key={entry.href}
              href={entry.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "shrink-0 rounded-[2px] border px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] transition-colors",
                active
                  ? "border-ink bg-ink text-bone"
                  : "border-line-warm bg-white text-ink-soft hover:border-ink/30 hover:text-ink",
              )}
            >
              {entry.label}
              {entry.count ? <span className="ml-1.5 opacity-70">{entry.count}</span> : null}
            </Link>
          );
        })}
      </div>
      <span className="pointer-events-none absolute inset-y-0 right-0 w-9 bg-gradient-to-l from-bone to-transparent" />
    </nav>
  );
}

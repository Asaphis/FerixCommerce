"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/account", label: "Overview" },
  { href: "/account/orders", label: "Orders" },
  { href: "/account/wishlist", label: "Saved items" },
  { href: "/account/addresses", label: "Addresses" },
  { href: "/account/reviews", label: "Reviews" },
  { href: "/account/settings", label: "Settings" },
];

export function AccountNav() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-wrap gap-1.5">
      {LINKS.map((link) => {
        const active = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "rounded-[2px] border px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] transition-colors",
              active
                ? "border-ink bg-ink text-bone"
                : "border-line-warm bg-white text-ink-soft hover:border-ink/30 hover:text-ink",
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}

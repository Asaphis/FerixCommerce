"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Boxes,
  Image as ImageIcon,
  LayoutDashboard,
  Megaphone,
  Package,
  Paintbrush,
  Settings2,
  ShoppingCart,
  Users,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";

const GROUPS: { label: string; links: { href: string; label: string; Icon: typeof LayoutDashboard; soon?: boolean }[] }[] = [
  {
    label: "Business",
    links: [
      { href: "/", label: "Dashboard", Icon: LayoutDashboard },
      { href: "/analytics", label: "Analytics", Icon: BarChart3 },
      { href: "/payouts", label: "Payouts", Icon: Wallet },
    ],
  },
  {
    label: "Catalogue",
    links: [
      { href: "/products", label: "Products", Icon: Package },
      { href: "/inventory", label: "Inventory", Icon: Boxes },
      { href: "/media", label: "Media", Icon: ImageIcon },
      { href: "/promotions", label: "Promotions", Icon: Megaphone },
    ],
  },
  {
    label: "Orders",
    links: [
      { href: "/orders", label: "Orders", Icon: ShoppingCart },
      { href: "/customers", label: "Customers", Icon: Users },
    ],
  },
  {
    label: "Storefront",
    links: [
      { href: "/store-design", label: "Store Design", Icon: Paintbrush, soon: true },
      { href: "/settings", label: "Store settings", Icon: Settings2 },
    ],
  },
];

export function SideNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Merchant workspace" className="hidden gap-4 overflow-x-auto px-3 pb-3 lg:flex lg:flex-col lg:gap-0 lg:overflow-visible lg:pb-4">
      {GROUPS.map((group) => (
        <div key={group.label} className="flex shrink-0 gap-1 lg:block lg:shrink lg:pb-3">
          <p className="hidden px-3 pb-1.5 font-mono text-[9px] uppercase tracking-[0.16em] text-chalk-dim/60 lg:block">
            {group.label}
          </p>
          <div className="flex gap-1 lg:flex-col">
            {group.links.map(({ href, label, Icon, soon }) => {
              const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "inline-flex shrink-0 items-center gap-2.5 rounded-[2px] px-3 py-2 text-[12.5px] transition-colors",
                    active ? "bg-panel-2 text-lime" : "text-chalk-dim hover:bg-panel-2 hover:text-chalk",
                  )}
                >
                  <Icon width={15} height={15} />
                  {label}
                  {soon ? (
                    <span className="rounded-[2px] border border-hairline px-1 py-0.5 font-mono text-[8px] uppercase tracking-[0.12em] text-chalk-dim">
                      Soon
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

const MOBILE_LINKS = [
  { href: "/", label: "Home", Icon: LayoutDashboard },
  { href: "/products", label: "Products", Icon: Package },
  { href: "/orders", label: "Orders", Icon: ShoppingCart },
  { href: "/inventory", label: "Stock", Icon: Boxes },
  { href: "/settings", label: "Settings", Icon: Settings2 },
];

export function MobileBottomNav() {
  const pathname = usePathname();
  return (
    <>
      <div aria-hidden="true" className="h-[76px] lg:hidden" />
      <nav aria-label="Merchant primary navigation" className="fixed inset-x-0 bottom-0 z-50 border-t border-hairline bg-panel/95 backdrop-blur-md lg:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <ul className="mx-auto grid max-w-[560px] grid-cols-5">
          {MOBILE_LINKS.map(({ href, label, Icon }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <li key={href}>
                <Link href={href} aria-current={active ? "page" : undefined} className={cn("relative flex min-h-[58px] flex-col items-center justify-center gap-1 px-1 py-2 font-mono text-[9px] uppercase tracking-[0.1em] transition-colors", active ? "text-lime" : "text-chalk-dim hover:text-chalk")}>
                  <span className={cn("absolute inset-x-3 top-0 h-[2px] rounded-full bg-lime", active ? "opacity-100" : "opacity-0")} />
                  <Icon width={19} height={19} strokeWidth={active ? 2.3 : 1.8} />
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

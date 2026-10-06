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
    <nav className="flex gap-4 overflow-x-auto px-3 pb-3 lg:flex-col lg:gap-0 lg:overflow-visible lg:pb-4">
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

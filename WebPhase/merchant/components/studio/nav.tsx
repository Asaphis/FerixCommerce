"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Boxes,
  LayoutDashboard,
  Package,
  Settings2,
  ShoppingCart,
  Users,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/products", label: "Products", Icon: Package },
  { href: "/inventory", label: "Inventory", Icon: Boxes },
  { href: "/orders", label: "Orders", Icon: ShoppingCart },
  { href: "/customers", label: "Customers", Icon: Users },
  { href: "/analytics", label: "Analytics", Icon: BarChart3 },
  { href: "/payouts", label: "Payouts", Icon: Wallet },
  { href: "/settings", label: "Store settings", Icon: Settings2 },
];

export function SideNav() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:overflow-visible lg:pb-4">
      {LINKS.map(({ href, label, Icon }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "inline-flex shrink-0 items-center gap-2.5 rounded-[2px] px-3 py-2 text-[12.5px] transition-colors",
              active
                ? "bg-panel-2 text-lime"
                : "text-chalk-dim hover:bg-panel-2 hover:text-chalk",
            )}
          >
            <Icon width={15} height={15} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

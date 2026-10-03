"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, LayoutDashboard, Receipt, Settings2, Store, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/", label: "Overview", Icon: LayoutDashboard },
  { href: "/merchants", label: "Merchants", Icon: Store },
  { href: "/users", label: "Customers", Icon: Users },
  { href: "/orders", label: "Orders", Icon: Receipt },
  { href: "/analytics", label: "Analytics", Icon: BarChart3 },
  { href: "/settings", label: "Settings", Icon: Settings2 },
];

export function OpsNav() {
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
              active ? "bg-panel-2 text-signal" : "text-chalk-dim hover:bg-panel-2 hover:text-chalk",
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

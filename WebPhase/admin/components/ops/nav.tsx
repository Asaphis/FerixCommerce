"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Boxes,
  CreditCard,
  History,
  LayoutDashboard,
  Megaphone,
  Palette,
  Receipt,
  Settings2,
  ShieldCheck,
  Store,
  Users,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";

const GROUPS: { label: string; links: { href: string; label: string; Icon: typeof LayoutDashboard }[] }[] = [
  {
    label: "Platform",
    links: [
      { href: "/", label: "Overview", Icon: LayoutDashboard },
      { href: "/analytics", label: "Analytics", Icon: BarChart3 },
    ],
  },
  {
    label: "Marketplace",
    links: [
      { href: "/cms", label: "CMS", Icon: Palette },
      { href: "/catalog", label: "Catalogue", Icon: Boxes },
      { href: "/promotions", label: "Promotions", Icon: Megaphone },
    ],
  },
  {
    label: "Commerce",
    links: [
      { href: "/orders", label: "Orders", Icon: Receipt },
      { href: "/payments", label: "Payments", Icon: CreditCard },
      { href: "/payouts", label: "Payouts", Icon: Wallet },
    ],
  },
  {
    label: "People",
    links: [
      { href: "/merchants", label: "Merchants", Icon: Store },
      { href: "/users", label: "Customers", Icon: Users },
    ],
  },
  {
    label: "Control",
    links: [
      { href: "/team", label: "Team & roles", Icon: ShieldCheck },
      { href: "/audit", label: "Audit log", Icon: History },
      { href: "/settings", label: "Settings", Icon: Settings2 },
    ],
  },
];

export function OpsNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Platform console" className="hidden gap-4 overflow-x-auto px-3 pb-3 lg:flex lg:flex-col lg:gap-0 lg:overflow-visible lg:pb-4">
      {GROUPS.map((group) => (
        <div key={group.label} className="flex shrink-0 gap-1 lg:block lg:shrink lg:pb-3">
          <p className="hidden px-3 pb-1.5 font-mono text-[9px] uppercase tracking-[0.16em] text-chalk-dim/60 lg:block">
            {group.label}
          </p>
          <div className="flex gap-1 lg:flex-col">
            {group.links.map(({ href, label, Icon }) => {
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
          </div>
        </div>
      ))}
    </nav>
  );
}

const MOBILE_LINKS = [
  { href: "/", label: "Overview", Icon: LayoutDashboard },
  { href: "/merchants", label: "Merchants", Icon: Store },
  { href: "/catalog", label: "Catalogue", Icon: Boxes },
  { href: "/orders", label: "Orders", Icon: Receipt },
  { href: "/settings", label: "Settings", Icon: Settings2 },
];

export function MobileBottomNav() {
  const pathname = usePathname();
  return (
    <>
      <div aria-hidden="true" className="h-[76px] lg:hidden" />
      <nav aria-label="Admin primary navigation" className="fixed inset-x-0 bottom-0 z-50 border-t border-hairline bg-panel/95 backdrop-blur-md lg:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <ul className="mx-auto grid max-w-[560px] grid-cols-5">
          {MOBILE_LINKS.map(({ href, label, Icon }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <li key={href}>
                <Link href={href} aria-current={active ? "page" : undefined} className={cn("relative flex min-h-[58px] flex-col items-center justify-center gap-1 px-1 py-2 font-mono text-[9px] uppercase tracking-[0.1em] transition-colors", active ? "text-signal" : "text-chalk-dim hover:text-chalk")}>
                  <span className={cn("absolute inset-x-3 top-0 h-[2px] rounded-full bg-signal", active ? "opacity-100" : "opacity-0")} />
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

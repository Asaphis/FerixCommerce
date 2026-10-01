"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import {
  Activity,
  Boxes,
  ExternalLink,
  Images,
  LayoutDashboard,
  Menu,
  ShieldCheck,
  Store,
  X,
} from "lucide-react";
import { ADMIN_SECTIONS, platformTotals } from "@/lib/data";
import { money, num } from "@/lib/format";
import type { AdminSection } from "@/lib/types";
import { FerixasMark } from "@/components/brand/mark";
import { cn } from "@/lib/utils";

const GROUPS = ["Overview", "Commerce", "Money", "Platform", "Governance"];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [navOpen, setNavOpen] = useState(false);
  const totals = platformTotals();

  const current = ADMIN_SECTIONS.find(
    (section) => pathname === `/admin/${section.slug}` || (section.slug === "dashboard" && pathname === "/admin"),
  );

  return (
    <div className="min-h-screen bg-void text-chalk">
      <div className="flex">
        <aside className="sticky top-0 hidden h-screen w-[246px] shrink-0 flex-col border-r border-hairline bg-panel lg:flex">
          <div className="flex items-center gap-2.5 border-b border-hairline px-5 py-4">
            <FerixasMark className="h-6 w-6" />
            <span className="font-display text-[13px] font-extrabold uppercase tracking-[0.2em] text-chalk">
              Ferixas
            </span>
            <span className="ml-auto font-mono text-[9px] uppercase tracking-[0.16em] text-lime">
              Admin
            </span>
          </div>

          <div className="border-b border-hairline px-4 py-3">
            <p className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-chalk-dim">
              Platform GMV
            </p>
            <p className="mt-1 font-mono text-[17px] font-semibold tabular-nums text-chalk">
              {money(totals.gmv, { compact: true })}
            </p>
            <p className="mt-0.5 font-mono text-[10px] text-chalk-dim">
              {num(totals.merchants)} merchants \u00b7 {num(totals.customers, { compact: true })} customers
            </p>
          </div>

          <nav className="flex-1 overflow-y-auto px-3 py-4 [scrollbar-width:thin]">
            {GROUPS.map((group) => (
              <div key={group} className="mb-4">
                <p className="px-2 pb-2 font-mono text-[9.5px] uppercase tracking-[0.18em] text-chalk-dim/70">
                  {group}
                </p>
                <ul className="space-y-0.5">
                  {ADMIN_SECTIONS.filter((section) => section.group === group).map((section) => (
                    <li key={section.slug}>
                      <Link
                        href={section.slug === "dashboard" ? "/admin" : `/admin/${section.slug}`}
                        className={cn(
                          "flex items-center gap-2.5 rounded-[2px] px-2.5 py-1.5 text-[12.5px] transition-colors",
                          current?.slug === section.slug
                            ? "bg-panel-2 text-chalk"
                            : "text-chalk-dim hover:bg-panel-2/60 hover:text-chalk",
                        )}
                      >
                        <span
                          className={cn(
                            "h-3.5 w-[2px] rounded-[1px]",
                            current?.slug === section.slug ? "bg-lime" : "bg-transparent",
                          )}
                        />
                        {section.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>

          <div className="space-y-1 border-t border-hairline p-3">
            <Link
              href="/merchant"
              className="flex items-center gap-2 rounded-[2px] px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-chalk-dim transition-colors hover:text-chalk"
            >
              <Store width={13} height={13} /> Merchant studio
            </Link>
            <Link
              href="/"
              className="flex items-center gap-2 rounded-[2px] px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-chalk-dim transition-colors hover:text-chalk"
            >
              <ExternalLink width={13} height={13} /> Marketplace
            </Link>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-30 border-b border-hairline bg-void/92 backdrop-blur-md">
            <div className="flex items-center gap-3 px-4 py-3.5 lg:px-7">
              <button
                type="button"
                onClick={() => setNavOpen(true)}
                aria-label="Open admin navigation"
                className="grid h-9 w-9 cursor-pointer place-items-center rounded-[2px] border border-hairline text-chalk lg:hidden"
              >
                <Menu width={16} height={16} />
              </button>
              <div className="min-w-0">
                <h1 className="truncate font-display text-[17px] font-semibold text-chalk">
                  {current?.name ?? "Control room"}
                </h1>
                <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-chalk-dim">
                  Platform administration \u00b7 all {ADMIN_SECTIONS.length} sections present
                </p>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <span className="hidden items-center gap-1.5 rounded-[2px] border border-lime/35 bg-lime/10 px-2.5 py-1.5 font-mono text-[9.5px] uppercase tracking-[0.14em] text-lime sm:inline-flex">
                  <Activity width={11} height={11} /> All systems normal
                </span>
                <span className="hidden items-center gap-1.5 rounded-[2px] border border-hairline px-2.5 py-1.5 font-mono text-[9.5px] uppercase tracking-[0.14em] text-chalk-dim md:inline-flex">
                  <ShieldCheck width={11} height={11} /> Base commission 12%
                </span>
              </div>
            </div>
          </header>

          <div className="px-4 py-5 pb-24 lg:px-7 lg:py-7 lg:pb-7">{children}</div>
        </div>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-hairline bg-panel/95 backdrop-blur-md lg:hidden">
        <div className="grid grid-cols-5">
          {[
            { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
            { href: "/admin/marketplace", label: "Banners", icon: Images },
            { href: "/admin/merchants", label: "Merchants", icon: Store },
            { href: "/admin/orders", label: "Orders", icon: Boxes },
            { href: "/admin/payouts", label: "Payouts", icon: Activity },
          ].map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-1 py-2.5 font-mono text-[9px] uppercase tracking-[0.12em]",
                  active ? "text-lime" : "text-chalk-dim",
                )}
              >
                <Icon width={18} height={18} />
                {item.label}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setNavOpen(true)}
            className="flex cursor-pointer flex-col items-center gap-1 py-2.5 font-mono text-[9px] uppercase tracking-[0.12em] text-chalk-dim"
          >
            <Boxes width={18} height={18} />
            All
          </button>
        </div>
      </nav>

      {navOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setNavOpen(false)}
            className="absolute inset-0 cursor-default bg-void/70 backdrop-blur-sm"
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[86vh] overflow-y-auto rounded-t-[10px] border-t border-hairline bg-panel p-4">
            <div className="mb-4 flex items-center justify-between">
              <span className="font-display text-[15px] font-semibold text-chalk">
                All sections
              </span>
              <button
                type="button"
                onClick={() => setNavOpen(false)}
                aria-label="Close"
                className="grid h-8 w-8 cursor-pointer place-items-center rounded-[2px] border border-hairline text-chalk-dim"
              >
                <X width={15} height={15} />
              </button>
            </div>
            {GROUPS.map((group) => (
              <div key={group} className="mb-4">
                <p className="pb-2 font-mono text-[9.5px] uppercase tracking-[0.18em] text-chalk-dim/70">
                  {group}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {ADMIN_SECTIONS.filter((section: AdminSection) => section.group === group).map(
                    (section) => (
                      <Link
                        key={section.slug}
                        href={section.slug === "dashboard" ? "/admin" : `/admin/${section.slug}`}
                        onClick={() => setNavOpen(false)}
                        className="rounded-[2px] border border-hairline px-3 py-2.5 text-[12.5px] text-chalk"
                      >
                        {section.name}
                      </Link>
                    ),
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

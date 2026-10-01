"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import {
  ArrowUpRight,
  BadgePercent,
  Banknote,
  Boxes,
  ChevronDown,
  ExternalLink,
  Globe,
  LayoutDashboard,
  Menu,
  Package,
  PenTool,
  ReceiptText,
  Search,
  Settings,
  Store,
  TrendingUp,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useFerixas } from "@/lib/store";
import { merchantStats } from "@/lib/data";
import { FerixasMark } from "@/components/brand/mark";

const NAV: { group: string; items: { href: string; label: string; icon: LucideIcon }[] }[] = [
  {
    group: "Commerce",
    items: [
      { href: "/merchant", label: "Overview", icon: LayoutDashboard },
      { href: "/merchant/orders", label: "Orders", icon: ReceiptText },
      { href: "/merchant/products", label: "Products", icon: Package },
      { href: "/merchant/inventory", label: "Inventory", icon: Boxes },
      { href: "/merchant/customers", label: "Customers", icon: Users },
    ],
  },
  {
    group: "Growth",
    items: [
      { href: "/merchant/analytics", label: "Analytics", icon: TrendingUp },
      { href: "/merchant/promotions", label: "Promotions", icon: BadgePercent },
    ],
  },
  {
    group: "Storefront",
    items: [
      { href: "/merchant/store", label: "Store", icon: Store },
      { href: "/merchant/design", label: "Design Engine", icon: PenTool },
      { href: "/merchant/domains", label: "Domains", icon: Globe },
    ],
  },
  {
    group: "Money",
    items: [
      { href: "/merchant/payouts", label: "Payouts", icon: Banknote },
      { href: "/merchant/settings", label: "Settings", icon: Settings },
    ],
  },
];

const MOBILE_ITEMS = [
  { href: "/merchant", label: "Home", icon: LayoutDashboard },
  { href: "/merchant/orders", label: "Orders", icon: ReceiptText },
  { href: "/merchant/products", label: "Products", icon: Package },
  { href: "/merchant/design", label: "Design", icon: PenTool },
];

export function StudioShell({
  children,
  title,
  subtitle,
  actions,
}: {
  children: ReactNode;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  const { merchant, merchantId } = useFerixas();
  const [navOpen, setNavOpen] = useState(false);
  const stats = merchantStats(merchantId);

  return (
    <div className="min-h-screen bg-void text-chalk">
      <div className="flex">
        <aside className="sticky top-0 hidden h-screen w-[252px] shrink-0 flex-col border-r border-hairline bg-panel lg:flex">
          <div className="flex items-center gap-2.5 border-b border-hairline px-5 py-4">
            <FerixasMark className="h-6 w-6" tone="ember" />
            <span className="font-display text-[13px] font-extrabold uppercase tracking-[0.2em] text-chalk">
              Ferixas
            </span>
            <span className="ml-auto font-mono text-[9px] uppercase tracking-[0.16em] text-chalk-dim">
              Studio
            </span>
          </div>

          <MerchantSwitcher />

          <nav className="flex-1 overflow-y-auto px-3 py-4 [scrollbar-width:thin]">
            {NAV.map((group) => (
              <div key={group.group} className="mb-5">
                <p className="px-2 pb-2 font-mono text-[9.5px] uppercase tracking-[0.18em] text-chalk-dim/70">
                  {group.group}
                </p>
                <ul className="space-y-0.5">
                  {group.items.map((item) => (
                    <NavItem key={item.href} {...item} badge={item.label === "Orders" ? stats.unfulfilled : undefined} />
                  ))}
                </ul>
              </div>
            ))}
          </nav>

          <div className="border-t border-hairline p-3">
            <Link
              href={`/store/${merchant.slug}`}
              className="flex items-center justify-between rounded-[2px] border border-hairline px-3 py-2.5 transition-colors hover:border-chalk-dim"
            >
              <span className="min-w-0">
                <span className="block font-mono text-[9.5px] uppercase tracking-[0.14em] text-chalk-dim">
                  View live store
                </span>
                <span className="mt-0.5 block truncate font-mono text-[11px] text-chalk">
                  {merchant.customDomain ?? merchant.domain}
                </span>
              </span>
              <ExternalLink width={14} height={14} className="shrink-0 text-chalk-dim" />
            </Link>
            <Link
              href="/"
              className="mt-2 flex items-center gap-2 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-chalk-dim transition-colors hover:text-chalk"
            >
              <ArrowUpRight width={13} height={13} />
              Back to marketplace
            </Link>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-30 border-b border-hairline bg-void/92 backdrop-blur-md">
            <div className="flex items-center gap-3 px-4 py-3.5 lg:px-7">
              <button
                type="button"
                onClick={() => setNavOpen(true)}
                aria-label="Open navigation"
                className="grid h-9 w-9 cursor-pointer place-items-center rounded-[2px] border border-hairline text-chalk lg:hidden"
              >
                <Menu width={16} height={16} />
              </button>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="truncate font-display text-[17px] font-semibold text-chalk">
                    {title}
                  </h1>
                  <span className="hidden font-mono text-[10px] uppercase tracking-[0.14em] text-chalk-dim sm:inline">
                    / {merchant.name}
                  </span>
                </div>
                {subtitle ? (
                  <p className="mt-0.5 truncate text-[12.5px] text-chalk-dim">{subtitle}</p>
                ) : null}
              </div>
              <div className="ml-auto flex items-center gap-2">
                <div className="hidden items-center gap-2 rounded-[2px] border border-hairline px-3 py-2 text-chalk-dim xl:flex">
                  <Search width={13} height={13} />
                  <span className="font-mono text-[11px]">Search</span>
                  <kbd className="ml-6 rounded-[2px] border border-hairline px-1.5 py-0.5 font-mono text-[9px]">
                    /
                  </kbd>
                </div>
                {actions}
              </div>
            </div>
          </header>

          <div className="px-4 py-5 pb-28 lg:px-7 lg:py-7 lg:pb-7">{children}</div>
        </div>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-hairline bg-panel/95 backdrop-blur-md lg:hidden">
        <div className="grid grid-cols-5">
          {MOBILE_ITEMS.map((item) => (
            <MobileItem key={item.href} {...item} />
          ))}
          <button
            type="button"
            onClick={() => setNavOpen(true)}
            className="flex cursor-pointer flex-col items-center gap-1 py-2.5 font-mono text-[9px] uppercase tracking-[0.12em] text-chalk-dim"
          >
            <Boxes width={18} height={18} />
            More
          </button>
        </div>
      </nav>

      {navOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setNavOpen(false)}
            className="absolute inset-0 cursor-pointer bg-void/70 backdrop-blur-sm"
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[86vh] overflow-y-auto rounded-t-[10px] border-t border-hairline bg-panel p-4">
            <div className="mb-4 flex items-center justify-between">
              <span className="font-display text-[15px] font-semibold text-chalk">
                {merchant.name}
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
            <MerchantSwitcher onPick={() => setNavOpen(false)} compact />
            <div className="mt-4 space-y-4">
              {NAV.map((group) => (
                <div key={group.group}>
                  <p className="pb-2 font-mono text-[9.5px] uppercase tracking-[0.18em] text-chalk-dim/70">
                    {group.group}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setNavOpen(false)}
                          className="flex items-center gap-2.5 rounded-[2px] border border-hairline px-3 py-3 text-[12.5px] text-chalk"
                        >
                          <Icon width={15} height={15} className="text-chalk-dim" />
                          {item.label}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function NavItem({
  href,
  label,
  icon: Icon,
  badge,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
}) {
  const pathname = usePathname();
  const active = pathname === href;
  return (
    <li>
      <Link
        href={href}
        className={cn(
          "group flex items-center gap-2.5 rounded-[2px] px-2.5 py-2 text-[13px] transition-colors",
          active
            ? "bg-panel-2 text-chalk"
            : "text-chalk-dim hover:bg-panel-2/60 hover:text-chalk",
        )}
      >
        <span
          className={cn(
            "h-4 w-[2px] rounded-[1px]",
            active ? "bg-lime" : "bg-transparent",
          )}
        />
        <Icon width={15} height={15} className={active ? "text-lime" : "text-chalk-dim"} />
        <span className="flex-1">{label}</span>
        {badge ? (
          <span className="rounded-[2px] bg-ember/20 px-1.5 py-0.5 font-mono text-[10px] text-ember-soft">
            {badge}
          </span>
        ) : null}
      </Link>
    </li>
  );
}

function MobileItem({ href, label, icon: Icon }: { href: string; label: string; icon: LucideIcon }) {
  const pathname = usePathname();
  const active = pathname === href;
  return (
    <Link
      href={href}
      className={cn(
        "flex flex-col items-center gap-1 py-2.5 font-mono text-[9px] uppercase tracking-[0.12em]",
        active ? "text-lime" : "text-chalk-dim",
      )}
    >
      <Icon width={18} height={18} />
      {label}
    </Link>
  );
}

function MerchantSwitcher({ onPick, compact }: { onPick?: () => void; compact?: boolean }) {
  const { merchants, merchantId, setMerchantId } = useFerixas();
  const [open, setOpen] = useState(false);
  const current = merchants.find((m) => m.id === merchantId) ?? merchants[0];

  return (
    <div className={cn("relative", compact ? "" : "border-b border-hairline px-3 py-3")}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full cursor-pointer items-center gap-2.5 rounded-[2px] border border-hairline px-3 py-2.5 text-left transition-colors hover:border-chalk-dim"
      >
        <span
          className="grid h-7 w-7 shrink-0 place-items-center rounded-[2px] font-display text-[12px] font-extrabold"
          style={{ background: current.brand.accent, color: current.brand.accentInk }}
        >
          {current.name.slice(0, 1)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[12.5px] font-medium text-chalk">
            {current.name}
          </span>
          <span className="block font-mono text-[9.5px] uppercase tracking-[0.14em] text-chalk-dim">
            {current.plan} plan
          </span>
        </span>
        <ChevronDown
          width={14}
          height={14}
          className={cn("shrink-0 text-chalk-dim transition-transform", open && "rotate-180")}
        />
      </button>

      {open ? (
        <>
          <button
            type="button"
            aria-label="Close merchant list"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 cursor-default"
          />
          <div className="absolute left-0 right-0 z-50 mt-1 max-h-[320px] overflow-y-auto rounded-[2px] border border-hairline bg-panel-2 p-1.5 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.8)]">
            <p className="px-2 py-1.5 font-mono text-[9px] uppercase tracking-[0.16em] text-chalk-dim">
              Switch tenant
            </p>
            {merchants.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  setMerchantId(m.id);
                  setOpen(false);
                  onPick?.();
                }}
                className={cn(
                  "flex w-full cursor-pointer items-center gap-2.5 rounded-[2px] px-2 py-2 text-left transition-colors",
                  m.id === merchantId ? "bg-panel text-chalk" : "text-chalk-dim hover:bg-panel hover:text-chalk",
                )}
              >
                <span
                  className="grid h-6 w-6 shrink-0 place-items-center rounded-[2px] font-display text-[11px] font-bold"
                  style={{ background: m.brand.accent, color: m.brand.accentInk }}
                >
                  {m.name.slice(0, 1)}
                </span>
                <span className="min-w-0 flex-1 truncate text-[12.5px]">{m.name}</span>
                <span className="font-mono text-[9.5px] uppercase tracking-[0.12em] opacity-70">
                  {m.plan}
                </span>
              </button>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

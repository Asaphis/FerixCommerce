"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BarChart3,
  Boxes,
  Image as ImageIcon,
  LayoutDashboard,
  Megaphone,
  Menu,
  Package,
  Paintbrush,
  Settings2,
  ShoppingCart,
  Users,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_GROUPS, MOBILE_PRIMARY, isActivePath, type NavItem } from "@/components/studio/nav-data";

/** Icons are the only React-bound part of the nav, so they live here. */
const ICONS: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard,
  chart: BarChart3,
  wallet: Wallet,
  package: Package,
  boxes: Boxes,
  image: ImageIcon,
  megaphone: Megaphone,
  cart: ShoppingCart,
  users: Users,
  paintbrush: Paintbrush,
  settings: Settings2,
};

function iconFor(link: NavItem): LucideIcon {
  return ICONS[link.icon] ?? LayoutDashboard;
}

function SoonTag() {
  return (
    <span className="rounded-[2px] border border-white/10 px-1 py-0.5 font-mono text-[8px] uppercase tracking-[0.12em] text-white/55">
      Soon
    </span>
  );
}

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime focus-visible:ring-offset-2 focus-visible:ring-offset-[#102d43]";

/** Grouped sidebar. Rendered at 1280px and up. */
export function StudioSidebar() {
  const pathname = usePathname();
  return (
    <nav aria-label="Merchant workspace" className="flex flex-col gap-4 px-3 pb-4">
      {NAV_GROUPS.map((group) => (
        <div key={group.label}>
          <p className="px-3 pb-1.5 font-mono text-[9px] uppercase tracking-[0.16em] text-white/45">
            {group.label}
          </p>
          <div className="flex flex-col gap-0.5">
            {group.items.map((item) => {
              const Icon = iconFor(item);
              const active = isActivePath(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-h-[44px] items-center gap-2.5 rounded-[2px] px-3 text-[12.5px] transition-colors",
                    FOCUS_RING,
                    active ? "bg-[#f05a28] text-white shadow-sm" : "text-white/70 hover:bg-white/10 hover:text-white",
                  )}
                >
                  <Icon width={16} height={16} className="shrink-0" />
                  <span className="flex-1 truncate">{item.label}</span>
                  {item.soon ? <SoonTag /> : null}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

/** Icon rail. Rendered from 768px until the sidebar takes over at 1280px. */
export function StudioRail() {
  const pathname = usePathname();
  return (
    <nav aria-label="Merchant workspace" className="flex flex-col gap-1 px-2 py-1">
      {NAV_GROUPS.map((group, index) => (
        <div
          key={group.label}
          className={cn("flex flex-col gap-1", index > 0 && "mt-2 border-t border-white/10 pt-2")}
        >
          {group.items.map((item) => {
            const Icon = iconFor(item);
            const active = isActivePath(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "grid h-11 w-11 place-items-center rounded-[2px] transition-colors",
                  FOCUS_RING,
                  active ? "bg-[#f05a28] text-white shadow-sm" : "text-white/70 hover:bg-white/10 hover:text-white",
                )}
              >
                <Icon width={18} height={18} />
                <span className="sr-only">{item.label}</span>
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

/** Phone bottom bar plus the "More" drawer. Rendered below 768px. */
export function StudioBottomNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const all = NAV_GROUPS.flatMap((group) => group.items);
  const items = MOBILE_PRIMARY.map((href) => all.find((item) => item.href === href)).filter(
    (item): item is NavItem => Boolean(item),
  );
  const moreActive = !items.some((item) => isActivePath(pathname, item.href));

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <>
      <div aria-hidden="true" className="h-[72px] md:hidden" />
      <nav
        aria-label="Merchant primary navigation"
        className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-[#102d43]/95 backdrop-blur-md md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <ul className="mx-auto grid max-w-[560px] grid-cols-5">
          {items.map((item) => {
            const Icon = iconFor(item);
            const active = isActivePath(pathname, item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative flex min-h-[56px] flex-col items-center justify-center gap-1 px-1 py-2 font-mono text-[9px] uppercase tracking-[0.1em] transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-lime",
                    active ? "text-lime" : "text-white/65 hover:text-white",
                  )}
                >
                  <span
                    className={cn(
                      "absolute inset-x-3 top-0 h-[2px] rounded-full bg-lime",
                      active ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <Icon width={19} height={19} strokeWidth={active ? 2.3 : 1.8} />
                  {item.label}
                </Link>
              </li>
            );
          })}
          <li>
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-haspopup="dialog"
              aria-expanded={open}
              className={cn(
                "relative flex min-h-[56px] w-full flex-col items-center justify-center gap-1 px-1 py-2 font-mono text-[9px] uppercase tracking-[0.1em] transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-lime",
                moreActive ? "text-lime" : "text-white/65 hover:text-white",
              )}
            >
              <span
                className={cn(
                  "absolute inset-x-3 top-0 h-[2px] rounded-full bg-lime",
                  moreActive ? "opacity-100" : "opacity-0",
                )}
              />
              <Menu width={19} height={19} strokeWidth={moreActive ? 2.3 : 1.8} />
              More
            </button>
          </li>
        </ul>
      </nav>
      {open ? <MoreDrawer onClose={() => setOpen(false)} /> : null}
    </>
  );
}

/** Every destination, grouped, for the phone drawer. */
function MoreDrawer({ onClose }: { onClose: () => void }) {
  const pathname = usePathname();

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[60] md:hidden" role="dialog" aria-modal="true" aria-label="All destinations">
      <button
        type="button"
        aria-label="Close navigation"
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default bg-[#10191f]/70 backdrop-blur-sm"
      />
      <div
        className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-[4px] border-t border-white/10 bg-[#102d43] px-4 pb-6 pt-3"
        style={{ paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom))" }}
      >
        <div className="mb-3 flex items-center justify-between">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/55">All destinations</p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className={cn(
              "grid h-11 w-11 place-items-center rounded-[2px] text-white/65 hover:bg-white/10 hover:text-white",
              FOCUS_RING,
            )}
          >
            <X width={18} height={18} />
          </button>
        </div>
        <div className="flex flex-col gap-4">
          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              <p className="px-1 pb-1.5 font-mono text-[9px] uppercase tracking-[0.16em] text-white/45">
                {group.label}
              </p>
              <div className="flex flex-col gap-0.5">
                {group.items.map((item) => {
                  const Icon = iconFor(item);
                  const active = isActivePath(pathname, item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onClose}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex min-h-[48px] items-center gap-3 rounded-[2px] px-3 text-[13.5px] transition-colors",
                        FOCUS_RING,
                        active ? "bg-white/10 text-lime" : "text-white/65 hover:bg-white/10 hover:text-white",
                      )}
                    >
                      <Icon width={17} height={17} className="shrink-0" />
                      <span className="flex-1 truncate">{item.label}</span>
                      {item.soon ? <SoonTag /> : null}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

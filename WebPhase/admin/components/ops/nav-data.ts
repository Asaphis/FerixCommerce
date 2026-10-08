/**
 * The single source of truth for every ops navigation surface.
 *
 * This module is deliberately free of "use client" and of React imports: it is
 * plain data, so both the server-rendered shell and the client navigation
 * components can read the same list. Add a destination here once and the
 * grouped sidebar (1280px+), the tablet rail (768px+), the phone bottom bar
 * and its "More" drawer all pick it up.
 */

export type NavItem = {
  href: string;
  label: string;
  /** Key into the ICONS map in nav.tsx. */
  icon: string;
  soon?: boolean;
};

export type NavGroupData = { label: string; items: NavItem[] };

export const NAV_GROUPS: NavGroupData[] = [
  {
    label: "Platform",
    items: [
      { href: "/", label: "Overview", icon: "dashboard" },
      { href: "/analytics", label: "Analytics", icon: "chart" },
    ],
  },
  {
    label: "Marketplace",
    items: [
      { href: "/cms", label: "CMS", icon: "palette" },
      { href: "/catalog", label: "Catalogue", icon: "boxes" },
      { href: "/promotions", label: "Promotions", icon: "megaphone" },
    ],
  },
  {
    label: "Commerce",
    items: [
      { href: "/orders", label: "Orders", icon: "receipt" },
      { href: "/payments", label: "Payments", icon: "card" },
      { href: "/payouts", label: "Payouts", icon: "wallet" },
    ],
  },
  {
    label: "People",
    items: [
      { href: "/merchants", label: "Merchants", icon: "store" },
      { href: "/users", label: "Customers", icon: "users" },
    ],
  },
  {
    label: "Control",
    items: [
      { href: "/team", label: "Team & roles", icon: "shield" },
      { href: "/audit", label: "Audit log", icon: "history" },
      { href: "/settings", label: "Settings", icon: "settings" },
    ],
  },
];

export const ALL_NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((group) => group.items);

/** The four destinations worth a permanent slot in the phone thumb zone. */
export const MOBILE_PRIMARY = ["/", "/merchants", "/catalog", "/orders"];

export function isActivePath(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * The single source of truth for every merchant navigation surface.
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
    label: "Business",
    items: [
      { href: "/", label: "Dashboard", icon: "dashboard" },
      { href: "/analytics", label: "Analytics", icon: "chart" },
      { href: "/payouts", label: "Payouts", icon: "wallet" },
    ],
  },
  {
    label: "Catalogue",
    items: [
      { href: "/products", label: "Products", icon: "package" },
      { href: "/inventory", label: "Inventory", icon: "boxes" },
      { href: "/promotions", label: "Promotions", icon: "megaphone" },
    ],
  },
  {
    label: "Orders",
    items: [
      { href: "/orders", label: "Orders", icon: "cart" },
      { href: "/customers", label: "Customers", icon: "users" },
    ],
  },
  {
    label: "Storefront",
    items: [
      { href: "/store-design", label: "Store Design", icon: "paintbrush", soon: true },
      { href: "/settings", label: "Store settings", icon: "settings" },
    ],
  },
];

export const ALL_NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((group) => group.items);

/** The four destinations worth a permanent slot in the phone thumb zone. */
export const MOBILE_PRIMARY = ["/", "/products", "/orders", "/inventory"];

export function isActivePath(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

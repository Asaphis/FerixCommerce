/**
 * The single source of truth for every ops navigation surface.
 *
 * This module is deliberately free of "use client" and of React imports: it is
 * plain data, so both the server-rendered shell and the client navigation
 * components can read the same list. Add a destination here once and the
 * grouped sidebar (1280px+), the tablet rail (768px+), the phone bottom bar
 * and its "More" drawer all pick it up.
 *
 * Order is deliberate: grouped by the job being done, most frequent first, and
 * the same word is used for the same thing in every Ferixas surface.
 * Actions (add, upload, publish) are never destinations — they live on the
 * page that owns them.
 */

export type NavItem = {
  /** Permission this destination needs. Absent means everyone. */
  permission?: string;
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
      { href: "/analytics", label: "Analytics", icon: "chart", permission: "analytics.view" },
    ],
  },
  {
    label: "Marketplace",
    items: [
      { href: "/catalog", label: "Catalogue", icon: "boxes", permission: "catalog.manage" },
      { href: "/cms", label: "CMS", icon: "palette", permission: "cms.manage" },
      { href: "/cms/brands", label: "Brands", icon: "tag", permission: "catalog.manage" },
      { href: "/cms/adverts", label: "Adverts", icon: "megaphone", permission: "cms.manage" },
      { href: "/promotions", label: "Promotions", icon: "megaphone", permission: "promotions.manage" },
    ],
  },
  {
    label: "Commerce",
    items: [
      { href: "/orders", label: "Orders", icon: "receipt", permission: "orders.view" },
      { href: "/payments", label: "Payments", icon: "card", permission: "payments.view" },
      { href: "/payouts", label: "Payouts", icon: "wallet", permission: "payouts.view" },
    ],
  },
  {
    label: "People",
    items: [
      { href: "/merchants", label: "Merchants", icon: "store", permission: "merchant.view" },
      { href: "/users", label: "Customers", icon: "users", permission: "customer.view" },
    ],
  },
  {
    label: "Control",
    items: [
      { href: "/team", label: "Team & roles", icon: "shield", permission: "settings.manage" },
      { href: "/audit", label: "Audit log", icon: "history", permission: "audit.view" },
      { href: "/settings", label: "Settings", icon: "settings", permission: "settings.manage" },
    ],
  },
];

export const ALL_NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((group) => group.items);

/** The four destinations worth a permanent slot in the phone thumb zone. */
export const MOBILE_PRIMARY = [
  "/",
  "/orders",
  "/catalog",
  "/merchants",
];

export function isActivePath(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * What a role is allowed to reach.
 *
 * A destination with no permission is for everyone. `*` is the owner. A
 * "manage" grant implies the matching "view", which is the same rule the API
 * applies, so the menu and the endpoint can never disagree about a door.
 */
export function canUse(permissions: string[], item: NavItem): boolean {
  if (!item.permission) return true;
  if (permissions.includes("*")) return true;
  if (permissions.includes(item.permission)) return true;
  if (item.permission.endsWith(".view")) {
    return permissions.includes(item.permission.replace(".view", ".manage"));
  }
  return false;
}

/** The menu a role should see, with empty groups dropped entirely. */
export function visibleGroups(permissions?: string[]): NavGroupData[] {
  if (!permissions) return NAV_GROUPS;   // unknown role: show the console rather than an empty shell
  return NAV_GROUPS
    .map((group) => ({ ...group, items: group.items.filter((item) => canUse(permissions, item)) }))
    .filter((group) => group.items.length > 0);
}

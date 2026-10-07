import Link from "next/link";
import {
  Bell,
  Heart,
  Instagram,
  RotateCcw,
  Search,
  ShieldCheck,
  ShoppingBag,
  Store,
  Truck,
  Twitter,
  User2,
} from "lucide-react";
import type { AccountUser, Category } from "@/lib/api";
import { FerixMark } from "@/components/ferix/marks";
import { FerixMobileMenu } from "@/components/ferix/mobile-menu";

/**
 * The shared marketplace chrome.
 *
 * Desktop keeps the full header: announcement strip, search, account actions and
 * a department strip. Below 1024px that whole thing collapses to a single 56px
 * bar — menu, logo, search, cart — because navigation belongs in the bottom tab
 * bar (`FerixMobileNav`), not stacked at the top of the screen.
 */
export function FerixHeader({
  user,
  cartCount,
  categories,
}: {
  user: AccountUser | null;
  cartCount: number;
  categories: Category[];
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-line-warm bg-bone/95 shadow-[0_2px_12px_rgba(20,17,14,0.05)] backdrop-blur-md">
      <div className="hidden border-b border-line-warm bg-void lg:block">
        <div className="mx-auto flex max-w-[1240px] items-center gap-4 px-6 py-1.5">
          <p className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-chalk-dim">
            Free delivery over $120 · Tracked across seven countries
          </p>
          <Link
            href="/stores"
            className="ml-auto font-mono text-[9.5px] uppercase tracking-[0.16em] text-chalk-dim transition-colors hover:text-lime"
          >
            {user ? `Signed in as ${user.name.split(" ")[0]}` : "Sell on Ferixas"}
          </Link>
        </div>
      </div>

      <div className="mx-auto flex h-14 max-w-[1240px] items-center gap-2 px-4 lg:h-auto lg:gap-3 lg:px-6 lg:py-3">
        <FerixMobileMenu categories={categories} user={user} />

        <Link href="/" className="flex shrink-0 items-center gap-2" aria-label="Ferixas home">
          <FerixMark />
          <span className="hidden font-display text-[15px] font-extrabold tracking-[0.16em] text-ink lg:inline">
            FERIXAS
          </span>
        </Link>

        <form action="/search" className="relative ml-4 hidden min-w-0 flex-1 items-center lg:flex">
          <Search width={15} height={15} className="pointer-events-none absolute left-3 text-ink-soft" />
          <input
            type="search"
            name="q"
            placeholder="Search products, stores and categories"
            aria-label="Search products, stores and categories"
            className="h-10 w-full rounded-[3px] border border-line-warm bg-white pl-9 pr-3 text-[13.5px] text-ink outline-none transition-colors placeholder:text-ink-soft/70 focus:border-ember"
          />
        </form>

        <div className="ml-auto flex shrink-0 items-center gap-1">
          <Link
            href="/stores"
            className="hidden items-center gap-1.5 rounded-[2px] px-2.5 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft transition-colors hover:bg-bone-soft hover:text-ink lg:inline-flex"
          >
            <Store width={14} height={14} />
            Stores
          </Link>
          <Link
            href={user ? "/account/wishlist" : "/login?return=/account/wishlist"}
            className="hidden items-center gap-1.5 rounded-[2px] px-2.5 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft transition-colors hover:bg-bone-soft hover:text-ink lg:inline-flex"
          >
            <Heart width={14} height={14} />
            Wishlist
          </Link>
          <Link
            href={user ? "/account/notifications" : "/login?return=/account/notifications"}
            aria-label="Notifications"
            className="hidden items-center gap-1.5 rounded-[2px] px-2.5 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft transition-colors hover:bg-bone-soft hover:text-ink lg:inline-flex"
          >
            <Bell width={14} height={14} />
            Alerts
          </Link>
          <Link
            href={user ? "/account" : "/login"}
            className="hidden items-center gap-1.5 rounded-[2px] px-2.5 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft transition-colors hover:bg-bone-soft hover:text-ink lg:inline-flex"
          >
            <User2 width={14} height={14} />
            {user ? user.avatarInitials : "Sign in"}
          </Link>

          <Link
            href="/search"
            aria-label="Search"
            className="grid h-10 w-10 place-items-center rounded-[2px] text-ink-soft transition-colors hover:bg-bone-soft hover:text-ink lg:hidden"
          >
            <Search width={20} height={20} />
          </Link>

          <Link
            href="/cart"
            aria-label={`Cart, ${cartCount} item${cartCount === 1 ? "" : "s"}`}
            className="inline-flex items-center gap-2 rounded-[3px] bg-ember px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-white transition-colors hover:bg-ink"
          >
            <ShoppingBag width={14} height={14} />
            <span className="hidden lg:inline">Cart</span>
            <span className="rounded-[2px] bg-lime px-1.5 py-[1px] font-semibold tabular-nums text-void">
              {cartCount > 99 ? "99+" : cartCount}
            </span>
          </Link>
        </div>
      </div>

      <div className="hidden border-t border-hairline bg-void lg:block">
        <div className="mx-auto flex max-w-[1240px] items-center gap-1 overflow-x-auto px-6 py-2">
          <Link
            href="/browse"
            className="shrink-0 rounded-[2px] px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.14em] text-chalk transition-colors hover:bg-panel"
          >
            All departments
          </Link>
          {categories.map((category) => (
            <Link
              key={category.slug}
              href={`/category/${category.slug}`}
              className="shrink-0 rounded-[2px] px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.14em] text-chalk-dim transition-colors hover:bg-panel hover:text-chalk"
            >
              {category.name}
            </Link>
          ))}
          <Link
            href="/collections"
            className="shrink-0 rounded-[2px] px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.14em] text-chalk-dim transition-colors hover:bg-panel hover:text-chalk"
          >
            Collections
          </Link>
        </div>
      </div>
    </header>
  );
}

export function FerixFooter() {
  return (
    <footer className="mt-16 border-t border-hairline bg-void">
      <div className="mx-auto max-w-[1240px] px-4 py-12 lg:px-6">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="flex items-center gap-2">
              <FerixMark />
              <span className="font-display text-[15px] font-extrabold tracking-[0.16em] text-chalk">FERIXAS</span>
            </div>
            <p className="mt-4 max-w-[34ch] text-[13px] leading-relaxed text-chalk-dim">
              One catalogue, every channel. Merchants keep their own storefront and sell on the
              marketplace from the same product record.
            </p>
            <div className="mt-5 flex gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-[2px] border border-hairline text-chalk-dim">
                <Twitter width={14} height={14} />
              </span>
              <span className="grid h-8 w-8 place-items-center rounded-[2px] border border-hairline text-chalk-dim">
                <Instagram width={14} height={14} />
              </span>
            </div>
          </div>

          <FooterColumn
            title="Shop"
            links={[
              { label: "All departments", href: "/browse" },
              { label: "Merchant stores", href: "/stores" },
              { label: "Collections", href: "/collections" },
              { label: "New arrivals", href: "/browse?sort=new" },
              { label: "Best selling", href: "/browse?sort=best" },
            ]}
          />

          <FooterColumn
            title="Your account"
            links={[
              { label: "Sign in", href: "/login" },
              { label: "Create an account", href: "/register" },
              { label: "Orders", href: "/account/orders" },
              { label: "Wishlist", href: "/account/wishlist" },
              { label: "Track an order", href: "/track-order" },
              { label: "Addresses", href: "/account/addresses" },
            ]}
          />

          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-chalk-dim">Buying on Ferixas</p>
            <ul className="mt-4 space-y-3">
              {[
                { icon: Truck, title: "Delivery in 2-5 days", body: "Tracked across seven countries" },
                { icon: ShieldCheck, title: "Buyer protection", body: "Refunded if it never arrives" },
                { icon: RotateCcw, title: "30-day returns", body: "Free over $120" },
              ].map((item) => (
                <li key={item.title} className="flex items-start gap-2.5">
                  <item.icon width={15} height={15} className="mt-[2px] shrink-0 text-lime" />
                  <span>
                    <span className="block text-[12.5px] font-medium text-chalk">{item.title}</span>
                    <span className="block text-[11.5px] text-chalk-dim">{item.body}</span>
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2">
              {[
                { label: "Help", href: "/help" },
                { label: "FAQ", href: "/faq" },
                { label: "Contact", href: "/contact" },
                { label: "Returns", href: "/returns" },
              ].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="font-mono text-[10px] uppercase tracking-[0.14em] text-chalk-dim transition-colors hover:text-lime"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-hairline pt-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-chalk-dim">
            © {new Date().getFullYear()} Ferixas Commerce
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {[
              { label: "About", href: "/about" },
              { label: "Terms", href: "/terms" },
              { label: "Privacy", href: "/privacy" },
              { label: "Shipping", href: "/shipping-policy" },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="font-mono text-[10px] uppercase tracking-[0.16em] text-chalk-dim transition-colors hover:text-lime"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, links }: { title: string; links: { label: string; href: string }[] }) {
  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-chalk-dim">{title}</p>
      <ul className="mt-4 space-y-2.5">
        {links.map((link) => (
          <li key={link.href + link.label}>
            <Link href={link.href} className="text-[13px] text-chalk transition-colors hover:text-lime">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

import Link from "next/link";
import {
  Heart,
  Instagram,
  Search,
  ShoppingBag,
  Store,
  Twitter,
  User2,
} from "lucide-react";
import type { AccountUser, Category } from "@/lib/api";
import { FerixMark } from "@/components/ferix/marks";
import { FerixMobileMenu } from "@/components/ferix/mobile-menu";

/** Shared retail marketplace navigation, with a complete search-first mobile header. */
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
    <header className="sticky top-0 z-40 border-b border-line-warm bg-white shadow-[0_2px_12px_rgba(16,45,67,0.06)]">
      <div className="hidden border-b border-white/10 bg-void lg:block">
        <div className="mx-auto flex max-w-[1320px] items-center gap-4 px-6 py-1.5">
          <p className="text-[10px] font-medium text-white/75">Discover products from stores across Ferixas.</p>
          <Link href="/stores" className="ml-auto text-[10px] font-semibold text-white/75 transition-colors hover:text-white">
            {user ? `Hi, ${user.name.split(" ")[0]}` : "Sell on Ferixas"}
          </Link>
        </div>
      </div>

      <div className="hidden lg:block">
        <div className="mx-auto flex h-[76px] max-w-[1320px] items-center gap-5 px-6">
          <Link href="/" className="flex shrink-0 items-center gap-2.5" aria-label="Ferixas home">
            <FerixMark className="h-8 w-8" />
            <span className="font-display text-[18px] font-extrabold tracking-[0.08em] text-ink">FERIXAS</span>
          </Link>
          <form action="/search" className="relative ml-3 flex min-w-0 flex-1 items-center">
            <Search width={17} height={17} className="pointer-events-none absolute left-3.5 text-ink-soft" />
            <input type="search" name="q" placeholder="Search products, brands and more" aria-label="Search products, brands and more" className="h-11 w-full rounded-[2px] rounded-tr-[12px] border border-line-warm bg-[#f7f9fb] pl-10 pr-3 text-[13px] text-ink outline-none transition-colors placeholder:text-ink-soft/75 focus:border-ember focus:bg-white" />
            <button type="submit" aria-label="Submit search" className="absolute right-0 grid h-11 w-12 place-items-center rounded-[2px] rounded-tr-[12px] bg-ember text-white transition-colors hover:bg-[#dc481c]"><Search width={17} height={17} /></button>
          </form>
          <div className="flex shrink-0 items-center gap-1">
            <Link href="/stores" className="inline-flex min-h-10 items-center gap-1.5 px-2.5 text-[11px] font-semibold text-ink-soft transition-colors hover:text-ember"><Store width={16} height={16} /> Stores</Link>
            <Link href={user ? "/account/wishlist" : "/login?return=/account/wishlist"} className="inline-flex min-h-10 items-center gap-1.5 px-2.5 text-[11px] font-semibold text-ink-soft transition-colors hover:text-ember"><Heart width={16} height={16} /> Saved</Link>
            <Link href={user ? "/account" : "/login"} className="inline-flex min-h-10 items-center gap-1.5 px-2.5 text-[11px] font-semibold text-ink-soft transition-colors hover:text-ember"><User2 width={16} height={16} /> {user ? user.name.split(" ")[0] : "Account"}</Link>
            <Link href="/cart" aria-label={`Cart, ${cartCount} item${cartCount === 1 ? "" : "s"}`} className="ml-1 inline-flex h-10 items-center gap-2 rounded-[2px] rounded-tr-[10px] bg-ember px-3.5 text-[12px] font-bold text-white transition-colors hover:bg-[#dc481c]">
              <ShoppingBag width={16} height={16} /> Cart <span className="grid h-5 min-w-5 place-items-center rounded-[2px] bg-white px-1 text-[10px] font-bold tabular-nums text-ember">{cartCount > 99 ? "99+" : cartCount}</span>
            </Link>
          </div>
        </div>
      </div>

      <div className="lg:hidden">
        <div className="mx-auto flex h-[54px] max-w-[1320px] items-center gap-2 px-3">
          <FerixMobileMenu categories={categories} user={user} />
          <Link href="/" className="flex shrink-0 items-center gap-1.5" aria-label="Ferixas home">
            <FerixMark className="h-7 w-7" /><span className="font-display text-[14px] font-extrabold tracking-[0.08em] text-ink">FERIXAS</span>
          </Link>
          <div className="ml-auto flex items-center gap-1">
            <Link href="/search" aria-label="Search" className="grid h-9 w-9 place-items-center text-ink-soft hover:text-ember"><Search width={19} height={19} /></Link>
            <Link href="/cart" aria-label={`Cart, ${cartCount} item${cartCount === 1 ? "" : "s"}`} className="inline-flex h-9 items-center gap-1.5 rounded-[2px] rounded-tr-[9px] bg-ember px-2.5 text-[11px] font-bold text-white">
              <ShoppingBag width={15} height={15} /><span>{cartCount > 99 ? "99+" : cartCount}</span>
            </Link>
          </div>
        </div>
        <form action="/search" className="mx-auto max-w-[1320px] px-3 pb-2.5 sm:px-5">
          <label className="relative block">
            <Search width={15} height={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
            <input type="search" name="q" placeholder="Search products, brands and more" aria-label="Search products, brands and more" className="h-10 w-full rounded-[2px] rounded-tr-[10px] border border-line-warm bg-[#f7f9fb] pl-9 pr-3 text-[12px] text-ink outline-none transition-colors placeholder:text-ink-soft/75 focus:border-ember focus:bg-white" />
          </label>
        </form>
      </div>

      <nav aria-label="Departments" className="hidden border-t border-line-warm bg-[#f8fafc] lg:block">
        <div className="mx-auto flex max-w-[1320px] items-center gap-1 overflow-x-auto px-6 py-2">
          <Link href="/browse" className="shrink-0 rounded-[2px] rounded-tr-[8px] bg-ember px-3 py-2 text-[11px] font-bold text-white">All departments</Link>
          {categories.slice(0, 8).map((category) => (
            <Link key={category.slug} href={`/category/${category.slug}`} className="shrink-0 rounded-[2px] px-3 py-2 text-[11px] font-semibold text-ink-soft transition-colors hover:bg-white hover:text-ember">{category.name}</Link>
          ))}
          <Link href="/collections" className="ml-auto shrink-0 px-3 py-2 text-[11px] font-semibold text-ink-soft transition-colors hover:text-ember">Collections</Link>
        </div>
      </nav>
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
              <span className="font-display text-[15px] font-extrabold tracking-[0.16em] text-white">FERIXAS</span>
            </div>
            <p className="mt-4 max-w-[34ch] text-[13px] leading-relaxed text-white/70">
              Independent sellers, approved listings, one Ferixas marketplace. Seller websites
              remain separate from the profiles shoppers see here.
            </p>
            <div className="mt-5 flex gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-[2px] border border-white/20 text-white/70">
                <Twitter width={14} height={14} />
              </span>
              <span className="grid h-8 w-8 place-items-center rounded-[2px] border border-white/20 text-white/70">
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
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/55">Your shopping</p>
            <ul className="mt-4 space-y-3">
              {[
                { icon: ShoppingBag, title: "One cart", body: "Shop across multiple stores" },
                { icon: User2, title: "Order history", body: "View orders in your account" },
                { icon: Heart, title: "Saved items", body: "Keep favourites for later" },
              ].map((item) => (
                <li key={item.title} className="flex items-start gap-2.5">
                  <item.icon width={15} height={15} className="mt-[2px] shrink-0 text-lime" />
                  <span>
                    <span className="block text-[12.5px] font-medium text-white">{item.title}</span>
                    <span className="block text-[11.5px] text-white/65">{item.body}</span>
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
                  className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/65 transition-colors hover:text-white"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-hairline pt-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/55">
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
                className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/65 transition-colors hover:text-white"
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

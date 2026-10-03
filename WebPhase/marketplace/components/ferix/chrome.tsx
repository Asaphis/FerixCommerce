import Link from "next/link";
import { ShoppingBag, Search, User2, Heart, Store, Truck, RotateCcw, ShieldCheck, Twitter, Instagram } from "lucide-react";
import { FerixMark } from "@/components/ferix/marks";
import { headerState } from "@/lib/data";
import { getCategories } from "@/lib/api";

export async function FerixHeader() {
  const [{ user, cartCount }, categoryFeed] = await Promise.all([
    headerState(),
    getCategories().catch(() => ({ categories: [] })),
  ]);
  const categories = categoryFeed.categories;

  return (
    <header className="sticky top-0 z-40 border-b border-line-warm bg-bone/95 backdrop-blur-md">
      <div className="border-b border-line-warm bg-void">
        <div className="mx-auto flex max-w-[1240px] items-center gap-4 px-4 py-1.5">
          <p className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-chalk-dim">
            Free delivery over $120 · Tracked across seven countries
          </p>
          <Link
            href="/stores"
            className="ml-auto hidden font-mono text-[9.5px] uppercase tracking-[0.16em] text-chalk-dim transition-colors hover:text-lime sm:inline"
          >
            {user ? `Signed in as ${user.name.split(" ")[0]}` : "Sell on Ferixas"}
          </Link>
        </div>
      </div>

      <div className="mx-auto flex max-w-[1240px] items-center gap-3 px-4 py-3">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <FerixMark />
          <span className="hidden font-display text-[15px] font-extrabold tracking-[0.16em] text-ink sm:inline">
            FERIXAS
          </span>
        </Link>

        <form action="/search" className="relative flex min-w-0 flex-1 items-center">
          <Search width={15} height={15} className="pointer-events-none absolute left-3 text-ink-soft" />
          <input
            type="search"
            name="q"
            placeholder="Search products, stores and categories"
            className="h-10 w-full rounded-[2px] border border-line-warm bg-white pl-9 pr-3 text-[13.5px] text-ink outline-none transition-colors placeholder:text-ink-soft/70 focus:border-ink"
          />
        </form>

        <nav className="flex shrink-0 items-center gap-1">
          <Link
            href="/stores"
            className="hidden items-center gap-1.5 rounded-[2px] px-2.5 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft transition-colors hover:bg-bone-soft hover:text-ink lg:inline-flex"
          >
            <Store width={14} height={14} />
            Stores
          </Link>
          <Link
            href={user ? "/account/wishlist" : "/login"}
            className="inline-flex items-center gap-1.5 rounded-[2px] px-2.5 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft transition-colors hover:bg-bone-soft hover:text-ink"
          >
            <Heart width={14} height={14} />
            <span className="hidden sm:inline">Saved</span>
          </Link>
          <Link
            href={user ? "/account" : "/login"}
            className="inline-flex items-center gap-1.5 rounded-[2px] px-2.5 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft transition-colors hover:bg-bone-soft hover:text-ink"
          >
            <User2 width={14} height={14} />
            <span className="hidden sm:inline">{user ? user.avatarInitials : "Sign in"}</span>
          </Link>
          <Link
            href="/cart"
            className="inline-flex items-center gap-2 rounded-[2px] bg-ink px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-bone transition-colors hover:bg-ember"
          >
            <ShoppingBag width={14} height={14} />
            Cart
            <span className="rounded-[2px] bg-lime px-1.5 py-[1px] font-semibold text-void tabular-nums">{cartCount}</span>
          </Link>
        </nav>
      </div>

      <div className="border-t border-line-warm">
        <div className="mx-auto flex max-w-[1240px] items-center gap-1 overflow-x-auto px-4 py-2">
          <Link
            href="/browse"
            className="shrink-0 rounded-[2px] px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink transition-colors hover:bg-bone-soft"
          >
            All departments
          </Link>
          {categories.map((category) => (
            <Link
              key={category.slug}
              href={`/browse?category=${category.slug}`}
              className="shrink-0 rounded-[2px] px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-soft transition-colors hover:bg-bone-soft hover:text-ink"
            >
              {category.name}
            </Link>
          ))}
        </div>
      </div>
    </header>
  );
}

export function FerixFooter() {
  return (
    <footer className="mt-16 border-t border-hairline bg-void">
      <div className="mx-auto max-w-[1240px] px-4 py-12">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
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
              { label: "New arrivals", href: "/browse?sort=new" },
              { label: "Best selling", href: "/browse?sort=best" },
              { label: "Under $100", href: "/browse?collection=under-100" },
            ]}
          />
          <FooterColumn
            title="Your account"
            links={[
              { label: "Sign in", href: "/login" },
              { label: "Create an account", href: "/register" },
              { label: "Orders", href: "/account/orders" },
              { label: "Saved items", href: "/account/wishlist" },
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
          </div>
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-hairline pt-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-chalk-dim">
            © {new Date().getFullYear()} Ferixas Commerce
          </p>
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-chalk-dim">
            Payment and delivery handled once at checkout
          </p>
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

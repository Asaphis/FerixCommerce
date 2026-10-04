import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, LogOut, ShoppingBag } from "lucide-react";
import type { Account } from "@/lib/api";
import { AccountChips, AccountSidebar, type AccountCounts } from "@/components/ferix/account-nav";
import { signOutAction } from "@/lib/actions";

/**
 * One layout for every page in the account area.
 *
 * Desktop gets a sticky 232px sidebar beside the content; mobile gets a compact
 * identity row, the page title and the scrolling section chips. Every account
 * page is therefore responsive by construction rather than by hand.
 */
export function AccountShell({
  account,
  title,
  description,
  actions,
  children,
}: {
  account: Account;
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const { user, stats } = account;
  const counts: AccountCounts = {
    orders: stats.orderCount,
    wishlist: stats.wishlistCount,
    addresses: stats.addressCount,
    reviews: stats.reviewCount,
    following: account.follows.length,
  };

  return (
    <div className="mx-auto max-w-[1240px] px-4 pb-10 pt-4 lg:px-6 lg:pt-8">
      <section className="flex items-center gap-3 pb-3 lg:hidden">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-ink font-display text-[15px] font-extrabold text-lime">
          {user.avatarInitials}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-[16px] font-semibold leading-tight text-ink">{user.name}</p>
          <p className="mt-0.5 truncate font-mono text-[9.5px] uppercase tracking-[0.14em] text-ink-soft">
            {stats.orderCount} orders · {stats.wishlistCount} saved
          </p>
        </div>
        <form action={signOutAction}>
          <button
            type="submit"
            aria-label="Sign out"
            className="grid h-9 w-9 cursor-pointer place-items-center rounded-[2px] border border-line-warm bg-white text-ink-soft transition-colors hover:text-ember"
          >
            <LogOut width={15} height={15} />
          </button>
        </form>
        <Link
          href="/"
          aria-label="Shop marketplace"
          className="grid h-9 w-9 place-items-center rounded-[2px] border border-line-warm bg-white text-ink-soft transition-colors hover:text-ember"
        >
          <ShoppingBag width={15} height={15} />
        </Link>
      </section>

      <div className="lg:hidden">
        <h1 className="font-display text-[19px] font-semibold leading-tight text-ink">{title}</h1>
        {/* Phones get the title only: the chips and the page itself carry the rest. */}
        {description ? (
          <p className="mt-1 hidden text-[12.5px] leading-relaxed text-ink-soft sm:block">{description}</p>
        ) : null}
      </div>

      <AccountChips counts={counts} />

      <div className="lg:grid lg:grid-cols-[232px_1fr] lg:gap-7 lg:pt-0">
        <aside className="hidden lg:block">
          <div className="sticky top-[132px] space-y-2.5">
            <div className="rounded-[3px] border border-line-warm bg-white p-3.5">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[2px] bg-ink font-display text-[13px] font-extrabold text-lime">
                  {user.avatarInitials}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[13.5px] font-semibold text-ink">{user.name}</p>
                  <p className="truncate font-mono text-[9.5px] uppercase tracking-[0.14em] text-ink-soft">
                    {user.email}
                  </p>
                </div>
              </div>
            </div>
            <Link
              href="/"
              className="flex items-center justify-center gap-2 rounded-[3px] border border-line-warm bg-white px-3 py-2.5 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft transition-colors hover:border-ink/30 hover:text-ink"
            >
              <ArrowLeft width={14} height={14} />
              Shop marketplace
            </Link>
            <AccountSidebar counts={counts} />
          </div>
        </aside>

        <div className="min-w-0 pt-4 lg:pt-0">
          <header className="hidden items-end justify-between gap-4 pb-5 lg:flex">
            <div>
              <h1 className="font-display text-[26px] font-semibold leading-none text-ink">{title}</h1>
              {description ? <p className="mt-1.5 max-w-[70ch] text-[12.5px] text-ink-soft">{description}</p> : null}
            </div>
            {actions ? <div className="flex shrink-0 gap-2">{actions}</div> : null}
          </header>
          {children}
        </div>
      </div>
    </div>
  );
}

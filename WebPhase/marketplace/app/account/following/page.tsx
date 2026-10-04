import Link from "next/link";
import { Store } from "lucide-react";
import { requireAccount } from "@/lib/data";
import { listStores } from "@/lib/api";
import { AccountShell } from "@/components/ferix/account-shell";
import { StoreCard } from "@/components/ferix/cards";
import { LinkButton } from "@/components/ferix/marks";

export const metadata = {
  title: "Followed stores — Ferixas",
  description: "The merchant stores you follow, and their newest products.",
};

export default async function FollowingPage() {
  const account = await requireAccount();
  const followed = new Set(account.follows);

  const feed = await listStores().catch(() => ({ stores: [], total: 0 }));
  const stores = feed.stores.filter((store) => followed.has(store.slug));

  return (
    <AccountShell
      account={account}
      title="Followed stores"
      description="Sellers you keep an eye on. Following is free and never hides the rest of the marketplace."
      actions={
        <Link
          href="/stores"
          className="inline-flex items-center gap-2 rounded-[2px] border border-line-warm bg-white px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft transition-colors hover:border-ink/40 hover:text-ink"
        >
          <Store width={13} height={13} /> Browse all stores
        </Link>
      }
    >
      {stores.length ? (
        <>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {stores.map((store) => (
              <StoreCard key={store.id} store={store} />
            ))}
          </div>
          <p className="mt-4 font-mono text-[9.5px] uppercase tracking-[0.14em] text-ink-soft/80">
            {stores.length} of {feed.total} stores on the marketplace
          </p>
        </>
      ) : (
        <div className="rounded-[3px] border border-dashed border-line-warm px-6 py-12 text-center">
          <Store width={20} height={20} className="mx-auto text-ink-soft" />
          <p className="mt-3 font-display text-[15px] font-semibold text-ink">You are not following any store yet</p>
          <p className="mx-auto mt-1.5 max-w-[46ch] text-[13px] leading-relaxed text-ink-soft">
            Follow a seller from their storefront and they will appear here, with their newest products first.
          </p>
          <div className="mt-5 flex justify-center">
            <LinkButton href="/stores">Find stores to follow</LinkButton>
          </div>
        </div>
      )}
    </AccountShell>
  );
}

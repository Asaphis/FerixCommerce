import Link from "next/link";
import { requireAccount } from "@/lib/data";
import { AccountNav } from "@/components/ferix/account-nav";
import { ProductGrid } from "@/components/ferix/cards";
import { Eyebrow, LinkButton } from "@/components/ferix/marks";

export default async function WishlistPage() {
  const account = await requireAccount();
  const saved = account.wishlist.map((product) => product.id);

  return (
    <div className="mx-auto max-w-[1240px] px-4 py-8">
      <Eyebrow>Your account</Eyebrow>
      <h1 className="mt-2 font-display text-[26px] font-semibold text-ink">Saved items</h1>
      <p className="mt-2 max-w-[62ch] text-[13.5px] leading-relaxed text-ink-soft">
        {saved.length} product{saved.length === 1 ? "" : "s"} kept for later. Tap the heart again to take something out,
        or add it straight to your cart.
      </p>

      <div className="mt-6">
        <AccountNav />
      </div>

      <div className="mt-8">
        {account.wishlist.length ? (
          <ProductGrid products={account.wishlist} savedIds={saved} />
        ) : (
          <div className="rounded-[3px] border border-dashed border-line-warm px-6 py-12 text-center">
            <p className="font-display text-[16px] font-semibold text-ink">Nothing saved yet</p>
            <p className="mx-auto mt-2 max-w-[46ch] text-[13.5px] text-ink-soft">
              Tap the heart on any product and it lands here, ready to come back to.
            </p>
            <div className="mt-5 flex justify-center">
              <LinkButton href="/browse">Browse the marketplace</LinkButton>
            </div>
          </div>
        )}
      </div>

      <p className="mt-8 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft/70">
        Saved items stay with your account, so they follow you to another device.{" "}
        <Link href="/cart" className="underline decoration-ember decoration-2 underline-offset-4">
          Go to your cart
        </Link>
      </p>
    </div>
  );
}

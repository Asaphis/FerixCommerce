import Link from "next/link";
import { ArrowRight, ShoppingBag } from "lucide-react";
import { cartState } from "@/lib/data";
import { CartLineRow } from "@/components/ferix/cards";
import { EmptyState, Eyebrow, LinkButton, SectionHead } from "@/components/ferix/marks";
import { money } from "@/lib/format";

export default async function CartPage() {
  const cart = await cartState();

  if (!cart.lines.length) {
    return (
      <div className="mx-auto max-w-[1240px] px-4 py-16">
        <EmptyState
          title="Your cart is empty"
          body="Anything you add from the marketplace or a merchant store lands here, and it stays one order and one checkout."
          action={<LinkButton href="/browse">Start shopping</LinkButton>}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1240px] px-4 py-8">
      <SectionHead
        eyebrow="Cart"
        title={`${cart.count} item${cart.count === 1 ? "" : "s"} from ${cart.merchants.length} seller${cart.merchants.length === 1 ? "" : "s"}`}
      />

      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          {cart.merchants.map((group) => (
            <section key={group.merchant.id} className="rounded-[3px] border border-line-warm bg-white">
              <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line-warm px-4 py-3.5">
                <div className="flex items-center gap-3">
                  <span
                    className="grid h-9 w-9 place-items-center rounded-[2px] font-display text-[14px] font-extrabold"
                    style={{ background: group.merchant.brand.accent, color: group.merchant.brand.accentInk }}
                  >
                    {group.merchant.name.slice(0, 1)}
                  </span>
                  <div>
                    <Link href={`/store/${group.merchant.slug}`} className="font-display text-[14.5px] font-semibold text-ink hover:text-ember">
                      {group.merchant.name}
                    </Link>
                    <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft">
                      Ships from {group.merchant.location}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-mono text-[12.5px] text-ink">{money(group.subtotal)}</p>
                  <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft">
                    {group.freeShipping ? "Free delivery" : `+ ${money(group.shipping)} delivery`}
                  </p>
                </div>
              </header>
              <ul className="divide-y divide-line-warm px-4">
                {group.items.map((line) => (
                  <CartLineRow key={line.key} line={line} />
                ))}
              </ul>
            </section>
          ))}

          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft/70">
            Each seller packs and ships their own items. One payment, one order number.
          </p>
        </div>

        <aside className="lg:sticky lg:top-[132px] lg:self-start">
          <div className="rounded-[3px] border border-line-warm bg-white p-5">
            <Eyebrow>Order summary</Eyebrow>
            <dl className="mt-4 space-y-2.5">
              <Row label={`Subtotal (${cart.distinctItems} lines)`} value={money(cart.subtotal)} />
              <Row label="Delivery" value={cart.shipping === 0 ? "Free" : money(cart.shipping)} />
              <Row label="Tax (7.5%)" value={money(cart.tax)} />
              <div className="border-t border-line-warm pt-3">
                <Row label="Total" value={money(cart.total)} strong />
              </div>
            </dl>

            {cart.subtotal < cart.freeShippingOver ? (
              <p className="mt-4 rounded-[2px] border border-line-warm bg-bone-soft px-3 py-2.5 text-[12px] text-ink-soft">
                Another {money(cart.freeShippingOver - cart.subtotal)} and delivery is free.
              </p>
            ) : null}

            <LinkButton href="/checkout" className="mt-5 w-full">
              Checkout · {money(cart.total)}
              <ArrowRight width={15} height={15} />
            </LinkButton>
            <Link
              href="/browse"
              className="mt-3 block text-center font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft transition-colors hover:text-ember"
            >
              Continue shopping
            </Link>
          </div>

          <p className="mt-3 flex items-center justify-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft">
            <ShoppingBag width={12} height={12} /> One checkout across every seller
          </p>
        </aside>
      </div>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className={strong ? "font-display text-[14.5px] font-semibold text-ink" : "text-[13px] text-ink-soft"}>{label}</dt>
      <dd className={strong ? "font-mono text-[15px] font-semibold text-ink" : "font-mono text-[13px] text-ink"}>{value}</dd>
    </div>
  );
}

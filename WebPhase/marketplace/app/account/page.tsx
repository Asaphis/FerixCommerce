import Link from "next/link";
import { ArrowRight, LogOut, Package, ShoppingBag, Star, Wallet } from "lucide-react";
import { requireAccount } from "@/lib/data";
import { signOutAction } from "@/lib/actions";
import { AccountNav } from "@/components/ferix/account-nav";
import { ProductRail } from "@/components/ferix/cards";
import { Eyebrow, LinkButton, Pill, SectionHead } from "@/components/ferix/marks";
import { compact, dateLong, money, relative } from "@/lib/format";

export default async function AccountPage() {
  const account = await requireAccount();
  const { user, orders, wishlist, addresses, stats, activeOrders } = account;

  return (
    <div className="mx-auto max-w-[1240px] px-4 py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="grid h-14 w-14 place-items-center rounded-[3px] bg-ink font-display text-[19px] font-extrabold text-lime">
            {user.avatarInitials}
          </span>
          <div>
            <Eyebrow>Your account</Eyebrow>
            <h1 className="mt-1 font-display text-[25px] font-semibold text-ink">{user.name}</h1>
            <p className="mt-0.5 font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-soft">
              {user.email} · customer since {dateLong(stats.since)}
            </p>
          </div>
        </div>
        <form action={signOutAction}>
          <button
            type="submit"
            className="inline-flex cursor-pointer items-center gap-2 rounded-[2px] border border-line-warm bg-white px-3.5 py-2.5 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft transition-colors hover:border-ember/40 hover:text-ember"
          >
            <LogOut width={13} height={13} /> Sign out
          </button>
        </form>
      </div>

      <div className="mt-6">
        <AccountNav />
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { Icon: Package, label: "Orders", value: String(stats.orderCount), sub: `${activeOrders} still in progress` },
          { Icon: Wallet, label: "Lifetime spend", value: money(stats.spent, { cents: false }), sub: `Average ${money(stats.averageOrder, { cents: false })}` },
          { Icon: ShoppingBag, label: "Saved items", value: String(stats.wishlistCount), sub: "Kept for later" },
          { Icon: Star, label: "Reviews written", value: String(stats.reviewCount), sub: "Editable any time" },
        ].map((tile) => (
          <div key={tile.label} className="rounded-[3px] border border-line-warm bg-white p-4">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft">{tile.label}</span>
              <tile.Icon width={16} height={16} className="text-ember" />
            </div>
            <p className="mt-3 font-mono text-[23px] font-semibold leading-none text-ink">{tile.value}</p>
            <p className="mt-1.5 text-[12px] text-ink-soft">{tile.sub}</p>
          </div>
        ))}
      </div>

      <section className="mt-10">
        <SectionHead
          eyebrow="Recent orders"
          title="Your latest purchases"
          action={
            <Link href="/account/orders" className="group inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft transition-colors hover:text-ember">
              All orders
              <ArrowRight width={14} height={14} className="transition-transform group-hover:translate-x-0.5" />
            </Link>
          }
        />
        {orders.length ? (
          <ul className="divide-y divide-line-warm overflow-hidden rounded-[3px] border border-line-warm bg-white">
            {orders.map((order) => (
              <li key={order.id} className="flex flex-wrap items-center gap-4 p-4">
                <div className="min-w-[130px]">
                  <p className="font-mono text-[12.5px] font-semibold text-ink">{order.number}</p>
                  <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft">{relative(order.placedAt)}</p>
                </div>
                <p className="min-w-0 flex-1 truncate text-[13px] text-ink-soft">
                  {order.items.map((item) => item.title).join(", ")}
                </p>
                <Pill tone={order.fulfillment === "delivered" ? "success" : "warn"}>{order.fulfillment}</Pill>
                <p className="font-mono text-[13px] font-semibold text-ink">{money(order.total)}</p>
                <Link
                  href={`/order/${order.id}`}
                  className="font-mono text-[10px] uppercase tracking-[0.14em] text-ember underline decoration-2 underline-offset-4"
                >
                  View
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-[3px] border border-dashed border-line-warm px-6 py-9 text-center text-[13.5px] text-ink-soft">
            No orders yet. Anything you buy lands here with tracking.{" "}
            <Link href="/browse" className="text-ink underline decoration-ember decoration-2 underline-offset-4">
              Start shopping
            </Link>
          </p>
        )}
      </section>

      <section className="mt-10">
        <SectionHead
          eyebrow="Saved items"
          title={`${stats.wishlistCount} kept for later`}
          action={
            <Link href="/account/wishlist" className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft transition-colors hover:text-ember">
              Manage
            </Link>
          }
        />
        {wishlist.length ? (
          <ProductRail products={wishlist} savedIds={wishlist.map((product) => product.id)} />
        ) : (
          <p className="rounded-[3px] border border-dashed border-line-warm px-6 py-9 text-center text-[13.5px] text-ink-soft">
            Nothing saved yet — tap the heart on any product to keep it here.
          </p>
        )}
      </section>

      <section className="mt-10">
        <SectionHead
          eyebrow="Delivery addresses"
          title={`${addresses.length} address${addresses.length === 1 ? "" : "es"} on file`}
          action={
            <Link href="/account/addresses" className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft transition-colors hover:text-ember">
              Manage
            </Link>
          }
        />
        {addresses.length ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {addresses.map((address) => (
              <div key={address.id} className="rounded-[3px] border border-line-warm bg-white p-4">
                <div className="flex items-center gap-2">
                  <Eyebrow>{address.label}</Eyebrow>
                  {address.isDefault ? <Pill tone="success">Default</Pill> : null}
                </div>
                <p className="mt-2 text-[13.5px] font-medium text-ink">{address.name}</p>
                <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink-soft">
                  {address.line1}, {address.city}, {address.region} {address.postcode}, {address.country}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="rounded-[3px] border border-dashed border-line-warm px-6 py-9 text-center text-[13.5px] text-ink-soft">
            No addresses saved.{" "}
            <Link href="/account/addresses" className="text-ink underline decoration-ember decoration-2 underline-offset-4">
              Add one
            </Link>
          </p>
        )}
      </section>

      <p className="mt-10 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft/70">
        {compact(stats.spent)} spent across {stats.orderCount} orders · one checkout on every store
      </p>
    </div>
  );
}

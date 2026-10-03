import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Bookmark, Mail, MapPin, Phone, Star } from "lucide-react";
import { requireAdmin } from "@/lib/data";
import { getUser, ApiError } from "@/lib/api";
import { Empty, Eyebrow, Panel, PanelHead, Pill, Readout } from "@/components/ops/bits";
import { KeyValue } from "@/components/ops/marks";
import { money, num, relative } from "@/lib/format";

export default async function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { session } = await requireAdmin();
  let detail;
  try {
    detail = await getUser(session, id);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }
  const { user, orders, addresses, reviews, wishlist, follows, stats } = detail;

  return (
    <div className="grid gap-5">
      <div>
        <Link
          href="/users"
          className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-chalk-dim transition-colors hover:text-chalk"
        >
          <ArrowLeft width={12} height={12} /> All accounts
        </Link>
      </div>

      <header className="flex flex-wrap items-center gap-4">
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-[3px] border border-hairline bg-panel-2 font-display text-[19px] font-extrabold text-signal">
          {user.initials}
        </span>
        <div>
          <Eyebrow>Customer account</Eyebrow>
          <h1 className="mt-1 font-display text-[23px] font-semibold text-chalk">{user.name}</h1>
          <p className="mt-1 font-mono text-[10.5px] uppercase tracking-[0.14em] text-chalk-dim">
            Registered{" "}
            {new Date(user.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        <div className="ml-auto flex flex-wrap gap-1.5">
          <Pill tone={stats.spent >= 600 ? "violet" : stats.orders > 1 ? "signal" : "neutral"}>
            {stats.spent >= 600 ? "VIP" : stats.orders > 1 ? "returning" : "new"}
          </Pill>
          <Pill tone="mint">Buyer account</Pill>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Readout label="Orders" value={num(stats.orders)} sub={`Average ${money(stats.averageOrder, { cents: false })}`} />
        <Readout label="Total spent" value={money(stats.spent, { cents: false })} sub="Paid orders only" tone="mint" />
        <Readout label="Saved items" value={num(stats.saved)} sub={`Following ${stats.follows} stores`} icon={<Bookmark width={15} height={15} />} tone="violet" />
        <Readout label="Reviews written" value={num(stats.reviews)} sub={`${stats.addresses} delivery address(es)`} icon={<Star width={15} height={15} />} tone="signal" />
      </div>

      <div className="grid gap-3 lg:grid-cols-[1.4fr_1fr]">
        <Panel flush>
          <div className="p-5 pb-3">
            <PanelHead title="Order history" hint="Every order across every merchant" />
          </div>
          {orders.length ? (
            <div className="overflow-x-auto px-5 pb-5">
              <table className="w-full min-w-[620px] border-collapse text-left">
                <thead>
                  <tr>
                    {["Order", "Items", "Placed", "Status", "Total"].map((head) => (
                      <th key={head} className="border-b border-hairline pb-2.5 font-mono text-[10px] font-normal uppercase tracking-[0.14em] text-chalk-dim">
                        {head}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id} className="border-b border-hairline/60 last:border-0">
                      <td className="py-3 pr-4 font-mono text-[12px] text-chalk">{order.number}</td>
                      <td className="py-3 pr-4 text-[12.5px] text-chalk-dim">
                        {order.items.map((item) => item.title).join(", ")}
                      </td>
                      <td className="py-3 pr-4 font-mono text-[11.5px] text-chalk-dim">{relative(order.placedAt)}</td>
                      <td className="py-3 pr-4">
                        <Pill
                          tone={
                            order.fulfillment === "delivered"
                              ? "mint"
                              : order.fulfillment === "shipped"
                                ? "signal"
                                : order.fulfillment === "cancelled"
                                  ? "rose"
                                  : "amber"
                          }
                        >
                          {order.fulfillment}
                        </Pill>
                      </td>
                      <td className="py-3 font-mono text-[12.5px] tabular-nums text-chalk">{money(order.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-5 pb-5">
              <Empty title="No orders" body="This account has not bought anything yet." />
            </div>
          )}
        </Panel>

        <div className="grid gap-3">
          <Panel>
            <PanelHead title="Contact" />
            <ul className="grid gap-2.5 text-[12.5px] text-chalk-dim">
              <li className="flex items-center gap-2">
                <Mail width={13} height={13} /> {user.email}
              </li>
              <li className="flex items-center gap-2">
                <Phone width={13} height={13} /> {user.phone || "No phone on file"}
              </li>
              <li className="flex items-start gap-2">
                <MapPin width={13} height={13} className="mt-[3px]" />
                {addresses[0] ? `${addresses[0].line1}, ${addresses[0].city}, ${addresses[0].country}` : "No address on file"}
              </li>
            </ul>
          </Panel>

          <Panel>
            <PanelHead title="Saved items" hint={`${stats.saved} kept for later`} />
            {wishlist.length ? (
              <ul className="space-y-2.5">
                {wishlist.slice(0, 6).map((item) => (
                  <li key={item.id} className="flex items-center justify-between gap-3">
                    <span className="truncate text-[12.5px] text-chalk">{item.title}</span>
                    <span className="font-mono text-[12px] text-chalk-dim">{money(item.price)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[12.5px] text-chalk-dim">Nothing saved yet.</p>
            )}
          </Panel>

          <Panel>
            <PanelHead title="Reviews" hint={`${stats.reviews} written`} />
            {reviews.length ? (
              <ul className="space-y-3">
                {reviews.map((review) => (
                  <li key={review.id} className="rounded-[2px] border border-hairline p-3">
                    <p className="flex items-center gap-2 text-[12.5px] font-medium text-chalk">
                      {review.rating}★ {review.title}
                    </p>
                    <p className="mt-1 text-[12px] leading-relaxed text-chalk-dim">{review.body}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[12.5px] text-chalk-dim">No reviews written.</p>
            )}
          </Panel>
        </div>
      </div>

      <Panel>
        <PanelHead title="Account state" hint="Straight from the backend, not a copy" />
        <ul className="grid gap-2.5 text-[12.5px] sm:grid-cols-3">
          <KeyValue label="Addresses" value={stats.addresses} />
          <KeyValue label="Followed stores" value={follows.length} />
          <KeyValue label="Password" value="salted hash" />
        </ul>
        <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.14em] text-chalk-dim/70">
          Session tokens are never visible to the console
        </p>
      </Panel>
    </div>
  );
}

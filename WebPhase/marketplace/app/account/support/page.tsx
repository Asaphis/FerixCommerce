import Link from "next/link";
import { ArrowRight, HelpCircle, Mail, MessageSquare, Package, RotateCcw, Truck } from "lucide-react";
import { requireAccount } from "@/lib/data";
import { AccountShell } from "@/components/ferix/account-shell";
import { dateShort } from "@/lib/format";
import { byNewest, itemsSummary, statusLabel } from "@/lib/orders";

export const metadata = {
  title: "Support — Ferixas",
  description: "Get help with an order, a delivery or a return.",
};

const TOPICS = [
  {
    href: "/help",
    Icon: HelpCircle,
    title: "Help centre",
    body: "Answers for orders, payment, delivery and returns",
  },
  {
    href: "/track-order",
    Icon: Truck,
    title: "Where is my order?",
    body: "Follow a parcel with its tracking number",
  },
  {
    href: "/returns",
    Icon: RotateCcw,
    title: "Return or exchange",
    body: "30 days, free on orders over $120",
  },
  {
    href: "/contact",
    Icon: MessageSquare,
    title: "Message support",
    body: "A person replies, usually within a few hours",
  },
];

export default async function SupportPage() {
  const account = await requireAccount();
  const recent = byNewest(account.orders).slice(0, 3);

  return (
    <AccountShell
      account={account}
      title="Support"
      description="Start with the order you need help with — we can see it with you."
    >
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.3fr_1fr]">
        <div className="space-y-4">
          <section className="rounded-[3px] border border-line-warm bg-white p-4 lg:p-5">
            <h2 className="font-display text-[15px] font-semibold text-ink">Help with an order</h2>
            <p className="mt-1 text-[12.5px] text-ink-soft">
              Pick the order you are asking about and we will open it with the right context.
            </p>
            {recent.length ? (
              <ul className="mt-3 divide-y divide-line-warm">
                {recent.map((order) => (
                  <li key={order.id} className="flex items-center gap-3 py-3">
                    <Package width={15} height={15} className="shrink-0 text-ink-soft" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-mono text-[12px] font-semibold text-ink">
                        {order.number}
                      </span>
                      <span className="block truncate font-mono text-[9.5px] uppercase tracking-[0.12em] text-ink-soft">
                        {itemsSummary(order)} · {statusLabel(order.fulfillment)} · {dateShort(order.placedAt)}
                      </span>
                    </span>
                    <Link
                      href={`/account/orders/${order.id}`}
                      className="shrink-0 font-mono text-[10px] uppercase tracking-[0.14em] text-ember"
                    >
                      Open
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 rounded-[2px] border border-dashed border-line-warm px-4 py-6 text-center text-[12.5px] text-ink-soft">
                No orders on this account yet.
              </p>
            )}
          </section>

          <section className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {TOPICS.map((topic) => (
              <Link
                key={topic.href}
                href={topic.href}
                className="group flex items-start gap-3 rounded-[3px] border border-line-warm bg-white p-3.5 transition-colors hover:border-ink/25"
              >
                <topic.Icon width={16} height={16} className="mt-0.5 shrink-0 text-ember" />
                <span className="min-w-0 flex-1">
                  <span className="block text-[13.5px] font-semibold text-ink">{topic.title}</span>
                  <span className="mt-0.5 block text-[12px] leading-relaxed text-ink-soft">{topic.body}</span>
                </span>
                <ArrowRight
                  width={14}
                  height={14}
                  className="mt-1 shrink-0 text-ink-soft transition-transform group-hover:translate-x-0.5"
                />
              </Link>
            ))}
          </section>
        </div>

        <div className="space-y-4">
          <section className="rounded-[3px] border border-line-warm bg-white p-4 lg:p-5">
            <h2 className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-ink-soft">Who answers</h2>
            <p className="mt-2 text-[12.5px] leading-relaxed text-ink-soft">
              Delivery and item questions go to the seller who packed your parcel, because they hold the tracking. Ferixas
              steps in for payment problems, refunds and anything that looks like a scam.
            </p>
            <p className="mt-3 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ink">
              <Mail width={13} height={13} className="text-ember" /> support@ferixas.com
            </p>
          </section>

          <section className="rounded-[3px] border border-line-warm bg-bone-soft/60 p-4 lg:p-5">
            <h2 className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-ink-soft">Before you write</h2>
            <ul className="mt-3 space-y-2 text-[12.5px] leading-relaxed text-ink-soft">
              <li>· Have your order number ready — it starts with FX</li>
              <li>· One order can arrive as several parcels from different sellers</li>
              <li>· Tracking updates take a few hours after dispatch</li>
            </ul>
          </section>
        </div>
      </div>
    </AccountShell>
  );
}

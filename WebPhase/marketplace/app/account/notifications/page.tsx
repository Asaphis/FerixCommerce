import Link from "next/link";
import { Bell, Settings2 } from "lucide-react";
import { requireAccount } from "@/lib/data";
import { AccountShell } from "@/components/ferix/account-shell";
import { NotificationList, type FeedItem } from "@/components/ferix/notification-list";
import { dateShort, money } from "@/lib/format";
import { itemsSummary } from "@/lib/orders";

export const metadata = {
  title: "Notifications — Ferixas",
  description: "Order, payment and delivery updates for your account.",
};

type Dated = FeedItem & { iso: string };

export default async function NotificationsPage() {
  const account = await requireAccount();
  const { orders, reviews, stats } = account;

  // Every entry below is a real event on this account: an order scan from the
  // seller's tracking timeline, a published review, or the account's own start.
  const dated: Dated[] = [];

  for (const order of orders) {
    for (const step of order.timeline ?? []) {
      if (!step.at) continue;
      const kind: FeedItem["kind"] = /transit|deliver|dispatch/i.test(step.label)
        ? "delivery"
        : /payment/i.test(step.label)
          ? "payment"
          : "order";
      dated.push({
        id: `${order.id}-${step.label}`,
        kind,
        title: `${step.label} · ${order.number}`,
        body: `${itemsSummary(order)} · ${money(order.total)}`,
        at: dateShort(step.at),
        iso: step.at,
        href: `/account/orders/${order.id}`,
      });
    }
  }

  for (const review of reviews) {
    dated.push({
      id: `review-${review.id}`,
      kind: "account",
      title: "Your review is live",
      body: review.product ? `${review.title} — ${review.product.title}` : review.title,
      at: dateShort(review.date),
      iso: review.date,
      href: "/account/reviews",
    });
  }

  dated.push({
    id: "account-created",
    kind: "account",
    title: "Welcome to Ferixas",
    body: `Your account was created. ${stats.orderCount} order${stats.orderCount === 1 ? "" : "s"} since.`,
    at: dateShort(stats.since),
    iso: stats.since,
    href: "/account",
  });

  const feed: FeedItem[] = dated
    .sort((a, b) => new Date(b.iso).getTime() - new Date(a.iso).getTime())
    .map(({ iso: _iso, ...item }) => item);

  return (
    <AccountShell
      account={account}
      title="Notifications"
      description="What has happened on your account, newest first."
      actions={
        <Link
          href="/account/preferences"
          className="inline-flex items-center gap-2 rounded-[2px] border border-line-warm bg-white px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft transition-colors hover:border-ink/40 hover:text-ink"
        >
          <Settings2 width={13} height={13} /> Choose what I receive
        </Link>
      }
    >
      <NotificationList items={feed} />

      <section className="mt-4 flex items-start gap-3 rounded-[3px] border border-line-warm bg-bone-soft/60 p-3.5">
        <Bell width={15} height={15} className="mt-0.5 shrink-0 text-ember" />
        <p className="text-[12.5px] leading-relaxed text-ink-soft">
          Order and delivery updates are always sent — they are how you know a parcel is moving. Offers and new-arrival
          alerts are optional and live in{" "}
          <Link href="/account/preferences" className="text-ink underline decoration-ember decoration-2 underline-offset-4">
            preferences
          </Link>
          .
        </p>
      </section>
    </AccountShell>
  );
}

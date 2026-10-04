"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Bell, CheckCheck, Package, Sparkles, Truck, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The notification feed.
 *
 * The marketplace API has no notification service yet, so the feed is built from
 * real order events on the account. Read state is kept in this browser, which is
 * honest about what it is: nothing here is invented, and nothing pretends to be
 * synced across devices.
 */

export type FeedItem = {
  id: string;
  kind: "order" | "payment" | "delivery" | "account";
  title: string;
  body: string;
  at: string;
  href: string;
};

const ICONS = {
  order: Package,
  payment: Wallet,
  delivery: Truck,
  account: Sparkles,
} as const;

const STORE_KEY = "ferixas:notifications:read";

export function NotificationList({ items }: { items: FeedItem[] }) {
  const [read, setRead] = useState<string[]>([]);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORE_KEY);
      if (stored) setRead(JSON.parse(stored) as string[]);
    } catch {
      // A blocked storage API must never break the page.
    }
    setHydrated(true);
  }, []);

  const persist = (next: string[]) => {
    setRead(next);
    try {
      window.localStorage.setItem(STORE_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  const unread = useMemo(() => items.filter((item) => !read.includes(item.id)), [items, read]);
  const visible = filter === "all" ? items : unread;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1.5">
          {(["all", "unread"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              className={cn(
                "cursor-pointer rounded-[2px] border px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] transition-colors",
                filter === value
                  ? "border-ink bg-ink text-bone"
                  : "border-line-warm bg-white text-ink-soft hover:border-ink/30 hover:text-ink",
              )}
            >
              {value === "all" ? "All" : "Unread"}
              <span className="ml-2 opacity-70">{value === "all" ? items.length : unread.length}</span>
            </button>
          ))}
        </div>
        {unread.length ? (
          <button
            type="button"
            onClick={() => persist(items.map((item) => item.id))}
            className="ml-auto inline-flex cursor-pointer items-center gap-2 rounded-[2px] px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft transition-colors hover:text-ember"
          >
            <CheckCheck width={13} height={13} /> Mark all read
          </button>
        ) : null}
      </div>

      {visible.length ? (
        <ul className="mt-3 divide-y divide-line-warm overflow-hidden rounded-[3px] border border-line-warm bg-white">
          {visible.map((item) => {
            const Icon = ICONS[item.kind];
            const isUnread = !read.includes(item.id);
            return (
              <li key={item.id} className={cn("transition-colors", isUnread && "bg-ember/[0.04]")}>
                <Link
                  href={item.href}
                  onClick={() => persist(Array.from(new Set([...read, item.id])))}
                  className="flex items-start gap-3 p-3.5 lg:px-5"
                >
                  <span
                    className={cn(
                      "mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-[2px]",
                      isUnread ? "bg-ink text-lime" : "bg-bone-soft text-ink-soft",
                    )}
                  >
                    <Icon width={15} height={15} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className={cn("text-[13.5px]", isUnread ? "font-semibold text-ink" : "font-medium text-ink")}>
                        {item.title}
                      </span>
                      {isUnread ? <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-ember" /> : null}
                    </span>
                    <span className="mt-0.5 block text-[12.5px] leading-relaxed text-ink-soft">{item.body}</span>
                    <span className="mt-1 block font-mono text-[9.5px] uppercase tracking-[0.12em] text-ink-soft/80">
                      {item.at}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="mt-3 rounded-[3px] border border-dashed border-line-warm px-6 py-12 text-center">
          <Bell width={20} height={20} className="mx-auto text-ink-soft" />
          <p className="mt-3 font-display text-[15px] font-semibold text-ink">
            {hydrated ? "You are all caught up" : "Loading your notifications"}
          </p>
          <p className="mx-auto mt-1.5 max-w-[44ch] text-[12.5px] text-ink-soft">
            Order and delivery updates land here the moment something changes.
          </p>
        </div>
      )}

      <p className="mt-3 font-mono text-[9.5px] uppercase tracking-[0.12em] text-ink-soft/80">
        Read state is kept in this browser only
      </p>
    </div>
  );
}

"use client";

import { useState } from "react";
import { UserPlus } from "lucide-react";
import { LinkButton } from "@/components/ferix/marks";
import { compact } from "@/lib/format";
import { toggleFollowAction } from "@/lib/actions";

type StoreSummary = { slug: string; domain?: string; customDomain?: string | null };

export function StoreHeader({
  store,
  followers,
  initialFollowing,
}: {
  store: StoreSummary;
  followers: number;
  initialFollowing: boolean;
}) {
  const [following, setFollowing] = useState(initialFollowing);
  const [count, setCount] = useState(followers);
  const [loading, setLoading] = useState(false);

  async function submit(formData: FormData) {
    setLoading(true);
    const next = !following;
    setFollowing(next);
    setCount((current) => Math.max(0, current + (next ? 1 : -1)));
    await toggleFollowAction(formData);
    setLoading(false);
  }

  return (
    <div className="flex w-full flex-col items-start gap-3 sm:w-auto sm:items-end">
      <form action={submit}>
        <input type="hidden" name="slug" value={store.slug} />
        <input type="hidden" name="follow" value={String(!following)} />
        <button
          type="submit"
          disabled={loading}
          className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-medium transition-colors ${
            following
              ? "border border-ink bg-ink text-bone hover:border-ink hover:text-bone"
              : "border border-line-warm bg-white text-ink transition-colors hover:border-ember hover:text-ember"
          } ${loading ? "cursor-wait opacity-60" : ""}`}
        >
          <UserPlus width={14} height={14} />
          {following ? "Following" : `Follow (${compact(count)})`}
        </button>
      </form>
      <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-soft">
        {store.customDomain ?? store.domain}
      </p>
      <LinkButton href={`/browse?store=${store.slug}`} variant="outline">
        Shop on the marketplace
      </LinkButton>
    </div>
  );
}

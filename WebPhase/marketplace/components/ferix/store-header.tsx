"use client";

import { useState } from "react";
import { ExternalLink, UserPlus } from "lucide-react";
import { LinkButton } from "@/components/ferix/marks";
import { compact } from "@/lib/format";
import { toggleFollowAction } from "@/lib/actions";

type StoreSummary = { slug: string; website?: string };

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
      {store.website ? <a href={store.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-[0.12em] text-ember hover:underline"><ExternalLink width={12} height={12} /> Visit seller website</a> : <p className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-ink-soft">Seller website not provided</p>}
      <LinkButton href={`/browse?store=${store.slug}`} variant="outline">
        Shop on the marketplace
      </LinkButton>
    </div>
  );
}

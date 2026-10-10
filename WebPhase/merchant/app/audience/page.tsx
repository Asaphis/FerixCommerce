import { MessageSquareText, Star, UserMinus, UserPlus, Users } from "lucide-react";
import { Empty, Eyebrow, Panel, PanelHead, Pill, StatTile } from "@/components/studio/bits";
import { requireMerchant } from "@/lib/data";
import { getFollowerActivity, getSellerReviews } from "@/lib/api";
import { dateLong, num } from "@/lib/format";

function dateLabel(value: string) {
  return value ? dateLong(value) : "Date unavailable";
}

export default async function AudiencePage() {
  const { session } = await requireMerchant();
  const [audience, reviews] = await Promise.all([
    getFollowerActivity(session),
    getSellerReviews(session),
  ]);
  const chart = audience.series.slice(-30);
  const chartMax = Math.max(1, ...chart.flatMap((day) => [day.follows, day.unfollows]));
  const rating = reviews.summary.rating;

  return (
    <div className="grid min-w-0 gap-5">
      <header>
        <Eyebrow>Business · Audience</Eyebrow>
        <h1 className="mt-1.5 font-display text-[23px] font-semibold text-chalk">Followers and reviews</h1>
        <p className="mt-1 max-w-3xl text-[12.5px] leading-relaxed text-chalk-dim">
          Real Ferixas account follows and reviews for your products. Shopper identities and private account details are never shown here.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3">
        <StatTile label="Current followers" value={num(audience.followers)} sub="Actual shopper follows" icon={<Users />} accent="azure" />
        <StatTile label="New follows · 30d" value={num(audience.follows30d)} sub="Recorded account actions" icon={<UserPlus />} accent="lime" />
        <StatTile label="Unfollows · 30d" value={num(audience.unfollows30d)} sub="Recorded account actions" icon={<UserMinus />} accent="sand" />
        <StatTile label="Net growth · 30d" value={`${audience.net30d > 0 ? "+" : ""}${num(audience.net30d)}`} sub="Follows minus unfollows" icon={<Users />} accent={audience.net30d < 0 ? "ember" : "azure"} />
      </div>

      <div className="grid min-w-0 gap-3 xl:grid-cols-[1.4fr_1fr]">
        <Panel>
          <PanelHead title="Follower activity" hint="Daily follow and unfollow events · last 30 days" action={<Pill tone="info">90-day history</Pill>} />
          {audience.trackingStartedAt ? (
            <p className="mb-3 rounded-[8px] border border-hairline bg-panel-2 p-3 text-[11px] leading-relaxed text-chalk-dim">
              Activity history has been recorded since {dateLabel(audience.trackingStartedAt)}. Existing followers are included in the current total; earlier changes are not reconstructed.
            </p>
          ) : (
            <p className="mb-3 rounded-[8px] border border-hairline bg-panel-2 p-3 text-[11px] leading-relaxed text-chalk-dim">
              Existing followers are included in the current total. Anonymous activity history begins when new follow or unfollow actions arrive; no earlier dates are invented.
            </p>
          )}
          <div className="flex h-32 items-end gap-1 rounded-[8px] border border-hairline bg-panel-2 px-2 pb-2 pt-3" role="img" aria-label="Daily follower follows and unfollows over the last 30 days">
            {chart.map((day) => {
              const followHeight = day.follows ? Math.max(4, Math.round((day.follows / chartMax) * 100)) : 0;
              const unfollowHeight = day.unfollows ? Math.max(4, Math.round((day.unfollows / chartMax) * 100)) : 0;
              return (
                <div key={day.date} title={`${day.date}: ${day.follows} follows, ${day.unfollows} unfollows`} className="flex h-full min-w-0 flex-1 items-end justify-center gap-[2px]">
                  <span className="w-1/2 rounded-t-[2px] bg-lime" style={{ height: `${followHeight}%` }} />
                  <span className="w-1/2 rounded-t-[2px] bg-ember" style={{ height: `${unfollowHeight}%` }} />
                </div>
              );
            })}
          </div>
          <div className="mt-2 flex items-center gap-4 font-mono text-[9px] uppercase tracking-[0.12em] text-chalk-dim">
            <span className="inline-flex items-center gap-1.5"><i className="h-2 w-2 rounded-[2px] bg-lime" />Follows</span>
            <span className="inline-flex items-center gap-1.5"><i className="h-2 w-2 rounded-[2px] bg-ember" />Unfollows</span>
            <span className="ml-auto">{chart[0]?.date ?? ""} – {chart[chart.length - 1]?.date ?? ""}</span>
          </div>
          <div className="mt-5">
            <PanelHead title="Recent activity" hint="Anonymous events only; no shopper names or IDs." />
            {audience.recent.length ? <ul className="grid gap-2">
              {audience.recent.map((event, index) => (
                <li key={`${event.at}-${event.action}-${index}`} className="flex items-center justify-between gap-3 rounded-[8px] border border-hairline bg-panel-2 px-3 py-2.5">
                  <span className="text-[12px] text-chalk">{event.action === "follow" ? "A shopper followed your profile" : "A shopper unfollowed your profile"}</span>
                  <span className="shrink-0 font-mono text-[10px] text-chalk-dim">{event.at ? dateLabel(event.at) : "Date unavailable"}</span>
                </li>
              ))}
            </ul> : <Empty title="No new follower activity yet" body="New follow and unfollow actions will appear here without revealing who the shopper is." />}
          </div>
        </Panel>

        <Panel>
          <PanelHead title="Product reviews" hint="Persisted reviews for products in your catalogue." action={<Pill tone={reviews.summary.reviewCount ? "success" : "neutral"}>{num(reviews.summary.reviewCount)} reviews</Pill>} />
          <div className="mb-4 grid grid-cols-[auto_1fr] items-center gap-3 rounded-[8px] border border-hairline bg-panel-2 p-3">
            <div className="flex items-center gap-1.5"><Star width={19} height={19} className="fill-amber text-amber" /><span className="font-display text-[22px] font-bold text-chalk">{rating == null ? "—" : rating.toFixed(1)}</span></div>
            <p className="text-[11px] leading-relaxed text-chalk-dim">{reviews.summary.reviewCount ? "Average rating from recorded marketplace reviews." : "No marketplace reviews have been recorded yet. Seed display counters are not used."}</p>
          </div>
          <div className="mb-4 grid gap-1.5">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = reviews.summary.ratingBreakdown[String(star)] ?? 0;
              const width = reviews.summary.reviewCount ? `${Math.round((count / reviews.summary.reviewCount) * 100)}%` : "0%";
              return <div key={star} className="grid grid-cols-[24px_1fr_28px] items-center gap-2 text-[10px] text-chalk-dim">
                <span>{star} star</span><span className="h-1.5 overflow-hidden rounded-full bg-panel-2"><span className="block h-full rounded-full bg-amber" style={{ width }} /></span><span className="text-right tabular-nums">{count}</span>
              </div>;
            })}
          </div>
          {reviews.items.length ? <ul className="grid gap-2">
            {reviews.items.map((review) => (
              <li key={review.id} className="rounded-[8px] border border-hairline bg-panel-2 p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0"><p className="truncate text-[12px] font-semibold text-chalk">{review.productTitle}</p><p className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.1em] text-chalk-dim">Marketplace review · {review.createdAt ? dateLabel(review.createdAt) : "date unavailable"}</p></div>
                  <span className="inline-flex shrink-0 items-center gap-1 font-mono text-[11px] text-amber"><Star width={12} height={12} className="fill-amber" />{review.rating}/5</span>
                </div>
                {review.title ? <p className="mt-2 text-[12px] font-medium text-chalk">{review.title}</p> : null}
                {review.body ? <p className="mt-1 whitespace-pre-wrap break-words text-[11.5px] leading-relaxed text-chalk-dim">{review.body}</p> : null}
                {review.verifiedPurchase ? <span className="mt-2 inline-flex items-center gap-1 text-[9px] text-mint"><MessageSquareText width={11} height={11} />Verified purchase</span> : null}
              </li>
            ))}
          </ul> : <Empty title="No product reviews yet" body="Genuine marketplace reviews will appear here when shoppers leave them." />}
          {reviews.summary.reviewCount > reviews.items.length ? <p className="mt-3 text-center font-mono text-[9px] uppercase tracking-[0.1em] text-chalk-dim">Showing the latest {reviews.items.length} reviews</p> : null}
        </Panel>
      </div>
    </div>
  );
}

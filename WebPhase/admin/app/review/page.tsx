import Link from "next/link";
import { ArrowLeft, Check, ExternalLink, RotateCcw, X } from "lucide-react";
import { requireAdmin } from "@/lib/data";
import { ApiError, assetUrl, listMerchantProfileRequests, listReviewQueue } from "@/lib/api";
import { CmsActionForm } from "@/components/ops/cms-action-form";
import { Empty, Panel, PanelHead, Pill } from "@/components/ops/bits";
import { PageHeader, inputClass } from "@/components/ops/table";
import { Field, SubmitButton } from "@/components/ops/controls";
import { approveProductAction, rejectProductAction, requestChangesAction } from "@/lib/actions";
import { money } from "@/lib/format";
import { MerchantProfileReview } from "@/components/ops/merchant-profile-review";

const tabs = [
  { id: "all", label: "All submissions" },
  { id: "products", label: "Product listings" },
  { id: "profiles", label: "Seller profiles" },
] as const;
type ReviewTab = (typeof tabs)[number]["id"];

function apiError(error: unknown) {
  return error instanceof ApiError ? error.message : "The review service could not be reached. Try again shortly.";
}

function TabLink({ tab, active, merchantId, count }: { tab: ReviewTab; active: boolean; merchantId?: string; count?: number }) {
  const query = new URLSearchParams();
  if (tab !== "all") query.set("tab", tab);
  if (merchantId) query.set("merchantId", merchantId);
  const href = `/review${query.size ? `?${query.toString()}` : ""}`;
  return (
    <Link href={href} aria-current={active ? "page" : undefined}
      className={`inline-flex min-h-10 items-center gap-2 rounded-[2px] border px-3 py-2 text-[11.5px] transition-colors ${active ? "border-signal/40 bg-signal/10 text-signal" : "border-hairline text-chalk-dim hover:text-chalk"}`}>
      {tab === "profiles" ? "Seller profiles" : tab === "products" ? "Product listings" : "All submissions"}
      {count == null ? null : <span className="font-mono text-[10px]">{count}</span>}
    </Link>
  );
}

export default async function ReviewPage({ searchParams }: { searchParams: Promise<{ tab?: string; merchantId?: string }> }) {
  const [{ session }, params] = await Promise.all([requireAdmin(), searchParams]);
  const tab: ReviewTab = params.tab === "products" || params.tab === "profiles" ? params.tab : "all";
  const merchantId = String(params.merchantId ?? "").trim() || undefined;
  const [productsResult, profilesResult] = await Promise.allSettled([
    listReviewQueue(session),
    listMerchantProfileRequests(session),
  ]);
  const products = productsResult.status === "fulfilled" ? productsResult.value.items : [];
  const profiles = profilesResult.status === "fulfilled" ? profilesResult.value.items : [];
  const visibleProducts = merchantId ? products.filter((item) => item.merchantId === merchantId) : products;
  const visibleProfiles = merchantId ? profiles.filter((item) => item.merchantId === merchantId) : profiles;
  const productsLoaded = productsResult.status === "fulfilled";
  const profilesLoaded = profilesResult.status === "fulfilled";
  const allQueuesLoaded = productsLoaded && profilesLoaded;
  const totalWaiting = visibleProducts.length + visibleProfiles.length;
  const showProducts = tab !== "profiles";
  const showProfiles = tab !== "products";

  return (
    <div className="grid min-w-0 gap-5">
      <PageHeader
        back={
          <Link href={merchantId ? `/merchants/${encodeURIComponent(merchantId)}` : "/catalog"} className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-chalk-dim transition-colors hover:text-chalk">
            <ArrowLeft width={13} height={13} /> {merchantId ? "Seller record" : "Catalogue"}
          </Link>
        }
        eyebrow="Marketplace · governance"
        title="Review queue"
        description="Seller-submitted marketplace listings and profile changes are reviewed here. Merchant records remain for management; nothing is published until the appropriate review is approved."
        action={<Pill tone={!allQueuesLoaded ? "rose" : totalWaiting ? "amber" : "mint"}>{allQueuesLoaded ? `${totalWaiting} awaiting review` : "Review data unavailable"}</Pill>}
      />

      {merchantId ? (
        <Panel className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[12px] text-chalk-dim">Filtered to seller <span className="font-mono text-chalk">{merchantId}</span></p>
          <Link href="/review" className="text-[11px] text-signal hover:underline">Clear seller filter</Link>
        </Panel>
      ) : null}

      <nav aria-label="Review types" className="flex flex-wrap gap-2">
        <TabLink tab="all" active={tab === "all"} merchantId={merchantId} count={allQueuesLoaded ? totalWaiting : undefined} />
        <TabLink tab="products" active={tab === "products"} merchantId={merchantId} count={productsLoaded ? visibleProducts.length : undefined} />
        <TabLink tab="profiles" active={tab === "profiles"} merchantId={merchantId} count={profilesLoaded ? visibleProfiles.length : undefined} />
      </nav>

      {showProducts ? (
        <section className="grid gap-4" aria-labelledby="product-queue-heading">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="product-queue-heading" className="font-display text-[17px] font-semibold text-chalk">Product listings</h2>
            <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-chalk-dim">Submitted products only</span>
          </div>
          {productsResult.status === "rejected" ? (
            <Panel><PanelHead title="Product review could not load" /><p className="text-[12px] leading-relaxed text-rose">{apiError(productsResult.reason)}</p></Panel>
          ) : visibleProducts.length ? (
            visibleProducts.map((item) => (
              <Panel key={item.id}>
                <PanelHead
                  title={item.title || "Untitled listing"}
                  hint={`${item.merchantName} · ${money(item.price)} · stock ${item.stock}`}
                  action={<Pill tone={String(item.reviewStatus) === "changes_requested" ? "amber" : "violet"}>{String(item.reviewStatus).replace(/_/g, " ")}</Pill>}
                />
                <div className="grid gap-3 sm:grid-cols-[112px_minmax(0,1fr)]">
                  {item.images?.length ? (
                    <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-1">
                      {item.images.slice(0, 2).map((image, index) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img key={`${image}-${index}`} src={assetUrl(image)} alt={`${item.title} ${index + 1}`} className="aspect-square w-full rounded-[9px] border border-hairline bg-panel-2 object-cover" />
                      ))}
                    </div>
                  ) : null}
                  <div className="min-w-0 rounded-[10px] border border-hairline bg-panel-2 p-3 text-[12px]">
                    <p className="whitespace-pre-wrap leading-relaxed text-chalk">{item.description || "No product description supplied."}</p>
                    {item.bullets?.length ? <div className="mt-3"><p className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-chalk-dim">Highlights</p><ul className="mt-1 grid gap-1 text-chalk">{item.bullets.map((bullet, index) => <li key={`${bullet}-${index}`}>• {bullet}</li>)}</ul></div> : null}
                    {item.variants?.length ? <p className="mt-3 text-chalk"><span className="text-chalk-dim">Options:</span> {item.variants.map((variant) => `${variant.name}: ${variant.values.join(", ")}`).join(" · ")}</p> : null}
                    {item.tags?.length ? <p className="mt-2 text-chalk"><span className="text-chalk-dim">Tags:</span> {item.tags.join(", ")}</p> : null}
                    {item.collections?.length ? <p className="mt-2 text-chalk"><span className="text-chalk-dim">Collections:</span> {item.collections.join(", ")}</p> : null}
                  </div>
                </div>
                {item.reviewNote ? <p className="rounded-[10px] border border-hairline bg-panel-2 px-3.5 py-2.5 text-[12.5px] leading-relaxed text-chalk-dim"><span className="text-chalk">Previous note:</span> {item.reviewNote}</p> : null}
                <div className="mt-3 grid gap-2 rounded-[10px] border border-hairline bg-panel-2 p-3 text-[12px] sm:grid-cols-2">
                  <p><span className="text-chalk-dim">Category:</span> {item.category || "Unassigned"} · <span className="text-chalk-dim">Brand:</span> {item.brandName || "Unassigned"}</p>
                  <p><span className="text-chalk-dim">Shipping:</span> {item.shipping_amount == null ? "Not supplied" : money(item.shipping_amount)} · {item.estimated_delivery_days ? `${item.estimated_delivery_days} day estimate` : "no ETA"}</p>
                  <p><span className="text-chalk-dim">Package:</span> {[item.package_weight ? `${item.package_weight} kg` : "", item.package_dimensions, item.shipping_origin].filter(Boolean).join(" · ") || "Not supplied"}</p>
                  <p><span className="text-chalk-dim">Submitted:</span> {item.submittedAt || "—"} by {item.submittedBy || "seller"}</p>
                  <p className="sm:col-span-2"><span className="text-chalk-dim">Requested CMS sections:</span> {item.section_tags?.length ? item.section_tags.join(", ") : "No section request"}</p>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <CmsActionForm action={approveProductAction} className="inline-flex items-center gap-2">
                    <input type="hidden" name="id" value={item.id} />
                    <SubmitButton pendingLabel="Approving"><Check width={14} height={14} /> Approve listing</SubmitButton>
                  </CmsActionForm>
                  <Link href={`/merchants/${encodeURIComponent(item.merchantId)}`} className="inline-flex items-center gap-1.5 text-[11px] text-signal hover:underline">Open seller record <ExternalLink width={12} height={12} /></Link>
                </div>
                <div className="mt-4 grid gap-3 border-t border-hairline pt-4 sm:grid-cols-2">
                  <CmsActionForm action={requestChangesAction} className="grid gap-2.5">
                    <input type="hidden" name="id" value={item.id} />
                    <Field title="Request changes"><input name="note" required className={inputClass} placeholder="The main photo is the wrong size" /></Field>
                    <SubmitButton variant="outline" pendingLabel="Sending"><RotateCcw width={13} height={13} /> Ask for changes</SubmitButton>
                  </CmsActionForm>
                  <CmsActionForm action={rejectProductAction} className="grid gap-2.5">
                    <input type="hidden" name="id" value={item.id} />
                    <Field title="Reject with reason"><input name="note" required className={inputClass} placeholder="Explain why this cannot be listed" /></Field>
                    <SubmitButton variant="danger" pendingLabel="Rejecting"><X width={13} height={13} /> Reject listing</SubmitButton>
                  </CmsActionForm>
                </div>
              </Panel>
            ))
          ) : (
            <Empty title="No product submissions waiting" body="Pending seller product submissions appear here. Approved listings are managed from their Merchant record." />
          )}
        </section>
      ) : null}

      {showProfiles ? (
        <section className="grid gap-4" aria-labelledby="profile-queue-heading">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="profile-queue-heading" className="font-display text-[17px] font-semibold text-chalk">Seller profile changes</h2>
            <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-chalk-dim">Public profile proposals only</span>
          </div>
          {profilesResult.status === "rejected" ? (
            <Panel><PanelHead title="Profile review could not load" /><p className="text-[12px] leading-relaxed text-rose">{apiError(profilesResult.reason)}</p></Panel>
          ) : visibleProfiles.length ? (
            visibleProfiles.map((item) => (
              <Panel key={item.request.id}>
                <PanelHead
                  title={item.merchantName || "Seller"}
                  hint={`Seller ID ${item.merchantId} · Submitted ${item.request.submittedAt ? new Date(item.request.submittedAt).toLocaleString() : "date unavailable"}`}
                  action={<Link href={`/merchants/${encodeURIComponent(item.merchantId)}`} className="inline-flex items-center gap-1.5 rounded-[8px] border border-hairline bg-white px-3 py-2 text-[11px] font-semibold text-chalk hover:bg-panel-2">Open seller record <ExternalLink width={12} height={12} /></Link>}
                />
                <p className="mb-3 text-[11px] text-chalk-dim">Compare the approved profile below with the seller’s pending proposal. Contact details, verification website, and street address are for Admin review only unless a contact field is explicitly opted in and approved.</p>
                <MerchantProfileReview merchantId={item.merchantId} profile={item.currentProfile} requests={[item.request]} />
              </Panel>
            ))
          ) : (
            <Empty title="No profile changes waiting" body="Seller-submitted profile edits stay private until approved. Approved fields appear on the Ferixas marketplace profile; the seller’s external website is never embedded here." />
          )}
        </section>
      ) : null}
    </div>
  );
}

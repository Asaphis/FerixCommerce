import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { requireAdmin } from "@/lib/data";
import { listMerchantProfileRequests } from "@/lib/api";
import { MerchantProfileReview } from "@/components/ops/merchant-profile-review";
import { Empty, Panel, PanelHead, Pill } from "@/components/ops/bits";
import { PageHeader } from "@/components/ops/table";

export default async function SellerProfileRequestsPage() {
  const { session } = await requireAdmin();
  const queue = await listMerchantProfileRequests(session);

  return (
    <div className="grid min-w-0 gap-5">
      <PageHeader
        back={
          <Link href="/merchants" className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-chalk-dim transition-colors hover:text-chalk">
            <ArrowLeft width={13} height={13} /> Sellers
          </Link>
        }
        eyebrow="People · review"
        title="Seller profile changes"
        description="Review the submitted snapshot against the currently approved profile. Only approved profile fields appear on Ferixas; a seller’s external website and its pages are never embedded here."
        action={<Pill tone={queue.total ? "amber" : "mint"}>{queue.total} awaiting review</Pill>}
      />

      {queue.items.length ? (
        <div className="grid gap-4">
          {queue.items.map((item) => (
            <section key={item.request.id} className="grid gap-3">
              <Panel>
                <PanelHead
                  title={item.merchantName || "Seller"}
                  hint={`Seller ID ${item.merchantId} · Submitted ${item.request.submittedAt ? new Date(item.request.submittedAt).toLocaleString() : "date unavailable"}`}
                  action={
                    <Link href={`/merchants/${encodeURIComponent(item.merchantId)}`} className="inline-flex items-center gap-1.5 rounded-[8px] border border-hairline bg-white px-3 py-2 text-[11px] font-semibold text-chalk hover:bg-panel-2">
                      Open seller record <ExternalLink width={12} height={12} />
                    </Link>
                  }
                />
                <p className="mb-3 text-[11px] text-chalk-dim">Compare the approved profile below with the seller’s pending proposal. Contact details, verification website, and street address are for Admin review only unless a contact field is explicitly opted in and approved.</p>
                <MerchantProfileReview
                  merchantId={item.merchantId}
                  profile={item.currentProfile}
                  requests={[item.request]}
                />
              </Panel>
            </section>
          ))}
        </div>
      ) : (
        <Empty title="No profile changes waiting" body="Seller-submitted profile edits stay private until an Admin approves them. New requests will appear here in submission order." />
      )}
    </div>
  );
}

import { MapPin, Mail, Phone } from "lucide-react";
import { Panel, PanelHead, Pill } from "@/components/ops/bits";
import { CmsActionForm } from "@/components/ops/cms-action-form";
import { reviewMerchantProfileAction } from "@/lib/actions";
import type { MerchantDetail } from "@/lib/api";

type Profile = Record<string, string | boolean>;
type Request = MerchantDetail["profileRequests"][number];

function Value({ label, value }: { label: string; value?: string | boolean | null }) {
  const rendered = typeof value === "boolean" ? (value ? "Yes" : "No") : value || "Not provided";
  return <div className="rounded-[8px] border border-hairline bg-white p-3"><p className="font-mono text-[9px] uppercase tracking-[0.12em] text-chalk-dim">{label}</p><p className="mt-1 break-words text-[12px] text-chalk">{rendered}</p></div>;
}

function Snapshot({ profile }: { profile: Profile }) {
  const address = [profile.addressLine1, profile.addressLine2, profile.city, profile.region, profile.postalCode, profile.country].filter(Boolean).join(", ");
  return <div className="grid gap-2 sm:grid-cols-2">
    <Value label="Store name" value={profile.name} />
    <Value label="Business / legal name" value={profile.businessName} />
    <Value label="Location shown publicly" value={profile.location} />
    <Value label="About" value={profile.about} />
    <Value label="Marketplace profile logo" value={profile.logo} />
    <Value label="Business contact email" value={profile.businessEmail} />
    <Value label="Business contact phone" value={profile.businessPhone} />
    <Value label="Business address (private)" value={address} />
    <Value label="External website (verification only; not public)" value={profile.website} />
    <Value label="Public email opt-in" value={profile.showBusinessEmail} />
    <Value label="Public phone opt-in" value={profile.showPhone} />
  </div>;
}

export function MerchantProfileReview({ merchantId, profile, requests }: { merchantId: string; profile: MerchantDetail["profile"]; requests: Request[] }) {
  const current = profile as Profile;
  return <div className="grid gap-3">
    <Panel>
      <PanelHead title="Approved business contact details" hint="Visible to Admin only unless the seller has explicitly opted in to public contact." />
      <div className="mb-3 flex flex-wrap gap-2 text-[11px] text-chalk-dim">
        <span className="inline-flex items-center gap-1"><Mail width={12} height={12} />Contact details</span>
        <span className="inline-flex items-center gap-1"><Phone width={12} height={12} />Private phone/address</span>
        <span className="inline-flex items-center gap-1"><MapPin width={12} height={12} />Seller-submitted</span>
      </div>
      <Snapshot profile={current} />
    </Panel>
    <Panel>
      <PanelHead title="Seller profile update requests" hint="Only the seller edits business identity and contact data; approval publishes the proposed snapshot." action={<Pill tone={requests.some((request) => request.status === "pending_review") ? "amber" : "neutral"}>{requests.filter((request) => request.status === "pending_review").length} awaiting review</Pill>} />
      {requests.length ? <div className="grid gap-3">
        {requests.map((request) => {
          const proposed = request.profile as Profile;
          return <div key={request.id} className="rounded-[10px] border border-hairline bg-panel-2 p-3">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2"><div><p className="font-mono text-[10px] text-chalk">Submitted {request.submittedAt ? new Date(request.submittedAt).toLocaleString() : ""}</p><p className="mt-0.5 text-[10px] text-chalk-dim">By {request.submittedBy}</p></div><Pill tone={request.status === "pending_review" ? "amber" : request.status === "approved" ? "mint" : "neutral"}>{request.status.replaceAll("_", " ")}</Pill></div>
            <Snapshot profile={proposed} />
            {request.note ? <p className="mt-2 rounded-[7px] bg-white p-2 text-[11px] text-chalk-dim">Review note: {request.note}</p> : null}
            {request.status === "pending_review" ? <CmsActionForm action={reviewMerchantProfileAction} className="mt-2 grid gap-2">
              <input type="hidden" name="merchantId" value={merchantId} /><input type="hidden" name="requestId" value={request.id} />
              <label className="grid gap-1 text-[10px] text-chalk-dim">Reviewer note <textarea name="note" rows={2} className="rounded-[7px] border border-hairline bg-white p-2 text-[12px] text-chalk" placeholder="Required for changes requested or rejection" /></label>
              <div className="flex flex-wrap gap-2">
                <button name="decision" value="approve" className="rounded-[7px] bg-[#2d875a] px-3 py-2 text-[11px] font-semibold text-white">Approve and publish</button>
                <button name="decision" value="changes" className="rounded-[7px] border border-hairline bg-white px-3 py-2 text-[11px] font-semibold text-chalk">Request changes</button>
                <button name="decision" value="reject" className="rounded-[7px] border border-rose-300 bg-white px-3 py-2 text-[11px] font-semibold text-rose-700">Reject update</button>
              </div>
            </CmsActionForm> : null}
          </div>;
        })}
      </div> : <p className="text-[12px] text-chalk-dim">No seller-submitted profile updates yet.</p>}
    </Panel>
  </div>;
}

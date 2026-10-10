"use client";

import { useActionState } from "react";
import { Save } from "lucide-react";
import type { MerchantProfile, MerchantProfileRequest } from "@/lib/api";
import { SubmitButton } from "@/components/studio/controls";
import { Field, Notice, inputClass, textareaClass } from "@/components/studio/forms";
import { Empty, Panel, PanelHead, Pill } from "@/components/studio/bits";
import { submitProfileRequestAction, type FormState } from "@/lib/actions";

type RequestTone = "neutral" | "amber" | "success" | "danger" | "warn";

function requestTone(status: string): RequestTone {
  if (status === "pending_review") return "amber";
  if (status === "approved") return "success";
  if (status === "rejected") return "danger";
  if (status === "changes_requested") return "warn";
  return "neutral";
}

function submittedAt(value?: string | null) {
  if (!value) return "Date unavailable";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Date unavailable" : date.toLocaleString();
}

export function ProfileForm({
  profile,
  request,
  history = [],
}: {
  profile: MerchantProfile;
  request: MerchantProfileRequest | null;
  history?: MerchantProfileRequest[];
}) {
  const [state, action] = useActionState<FormState, FormData>(submitProfileRequestAction, {});
  const draft = request && ["pending_review", "changes_requested", "rejected"].includes(request.status)
    ? request.profile
    : profile;
  const tone = request ? requestTone(request.status) : "neutral";

  return (
    <div className="grid gap-3">
      <Panel>
        <PanelHead title="Public Ferixas seller profile — currently live" hint="Only approved details are shown to shoppers. A pending or rejected submission does not replace this profile." />
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="rounded-[8px] border border-hairline bg-panel-2 p-3">
            <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-chalk-dim">Seller name</p>
            <p className="mt-1 text-[13px] font-semibold text-chalk">{profile.name || "Not set"}</p>
          </div>
          <div className="rounded-[8px] border border-hairline bg-panel-2 p-3">
            <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-chalk-dim">Public location</p>
            <p className="mt-1 text-[13px] text-chalk">{profile.location || "Not set"}</p>
          </div>
          <div className="rounded-[8px] border border-hairline bg-panel-2 p-3">
            <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-chalk-dim">Marketplace profile logo</p>
            <p className="mt-1 break-all text-[12px] text-chalk">{profile.logo || "No logo set"}</p>
          </div>
          <div className="rounded-[8px] border border-hairline bg-panel-2 p-3 sm:col-span-2">
            <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-chalk-dim">Tagline and profile description</p>
            <p className="mt-1 text-[13px] text-chalk">{profile.tagline || "No tagline"}</p>
            <p className="mt-1 whitespace-pre-wrap text-[12px] leading-relaxed text-chalk-dim">{profile.about || "No description yet."}</p>
          </div>
          <div className="rounded-[8px] border border-hairline bg-panel-2 p-3">
            <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-chalk-dim">Business email</p>
            <p className="mt-1 break-words text-[12px] text-chalk">{profile.showBusinessEmail ? profile.businessEmail || "Opted in; no email supplied" : "Private"}</p>
          </div>
          <div className="rounded-[8px] border border-hairline bg-panel-2 p-3">
            <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-chalk-dim">Business phone</p>
            <p className="mt-1 text-[12px] text-chalk">{profile.showPhone ? profile.businessPhone || "Opted in; no phone supplied" : "Private"}</p>
          </div>
        </div>
      </Panel>

      <form action={action} className="grid gap-3">
        <Panel>
          <PanelHead
            title="Submit profile changes for review"
            action={request ? <Pill tone={tone}>{request.status.replaceAll("_", " ")}</Pill> : null}
          />
          <p className="mb-4 text-[12px] leading-relaxed text-chalk-dim">
            Ferixas shows your approved seller profile, not your separate website or its pages. Proposed changes stay private until an Admin approves them.
            Your sign-in email and street address are private. Business email or phone is public only when you opt in below.
          </p>
          {request?.note ? <p className="mb-3 rounded-[8px] border border-sand/30 bg-sand/5 p-3 text-[12px] text-sand">Reviewer note: {request.note}</p> : null}
          {request?.status === "pending_review" ? <p className="mb-3 rounded-[8px] border border-signal/30 bg-signal/5 p-3 text-[12px] text-chalk-dim">A review is pending. Submitting a new version will supersede that request; your current approved profile stays live.</p> : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field title="Seller name"><input name="name" defaultValue={draft.name} className={inputClass} required minLength={2} /></Field>
            <Field title="Business / legal name"><input name="businessName" defaultValue={draft.businessName} className={inputClass} /></Field>
            <Field title="Public location (city / region / country)"><input name="location" defaultValue={draft.location} className={inputClass} placeholder="e.g. Accra, Ghana" /></Field>
            <Field title="Marketplace profile logo URL"><input name="logo" defaultValue={draft.logo} className={inputClass} maxLength={2048} placeholder="https://… or /media/…" /></Field>
            <p className="-mt-2 text-[10.5px] leading-relaxed text-chalk-dim sm:col-span-2">Use a secure image URL or a Ferixas media path. The logo appears on your Ferixas seller profile only after Admin approval.</p>
            <Field title="Business website (verification only)"><input name="website" type="url" defaultValue={draft.website} className={inputClass} placeholder="https://yourbusiness.example" /></Field>
            <p className="-mt-2 text-[10.5px] leading-relaxed text-chalk-dim sm:col-span-2">This URL is for business verification only. It will not be linked, embedded, or treated as your store on Ferixas.</p>
            <div className="sm:col-span-2"><Field title="Tagline"><input name="tagline" defaultValue={draft.tagline} className={inputClass} maxLength={180} /></Field></div>
            <div className="sm:col-span-2"><Field title="About the business"><textarea name="about" defaultValue={draft.about} className={textareaClass} rows={4} /></Field></div>
            <Field title="Business contact email"><input name="businessEmail" type="email" defaultValue={draft.businessEmail} className={inputClass} /></Field>
            <Field title="Business contact phone"><input name="businessPhone" type="tel" defaultValue={draft.businessPhone} className={inputClass} /></Field>
            <div className="sm:col-span-2"><Field title="Business address line 1 (private)"><input name="addressLine1" defaultValue={draft.addressLine1} className={inputClass} autoComplete="street-address" /></Field></div>
            <div className="sm:col-span-2"><Field title="Address line 2 (optional, private)"><input name="addressLine2" defaultValue={draft.addressLine2} className={inputClass} /></Field></div>
            <Field title="City (private)"><input name="city" defaultValue={draft.city} className={inputClass} autoComplete="address-level2" /></Field>
            <Field title="State / region (private)"><input name="region" defaultValue={draft.region} className={inputClass} autoComplete="address-level1" /></Field>
            <Field title="Postal / ZIP code (private)"><input name="postalCode" defaultValue={draft.postalCode} className={inputClass} autoComplete="postal-code" /></Field>
            <Field title="Country (private)"><input name="country" defaultValue={draft.country} className={inputClass} autoComplete="country-name" /></Field>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <label className="flex items-start gap-2 rounded-[9px] border border-hairline p-3 text-[12px] text-chalk"><input name="showBusinessEmail" type="checkbox" defaultChecked={draft.showBusinessEmail} className="mt-0.5 accent-[#e4572e]" /><span>After approval, show this business email on my Ferixas profile.</span></label>
            <label className="flex items-start gap-2 rounded-[9px] border border-hairline p-3 text-[12px] text-chalk"><input name="showPhone" type="checkbox" defaultChecked={draft.showPhone} className="mt-0.5 accent-[#e4572e]" /><span>After approval, show this business phone on my Ferixas profile.</span></label>
          </div>
          <p className="mt-3 text-[11px] text-chalk-dim">Private address fields are shared with Admin for business review and are never included in the public marketplace profile.</p>
        </Panel>
        <div className="flex flex-wrap items-center gap-3">
          <SubmitButton pendingLabel="Submitting"><Save width={14} height={14} /> Submit profile for review</SubmitButton>
          <Notice state={state} />
        </div>
      </form>

      <Panel>
        <PanelHead title="Profile submission history" hint="Each request keeps its decision and reviewer note. Earlier public profile data is not overwritten by an unapproved request." action={<Pill tone={history.some((item) => item.status === "pending_review") ? "amber" : "neutral"}>{history.length} requests</Pill>} />
        {history.length ? <div className="grid gap-2">
          {history.map((item) => (
            <article key={item.id} className="rounded-[8px] border border-hairline bg-panel-2 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-[12px] font-semibold text-chalk">{item.profile.name || "Profile update"}</p>
                  <p className="mt-0.5 font-mono text-[10px] text-chalk-dim">Submitted {submittedAt(item.submittedAt)}{item.reviewedAt ? ` · reviewed ${submittedAt(item.reviewedAt)}` : ""}</p>
                </div>
                <Pill tone={requestTone(item.status)}>{item.status.replaceAll("_", " ")}</Pill>
              </div>
              <p className="mt-2 text-[11px] text-chalk-dim">Proposed location: {item.profile.location || "Not provided"}</p>
              {item.note ? <p className="mt-2 rounded-[7px] border border-hairline bg-panel p-2 text-[11px] text-chalk-dim">Reviewer note: {item.note}</p> : null}
            </article>
          ))}
        </div> : <Empty title="No profile submissions yet" body="When you submit profile details, every request and its review decision will appear here." />}
      </Panel>
    </div>
  );
}

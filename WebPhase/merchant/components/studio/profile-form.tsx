"use client";

import { useActionState } from "react";
import { Save } from "lucide-react";
import type { MerchantProfile, MerchantProfileRequest } from "@/lib/api";
import { SubmitButton } from "@/components/studio/controls";
import { Field, Notice, inputClass, textareaClass } from "@/components/studio/forms";
import { Panel, PanelHead, Pill } from "@/components/studio/bits";
import { submitProfileRequestAction, type FormState } from "@/lib/actions";

export function ProfileForm({ profile, request }: { profile: MerchantProfile; request: MerchantProfileRequest | null }) {
  const [state, action] = useActionState<FormState, FormData>(submitProfileRequestAction, {});
  const draft = request && ["pending_review", "changes_requested", "rejected"].includes(request.status)
    ? request.profile
    : profile;
  const tone = request?.status === "pending_review" ? "amber" : request?.status === "approved" ? "success" : "neutral";

  return (
    <form action={action} className="grid gap-3">
      <Panel>
        <PanelHead
          title="Seller profile and business details"
          action={request ? <Pill tone={tone}>{request.status.replaceAll("_", " ")}</Pill> : null}
        />
        <p className="mb-4 text-[12px] leading-relaxed text-chalk-dim">
          You own and edit these details. Submitting sends a snapshot to Ferixas for review; the public profile stays unchanged until it is approved.
          Business address and contact details stay private. Email or phone is public only when you explicitly opt in below.
        </p>
        {request?.note ? <p className="mb-3 rounded-[8px] border border-sand/30 bg-sand/5 p-3 text-[12px] text-sand">Reviewer note: {request.note}</p> : null}
        {request?.status === "pending_review" ? <p className="mb-3 rounded-[8px] border border-signal/30 bg-signal/5 p-3 text-[12px] text-chalk-dim">A review is pending. Submitting a new version will supersede that request.</p> : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field title="Store name"><input name="name" defaultValue={draft.name} className={inputClass} required minLength={2} /></Field>
          <Field title="Business / legal name"><input name="businessName" defaultValue={draft.businessName} className={inputClass} /></Field>
          <Field title="Public location (city / region / country)"><input name="location" defaultValue={draft.location} className={inputClass} placeholder="e.g. Accra, Ghana" /></Field>
          <Field title="External website"><input name="website" type="url" defaultValue={draft.website} className={inputClass} placeholder="https://yourbusiness.example" /></Field>
          <div className="sm:col-span-2"><Field title="Tagline"><input name="tagline" defaultValue={draft.tagline} className={inputClass} maxLength={180} /></Field></div>
          <div className="sm:col-span-2"><Field title="About the business"><textarea name="about" defaultValue={draft.about} className={textareaClass} rows={4} /></Field></div>
          <Field title="Business contact email"><input name="businessEmail" type="email" defaultValue={draft.businessEmail} className={inputClass} /></Field>
          <Field title="Business contact phone"><input name="businessPhone" type="tel" defaultValue={draft.businessPhone} className={inputClass} /></Field>
          <div className="sm:col-span-2"><Field title="Business address line 1"><input name="addressLine1" defaultValue={draft.addressLine1} className={inputClass} autoComplete="street-address" /></Field></div>
          <div className="sm:col-span-2"><Field title="Address line 2 (optional)"><input name="addressLine2" defaultValue={draft.addressLine2} className={inputClass} /></Field></div>
          <Field title="City"><input name="city" defaultValue={draft.city} className={inputClass} autoComplete="address-level2" /></Field>
          <Field title="State / region"><input name="region" defaultValue={draft.region} className={inputClass} autoComplete="address-level1" /></Field>
          <Field title="Postal / ZIP code"><input name="postalCode" defaultValue={draft.postalCode} className={inputClass} autoComplete="postal-code" /></Field>
          <Field title="Country"><input name="country" defaultValue={draft.country} className={inputClass} autoComplete="country-name" /></Field>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <label className="flex items-start gap-2 rounded-[9px] border border-hairline p-3 text-[12px] text-chalk"><input name="showBusinessEmail" type="checkbox" defaultChecked={draft.showBusinessEmail} className="mt-0.5 accent-[#e4572e]" /><span>After approval, show this business email on my Ferixas profile.</span></label>
          <label className="flex items-start gap-2 rounded-[9px] border border-hairline p-3 text-[12px] text-chalk"><input name="showPhone" type="checkbox" defaultChecked={draft.showPhone} className="mt-0.5 accent-[#e4572e]" /><span>After approval, show this business phone on my Ferixas profile.</span></label>
        </div>
        <p className="mt-3 text-[11px] text-chalk-dim">Your sign-in email is separate and cannot be changed here. Street address is never displayed publicly.</p>
      </Panel>
      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton pendingLabel="Submitting"><Save width={14} height={14} /> Submit profile for review</SubmitButton>
        <Notice state={state} />
      </div>
    </form>
  );
}

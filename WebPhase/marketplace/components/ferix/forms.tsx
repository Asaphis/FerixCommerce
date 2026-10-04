"use client";

import { useActionState, useRef } from "react";
import Link from "next/link";
import { AlertCircle, Check } from "lucide-react";
import type { Address, AccountUser, PaymentMethod, ShippingOption, Review } from "@/lib/api";
import { SubmitButton } from "@/components/ferix/add-to-cart";
import {
  loginAction,
  registerAction,
  saveAddressAction,
  savePreferencesAction,
  saveProfileAction,
  saveReviewAction,
  saveSettingsAction,
  placeOrderAction,
  type FormState,
} from "@/lib/actions";
import { money } from "@/lib/format";
import { cn } from "@/lib/utils";

const field =
  "h-10 w-full rounded-[2px] border border-line-warm bg-white px-3 text-[13.5px] text-ink outline-none transition-colors placeholder:text-ink-soft/60 focus:border-ink";
const label = "font-mono text-[9.5px] uppercase tracking-[0.14em] text-ink-soft";

function Field({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className={label}>{title}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

/**
 * Dialling codes offered as suggestions. Only the code itself is shown — never
 * a country abbreviation — and because this is a datalist a shopper can type a
 * code that is not listed.
 */
const DIAL_CODES = ["+234", "+233", "+254", "+27", "+20", "+44", "+1", "+33", "+49", "+34", "+971", "+91", "+86"];

function PhoneField({ defaultValue }: { defaultValue?: string }) {
  const raw = (defaultValue ?? "").trim();
  const match = raw.match(/^\+(\d{1,4})\s*(.*)$/);
  const dial = match ? `+${match[1]}` : "+234";
  const number = match ? match[2] : raw;

  return (
    <Field title="Phone">
      <div className="flex gap-2">
        <input
          name="dial"
          list="ferix-dial-codes"
          defaultValue={dial}
          inputMode="tel"
          aria-label="Country dialling code"
          className={cn(field, "w-[86px] shrink-0 px-2 text-center font-mono")}
        />
        <input
          name="phone"
          defaultValue={number}
          inputMode="tel"
          autoComplete="tel-national"
          placeholder="803 411 2290"
          aria-label="Phone number"
          className={cn(field, "min-w-0 flex-1")}
        />
      </div>
      <datalist id="ferix-dial-codes">
        {DIAL_CODES.map((code) => (
          <option key={code} value={code} />
        ))}
      </datalist>
    </Field>
  );
}

function Notice({ state }: { state: FormState }) {
  if (state?.error)
    return (
      <p className="flex items-start gap-2 rounded-[2px] border border-ember/40 bg-ember/8 px-3 py-2.5 text-[12.5px] text-ember">
        <AlertCircle width={14} height={14} className="mt-[1px] shrink-0" />
        {state.error}
      </p>
    );
  if (state?.message)
    return (
      <p className="flex items-start gap-2 rounded-[2px] border border-pine/40 bg-pine/8 px-3 py-2.5 text-[12.5px] text-pine">
        <Check width={14} height={14} className="mt-[1px] shrink-0" />
        {state.message}
      </p>
    );
  return null;
}

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const [state, action] = useActionState<FormState, FormData>(
    mode === "login" ? loginAction : registerAction,
    {},
  );

  return (
    <form action={action} className="grid grid-cols-1 gap-4">
      {mode === "register" ? (
        <Field title="Full name">
          <input name="name" className={field} placeholder="Ada Bello" autoComplete="name" required />
        </Field>
      ) : null}
      <Field title="Email address">
        <input name="email" type="email" className={field} placeholder="you@example.com" autoComplete="email" required />
      </Field>
      <Field title={mode === "register" ? "Password (8 characters or more)" : "Password"}>
        <input
          name="password"
          type="password"
          className={field}
          placeholder="••••••••"
          autoComplete={mode === "register" ? "new-password" : "current-password"}
          required
        />
      </Field>
      <Notice state={state} />
      <SubmitButton pendingLabel={mode === "login" ? "Signing in" : "Creating your account"} className="w-full">
        {mode === "login" ? "Sign in" : "Create account"}
      </SubmitButton>
      {mode === "login" ? (
        <p className="text-center text-[12.5px] text-ink-soft">
          New to Ferixas?{" "}
          <Link href="/register" className="text-ink underline decoration-ember decoration-2 underline-offset-4">
            Create an account
          </Link>
        </p>
      ) : (
        <p className="text-center text-[12.5px] text-ink-soft">
          Already have an account?{" "}
          <Link href="/login" className="text-ink underline decoration-ember decoration-2 underline-offset-4">
            Sign in
          </Link>
        </p>
      )}
    </form>
  );
}

export function AddressForm({ address }: { address?: Address }) {
  const [state, action] = useActionState<FormState, FormData>(saveAddressAction, {});
  return (
    <form action={action} className="grid grid-cols-1 gap-4">
      {address ? <input type="hidden" name="id" value={address.id} /> : null}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field title="Label">
          <input name="label" defaultValue={address?.label ?? "Home"} className={field} />
        </Field>
        <Field title="Recipient name">
          <input name="name" defaultValue={address?.name ?? ""} className={field} required />
        </Field>
        <Field title="Phone">
          <PhoneField defaultValue={address?.phone} />
        </Field>
        <Field title="Street address">
          <input name="line1" defaultValue={address?.line1 ?? ""} className={field} required />
        </Field>
        <Field title="Apartment, floor (optional)">
          <input name="line2" defaultValue={address?.line2 ?? ""} className={field} />
        </Field>
        <Field title="City">
          <input name="city" defaultValue={address?.city ?? ""} className={field} required />
        </Field>
        <Field title="State or region">
          <input name="region" defaultValue={address?.region ?? ""} className={field} />
        </Field>
        <Field title="Postcode">
          <input name="postcode" defaultValue={address?.postcode ?? ""} className={field} />
        </Field>
        <Field title="Country">
          <input name="country" defaultValue={address?.country ?? ""} className={field} required />
        </Field>
      </div>
      <label className="flex items-center gap-2.5 text-[13px] text-ink">
        <input type="checkbox" name="isDefault" defaultChecked={address?.isDefault ?? false} className="h-4 w-4 accent-[#e4572e]" />
        Use this as my default delivery address
      </label>
      <Notice state={state} />
      <SubmitButton className="w-fit">{address ? "Save changes" : "Add address"}</SubmitButton>
    </form>
  );
}

export function ReviewForm({ productId, review }: { productId?: string; review?: Review }) {
  const [state, action] = useActionState<FormState, FormData>(saveReviewAction, {});
  return (
    <form action={action} className="grid grid-cols-1 gap-4">
      {review ? <input type="hidden" name="id" value={review.id} /> : null}
      {productId ? <input type="hidden" name="productId" value={productId} /> : null}
      <Field title="Rating">
        <select name="rating" defaultValue={String(review?.rating ?? 5)} className={cn(field, "h-10")}>
          {[5, 4, 3, 2, 1].map((value) => (
            <option key={value} value={value}>
              {value} star{value === 1 ? "" : "s"}
            </option>
          ))}
        </select>
      </Field>
      <Field title="Headline">
        <input name="title" defaultValue={review?.title ?? ""} className={field} placeholder="Exactly as described" required />
      </Field>
      <Field title="Your review">
        <textarea
          name="body"
          defaultValue={review?.body ?? ""}
          className={cn(field, "h-[92px] resize-y py-2")}
          placeholder="What should other shoppers know?"
          required
        />
      </Field>
      <Notice state={state} />
      <SubmitButton className="w-fit">{review ? "Update review" : "Publish review"}</SubmitButton>
    </form>
  );
}

export function SettingsForm({ user, settings }: { user: AccountUser; settings: Record<string, unknown> }) {
  const [state, action] = useActionState<FormState, FormData>(saveSettingsAction, {});
  const toggles: { name: string; title: string; body: string; on: boolean }[] = [
    { name: "orderEmails", title: "Order updates by email", body: "Confirmations, dispatch and delivery", on: Boolean(settings.orderEmails) },
    { name: "marketingEmails", title: "Offers and new arrivals", body: "At most twice a month", on: Boolean(settings.marketingEmails) },
    { name: "smsUpdates", title: "Delivery updates by SMS", body: "Only when the carrier is close", on: Boolean(settings.smsUpdates) },
    { name: "profilePublic", title: "Show my name on reviews", body: "Turn off to post reviews anonymously", on: Boolean(settings.profilePublic) },
  ];

  return (
    <form action={action} className="grid grid-cols-1 gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field title="Full name">
          <input name="name" defaultValue={user.name} className={field} required />
        </Field>
        <Field title="Phone">
          <PhoneField defaultValue={user.phone} />
        </Field>
        <Field title="Email address">
          <input value={user.email} readOnly className={cn(field, "bg-bone-soft text-ink-soft")} />
        </Field>
        <Field title="Currency">
          <select name="currency" defaultValue={String(settings.currency ?? "USD")} className={field}>
            {["USD", "NGN", "GBP", "EUR", "ZAR"].map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="rounded-[3px] border border-line-warm bg-white p-4">
        <p className={label}>Notifications and privacy</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {toggles.map((item) => (
            <label key={item.name} className="flex cursor-pointer items-start gap-3 rounded-[2px] border border-line-warm p-3 transition-colors hover:border-ink/25">
              <input type="checkbox" name={item.name} defaultChecked={item.on} className="mt-[3px] h-4 w-4 accent-[#e4572e]" />
              <span>
                <span className="block text-[13px] font-medium text-ink">{item.title}</span>
                <span className="block text-[12px] text-ink-soft">{item.body}</span>
              </span>
            </label>
          ))}
        </div>
      </div>

      <Notice state={state} />
      <SubmitButton className="w-fit">Save settings</SubmitButton>
    </form>
  );
}

export function ShippingPicker({
  options,
  selected,
  addressId,
}: {
  options: ShippingOption[];
  selected: string;
  addressId?: string;
}) {
  const ref = useRef<HTMLFormElement>(null);
  return (
    <form
      ref={ref}
      method="get"
      action="/checkout"
      onChange={() => ref.current?.requestSubmit()}
      className="grid grid-cols-1 gap-2"
    >
      {addressId ? <input type="hidden" name="address" value={addressId} /> : null}
      {options.map((option) => (
        <label
          key={option.id}
          className={cn(
            "flex cursor-pointer items-center gap-3 rounded-[2px] border p-3 transition-colors",
            option.id === selected ? "border-ink bg-bone-soft" : "border-line-warm hover:border-ink/30",
          )}
        >
          <input
            type="radio"
            name="shipping"
            value={option.id}
            defaultChecked={option.id === selected}
            className="h-4 w-4 accent-[#e4572e]"
          />
          <span className="flex-1">
            <span className="block text-[13.5px] font-medium text-ink">{option.label}</span>
            <span className="block text-[12px] text-ink-soft">{option.eta}</span>
          </span>
          <span className="font-mono text-[13px] font-semibold text-ink">
            {option.price === 0 ? "Free" : money(option.price)}
          </span>
        </label>
      ))}
      <noscript>
        <button type="submit" className="rounded-[2px] border border-ink/25 px-3 py-2 text-[12.5px] font-semibold text-ink">
          Update total
        </button>
      </noscript>
    </form>
  );
}

export function PlaceOrderForm({
  addresses,
  shippingMethod,
  paymentMethods,
  defaultAddressId,
}: {
  addresses: Address[];
  shippingMethod: string;
  paymentMethods: PaymentMethod[];
  defaultAddressId?: string;
}) {
  const [state, action] = useActionState<FormState, FormData>(placeOrderAction, {});
  return (
    <form action={action} className="grid grid-cols-1 gap-4">
      <input type="hidden" name="shippingMethod" value={shippingMethod} />
      <Field title="Deliver to">
        <select name="addressId" defaultValue={defaultAddressId} className={field} required>
          {addresses.map((address) => (
            <option key={address.id} value={address.id}>
              {address.label} · {address.line1}, {address.city}
            </option>
          ))}
        </select>
      </Field>
      <Field title="Pay with">
        <select name="paymentMethod" defaultValue={paymentMethods[0]?.id ?? "card"} className={field}>
          {paymentMethods.map((method) => (
            <option key={method.id} value={method.id}>
              {method.label} — {method.detail}
            </option>
          ))}
        </select>
      </Field>
      <Field title="Note for the seller (optional)">
        <textarea name="note" className={cn(field, "h-[70px] resize-y py-2")} placeholder="Leave with the concierge" />
      </Field>
      <Notice state={state} />
      <SubmitButton pendingLabel="Placing your order" className="w-full">Place order</SubmitButton>
      <p className="text-center font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft">
        Items are shipped separately by each seller
      </p>
    </form>
  );
}

export function ProfileForm({ user }: { user: AccountUser }) {
  const [state, action] = useActionState<FormState, FormData>(saveProfileAction, {});
  return (
    <form action={action} className="grid grid-cols-1 gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field title="Full name">
          <input name="name" defaultValue={user.name} className={field} autoComplete="name" required />
        </Field>
        <Field title="Phone">
          <PhoneField defaultValue={user.phone} />
        </Field>
      </div>
      <Field title="Email address">
        <input value={user.email} readOnly className={cn(field, "bg-bone-soft text-ink-soft")} />
      </Field>
      <p className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-ink-soft">
        Your email is how you sign in and cannot be changed here
      </p>
      <Notice state={state} />
      <SubmitButton className="w-fit">Save profile</SubmitButton>
    </form>
  );
}

export function PreferencesForm({ settings }: { settings: Record<string, unknown> }) {
  const [state, action] = useActionState<FormState, FormData>(savePreferencesAction, {});
  const toggles: { name: string; title: string; body: string; on: boolean }[] = [
    {
      name: "orderEmails",
      title: "Order updates by email",
      body: "Confirmation, dispatch and delivery",
      on: Boolean(settings.orderEmails),
    },
    {
      name: "marketingEmails",
      title: "Offers and new arrivals",
      body: "At most twice a month",
      on: Boolean(settings.marketingEmails),
    },
    {
      name: "smsUpdates",
      title: "Delivery updates by SMS",
      body: "Only when the carrier is close",
      on: Boolean(settings.smsUpdates),
    },
    {
      name: "profilePublic",
      title: "Show my name on reviews",
      body: "Off posts your reviews anonymously",
      on: Boolean(settings.profilePublic),
    },
  ];

  return (
    <form action={action} className="grid grid-cols-1 gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field title="Language">
          <select name="language" defaultValue={String(settings.language ?? "English")} className={field}>
            {["English", "Français", "Português", "Yorùbá", "Hausa"].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </Field>
        <Field title="Currency">
          <select name="currency" defaultValue={String(settings.currency ?? "USD")} className={field}>
            {["USD", "NGN", "GBP", "EUR", "ZAR"].map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="rounded-[3px] border border-line-warm bg-white p-4">
        <p className={label}>Messages and privacy</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {toggles.map((item) => (
            <label
              key={item.name}
              className="flex cursor-pointer items-start gap-3 rounded-[2px] border border-line-warm p-3 transition-colors hover:border-ink/25"
            >
              <input
                type="checkbox"
                name={item.name}
                defaultChecked={item.on}
                className="mt-[3px] h-4 w-4 accent-[#e4572e]"
              />
              <span>
                <span className="block text-[13px] font-medium text-ink">{item.title}</span>
                <span className="block text-[12px] text-ink-soft">{item.body}</span>
              </span>
            </label>
          ))}
        </div>
      </div>

      <Notice state={state} />
      <SubmitButton className="w-fit">Save preferences</SubmitButton>
    </form>
  );
}

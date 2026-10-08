"use client";

import React, { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2, ShoppingBag } from "lucide-react";
import { cn } from "@/lib/utils";
import { addToCartAction, toggleWishlistAction, type FormState } from "@/lib/actions";

export function AddToCartButton({
  label = "Add to cart",
  addedLabel = "Added",
  className,
  disabled,
  tone = "solid",
}: {
  label?: string;
  addedLabel?: string;
  className?: string;
  disabled?: boolean;
  tone?: "solid" | "light" | "lime";
}) {
  const { pending } = useFormStatus();
  const tones = {
    solid: "bg-ember text-white hover:bg-ink",
    light: "bg-white text-ink hover:bg-bone-soft",
    lime: "bg-lime text-void hover:bg-chalk",
  };
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className={cn(
        "inline-flex cursor-pointer items-center justify-center gap-2 rounded-[2px] px-4 py-2.5 text-[13px] font-semibold transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-60",
        tones[tone],
        className,
      )}
    >
      {pending ? (
        <>
          <Loader2 width={14} height={14} className="animate-spin" />
          Adding
        </>
      ) : disabled ? (
        <>
          <span aria-hidden="true">—</span>
          Sold out
        </>
      ) : (
        <>
          <ShoppingBag width={14} height={14} />
          {label}
        </>
      )}
    </button>
  );
}

/** A compact progressive-enhancement wrapper for product-card mutations. */
/**
 * The add-to-cart form.
 *
 * It reports what actually happened. A previous version of the product page
 * posted to an action that discarded its own result, so the button flashed
 * "Adding" and returned to normal whether the item was added or the request
 * failed — the shopper was told nothing either way.
 *
 * It accepts children so the product page's variant selects, quantity control
 * and both buttons live inside the same form and share one result. Pass
 * showButton={false} when the children carry their own buttons.
 */
export function AddToCartForm({
  productId,
  className,
  children,
  label = "Add",
  buttonClassName = "w-full py-2",
  disabled,
  showButton = true,
}: {
  productId: string;
  className?: string;
  children?: React.ReactNode;
  label?: string;
  buttonClassName?: string;
  disabled?: boolean;
  showButton?: boolean;
}) {
  const [state, action] = useActionState<FormState, FormData>(async (_previous, formData) => addToCartAction(formData), {});
  return (
    <form action={action} className={cn("flex min-w-0 flex-1 flex-col gap-1.5", className)}>
      <input type="hidden" name="productId" value={productId} />
      {children}
      {showButton ? <AddToCartButton label={label} className={buttonClassName} disabled={disabled} /> : null}
      {state?.error ? (
        <p role="alert" className="text-[11.5px] leading-tight font-medium text-ember">
          {state.error}
        </p>
      ) : null}
      {state?.message ? (
        <p role="status" className="text-[11.5px] leading-tight font-medium text-pine">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}

/** Wishlist feedback stays next to the heart instead of disappearing on error. */
export function WishlistForm({ productId, back, saved }: { productId: string; back: string; saved: boolean }) {
  return (
    <form action={toggleWishlistAction} className="flex flex-col items-center gap-1">
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="back" value={back} />
      <button type="submit" aria-label={saved ? "Remove from saved" : "Save for later"} className={cn(
        "grid h-9 w-9 cursor-pointer place-items-center rounded-[2px] border transition-colors",
        saved ? "border-ember/40 bg-ember/10 text-ember" : "border-line-warm text-ink-soft hover:border-ink/40 hover:text-ink",
      )}>
        <span aria-hidden="true">♡</span>
      </button>
    </form>
  );
}

export function SubmitButton({
  children,
  className,
  tone = "solid",
  pendingLabel,
}: {
  children: React.ReactNode;
  className?: string;
  tone?: "solid" | "outline" | "light";
  pendingLabel?: string;
}) {
  const { pending } = useFormStatus();
  const tones = {
    solid: "bg-ember text-white hover:bg-ink",
    outline: "border border-ink/25 text-ink hover:border-ink",
    light: "bg-lime text-void hover:bg-chalk",
  };
  return (
    <button
      type="submit"
      disabled={pending}
      className={cn(
        "inline-flex cursor-pointer items-center justify-center gap-2 rounded-[2px] px-4 py-2.5 text-[13px] font-semibold transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-60",
        tones[tone],
        className,
      )}
    >
      {pending ? (
        <>
          <Loader2 width={14} height={14} className="animate-spin" />
          {pendingLabel ?? "Working"}
        </>
      ) : (
        children
      )}
    </button>
  );
}

/** Submits its form whenever any control inside changes. */
export function AutoForm({
  children,
  className,
  action,
  method,
}: {
  children: React.ReactNode;
  className?: string;
  action?: string;
  method?: "get" | "post";
}) {
  const ref = React.useRef<HTMLFormElement>(null);
  return (
    <form
      ref={ref}
      action={action}
      method={method}
      onChange={() => ref.current?.requestSubmit()}
      className={className}
    >
      {children}
    </form>
  );
}

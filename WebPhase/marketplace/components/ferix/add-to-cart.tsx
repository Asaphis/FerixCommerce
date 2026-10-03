"use client";

import React from "react";
import { useFormStatus } from "react-dom";
import { Check, Loader2, ShoppingBag } from "lucide-react";
import { cn } from "@/lib/utils";

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
    solid: "bg-ink text-bone hover:bg-ember",
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
          <Check width={14} height={14} />
          {addedLabel}
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
    solid: "bg-ink text-bone hover:bg-ember",
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

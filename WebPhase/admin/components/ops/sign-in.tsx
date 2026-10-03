"use client";

import { useActionState } from "react";
import { AlertCircle, Check, LogIn } from "lucide-react";
import { Field, SubmitButton, inputClass } from "@/components/ops/controls";
import { signInAction, type FormState } from "@/lib/actions";

export function SignInForm() {
  const [state, action] = useActionState<FormState, FormData>(signInAction, {});
  return (
    <form action={action} className="grid gap-4">
      <Field title="Operator email">
        <input name="email" type="email" className={inputClass} placeholder="info@ferixas.com" autoComplete="email" required />
      </Field>
      <Field title="Password">
        <input
          name="password"
          type="password"
          className={inputClass}
          placeholder="••••••••"
          autoComplete="current-password"
          required
        />
      </Field>
      {state?.error ? (
        <p className="flex items-start gap-2 rounded-[2px] border border-rose/40 bg-rose/10 px-3 py-2.5 text-[12.5px] text-rose">
          <AlertCircle width={14} height={14} className="mt-[1px] shrink-0" />
          {state.error}
        </p>
      ) : null}
      {state?.message ? (
        <p className="flex items-start gap-2 rounded-[2px] border border-mint/40 bg-mint/10 px-3 py-2.5 text-[12.5px] text-mint">
          <Check width={14} height={14} className="mt-[1px] shrink-0" />
          {state.message}
        </p>
      ) : null}
      <SubmitButton pendingLabel="Signing in" className="w-full">
        <LogIn width={14} height={14} /> Sign in to the console
      </SubmitButton>
    </form>
  );
}

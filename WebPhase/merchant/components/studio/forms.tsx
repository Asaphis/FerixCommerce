"use client";

import { useActionState } from "react";
import { AlertCircle, Check, LogIn } from "lucide-react";
import { SubmitButton } from "@/components/studio/controls";
import { signInAction, type FormState } from "@/lib/actions";
import { cn } from "@/lib/utils";

export const inputClass =
  "h-11 w-full rounded-[2px] border border-hairline bg-panel-2 px-3 text-[13px] text-chalk outline-none transition-colors placeholder:text-chalk-dim/60 focus:border-chalk-dim";
export const selectClass = inputClass;
export const textareaClass = cn(inputClass, "h-[92px] resize-y py-2");
const labelClass = "font-mono text-[9.5px] uppercase tracking-[0.14em] text-chalk-dim";

export function Field({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className={labelClass}>{title}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

export function Notice({ state }: { state: FormState }) {
  if (state?.error)
    return (
      <p className="flex items-start gap-2 rounded-[2px] border border-ember/40 bg-ember/10 px-3 py-2.5 text-[12.5px] text-ember-soft">
        <AlertCircle width={14} height={14} className="mt-[1px] shrink-0" />
        {state.error}
      </p>
    );
  if (state?.message)
    return (
      <p className="flex items-start gap-2 rounded-[2px] border border-lime/35 bg-lime/10 px-3 py-2.5 text-[12.5px] text-lime">
        <Check width={14} height={14} className="mt-[1px] shrink-0" />
        {state.message}
      </p>
    );
  return null;
}

export function SignInForm() {
  const [state, action] = useActionState<FormState, FormData>(signInAction, {});
  return (
    <form action={action} className="grid gap-4">
      <Field title="Email address">
        <input
          name="email"
          type="email"
          className={inputClass}
          placeholder="owner@yourstore.ferixas.com"
          autoComplete="email"
          required
        />
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
      <Notice state={state} />
      <SubmitButton pendingLabel="Signing in" className="w-full">
        <LogIn width={14} height={14} /> Sign in to the workspace
      </SubmitButton>
    </form>
  );
}

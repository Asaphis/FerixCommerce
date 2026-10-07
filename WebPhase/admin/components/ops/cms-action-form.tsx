"use client";

import { useActionState, type ReactNode } from "react";
import type { FormState } from "@/lib/actions";
import { Notice } from "@/components/ops/notice";

type Action = (previous: FormState, formData: FormData) => Promise<FormState>;

export function CmsActionForm({
  action,
  children,
  className,
}: {
  action: Action;
  children: ReactNode;
  className?: string;
}) {
  const [state, formAction] = useActionState<FormState, FormData>(action, {});
  return (
    <form action={formAction} encType="multipart/form-data" className={className}>
      {children}
      <div className="mt-3"><Notice state={state} /></div>
    </form>
  );
}

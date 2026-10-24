"use client";

import { useActionState } from "react";
import { ConfirmAction } from "@/components/studio/confirm-action";
import { Notice } from "@/components/studio/forms";
import { deleteProductAction, type FormState } from "@/lib/actions";

export function ProductDeleteForm({ id }: { id: string }) {
  const [state, action] = useActionState<FormState, FormData>(deleteProductAction, {});
  return <div className="grid justify-items-end gap-2"><ConfirmAction action={action} fields={{ id }} label="Remove from catalogue" confirmLabel="Remove this product?" tone="danger" /><Notice state={state} /></div>;
}

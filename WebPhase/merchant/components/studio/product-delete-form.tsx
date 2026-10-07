"use client";

import { useActionState } from "react";
import { Trash2 } from "lucide-react";
import { SubmitButton } from "@/components/studio/controls";
import { Notice } from "@/components/studio/forms";
import { deleteProductAction, type FormState } from "@/lib/actions";

export function ProductDeleteForm({ id }: { id: string }) {
  const [state, action] = useActionState<FormState, FormData>(deleteProductAction, {});
  return <div className="grid justify-items-end gap-2"><form action={action}><input type="hidden" name="id" value={id} /><SubmitButton variant="danger" pendingLabel="Removing"><Trash2 width={13} height={13} /> Remove from catalogue</SubmitButton></form><Notice state={state} /></div>;
}

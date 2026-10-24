"use client";

import { useActionState } from "react";
import { Upload } from "lucide-react";
import { ConfirmAction } from "@/components/studio/confirm-action";
import { SubmitButton } from "@/components/studio/controls";
import { Field, Notice, inputClass, selectClass } from "@/components/studio/forms";
import { Panel, PanelHead } from "@/components/studio/bits";
import { addMediaAction, removeMediaAction, type FormState } from "@/lib/actions";

export function MediaForm() {
  const [state, action] = useActionState<FormState, FormData>(addMediaAction, {});

  return (
    <form action={action} encType="multipart/form-data" className="grid gap-3">
      <Panel>
        <PanelHead title="Add media" />
        <div className="grid gap-4">
          <Field title="Upload from device">
            <input name="file" type="file" accept="image/*,video/*" className={inputClass} />
          </Field>
          <Field title="Asset URL">
            <input
              name="url"
              type="url"
              className={inputClass}
              placeholder="https://example.com/photo.jpg"
            />
          </Field>
          <Field title="Alt text">
            <input name="alt" className={inputClass} placeholder="What the image shows" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field title="Folder">
              <input name="folder" className={inputClass} defaultValue="store" />
            </Field>
            <Field title="Kind">
              <select name="kind" defaultValue="image" className={selectClass}>
                <option value="image">Image</option>
                <option value="video">Video</option>
              </select>
            </Field>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
            <SubmitButton pendingLabel="Adding">
            <Upload width={13} height={13} /> Upload file or add link
          </SubmitButton>
          <Notice state={state} />
        </div>
      </Panel>
    </form>
  );
}

export function MediaDelete({ id, alt }: { id: string; alt: string }) {
  const [state, action] = useActionState<FormState, FormData>(removeMediaAction, {});
  return (
    <div className="grid gap-2">
      <ConfirmAction action={action} fields={{ id }} label="Delete" confirmLabel={`Delete ${alt || "asset"}?`} tone="danger" />
      <span className="block text-[11px]"><Notice state={state} /></span>
    </div>
  );
}

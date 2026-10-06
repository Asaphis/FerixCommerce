"use client";

import { useActionState } from "react";
import { Link2, Trash2 } from "lucide-react";
import { SubmitButton } from "@/components/studio/controls";
import { Field, Notice, inputClass, selectClass } from "@/components/studio/forms";
import { Panel, PanelHead } from "@/components/studio/bits";
import { addMediaAction, removeMediaAction, type FormState } from "@/lib/actions";

/** Pasting a URL is the only way in until the storage provider is configured. */
export function MediaForm() {
  const [state, action] = useActionState<FormState, FormData>(addMediaAction, {});

  return (
    <form action={action} className="grid gap-3">
      <Panel>
        <PanelHead title="Add media" hint="Link an image or video that is already online" />
        <div className="grid gap-4">
          <Field title="Asset URL">
            <input
              name="url"
              type="url"
              className={inputClass}
              placeholder="https://example.com/photo.jpg"
              required
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
            <Link2 width={13} height={13} /> Add to library
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
    <form action={action} aria-label={`Delete ${alt || "asset"}`} className="grid gap-2">
      <input type="hidden" name="id" value={id} />
      <SubmitButton variant="danger" pendingLabel="Removing" className="py-1.5">
        <Trash2 width={12} height={12} /> Delete
      </SubmitButton>
      <span className="block text-[11px]">
        <Notice state={state} />
      </span>
    </form>
  );
}

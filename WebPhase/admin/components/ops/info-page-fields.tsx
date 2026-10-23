"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { CmsActionForm } from "@/components/ops/cms-action-form";
import { Panel, PanelHead, Pill } from "@/components/ops/bits";
import { PageHeader, inputClass, textareaClass } from "@/components/ops/table";
import { Field, SubmitButton } from "@/components/ops/controls";
import { savePageContentAction } from "@/lib/actions";

type ItemField = { key: string; label: string; kind: "text" | "textarea" };
type FieldDef =
  | { kind: "text"; key: string; label: string }
  | { kind: "textarea"; key: string; label: string }
  | { kind: "objectlist"; key: string; label: string; itemFields: ItemField[] };

// The field schemas live in a JSON file so every page's fields can be
// declared without editing this component. Each entry maps a page's
// documentType to the list of fields its editor renders.
import SCHEMAS_JSON from "@/public/cms/schemas.json";

const SCHEMAS: Record<string, FieldDef[]> = SCHEMAS_JSON as Record<string, FieldDef[]>;

function ObjectListEditor({ def, initial }: { def: FieldDef & { kind: "objectlist" }; initial: Record<string, unknown>[] }) {
  const [items, setItems] = useState<Record<string, unknown>[]>(initial.length ? initial : [{}]);
  return (
    <div className="grid gap-3">
      {items.map((item, index) => (
        <div key={index} className="rounded-[10px] border border-hairline bg-panel-2 p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-chalk-dim">{def.label} {index + 1}</span>
            <button type="button" onClick={() => setItems(items.filter((_, i) => i !== index))} className="inline-flex items-center gap-1 rounded-[6px] border border-hairline px-2 py-1 text-[10.5px] text-chalk-dim hover:text-chalk">
              <Trash2 width={11} height={11} /> Remove
            </button>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {def.itemFields.map((f) => (
              <Field key={f.key} title={f.label}>
                {f.kind === "textarea" ? (
                  <textarea name={`${def.key}.${index}.${f.key}`} defaultValue={String(item[f.key] ?? "")} className={textareaClass} />
                ) : (
                  <input name={`${def.key}.${index}.${f.key}`} defaultValue={String(item[f.key] ?? "")} className={inputClass} />
                )}
              </Field>
            ))}
          </div>
        </div>
      ))}
      <button type="button" onClick={() => setItems([...items, {}])} className="inline-flex min-h-9 items-center gap-2 justify-self-start rounded-[10px] border border-hairline px-3 text-[11.5px] font-semibold text-chalk hover:bg-panel-2">
        <Plus width={12} height={12} /> Add {def.label.toLowerCase()}
      </button>
      <input type="hidden" name={`${def.key}__count`} value={items.length} />
    </div>
  );
}

export function InfoPageFields({ page }: { page: { id: string; title: string; documentType: string; status: string; data?: { content?: Record<string, unknown> } } }) {
  const content = (page.data?.content ?? {}) as Record<string, unknown>;
  const schema = SCHEMAS[page.documentType] ?? [];

  if (!schema.length) {
    return (
      <div className="grid min-w-0 gap-5">
        <PageHeader back={<Link href="/cms" className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-chalk-dim hover:text-chalk"><ArrowLeft width={13} height={13} /> Content</Link>} eyebrow={page.documentType} title={page.title} />
        <Panel><PanelHead title="No field schema yet" hint="Add this page's fields in info-page-fields.tsx." /></Panel>
      </div>
    );
  }

  return (
    <div className="grid min-w-0 gap-5">
      <PageHeader back={<Link href="/cms" className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-chalk-dim hover:text-chalk"><ArrowLeft width={13} height={13} /> Content</Link>} eyebrow={page.documentType} title={page.title} action={<Pill tone="mint">{page.status}</Pill>} />
      <Panel>
        <PanelHead title="Content" hint="Edit the words this page shows." />
        <CmsActionForm action={savePageContentAction} className="grid gap-4">
          <input type="hidden" name="id" value={page.id} />
          <input type="hidden" name="schema" value={page.documentType} />
          {schema.map((def) => {
            const value = content[def.key];
            if (def.kind === "text") {
              return <Field key={def.key} title={def.label}><input name={def.key} defaultValue={String(value ?? "")} className={inputClass} /></Field>;
            }
            if (def.kind === "textarea") {
              return <Field key={def.key} title={def.label}><textarea name={def.key} defaultValue={String(value ?? "")} className={textareaClass} /></Field>;
            }
            const arr = Array.isArray(value) ? (value as Record<string, unknown>[]) : [];
            return <ObjectListEditor key={def.key} def={def} initial={arr} />;
          })}
          <SubmitButton pendingLabel="Saving">Save changes</SubmitButton>
        </CmsActionForm>
      </Panel>
    </div>
  );
}

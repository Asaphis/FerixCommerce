"use client";

import { useMemo, useState } from "react";
import { CmsActionForm } from "@/components/ops/cms-action-form";
import { Field, SubmitButton } from "@/components/ops/controls";
import { inputClass, selectClass } from "@/components/ops/table";
import { addCmsSectionAction } from "@/lib/actions";
import type { CmsSectionSetting, CmsSectionTypes } from "@/lib/api";

function inputType(kind: CmsSectionSetting["kind"]): string {
  if (kind === "number") return "number";
  if (kind === "datetime") return "datetime-local";
  if (kind === "color") return "color";
  return "text";
}

/** Product is the only family whose builder asks for manual or automatic data. */
export function ProductSectionBuilder({ pageId, sectionTypes }: {
  pageId: string;
  sectionTypes: CmsSectionTypes;
}) {
  const sources = useMemo(
    () => sectionTypes.automaticSources.filter((source) => source.value !== "related"),
    [sectionTypes.automaticSources],
  );
  const [mode, setMode] = useState<"manual" | "automatic">("manual");
  const [source, setSource] = useState(sources[0]?.value ?? "trending");
  const selectedSource = sources.find((item) => item.value === source);

  return (
    <CmsActionForm action={addCmsSectionAction} className="grid gap-3 rounded-[12px] border border-hairline bg-panel-2 p-3.5">
      <input type="hidden" name="id" value={pageId} />
      <input type="hidden" name="selectionMode" value={mode} />
      {mode === "manual" ? <input type="hidden" name="source" value="assigned" /> : null}

      <Field title="Section name">
        <input name="name" required className={inputClass} placeholder="Enter any name you want" />
      </Field>
      <Field title="Product display layout">
        <select name="type" defaultValue="product_carousel" className={selectClass}>
          <option value="product_carousel">Product row / carousel</option>
          <option value="product_grid">Product grid</option>
        </select>
      </Field>
      <Field title="How does this section get products?">
        <select value={mode} onChange={(event) => setMode(event.target.value as "manual" | "automatic")} className={selectClass}>
          <option value="manual">Manual — assign products from upload or edit</option>
          <option value="automatic">Automatic — use a configured product feed</option>
        </select>
      </Field>

      {mode === "automatic" ? (
        <>
          <Field title="Automatic data source">
            <select name="source" value={source} onChange={(event) => setSource(event.target.value)} className={selectClass} required>
              {sources.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
            {selectedSource?.hint ? <span className="text-[11px] leading-relaxed text-chalk-dim">{selectedSource.hint}</span> : null}
          </Field>
          {selectedSource?.config.map((setting) => (
            <Field key={setting.key} title={setting.label}>
              <input
                name={`sourceConfig__${setting.key}`}
                type={inputType(setting.kind)}
                required={setting.required}
                defaultValue={setting.default == null ? "" : String(setting.default)}
                placeholder={setting.placeholder ?? ""}
                min={setting.kind === "number" ? 0 : undefined}
                className={inputClass}
              />
            </Field>
          ))}
        </>
      ) : null}

      <Field title="Maximum products to show">
        <input name="limit" type="number" min="1" max="60" defaultValue="8" className={inputClass} />
      </Field>
      <p className="text-[11px] leading-relaxed text-chalk-dim">
        {mode === "manual"
          ? "This section will not fetch products. Assign new or existing products to it from their product form; its display and schedule are configured in the CMS."
          : "The catalogue will select products using the source and rules above. It will not appear in the product assignment form."}
      </p>
      <SubmitButton pendingLabel="Adding" className="justify-self-start">Create product section</SubmitButton>
    </CmsActionForm>
  );
}

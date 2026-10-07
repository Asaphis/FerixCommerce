"use client";
import { useActionState, useState } from "react";
import { ImagePlus, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import type { AdminBrand } from "@/lib/api";
import { saveBrandAction, deleteBrandAction, type FormState } from "@/lib/actions";
import { Notice } from "@/components/ops/notice";
import { Panel, PanelHead, Pill } from "@/components/ops/bits";
import { PageHeader } from "@/components/ops/table";
import { Field, SubmitButton } from "@/components/ops/controls";
import { inputClass as tableInputClass } from "@/components/ops/table";
import { OpsButton } from "@/components/ops/controls";
import { MediaUploadField } from "@/components/ops/media-upload-field";

type Props = { initialBrands: AdminBrand[]; loadError?: string };
const blank: AdminBrand = { id: "", name: "", slug: "", description: "", imageUrl: "", featured: false, visible: true, position: 1 };
export default function BrandsManager({ initialBrands, loadError }: Props) {
  const [selected, setSelected] = useState<AdminBrand | null>(null);
  const [saveState, saveAction] = useActionState<FormState, FormData>(saveBrandAction, {});
  const [deleteState, deleteAction] = useActionState<FormState, FormData>(deleteBrandAction, {});
  const active = selected ?? blank;
  return <div className="grid gap-6">
    <PageHeader eyebrow="Content / catalogue" title="Brands" description="Manage the brand directory used across the storefront." action={<OpsButton variant="primary" onClick={() => setSelected(blank)}><Plus width={15} /> New brand</OpsButton>} />
    {loadError ? <div className="rounded-[.55rem] border border-rose/40 bg-rose/10 px-4 py-3 text-[13px] text-rose">Could not load brands: {loadError}</div> : null}
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(320px,390px)] lg:items-start">
      <Panel flush><div className="p-4 sm:p-5"><PanelHead title="Brand directory" hint={`${initialBrands.length} saved brands`} />
        {initialBrands.length ? <div className="mt-4 grid gap-2">{initialBrands.map((brand) => <div key={brand.id} className="flex min-w-0 items-center gap-3 rounded-[.55rem] border border-hairline bg-panel px-3 py-3 sm:px-4">
          <div className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-[.45rem] bg-panel-2 text-ink-soft">{brand.imageUrl ? <img src={brand.imageUrl} alt="" className="size-full object-cover" /> : <ImagePlus width={17} />}</div>
          <div className="min-w-0 flex-1"><p className="truncate text-[14px] font-semibold text-chalk">{brand.name}</p><p className="truncate font-mono text-[10px] uppercase tracking-[.12em] text-chalk-dim">/{brand.slug} · pos {brand.position}</p></div>
          <Pill tone={brand.visible ? "mint" : "neutral"}>{brand.visible ? "Visible" : "Hidden"}</Pill>{brand.featured ? <Pill tone="amber">Featured</Pill> : null}
          <button type="button" aria-label={`Edit ${brand.name}`} onClick={() => setSelected(brand)} className="grid size-10 shrink-0 place-items-center rounded-[.45rem] text-chalk-dim hover:bg-panel-2 hover:text-chalk"><Pencil width={15} /></button>
        </div>)}</div> : <div className="mt-4 rounded-[.55rem] border border-dashed border-hairline px-5 py-12 text-center"><p className="text-[14px] font-semibold text-chalk">No brands yet</p><p className="mt-1 text-[13px] text-chalk-dim">Create the first directory entry to make it available to shoppers.</p></div>}
      </div></Panel>
      <Panel><PanelHead title={active.id ? "Edit brand" : "New brand"} hint="Changes save to the platform CMS." />
        <form action={saveAction} className="mt-4 grid gap-3"><input type="hidden" name="id" value={active.id} />
          <Field title="Name"><input name="name" required defaultValue={active.name} key={`${active.id}-name`} className={tableInputClass} placeholder="Northstar Audio" /></Field>
          <Field title="Slug"><input name="slug" required defaultValue={active.slug} key={`${active.id}-slug`} className={tableInputClass} placeholder="northstar-audio" /></Field>
          <Field title="Description"><textarea name="description" defaultValue={active.description} key={`${active.id}-description`} className={`${tableInputClass} min-h-[96px]`} rows={3} placeholder="Short shopper-facing description." /></Field>
          <MediaUploadField key={`brand-image-${active.id || "new"}`} urlName="imageUrl" fileName="imageFile" defaultUrl={active.imageUrl} kind="image" urlLabel="Brand image URL" fileLabel="Upload brand image" />
          <div className="grid gap-3 sm:grid-cols-2"><Field title="Position"><input name="position" type="number" min="1" defaultValue={active.position} key={`${active.id}-position`} className={tableInputClass} /></Field><div className="flex items-end gap-4 pb-2"><label className="flex items-center gap-2 text-[12px] text-chalk"><input type="checkbox" name="visible" defaultChecked={active.visible} key={`${active.id}-visible`} className="size-4 accent-[var(--ember)]" /> Visible</label><label className="flex items-center gap-2 text-[12px] text-chalk"><input type="checkbox" name="featured" defaultChecked={active.featured} key={`${active.id}-featured`} className="size-4 accent-[var(--ember)]" /> Featured</label></div></div>
          <Notice state={saveState} /><div className="flex flex-wrap gap-2"><SubmitButton pendingLabel="Saving"><Save width={14} /> Save brand</SubmitButton><OpsButton type="button" variant="ghost" onClick={() => setSelected(null)}><X width={14} /> Cancel</OpsButton></div>
        </form>
        {active.id ? <form action={deleteAction} onSubmit={(event) => { if (!window.confirm(`Delete ${active.name}? This cannot be undone.`)) event.preventDefault(); }} className="mt-5 border-t border-hairline pt-4"><input type="hidden" name="id" value={active.id} /><Notice state={deleteState} /><SubmitButton variant="danger" pendingLabel="Deleting"><Trash2 width={14} /> Delete brand</SubmitButton></form> : null}
      </Panel>
    </div>
  </div>;
}

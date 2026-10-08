import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, Eye, EyeOff, ExternalLink, FileText, GripVertical, Image as ImageIcon, Layers3, PencilLine } from "lucide-react";
import { requireAdmin } from "@/lib/data";
import { getDocument } from "@/lib/api";
import { Field, SubmitButton } from "@/components/ops/controls";
import { inputClass, selectClass } from "@/components/ops/table";
import { Empty, Eyebrow, Panel, PanelHead, Pill } from "@/components/ops/bits";
import { CmsActionForm } from "@/components/ops/cms-action-form";
import { publishHomepageAction, restoreVersionAction, saveHomepageAction } from "@/lib/ops-actions";
import { titleCase } from "@/lib/format";

const DOCUMENT_ID = "doc_marketplace_home";
const TYPES = ["hero_banner", "promo_strip", "category_grid", "product_carousel", "featured_collection", "featured_stores", "editorial_story", "newsletter_signup", "rich_text"];
const SECTION_DESTINATIONS: Record<string, { href: string; label: string }> = {
  hero_banner: { href: "/cms/banners", label: "Manage hero banners" },
  promo_strip: { href: "/cms/banners", label: "Manage promotions" },
  category_grid: { href: "/cms/categories", label: "Manage categories" },
  product_carousel: { href: "/catalog", label: "Manage products" },
  featured_collection: { href: "/cms/collections", label: "Manage collections" },
  featured_stores: { href: "/merchants", label: "Manage stores" },
  editorial_story: { href: "/cms/media", label: "Choose media" },
};

export default async function HomepageCmsPage({ searchParams }: { searchParams: Promise<{ section?: string }> }) {
  const [{ section: requestedSection }, { session }] = await Promise.all([searchParams, requireAdmin()]);
  const { document, versions } = await getDocument(session, DOCUMENT_ID);
  const sections = [...(document.data.sections ?? [])].sort((a, b) => a.position - b.position);
  const selected = sections.find((section) => section.id === requestedSection) ?? sections[0];
  const selectedIndex = selected ? sections.findIndex((section) => section.id === selected.id) : -1;
  const destination = selected ? SECTION_DESTINATIONS[selected.type] : undefined;

  return (
    <div className="grid min-w-0 gap-4 sm:gap-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link href="/cms" className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-chalk-dim transition-colors hover:text-signal"><ArrowLeft width={13} height={13} /> Content studio</Link>
          <h1 className="mt-2 font-display text-[23px] font-bold text-chalk sm:text-[27px]">Homepage sections</h1>
          
        </div>
        <div className="flex items-center gap-2"><Pill tone={document.status === "published" ? "mint" : "amber"}>{document.status}</Pill><form action={publishHomepageAction}><input type="hidden" name="documentId" value={DOCUMENT_ID} /><SubmitButton pendingLabel="Publishing">Publish changes</SubmitButton></form></div>
      </header>

      <div className="grid grid-cols-3 gap-1.5 rounded-[3px] border border-hairline bg-white p-2 sm:gap-2 sm:p-2.5">
        {[{ n: "01", title: "Choose page", Icon: FileText, active: true }, { n: "02", title: "Choose section", Icon: Layers3, active: Boolean(selected) }, { n: "03", title: "Manage content", Icon: PencilLine, active: Boolean(selected) }].map(({ n, title, Icon, active }) => <div key={n} className={`flex min-h-10 items-center gap-1.5 rounded-[2px] px-2 sm:gap-2.5 sm:px-3 ${active ? "bg-[#fff0e9] text-signal" : "text-chalk-dim"}`}><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white text-[9px] font-bold shadow-sm">{active ? <Check width={12} height={12} /> : n}</span><Icon width={13} height={13} className="hidden shrink-0 sm:block" /><span className="truncate text-[9px] font-semibold sm:text-[11px]">{title}</span></div>)}
      </div>

      <div className="grid min-w-0 gap-3 lg:grid-cols-[270px_minmax(0,1fr)]">
        <Panel className="h-fit p-3 sm:p-4">
          <div className="mb-3 flex items-center justify-between gap-2"><div><Eyebrow>Page</Eyebrow><p className="mt-1 text-[13px] font-bold text-chalk">Shopper homepage</p></div><Pill tone="signal">Live page</Pill></div>
          <div className="mb-3 rounded-[2px] border border-hairline bg-white px-3 py-2.5"><p className="text-[10px] text-chalk-dim">Page selected</p><p className="mt-0.5 text-[12px] font-semibold text-chalk">Homepage</p></div>
          <div className="mb-2 flex items-center justify-between gap-2"><Eyebrow>Sections</Eyebrow><span className="font-mono text-[9px] text-chalk-dim">{sections.length}</span></div>
          {sections.length ? <nav aria-label="Homepage sections" className="grid gap-1">{sections.map((section, index) => {
            const active = section.id === selected?.id;
            return <Link key={section.id} href={`/cms/homepage?section=${encodeURIComponent(section.id)}`} className={`flex min-h-[44px] items-center gap-2 rounded-[2px] border px-2.5 py-2 transition-colors ${active ? "border-signal/40 bg-[#fff0e9]" : "border-transparent hover:border-hairline hover:bg-white"}`}><GripVertical width={13} height={13} className="shrink-0 text-chalk-dim/60" /><span className={`grid h-6 w-6 shrink-0 place-items-center rounded-[2px] text-[10px] font-bold ${active ? "bg-signal text-white" : "bg-panel-2 text-chalk-dim"}`}>{index + 1}</span><span className="min-w-0 flex-1"><span className={`block truncate text-[11px] font-semibold ${active ? "text-signal" : "text-chalk"}`}>{section.title || titleCase(section.type)}</span><span className="block truncate text-[9px] text-chalk-dim">{titleCase(section.type)}</span></span>{section.visible ? <Eye width={13} height={13} className="shrink-0 text-[#2d875a]" /> : <EyeOff width={13} height={13} className="shrink-0 text-chalk-dim" />}</Link>;
          })}</nav> : <Empty title="No sections" body="Homepage sections will appear here once configured." />}
          <Link href="/" target="_blank" className="mt-3 flex min-h-9 items-center justify-center gap-2 border-t border-hairline pt-2 text-[10px] font-semibold text-signal">View live page <ExternalLink width={12} height={12} /></Link>
        </Panel>

        {selected ? <div className="grid min-w-0 gap-3">
          <Panel className="grid gap-3 p-3.5 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-hairline pb-3">
              <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-[2px] bg-[#fff0e9] text-signal"><ImageIcon width={15} height={15} /></span><div><Eyebrow>Shopper homepage · Section {selectedIndex + 1}</Eyebrow><h2 className="mt-0.5 truncate font-display text-[17px] font-bold text-chalk sm:text-[20px]">{selected.title || titleCase(selected.type)}</h2></div></div><p className="mt-2 text-[10px] text-chalk-dim">{selected.id} · {selected.visible ? "Visible" : "Hidden"}</p></div>
              {destination ? <Link href={destination.href} className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-[2px] border border-hairline bg-white px-3 text-[10px] font-semibold text-signal transition-colors hover:border-signal">{destination.label}<ArrowRight width={12} height={12} /></Link> : null}
            </div>

            <CmsActionForm action={saveHomepageAction} className="grid gap-3">
              <input type="hidden" name="documentId" value={DOCUMENT_ID} />
              {sections.filter((section) => section.id !== selected.id).map((section) => <div key={section.id} className="hidden"><input type="hidden" name="sectionId" value={section.id} /><input type="hidden" name={`type_${section.id}`} value={section.type} /><input type="hidden" name={`title_${section.id}`} value={section.title ?? ""} /><input type="hidden" name={`subtitle_${section.id}`} value={section.subtitle ?? ""} /><input type="hidden" name={`ctaLabel_${section.id}`} value={section.ctaLabel ?? ""} /><input type="hidden" name={`ctaHref_${section.id}`} value={section.ctaHref ?? ""} /><input type="hidden" name={`position_${section.id}`} value={section.position ?? 0} /><input type="hidden" name={`visible_${section.id}`} value={section.visible ? "on" : "off"} /></div>)}
              <input type="hidden" name="sectionId" value={selected.id} />
              <div className="grid gap-3 sm:grid-cols-2">
                <Field title="Section title"><input name={`title_${selected.id}`} defaultValue={selected.title ?? ""} className={inputClass} /></Field>
                <Field title="Section type"><select name={`type_${selected.id}`} defaultValue={selected.type} className={selectClass}>{TYPES.map((type) => <option key={type} value={type}>{titleCase(type)}</option>)}</select></Field>
                <Field title="Supporting line"><input name={`subtitle_${selected.id}`} defaultValue={selected.subtitle ?? ""} className={inputClass} /></Field>
                <Field title="Position"><input name={`position_${selected.id}`} type="number" min={1} defaultValue={selected.position || selectedIndex + 1} className={inputClass} /></Field>
                <Field title="Action label"><input name={`ctaLabel_${selected.id}`} defaultValue={selected.ctaLabel ?? ""} className={inputClass} /></Field>
                <Field title="Action link"><input name={`ctaHref_${selected.id}`} defaultValue={selected.ctaHref ?? ""} placeholder="/browse" className={inputClass} /></Field>
              </div>
              <label className="flex min-h-10 items-center gap-2 rounded-[2px] border border-hairline bg-white px-3 text-[11px] font-medium text-chalk"><input type="checkbox" name={`visible_${selected.id}`} defaultChecked={selected.visible} className="size-4 accent-signal" /> Show this section on the live homepage</label>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-hairline pt-3"><div><SubmitButton pendingLabel="Saving draft">Save draft</SubmitButton><span className="ml-2 text-[10px] text-chalk-dim">Changes remain a draft until published.</span></div><span className="text-[9px] text-chalk-dim">Updated by {document.updatedBy || "—"}</span></div>
            </CmsActionForm>
          </Panel>

          <Panel className="p-3.5 sm:p-4"><PanelHead title="Content for this section" />{destination ? <Link href={destination.href} className="mt-2 flex min-h-11 items-center justify-between gap-3 rounded-[2px] border border-hairline bg-white px-3 text-[11px] font-semibold text-chalk transition-colors hover:border-signal"><span>{destination.label}</span><ArrowRight width={13} height={13} className="text-signal" /></Link> : <p className="mt-2 text-[11px] text-chalk-dim">Content editing for this section type is coming soon.</p>}</Panel>
        </div> : <Panel className="p-5"><Empty title="Choose a section" body="Select a homepage section to manage its content and placement." /></Panel>}
      </div>

      <details className="rounded-[3px] border border-hairline bg-panel p-3.5 sm:p-4">
        <summary className="cursor-pointer text-[12px] font-semibold text-chalk">Version history <span className="ml-1 font-mono text-[10px] font-normal text-chalk-dim">{versions.length}</span></summary>
        <div className="mt-3 grid gap-2">{versions.length ? versions.map((version) => <div key={version.id} className="flex flex-wrap items-center justify-between gap-3 rounded-[2px] border border-hairline bg-white px-3 py-2.5"><div><p className="font-mono text-[11px] text-chalk">Version {version.version}</p><p className="mt-0.5 text-[10px] text-chalk-dim">{version.note} · {version.createdBy} · {version.status}</p></div><form action={restoreVersionAction}><input type="hidden" name="versionId" value={version.id} /><SubmitButton variant="outline" pendingLabel="Restoring">Restore</SubmitButton></form></div>) : <p className="text-[11px] text-chalk-dim">No versions saved yet.</p>}</div>
      </details>
    </div>
  );
}

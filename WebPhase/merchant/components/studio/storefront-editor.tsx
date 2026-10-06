"use client";

import { useActionState, useState } from "react";
import { Plus, Save, Send, Trash2 } from "lucide-react";
import type { StorefrontSection } from "@/lib/api";
import { SubmitButton } from "@/components/studio/controls";
import { Field, Notice, inputClass } from "@/components/studio/forms";
import { Panel, PanelHead, Pill } from "@/components/studio/bits";
import { publishStorefrontAction, saveStorefrontAction, type FormState } from "@/lib/actions";

type NavEntry = { label: string; href: string };

/** Navigation links and section copy — the parts of the document that are safe to edit today. */
export function StorefrontEditor({
  navigation,
  sections,
}: {
  navigation: NavEntry[];
  sections: StorefrontSection[];
}) {
  const [state, action] = useActionState<FormState, FormData>(saveStorefrontAction, {});
  const [links, setLinks] = useState<NavEntry[]>(navigation);

  const update = (index: number, patch: Partial<NavEntry>) =>
    setLinks((current) => current.map((link, at) => (at === index ? { ...link, ...patch } : link)));

  return (
    <form action={action} className="grid gap-3">
      <input type="hidden" name="navCount" value={links.length} />
      <input type="hidden" name="sectionCount" value={sections.length} />

      <Panel>
        <PanelHead title="Navigation" hint="The menu shoppers click in your storefront" />
        {links.length ? (
          <div className="grid gap-2.5">
            {links.map((link, index) => (
              <div
                key={index}
                className="grid gap-2.5 rounded-[2px] border border-hairline p-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
              >
                <Field title="Label">
                  <input
                    name={`navLabel.${index}`}
                    value={link.label}
                    onChange={(event) => update(index, { label: event.target.value })}
                    className={inputClass}
                    placeholder="Shop"
                  />
                </Field>
                <Field title="Link">
                  <input
                    name={`navHref.${index}`}
                    value={link.href}
                    onChange={(event) => update(index, { href: event.target.value })}
                    className={inputClass}
                    placeholder="/products"
                  />
                </Field>
                <button
                  type="button"
                  onClick={() => setLinks((current) => current.filter((_, at) => at !== index))}
                  aria-label={`Remove ${link.label || "link"}`}
                  className="inline-flex h-10 cursor-pointer items-center justify-center gap-1.5 rounded-[2px] border border-hairline px-3 font-mono text-[10px] uppercase tracking-[0.14em] text-chalk-dim transition-colors hover:border-ember/40 hover:text-ember-soft"
                >
                  <Trash2 width={12} height={12} /> Remove
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[12.5px] text-chalk-dim">No links yet. Add the first one below.</p>
        )}
        <button
          type="button"
          onClick={() => setLinks((current) => [...current, { label: "", href: "" }])}
          className="mt-3 inline-flex cursor-pointer items-center gap-1.5 rounded-[2px] border border-hairline px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-chalk-dim transition-colors hover:border-chalk-dim hover:text-chalk"
        >
          <Plus width={11} height={11} /> Add link
        </button>
      </Panel>

      <Panel>
        <PanelHead title="Sections" hint="The blocks stacked down your storefront page" />
        {sections.length ? (
          <div className="grid gap-2.5">
            {sections.map((section, index) => (
              <div key={section.id} className="grid gap-3 rounded-[2px] border border-hairline p-3.5">
                <input type="hidden" name={`sectionId.${index}`} value={section.id} />
                <input type="hidden" name={`sectionType.${index}`} value={section.type} />
                <input type="hidden" name={`sectionPosition.${index}`} value={section.position} />
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="flex flex-wrap items-center gap-2">
                    <Pill>{section.type}</Pill>
                    <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-chalk-dim">
                      position {section.position}
                    </span>
                  </span>
                  <label className="inline-flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      name={`sectionVisible.${index}`}
                      defaultChecked={section.visible}
                      className="h-4 w-4 accent-[#c9f24d]"
                    />
                    <span className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-chalk-dim">Visible</span>
                  </label>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field title="Title">
                    <input name={`sectionTitle.${index}`} defaultValue={section.title ?? ""} className={inputClass} />
                  </Field>
                  <Field title="Subtitle">
                    <input
                      name={`sectionSubtitle.${index}`}
                      defaultValue={section.subtitle ?? ""}
                      className={inputClass}
                    />
                  </Field>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[12.5px] text-chalk-dim">This document has no sections yet.</p>
        )}
      </Panel>

      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton pendingLabel="Saving">
          <Save width={14} height={14} /> Save storefront
        </SubmitButton>
        <Notice state={state} />
      </div>
    </form>
  );
}

/** Publishes the stored document. The visual engine is not involved. */
export function PublishStorefront({ status }: { status: string }) {
  const [state, action] = useActionState<FormState, FormData>(publishStorefrontAction, {});
  const live = status === "published";
  return (
    <form action={action} className="grid gap-3">
      <SubmitButton variant={live ? "outline" : "primary"} pendingLabel={live ? "Republishing" : "Publishing"}>
        <Send width={13} height={13} /> {live ? "Publish again" : "Publish storefront"}
      </SubmitButton>
      <Notice state={state} />
    </form>
  );
}

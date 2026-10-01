"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  Clock,
  History,
  LayoutPanelTop,
  Laptop,
  Monitor,
  Redo2,
  Rocket,
  Save,
  Send,
  Smartphone,
  Sparkles,
  Tablet,
  Undo2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { STORE_TEMPLATES } from "@/lib/data";
import { dateShort, relative } from "@/lib/format";
import { TEMPLATE_PRESETS } from "@/lib/design/defaults";
import { SUGGESTED_PROMPTS, useDesign } from "@/lib/design/design-store";
import { useFerixas } from "@/lib/store";
import type { Device } from "@/lib/design/tree";
import { cn } from "@/lib/utils";

export function DesignToolbar({
  onOpenAi,
  onOpenHistory,
  onOpenTemplates,
  previewing,
  onTogglePreview,
  showBindings,
  onToggleBindings,
  aiOpen,
}: {
  onOpenAi: () => void;
  onOpenHistory: () => void;
  onOpenTemplates: () => void;
  previewing: boolean;
  onTogglePreview: () => void;
  showBindings: boolean;
  onToggleBindings: () => void;
  aiOpen: boolean;
}) {
  const { merchant } = useFerixas();
  const { device, setDevice, undo, redo, canUndo, canRedo, saveDraft, publish, dirty, doc } = useDesign();

  const devices: [Device, typeof Monitor][] = [
    ["desktop", Monitor],
    ["tablet", Tablet],
    ["mobile", Smartphone],
  ];

  return (
    <header className="border-b border-hairline bg-panel">
      <div className="flex flex-wrap items-center gap-2 px-3 py-2.5">
        <Link
          href="/merchant"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-[2px] text-chalk-dim transition-colors hover:bg-panel-2 hover:text-chalk"
          aria-label="Back to the studio"
        >
          <ArrowLeft width={15} height={15} />
        </Link>
        <div className="min-w-0">
          <p className="flex items-center gap-2 font-display text-[13.5px] font-semibold text-chalk">
            Design Engine
            {dirty ? (
              <span className="rounded-[2px] bg-sand/15 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-sand">
                Unsaved
              </span>
            ) : (
              <span className="rounded-[2px] bg-lime/12 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-lime">
                Saved
              </span>
            )}
          </p>
          <p className="hidden font-mono text-[9.5px] uppercase tracking-[0.14em] text-chalk-dim sm:block">
            {merchant.name} \u00b7 {doc.template} theme
          </p>
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-1.5">
          <div className="hidden items-center gap-0.5 rounded-[2px] border border-hairline p-[3px] md:flex">
            {devices.map(([value, Icon]) => (
              <button
                key={value}
                type="button"
                onClick={() => setDevice(value)}
                aria-label={`${value} preview`}
                className={cn(
                  "grid h-7 w-8 cursor-pointer place-items-center rounded-[2px] transition-colors",
                  device === value ? "bg-panel-2 text-lime" : "text-chalk-dim hover:text-chalk",
                )}
              >
                <Icon width={14} height={14} />
              </button>
            ))}
          </div>

          <IconButton label="Undo" onClick={undo} disabled={!canUndo}>
            <Undo2 width={14} height={14} />
          </IconButton>
          <IconButton label="Redo" onClick={redo} disabled={!canRedo}>
            <Redo2 width={14} height={14} />
          </IconButton>
          <IconButton label="Version history" onClick={onOpenHistory}>
            <History width={14} height={14} />
          </IconButton>
          <IconButton label="Templates" onClick={onOpenTemplates}>
            <LayoutPanelTop width={14} height={14} />
          </IconButton>
          <button
            type="button"
            onClick={onToggleBindings}
            className={cn(
              "hidden h-8 cursor-pointer items-center gap-1.5 rounded-[2px] border px-2.5 font-mono text-[10px] uppercase tracking-[0.12em] transition-colors lg:inline-flex",
              showBindings ? "border-lime/40 bg-lime/10 text-lime" : "border-hairline text-chalk-dim hover:text-chalk",
            )}
          >
            Bindings
          </button>
          <button
            type="button"
            onClick={onTogglePreview}
            className={cn(
              "h-8 cursor-pointer rounded-[2px] border px-2.5 font-mono text-[10px] uppercase tracking-[0.12em] transition-colors",
              previewing ? "border-lime/40 bg-lime/10 text-lime" : "border-hairline text-chalk-dim hover:text-chalk",
            )}
          >
            {previewing ? "Editing off" : "Preview"}
          </button>
          <button
            type="button"
            onClick={() => {
              saveDraft();
              toast.success("Draft saved \u2014 your storefront still shows the published version");
            }}
            className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-[2px] border border-hairline px-2.5 font-mono text-[10px] uppercase tracking-[0.12em] text-chalk transition-colors hover:border-chalk-dim"
          >
            <Save width={13} height={13} />
            Save
          </button>
          <button
            type="button"
            onClick={onOpenAi}
            className={cn(
              "inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-[2px] border px-2.5 font-mono text-[10px] uppercase tracking-[0.12em] transition-colors",
              aiOpen ? "border-lime bg-lime text-void" : "border-lime/40 text-lime hover:bg-lime/10",
            )}
          >
            <Sparkles width={13} height={13} />
            AI assistant
          </button>
          <button
            type="button"
            onClick={() => {
              publish();
              toast.success(`${merchant.name} published \u2014 the storefront now shows this design`);
            }}
            className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-[2px] bg-lime px-3 font-mono text-[10px] uppercase tracking-[0.12em] text-void transition-colors hover:bg-chalk"
          >
            <Rocket width={13} height={13} />
            Publish
          </button>
        </div>
      </div>
    </header>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className="grid h-8 w-8 cursor-pointer place-items-center rounded-[2px] border border-hairline text-chalk-dim transition-colors hover:text-chalk disabled:cursor-not-allowed disabled:opacity-35"
    >
      {children}
    </button>
  );
}

export function Drawer({
  open,
  onClose,
  title,
  subtitle,
  side = "right",
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  side?: "left" | "right";
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="absolute inset-0 z-40 flex">
      <button
        type="button"
        aria-label="Close panel"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-void/60 backdrop-blur-[2px]"
      />
      <div
        className={cn(
          "absolute bottom-0 top-0 flex w-full max-w-[420px] flex-col border-hairline bg-panel shadow-[0_0_60px_-20px_rgba(0,0,0,0.8)]",
          side === "right" ? "right-0 border-l" : "left-0 border-r",
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-hairline px-4 py-3.5">
          <div>
            <h2 className="font-display text-[14.5px] font-semibold text-chalk">{title}</h2>
            {subtitle ? (
              <p className="mt-0.5 font-mono text-[10px] text-chalk-dim">{subtitle}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-7 w-7 shrink-0 cursor-pointer place-items-center rounded-[2px] border border-hairline text-chalk-dim hover:text-chalk"
          >
            <X width={13} height={13} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

export function HistoryPanel() {
  const { doc, revertTo, publishedNodes, publish } = useDesign();
  return (
    <div className="p-4">
      <div className="rounded-[2px] border border-hairline p-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-lime">Live storefront</p>
        <p className="mt-1.5 text-[12.5px] text-chalk">
          {doc.publishedVersionId
            ? doc.versions.find((v) => v.id === doc.publishedVersionId)?.label ?? "Published design"
            : "Nothing published yet"}
        </p>
        <p className="mt-1 font-mono text-[10px] text-chalk-dim">
          {publishedNodes.length} sections rendering on /store/{doc.merchantId}
        </p>
        <button
          type="button"
          onClick={() => {
            publish();
            toast.success("Publishing the current draft");
          }}
          className="mt-3 h-8 w-full cursor-pointer rounded-[2px] bg-lime font-mono text-[10px] uppercase tracking-[0.12em] text-void transition-colors hover:bg-chalk"
        >
          Publish the current draft
        </button>
      </div>

      <ul className="mt-4 space-y-2">
        {[...doc.versions].reverse().map((version) => {
          const isLive = version.id === doc.publishedVersionId;
          return (
            <li
              key={version.id}
              className={cn(
                "rounded-[2px] border p-3",
                isLive ? "border-lime/40 bg-lime/[0.05]" : "border-hairline",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-[12.5px] text-chalk">{version.label}</p>
                  <p className="mt-0.5 flex items-center gap-2 font-mono text-[10px] text-chalk-dim">
                    <Clock width={10} height={10} />
                    {dateShort(version.createdAt)} \u00b7 {relative(version.createdAt)}
                  </p>
                  <p className="mt-1 font-mono text-[10px] text-chalk-dim">
                    {version.author} \u00b7 {version.source}
                  </p>
                </div>
                {isLive ? (
                  <span className="shrink-0 rounded-[2px] bg-lime/15 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-lime">
                    Live
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      revertTo(version.id);
                      toast.success(`Reverted the draft to \u201c${version.label}\u201d`);
                    }}
                    className="shrink-0 cursor-pointer rounded-[2px] border border-hairline px-2 py-1 font-mono text-[9.5px] uppercase tracking-[0.12em] text-chalk-dim transition-colors hover:text-chalk"
                  >
                    Revert
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <p className="mt-4 font-mono text-[10px] leading-relaxed text-chalk-dim">
        Reverting changes the draft only. The live storefront keeps serving the published version
        until you publish again.
      </p>
    </div>
  );
}

export function TemplatePanel() {
  const { applyTemplate, doc } = useDesign();
  return (
    <div className="p-4">
      <p className="font-mono text-[10px] leading-relaxed text-chalk-dim">
        Templates set the rhythm \u2014 spacing, type scale and surface treatment. Your products,
        copy and structure stay exactly as they are.
      </p>
      <div className="mt-4 grid gap-2.5">
        {STORE_TEMPLATES.filter((template) => TEMPLATE_PRESETS[template.id]).map((template) => (
          <button
            key={template.id}
            type="button"
            onClick={() => {
              applyTemplate(template.id);
              toast.success(`${template.name} applied to your draft`);
            }}
            className={cn(
              "cursor-pointer rounded-[2px] border p-3 text-left transition-colors",
              doc.template === template.id
                ? "border-lime/40 bg-lime/[0.05]"
                : "border-hairline hover:border-chalk-dim",
            )}
          >
            <div className="flex items-center justify-between">
              <span className="font-display text-[13.5px] font-semibold text-chalk">
                {template.name}
              </span>
              <span className="font-mono text-[9.5px] text-chalk-dim">{template.tenants} tenants</span>
            </div>
            <p className="mt-1.5 text-[12px] leading-relaxed text-chalk-dim">{template.style}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

export function AiAssistantPanel() {
  const { messages, proposals, pendingProposal, askAi, applyProposal, cancelProposal, reviseProposal } =
    useDesign();
  const [prompt, setPrompt] = useState("");
  const [revision, setRevision] = useState("");
  const [revising, setRevising] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.map((message) => (
          <div key={message.id}>
            {message.role === "user" ? (
              <div className="ml-auto max-w-[85%] rounded-[3px] rounded-br-[1px] bg-panel-2 px-3 py-2">
                <p className="text-[12.5px] leading-relaxed text-chalk">{message.text}</p>
              </div>
            ) : (
              <div className="max-w-[92%] rounded-[3px] rounded-bl-[1px] border border-hairline px-3 py-2.5">
                <p className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-lime">
                  <Sparkles width={10} height={10} /> Design assistant
                </p>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-chalk">{message.text}</p>
              </div>
            )}
          </div>
        ))}

        {pendingProposal ? (
          <ProposalCard
            proposalId={pendingProposal.id}
            revising={revising}
            revision={revision}
            setRevision={setRevision}
            setRevising={setRevising}
            onApply={() => {
              applyProposal(pendingProposal.id);
              toast.success("Draft updated \u2014 review it on the canvas");
            }}
            onCancel={() => cancelProposal(pendingProposal.id)}
            onRevise={(text) => reviseProposal(pendingProposal.id, text)}
          />
        ) : null}

        {proposals.filter((p) => p.status !== "draft").length ? (
          <div className="border-t border-hairline pt-3">
            <p className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-chalk-dim">
              Earlier proposals
            </p>
            <ul className="mt-2 space-y-1.5">
              {proposals
                .filter((p) => p.status !== "draft")
                .map((proposal) => (
                  <li key={proposal.id} className="flex items-center gap-2">
                    <span
                      className={cn(
                        "grid h-4 w-4 shrink-0 place-items-center rounded-[2px] border",
                        proposal.status === "applied"
                          ? "border-lime/40 text-lime"
                          : "border-hairline text-chalk-dim",
                      )}
                    >
                      {proposal.status === "applied" ? <Check width={10} height={10} /> : <X width={10} height={10} />}
                    </span>
                    <span className="truncate text-[11.5px] text-chalk-dim">{proposal.summary}</span>
                  </li>
                ))}
            </ul>
          </div>
        ) : null}
        <div ref={endRef} />
      </div>

      <div className="border-t border-hairline p-3">
        <div className="mb-2 flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {SUGGESTED_PROMPTS.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => askAi(suggestion)}
              className="shrink-0 cursor-pointer rounded-full border border-hairline px-2.5 py-1 font-mono text-[9.5px] text-chalk-dim transition-colors hover:border-lime/40 hover:text-lime"
            >
              {suggestion}
            </button>
          ))}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            askAi(prompt);
            setPrompt("");
          }}
          className="flex gap-2"
        >
          <input
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe the change you want"
            aria-label="Describe a design change"
            className="h-9 flex-1 rounded-[2px] border border-hairline bg-void px-3 text-[12.5px] text-chalk outline-none placeholder:text-chalk-dim/70 focus:border-chalk-dim"
          />
          <button
            type="submit"
            className="grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-[2px] bg-lime text-void transition-colors hover:bg-chalk"
            aria-label="Send"
          >
            <Send width={14} height={14} />
          </button>
        </form>
        <p className="mt-2 font-mono text-[9.5px] leading-relaxed text-chalk-dim">
          Proposals are drafts. Nothing reaches your live storefront until you apply and publish.
        </p>
      </div>
    </div>
  );
}

function ProposalCard({
  proposalId,
  onApply,
  onCancel,
  onRevise,
  revising,
  setRevising,
  revision,
  setRevision,
}: {
  proposalId: string;
  onApply: () => void;
  onCancel: () => void;
  onRevise: (text: string) => void;
  revising: string | null;
  setRevising: (id: string | null) => void;
  revision: string;
  setRevision: (text: string) => void;
}) {
  const { proposals } = useDesign();
  const proposal = proposals.find((p) => p.id === proposalId);
  if (!proposal) return null;

  return (
    <div className="rounded-[3px] border border-lime/35 bg-lime/[0.04] p-3">
      <p className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-lime">
        <Sparkles width={10} height={10} /> Proposed changes \u00b7 draft
      </p>
      <p className="mt-2 text-[13px] font-medium leading-snug text-chalk">{proposal.summary}</p>
      <p className="mt-1.5 text-[11.5px] leading-relaxed text-chalk-dim">{proposal.reasoning}</p>

      <ul className="mt-3 space-y-1.5">
        {proposal.changes.map((change, i) => (
          <li key={`${change.nodeId}-${i}`} className="flex gap-2 text-[11.5px] leading-relaxed">
            <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-lime" />
            <span className="text-chalk-dim">
              <span className="text-chalk">{change.nodeName}</span> \u2014 {change.field}: {change.to}
            </span>
          </li>
        ))}
      </ul>

      {revising === proposal.id ? (
        <div className="mt-3">
          <textarea
            value={revision}
            onChange={(e) => setRevision(e.target.value)}
            placeholder="Tell me what to change about this proposal"
            className="h-[64px] w-full resize-y rounded-[2px] border border-hairline bg-void px-2.5 py-2 text-[12px] text-chalk outline-none focus:border-chalk-dim"
          />
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => {
                if (!revision.trim()) return;
                onRevise(revision.trim());
                setRevision("");
                setRevising(null);
              }}
              className="h-8 flex-1 cursor-pointer rounded-[2px] bg-lime font-mono text-[10px] uppercase tracking-[0.12em] text-void"
            >
              Send revision
            </button>
            <button
              type="button"
              onClick={() => setRevising(null)}
              className="h-8 cursor-pointer rounded-[2px] border border-hairline px-3 font-mono text-[10px] uppercase tracking-[0.12em] text-chalk-dim"
            >
              Back
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onApply}
            className="h-8 flex-1 cursor-pointer rounded-[2px] bg-lime font-mono text-[10px] uppercase tracking-[0.12em] text-void transition-colors hover:bg-chalk"
          >
            Apply to draft
          </button>
          <button
            type="button"
            onClick={() => setRevising(proposal.id)}
            className="h-8 cursor-pointer rounded-[2px] border border-hairline px-3 font-mono text-[10px] uppercase tracking-[0.12em] text-chalk transition-colors hover:border-chalk-dim"
          >
            Revise
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="h-8 cursor-pointer rounded-[2px] border border-hairline px-3 font-mono text-[10px] uppercase tracking-[0.12em] text-chalk-dim transition-colors hover:text-ember-soft"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

export function DesktopOnlyDeviceHint() {
  const { device, setDevice } = useDesign();
  return (
    <div className="flex items-center gap-1 rounded-[2px] border border-hairline p-[3px] md:hidden">
      {([
        ["desktop", Laptop],
        ["tablet", Tablet],
        ["mobile", Smartphone],
      ] as [Device, typeof Laptop][]).map(([value, Icon]) => (
        <button
          key={value}
          type="button"
          onClick={() => setDevice(value)}
          aria-label={`${value} preview`}
          className={cn(
            "grid h-7 w-7 cursor-pointer place-items-center rounded-[2px]",
            device === value ? "bg-panel-2 text-lime" : "text-chalk-dim",
          )}
        >
          <Icon width={13} height={13} />
        </button>
      ))}
    </div>
  );
}

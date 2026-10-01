"use client";

import { useState } from "react";
import {
  ChevronRight,
  Layers,
  LayoutPanelTop,
  Rocket,
  Save,
  SlidersHorizontal,
  Smartphone,
  Sparkles,
  Tablet,
  Monitor,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useFerixas } from "@/lib/store";
import { useDesign } from "@/lib/design/design-store";
import type { Device } from "@/lib/design/tree";
import { DesignRenderer } from "@/components/design/renderer";
import { InspectorPanel, LayersPanel } from "@/components/design/panels";
import {
  AiAssistantPanel,
  DesignToolbar,
  Drawer,
  HistoryPanel,
  TemplatePanel,
} from "@/components/design/chrome";
import { cn } from "@/lib/utils";

type Sheet = null | "layers" | "inspector" | "ai" | "tools";

const DEVICE_LABEL: Record<Device, string> = {
  desktop: "Desktop \u00b7 1440",
  tablet: "Tablet \u00b7 834",
  mobile: "Mobile \u00b7 390",
};

const DEVICE_ORDER: Device[] = ["desktop", "tablet", "mobile"];

export default function DesignEnginePage() {
  const { merchant, products, cartCount } = useFerixas();
  const {
    nodes,
    publishedNodes,
    selectedId,
    select,
    selectedNode,
    device,
    setDevice,
    doc,
    dirty,
    nodeCount,
    saveDraft,
    publish,
  } = useDesign();

  const [previewing, setPreviewing] = useState(false);
  const [showBindings, setShowBindings] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [sheet, setSheet] = useState<Sheet>(null);

  const catalog = products.filter((p) => p.merchantId === merchant.id);
  const rendered = previewing ? publishedNodes : nodes;
  const frameWidth = device === "desktop" ? "100%" : device === "tablet" ? "834px" : "390px";

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-void text-chalk">
      <DesignToolbar
        onOpenAi={() => setAiOpen((v) => !v)}
        onOpenHistory={() => setHistoryOpen(true)}
        onOpenTemplates={() => setTemplatesOpen(true)}
        previewing={previewing}
        onTogglePreview={() => setPreviewing((v) => !v)}
        showBindings={showBindings}
        onToggleBindings={() => setShowBindings((v) => !v)}
        aiOpen={aiOpen}
      />

      <div className="relative flex min-h-0 flex-1">
        <aside className="hidden w-[240px] shrink-0 border-r border-hairline bg-panel lg:block">
          <LayersPanel />
        </aside>

        <main className="relative min-w-0 flex-1 overflow-auto bg-[#0d1015] p-3 lg:p-5">
          <div className="mx-auto" style={{ width: frameWidth, maxWidth: "100%" }}>
            <div className="flex items-center gap-2 rounded-t-[4px] border border-hairline border-b-0 bg-panel px-3 py-2">
              <span className="flex gap-1.5">
                {["#242c39", "#242c39", "#242c39"].map((c, i) => (
                  <span key={i} className="h-2.5 w-2.5 rounded-full" style={{ background: c }} />
                ))}
              </span>
              <span className="ml-2 truncate rounded-[2px] bg-void px-2.5 py-1 font-mono text-[10.5px] text-chalk-dim">
                https://{merchant.customDomain ?? merchant.domain}
              </span>
              <span className="ml-auto hidden shrink-0 font-mono text-[10px] uppercase tracking-[0.14em] text-chalk-dim sm:block">
                {DEVICE_LABEL[device]}
              </span>
              {previewing ? (
                <span className="shrink-0 rounded-[2px] bg-lime/15 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-lime">
                  Published
                </span>
              ) : (
                <span className="shrink-0 rounded-[2px] bg-sand/15 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-sand">
                  Editing draft
                </span>
              )}
            </div>
            <div
              className="overflow-hidden rounded-b-[4px] border border-hairline bg-white shadow-[0_40px_90px_-40px_rgba(0,0,0,0.9)]"
              onMouseDown={() => {
                if (selectedId) select(null);
              }}
            >
              <DesignRenderer
                nodes={rendered}
                brand={merchant.brand}
                merchant={merchant}
                products={catalog}
                device={device}
                editing={!previewing}
                selectedId={selectedId}
                onSelect={(id) => {
                  select(id);
                  setSheet((current) => (current === null ? current : "inspector"));
                }}
                showBindings={showBindings}
                cartCount={cartCount}
              />
            </div>
          </div>

          <div className="mx-auto mt-3 flex max-w-[1100px] flex-wrap items-center gap-x-4 gap-y-1.5 rounded-[3px] border border-hairline bg-panel px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-chalk-dim">
            <span className="text-lime">{nodeCount} elements</span>
            <span className="flex items-center gap-1">
              {selectedNode ? (
                <>
                  Selected <ChevronRight width={10} height={10} />
                  <span className="text-chalk">{selectedNode.name}</span>
                </>
              ) : (
                "Nothing selected"
              )}
            </span>
            <span>{device}</span>
            <span>{dirty ? "Draft has unsaved changes" : "Draft saved"}</span>
            <span className="hidden sm:inline">
              Published: {doc.publishedVersionId ?? "nothing"}
            </span>
          </div>
        </main>

        <aside className="hidden w-[312px] shrink-0 border-l border-hairline bg-panel xl:block">
          <InspectorPanel />
        </aside>

        <Drawer
          open={historyOpen}
          onClose={() => setHistoryOpen(false)}
          title="Version history"
          subtitle={`${doc.versions.length} versions \u00b7 revert is non-destructive`}
          side="left"
        >
          <HistoryPanel />
        </Drawer>
        <Drawer
          open={templatesOpen}
          onClose={() => setTemplatesOpen(false)}
          title="Templates"
          subtitle="Set the rhythm without losing your content"
          side="left"
        >
          <TemplatePanel />
        </Drawer>
        <Drawer
          open={aiOpen}
          onClose={() => setAiOpen(false)}
          title="AI design assistant"
          subtitle="Drafts only \u2014 you approve every change"
          side="right"
        >
          <AiAssistantPanel />
        </Drawer>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-hairline bg-panel/95 backdrop-blur-md lg:hidden">
        <div className="flex items-stretch">
          <ToolRailButton label="Layers" active={sheet === "layers"} onClick={() => setSheet(sheet === "layers" ? null : "layers")}>
            <Layers width={17} height={17} />
          </ToolRailButton>
          <ToolRailButton
            label="Inspect"
            active={sheet === "inspector"}
            onClick={() => setSheet(sheet === "inspector" ? null : "inspector")}
          >
            <SlidersHorizontal width={17} height={17} />
          </ToolRailButton>
          <ToolRailButton label="AI" active={sheet === "ai"} onClick={() => setSheet(sheet === "ai" ? null : "ai")}>
            <Sparkles width={17} height={17} />
          </ToolRailButton>
          <ToolRailButton
            label={device === "desktop" ? "Desktop" : device === "tablet" ? "Tablet" : "Mobile"}
            onClick={() => {
              const next = DEVICE_ORDER[(DEVICE_ORDER.indexOf(device) + 1) % DEVICE_ORDER.length];
              setDevice(next);
              toast.success(`Previewing ${next}`);
            }}
          >
            {device === "desktop" ? (
              <Monitor width={17} height={17} />
            ) : device === "tablet" ? (
              <Tablet width={17} height={17} />
            ) : (
              <Smartphone width={17} height={17} />
            )}
          </ToolRailButton>
          <ToolRailButton label="Tools" active={sheet === "tools"} onClick={() => setSheet(sheet === "tools" ? null : "tools")}>
            <LayoutPanelTop width={17} height={17} />
          </ToolRailButton>
        </div>
      </nav>

      {sheet ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Close panel"
            onClick={() => setSheet(null)}
            className="absolute inset-0 cursor-default bg-void/60 backdrop-blur-[2px]"
          />
          <div className="absolute inset-x-0 bottom-[62px] max-h-[72vh] overflow-hidden rounded-t-[10px] border-t border-hairline bg-panel">
            <div className="flex items-center justify-between border-b border-hairline px-4 py-3">
              <span className="font-display text-[13.5px] font-semibold text-chalk">
                {sheet === "layers"
                  ? "Layers"
                  : sheet === "inspector"
                    ? selectedNode?.name ?? "Inspector"
                    : sheet === "ai"
                      ? "AI design assistant"
                      : "Tools"}
              </span>
              <button
                type="button"
                onClick={() => setSheet(null)}
                aria-label="Close"
                className="grid h-7 w-7 cursor-pointer place-items-center rounded-[2px] border border-hairline text-chalk-dim"
              >
                <X width={13} height={13} />
              </button>
            </div>
            <div className="max-h-[calc(72vh-52px)] overflow-y-auto">
              {sheet === "layers" ? (
                <div className="h-[60vh]">
                  <LayersPanel onPick={() => setSheet(null)} />
                </div>
              ) : null}
              {sheet === "inspector" ? <InspectorPanel /> : null}
              {sheet === "ai" ? (
                <div className="h-[60vh]">
                  <AiAssistantPanel />
                </div>
              ) : null}
              {sheet === "tools" ? (
                <div className="grid gap-2 p-4">
                  <ToolSheetRow
                    label="Preview the published design"
                    detail={previewing ? "Currently on" : "Currently off"}
                    onClick={() => setPreviewing((v) => !v)}
                  />
                  <ToolSheetRow
                    label="Show commerce bindings"
                    detail={showBindings ? "Visible on the canvas" : "Hidden"}
                    onClick={() => setShowBindings((v) => !v)}
                  />
                  <ToolSheetRow
                    label="Save draft"
                    onClick={() => {
                      saveDraft();
                      toast.success("Draft saved");
                    }}
                  />
                  <ToolSheetRow
                    label="Version history"
                    onClick={() => {
                      setSheet(null);
                      setHistoryOpen(true);
                    }}
                  />
                  <ToolSheetRow
                    label="Templates"
                    onClick={() => {
                      setSheet(null);
                      setTemplatesOpen(true);
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      publish();
                      toast.success("Published \u2014 your live storefront updated");
                      setSheet(null);
                    }}
                    className="mt-1 flex h-11 cursor-pointer items-center justify-center gap-2 rounded-[2px] bg-lime font-mono text-[10.5px] uppercase tracking-[0.14em] text-void"
                  >
                    <Rocket width={14} height={14} /> Publish store
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ToolRailButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-1 cursor-pointer flex-col items-center gap-1 py-2.5 font-mono text-[9px] uppercase tracking-[0.12em] transition-colors",
        active ? "text-lime" : "text-chalk-dim",
      )}
    >
      {children}
      {label}
    </button>
  );
}

function ToolSheetRow({
  label,
  detail,
  onClick,
}: {
  label: string;
  detail?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex cursor-pointer items-center justify-between gap-3 rounded-[2px] border border-hairline px-3.5 py-3 text-left transition-colors hover:border-chalk-dim"
    >
      <span className="text-[13px] text-chalk">{label}</span>
      {detail ? <span className="font-mono text-[10px] text-chalk-dim">{detail}</span> : null}
    </button>
  );
}

void Save;

"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { AiMessage, AiProposal, DesignDoc, DesignNode, DesignVersion, HeroSlide, NodeStyle } from "@/lib/types";
import { MERCHANTS, PRODUCTS, getMerchant } from "@/lib/data";
import { useFerixas } from "@/lib/store";
import { TEMPLATE_PRESETS, defaultTree, seedVersions } from "./defaults";
import { cloneTree, findNode, flatten, mapNode, moveSection, type Device } from "./tree";

type Change = { nodeId: string; nodeName: string; field: string; from: string; to: string };
type ProposalPatch = { nodeId: string; style?: Partial<NodeStyle>; tokens?: Record<string, string>; move?: -1 | 1 };

type Ctx = {
  doc: DesignDoc;
  nodes: DesignNode[];
  publishedNodes: DesignNode[];
  docFor: (id: string) => DesignDoc;
  publishedFor: (id: string) => DesignNode[];
  selectedId: string | null;
  selectedNode: DesignNode | undefined;
  select: (id: string | null) => void;
  device: Device;
  setDevice: (device: Device) => void;
  updateStyle: (nodeId: string, patch: Partial<NodeStyle>) => void;
  updateTokens: (nodeId: string, patch: Record<string, string>) => void;
  setSlides: (nodeId: string, slides: HeroSlide[]) => void;
  toggleHidden: (nodeId: string) => void;
  moveSectionById: (nodeId: string, direction: -1 | 1) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  saveDraft: (label?: string) => void;
  publish: () => void;
  revertTo: (versionId: string) => void;
  applyTemplate: (templateId: string) => void;
  resetTree: () => void;
  messages: AiMessage[];
  proposals: AiProposal[];
  pendingProposal: AiProposal | null;
  askAi: (prompt: string) => void;
  applyProposal: (id: string) => void;
  cancelProposal: (id: string) => void;
  reviseProposal: (id: string, prompt: string) => void;
  dirty: boolean;
  nodeCount: number;
};

const DesignContext = createContext<Ctx | null>(null);

const WELCOME: AiMessage = {
  id: "ai-welcome",
  role: "assistant",
  text: "I can restructure sections, retune typography and space, or take the whole store in a different direction. Everything I produce arrives as a draft you approve \u2014 I never touch your live storefront.",
  createdAt: "2026-10-01T08:00:00.000Z",
};

const DEFAULT_PROMPTS = [
  "Make the hero section cleaner.",
  "Move the product section closer to the hero.",
  "Make the mobile layout look better.",
  "Change the store to a premium luxury style.",
  "Make the product cards more compact.",
  "Use this reference style.",
];

export const SUGGESTED_PROMPTS = DEFAULT_PROMPTS;

function buildDoc(merchantId: string): DesignDoc {
  const merchant = getMerchant(merchantId);
  const nodes = defaultTree(merchant);
  return {
    merchantId,
    template: merchant.brand.template,
    nodes,
    versions: seedVersions(merchant),
    publishedVersionId: "v2",
    dirty: false,
  };
}

type Intent = {
  id: string;
  label: string;
  match: RegExp;
  summary: string;
  reasoning: string;
  build: (nodes: DesignNode[], merchantId: string) => { patch: ProposalPatch[]; changes: Change[] };
};

function describe(nodes: DesignNode[], nodeId: string, field: string, value: string): Change {
  const node = findNode(nodes, nodeId);
  return { nodeId, nodeName: node?.name ?? nodeId, field, from: "current", to: value };
}

const INTENTS: Intent[] = [
  {
    id: "cleaner",
    label: "Cleaner hero",
    match: /clean|simplif|tidy|less busy|breathing/i,
    summary: "Give the hero more room and let one element lead",
    reasoning:
      "The hero currently competes internally: a large headline, a paragraph, a button and an image all at the same visual weight. Increasing the vertical space and separating the type scale lets the headline lead.",
    build: (nodes) => ({
      patch: [
        { nodeId: "hero", style: { paddingY: 104, gap: 56, align: "center" } },
        { nodeId: "hero-heading", style: { fontSize: 44, letterSpacing: -0.04, lineHeight: 1.02 } },
        { nodeId: "hero-copy", style: { fontSize: 15.5, lineHeight: 1.7, opacity: 0.8 } },
        { nodeId: "hero-cta", style: { paddingX: 22, paddingY: 13 } },
        { nodeId: "hero-media", style: { shadow: 3, radius: 6 } },
      ],
      changes: [
        describe(nodes, "hero", "padding", "76px \u2192 104px"),
        describe(nodes, "hero", "gap", "48px \u2192 56px"),
        describe(nodes, "hero-heading", "font size", "40px \u2192 44px"),
        describe(nodes, "hero-heading", "letter spacing", "-0.03em \u2192 -0.04em"),
        describe(nodes, "hero-cta", "padding", "wider button hit area"),
      ],
    }),
  },
  {
    id: "reorder",
    label: "Reorder sections",
    match: /move|closer|reorder|order|above|below|higher|up/i,
    summary: "Pull the product grid up so it sits directly under the hero",
    reasoning:
      "Merchandising first, storytelling second. The collection list works better after customers have seen products, so the grid moves above it.",
    build: (nodes) => ({
      patch: [
        { nodeId: "grid", move: -1 },
        { nodeId: "grid", style: { paddingY: 48 } },
      ],
      changes: [
        describe(nodes, "grid", "position", "moved above the featured collection"),
        describe(nodes, "grid", "padding", "56px \u2192 48px so the two sections read as a pair"),
      ],
    }),
  },
  {
    id: "mobile",
    label: "Mobile pass",
    match: /mobile|phone|small screen|responsive/i,
    summary: "Tighten the mobile layout for thumbs",
    reasoning:
      "On a phone the hero needs to stop being a two-column grid and the grid should show two cards per row with less air between them. Type scales down without dropping below a comfortable reading size.",
    build: (nodes) => ({
      patch: [
        {
          nodeId: "hero",
          style: { responsive: { mobile: { display: "flex", columns: 1, paddingY: 48, paddingX: 20, gap: 28, textAlign: "left" } } },
        },
        {
          nodeId: "hero-heading",
          style: { responsive: { mobile: { fontSize: 30, lineHeight: 1.1, letterSpacing: -0.02 } } },
        },
        {
          nodeId: "grid-products",
          style: { responsive: { mobile: { columns: 2, gap: 12 } } },
        },
        { nodeId: "header", style: { responsive: { mobile: { paddingX: 20, paddingY: 14 } } } },
        { nodeId: "banner", style: { responsive: { mobile: { paddingY: 32, paddingX: 20 } } } },
        { nodeId: "footer", style: { responsive: { mobile: { columns: 2, gap: 20, paddingX: 20 } } } },
      ],
      changes: [
        describe(nodes, "hero", "mobile layout", "two columns \u2192 stacked, 48px padding"),
        describe(nodes, "hero-heading", "mobile type", "40px \u2192 30px"),
        describe(nodes, "grid-products", "mobile columns", "4 \u2192 2 with a 12px gap"),
        describe(nodes, "header", "mobile padding", "40px \u2192 20px"),
        describe(nodes, "footer", "mobile columns", "4 \u2192 2"),
      ],
    }),
  },
  {
    id: "luxury",
    label: "Premium direction",
    match: /luxur|premium|expensive|high[- ]end|elegant|refined/i,
    summary: "Shift the whole store to a premium, restrained direction",
    reasoning:
      "Premium reads as restraint: near-black surfaces, a warm metallic accent, square corners, wider tracking and fewer competing elements. Nothing gets louder \u2014 it gets quieter and more deliberate.",
    build: (nodes) => ({
      patch: [
        { nodeId: "header", style: { background: "#0f0d0b", borderColor: "#2a2622", paddingY: 22, paddingX: 48 } },
        { nodeId: "header-brand", style: { color: "#f4efe6", letterSpacing: 0.24, fontSize: 15 } },
        { nodeId: "header-nav", style: { color: "#cbbfae", fontSize: 11.5, gap: 26 } },
        { nodeId: "header-cart", style: { color: "#f4efe6" } },
        { nodeId: "header-wishlist", style: { color: "#8a8175" } },
        {
          nodeId: "hero",
          style: { background: "#0f0d0b", paddingY: 112, gap: 64, columns: 2, display: "grid", textAlign: "left" },
        },
        {
          nodeId: "hero-heading",
          style: { color: "#f4efe6", fontSize: 48, fontWeight: 400, letterSpacing: -0.01, lineHeight: 1.1 },
        },
        { nodeId: "hero-copy", style: { color: "#a89e8f", fontSize: 14, lineHeight: 1.85 } },
        {
          nodeId: "hero-cta",
          style: { background: "#c9a24d", color: "#0f0d0b", radius: 0, paddingX: 26, paddingY: 14, letterSpacing: 0.08, fontSize: 12 },
        },
        { nodeId: "hero-media", style: { radius: 0, shadow: 0, height: "340px" } },
        { nodeId: "trust", style: { background: "#0f0d0b", borderColor: "#2a2622", color: "#a89e8f", fontSize: 11.5 } },
        { nodeId: "featured", style: { background: "#131110", paddingY: 72 } },
        { nodeId: "featured-heading", style: { color: "#f4efe6", fontSize: 22, fontWeight: 400, letterSpacing: 0.02 } },
        { nodeId: "grid", style: { background: "#0f0d0b", paddingY: 72, gap: 28 } },
        { nodeId: "grid-heading", style: { color: "#f4efe6", fontSize: 22, fontWeight: 400, letterSpacing: 0.02 } },
        { nodeId: "grid-products", style: { gap: 28 } },
        {
          nodeId: "card-1",
          style: { background: "#171412", radius: 0, borderWidth: 1, borderColor: "#2a2622", paddingX: 14, paddingY: 14 },
        },
        { nodeId: "banner", style: { background: "#c9a24d", textAlign: "center", align: "center", paddingY: 52 } },
        { nodeId: "banner-heading", style: { color: "#0f0d0b", fontSize: 22, fontWeight: 500, letterSpacing: 0.04 } },
        { nodeId: "banner-copy", style: { color: "#0f0d0b", opacity: 0.75 } },
        { nodeId: "banner-cta", style: { background: "#0f0d0b", color: "#f4efe6", radius: 0 } },
        { nodeId: "reviews-section", style: { background: "#0f0d0b", paddingY: 72 } },
        { nodeId: "reviews-heading", style: { color: "#f4efe6", fontSize: 22, fontWeight: 400 } },
        { nodeId: "reviews", style: { color: "#cbbfae" } },
        { nodeId: "footer", style: { background: "#0a0908", color: "#f4efe6", paddingY: 56 } },
        { nodeId: "footer-links", style: { opacity: 0.6 } },
        { nodeId: "footer-contact", style: { opacity: 0.6 } },
      ],
      changes: [
        describe(nodes, "header", "palette", "surface \u2192 near-black with a hairline rule"),
        describe(nodes, "hero", "palette + space", "canvas \u2192 #0f0d0b, 76px \u2192 112px padding"),
        describe(nodes, "hero-heading", "type", "800 weight 40px \u2192 400 weight 48px"),
        describe(nodes, "hero-cta", "colour", "accent \u2192 warm gold #c9a24d, square corners"),
        describe(nodes, "grid-products", "rhythm", "20px \u2192 28px gap, no card shadow"),
        describe(nodes, "banner", "treatment", "dark ink \u2192 gold band, centred"),
        describe(nodes, "footer", "palette", "ink \u2192 #0a0908"),
      ],
    }),
  },
  {
    id: "compact",
    label: "Denser grid",
    match: /compact|denser|tighter|more products|smaller cards/i,
    summary: "Fit more products above the fold",
    reasoning:
      "A commerce grid earns its keep by showing choice. Five columns with a smaller gap and lighter card chrome raises the number of visible products without shrinking the price and title below readable sizes.",
    build: (nodes) => ({
      patch: [
        { nodeId: "grid-products", style: { columns: 5, gap: 14 } },
        { nodeId: "card-1", style: { gap: 6, paddingX: 8, paddingY: 8, borderWidth: 1, borderColor: "line" } },
        { nodeId: "grid", style: { paddingY: 44, gap: 16 } },
        { nodeId: "grid-heading", style: { fontSize: 20 } },
      ],
      changes: [
        describe(nodes, "grid-products", "columns", "4 \u2192 5, gap 20px \u2192 14px"),
        describe(nodes, "card-1", "card chrome", "added a hairline and 8px inner padding"),
        describe(nodes, "grid", "section padding", "56px \u2192 44px"),
      ],
    }),
  },
  {
    id: "reference",
    label: "Reference style",
    match: /reference|like this|this style|template|match the/i,
    summary: "Apply the Atelier reference direction",
    reasoning:
      "The reference is editorial: centred hero, wide margins, lighter display weight, square buttons and generous space between cards. It is applied to the structure rather than copied, so your own content stays intact.",
    build: (nodes) => ({
      patch: [
        { nodeId: "hero", style: { display: "flex", columns: 1, textAlign: "center", align: "center", paddingY: 104, gap: 40 } },
        { nodeId: "hero-heading", style: { fontSize: 46, fontWeight: 500, letterSpacing: -0.01, lineHeight: 1.12 } },
        { nodeId: "hero-cta", style: { radius: 0, background: "ink", color: "canvas" } },
        { nodeId: "hero-media", style: { radius: 0, height: "360px", shadow: 0 } },
        { nodeId: "grid-products", style: { columns: 3, gap: 32 } },
        { nodeId: "card-1", style: { gap: 10, background: "canvas" } },
        { nodeId: "banner", style: { textAlign: "center", align: "center", paddingY: 56, background: "surface" } },
        { nodeId: "banner-heading", style: { color: "ink" } },
        { nodeId: "banner-copy", style: { color: "muted", opacity: 1 } },
      ],
      changes: [
        describe(nodes, "hero", "layout", "split \u2192 centred editorial"),
        describe(nodes, "hero-heading", "type", "500 weight, 46px, tighter leading"),
        describe(nodes, "hero-cta", "button", "square, inverted ink on canvas"),
        describe(nodes, "grid-products", "grid", "4 columns \u2192 3 with 32px gutters"),
        describe(nodes, "banner", "banner", "dark band \u2192 light centred panel"),
      ],
    }),
  },
];

export function DesignProvider({ children }: { children: ReactNode }) {
  const { merchantId } = useFerixas();
  const [docs, setDocs] = useState<Record<string, DesignDoc>>(() => ({
    [merchantId]: buildDoc(merchantId),
  }));
  const [history, setHistory] = useState<Record<string, { past: DesignNode[][]; future: DesignNode[][] }>>({});
  const [selectedId, setSelectedId] = useState<string | null>("hero-heading");
  const [device, setDevice] = useState<Device>("desktop");
  const [ai, setAi] = useState<Record<string, { messages: AiMessage[]; proposals: AiProposal[] }>>({});

  const doc = docs[merchantId] ?? buildDoc(merchantId);
  const nodes = doc.nodes;
  const aiState = ai[merchantId] ?? { messages: [WELCOME], proposals: [] };

  const pushHistory = useCallback(
    (merchantIdKey: string, snapshot: DesignNode[]) => {
      setHistory((prev) => {
        const entry = prev[merchantIdKey] ?? { past: [], future: [] };
        return { ...prev, [merchantIdKey]: { past: [...entry.past, cloneTree(snapshot)].slice(-40), future: [] } };
      });
    },
    [],
  );

  const commit = useCallback(
    (updater: (current: DesignNode[]) => DesignNode[], label?: string) => {
      setDocs((prev) => {
        const current = prev[merchantId] ?? buildDoc(merchantId);
        pushHistory(merchantId, current.nodes);
        const next: DesignDoc = { ...current, nodes: updater(current.nodes), dirty: true };
        if (label) {
          const version: DesignVersion = {
            id: `v${current.versions.length + 1}`,
            label,
            createdAt: new Date().toISOString(),
            author: `${getMerchant(merchantId).name} (owner)`,
            source: "manual",
            nodes: cloneTree(next.nodes),
          };
          next.versions = [...current.versions, version];
        }
        return { ...prev, [merchantId]: next };
      });
    },
    [merchantId, pushHistory],
  );

  const updateStyle = useCallback(
    (nodeId: string, patch: Partial<NodeStyle>) => {
      commit((current) =>
        mapNode(current, nodeId, (node) => ({ ...node, style: { ...node.style, ...patch } })),
      );
    },
    [commit],
  );

  const updateTokens = useCallback(
    (nodeId: string, patch: Record<string, string>) => {
      commit((current) =>
        mapNode(current, nodeId, (node) => ({ ...node, tokens: { ...node.tokens, ...patch } })),
      );
    },
    [commit],
  );

  const setSlides = useCallback(
    (nodeId: string, slides: HeroSlide[]) => {
      commit((current) => mapNode(current, nodeId, (node) => ({ ...node, slides })));
    },
    [commit],
  );

  const toggleHidden = useCallback(
    (nodeId: string) => {
      commit((current) => mapNode(current, nodeId, (node) => ({ ...node, hidden: !node.hidden })));
    },
    [commit],
  );

  const moveSectionById = useCallback(
    (nodeId: string, direction: -1 | 1) => {
      commit((current) => moveSection(current, nodeId, direction));
    },
    [commit],
  );

  const undo = useCallback(() => {
    setHistory((prev) => {
      const entry = prev[merchantId];
      if (!entry?.past.length) return prev;
      const past = [...entry.past];
      const restore = past.pop() as DesignNode[];
      setDocs((docsPrev) => {
        const current = docsPrev[merchantId] ?? buildDoc(merchantId);
        return {
          ...docsPrev,
          [merchantId]: {
            ...current,
            nodes: restore,
            dirty: true,
          },
        };
      });
      return {
        ...prev,
        [merchantId]: { past, future: [cloneTree(doc.nodes), ...entry.future].slice(0, 40) },
      };
    });
  }, [merchantId, doc.nodes]);

  const redo = useCallback(() => {
    setHistory((prev) => {
      const entry = prev[merchantId];
      if (!entry?.future.length) return prev;
      const [next, ...rest] = entry.future;
      setDocs((docsPrev) => {
        const current = docsPrev[merchantId] ?? buildDoc(merchantId);
        return { ...docsPrev, [merchantId]: { ...current, nodes: next, dirty: true } };
      });
      return {
        ...prev,
        [merchantId]: { past: [...entry.past, cloneTree(doc.nodes)].slice(-40), future: rest },
      };
    });
  }, [merchantId, doc.nodes]);

  const saveDraft = useCallback(
    (label?: string) => {
      commit((current) => current, label ?? `Draft saved ${new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`);
    },
    [commit],
  );

  const publish = useCallback(() => {
    setDocs((prev) => {
      const current = prev[merchantId] ?? buildDoc(merchantId);
      const version: DesignVersion = {
        id: `v${current.versions.length + 1}`,
        label: `Published \u00b7 ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
        createdAt: new Date().toISOString(),
        author: `${getMerchant(merchantId).name} (owner)`,
        source: "manual",
        nodes: cloneTree(current.nodes),
      };
      return {
        ...prev,
        [merchantId]: {
          ...current,
          versions: [...current.versions, version],
          publishedVersionId: version.id,
          dirty: false,
        },
      };
    });
  }, [merchantId]);

  const revertTo = useCallback(
    (versionId: string) => {
      setDocs((prev) => {
        const current = prev[merchantId] ?? buildDoc(merchantId);
        const version = current.versions.find((v) => v.id === versionId);
        if (!version) return prev;
        return {
          ...prev,
          [merchantId]: { ...current, nodes: cloneTree(version.nodes), dirty: true },
        };
      });
    },
    [merchantId],
  );

  const applyTemplate = useCallback(
    (templateId: string) => {
      const preset = TEMPLATE_PRESETS[templateId];
      if (!preset) return;
      commit((current) => {
        let next = current;
        Object.entries(preset.patch).forEach(([nodeId, style]) => {
          next = mapNode(next, nodeId, (node) => ({ ...node, style: { ...node.style, ...style } }));
        });
        return next;
      }, `Applied the ${preset.label} template`);
    },
    [commit],
  );

  const resetTree = useCallback(() => {
    commit(() => defaultTree(getMerchant(merchantId)), "Reset to the starting storefront");
  }, [commit, merchantId]);

  const askAi = useCallback(
    (prompt: string) => {
      const clean = prompt.trim();
      if (!clean) return;
      const userMessage: AiMessage = {
        id: `m${Date.now().toString(36)}`,
        role: "user",
        text: clean,
        createdAt: new Date().toISOString(),
      };
      const intent =
        INTENTS.find((entry) => entry.match.test(clean)) ??
        INTENTS.find((entry) => entry.id === "cleaner")!;
      const { patch, changes } = intent.build(
        docs[merchantId]?.nodes ?? defaultTree(getMerchant(merchantId)),
        merchantId,
      );
      const proposal: AiProposal = {
        id: `p${Date.now().toString(36)}`,
        prompt: clean,
        summary: intent.summary,
        reasoning: intent.reasoning,
        changes,
        patch,
        status: "draft",
        createdAt: new Date().toISOString(),
      };
      const assistantMessage: AiMessage = {
        id: `m${Date.now().toString(36)}a`,
        role: "assistant",
        text: `${intent.summary}. I have prepared ${changes.length} change${
          changes.length === 1 ? "" : "s"
        } as a draft \u2014 nothing is applied until you approve it.`,
        proposalId: proposal.id,
        createdAt: new Date().toISOString(),
      };
      setAi((prev) => {
        const entry = prev[merchantId] ?? { messages: [WELCOME], proposals: [] };
        return {
          ...prev,
          [merchantId]: {
            messages: [...entry.messages, userMessage, assistantMessage],
            proposals: [proposal, ...entry.proposals],
          },
        };
      });
    },
    [docs, merchantId],
  );

  const applyProposal = useCallback(
    (id: string) => {
      const proposal = aiState.proposals.find((p) => p.id === id);
      if (!proposal) return;
      commit((current) => {
        let next = current;
        proposal.patch.forEach((item) => {
          if (item.move) {
            next = moveSection(next, item.nodeId, item.move);
            return;
          }
          next = mapNode(next, item.nodeId, (node) => ({
            ...node,
            style: item.style ? { ...node.style, ...item.style } : node.style,
            tokens: item.tokens ? { ...node.tokens, ...item.tokens } : node.tokens,
          }));
        });
        return next;
      }, `Applied: ${proposal.summary}`);
      setAi((prev) => {
        const entry = prev[merchantId];
        if (!entry) return prev;
        return {
          ...prev,
          [merchantId]: {
            messages: [
              ...entry.messages,
              {
                id: `m${Date.now().toString(36)}b`,
                role: "assistant",
                text: "Applied to your draft. Save or publish when it looks right, and undo is available if you change your mind.",
                createdAt: new Date().toISOString(),
              },
            ],
            proposals: entry.proposals.map((p) => (p.id === id ? { ...p, status: "applied" } : p)),
          },
        };
      });
    },
    [aiState.proposals, commit, merchantId],
  );

  const cancelProposal = useCallback(
    (id: string) => {
      setAi((prev) => {
        const entry = prev[merchantId];
        if (!entry) return prev;
        return {
          ...prev,
          [merchantId]: {
            ...entry,
            proposals: entry.proposals.map((p) => (p.id === id ? { ...p, status: "cancelled" } : p)),
            messages: [
              ...entry.messages,
              {
                id: `m${Date.now().toString(36)}c`,
                role: "assistant",
                text: "Cancelled \u2014 your draft is untouched.",
                createdAt: new Date().toISOString(),
              },
            ],
          },
        };
      });
    },
    [merchantId],
  );

  const reviseProposal = useCallback(
    (id: string, prompt: string) => {
      cancelProposal(id);
      askAi(prompt);
    },
    [askAi, cancelProposal],
  );

  const publishedNodes = useMemo(() => {
    const version = doc.versions.find((v) => v.id === doc.publishedVersionId);
    return version ? version.nodes : doc.nodes;
  }, [doc]);

  const docFor = useCallback((id: string) => docs[id] ?? buildDoc(id), [docs]);
  const publishedFor = useCallback(
    (id: string) => {
      const target = docs[id] ?? buildDoc(id);
      const version = target.versions.find((v) => v.id === target.publishedVersionId);
      return version ? version.nodes : target.nodes;
    },
    [docs],
  );

  const selectedNode = selectedId ? findNode(nodes, selectedId) : undefined;
  const pendingProposal = aiState.proposals.find((p) => p.status === "draft") ?? null;

  const value: Ctx = {
    doc,
    nodes,
    publishedNodes,
    docFor,
    publishedFor,
    selectedId,
    selectedNode,
    select: setSelectedId,
    device,
    setDevice,
    updateStyle,
    updateTokens,
    setSlides,
    toggleHidden,
    moveSectionById,
    undo,
    redo,
    canUndo: Boolean(history[merchantId]?.past.length),
    canRedo: Boolean(history[merchantId]?.future.length),
    saveDraft,
    publish,
    revertTo,
    applyTemplate,
    resetTree,
    messages: aiState.messages,
    proposals: aiState.proposals,
    pendingProposal,
    askAi,
    applyProposal,
    cancelProposal,
    reviseProposal,
    dirty: doc.dirty,
    nodeCount: flatten(nodes).length,
  };

  return <DesignContext.Provider value={value}>{children}</DesignContext.Provider>;
}

export function useDesign() {
  const ctx = useContext(DesignContext);
  if (!ctx) throw new Error("useDesign must be used inside DesignProvider");
  return ctx;
}

export { MERCHANTS, PRODUCTS };

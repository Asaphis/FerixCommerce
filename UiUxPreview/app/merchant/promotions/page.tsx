"use client";

import { useMemo, useState } from "react";
import {
  BadgePercent,
  Check,
  Copy,
  Link2,
  Megaphone,
  Pause,
  Play,
  Plus,
  QrCode,
  Share2,
  Sparkles,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { COLLECTIONS, getMerchant, promotionsOf } from "@/lib/data";
import { dateShort, hashHue, money } from "@/lib/format";
import { useFerixas } from "@/lib/store";
import type { Promotion } from "@/lib/types";
import { StudioShell } from "@/components/studio/shell";
import {
  Field,
  Panel,
  PanelHead,
  Pill,
  StatTile,
  StudioButton,
  TableWrap,
  Td,
  Th,
  inputClass,
  selectClass,
} from "@/components/studio/bits";
import { ProductThumb } from "@/components/shop/product-plate";
import { cn } from "@/lib/utils";

type TargetKind = "store" | "product" | "collection";

export default function PromotionsPage() {
  const { merchantId, merchant, products } = useFerixas();
  const seeded = useMemo(() => promotionsOf(merchantId), [merchantId]);
  const [rows, setRows] = useState<Promotion[]>(seeded);
  const [target, setTarget] = useState<TargetKind>("store");
  const [productId, setProductId] = useState<string>("");
  const [collection, setCollection] = useState<string>(COLLECTIONS[0]);
  const [form, setForm] = useState({ name: "", type: "percentage" as Promotion["type"], value: "" });
  const [marketplaceBoost, setMarketplaceBoost] = useState(true);

  const catalog = products.filter((p) => p.merchantId === merchantId);
  const active = rows.filter((r) => r.status === "active");
  const influenced = rows.reduce((s, r) => s + r.revenue, 0);
  const uses = rows.reduce((s, r) => s + r.uses, 0);

  const targetLabel =
    target === "store"
      ? merchant.name
      : target === "product"
        ? (catalog.find((p) => p.id === productId)?.title ?? catalog[0]?.title ?? "Product")
        : collection;

  const shareUrl =
    target === "store"
      ? `https://${merchant.customDomain ?? merchant.domain}`
      : target === "product"
        ? `https://${merchant.customDomain ?? merchant.domain}/product/${catalog.find((p) => p.id === productId)?.slug ?? catalog[0]?.slug ?? ""}`
        : `https://${merchant.customDomain ?? merchant.domain}/collection/${collection.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

  const copy = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copied to the clipboard`);
    } catch {
      toast.info(`Copy this link: ${value}`);
    }
  };

  return (
    <StudioShell
      title="Promotions"
      subtitle={`${active.length} running \u00b7 ${money(influenced, { cents: false })} influenced`}
      actions={
        <StudioButton onClick={() => toast.success("Marketplace spotlight requested (simulated)")}>
          <Megaphone width={14} height={14} /> Request spotlight
        </StudioButton>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Running now" value={String(active.length)} sub={`${rows.length} created in total`} />
        <StatTile
          label="Revenue influenced"
          value={money(influenced, { cents: false })}
          sub="Attributed to promotions"
        />
        <StatTile label="Redemptions" value={String(uses)} sub="Across every promotion" />
        <StatTile
          label="Best performer"
          value={rows.slice().sort((a, b) => b.revenue - a.revenue)[0]?.name ?? "\u2014"}
          sub={money(rows.slice().sort((a, b) => b.revenue - a.revenue)[0]?.revenue ?? 0, { cents: false })}
        />
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-[1.4fr_1fr]">
        <Panel flush>
          <div className="p-5 pb-4">
            <PanelHead title="Promotions" hint="Discounts, bundles and free shipping" />
          </div>
          <div className="px-5 pb-5">
            <TableWrap>
              <thead>
                <tr>
                  <Th>Promotion</Th>
                  <Th>Scope</Th>
                  <Th>Status</Th>
                  <Th align="right">Uses</Th>
                  <Th align="right">Revenue</Th>
                  <Th>Ends</Th>
                  <Th align="right">Actions</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((promotion) => (
                  <tr key={promotion.id} className="transition-colors hover:bg-panel-2/40">
                    <Td>
                      <p className="text-[13px] text-chalk">{promotion.name}</p>
                      <p className="font-mono text-[10.5px] text-chalk-dim">{promotion.value}</p>
                    </Td>
                    <Td>
                      <Pill tone={promotion.scope === "marketplace" ? "ember" : "neutral"}>
                        {promotion.scope}
                      </Pill>
                    </Td>
                    <Td>
                      <Pill
                        tone={
                          promotion.status === "active"
                            ? "success"
                            : promotion.status === "scheduled"
                              ? "info"
                              : promotion.status === "ended"
                                ? "neutral"
                                : "warn"
                        }
                      >
                        {promotion.status}
                      </Pill>
                    </Td>
                    <Td align="right" className="font-mono text-[12px] tabular-nums text-chalk-dim">
                      {promotion.uses}
                    </Td>
                    <Td align="right" className="font-mono text-[12.5px] tabular-nums">
                      {money(promotion.revenue, { cents: false })}
                    </Td>
                    <Td className="font-mono text-[11px] text-chalk-dim">
                      {dateShort(promotion.endsAt)}
                    </Td>
                    <Td align="right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          aria-label={promotion.status === "active" ? "Pause promotion" : "Resume promotion"}
                          onClick={() => {
                            setRows((prev) =>
                              prev.map((r) =>
                                r.id === promotion.id
                                  ? { ...r, status: r.status === "active" ? "scheduled" : "active" }
                                  : r,
                              ),
                            );
                            toast.success(
                              promotion.status === "active"
                                ? `${promotion.name} paused`
                                : `${promotion.name} is running`,
                            );
                          }}
                          className="grid h-7 w-7 cursor-pointer place-items-center rounded-[2px] text-chalk-dim transition-colors hover:bg-panel-2 hover:text-chalk"
                        >
                          {promotion.status === "active" ? (
                            <Pause width={13} height={13} />
                          ) : (
                            <Play width={13} height={13} />
                          )}
                        </button>
                        <button
                          type="button"
                          aria-label="Delete promotion"
                          onClick={() => {
                            setRows((prev) => prev.filter((r) => r.id !== promotion.id));
                            toast.success(`${promotion.name} deleted`);
                          }}
                          className="grid h-7 w-7 cursor-pointer place-items-center rounded-[2px] text-chalk-dim transition-colors hover:bg-ember/12 hover:text-ember-soft"
                        >
                          <Trash2 width={13} height={13} />
                        </button>
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
            {!rows.length ? (
              <p className="py-10 text-center text-[13px] text-chalk-dim">
                No promotions yet \u2014 create one on the right.
              </p>
            ) : null}
          </div>
        </Panel>

        <Panel>
          <PanelHead title="Create a promotion" hint="Applies to your store, not the marketplace" />
          <div className="grid gap-4">
            <Field label="Name">
              <input
                className={inputClass}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Weekend 20% off"
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Type">
                <select
                  className={selectClass}
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value as Promotion["type"] })}
                >
                  <option value="percentage">Percentage off</option>
                  <option value="fixed">Fixed amount off</option>
                  <option value="free shipping">Free shipping</option>
                  <option value="bundle">Bundle</option>
                </select>
              </Field>
              <Field label="Value">
                <input
                  className={inputClass}
                  value={form.value}
                  onChange={(e) => setForm({ ...form, value: e.target.value })}
                  placeholder="20% off storewide"
                />
              </Field>
            </div>
            <StudioButton
              variant="primary"
              onClick={() => {
                if (!form.name.trim()) {
                  toast.error("Give the promotion a name");
                  return;
                }
                const created: Promotion = {
                  id: `prm_new_${Date.now().toString(36)}`,
                  name: form.name.trim(),
                  type: form.type,
                  value: form.value || "As configured",
                  scope: "store",
                  status: "scheduled",
                  uses: 0,
                  revenue: 0,
                  startsAt: new Date().toISOString(),
                  endsAt: new Date(Date.now() + 12096e5).toISOString(),
                };
                setRows((prev) => [created, ...prev]);
                setForm({ name: "", type: "percentage", value: "" });
                toast.success(`${created.name} scheduled`);
              }}
            >
              <Plus width={14} height={14} /> Schedule promotion
            </StudioButton>
          </div>
        </Panel>
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-[1.1fr_1fr]">
        <Panel>
          <PanelHead
            title="Promote something"
            hint="One link, everywhere you share it"
            action={<Share2 width={15} height={15} className="text-chalk-dim" />}
          />
          <div className="flex flex-wrap gap-2">
            {(["store", "product", "collection"] as TargetKind[]).map((kind) => (
              <button
                key={kind}
                type="button"
                onClick={() => setTarget(kind)}
                className={cn(
                  "cursor-pointer rounded-[2px] border px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.12em] transition-colors",
                  target === kind
                    ? "border-lime/40 bg-lime/10 text-lime"
                    : "border-hairline text-chalk-dim hover:border-chalk-dim",
                )}
              >
                {kind === "store" ? "My store" : kind === "product" ? "A product" : "A collection"}
              </button>
            ))}
          </div>

          {target === "product" ? (
            <div className="mt-4">
              <Field label="Which product">
                <select
                  className={selectClass}
                  value={productId || catalog[0]?.id}
                  onChange={(e) => setProductId(e.target.value)}
                >
                  {catalog.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          ) : null}

          {target === "collection" ? (
            <div className="mt-4">
              <Field label="Which collection">
                <select
                  className={selectClass}
                  value={collection}
                  onChange={(e) => setCollection(e.target.value)}
                >
                  {COLLECTIONS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          ) : null}

          <div className="mt-4 rounded-[2px] border border-hairline bg-void p-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-chalk-dim">
              Promoted item
            </p>
            <p className="mt-1.5 truncate text-[13px] text-chalk">{targetLabel}</p>
            <p className="mt-1 truncate font-mono text-[11px] text-lime">{shareUrl}</p>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <StudioButton onClick={() => copy(shareUrl, "Store link")}>
              <Copy width={14} height={14} /> Copy link
            </StudioButton>
            <StudioButton onClick={() => toast.success("Share sheet opened (simulated)")}>
              <Share2 width={14} height={14} /> Share
            </StudioButton>
            <StudioButton onClick={() => toast.success("Instagram story asset generated (simulated)")}>
              <Sparkles width={14} height={14} /> Social asset
            </StudioButton>
            <StudioButton onClick={() => toast.info("QR code is shown alongside")}>
              <QrCode width={14} height={14} /> QR code
            </StudioButton>
          </div>

          <div className="mt-4 flex items-start gap-3 rounded-[2px] border border-hairline p-4">
            <button
              type="button"
              onClick={() => setMarketplaceBoost((v) => !v)}
              aria-pressed={marketplaceBoost}
              className={cn(
                "mt-0.5 grid h-5 w-5 shrink-0 cursor-pointer place-items-center rounded-[2px] border transition-colors",
                marketplaceBoost ? "border-lime bg-lime text-void" : "border-hairline text-transparent",
              )}
            >
              <Check width={12} height={12} />
            </button>
            <div>
              <p className="text-[13px] text-chalk">Include in the marketplace spotlight</p>
              <p className="mt-1 text-[12px] text-chalk-dim">
                Featured promotions appear on the ferixas.com home rails while they run. Currently{" "}
                {marketplaceBoost ? "enabled" : "off"}.
              </p>
            </div>
          </div>
        </Panel>

        <div className="grid gap-3 self-start">
          <Panel>
            <PanelHead title="Scan to open" hint="Works on packaging and in-store cards" />
            <div className="flex flex-wrap items-center gap-5">
              <QrCodeBlock value={shareUrl} />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] text-chalk">{targetLabel}</p>
                <p className="mt-1 break-all font-mono text-[11px] text-chalk-dim">{shareUrl}</p>
                <StudioButton className="mt-3" onClick={() => copy(shareUrl, "Link")}>
                  <Link2 width={13} height={13} /> Copy for print
                </StudioButton>
              </div>
            </div>
          </Panel>

          <Panel>
            <PanelHead title="Top promoted products" hint="By promotion-attributed revenue" />
            <ul className="space-y-3">
              {catalog.slice(0, 4).map((product) => (
                <li key={product.id} className="flex items-center gap-3">
                  <ProductThumb product={product} className="h-9 w-9 shrink-0 rounded-[2px]" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12.5px] text-chalk">{product.title}</p>
                    <p className="font-mono text-[10.5px] text-chalk-dim">
                      {product.sold30d} sold \u00b7 {money(product.price * product.sold30d, { cents: false })}
                    </p>
                  </div>
                  <BadgePercent width={14} height={14} className="text-lime" />
                </li>
              ))}
            </ul>
          </Panel>

          <Panel>
            <h3 className="font-display text-[14.5px] font-semibold text-chalk">
              Where promotions can apply
            </h3>
            <ul className="mt-3 space-y-2">
              {[
                ["Your store", "Full control, no platform commission"],
                ["The marketplace", "Optional spotlight, commission still applies"],
                ["A product", "Single-item discount or bundle"],
                ["A collection", "Seasonal edits and clearance runs"],
              ].map(([title, body]) => (
                <li key={title} className="flex gap-2.5">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-lime" />
                  <span className="text-[12.5px] leading-relaxed text-chalk-dim">
                    <span className="text-chalk">{title}</span> \u2014 {body}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-4 font-mono text-[10.5px] text-chalk-dim">
              Store: {getMerchant(merchantId).domain}
            </p>
          </Panel>
        </div>
      </div>
    </StudioShell>
  );
}

function QrCodeBlock({ value }: { value: string }) {
  const size = 21;
  const cells = useMemo(() => {
    const grid: boolean[] = [];
    for (let i = 0; i < size * size; i += 1) {
      const h = (hashHue(`${value}-${i}`, 1000) + i * 7) % 100;
      grid.push(h > 52);
    }
    return grid;
  }, [value]);

  const isFinder = (row: number, col: number) =>
    (row < 7 && col < 7) || (row < 7 && col >= size - 7) || (row >= size - 7 && col < 7);

  return (
    <div className="rounded-[2px] border border-hairline bg-chalk p-3">
      <svg viewBox={`0 0 ${size} ${size}`} className="h-[124px] w-[124px]" role="img" aria-label="Store QR code">
        <rect width={size} height={size} fill="#e9ecf1" />
        {Array.from({ length: size }).map((_, row) =>
          Array.from({ length: size }).map((__, col) => {
            const finder = isFinder(row, col);
            const inner = finder && row > 1 && col > 1 && row < size - 2 && col < size - 2;
            const on = finder
              ? (row % 6 === 0 || col % 6 === 0) && !(inner && ((row % 6 < 2 && col % 6 < 2) === false))
              : cells[row * size + col];
            if (!on) return null;
            return (
              <rect
                key={`${row}-${col}`}
                x={col}
                y={row}
                width={1}
                height={1}
                fill="#0b0d11"
                shapeRendering="crispEdges"
              />
            );
          }),
        )}
      </svg>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Check,
  ExternalLink,
  Eye,
  EyeOff,
  FileText,
  Globe,
  Lock,
  Palette,
  PenTool,
  Plus,
  Save,
  Store,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { money } from "@/lib/format";
import { useFerixas } from "@/lib/store";
import type { StorePage } from "@/lib/types";
import { StudioShell } from "@/components/studio/shell";
import {
  Field,
  Panel,
  PanelHead,
  Pill,
  SegmentedControl,
  StudioButton,
  inputClass,
  selectClass,
} from "@/components/studio/bits";
import { ProductThumb } from "@/components/shop/product-plate";
import { cn } from "@/lib/utils";

const ACCENTS = [
  { name: "Ember", value: "#e4572e", ink: "#ffffff" },
  { name: "Pine", value: "#1f4b43", ink: "#ffffff" },
  { name: "Azure", value: "#0e5fa8", ink: "#ffffff" },
  { name: "Rosewood", value: "#b0455f", ink: "#ffffff" },
  { name: "Ochre", value: "#c9762a", ink: "#ffffff" },
  { name: "Olive", value: "#7a6a4f", ink: "#ffffff" },
  { name: "Lime", value: "#c9f24d", ink: "#0b0d11" },
  { name: "Plum", value: "#6b4a5c", ink: "#ffffff" },
];

const FONTS = [
  { label: "Bricolage Grotesque", value: "var(--font-bricolage)" },
  { label: "Archivo", value: "var(--font-archivo)" },
  { label: "IBM Plex Mono", value: "var(--font-plex)" },
];

export default function StorePage() {
  const { merchant, merchantId, updateMerchant, products, follows, toggleFollow } = useFerixas();
  const [nav, setNav] = useState<string[]>(merchant.nav ?? []);
  const [pages, setPages] = useState<StorePage[]>(merchant.pages ?? []);
  const [newNav, setNewNav] = useState("");
  const [visibility, setVisibility] = useState<"public" | "unlisted" | "password">(
    merchant.visibility ?? "public",
  );
  const [password, setPassword] = useState(merchant.storePassword ?? "");
  const [seoHidden, setSeoHidden] = useState(merchant.seoHidden ?? false);
  const [name, setName] = useState(merchant.name);
  const [tagline, setTagline] = useState(merchant.tagline);
  const [about, setAbout] = useState(merchant.about);
  const [accent, setAccent] = useState(merchant.brand.accent);
  const [accenInk, setAccentInk] = useState(merchant.brand.accentInk);
  const [font, setFont] = useState(merchant.brand.displayFont);
  const [radius, setRadius] = useState(merchant.brand.radius);

  const catalog = products.filter((p) => p.merchantId === merchantId);
  const listed = catalog.filter((p) => p.status === "active" && p.channels.marketplace).length;
  const storeValue = catalog
    .filter((p) => p.status === "active" && p.channels.store)
    .reduce((s, p) => s + p.price * p.stock, 0);

  const move = (index: number, direction: -1 | 1) => {
    const next = [...nav];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setNav(next);
  };

  const save = () => {
    updateMerchant(merchantId, {
      name,
      tagline,
      about,
      nav,
      pages,
      visibility,
      storePassword: visibility === "password" ? password : null,
      seoHidden,
      brand: { ...merchant.brand, accent, accentInk: accenInk, displayFont: font, radius },
    });
    toast.success("Storefront settings saved \u2014 your live store reflects them");
  };

  return (
    <StudioShell
      title="Store"
      subtitle={`${merchant.customDomain ?? merchant.domain} \u00b7 ${catalog.length} products`}
      actions={
        <div className="flex items-center gap-2">
          <Link href={`/store/${merchant.slug}`}>
            <StudioButton>
              <ExternalLink width={14} height={14} /> View store
            </StudioButton>
          </Link>
          <StudioButton variant="primary" onClick={save}>
            <Save width={14} height={14} /> Save
          </StudioButton>
        </div>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Store products", value: String(catalog.length), hint: `${listed} also on the marketplace` },
          { label: "Storefront value", value: money(storeValue, { cents: false }), hint: "Sellable at retail" },
          { label: "Followers", value: String(merchant.followers), hint: follows.includes(merchantId) ? "You follow this store" : "Customer follows" },
          { label: "Theme", value: merchant.brand.template, hint: "Applied from the Design Engine" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-[3px] border border-hairline bg-panel p-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-chalk-dim">{stat.label}</p>
            <p className="mt-3 font-mono text-[20px] font-semibold tabular-nums text-chalk">{stat.value}</p>
            <p className="mt-1 text-[12px] text-chalk-dim">{stat.hint}</p>
          </div>
        ))}
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-[1.35fr_1fr]">
        <div className="grid gap-3">
          <Panel>
            <PanelHead title="Store identity" hint="Shown on your storefront, invoices and the marketplace" />
            <div className="grid gap-4">
              <div className="flex items-start gap-4">
                <div
                  className="grid h-16 w-16 shrink-0 place-items-center rounded-[2px] font-display text-[24px] font-extrabold"
                  style={{ background: accent, color: accenInk }}
                >
                  {name.slice(0, 1)}
                </div>
                <div className="min-w-0 flex-1">
                  <Field label="Store name">
                    <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
                  </Field>
                  <p className="mt-2 font-mono text-[10.5px] text-chalk-dim">
                    Logo upload is simulated \u2014 the letter block uses your brand colour.
                  </p>
                </div>
              </div>
              <Field label="Tagline" hint="One line that sells the store">
                <input className={inputClass} value={tagline} onChange={(e) => setTagline(e.target.value)} />
              </Field>
              <Field label="About the store" hint="Appears on your About page and the marketplace store card">
                <textarea
                  className={cn(inputClass, "min-h-[92px] resize-y py-2.5")}
                  value={about}
                  onChange={(e) => setAbout(e.target.value)}
                />
              </Field>
            </div>
          </Panel>

          <Panel>
            <PanelHead
              title="Brand identity"
              hint="These tokens flow into every product card, button and section"
              action={<Palette width={15} height={15} className="text-chalk-dim" />}
            />
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-chalk-dim">
              Accent colour
            </p>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {ACCENTS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  aria-label={option.name}
                  onClick={() => {
                    setAccent(option.value);
                    setAccentInk(option.ink);
                  }}
                  className={cn(
                    "h-8 w-8 cursor-pointer rounded-[2px] border transition-transform",
                    accent === option.value
                      ? "border-chalk scale-110"
                      : "border-hairline hover:scale-105",
                  )}
                  style={{ background: option.value }}
                />
              ))}
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              <Field label="Display font">
                <select className={selectClass} value={font} onChange={(e) => setFont(e.target.value)}>
                  {FONTS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Corner radius" hint={`${radius}px`}>
                <input
                  type="range"
                  min={0}
                  max={16}
                  value={radius}
                  onChange={(e) => setRadius(Number(e.target.value))}
                  className="mt-3 w-full cursor-pointer accent-[#c9f24d]"
                />
              </Field>
              <Field label="Theme template" hint="Start from any template in the Design Engine">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[13px] text-chalk">{merchant.brand.template}</span>
                  <Link href="/merchant/design">
                    <StudioButton>
                      <PenTool width={13} height={13} /> Open
                    </StudioButton>
                  </Link>
                </div>
              </Field>
            </div>
          </Panel>

          <Panel>
            <PanelHead
              title="Navigation"
              hint="The links along the top of your storefront"
              action={
                <StudioButton
                  onClick={() => {
                    if (!newNav.trim()) return;
                    setNav([...nav, newNav.trim()]);
                    setNewNav("");
                  }}
                >
                  <Plus width={13} height={13} /> Add link
                </StudioButton>
              }
            />
            <ul className="space-y-2">
              {nav.map((item, index) => (
                <li
                  key={`${item}-${index}`}
                  className="flex items-center gap-2 rounded-[2px] border border-hairline px-3 py-2"
                >
                  <span className="flex-1 text-[13px] text-chalk">{item}</span>
                  <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-chalk-dim">
                    {index === 0 ? "first" : `#${index + 1}`}
                  </span>
                  <button
                    type="button"
                    aria-label={`Move ${item} up`}
                    onClick={() => move(index, -1)}
                    className="grid h-7 w-7 cursor-pointer place-items-center rounded-[2px] text-chalk-dim hover:bg-panel-2 hover:text-chalk"
                  >
                    <ArrowUp width={12} height={12} />
                  </button>
                  <button
                    type="button"
                    aria-label={`Move ${item} down`}
                    onClick={() => move(index, 1)}
                    className="grid h-7 w-7 cursor-pointer place-items-center rounded-[2px] text-chalk-dim hover:bg-panel-2 hover:text-chalk"
                  >
                    <ArrowDown width={12} height={12} />
                  </button>
                  <button
                    type="button"
                    aria-label={`Remove ${item}`}
                    onClick={() => setNav(nav.filter((_, i) => i !== index))}
                    className="grid h-7 w-7 cursor-pointer place-items-center rounded-[2px] text-chalk-dim hover:bg-ember/12 hover:text-ember-soft"
                  >
                    <Trash2 width={12} height={12} />
                  </button>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex gap-2">
              <input
                className={inputClass}
                value={newNav}
                onChange={(e) => setNewNav(e.target.value)}
                placeholder="New link label"
              />
            </div>
          </Panel>

          <Panel>
            <PanelHead
              title="Pages"
              hint="Build extra pages and choose which appear in navigation"
              action={
                <StudioButton
                  onClick={() =>
                    setPages([
                      ...pages,
                      {
                        id: `page_${Date.now().toString(36)}`,
                        name: "New page",
                        slug: `/page-${pages.length + 1}`,
                        visible: false,
                        system: false,
                      },
                    ])
                  }
                >
                  <Plus width={13} height={13} /> New page
                </StudioButton>
              }
            />
            <ul className="space-y-2">
              {pages.map((page) => (
                <li
                  key={page.id}
                  className="flex flex-wrap items-center gap-2 rounded-[2px] border border-hairline px-3 py-2"
                >
                  <FileText width={13} height={13} className="text-chalk-dim" />
                  <input
                    className="min-w-0 flex-1 border-0 bg-transparent text-[13px] text-chalk outline-none"
                    value={page.name}
                    onChange={(e) =>
                      setPages(pages.map((p) => (p.id === page.id ? { ...p, name: e.target.value } : p)))
                    }
                    aria-label={`Name for ${page.name}`}
                  />
                  <span className="font-mono text-[10.5px] text-chalk-dim">{page.slug}</span>
                  {page.system ? <Pill tone="neutral">System</Pill> : null}
                  <button
                    type="button"
                    onClick={() =>
                      setPages(pages.map((p) => (p.id === page.id ? { ...p, visible: !p.visible } : p)))
                    }
                    className={cn(
                      "inline-flex cursor-pointer items-center gap-1.5 rounded-[2px] border px-2 py-[3px] font-mono text-[10px] uppercase tracking-[0.12em] transition-colors",
                      page.visible
                        ? "border-lime/35 bg-lime/10 text-lime"
                        : "border-hairline text-chalk-dim",
                    )}
                  >
                    {page.visible ? <Eye width={11} height={11} /> : <EyeOff width={11} height={11} />}
                    {page.visible ? "Visible" : "Hidden"}
                  </button>
                </li>
              ))}
            </ul>
          </Panel>
        </div>

        <div className="grid gap-3 self-start">
          <Panel>
            <PanelHead title="Brand preview" hint="Live tokens as the storefront renders them" />
            <div
              className="overflow-hidden rounded-[2px] border"
              style={{ borderColor: "#242c39", background: "#f5f2ec" }}
            >
              <div className="flex items-center justify-between px-4 py-3" style={{ background: accent }}>
                <span
                  className="text-[13px] font-extrabold uppercase tracking-[0.18em]"
                  style={{ color: accenInk, fontFamily: font }}
                >
                  {name}
                </span>
                <span className="font-mono text-[10px]" style={{ color: accenInk, opacity: 0.85 }}>
                  Cart \u00b7 0
                </span>
              </div>
              <div className="px-4 py-5">
                <p className="text-[16px] font-semibold leading-snug text-ink" style={{ fontFamily: font }}>
                  {tagline}
                </p>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  {catalog.slice(0, 2).map((product) => (
                    <div key={product.id}>
                      <ProductThumb
                        product={product}
                        className="aspect-square w-full"
                      />
                      <p className="mt-2 line-clamp-1 text-[12px] text-ink">{product.title}</p>
                      <p className="font-mono text-[12.5px] font-semibold text-ink">
                        {money(product.price)}
                      </p>
                    </div>
                  ))}
                </div>
                <div
                  className="mt-4 inline-flex px-3 py-2 text-[12px] font-medium"
                  style={{ background: accent, color: accenInk, borderRadius: radius }}
                >
                  Shop all
                </div>
              </div>
            </div>
            <Link href={`/store/${merchant.slug}`} className="mt-4 block">
              <StudioButton variant="outline" className="w-full">
                <Store width={14} height={14} /> Open the real storefront
              </StudioButton>
            </Link>
          </Panel>

          <Panel>
            <PanelHead title="Store address" hint="Where customers find you" />
            <div className="space-y-2.5">
              <div className="rounded-[2px] border border-hairline p-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-chalk-dim">
                    Ferixas address
                  </span>
                  <Pill tone="success">
                    <Check width={11} height={11} /> Active
                  </Pill>
                </div>
                <p className="mt-2 truncate font-mono text-[12px] text-chalk">{merchant.domain}</p>
              </div>
              <div className="rounded-[2px] border border-hairline p-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-chalk-dim">
                    Custom domain
                  </span>
                  <Pill tone={merchant.customDomain ? "lime" : "neutral"}>
                    {merchant.customDomain ? "Connected" : "Not set"}
                  </Pill>
                </div>
                <p className="mt-2 truncate font-mono text-[12px] text-chalk">
                  {merchant.customDomain ?? "Connect one in Domains"}
                </p>
              </div>
            </div>
            <Link href="/merchant/domains" className="mt-3 block">
              <StudioButton className="w-full">
                <Globe width={14} height={14} /> Manage domains
              </StudioButton>
            </Link>
          </Panel>

          <Panel>
            <PanelHead title="Visibility" hint="Who can open the storefront" />
            <SegmentedControl
              value={visibility}
              onChange={setVisibility}
              options={[
                { value: "public", label: "Public" },
                { value: "unlisted", label: "Unlisted" },
                { value: "password", label: "Password" },
              ]}
            />
            {visibility === "password" ? (
              <div className="mt-3">
                <Field label="Store password">
                  <input
                    className={inputClass}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Only testers get this"
                  />
                </Field>
              </div>
            ) : null}
            <button
              type="button"
              onClick={() => setSeoHidden((v) => !v)}
              className="mt-4 flex w-full cursor-pointer items-start gap-3 rounded-[2px] border border-hairline p-3 text-left"
            >
              <span
                className={cn(
                  "mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-[2px] border",
                  seoHidden ? "border-lime bg-lime text-void" : "border-hairline text-transparent",
                )}
              >
                {seoHidden ? <Lock width={12} height={12} /> : null}
              </span>
              <span>
                <span className="block text-[13px] text-chalk">Hide from search engines</span>
                <span className="mt-1 block text-[12px] text-chalk-dim">
                  Adds no-index to every page. Useful while you are still building.
                </span>
              </span>
            </button>
          </Panel>

          <Panel>
            <PanelHead
              title="Marketplace participation"
              hint="Sell on ferixas.com alongside your own store"
            />
            <button
              type="button"
              onClick={() => {
                const next = !merchant.marketplaceEnabled;
                updateMerchant(merchantId, { marketplaceEnabled: next });
                toast.success(
                  next
                    ? "This store now sells on the Ferixas marketplace"
                    : "This store is now storefront-only",
                );
              }}
              className="flex w-full cursor-pointer items-center gap-3 rounded-[2px] border border-hairline p-3 text-left transition-colors hover:border-chalk-dim"
            >
              <span
                className={cn(
                  "grid h-5 w-5 shrink-0 place-items-center rounded-[2px] border",
                  merchant.marketplaceEnabled
                    ? "border-lime bg-lime text-void"
                    : "border-hairline text-transparent",
                )}
              >
                <Check width={12} height={12} />
              </span>
              <span className="flex-1">
                <span className="block text-[13px] text-chalk">
                  {merchant.marketplaceEnabled ? "Participating" : "Not participating"}
                </span>
                <span className="mt-1 block text-[12px] text-chalk-dim">
                  {listed} of {catalog.length} products are currently listed on the marketplace.
                </span>
              </span>
            </button>
            <p className="mt-3 text-[12.5px] leading-relaxed text-chalk-dim">
              Turning this off hides the whole store from ferixas.com. Individual products keep
              their own channel switches.
            </p>
            <Link href="/merchant/products" className="mt-3 block">
              <StudioButton className="w-full">
                Choose per product
              </StudioButton>
            </Link>
            <StudioButton
              className="mt-2 w-full"
              onClick={() => {
                toggleFollow(merchantId);
                toast.success("Follow state toggled");
              }}
            >
              {follows.includes(merchantId) ? "Unfollow this store" : "Follow as a customer"}
            </StudioButton>
          </Panel>
        </div>
      </div>
    </StudioShell>
  );
}

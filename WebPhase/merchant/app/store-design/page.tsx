import { Globe, Sparkles } from "lucide-react";
import { requireMerchant } from "@/lib/data";
import { getStorefront } from "@/lib/api";
import { PublishStorefront, StorefrontEditor } from "@/components/studio/storefront-editor";
import { Eyebrow, Panel, PanelHead, Pill } from "@/components/studio/bits";
import { dateShort, relative } from "@/lib/format";

const SWATCHES = [
  { key: "accent", label: "Accent" },
  { key: "canvas", label: "Canvas" },
  { key: "surface", label: "Surface" },
  { key: "ink", label: "Ink" },
  { key: "muted", label: "Muted" },
];

const LABELS = [
  { key: "template", label: "Template" },
  { key: "displayFont", label: "Display font" },
  { key: "radius", label: "Corner radius" },
  { key: "hero", label: "Hero layout" },
];

const SOON = ["Live canvas", "Templates", "Device preview", "AI assistant"];

export default async function StoreDesignPage() {
  const { session, merchant } = await requireMerchant();
  const data = await getStorefront(session);
  const document = data.document;
  const theme = document.data.theme ?? {};
  const navigation = document.data.navigation ?? [];
  const sections = document.data.sections ?? [];
  const pages = document.data.pages ?? [];
  const live = document.status === "published";

  const read = (key: string) => {
    const raw = theme[key];
    return raw === undefined || raw === null || raw === "" ? "not set" : String(raw);
  };
  const hex = (key: string) => {
    const raw = theme[key];
    return typeof raw === "string" && raw.startsWith("#") ? raw : undefined;
  };

  return (
    <div className="grid gap-5">
      <header>
        <Eyebrow>Storefront</Eyebrow>
        <h1 className="mt-1.5 font-display text-[23px] font-semibold text-chalk">Store design</h1>
        <p className="mt-1.5 max-w-[72ch] text-[13px] leading-relaxed text-chalk-dim">
          The content behind {merchant.name}&apos;s storefront, straight from the store backend.
        </p>
      </header>

      <Panel className="border-lime/25">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-[64ch]">
            <Eyebrow className="text-lime">Coming soon</Eyebrow>
            <h2 className="mt-2 font-display text-[18px] font-semibold text-chalk">Visual store design</h2>
            <p className="mt-2 text-[13px] leading-relaxed text-chalk-dim">
              The drag-and-drop design engine is still being built — it will let you design your storefront
              without writing any code.
            </p>
          </div>
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-[2px] border border-lime/30 bg-lime/10 text-lime">
            <Sparkles width={18} height={18} />
          </span>
        </div>
        <div className="mt-4 flex flex-wrap gap-1.5">
          {SOON.map((feature) => (
            <Pill key={feature}>{feature}</Pill>
          ))}
        </div>
      </Panel>

      <div className="grid gap-3 lg:grid-cols-[1.45fr_1fr]">
        <StorefrontEditor navigation={navigation} sections={sections} />

        <div className="grid content-start gap-3">
          <Panel>
            <PanelHead title="Document" hint="This is the record the storefront reads" />
            <ul className="grid gap-2.5 text-[12.5px] text-chalk-dim">
              <li className="flex items-center justify-between gap-3">
                <span>Status</span>
                <Pill tone={live ? "success" : "warn"}>{live ? "Published" : "Draft"}</Pill>
              </li>
              <li className="flex items-center justify-between gap-3">
                <span>Last saved</span>
                <span className="font-mono text-chalk">
                  {dateShort(document.updatedAt)} · {relative(document.updatedAt)}
                </span>
              </li>
              <li className="flex items-center justify-between gap-3">
                <span>Saved by</span>
                <span className="break-all font-mono text-chalk">{document.updatedBy || "Not recorded"}</span>
              </li>
              <li className="flex items-center justify-between gap-3">
                <span>Design engine</span>
                <span className="font-mono text-chalk">{data.designEngine}</span>
              </li>
            </ul>
            <div className="mt-4 border-t border-hairline pt-4">
              <PublishStorefront status={document.status} />
            </div>
          </Panel>

          <Panel>
            <PanelHead title="Theme" hint="Read-only until the design engine arrives" />
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-2">
              {SWATCHES.map((swatch) => (
                <div key={swatch.key} className="rounded-[2px] border border-hairline p-2.5">
                  <span
                    className="block h-10 w-full rounded-[2px] border border-hairline"
                    style={{
                      background:
                        hex(swatch.key) ??
                        "repeating-linear-gradient(45deg, #1a2130 0 6px, #131821 6px 12px)",
                    }}
                  />
                  <p className="mt-2 font-mono text-[9.5px] uppercase tracking-[0.14em] text-chalk-dim">
                    {swatch.label}
                  </p>
                  <p className="font-mono text-[11px] text-chalk">{read(swatch.key)}</p>
                </div>
              ))}
            </div>
            <ul className="mt-4 grid gap-2 border-t border-hairline pt-3">
              {LABELS.map((row) => (
                <li key={row.key} className="flex items-center justify-between gap-3">
                  <span className="text-[12.5px] text-chalk-dim">{row.label}</span>
                  <span className="font-mono text-[12px] text-chalk">{read(row.key)}</span>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel>
            <PanelHead title="Pages" hint="Standalone pages on your storefront" />
            {pages.length ? (
              <ul className="grid gap-2.5">
                {pages.map((page) => (
                  <li key={page.slug} className="rounded-[2px] border border-hairline p-3.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-[13px] font-medium text-chalk">{page.title}</span>
                      <span className="font-mono text-[10px] text-chalk-dim">/{page.slug}</span>
                    </div>
                    <p className="mt-1.5 line-clamp-2 text-[12px] leading-relaxed text-chalk-dim">
                      {page.body || "No content yet."}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[12.5px] text-chalk-dim">No standalone pages yet.</p>
            )}
          </Panel>

          <Panel>
            <PanelHead
              title="Custom domain"
              action={<Pill tone="neutral">Coming soon</Pill>}
            />
            <p className="text-[12.5px] leading-relaxed text-chalk-dim">
              Connecting a domain and issuing its SSL certificate is handled by the platform later.
            </p>
            <p className="mt-3 flex items-center gap-2 font-mono text-[11px] text-chalk-dim/70">
              <Globe width={12} height={12} className="shrink-0" />
              <span className="break-all">{merchant.customDomain ?? merchant.domain}</span>
            </p>
          </Panel>
        </div>
      </div>
    </div>
  );
}

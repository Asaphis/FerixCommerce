import { Check, ServerCog, ShieldCheck, Users2 } from "lucide-react";
import { requireAdmin } from "@/lib/data";
import { getSettings } from "@/lib/api";
import { SettingsForm } from "@/components/ops/settings-form";
import { Eyebrow, Panel, PanelHead, Pill, Readout } from "@/components/ops/bits";
import { num } from "@/lib/format";

export default async function SettingsPage() {
  const { session, admin } = await requireAdmin();
  const payload = await getSettings(session);
  const { settings, counts, admins } = payload;

  return (
    <div className="grid gap-5">
      <header>
        <Eyebrow>Platform settings</Eyebrow>
        <h1 className="mt-1.5 font-display text-[23px] font-semibold text-chalk">{settings.platformName} configuration</h1>
        <p className="mt-1.5 max-w-[74ch] text-[13px] leading-relaxed text-chalk-dim">
          The settings that govern the whole platform. Commission and tax apply at checkout, marketplace
          switches take effect for shoppers immediately, and everything is stored on the backend rather than in
          this console.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Readout label="Merchants" value={num(counts.merchants)} sub="Trading on the platform" tone="signal" />
        <Readout label="Products" value={num(counts.products)} sub="One catalogue, every channel" tone="mint" />
        <Readout label="Departments" value={num(counts.categories)} sub={`${counts.collections} curated collections`} tone="violet" />
        <Readout label="Commission" value={`${settings.defaultCommissionPct}%`} sub={`${settings.payoutCadence} payouts · ${settings.currency}`} tone="amber" />
      </div>

      <div className="grid gap-3 lg:grid-cols-[1.5fr_1fr]">
        <SettingsForm payload={payload} />

        <div className="grid gap-3">
          <Panel>
            <PanelHead title="Operators" hint="Who can sign in to this console" />
            <ul className="grid gap-2.5">
              {admins.map((email) => (
                <li key={email} className="flex items-center justify-between gap-3 rounded-[2px] border border-hairline px-3 py-2.5">
                  <span className="truncate font-mono text-[11.5px] text-chalk">{email}</span>
                  {email === admin.email ? (
                    <Pill tone="signal">
                      <Check width={10} height={10} /> You
                    </Pill>
                  ) : (
                    <Pill tone="neutral">Operator</Pill>
                  )}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[12px] leading-relaxed text-chalk-dim">
              Operator addresses are held by the backend. Adding or removing one is a backend change, not a
              console toggle — deliberately, so no one can promote themselves.
            </p>
          </Panel>

          <Panel>
            <PanelHead title="Live switches" hint="What is currently in force" />
            <ul className="grid gap-2.5 text-[12.5px]">
              <li className="flex items-center justify-between gap-3">
                <span className="text-chalk-dim">Marketplace</span>
                <Pill tone={settings.marketplaceEnabled ? "mint" : "rose"}>
                  {settings.marketplaceEnabled ? "Open" : "Closed"}
                </Pill>
              </li>
              <li className="flex items-center justify-between gap-3">
                <span className="text-chalk-dim">New merchants</span>
                <Pill tone={settings.newMerchantsNeedReview ? "amber" : "mint"}>
                  {settings.newMerchantsNeedReview ? "Held for review" : "Live at once"}
                </Pill>
              </li>
              <li className="flex items-center justify-between gap-3">
                <span className="text-chalk-dim">Tax at checkout</span>
                <span className="font-mono text-chalk">{settings.taxRatePct}%</span>
              </li>
              <li className="flex items-center justify-between gap-3">
                <span className="text-chalk-dim">Free delivery over</span>
                <span className="font-mono text-chalk">{settings.freeShippingOver}</span>
              </li>
            </ul>
          </Panel>

          <Panel>
            <PanelHead title="Where this is stored" hint="Nothing lives in the console" />
            <ul className="grid gap-2.5 text-[12.5px] text-chalk-dim">
              <li className="flex items-start gap-2.5">
                <ServerCog width={14} height={14} className="mt-[3px] shrink-0 text-signal" />
                Settings are written to the platform backend and read back on every page load.
              </li>
              <li className="flex items-start gap-2.5">
                <Users2 width={14} height={14} className="mt-[3px] shrink-0 text-signal" />
                The merchant console and the customer storefront read the same values, so nothing drifts.
              </li>
              <li className="flex items-start gap-2.5">
                <ShieldCheck width={14} height={14} className="mt-[3px] shrink-0 text-signal" />
                Your operator session expires after eight hours and is stored as a secure cookie.
              </li>
            </ul>
          </Panel>
        </div>
      </div>
    </div>
  );
}

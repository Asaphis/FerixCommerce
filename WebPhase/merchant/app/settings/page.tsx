import { ExternalLink, Globe, Palette, Store } from "lucide-react";
import { requireMerchant } from "@/lib/data";
import { getSettings } from "@/lib/api";
import { SettingsForm } from "@/components/studio/settings-form";
import { ProfileForm } from "@/components/studio/profile-form";
import { Eyebrow, Panel, PanelHead, Pill, StatTile } from "@/components/studio/bits";
import { dateLong, num } from "@/lib/format";

export default async function SettingsPage() {
  const { session, merchant } = await requireMerchant();
  const data = await getSettings(session);

  return (
    <div className="grid gap-5">
      <header>
        <Eyebrow>Store settings</Eyebrow>
        <h1 className="mt-1.5 font-display text-[23px] font-semibold text-chalk">{data.profile.name}</h1>
        
      </header>

      <div id="seller-profile"><ProfileForm profile={data.profile} request={data.profileRequest} /></div>

      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 xl:grid-cols-4">
        <StatTile label="Plan" value={data.plan} sub={`Trading since ${dateLong(merchant.since)}`} />
        <StatTile
          label="Marketplace"
          value={data.settings.marketplaceEnabled ? "Listed" : "Off"}
          sub="Platform-wide selling"
          accent={data.settings.marketplaceEnabled ? "lime" : "sand"}
        />
        <StatTile label="Template" value={data.settings.template} sub="Storefront design" accent="azure" />
        <StatTile label="Low stock at" value={num(data.settings.lowStockAt)} sub="Units before a warning" accent="chalk" />
      </div>

      <div className="grid gap-3 lg:grid-cols-[1.5fr_1fr]">
        <SettingsForm settings={data.settings} templates={data.templates} />

        <div className="grid gap-3">
          <Panel>
            <PanelHead title="Addresses" />
            <ul className="grid gap-3">
              <li className="flex items-start gap-3 rounded-[2px] border border-hairline p-3.5">
                <Store width={15} height={15} className="mt-[3px] shrink-0 text-chalk-dim" />
                <div className="min-w-0">
                  <p className="text-[12.5px] font-medium text-chalk">Ferixas subdomain</p>
                  <p className="mt-0.5 break-all font-mono text-[11px] text-chalk-dim">{data.domain}</p>
                </div>
              </li>
              <li className="flex items-start gap-3 rounded-[2px] border border-hairline p-3.5">
                <Globe width={15} height={15} className="mt-[3px] shrink-0 text-chalk-dim" />
                <div className="min-w-0">
                  <p className="text-[12.5px] font-medium text-chalk">Branded domain</p>
                  <p className="mt-0.5 break-all font-mono text-[11px] text-chalk-dim">
                    {data.settings.customDomain || "Not connected"}
                  </p>
                  <p className="mt-1 text-[10.5px] text-sand">Custom domain + SSL connection is coming soon.</p>
                </div>
              </li>
              <li className="flex items-start gap-3 rounded-[2px] border border-hairline p-3.5">
                <Palette width={15} height={15} className="mt-[3px] shrink-0 text-chalk-dim" />
                <div className="flex items-center gap-3">
                  <span
                    className="h-8 w-8 rounded-[2px] border border-hairline"
                    style={{ background: data.settings.accent }}
                  />
                  <div>
                    <p className="text-[12.5px] font-medium text-chalk">Brand colour</p>
                    <p className="font-mono text-[11px] text-chalk-dim">{data.settings.accent}</p>
                  </div>
                </div>
              </li>
            </ul>
          </Panel>

          <Panel>
            <PanelHead title="Account" />
            <ul className="grid gap-2.5 text-[12.5px] text-chalk-dim">
              <li className="flex items-center justify-between gap-3">
                <span>Sign-in email</span>
                <span className="break-all font-mono text-chalk">{data.email}</span>
              </li>
              <li className="flex items-center justify-between gap-3">
                <span>Verification</span>
                <Pill tone={merchant.verified ? "success" : "warn"}>
                  {merchant.verified ? "Verified seller" : "Not verified"}
                </Pill>
              </li>
              <li className="flex items-center justify-between gap-3">
                <span>Commission</span>
                <span className="font-mono text-chalk">{merchant.commissionPct ?? 8}%</span>
              </li>
              <li className="flex items-center justify-between gap-3">
                <span>Storefront</span>
                <span className="inline-flex items-center gap-1.5 font-mono text-chalk">
                  View <ExternalLink width={11} height={11} />
                </span>
              </li>
            </ul>
          </Panel>
        </div>
      </div>
    </div>
  );
}

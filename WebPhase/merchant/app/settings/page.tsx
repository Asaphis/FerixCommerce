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
          <Eyebrow>Marketplace settings</Eyebrow>
        <h1 className="mt-1.5 font-display text-[23px] font-semibold text-chalk">{data.profile.name}</h1>
        
      </header>

      <div id="seller-profile"><ProfileForm profile={data.profile} request={data.profileRequest} history={data.profileHistory} /></div>

      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 xl:grid-cols-4">
        <StatTile label="Plan" value={data.plan} sub={`Trading since ${dateLong(merchant.since)}`} />
        <StatTile
          label="Marketplace"
          value={data.settings.marketplaceEnabled ? "Listed" : "Off"}
          sub="Ferixas marketplace participation"
          accent={data.settings.marketplaceEnabled ? "lime" : "sand"}
        />
        <StatTile label="Latest profile request" value={data.profileRequest?.status.replaceAll("_", " ") ?? "none"} sub="Public changes require Admin approval" accent={data.profileRequest?.status === "pending_review" ? "sand" : "azure"} />
        <StatTile label="Low stock at" value={num(data.settings.lowStockAt)} sub="Units before a warning" accent="chalk" />
      </div>

      <div className="grid gap-3 lg:grid-cols-[1.5fr_1fr]">
        <SettingsForm settings={data.settings} />

        <div className="grid gap-3">
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
                <span>Marketplace commission</span>
                <span className="font-mono text-chalk">{merchant.commissionPct ?? 10}%</span>
              </li>
            </ul>
          </Panel>
        </div>
      </div>
    </div>
  );
}

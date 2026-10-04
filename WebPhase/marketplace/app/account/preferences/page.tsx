import Link from "next/link";
import { Coins, Languages } from "lucide-react";
import { requireAccount } from "@/lib/data";
import { AccountShell } from "@/components/ferix/account-shell";
import { PreferencesForm } from "@/components/ferix/forms";
import { money } from "@/lib/format";

export const metadata = {
  title: "Preferences — Ferixas",
  description: "Currency, language, message settings and review privacy.",
};

export default async function PreferencesPage() {
  const account = await requireAccount();
  const { user, stats } = account;
  const settings = user.settings;
  const currency = String(settings.currency ?? "USD");
  const language = String(settings.language ?? "English");

  return (
    <AccountShell
      account={account}
      title="Preferences"
      description="How the marketplace reads to you, and what we are allowed to send you."
    >
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.3fr_1fr]">
        <section className="rounded-[3px] border border-line-warm bg-white p-4 lg:p-5">
          <h2 className="font-display text-[15px] font-semibold text-ink">Display and messages</h2>
          <p className="mt-1 text-[12.5px] text-ink-soft">
            These choices are stored on your account, so they follow you to any device.
          </p>
          <div className="mt-4">
            <PreferencesForm settings={settings} />
          </div>
        </section>

        <div className="space-y-4">
          <section className="rounded-[3px] border border-line-warm bg-white p-4 lg:p-5">
            <h2 className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-ink-soft">Currently set</h2>
            <dl className="mt-3 space-y-3">
              <div className="flex items-center gap-2.5">
                <Coins width={14} height={14} className="shrink-0 text-ember" />
                <dt className="sr-only">Currency</dt>
                <dd className="text-[12.5px] text-ink">
                  {currency} · prices shown as {money(stats.spent, { cents: false })} lifetime
                </dd>
              </div>
              <div className="flex items-center gap-2.5">
                <Languages width={14} height={14} className="shrink-0 text-ember" />
                <dt className="sr-only">Language</dt>
                <dd className="text-[12.5px] text-ink">{language} storefront</dd>
              </div>
            </dl>
          </section>

          <section className="rounded-[3px] border border-line-warm bg-bone-soft/60 p-4 lg:p-5">
            <h2 className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-ink-soft">A note on messages</h2>
            <p className="mt-2 text-[12.5px] leading-relaxed text-ink-soft">
              Order updates are separate from marketing. If you switch off offers we still tell you when something you
              bought has shipped — you cannot miss a delivery.
            </p>
            <Link
              href="/privacy"
              className="mt-3 inline-block font-mono text-[10px] uppercase tracking-[0.14em] text-ember underline decoration-2 underline-offset-4"
            >
              Read the privacy policy
            </Link>
          </section>
        </div>
      </div>
    </AccountShell>
  );
}

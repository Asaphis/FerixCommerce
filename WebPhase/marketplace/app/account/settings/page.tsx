import { LogOut, ShieldCheck } from "lucide-react";
import { requireAccount } from "@/lib/data";
import { signOutAction } from "@/lib/actions";
import { AccountNav } from "@/components/ferix/account-nav";
import { SettingsForm } from "@/components/ferix/forms";
import { Eyebrow, Pill } from "@/components/ferix/marks";
import { dateLong, money } from "@/lib/format";

export default async function SettingsPage() {
  const account = await requireAccount();
  const { user, stats } = account;
  const settings = user.settings;

  return (
    <div className="mx-auto max-w-[1240px] px-4 py-8">
      <Eyebrow>Your account</Eyebrow>
      <h1 className="mt-2 font-display text-[26px] font-semibold text-ink">Settings</h1>
      <p className="mt-2 max-w-[62ch] text-[13.5px] leading-relaxed text-ink-soft">
        Your details, how we contact you, and what other shoppers can see.
      </p>

      <div className="mt-6">
        <AccountNav />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <section className="rounded-[3px] border border-line-warm bg-white p-5">
          <Eyebrow>Profile and preferences</Eyebrow>
          <div className="mt-4">
            <SettingsForm user={user} settings={settings} />
          </div>
        </section>

        <div className="space-y-4">
          <section className="rounded-[3px] border border-line-warm bg-white p-5">
            <div className="flex items-center gap-2">
              <ShieldCheck width={15} height={15} className="text-ember" />
              <Eyebrow>Account</Eyebrow>
            </div>
            <dl className="mt-4 space-y-2.5">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-[13px] text-ink-soft">Email</dt>
                <dd className="font-mono text-[12.5px] text-ink">{user.email}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-[13px] text-ink-soft">Customer since</dt>
                <dd className="font-mono text-[12.5px] text-ink">{dateLong(stats.since)}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-[13px] text-ink-soft">Orders</dt>
                <dd className="font-mono text-[12.5px] text-ink">{stats.orderCount}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-[13px] text-ink-soft">Lifetime spend</dt>
                <dd className="font-mono text-[12.5px] text-ink">{money(stats.spent)}</dd>
              </div>
            </dl>
            <p className="mt-4 flex items-center gap-2">
              <Pill tone="success">Email verified</Pill>
              <Pill tone="neutral">Buyer account</Pill>
            </p>
          </section>

          <section className="rounded-[3px] border border-line-warm bg-white p-5">
            <Eyebrow>Session</Eyebrow>
            <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">
              Signing out ends this session on the store's backend. Signing back in brings your cart, saved items and
              orders with you.
            </p>
            <form action={signOutAction} className="mt-4">
              <button
                type="submit"
                className="inline-flex cursor-pointer items-center gap-2 rounded-[2px] border border-line-warm px-4 py-2.5 text-[13px] font-semibold text-ink transition-colors hover:border-ember/40 hover:text-ember"
              >
                <LogOut width={15} height={15} /> Sign out of Ferixas
              </button>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}

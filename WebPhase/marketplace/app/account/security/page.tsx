import Link from "next/link";
import { KeyRound, Lock, LogOut, Monitor, ShieldCheck, Smartphone } from "lucide-react";
import { requireAccount } from "@/lib/data";
import { signOutAction } from "@/lib/actions";
import { AccountShell } from "@/components/ferix/account-shell";
import { Pill } from "@/components/ferix/marks";
import { dateLong } from "@/lib/format";

export const metadata = {
  title: "Security — Ferixas",
  description: "Password, active sessions and how to keep your account safe.",
};

export default async function SecurityPage() {
  const account = await requireAccount();
  const { user, stats } = account;

  return (
    <AccountShell
      account={account}
      title="Security"
      description="Your sign-in details, the devices using your account, and how to lock it down."
    >
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.3fr_1fr]">
        <div className="space-y-4">
          <section className="rounded-[3px] border border-line-warm bg-white p-4 lg:p-5">
            <div className="flex items-start gap-3">
              <KeyRound width={16} height={16} className="mt-0.5 shrink-0 text-ember" />
              <div className="min-w-0 flex-1">
                <h2 className="font-display text-[15px] font-semibold text-ink">Password</h2>
                <p className="mt-1 text-[12.5px] leading-relaxed text-ink-soft">
                  For your safety we never show or email an existing password. We send a single-use link that lets you
                  choose a new one — the link expires after 30 minutes.
                </p>
                <Link
                  href="/forgot-password"
                  className="mt-3 inline-flex items-center gap-2 rounded-[2px] bg-ink px-3.5 py-2.5 font-mono text-[10px] uppercase tracking-[0.14em] text-bone transition-colors hover:bg-ember"
                >
                  <Lock width={13} height={13} /> Send a reset link
                </Link>
                <p className="mt-2 font-mono text-[9.5px] uppercase tracking-[0.12em] text-ink-soft">
                  Sent to {user.email}
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-[3px] border border-line-warm bg-white p-4 lg:p-5">
            <div className="flex items-start gap-3">
              <Monitor width={16} height={16} className="mt-0.5 shrink-0 text-ember" />
              <div className="min-w-0 flex-1">
                <h2 className="font-display text-[15px] font-semibold text-ink">Where you are signed in</h2>
                <ul className="mt-3 divide-y divide-line-warm">
                  <li className="flex items-center gap-3 py-3">
                    <Smartphone width={15} height={15} className="shrink-0 text-ink-soft" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] font-medium text-ink">This browser</span>
                      <span className="block font-mono text-[9.5px] uppercase tracking-[0.12em] text-ink-soft">
                        Active now
                      </span>
                    </span>
                    <Pill tone="success">Current</Pill>
                  </li>
                </ul>
                <p className="mt-2 text-[12.5px] leading-relaxed text-ink-soft">
                  One session is kept per browser. Signing out ends it here and on the store's servers; your cart, saved
                  items and orders stay with your account.
                </p>
                <form action={signOutAction} className="mt-3">
                  <button
                    type="submit"
                    className="inline-flex cursor-pointer items-center gap-2 rounded-[2px] border border-line-warm px-3.5 py-2.5 font-mono text-[10px] uppercase tracking-[0.14em] text-ink transition-colors hover:border-ember/40 hover:text-ember"
                  >
                    <LogOut width={13} height={13} /> Sign out of this browser
                  </button>
                </form>
              </div>
            </div>
          </section>
        </div>

        <div className="space-y-4">
          <section className="rounded-[3px] border border-line-warm bg-white p-4 lg:p-5">
            <div className="flex items-center gap-2">
              <ShieldCheck width={15} height={15} className="text-ember" />
              <h2 className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-ink-soft">Account</h2>
            </div>
            <dl className="mt-3 space-y-2.5">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-[12.5px] text-ink-soft">Email verified</dt>
                <dd>
                  <Pill tone="success">Yes</Pill>
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-[12.5px] text-ink-soft">Two-step verification</dt>
                <dd>
                  <Pill tone="neutral">Not enabled</Pill>
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-[12.5px] text-ink-soft">Customer since</dt>
                <dd className="font-mono text-[12px] text-ink">{dateLong(stats.since)}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-[12.5px] text-ink-soft">Orders placed</dt>
                <dd className="font-mono text-[12px] text-ink">{stats.orderCount}</dd>
              </div>
            </dl>
            <p className="mt-3 border-t border-line-warm pt-3 text-[12px] leading-relaxed text-ink-soft">
              Two-step verification is being rolled out to shoppers. Ask support to put your account in the next batch.
            </p>
            <Link
              href="/contact"
              className="mt-2 inline-block font-mono text-[10px] uppercase tracking-[0.14em] text-ember underline decoration-2 underline-offset-4"
            >
              Request early access
            </Link>
          </section>

          <section className="rounded-[3px] border border-line-warm bg-bone-soft/60 p-4 lg:p-5">
            <h2 className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-ink-soft">Keeping safe</h2>
            <ul className="mt-3 space-y-2 text-[12.5px] leading-relaxed text-ink-soft">
              <li>· Ferixas never asks for your password by email or chat</li>
              <li>· Payment details are handled at checkout, never stored in your profile</li>
              <li>· If an order looks wrong, check it here before replying to anyone</li>
            </ul>
            <Link
              href="/account/orders"
              className="mt-3 inline-block font-mono text-[10px] uppercase tracking-[0.14em] text-ember underline decoration-2 underline-offset-4"
            >
              Review my orders
            </Link>
          </section>
        </div>
      </div>
    </AccountShell>
  );
}

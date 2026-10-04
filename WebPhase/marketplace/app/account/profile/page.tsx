import { Mail, Phone, ShieldCheck, User2 } from "lucide-react";
import { requireAccount } from "@/lib/data";
import { AccountShell } from "@/components/ferix/account-shell";
import { ProfileForm } from "@/components/ferix/forms";
import { Pill } from "@/components/ferix/marks";
import { dateShort } from "@/lib/format";

export const metadata = {
  title: "Profile — Ferixas",
  description: "Your name, contact details and how they appear across the marketplace.",
};

export default async function ProfilePage() {
  const account = await requireAccount();
  const { user, stats } = account;

  return (
    <AccountShell
      account={account}
      title="Profile"
      description="The name and contact details sellers use when they need to reach you about an order."
    >
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.3fr_1fr]">
        <section className="rounded-[3px] border border-line-warm bg-white p-4 lg:p-5">
          <h2 className="font-display text-[15px] font-semibold text-ink">Your details</h2>
          <p className="mt-1 text-[12.5px] text-ink-soft">
            Changing your name updates the initials shown on reviews and the header.
          </p>
          <div className="mt-4">
            <ProfileForm user={user} />
          </div>
        </section>

        <div className="space-y-4">
          <section className="rounded-[3px] border border-line-warm bg-white p-4 lg:p-5">
            <div className="flex items-center gap-3">
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-ink font-display text-[19px] font-extrabold text-lime">
                {user.avatarInitials}
              </span>
              <div className="min-w-0">
                <p className="truncate font-display text-[16px] font-semibold text-ink">{user.name}</p>
                <p className="mt-1 flex flex-wrap items-center gap-1.5">
                  <Pill tone="success">
                    <ShieldCheck width={10} height={10} /> Verified
                  </Pill>
                  <Pill tone="neutral">{user.segment === "vip" ? "VIP shopper" : "Shopper"}</Pill>
                </p>
              </div>
            </div>

            <dl className="mt-4 space-y-2.5 border-t border-line-warm pt-4">
              <div className="flex items-center gap-2.5">
                <Mail width={14} height={14} className="shrink-0 text-ember" />
                <dt className="sr-only">Email</dt>
                <dd className="truncate font-mono text-[12px] text-ink">{user.email}</dd>
              </div>
              <div className="flex items-center gap-2.5">
                <Phone width={14} height={14} className="shrink-0 text-ember" />
                <dt className="sr-only">Phone</dt>
                <dd className="truncate font-mono text-[12px] text-ink">{user.phone || "Not added yet"}</dd>
              </div>
              <div className="flex items-center gap-2.5">
                <User2 width={14} height={14} className="shrink-0 text-ember" />
                <dt className="sr-only">Customer since</dt>
                <dd className="font-mono text-[12px] text-ink">Customer since {dateShort(stats.since)}</dd>
              </div>
            </dl>
          </section>

          <section className="rounded-[3px] border border-line-warm bg-bone-soft/60 p-4 lg:p-5">
            <h2 className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-ink-soft">Where your name shows</h2>
            <ul className="mt-3 space-y-2 text-[12.5px] text-ink-soft">
              <li>· On product reviews, unless you switch that off in preferences</li>
              <li>· On the delivery label for every order you place</li>
              <li>· To the seller handling your order — never to other shoppers</li>
            </ul>
          </section>
        </div>
      </div>
    </AccountShell>
  );
}

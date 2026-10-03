import { Check, Plus, Star, Trash2 } from "lucide-react";
import { requireAccount } from "@/lib/data";
import { deleteAddressAction, setDefaultAddressAction } from "@/lib/actions";
import { AccountNav } from "@/components/ferix/account-nav";
import { AddressForm } from "@/components/ferix/forms";
import { Eyebrow, Pill } from "@/components/ferix/marks";

export default async function AddressesPage() {
  const account = await requireAccount();
  const { addresses } = account;

  return (
    <div className="mx-auto max-w-[1240px] px-4 py-8">
      <Eyebrow>Your account</Eyebrow>
      <h1 className="mt-2 font-display text-[26px] font-semibold text-ink">Delivery addresses</h1>
      <p className="mt-2 max-w-[62ch] text-[13.5px] leading-relaxed text-ink-soft">
        Saved addresses are offered at checkout. The default one is selected for you automatically.
      </p>

      <div className="mt-6">
        <AccountNav />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <div className="space-y-3">
          {addresses.length ? (
            addresses.map((address) => (
              <section key={address.id} className="rounded-[3px] border border-line-warm bg-white p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Eyebrow>{address.label}</Eyebrow>
                      {address.isDefault ? (
                        <Pill tone="success">
                          <Check width={10} height={10} /> Default
                        </Pill>
                      ) : null}
                    </div>
                    <p className="mt-2 text-[14px] font-medium text-ink">{address.name}</p>
                    <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink-soft">
                      {address.line1}
                      {address.line2 ? `, ${address.line2}` : ""}
                      <br />
                      {address.city}, {address.region} {address.postcode}
                      <br />
                      {address.country} · {address.phone}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {!address.isDefault ? (
                      <form action={setDefaultAddressAction}>
                        <input type="hidden" name="id" value={address.id} />
                        <button
                          type="submit"
                          className="inline-flex cursor-pointer items-center gap-1.5 rounded-[2px] border border-line-warm px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft transition-colors hover:border-ink/30 hover:text-ink"
                        >
                          <Star width={12} height={12} /> Make default
                        </button>
                      </form>
                    ) : null}
                    <form action={deleteAddressAction}>
                      <input type="hidden" name="id" value={address.id} />
                      <button
                        type="submit"
                        className="inline-flex cursor-pointer items-center gap-1.5 rounded-[2px] border border-line-warm px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft transition-colors hover:border-ember/40 hover:text-ember"
                      >
                        <Trash2 width={12} height={12} /> Remove
                      </button>
                    </form>
                  </div>
                </div>

                <details className="mt-4 border-t border-line-warm pt-4">
                  <summary className="cursor-pointer font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft transition-colors hover:text-ink">
                    Edit this address
                  </summary>
                  <div className="mt-4">
                    <AddressForm address={address} />
                  </div>
                </details>
              </section>
            ))
          ) : (
            <p className="rounded-[3px] border border-dashed border-line-warm px-6 py-10 text-center text-[13.5px] text-ink-soft">
              No addresses yet. Add the first one on the right.
            </p>
          )}
        </div>

        <section className="rounded-[3px] border border-line-warm bg-white p-5 lg:sticky lg:top-[132px] lg:self-start">
          <div className="flex items-center gap-2">
            <Plus width={15} height={15} className="text-ember" />
            <Eyebrow>Add an address</Eyebrow>
          </div>
          <div className="mt-4">
            <AddressForm />
          </div>
        </section>
      </div>

      <p className="mt-8 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft/70">
        {addresses.length} address{addresses.length === 1 ? "" : "es"} on file · used at checkout on every store
      </p>
    </div>
  );
}

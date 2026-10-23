import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { getShipping, quoteCheckout, getAddresses, ApiError } from "@/lib/api";
import { readCredentials } from "@/lib/session";
import { AddressForm, ShippingPicker } from "@/components/ferix/forms";
import { Eyebrow, LinkButton } from "@/components/ferix/marks";
import { money } from "@/lib/format";

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ shipping?: string; address?: string }>;
}) {
  const { shipping: shippingParam, address: addressParam } = await searchParams;
  const creds = await readCredentials();
  // The backend requires an authenticated shopper for quote and place-order calls.
  // Gate before either request rather than presenting a guest form the backend cannot fulfill.
  if (!creds.session) redirect(`/login?return=${encodeURIComponent("/checkout")}`);

  const shippingMethod = shippingParam ?? "standard";
  let quoteFailed: string | null = null;
  const [{ options, freeShippingOver }, quote, account] = await Promise.all([
    getShipping(),
    quoteCheckout(
      { addressId: addressParam ?? "", shippingMethod },
      creds,
    ).catch((error) => {
      if (error instanceof ApiError && [401, 409, 422].includes(error.status)) return null;
      quoteFailed = error instanceof ApiError ? error.message : "The totals could not be worked out just now.";
      return null;
    }),
    getAddresses(creds).catch(() => ({ addresses: [] })),
  ]);

  const addressList = account.addresses;
  const chosenAddress =
    addressParam ?? addressList.find((address) => address.isDefault)?.id ?? addressList[0]?.id;

  if (!quote) {
    return (
      <div className="mx-auto max-w-[720px] px-4 py-12">
        <h1 className="mt-2 font-display text-[26px] font-semibold text-ink">
          {quoteFailed ? "Checkout is temporarily unavailable" : "There is nothing to check out"}
        </h1>

        {quoteFailed ? (
          <p
            role="status"
            className="mt-4 rounded-[3px] border border-[#c0392b]/40 bg-[#c0392b]/8 px-4 py-3 text-[13px] leading-relaxed text-[#a33022]"
          >
            <span className="font-semibold">We could not work out your totals.</span> {quoteFailed} Your cart is
            untouched — try again in a moment.
          </p>
        ) : null}

        <p className="mt-2.5 text-[13.5px] text-ink-soft">
          {quoteFailed ? "Secure payment processing is not configured, so no order was created and your cart is untouched." : "Add something to your cart and it will show up here with delivery and totals worked out."}
        </p>
        <LinkButton href={quoteFailed ? "/cart" : "/browse"} className="mt-6">
          {quoteFailed ? "Back to cart" : "Browse the marketplace"}
        </LinkButton>
      </div>
    );
  }

  const step = chosenAddress ? 2 : 1;

  return (
    <div className="mx-auto max-w-[1240px] px-4 py-8">
      <h1 className="mt-2 font-display text-[28px] font-semibold leading-tight tracking-[-0.02em] text-ink">
        {step === 1 ? "Where should this go?" : "Review your delivery"}
      </h1>
      {/* Three steps, drawn as one progression rather than three loose tags: a done step
          carries a tick, the step you are on is the only dark one, and the ones ahead are
          quiet. A shopper should be able to see how much is left without reading. */}
      <ol className="mt-6 grid grid-cols-3 gap-2 sm:gap-3" aria-label="Checkout progress">
        {["Delivery address", "Shipping", "Checkout availability"].map((label, index) => {
          const position = index + 1;
          const done = position < step;
          const current = position === step;
          return (
            <li key={label} className="min-w-0" aria-current={current ? "step" : undefined}>
              <div
                className={`h-1 rounded-full ${
                  done ? "bg-pine" : current ? "bg-ember" : "bg-line-warm"
                }`}
              />
              <div className="mt-2 flex items-center gap-1.5">
                <span
                  className={`grid h-4 w-4 shrink-0 place-items-center rounded-full font-mono text-[11px] font-medium ${
                    done
                      ? "bg-pine text-white"
                      : current
                        ? "bg-ember text-white"
                        : "bg-line-warm text-ink-soft"
                  }`}
                >
                  {done ? "✓" : position}
                </span>
                <span
                  className={`truncate font-mono text-[9.5px] uppercase tracking-[0.12em] ${
                    current ? "text-ink" : "text-ink-soft"
                  }`}
                >
                  {label}
                </span>
              </div>
            </li>
          );
        })}
      </ol>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          {!addressList.length ? (
            <section className="rounded-[14px] border border-line-warm bg-white p-5 shadow-[0_1px_2px_rgba(15,35,56,0.04)]">
              <Eyebrow>Step 1 · Delivery address</Eyebrow>
              <p className="mt-1.5 max-w-[56ch] text-[13px] leading-relaxed text-ink-soft">
                Where this order should arrive. If you are signed in, it is saved to your account and
                offered again next time.
              </p>
              <div className="mt-5">
                <AddressForm />
              </div>
            </section>
          ) : (
            <section className="rounded-[3px] border border-line-warm bg-white p-5">
              <Eyebrow>Step 1 · Delivery address</Eyebrow>
              <div className="mt-3 grid gap-2">
                {addressList.map((address) => (
                  <Link
                    key={address.id}
                    href={`/checkout?shipping=${shippingMethod}&address=${address.id}`}
                    className={`rounded-[2px] border p-3 transition-colors ${
                      address.id === chosenAddress ? "border-ink bg-bone-soft" : "border-line-warm hover:border-ink/30"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft">{address.label}</span>
                      {address.isDefault ? (
                        <span className="inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-[0.14em] text-pine">
                          <CheckCircle2 width={11} height={11} /> Default
                        </span>
                      ) : null}
                    </span>
                    <span className="mt-1 block text-[13.5px] text-ink">{address.name}</span>
                    <span className="block text-[12.5px] text-ink-soft">
                      {address.line1}
                      {address.line2 ? `, ${address.line2}` : ""}, {address.city}, {address.region} {address.postcode}, {address.country}
                    </span>
                  </Link>
                ))}
                <Link
                  href="/account/addresses"
                  className="font-mono text-[11px] uppercase tracking-[0.14em] text-ember underline decoration-2 underline-offset-4"
                >
                  Manage addresses
                </Link>
              </div>
            </section>
          )}

          <section className="rounded-[3px] border border-line-warm bg-white p-5">
            <Eyebrow>Step 2 · Shipping</Eyebrow>
            <div className="mt-3">
              <ShippingPicker options={options} selected={shippingMethod} addressId={chosenAddress} />
            </div>
            <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft">
              Free over {money(freeShippingOver, { cents: false })} per seller
            </p>
          </section>

          <section className="rounded-[3px] border border-line-warm bg-white p-5">
            <Eyebrow>Step 3 · Checkout availability</Eyebrow>
            <p className="mt-1.5 text-[13px] text-ink-soft">
              Secure payment processing is not configured yet. No payment method is enabled, and no order can be
              placed until the provider is connected.
            </p>
          </section>
        </div>

        <aside className="lg:sticky lg:top-[132px] lg:self-start">
          <div className="rounded-[3px] border border-line-warm bg-white p-5">
            <Eyebrow>Order summary</Eyebrow>
            <ul className="mt-4 space-y-3">
              {quote.cart.merchants.map((group) => (
                <li key={group.merchant.id} className="border-b border-line-warm pb-3 last:border-0 last:pb-0">
                  <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft">{group.merchant.name}</p>
                  {group.items.map((line) => (
                    <p key={line.key} className="mt-1.5 flex justify-between gap-3 text-[12.5px] text-ink">
                      <span className="line-clamp-1">
                        {line.qty} × {line.product.title}
                      </span>
                      <span className="font-mono">{money(line.lineTotal)}</span>
                    </p>
                  ))}
                  <p className="mt-1.5 flex justify-between gap-3 font-mono text-[11px] text-ink-soft">
                    <span>Delivery</span>
                    <span>{group.shipping === 0 ? "Free" : money(group.shipping)}</span>
                  </p>
                </li>
              ))}
            </ul>

            <dl className="mt-4 space-y-2.5 border-t border-line-warm pt-4">
              <div className="flex justify-between">
                <dt className="text-[13px] text-ink-soft">Subtotal</dt>
                <dd className="font-mono text-[13px] text-ink">{money(quote.totals.subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[13px] text-ink-soft">Delivery</dt>
                <dd className="font-mono text-[13px] text-ink">{quote.totals.shipping === 0 ? "Free" : money(quote.totals.shipping)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[13px] text-ink-soft">Tax</dt>
                <dd className="font-mono text-[13px] text-ink">{money(quote.totals.tax)}</dd>
              </div>
              <div className="flex justify-between border-t border-line-warm pt-3">
                <dt className="font-display text-[14.5px] font-semibold text-ink">Total due</dt>
                <dd className="font-mono text-[15px] font-semibold text-ink">{money(quote.totals.total)}</dd>
              </div>
            </dl>

            <Link href="/cart" className="mt-4 block text-center font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft transition-colors hover:text-ember">
              Back to cart
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}

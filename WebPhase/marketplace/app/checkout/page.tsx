import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { getShipping, quoteCheckout, getAddresses, ApiError } from "@/lib/api";
import { readCredentials } from "@/lib/session";
import { AddressForm, PlaceOrderForm, ShippingPicker } from "@/components/ferix/forms";
import { Eyebrow, LinkButton } from "@/components/ferix/marks";
import { money } from "@/lib/format";

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ shipping?: string; address?: string; email?: string }>;
}) {
  const { shipping: shippingParam, address: addressParam, email: emailParam } = await searchParams;
  const creds = await readCredentials();
  // Signing in is one way to check out; leaving an email is the other. Nobody is sent to a
  // sign-in page they did not ask for.
  const isGuest = !creds.session;
  const typedEmail = (emailParam ?? "").trim();
  const emailLooksValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(typedEmail);

  const shippingMethod = shippingParam ?? "standard";
  let quoteFailed: string | null = null;
  const [{ options, paymentMethods, freeShippingOver }, quote, account] = await Promise.all([
    getShipping(),
    quoteCheckout(
      { addressId: addressParam ?? "", shippingMethod, email: emailLooksValid ? typedEmail : undefined },
      creds,
    ).catch((error) => {
      // An empty cart, or a guest who has not given an email yet, is a step rather than a
      // failure. Anything else is a real fault and is shown rather than thrown at the runtime.
      if (error instanceof ApiError && [401, 409, 422].includes(error.status)) return null;
      quoteFailed = error instanceof ApiError ? error.message : "The totals could not be worked out just now.";
      return null;
    }),
    // A guest has no saved addresses, and asking for them must not take the page down.
    getAddresses(creds).catch(() => ({ addresses: [] })),
  ]);

  const addressList = account.addresses;
  const chosenAddress =
    addressParam ?? addressList.find((address) => address.isDefault)?.id ?? addressList[0]?.id;

  if (!quote) {
    const missingEmail = isGuest && !emailLooksValid;
    const malformed = isGuest && typedEmail.length > 0 && !emailLooksValid;

    return (
      <div className="mx-auto max-w-[720px] px-4 py-12">
        <Eyebrow>Checkout</Eyebrow>
        <h1 className="mt-2 font-display text-[26px] font-semibold text-ink">
          {missingEmail ? "Your email, to begin" : "There is nothing to check out"}
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

        {missingEmail ? (
          <>
            <p className="mt-2.5 text-[13.5px] leading-relaxed text-ink-soft">
              No account needed. Leave an email address and your order confirmation goes there — and if you
              register with the same address later, the order is already yours.
            </p>

            <form method="get" action="/checkout" className="mt-6 grid gap-3 rounded-[3px] border border-line-warm bg-white p-5">
              <input type="hidden" name="shipping" value={shippingMethod} />
              <label className="grid gap-1.5">
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft">Email address</span>
                <input
                  name="email"
                  type="email"
                  required
                  defaultValue={typedEmail}
                  autoComplete="email"
                  placeholder="you@example.com"
                  aria-invalid={malformed}
                  className="h-11 rounded-[2px] border border-line-warm bg-bone-soft px-3 text-[13.5px] text-ink outline-none focus:border-ink/40"
                />
              </label>

              {malformed ? (
                <p role="status" className="text-[12.5px] text-[#a33022]">
                  That does not look like an email address — it needs an @ and a domain, like you@example.com.
                </p>
              ) : null}

              <div>
                <button
                  type="submit"
                  className="inline-flex min-h-11 items-center rounded-[3px] bg-ink px-4 text-[13px] font-semibold text-white"
                >
                  See my totals
                </button>
              </div>
              <p className="text-[12px] text-ink-soft">
                Delivery is asked for on the next step, and nothing is charged until you place the order.
              </p>
            </form>
          </>
        ) : (
          <>
            <p className="mt-2.5 text-[13.5px] text-ink-soft">
              Add something to your cart and it will show up here with delivery and totals worked out.
            </p>
            <LinkButton href="/browse" className="mt-6">
              Browse the marketplace
            </LinkButton>
          </>
        )}
      </div>
    );
  }

  const step = !addressList.length ? 1 : 2;

  return (
    <div className="mx-auto max-w-[1240px] px-4 py-8">
      <Eyebrow>Checkout</Eyebrow>
      <h1 className="mt-2 font-display text-[28px] font-semibold text-ink">
        {step === 1 ? "Where should this go?" : "Review and pay"}
      </h1>
      <p className="mt-2 max-w-[62ch] text-[13.5px] leading-relaxed text-ink-soft">
        {quote.totals.itemCount} items from {quote.cart.merchants.length} sellers. Each seller ships separately, but
        this is one payment and one order number.
      </p>

      <ol className="mt-6 flex flex-wrap gap-2">
        {["Delivery address", "Shipping and payment", "Confirmation"].map((label, index) => (
          <li
            key={label}
            className={`rounded-[2px] border px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] ${
              index < step ? "border-pine/40 bg-pine/10 text-pine" : "border-line-warm text-ink-soft"
            }`}
          >
            {index + 1}. {label}
          </li>
        ))}
      </ol>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          {!addressList.length ? (
            <section className="rounded-[3px] border border-line-warm bg-white p-5">
              <Eyebrow>Step 1 · Delivery address</Eyebrow>
              <p className="mt-1.5 text-[13px] text-ink-soft">Add the address this order should be delivered to.</p>
              <div className="mt-4">
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
                      <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft">{address.label}</span>
                      {address.isDefault ? (
                        <span className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.14em] text-pine">
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
                  className="font-mono text-[10px] uppercase tracking-[0.14em] text-ember underline decoration-2 underline-offset-4"
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
            <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft">
              Free over {money(freeShippingOver, { cents: false })} per seller
            </p>
          </section>

          <section className="rounded-[3px] border border-line-warm bg-white p-5">
            <Eyebrow>Step 3 · Payment</Eyebrow>
            <div className="mt-3 grid gap-2">
              {paymentMethods.map((method) => (
                <div key={method.id} className="flex items-center justify-between gap-3 rounded-[2px] border border-line-warm p-3">
                  <span>
                    <span className="block text-[13.5px] font-medium text-ink">{method.label}</span>
                    <span className="block text-[12px] text-ink-soft">{method.detail}</span>
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[3px] border border-line-warm bg-white p-5">
            <Eyebrow>Step 4 · Place the order</Eyebrow>
            <p className="mt-1.5 text-[13px] text-ink-soft">
              Pick the address and payment method, then place the order. The order appears in your account straight
              away.
            </p>
            <div className="mt-4">
              <PlaceOrderForm
                addresses={addressList}
                shippingMethod={shippingMethod}
                paymentMethods={paymentMethods}
                defaultAddressId={chosenAddress}
              />
            </div>
          </section>
        </div>

        <aside className="lg:sticky lg:top-[132px] lg:self-start">
          <div className="rounded-[3px] border border-line-warm bg-white p-5">
            <Eyebrow>Order summary</Eyebrow>
            <ul className="mt-4 space-y-3">
              {quote.cart.merchants.map((group) => (
                <li key={group.merchant.id} className="border-b border-line-warm pb-3 last:border-0 last:pb-0">
                  <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft">{group.merchant.name}</p>
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

            <Link href="/cart" className="mt-4 block text-center font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft transition-colors hover:text-ember">
              Back to cart
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  Check,
  CreditCard,
  Landmark,
  Lock,
  ShoppingBag,
  Truck,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { getMerchant } from "@/lib/data";
import { money } from "@/lib/format";
import { useFerixas } from "@/lib/store";
import { ShopShell } from "@/components/shop/shop-shell";
import { ProductPlate } from "@/components/shop/product-plate";
import { Eyebrow } from "@/components/shop/primitives";
import { cn } from "@/lib/utils";

type Delivery = "standard" | "express";
const DELIVERY_PRICE: Record<Delivery, number> = { standard: 6.5, express: 18 };
const DELIVERY_LABEL: Record<Delivery, string> = {
  standard: "Standard \u00b7 2\u20135 working days",
  express: "Express \u00b7 next working day",
};

export default function CheckoutPage() {
  const router = useRouter();
  const { cart, productById, placeOrder, merchant } = useFerixas();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    name: "Ferix Course",
    email: "ferixcourse@gmail.com",
    phone: "+234 803 411 2290",
    line1: "18 Marina Road",
    city: "Lagos",
    region: "Lagos State",
    country: "Nigeria",
    postcode: "101241",
    note: "",
  });
  const [delivery, setDelivery] = useState<Record<string, Delivery>>({});
  const [payment, setPayment] = useState("card");
  const [card, setCard] = useState({ number: "4242 4242 4242 4242", expiry: "12/28", cvc: "123" });
  const [placing, setPlacing] = useState(false);

  const lines = cart.map((line) => ({ line, product: productById(line.productId) }));
  const merchantIds = Array.from(new Set(lines.map((l) => l.product?.merchantId).filter(Boolean))) as string[];
  const subtotal = lines.reduce((s, l) => s + (l.product?.price ?? 0) * l.line.qty, 0);
  const shipping = merchantIds.reduce((s, id) => {
    const groupSubtotal = lines
      .filter((l) => l.product?.merchantId === id)
      .reduce((sum, l) => sum + (l.product?.price ?? 0) * l.line.qty, 0);
    if (groupSubtotal > 120) return s;
    const choice = delivery[id] ?? "standard";
    return s + DELIVERY_PRICE[choice];
  }, 0);
  const tax = Math.round(subtotal * 0.075 * 100) / 100;
  const total = Math.round((subtotal + shipping + tax) * 100) / 100;
  const commission =
    Math.round(
      lines.reduce(
        (s, l) => s + (l.product?.price ?? 0) * l.line.qty * (l.product ? getMerchant(l.product.merchantId).commissionPct / 100 : 0),
        0,
      ) * 100,
    ) / 100;

  const valid = Boolean(
    form.name.trim() && form.email.includes("@") && form.line1.trim() && form.city.trim(),
  );

  if (!lines.length) {
    return (
      <ShopShell>
        <div className="mx-auto max-w-[560px] px-4 py-24 text-center">
          <ShoppingBag width={26} height={26} className="mx-auto text-ink-soft" />
          <h1 className="mt-4 font-display text-[22px] font-semibold text-ink">
            There is nothing to check out
          </h1>
          <Link
            href="/browse"
            className="mt-6 inline-flex cursor-pointer items-center gap-2 rounded-[2px] bg-ink px-5 py-3 text-[13.5px] text-bone"
          >
            Browse the marketplace <ArrowRight width={15} height={15} />
          </Link>
        </div>
      </ShopShell>
    );
  }

  const submit = () => {
    if (!valid) {
      toast.error("Complete the delivery details first");
      return;
    }
    setPlacing(true);
    const order = placeOrder({
      channel: "marketplace",
      shipping,
      note: form.note || null,
      address: {
        name: form.name,
        line1: form.line1,
        city: form.city,
        region: form.region,
        country: form.country,
        postcode: form.postcode,
      },
    });
    toast.success(`Order ${order.number} placed \u2014 ${merchantIds.length} seller(s) notified`);
    router.push(`/order/${order.id}`);
  };

  const steps = ["Details", "Delivery", "Payment"];

  return (
    <ShopShell>
      <div className="mx-auto max-w-[1240px] px-4 py-8">
        <Eyebrow className="text-ember">Secure checkout \u00b7 simulated in this prototype</Eyebrow>
        <h1 className="mt-2 font-display text-[26px] font-bold tracking-[-0.02em] text-ink sm:text-[32px]">
          Checkout
        </h1>

        <ol className="mt-6 flex flex-wrap items-center gap-3 border-b border-line-warm pb-5">
          {steps.map((label, i) => (
            <li key={label} className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setStep(i + 1)}
                className={cn(
                  "flex cursor-pointer items-center gap-2.5 rounded-[2px] border px-3 py-2 text-[13px] transition-colors",
                  step === i + 1
                    ? "border-ink bg-ink text-bone"
                    : step > i + 1
                      ? "border-ember/40 text-ember"
                      : "border-line-warm text-ink-soft",
                )}
              >
                <span className="font-mono text-[10px]">0{i + 1}</span>
                {label}
                {step > i + 1 ? <Check width={13} height={13} /> : null}
              </button>
              {i < steps.length - 1 ? <span className="h-[1px] w-6 bg-line-warm" /> : null}
            </li>
          ))}
        </ol>

        <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr] lg:gap-14">
          <div className="space-y-6">
            <section className="rounded-[3px] border border-line-warm bg-white p-5">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-[15px] font-semibold text-ink">
                  Contact and delivery address
                </h2>
                {step !== 1 ? (
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="cursor-pointer font-mono text-[10px] uppercase tracking-[0.12em] text-ember"
                  >
                    Edit
                  </button>
                ) : null}
              </div>
              {step === 1 ? (
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  {([
                    ["name", "Full name"],
                    ["email", "Email"],
                    ["phone", "Phone"],
                    ["line1", "Address"],
                    ["city", "City"],
                    ["region", "State or region"],
                    ["country", "Country"],
                    ["postcode", "Postcode"],
                  ] as const).map(([key, label]) => (
                    <label key={key} className="block">
                      <span className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-ink-soft">
                        {label}
                      </span>
                      <input
                        value={form[key]}
                        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                        className="mt-1.5 h-11 w-full rounded-[2px] border border-ink/15 px-3 text-[13.5px] outline-none transition-colors focus:border-ink"
                      />
                    </label>
                  ))}
                  <div className="sm:col-span-2">
                    <label className="block">
                      <span className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-ink-soft">
                        Delivery note (optional)
                      </span>
                      <input
                        value={form.note}
                        onChange={(e) => setForm({ ...form, note: e.target.value })}
                        placeholder="Leave with the concierge"
                        className="mt-1.5 h-11 w-full rounded-[2px] border border-ink/15 px-3 text-[13.5px] outline-none transition-colors focus:border-ink"
                      />
                    </label>
                  </div>
                  <div className="sm:col-span-2">
                    <button
                      type="button"
                      disabled={!valid}
                      onClick={() => setStep(2)}
                      className="h-11 w-full cursor-pointer rounded-[2px] bg-ink text-[13.5px] font-medium text-bone transition-colors hover:bg-ember disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Continue to delivery
                    </button>
                    {!valid ? (
                      <p className="mt-2 font-mono text-[10.5px] text-ember">
                        Name, email and address are required in the prototype.
                      </p>
                    ) : null}
                  </div>
                </div>
              ) : (
                <p className="mt-3 text-[13px] leading-relaxed text-ink-soft">
                  {form.name} \u00b7 {form.line1}, {form.city}, {form.region}, {form.postcode}, {form.country}
                </p>
              )}
            </section>

            <section className="rounded-[3px] border border-line-warm bg-white p-5">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-[15px] font-semibold text-ink">Delivery per seller</h2>
                {step === 3 ? (
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="cursor-pointer font-mono text-[10px] uppercase tracking-[0.12em] text-ember"
                  >
                    Edit
                  </button>
                ) : null}
              </div>
              <p className="mt-1.5 text-[12.5px] text-ink-soft">
                Your cart has {merchantIds.length} seller{merchantIds.length === 1 ? "" : "s"}.
                Each one packs and ships separately, and each one is paid separately.
              </p>
              <div className="mt-4 space-y-3">
                {merchantIds.map((id) => {
                  const seller = getMerchant(id);
                  const groupSubtotal = lines
                    .filter((l) => l.product?.merchantId === id)
                    .reduce((s, l) => s + (l.product?.price ?? 0) * l.line.qty, 0);
                  const choice = delivery[id] ?? "standard";
                  const free = groupSubtotal > 120;
                  return (
                    <div key={id} className="rounded-[2px] border border-line-warm p-4">
                      <div className="flex flex-wrap items-center gap-3">
                        <span
                          className="grid h-7 w-7 shrink-0 place-items-center rounded-[2px] font-display text-[12px] font-extrabold"
                          style={{ background: seller.brand.accent, color: seller.brand.accentInk }}
                        >
                          {seller.name.slice(0, 1)}
                        </span>
                        <span className="flex items-center gap-1.5 text-[13px] font-medium text-ink">
                          {seller.name}
                          {seller.verified ? <BadgeCheck width={13} height={13} className="text-ember" /> : null}
                        </span>
                        <span className="ml-auto font-mono text-[12.5px] tabular-nums text-ink-soft">
                          {money(groupSubtotal)}
                        </span>
                      </div>
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        {(["standard", "express"] as Delivery[]).map((option) => {
                          const on = choice === option;
                          return (
                            <button
                              key={option}
                              type="button"
                              onClick={() => setDelivery((prev) => ({ ...prev, [id]: option }))}
                              className={cn(
                                "cursor-pointer rounded-[2px] border p-3 text-left transition-colors",
                                on ? "border-ink bg-bone-soft" : "border-line-warm hover:border-ink/40",
                              )}
                            >
                              <span className="flex items-center gap-2 text-[12.5px] text-ink">
                                <Truck width={13} height={13} className="text-ember" />
                                {DELIVERY_LABEL[option]}
                              </span>
                              <span className="mt-1 block font-mono text-[11px] text-ink-soft">
                                {free ? "Free on this order" : money(DELIVERY_PRICE[option])}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                      <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft">
                        Seller receives {money(groupSubtotal - groupSubtotal * (seller.commissionPct / 100))}{" "}
                        after {seller.commissionPct}% marketplace commission
                      </p>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="rounded-[3px] border border-line-warm bg-white p-5">
              <h2 className="font-display text-[15px] font-semibold text-ink">Payment</h2>
              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                {([
                  ["card", "Card", CreditCard],
                  ["bank", "Bank transfer", Landmark],
                  ["wallet", "Ferixas wallet", Wallet],
                ] as const).map(([value, label, Icon]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setPayment(value)}
                    className={cn(
                      "cursor-pointer rounded-[2px] border p-3 text-left transition-colors",
                      payment === value ? "border-ink bg-bone-soft" : "border-line-warm hover:border-ink/40",
                    )}
                  >
                    <Icon width={16} height={16} className="text-ember" />
                    <span className="mt-2 block text-[12.5px] text-ink">{label}</span>
                  </button>
                ))}
              </div>
              {payment === "card" ? (
                <div className="mt-4 grid gap-4 sm:grid-cols-[1.6fr_1fr_1fr]">
                  {([
                    ["number", "Card number"],
                    ["expiry", "Expiry"],
                    ["cvc", "CVC"],
                  ] as const).map(([key, label]) => (
                    <label key={key} className="block">
                      <span className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-ink-soft">
                        {label}
                      </span>
                      <input
                        value={card[key]}
                        onChange={(e) => setCard({ ...card, [key]: e.target.value })}
                        className="mt-1.5 h-11 w-full rounded-[2px] border border-ink/15 px-3 font-mono text-[13px] outline-none focus:border-ink"
                      />
                    </label>
                  ))}
                </div>
              ) : (
                <p className="mt-4 rounded-[2px] border border-dashed border-ink/20 p-4 font-mono text-[11.5px] leading-relaxed text-ink-soft">
                  {payment === "bank"
                    ? "You will receive account details and a reference on the confirmation screen."
                    : `Your Ferixas wallet balance would be used first. Balance shown as ${money(0)} in the prototype.`}
                </p>
              )}
              <p className="mt-4 flex items-center gap-2 font-mono text-[10.5px] text-ink-soft">
                <Lock width={12} height={12} /> No real payment is processed. Card fields are prefilled
                dummy data.
              </p>
            </section>
          </div>

          <div className="lg:sticky lg:top-[132px] lg:self-start">
            <div className="rounded-[3px] border border-line-warm bg-white p-5">
              <h2 className="font-display text-[16px] font-semibold text-ink">
                {lines.reduce((s, l) => s + l.line.qty, 0)} items from {merchantIds.length} sellers
              </h2>
              <ul className="mt-4 max-h-[280px] space-y-3 overflow-y-auto pr-1">
                {lines.map(({ line, product }) => {
                  if (!product) return null;
                  return (
                    <li key={line.key} className="flex items-center gap-3">
                      <ProductPlate
                        product={product}
                        className="h-11 w-11 shrink-0 rounded-[2px]"
                        showSku={false}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[12.5px] text-ink">{product.title}</p>
                        <p className="font-mono text-[10px] text-ink-soft">
                          {line.variant ? `${line.variant} \u00b7 ` : ""}
                          {line.qty} \u00d7 {money(product.price)}
                        </p>
                      </div>
                      <span className="font-mono text-[12px] tabular-nums text-ink">
                        {money(product.price * line.qty)}
                      </span>
                    </li>
                  );
                })}
              </ul>

              <dl className="mt-4 grid gap-2.5 border-t border-line-warm pt-4">
                {[
                  ["Subtotal", money(subtotal)],
                  ["Delivery", shipping ? money(shipping) : "Free"],
                  ["Tax", money(tax)],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between">
                    <dt className="text-[13px] text-ink-soft">{label}</dt>
                    <dd className="font-mono text-[13px] tabular-nums text-ink">{value}</dd>
                  </div>
                ))}
                <div className="flex items-center justify-between border-t border-line-warm pt-3">
                  <dt className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft">
                    Total
                  </dt>
                  <dd className="font-mono text-[18px] font-semibold tabular-nums text-ink">
                    {money(total)}
                  </dd>
                </div>
              </dl>

              <button
                type="button"
                onClick={submit}
                disabled={placing || !valid}
                className="mt-5 flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-[2px] bg-ink text-[14px] font-medium text-bone transition-colors hover:bg-ember disabled:cursor-not-allowed disabled:opacity-40"
              >
                {placing ? "Placing order\u2026" : `Place order \u00b7 ${money(total)}`}
              </button>

              <p className="mt-4 border-t border-line-warm pt-4 font-mono text-[10.5px] leading-relaxed text-ink-soft">
                Platform commission on this order: {money(commission)}. Store orders carry no
                commission \u2014 only marketplace sales do.
              </p>
            </div>

            <div className="mt-4 rounded-[3px] border border-line-warm bg-white p-5">
              <Eyebrow className="text-ember">What happens next</Eyebrow>
              <ol className="mt-3 space-y-2.5">
                {[
                  "Each seller is notified and confirms the item in stock",
                  "Payments are held by Ferixas until delivery is confirmed",
                  "Commission is deducted only from marketplace orders",
                  "You track every parcel from one order page",
                ].map((item, i) => (
                  <li key={item} className="flex gap-2.5 text-[12.5px] leading-relaxed text-ink-soft">
                    <span className="font-mono text-[10px] text-ember">0{i + 1}</span>
                    {item}
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </div>
    </ShopShell>
  );
}

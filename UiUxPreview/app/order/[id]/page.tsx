"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowRight,
  Check,
  Copy,
  MapPin,
  PackageCheck,
  ReceiptText,
  RotateCcw,
  ShieldCheck,
  Truck,
} from "lucide-react";
import { toast } from "sonner";
import { ORDERS, customerById, getMerchant, merchantSubtotal } from "@/lib/data";
import { dateLong, money } from "@/lib/format";
import { useFerixas } from "@/lib/store";
import { ShopShell } from "@/components/shop/shop-shell";
import { ProductPlate } from "@/components/shop/product-plate";
import { Eyebrow } from "@/components/shop/primitives";
import { cn } from "@/lib/utils";

export default function OrderPage() {
  const params = useParams<{ id: string }>();
  const { localOrders, products, addToCart } = useFerixas();

  const order =
    localOrders.find((o) => o.id === params.id || o.number === params.id) ??
    ORDERS.find((o) => o.id === params.id || o.number === params.id);

  if (!order) {
    return (
      <ShopShell>
        <div className="mx-auto max-w-[560px] px-4 py-24 text-center">
          <ReceiptText width={26} height={26} className="mx-auto text-ink-soft" />
          <h1 className="mt-4 font-display text-[22px] font-semibold text-ink">
            We cannot find that order
          </h1>
          <p className="mt-2 text-[13.5px] text-ink-soft">
            Order references in this prototype only live for the current session unless they came
            from the mock dataset.
          </p>
          <Link
            href="/account"
            className="mt-6 inline-flex cursor-pointer items-center gap-2 rounded-[2px] bg-ink px-5 py-3 text-[13.5px] text-bone"
          >
            Go to your orders <ArrowRight width={15} height={15} />
          </Link>
        </div>
      </ShopShell>
    );
  }

  const customer = customerById(order.customerId);
  const sellers = Array.from(new Set(order.items.map((i) => i.merchantId)));
  const stages = [
    { label: "Order placed", detail: dateLong(order.placedAt), done: true },
    {
      label: "Payment confirmed",
      detail: order.payment === "paid" ? `${money(order.total)} captured` : order.payment,
      done: order.payment === "paid",
    },
    {
      label: "Sellers notified",
      detail: `${sellers.length} seller${sellers.length === 1 ? "" : "s"} preparing your items`,
      done: order.fulfillment !== "unfulfilled" && order.fulfillment !== "cancelled",
    },
    {
      label: "Shipped",
      detail: order.carrier ? `${order.carrier} \u00b7 ${order.tracking}` : "Awaiting dispatch",
      done: order.fulfillment === "shipped" || order.fulfillment === "delivered",
    },
    { label: "Delivered", detail: "Signature on receipt", done: order.fulfillment === "delivered" },
  ];
  const stageIndex = stages.filter((s) => s.done).length;

  return (
    <ShopShell>
      <div className="border-b border-line-warm bg-bone-soft/50">
        <div className="mx-auto max-w-[1240px] px-4 py-8">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <Eyebrow className="text-ember">
                {order.payment === "paid" ? "Order confirmed" : `Payment ${order.payment}`}
              </Eyebrow>
              <h1 className="mt-2 font-display text-[28px] font-bold tracking-[-0.02em] text-ink sm:text-[34px]">
                Thank you \u2014 order {order.number}
              </h1>
              <p className="mt-2 max-w-[62ch] text-[13.5px] leading-relaxed text-ink-soft">
                Placed {dateLong(order.placedAt)} \u00b7 {order.items.length} item
                {order.items.length === 1 ? "" : "s"} from {sellers.length} seller
                {sellers.length === 1 ? "" : "s"}. Each seller ships their own part, and you can
                track all of them from this page.
              </p>
            </div>
            <div className="rounded-[3px] border border-line-warm bg-white px-5 py-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft">
                Order total
              </p>
              <p className="mt-1 font-mono text-[24px] font-semibold tabular-nums text-ink">
                {money(order.total)}
              </p>
              <p className="mt-1 font-mono text-[10.5px] text-ink-soft">
                {order.channel === "marketplace" ? "Marketplace order" : "Store order"}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1240px] px-4 py-8">
        <div className="grid gap-8 lg:grid-cols-[1.5fr_1fr] lg:gap-12">
          <div className="space-y-6">
            <section className="rounded-[3px] border border-line-warm bg-white p-5">
              <h2 className="font-display text-[15px] font-semibold text-ink">Progress</h2>
              <div className="mt-4 flex gap-2">
                {stages.map((stage, i) => (
                  <span
                    key={stage.label}
                    className={cn(
                      "h-1.5 flex-1 rounded-[1px]",
                      stage.done ? "bg-ember" : "bg-bone-soft",
                    )}
                    title={stage.label}
                  />
                ))}
              </div>
              <p className="mt-2 font-mono text-[10.5px] uppercase tracking-[0.12em] text-ink-soft">
                Stage {stageIndex} of {stages.length} \u00b7 {stages[stageIndex - 1]?.label ?? "Placed"}
              </p>
              <ol className="mt-5 space-y-4">
                {stages.map((stage) => (
                  <li key={stage.label} className="flex gap-3">
                    <span
                      className={cn(
                        "mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border",
                        stage.done ? "border-ember bg-ember text-white" : "border-line-warm text-transparent",
                      )}
                    >
                      <Check width={11} height={11} />
                    </span>
                    <div className="min-w-0">
                      <p className={cn("text-[13.5px]", stage.done ? "text-ink" : "text-ink-soft")}>
                        {stage.label}
                      </p>
                      <p className="font-mono text-[10.5px] text-ink-soft">{stage.detail}</p>
                    </div>
                  </li>
                ))}
              </ol>

              {order.tracking ? (
                <div className="mt-5 flex flex-wrap items-center gap-3 rounded-[2px] border border-line-warm bg-bone-soft/50 px-4 py-3">
                  <Truck width={15} height={15} className="text-ember" />
                  <span className="font-mono text-[11.5px] text-ink">
                    {order.carrier} \u00b7 {order.tracking}
                  </span>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(order.tracking ?? "");
                        toast.success("Tracking number copied");
                      } catch {
                        toast.info(order.tracking ?? "");
                      }
                    }}
                    className="ml-auto inline-flex cursor-pointer items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft transition-colors hover:text-ember"
                  >
                    <Copy width={12} height={12} /> Copy
                  </button>
                </div>
              ) : null}
            </section>

            {sellers.map((merchantId) => {
              const seller = getMerchant(merchantId);
              const items = order.items.filter((i) => i.merchantId === merchantId);
              return (
                <section key={merchantId} className="rounded-[3px] border border-line-warm bg-white">
                  <header className="flex flex-wrap items-center gap-3 border-b border-line-warm px-4 py-3">
                    <span
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-[2px] font-display text-[13px] font-extrabold"
                      style={{ background: seller.brand.accent, color: seller.brand.accentInk }}
                    >
                      {seller.name.slice(0, 1)}
                    </span>
                    <div className="min-w-0">
                      <Link
                        href={`/store/${seller.slug}`}
                        className="block truncate text-[13.5px] font-medium text-ink transition-colors hover:text-ember"
                      >
                        {seller.name}
                      </Link>
                      <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft">
                        {items.length} item{items.length === 1 ? "" : "s"} in this parcel
                      </p>
                    </div>
                    <span className="ml-auto font-mono text-[13px] tabular-nums text-ink">
                      {money(merchantSubtotal(order, merchantId))}
                    </span>
                  </header>
                  <ul className="divide-y divide-line-warm">
                    {items.map((item, i) => {
                      const product = products.find((p) => p.id === item.productId);
                      return (
                        <li key={`${item.productId}-${i}`} className="flex items-center gap-4 p-4">
                          {product ? (
                            <ProductPlate
                              product={product}
                              className="h-[70px] w-[70px] shrink-0 rounded-[2px]"
                              showSku={false}
                            />
                          ) : null}
                          <div className="min-w-0 flex-1">
                            <p className="text-[13.5px] text-ink">{item.title}</p>
                            <p className="mt-0.5 font-mono text-[10.5px] text-ink-soft">
                              {item.variant ? `${item.variant} \u00b7 ` : ""}
                              {item.qty} \u00d7 {money(item.price)}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <span className="font-mono text-[13px] tabular-nums text-ink">
                              {money(item.price * item.qty)}
                            </span>
                            {product ? (
                              <button
                                type="button"
                                onClick={() => {
                                  addToCart(product.id, item.variant, 1);
                                  toast.success("Added to your cart again");
                                }}
                                className="inline-flex cursor-pointer items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft transition-colors hover:text-ember"
                              >
                                <RotateCcw width={11} height={11} /> Buy again
                              </button>
                            ) : null}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              );
            })}
          </div>

          <div className="space-y-4 lg:sticky lg:top-[132px] lg:self-start">
            <section className="rounded-[3px] border border-line-warm bg-white p-5">
              <h2 className="font-display text-[15px] font-semibold text-ink">Summary</h2>
              <dl className="mt-4 grid gap-2.5">
                {[
                  ["Subtotal", money(order.subtotal)],
                  ["Delivery", order.shipping ? money(order.shipping) : "Free"],
                  ["Tax", money(order.tax)],
                  ["Channel", order.channel === "marketplace" ? "Ferixas marketplace" : "Merchant store"],
                  [
                    "Commission",
                    order.channel === "marketplace" ? money(order.commission) : "Not applicable",
                  ],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between gap-4">
                    <dt className="text-[12.5px] text-ink-soft">{label}</dt>
                    <dd className="font-mono text-[12.5px] tabular-nums text-ink">{value}</dd>
                  </div>
                ))}
                <div className="flex items-center justify-between border-t border-line-warm pt-3">
                  <dt className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft">
                    Paid
                  </dt>
                  <dd className="font-mono text-[17px] font-semibold tabular-nums text-ink">
                    {money(order.total)}
                  </dd>
                </div>
              </dl>
            </section>

            <section className="rounded-[3px] border border-line-warm bg-white p-5">
              <h2 className="flex items-center gap-2 font-display text-[15px] font-semibold text-ink">
                <MapPin width={15} height={15} className="text-ember" /> Delivery address
              </h2>
              <p className="mt-3 text-[13px] leading-relaxed text-ink-soft">
                {order.address.name}
                <br />
                {order.address.line1}
                <br />
                {order.address.city}, {order.address.region} {order.address.postcode}
                <br />
                {order.address.country}
              </p>
              {customer ? (
                <p className="mt-4 border-t border-line-warm pt-3 font-mono text-[10.5px] text-ink-soft">
                  {customer.email} \u00b7 {customer.phone}
                </p>
              ) : null}
            </section>

            <section className="rounded-[3px] border border-line-warm bg-white p-5">
              <h2 className="flex items-center gap-2 font-display text-[15px] font-semibold text-ink">
                <ShieldCheck width={15} height={15} className="text-ember" /> Protection
              </h2>
              <ul className="mt-3 space-y-2.5">
                {[
                  "Ferixas holds the payment until each seller confirms delivery",
                  "30 days to return anything unused",
                  "Disputes are handled by the platform, not the seller alone",
                ].map((item) => (
                  <li key={item} className="flex gap-2.5 text-[12.5px] leading-relaxed text-ink-soft">
                    <PackageCheck width={13} height={13} className="mt-0.5 shrink-0 text-ember" />
                    {item}
                  </li>
                ))}
              </ul>
            </section>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/browse"
                className="inline-flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-[2px] bg-ink px-4 py-3 text-[13px] text-bone transition-colors hover:bg-ember"
              >
                Keep shopping
              </Link>
              <Link
                href="/account"
                className="inline-flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-[2px] border border-ink/20 px-4 py-3 text-[13px] text-ink transition-colors hover:border-ink"
              >
                All orders
              </Link>
            </div>
          </div>
        </div>
      </div>
    </ShopShell>
  );
}

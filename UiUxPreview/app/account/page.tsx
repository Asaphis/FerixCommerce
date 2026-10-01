"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Bell,
  Check,
  Heart,
  MapPin,
  Package,
  ReceiptText,
  Store,
  Trash2,
  Truck,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { ORDERS, customerById, getMerchant, merchantSubtotal } from "@/lib/data";
import { dateShort, money, num } from "@/lib/format";
import { useFerixas } from "@/lib/store";
import type { Address } from "@/lib/types";
import { ShopShell } from "@/components/shop/shop-shell";
import { ProductCard } from "@/components/shop/product-card";
import { ProductPlate } from "@/components/shop/product-plate";
import { Eyebrow } from "@/components/shop/primitives";
import { cn } from "@/lib/utils";

const TABS = ["Orders", "Saved", "Following", "Addresses", "Profile"] as const;
type Tab = (typeof TABS)[number];

export default function AccountPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-bone" />}>
      <AccountInner />
    </Suspense>
  );
}

function AccountInner() {
  const params = useSearchParams();
  const initial = (params.get("tab") === "saved" ? "Saved" : "Orders") as Tab;
  const [tab, setTab] = useState<Tab>(initial);
  const {
    localOrders,
    products,
    wishlist,
    toggleWishlist,
    addToCart,
    follows,
    toggleFollow,
    cartCount,
  } = useFerixas();
  const [profile, setProfile] = useState({
    name: "Ferix Course",
    email: "ferixcourse@gmail.com",
    phone: "+234 803 411 2290",
    marketing: true,
    orderUpdates: true,
  });
  const [addresses, setAddresses] = useState<Address[]>([
    {
      name: "Ferix Course",
      line1: "18 Marina Road",
      city: "Lagos",
      region: "Lagos State",
      country: "Nigeria",
      postcode: "101241",
    },
    {
      name: "Ferix Course (office)",
      line1: "4 Kingsway, Ikoyi",
      city: "Lagos",
      region: "Lagos State",
      country: "Nigeria",
      postcode: "106104",
    },
  ]);
  const [draftAddress, setDraftAddress] = useState<Address>({
    name: "",
    line1: "",
    city: "",
    region: "",
    country: "Nigeria",
    postcode: "",
  });

  const myOrders = [...localOrders, ...ORDERS.slice(0, 9)];
  const saved = wishlist
    .map((id) => products.find((p) => p.id === id))
    .filter(Boolean) as typeof products;
  const followed = follows
    .map((id) => getMerchant(id))
    .filter((m) => m && m.name);
  const spend = myOrders.reduce((s, o) => s + o.total, 0);

  return (
    <ShopShell>
      <div className="border-b border-line-warm bg-bone-soft/50">
        <div className="mx-auto max-w-[1240px] px-4 py-8">
          <Eyebrow className="text-ember">Your account</Eyebrow>
          <h1 className="mt-2 font-display text-[26px] font-bold tracking-[-0.02em] text-ink sm:text-[32px]">
            {profile.name}
          </h1>
          <div className="mt-5 grid gap-3 sm:grid-cols-4">
            {[
              ["Orders", String(myOrders.length)],
              ["Lifetime spend", money(spend, { cents: false })],
              ["Saved items", String(saved.length)],
              ["Stores followed", String(followed.length)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-[3px] border border-line-warm bg-white p-4">
                <p className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-ink-soft">
                  {label}
                </p>
                <p className="mt-2 font-mono text-[19px] font-semibold tabular-nums text-ink">
                  {value}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1240px] px-4 py-6">
        <div className="flex gap-1 overflow-x-auto border-b border-line-warm [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {TABS.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setTab(item)}
              className={cn(
                "cursor-pointer whitespace-nowrap px-4 py-3.5 font-mono text-[10.5px] uppercase tracking-[0.14em] transition-colors",
                tab === item
                  ? "border-b-2 border-ember text-ember"
                  : "border-b-2 border-transparent text-ink-soft hover:text-ink",
              )}
            >
              {item}
            </button>
          ))}
        </div>

        <div className="py-8">
          {tab === "Orders" ? (
            <ul className="space-y-4">
              {myOrders.map((order) => {
                const seller = getMerchant(order.merchantIds[0] ?? "ferixas-official");
                return (
                  <li
                    key={order.id}
                    className="rounded-[3px] border border-line-warm bg-white p-5 transition-colors hover:border-ink/25"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <Link
                          href={`/order/${order.id}`}
                          className="font-display text-[15px] font-semibold text-ink transition-colors hover:text-ember"
                        >
                          {order.number}
                        </Link>
                        <p className="mt-0.5 font-mono text-[10.5px] uppercase tracking-[0.12em] text-ink-soft">
                          {dateShort(order.placedAt)} \u00b7 {order.items.length} item
                          {order.items.length === 1 ? "" : "s"} \u00b7{" "}
                          {order.channel === "marketplace" ? "marketplace" : `${seller.name}`}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {order.items.slice(0, 4).map((item, i) => {
                            const product = products.find((p) => p.id === item.productId);
                            return product ? (
                              <ProductPlate
                                key={`${item.productId}-${i}`}
                                product={product}
                                className="h-11 w-11 rounded-[2px]"
                                showSku={false}
                              />
                            ) : null;
                          })}
                          {order.items.length > 4 ? (
                            <span className="grid h-11 w-11 place-items-center rounded-[2px] border border-line-warm font-mono text-[10.5px] text-ink-soft">
                              +{order.items.length - 4}
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-mono text-[15px] font-semibold tabular-nums text-ink">
                          {money(order.total)}
                        </p>
                        <span
                          className={cn(
                            "mt-2 inline-block rounded-[2px] px-2 py-[3px] font-mono text-[9.5px] uppercase tracking-[0.12em]",
                            order.fulfillment === "delivered"
                              ? "bg-lime/20 text-pine"
                              : order.fulfillment === "shipped"
                                ? "bg-azure/15 text-azure"
                                : order.fulfillment === "cancelled"
                                  ? "bg-ember/15 text-ember"
                                  : "bg-bone-soft text-ink-soft",
                          )}
                        >
                          {order.fulfillment}
                        </span>
                        <div className="mt-3 flex flex-wrap justify-end gap-2">
                          <Link
                            href={`/order/${order.id}`}
                            className="inline-flex cursor-pointer items-center gap-1.5 rounded-[2px] border border-ink/20 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-ink transition-colors hover:border-ink"
                          >
                            <Truck width={11} height={11} /> Track
                          </Link>
                          <button
                            type="button"
                            onClick={() => {
                              order.items.forEach((item) => addToCart(item.productId, item.variant, item.qty));
                              toast.success(`Added ${order.items.length} items back to your cart`);
                            }}
                            className="inline-flex cursor-pointer items-center gap-1.5 rounded-[2px] border border-ink/20 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-ink transition-colors hover:border-ink"
                          >
                            <Package size={11} /> Buy again
                          </button>
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : null}

          {tab === "Saved" ? (
            saved.length ? (
              <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
                {saved.map((product) => (
                  <div key={product.id}>
                    <ProductCard product={product} />
                    <button
                      type="button"
                      onClick={() => {
                        addToCart(product.id, null, 1);
                        toast.success(`${product.title} moved to your cart`);
                      }}
                      className="mt-2 w-full cursor-pointer rounded-[2px] border border-ink/20 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-ink transition-colors hover:border-ink"
                    >
                      Move to cart
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-[3px] border border-line-warm bg-white py-20 text-center">
                <Heart width={24} height={24} className="mx-auto text-ink-soft" />
                <p className="mt-3 font-display text-[16px] font-semibold text-ink">
                  Nothing saved yet
                </p>
                <p className="mt-1.5 text-[13px] text-ink-soft">
                  Tap the heart on any product to keep it here.
                </p>
                <Link
                  href="/browse"
                  className="mt-5 inline-flex rounded-[2px] bg-ink px-4 py-2.5 text-[13px] text-bone"
                >
                  Browse products
                </Link>
              </div>
            )
          ) : null}

          {tab === "Following" ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {followed.map((store) => {
                const catalog = products.filter((p) => p.merchantId === store.id && p.status === "active");
                return (
                  <div key={store.id} className="rounded-[3px] border border-line-warm bg-white p-5">
                    <div className="flex items-center gap-3">
                      <span
                        className="grid h-10 w-10 shrink-0 place-items-center rounded-[2px] font-display text-[15px] font-extrabold"
                        style={{ background: store.brand.accent, color: store.brand.accentInk }}
                      >
                        {store.name.slice(0, 1)}
                      </span>
                      <div className="min-w-0">
                        <Link
                          href={`/store/${store.slug}`}
                          className="block truncate text-[14px] font-medium text-ink transition-colors hover:text-ember"
                        >
                          {store.name}
                        </Link>
                        <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft">
                          {catalog.length} products \u00b7 {store.rating} rating
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 flex gap-2">
                      <Link
                        href={`/store/${store.slug}`}
                        className="flex-1 rounded-[2px] bg-ink py-2 text-center text-[12.5px] text-bone transition-colors hover:bg-ember"
                      >
                        Visit store
                      </Link>
                      <button
                        type="button"
                        onClick={() => {
                          toggleFollow(store.id);
                          toast.success(`Unfollowed ${store.name}`);
                        }}
                        className="cursor-pointer rounded-[2px] border border-ink/20 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft transition-colors hover:text-ember"
                      >
                        Unfollow
                      </button>
                    </div>
                  </div>
                );
              })}
              {!followed.length ? (
                <p className="text-[13.5px] text-ink-soft">You are not following any stores yet.</p>
              ) : null}
            </div>
          ) : null}

          {tab === "Addresses" ? (
            <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
              <div className="space-y-3">
                {addresses.map((address, index) => (
                  <div
                    key={`${address.line1}-${index}`}
                    className="rounded-[3px] border border-line-warm bg-white p-5"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex gap-3">
                        <MapPin width={16} height={16} className="mt-0.5 shrink-0 text-ember" />
                        <div>
                          <p className="text-[13.5px] font-medium text-ink">{address.name}</p>
                          <p className="mt-1 text-[13px] leading-relaxed text-ink-soft">
                            {address.line1}
                            <br />
                            {address.city}, {address.region} {address.postcode}
                            <br />
                            {address.country}
                          </p>
                          {index === 0 ? (
                            <span className="mt-2 inline-block rounded-[2px] bg-lime/20 px-2 py-[3px] font-mono text-[9.5px] uppercase tracking-[0.12em] text-pine">
                              Default
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setAddresses(addresses.filter((_, i) => i !== index));
                          toast.success("Address removed");
                        }}
                        aria-label="Remove address"
                        className="cursor-pointer text-ink-soft transition-colors hover:text-ember"
                      >
                        <Trash2 width={14} height={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="rounded-[3px] border border-line-warm bg-white p-5">
                <h2 className="font-display text-[15px] font-semibold text-ink">Add an address</h2>
                <div className="mt-4 grid gap-3">
                  {([
                    ["name", "Full name"],
                    ["line1", "Address"],
                    ["city", "City"],
                    ["region", "State or region"],
                    ["postcode", "Postcode"],
                    ["country", "Country"],
                  ] as const).map(([key, label]) => (
                    <label key={key} className="block">
                      <span className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-ink-soft">
                        {label}
                      </span>
                      <input
                        value={draftAddress[key]}
                        onChange={(e) => setDraftAddress({ ...draftAddress, [key]: e.target.value })}
                        className="mt-1.5 h-10 w-full rounded-[2px] border border-ink/15 px-3 text-[13px] outline-none focus:border-ink"
                      />
                    </label>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      if (!draftAddress.name.trim() || !draftAddress.line1.trim()) {
                        toast.error("Add at least a name and address");
                        return;
                      }
                      setAddresses([...addresses, draftAddress]);
                      setDraftAddress({ name: "", line1: "", city: "", region: "", country: "Nigeria", postcode: "" });
                      toast.success("Address saved");
                    }}
                    className="cursor-pointer rounded-[2px] bg-ink py-2.5 text-[13px] text-bone transition-colors hover:bg-ember"
                  >
                    Save address
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {tab === "Profile" ? (
            <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
              <div className="rounded-[3px] border border-line-warm bg-white p-5">
                <h2 className="flex items-center gap-2 font-display text-[15px] font-semibold text-ink">
                  <User width={15} height={15} className="text-ember" /> Details
                </h2>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  {([
                    ["name", "Full name"],
                    ["email", "Email"],
                    ["phone", "Phone"],
                  ] as const).map(([key, label]) => (
                    <label key={key} className="block">
                      <span className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-ink-soft">
                        {label}
                      </span>
                      <input
                        value={profile[key]}
                        onChange={(e) => setProfile({ ...profile, [key]: e.target.value })}
                        className="mt-1.5 h-11 w-full rounded-[2px] border border-ink/15 px-3 text-[13.5px] outline-none focus:border-ink"
                      />
                    </label>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => toast.success("Profile saved")}
                  className="mt-4 cursor-pointer rounded-[2px] bg-ink px-5 py-2.5 text-[13px] text-bone transition-colors hover:bg-ember"
                >
                  Save profile
                </button>
                <p className="mt-4 border-t border-line-warm pt-4 font-mono text-[10.5px] leading-relaxed text-ink-soft">
                  Authentication and password management are out of scope for the prototype \u2014 this
                  form keeps your details in local state only.
                </p>
              </div>

              <div className="space-y-3">
                <div className="rounded-[3px] border border-line-warm bg-white p-5">
                  <h2 className="flex items-center gap-2 font-display text-[15px] font-semibold text-ink">
                    <Bell width={15} height={15} className="text-ember" /> Notifications
                  </h2>
                  <div className="mt-3 space-y-2">
                    {([
                      ["orderUpdates", "Order updates", "Every status change on your orders"],
                      ["marketing", "Offers", "Promotions from stores you follow"],
                    ] as const).map(([key, label, detail]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setProfile({ ...profile, [key]: !profile[key] })}
                        className="flex w-full cursor-pointer items-start gap-3 rounded-[2px] border border-line-warm p-3 text-left transition-colors hover:border-ink/25"
                      >
                        <span
                          className={cn(
                            "mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-[2px] border",
                            profile[key] ? "border-ink bg-ink text-lime" : "border-ink/25 text-transparent",
                          )}
                        >
                          <Check width={12} height={12} />
                        </span>
                        <span>
                          <span className="block text-[13px] text-ink">{label}</span>
                          <span className="mt-0.5 block text-[12px] text-ink-soft">{detail}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-[3px] border border-line-warm bg-white p-5">
                  <h2 className="flex items-center gap-2 font-display text-[15px] font-semibold text-ink">
                    <ReceiptText width={15} height={15} className="text-ember" /> Activity
                  </h2>
                  <dl className="mt-3 grid gap-2.5">
                    {[
                      ["Items in cart", String(cartCount)],
                      ["Average order", money(spend / Math.max(1, myOrders.length), { cents: false })],
                      ["Saved products", num(saved.length)],
                      ["Stores followed", num(followed.length)],
                    ].map(([label, value]) => (
                      <div key={label} className="flex items-center justify-between">
                        <dt className="text-[12.5px] text-ink-soft">{label}</dt>
                        <dd className="font-mono text-[12.5px] tabular-nums text-ink">{value}</dd>
                      </div>
                    ))}
                  </dl>
                  <Link
                    href="/stores"
                    className="mt-4 inline-flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.12em] text-ember"
                  >
                    <Store width={12} height={12} /> Discover more stores
                  </Link>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </ShopShell>
  );
}

void customerById;
void merchantSubtotal;

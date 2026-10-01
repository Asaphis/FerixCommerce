"use client";

import { useState } from "react";
import {
  AlertTriangle,
  Bell,
  Check,
  CreditCard,
  Percent,
  Save,
  ShieldCheck,
  Users,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { PLATFORM, SUBSCRIPTION_PLANS } from "@/lib/data";
import { money } from "@/lib/format";
import { useFerixas } from "@/lib/store";
import { StudioShell } from "@/components/studio/shell";
import {
  Field,
  Panel,
  PanelHead,
  Pill,
  StudioButton,
  inputClass,
  selectClass,
} from "@/components/studio/bits";
import { cn } from "@/lib/utils";

const TEAM = [
  { name: "Ferix Course", email: "ferixcourse@gmail.com", role: "Owner", you: true },
  { name: "Ifeoma Nwachukwu", email: "ifeoma@abcelectronics.com", role: "Manager", you: false },
  { name: "Tunde Bakare", email: "tunde@abcelectronics.com", role: "Fulfilment", you: false },
  { name: "Grace Otieno", email: "grace@abcelectronics.com", role: "Support", you: false },
];

const NOTIFICATIONS = [
  { id: "orders", label: "New orders", detail: "Email and push the moment an order lands", on: true },
  { id: "low", label: "Low stock", detail: "Only when a product crosses its alert mark", on: true },
  { id: "payouts", label: "Payouts", detail: "When money leaves the platform", on: true },
  { id: "reviews", label: "Reviews", detail: "New reviews, plus anything under three stars", on: true },
  { id: "marketplace", label: "Marketplace mentions", detail: "When a product is featured on ferixas.com", on: false },
  { id: "ai", label: "Design Engine suggestions", detail: "When the assistant drafts a change", on: false },
];

export default function SettingsPage() {
  const { merchant, merchantId, updateMerchant } = useFerixas();
  const [notifications, setNotifications] = useState(NOTIFICATIONS);
  const [business, setBusiness] = useState({
    legal: `${merchant.name} Ltd`,
    email: "hello@abcelectronics.com",
    phone: "+234 803 411 2290",
    address: "18 Marina Road, Lagos, Nigeria",
    taxId: "TIN 2041188-0001",
  });
  const [taxRate, setTaxRate] = useState(7.5);
  const [currency, setCurrency] = useState("USD");
  const [storeOpen, setStoreOpen] = useState(true);

  return (
    <StudioShell
      title="Settings"
      subtitle={`${merchant.plan} plan \u00b7 ${merchantId}`}
      actions={
        <StudioButton variant="primary" onClick={() => toast.success("Settings saved")}>
          <Save width={14} height={14} /> Save changes
        </StudioButton>
      }
    >
      <div className="grid gap-3 lg:grid-cols-[1.3fr_1fr]">
        <div className="grid gap-3">
          <Panel>
            <PanelHead title="Business details" hint="Used on invoices, receipts and payouts" />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Legal name">
                <input
                  className={inputClass}
                  value={business.legal}
                  onChange={(e) => setBusiness({ ...business, legal: e.target.value })}
                />
              </Field>
              <Field label="Support email">
                <input
                  className={inputClass}
                  value={business.email}
                  onChange={(e) => setBusiness({ ...business, email: e.target.value })}
                />
              </Field>
              <Field label="Phone">
                <input
                  className={inputClass}
                  value={business.phone}
                  onChange={(e) => setBusiness({ ...business, phone: e.target.value })}
                />
              </Field>
              <Field label="Tax identifier">
                <input
                  className={inputClass}
                  value={business.taxId}
                  onChange={(e) => setBusiness({ ...business, taxId: e.target.value })}
                />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Registered address">
                  <input
                    className={inputClass}
                    value={business.address}
                    onChange={(e) => setBusiness({ ...business, address: e.target.value })}
                  />
                </Field>
              </div>
            </div>
          </Panel>

          <Panel>
            <PanelHead
              title="Plan and billing"
              hint="Commission and features change with the plan"
              action={<CreditCard width={15} height={15} className="text-chalk-dim" />}
            />
            <div className="grid gap-2.5 sm:grid-cols-2">
              {SUBSCRIPTION_PLANS.filter((plan) => plan.name !== "Platform").map((plan) => {
                const current = merchant.plan === plan.name;
                return (
                  <button
                    key={plan.name}
                    type="button"
                    onClick={() => {
                      updateMerchant(merchantId, { plan: plan.name as typeof merchant.plan });
                      toast.success(`Switched to the ${plan.name} plan (simulated)`);
                    }}
                    className={cn(
                      "cursor-pointer rounded-[2px] border p-4 text-left transition-colors",
                      current ? "border-lime/40 bg-lime/[0.06]" : "border-hairline hover:border-chalk-dim",
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-display text-[14px] font-semibold text-chalk">
                        {plan.name}
                      </span>
                      {current ? (
                        <Pill tone="lime">
                          <Check width={11} height={11} /> Current
                        </Pill>
                      ) : null}
                    </div>
                    <p className="mt-2 font-mono text-[19px] font-semibold tabular-nums text-chalk">
                      {money(plan.price, { cents: false })}
                      <span className="text-[11px] text-chalk-dim">/month</span>
                    </p>
                    <p className="mt-2 text-[12px] leading-relaxed text-chalk-dim">
                      {plan.features}
                    </p>
                  </button>
                );
              })}
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-hairline pt-4">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-chalk-dim">
                  Next invoice
                </p>
                <p className="mt-1 font-mono text-[13px] text-chalk">
                  {money(SUBSCRIPTION_PLANS.find((p) => p.name === merchant.plan)?.price ?? 99, { cents: false })}{" "}
                  on 1 Nov 2026
                </p>
              </div>
              <StudioButton onClick={() => toast.info("Billing is simulated in this prototype")}>
                Manage payment method
              </StudioButton>
            </div>
          </Panel>

          <Panel>
            <PanelHead
              title="Team"
              hint="Everyone with access to this store"
              action={
                <StudioButton onClick={() => toast.success("Invite sent (simulated)")}>
                  <Users width={13} height={13} /> Invite
                </StudioButton>
              }
            />
            <ul className="space-y-2">
              {TEAM.map((member) => (
                <li
                  key={member.email}
                  className="flex flex-wrap items-center gap-3 rounded-[2px] border border-hairline px-3 py-2.5"
                >
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-panel-2 font-mono text-[11px] text-chalk">
                    {member.name.split(" ").map((n) => n[0]).join("")}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] text-chalk">
                      {member.name} {member.you ? <span className="text-chalk-dim">(you)</span> : null}
                    </span>
                    <span className="block truncate font-mono text-[10.5px] text-chalk-dim">
                      {member.email}
                    </span>
                  </span>
                  <select
                    className={cn(selectClass, "w-[132px]")}
                    defaultValue={member.role}
                    aria-label={`Role for ${member.name}`}
                    onChange={() => toast.success(`${member.name}'s role updated`)}
                  >
                    {["Owner", "Manager", "Fulfilment", "Support", "Designer"].map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </li>
              ))}
            </ul>
          </Panel>
        </div>

        <div className="grid gap-3 self-start">
          <Panel>
            <PanelHead
              title="Notifications"
              hint="Where Ferixas reaches you"
              action={<Bell width={15} height={15} className="text-chalk-dim" />}
            />
            <ul className="space-y-2">
              {notifications.map((row) => (
                <li key={row.id}>
                  <button
                    type="button"
                    onClick={() =>
                      setNotifications((prev) =>
                        prev.map((n) => (n.id === row.id ? { ...n, on: !n.on } : n)),
                      )
                    }
                    aria-pressed={row.on}
                    className="flex w-full cursor-pointer items-start gap-3 rounded-[2px] border border-hairline p-3 text-left transition-colors hover:border-chalk-dim"
                  >
                    <span
                      className={cn(
                        "relative mt-0.5 h-5 w-9 shrink-0 rounded-full border transition-colors",
                        row.on ? "border-lime bg-lime/25" : "border-hairline bg-void",
                      )}
                    >
                      <span
                        className={cn(
                          "absolute top-[2px] h-3.5 w-3.5 rounded-full transition-all",
                          row.on ? "left-[18px] bg-lime" : "left-[2px] bg-chalk-dim",
                        )}
                      />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] text-chalk">{row.label}</span>
                      <span className="mt-0.5 block text-[12px] text-chalk-dim">{row.detail}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel>
            <PanelHead title="Money" hint="Currency, tax and payout method" />
            <div className="grid gap-4">
              <Field label="Store currency" hint="Customers are charged in this currency">
                <select className={selectClass} value={currency} onChange={(e) => setCurrency(e.target.value)}>
                  {PLATFORM.currencies.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code} \u00b7 {c.symbol}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Tax rate" hint={`${taxRate}% applied at checkout`}>
                <input
                  type="number"
                  step="0.1"
                  className={inputClass}
                  value={taxRate}
                  onChange={(e) => setTaxRate(Number(e.target.value))}
                />
              </Field>
            </div>
            <div className="mt-4 flex items-center gap-2.5 rounded-[2px] border border-hairline p-3">
              <Percent width={14} height={14} className="text-lime" />
              <span className="text-[12.5px] text-chalk-dim">
                Marketplace commission: {merchant.commissionPct}% on marketplace sales only
              </span>
            </div>
            <StudioButton className="mt-3 w-full" onClick={() => toast.info("Payout method is simulated")}>
              <Wallet width={14} height={14} /> Payout method
            </StudioButton>
          </Panel>

          <Panel>
            <PanelHead title="Store availability" hint="Pause selling without losing anything" />
            <button
              type="button"
              onClick={() => {
                setStoreOpen((v) => !v);
                toast.success(!storeOpen ? "Store reopened" : "Store paused for new orders");
              }}
              className="flex w-full cursor-pointer items-center gap-3 rounded-[2px] border border-hairline p-3 text-left"
            >
              <span
                className={cn(
                  "grid h-5 w-5 shrink-0 place-items-center rounded-[2px] border",
                  storeOpen ? "border-lime bg-lime text-void" : "border-hairline text-transparent",
                )}
              >
                <Check width={12} height={12} />
              </span>
              <span className="flex-1">
                <span className="block text-[13px] text-chalk">
                  {storeOpen ? "Open for orders" : "Paused"}
                </span>
                <span className="mt-0.5 block text-[12px] text-chalk-dim">
                  Pausing hides the buy buttons but keeps your catalog and design intact.
                </span>
              </span>
            </button>
          </Panel>

          <Panel>
            <div className="flex gap-3">
              <ShieldCheck width={18} height={18} className="mt-0.5 shrink-0 text-lime" />
              <div>
                <p className="text-[13px] text-chalk">Prototype notice</p>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-chalk-dim">
                  Accounts, authentication, payments and tax filing are not implemented. Settings
                  on this page are interactive but stay in local state.
                </p>
              </div>
            </div>
          </Panel>

          <Panel className="border-ember/30">
            <div className="flex gap-3">
              <AlertTriangle width={18} height={18} className="mt-0.5 shrink-0 text-ember-soft" />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] text-chalk">Deactivate this store</p>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-chalk-dim">
                  Removes the storefront and every marketplace listing. The catalog is retained for
                  30 days.
                </p>
                <StudioButton
                  variant="danger"
                  className="mt-3"
                  onClick={() => toast.error("Deactivation is disabled in the prototype")}
                >
                  Deactivate store
                </StudioButton>
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </StudioShell>
  );
}

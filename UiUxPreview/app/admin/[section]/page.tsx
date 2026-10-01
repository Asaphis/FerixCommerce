"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";
import {
  BadgeCheck,
  Ban,
  Check,
  ExternalLink,
  FileSpreadsheet,
  Globe2,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  ADMIN_SETTINGS_ROWS,
  AI_USAGE,
  AUDIT_LOG,
  CATEGORIES,
  CUSTOMERS,
  DISPUTES,
  INTEGRATIONS,
  MERCHANTS,
  ORDERS,
  PAYOUTS,
  PLATFORM,
  PRODUCTS,
  PROMOTIONS,
  REFUNDS,
  REPORT_EXPORTS,
  STORE_TEMPLATES,
  SUBSCRIPTION_PLANS,
  customerById,
  getMerchant,
  merchantStats,
  platformTotals,
} from "@/lib/data";
import { dateLong, dateShort, money, num, relative } from "@/lib/format";
import {
  Panel,
  PanelHead,
  Pill,
  SegmentedControl,
  StatTile,
  StudioButton,
  TableWrap,
  Td,
  Th,
  inputClass,
} from "@/components/studio/bits";
import { cn } from "@/lib/utils";
import { BannerManager } from "@/components/admin/banner-manager";

type Column<T> = {
  label: string;
  align?: "left" | "right" | "center";
  render: (row: T, index: number) => ReactNode;
};

function DataTable<T>({
  rows,
  columns,
  empty = "Nothing to show",
}: {
  rows: T[];
  columns: Column<T>[];
  empty?: string;
}) {
  if (!rows.length) {
    return <p className="py-10 text-center text-[13px] text-chalk-dim">{empty}</p>;
  }
  return (
    <TableWrap>
      <thead>
        <tr>
          {columns.map((column) => (
            <Th key={column.label} align={column.align}>
              {column.label}
            </Th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, index) => (
          <tr key={index} className="transition-colors hover:bg-panel-2/40">
            {columns.map((column) => (
              <Td key={column.label} align={column.align}>
                {column.render(row, index)}
              </Td>
            ))}
          </tr>
        ))}
      </tbody>
    </TableWrap>
  );
}

function Section({
  intro,
  children,
  aside,
}: {
  intro: string;
  children: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <div className="grid gap-3">
      <div className={cn("grid gap-3", aside && "lg:grid-cols-[1.6fr_1fr]")}>
        <p className="max-w-[80ch] text-[13px] leading-relaxed text-chalk-dim">{intro}</p>
        {aside ? <div className="lg:justify-self-end">{aside}</div> : null}
      </div>
      {children}
    </div>
  );
}

function MerchantCell({ merchantId }: { merchantId: string }) {
  const merchant = getMerchant(merchantId);
  return (
    <span className="flex items-center gap-2.5">
      <span
        className="grid h-7 w-7 shrink-0 place-items-center rounded-[2px] font-display text-[11px] font-extrabold"
        style={{ background: merchant.brand.accent, color: merchant.brand.accentInk }}
      >
        {merchant.name.slice(0, 1)}
      </span>
      <span className="min-w-0 truncate text-[12.5px] text-chalk">{merchant.name}</span>
    </span>
  );
}

export default function AdminSectionPage() {
  const params = useParams<{ section: string }>();
  const slug = params.section;
  const totals = platformTotals();

  const [merchantStatus, setMerchantStatus] = useState<Record<string, string>>({});
  const [commission, setCommission] = useState<Record<string, number>>(
    Object.fromEntries(MERCHANTS.map((m) => [m.id, m.commissionPct])),
  );
  const [disputeStatus, setDisputeStatus] = useState<Record<string, string>>({});
  const [refundStatus, setRefundStatus] = useState<Record<string, string>>({});
  const [settings, setSettings] = useState(
    Object.fromEntries(ADMIN_SETTINGS_ROWS.flatMap((group) => group.rows.map((row) => [`${group.group}-${row.label}`, row.value]))),
  );
  const [merchantQuery, setMerchantQuery] = useState("");
  const [country, setCountry] = useState<string[]>([]);

  const merchantRows = useMemo(
    () =>
      MERCHANTS.filter((m) => {
        const status = merchantStatus[m.id] ?? m.status;
        if (merchantQuery === "review" && status !== "review") return false;
        if (merchantQuery === "suspended" && status !== "suspended") return false;
        return true;
      }),
    [merchantStatus, merchantQuery],
  );

  switch (slug) {
    case "merchants":
      return (
        <Section
          intro="Every tenant on the platform, whether they sell only through their own storefront or also on the marketplace. Commission, plan and status are controlled here; their catalogs and designs stay theirs."
          aside={
            <SegmentedControl
              value={merchantQuery}
              onChange={setMerchantQuery}
              options={[
                { value: "", label: "All" },
                { value: "review", label: "In review" },
                { value: "suspended", label: "Suspended" },
              ]}
            />
          }
        >
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile label="Merchants" value={num(totals.merchants)} sub="Modelled tenants shown below" />
            <StatTile
              label="Active"
              value={String(MERCHANTS.filter((m) => (merchantStatus[m.id] ?? m.status) === "active").length)}
              sub="Selling without restriction"
            />
            <StatTile
              label="Marketplace enabled"
              value={String(MERCHANTS.filter((m) => m.marketplaceEnabled).length)}
              sub="Visible on ferixas.com"
            />
            <StatTile label="Subscription MRR" value={money(totals.mrr, { cents: false })} sub="Across 4 plans" />
          </div>

          <Panel flush>
            <div className="p-5 pb-4">
              <PanelHead title="Merchant register" hint="Plan, commission and status" />
            </div>
            <div className="px-5 pb-5">
              <DataTable
                rows={merchantRows}
                columns={[
                  {
                    label: "Merchant",
                    render: (m) => (
                      <span className="min-w-0">
                        <span className="flex items-center gap-1.5 text-[12.5px] text-chalk">
                          {m.name}
                          {m.verified ? <BadgeCheck width={12} height={12} className="text-lime" /> : null}
                        </span>
                        <span className="block font-mono text-[10px] text-chalk-dim">
                          {m.customDomain ?? m.domain} \u00b7 {m.location}
                        </span>
                      </span>
                    ),
                  },
                  { label: "Plan", render: (m) => <Pill tone={m.plan === "Platform" ? "lime" : "neutral"}>{m.plan}</Pill> },
                  {
                    label: "Status",
                    render: (m) => {
                      const status = merchantStatus[m.id] ?? m.status;
                      return (
                        <Pill tone={status === "active" ? "success" : status === "review" ? "warn" : "danger"}>
                          {status}
                        </Pill>
                      );
                    },
                  },
                  {
                    label: "Commission",
                    align: "right",
                    render: (m) => (
                      <input
                        type="number"
                        value={commission[m.id]}
                        onChange={(e) => setCommission({ ...commission, [m.id]: Number(e.target.value) })}
                        aria-label={`Commission for ${m.name}`}
                        className="h-7 w-[62px] rounded-[2px] border border-hairline bg-void text-center font-mono text-[11.5px] text-chalk outline-none focus:border-chalk-dim"
                      />
                    ),
                  },
                  {
                    label: "Revenue",
                    align: "right",
                    render: (m) => (
                      <span className="font-mono text-[12.5px] tabular-nums">
                        {money(merchantStats(m.id).revenue, { cents: false })}
                      </span>
                    ),
                  },
                  {
                    label: "Actions",
                    align: "right",
                    render: (m) => {
                      const status = merchantStatus[m.id] ?? m.status;
                      return (
                        <div className="flex items-center justify-end gap-1.5">
                          {status !== "active" ? (
                            <StudioButton
                              onClick={() => {
                                setMerchantStatus({ ...merchantStatus, [m.id]: "active" });
                                toast.success(`${m.name} approved`);
                              }}
                            >
                              <Check width={12} height={12} /> Approve
                            </StudioButton>
                          ) : (
                            <StudioButton
                              variant="danger"
                              onClick={() => {
                                setMerchantStatus({ ...merchantStatus, [m.id]: "suspended" });
                                toast.success(`${m.name} suspended`);
                              }}
                            >
                              <Ban width={12} height={12} /> Suspend
                            </StudioButton>
                          )}
                          <Link href={`/store/${m.slug}`} aria-label={`View ${m.name} store`}>
                            <StudioButton>
                              <ExternalLink width={12} height={12} />
                            </StudioButton>
                          </Link>
                        </div>
                      );
                    },
                  },
                ]}
              />
            </div>
          </Panel>
        </Section>
      );

    case "marketplace":
      return (
        <Section intro="The marketplace itself: the promotional banner slider every shopper lands on. Slides can be images or video, ordered, scheduled and measured \u2014 and a slide can be taken offline without deleting it.">
          <BannerManager />
        </Section>
      );

    case "customers":
      return (
        <Section intro="Platform-wide customers. Merchants see their own customers only; this is the aggregate view used for support, fraud review and reporting.">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile label="Customers" value={num(totals.customers)} sub={`${CUSTOMERS.length} modelled in this prototype`} />
            <StatTile label="Repeat buyers" value={`${Math.round((CUSTOMERS.filter((c) => c.orderCount > 1).length / CUSTOMERS.length) * 100)}%`} sub="More than one order" />
            <StatTile label="Average lifetime value" value={money(CUSTOMERS.reduce((s, c) => s + c.spent, 0) / CUSTOMERS.length, { cents: false })} sub="Across modelled accounts" />
            <StatTile label="Countries" value={String(PLATFORM.countries.length)} sub="Where customers order from" />
          </div>
          <Panel flush>
            <div className="p-5 pb-4">
              <PanelHead title="Customer accounts" hint="Lifetime value across the whole platform" />
            </div>
            <div className="px-5 pb-5">
              <DataTable
                rows={CUSTOMERS.slice(0, 24)}
                columns={[
                  {
                    label: "Customer",
                    render: (c) => (
                      <span className="min-w-0">
                        <span className="block truncate text-[12.5px] text-chalk">{c.name}</span>
                        <span className="block truncate font-mono text-[10px] text-chalk-dim">{c.email}</span>
                      </span>
                    ),
                  },
                  { label: "Location", render: (c) => <span className="text-[12px] text-chalk-dim">{c.location}</span> },
                  { label: "Segment", render: (c) => <Pill tone={c.segment === "vip" ? "lime" : c.segment === "returning" ? "info" : "neutral"}>{c.segment}</Pill> },
                  { label: "Orders", align: "right", render: (c) => <span className="font-mono text-[12px] tabular-nums text-chalk-dim">{c.orderCount}</span> },
                  { label: "Spent", align: "right", render: (c) => <span className="font-mono text-[12.5px] tabular-nums">{money(c.spent, { cents: false })}</span> },
                  { label: "Last order", align: "right", render: (c) => <span className="font-mono text-[11px] text-chalk-dim">{dateShort(c.lastOrderAt)}</span> },
                ]}
              />
            </div>
          </Panel>
        </Section>
      );

    case "products":
      return (
        <Section intro="The global product register. A product belongs to exactly one merchant, and its channel flags decide whether it is sold on the marketplace, on the merchant's own storefront, or both.">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile label="Products" value={String(PRODUCTS.length)} sub="Across all tenants" />
            <StatTile label="Live on marketplace" value={String(PRODUCTS.filter((p) => p.channels.marketplace && p.status === "active").length)} sub="Buyable on ferixas.com" />
            <StatTile label="Store only" value={String(PRODUCTS.filter((p) => p.channels.store && !p.channels.marketplace && p.status === "active").length)} sub="Hidden from the marketplace" />
            <StatTile label="Draft or archived" value={String(PRODUCTS.filter((p) => p.status !== "active").length)} sub="Not for sale anywhere" />
          </div>
          <Panel flush>
            <div className="p-5 pb-4">
              <PanelHead title="Product register" hint="Channel participation per product" />
            </div>
            <div className="px-5 pb-5">
              <DataTable
                rows={PRODUCTS.slice(0, 30)}
                columns={[
                  { label: "Product", render: (p) => <span className="block max-w-[260px] truncate text-[12.5px] text-chalk">{p.title}</span> },
                  { label: "Merchant", render: (p) => <MerchantCell merchantId={p.merchantId} /> },
                  { label: "Status", render: (p) => <Pill tone={p.status === "active" ? "success" : p.status === "draft" ? "warn" : "neutral"}>{p.status}</Pill> },
                  {
                    label: "Channels",
                    render: (p) => (
                      <span className="flex gap-1.5">
                        {p.channels.store ? <Pill tone="lime">Store</Pill> : null}
                        {p.channels.marketplace ? <Pill tone="ember">Market</Pill> : null}
                        {!p.channels.store && !p.channels.marketplace ? <Pill tone="neutral">None</Pill> : null}
                      </span>
                    ),
                  },
                  { label: "Price", align: "right", render: (p) => <span className="font-mono text-[12.5px] tabular-nums">{money(p.price)}</span> },
                  { label: "Stock", align: "right", render: (p) => <span className={cn("font-mono text-[12px] tabular-nums", p.stock <= p.lowStockAt && "text-ember-soft")}>{p.stock}</span> },
                ]}
              />
            </div>
          </Panel>
        </Section>
      );

    case "orders":
      return (
        <Section intro="Every order on the platform, tagged with the channel that produced it. Marketplace orders carry platform commission; storefront orders do not.">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile label="Orders" value={num(ORDERS.length)} sub="Across the 90-day model" />
            <StatTile label="Marketplace" value={num(ORDERS.filter((o) => o.channel === "marketplace").length)} sub="Commission applies" />
            <StatTile label="Storefronts" value={num(ORDERS.filter((o) => o.channel === "store").length)} sub="No platform commission" />
            <StatTile label="Multi-merchant carts" value={num(ORDERS.filter((o) => o.merchantIds.length > 1).length)} sub="One cart, several sellers" />
          </div>
          <Panel flush>
            <div className="p-5 pb-4">
              <PanelHead title="Order register" hint="Newest first" />
            </div>
            <div className="px-5 pb-5">
              <DataTable
                rows={ORDERS.slice(0, 30)}
                columns={[
                  { label: "Order", render: (o) => <span className="font-mono text-[12px] text-chalk">{o.number}</span> },
                  { label: "Customer", render: (o) => <span className="block max-w-[150px] truncate text-[12px] text-chalk-dim">{customerById(o.customerId)?.name}</span> },
                  { label: "Channel", render: (o) => <Pill tone={o.channel === "marketplace" ? "ember" : "lime"}>{o.channel === "marketplace" ? "Marketplace" : "Store"}</Pill> },
                  { label: "Sellers", align: "center", render: (o) => <span className="font-mono text-[12px] text-chalk-dim">{o.merchantIds.length}</span> },
                  { label: "Payment", render: (o) => <Pill tone={o.payment === "paid" ? "success" : o.payment === "pending" ? "warn" : "danger"}>{o.payment}</Pill> },
                  { label: "Commission", align: "right", render: (o) => <span className="font-mono text-[12px] tabular-nums text-ember-soft">{o.commission ? money(o.commission, { cents: false }) : "\u2014"}</span> },
                  { label: "Total", align: "right", render: (o) => <span className="font-mono text-[12.5px] tabular-nums">{money(o.total)}</span> },
                ]}
              />
            </div>
          </Panel>
        </Section>
      );

    case "stores":
      return (
        <Section intro="One storefront per tenant, each driven by the merchant's own published design document. Domains, visibility and marketplace participation are shown here for support purposes.">
          <DataTable
            rows={MERCHANTS}
            columns={[
              { label: "Store", render: (m) => <MerchantCell merchantId={m.id} /> },
              { label: "Address", render: (m) => <span className="font-mono text-[11.5px] text-chalk-dim">{m.domain}</span> },
              { label: "Custom domain", render: (m) => <span className="font-mono text-[11.5px] text-chalk-dim">{m.customDomain ?? "\u2014"}</span> },
              { label: "Theme", render: (m) => <Pill tone="neutral">{m.brand.template}</Pill> },
              { label: "Marketplace", render: (m) => <Pill tone={m.marketplaceEnabled ? "success" : "neutral"}>{m.marketplaceEnabled ? "Participating" : "Storefront only"}</Pill> },
              { label: "Visibility", render: (m) => <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-chalk-dim">{m.visibility ?? "public"}</span> },
              {
                label: "",
                align: "right",
                render: (m) => (
                  <Link href={`/store/${m.slug}`} className="font-mono text-[10px] uppercase tracking-[0.12em] text-lime">
                    Open
                  </Link>
                ),
              },
            ]}
          />
        </Section>
      );

    case "domains":
      return (
        <Section intro="Custom domains across all tenants, with verification state. Platform subdomains need no DNS work; custom domains are verified by the platform before certificates are issued.">
          <DataTable
            rows={MERCHANTS}
            columns={[
              { label: "Merchant", render: (m) => <MerchantCell merchantId={m.id} /> },
              { label: "Platform address", render: (m) => <span className="font-mono text-[11.5px] text-chalk-dim">{m.domain}</span> },
              { label: "Custom domain", render: (m) => <span className="font-mono text-[11.5px] text-chalk">{m.customDomain ?? "Not connected"}</span> },
              {
                label: "State",
                render: (m) =>
                  m.customDomain ? (
                    <Pill tone="success">
                      <ShieldCheck width={11} height={11} /> Verified
                    </Pill>
                  ) : (
                    <Pill tone="neutral">Platform only</Pill>
                  ),
              },
              { label: "SSL", render: (m) => <span className="font-mono text-[11px] text-chalk-dim">{m.customDomain ? "TLS 1.3, auto-renew" : "n/a"}</span> },
            ]}
          />
        </Section>
      );

    case "categories":
      return (
        <Section intro="The marketplace taxonomy. Departments are shared by every merchant, which is what lets one search return products from all of them.">
          <DataTable
            rows={CATEGORIES}
            columns={[
              { label: "Department", render: (c) => <span className="text-[12.5px] text-chalk">{c.name}</span> },
              { label: "Handle", render: (c) => <span className="font-mono text-[11.5px] text-chalk-dim">/{c.slug}</span> },
              { label: "Description", render: (c) => <span className="block max-w-[320px] truncate text-[12px] text-chalk-dim">{c.blurb}</span> },
              { label: "Products", align: "right", render: (c) => <span className="font-mono text-[12px] tabular-nums">{PRODUCTS.filter((p) => p.category === c.slug).length}</span> },
              { label: "Live", align: "right", render: (c) => <span className="font-mono text-[12px] tabular-nums text-chalk-dim">{PRODUCTS.filter((p) => p.category === c.slug && p.channels.marketplace && p.status === "active").length}</span> },
            ]}
          />
        </Section>
      );

    case "promotions":
      return (
        <Section intro="Promotions run either on a merchant's own storefront or, with the marketplace spotlight, on ferixas.com. Merchants create them; the platform can end any of them.">
          <DataTable
            rows={PROMOTIONS}
            columns={[
              { label: "Promotion", render: (p) => (
                <span className="min-w-0">
                  <span className="block truncate text-[12.5px] text-chalk">{p.name}</span>
                  <span className="block font-mono text-[10px] text-chalk-dim">{p.value}</span>
                </span>
              ) },
              { label: "Merchant", render: (p) => <MerchantCell merchantId={p.id.split("_")[1] ?? MERCHANTS[0].id} /> },
              { label: "Scope", render: (p) => <Pill tone={p.scope === "marketplace" ? "ember" : "neutral"}>{p.scope}</Pill> },
              { label: "Status", render: (p) => <Pill tone={p.status === "active" ? "success" : p.status === "scheduled" ? "info" : "neutral"}>{p.status}</Pill> },
              { label: "Uses", align: "right", render: (p) => <span className="font-mono text-[12px] tabular-nums text-chalk-dim">{p.uses}</span> },
              { label: "Revenue", align: "right", render: (p) => <span className="font-mono text-[12.5px] tabular-nums">{money(p.revenue, { cents: false })}</span> },
            ]}
          />
        </Section>
      );

    case "payments":
      return (
        <Section intro="Payment state across the platform. Card, bank transfer and wallet are the three simulated methods; in production each settles through the configured provider.">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile label="Collected" value={money(totals.gmv, { cents: false })} sub="All channels, 90 days" />
            <StatTile label="Pending" value={money(ORDERS.filter((o) => o.payment === "pending").reduce((s, o) => s + o.total, 0), { cents: false })} sub={`${ORDERS.filter((o) => o.payment === "pending").length} orders`} />
            <StatTile label="Failed" value={String(ORDERS.filter((o) => o.payment === "failed").length)} sub="Retried automatically twice" />
            <StatTile label="Refunded" value={money(totals.refunds, { cents: false })} sub={`${ORDERS.filter((o) => o.payment === "refunded").length} orders`} />
          </div>
          <Panel>
            <PanelHead title="Payment methods" hint="Configured for the platform" />
            <div className="grid gap-2.5 sm:grid-cols-3">
              {[
                ["Card", "Stripe \u00b7 Paystack \u00b7 Flutterwave", "78% of volume"],
                ["Bank transfer", "Manual reconciliation, 24h window", "14% of volume"],
                ["Ferixas wallet", "Instant, refunds land here first", "8% of volume"],
              ].map(([name, detail, share]) => (
                <div key={name} className="rounded-[2px] border border-hairline p-4">
                  <p className="flex items-center gap-2 text-[13px] text-chalk">
                    <Check width={13} height={13} className="text-lime" /> {name}
                  </p>
                  <p className="mt-1.5 font-mono text-[10.5px] text-chalk-dim">{detail}</p>
                  <p className="mt-2 font-mono text-[11px] text-lime">{share}</p>
                </div>
              ))}
            </div>
          </Panel>
        </Section>
      );

    case "payouts":
      return (
        <Section
          intro="Bi-weekly payout runs. Commission is deducted at source on marketplace sales, and refunds or open disputes are withheld from the next run."
          aside={
            <StudioButton
              variant="primary"
              onClick={() => toast.success("Payout batch approved for 168 merchants (simulated)")}
            >
              Approve next batch
            </StudioButton>
          }
        >
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile label="Paid to date" value={money(PAYOUTS.filter((p) => p.status === "paid").reduce((s, p) => s + p.amount - p.commission, 0), { cents: false })} sub="Net of commission" />
            <StatTile label="In transit" value={money(PAYOUTS.filter((p) => p.status === "in transit").reduce((s, p) => s + p.amount, 0), { cents: false })} sub="Settling with banks" />
            <StatTile label="On hold" value={String(PAYOUTS.filter((p) => p.status === "on hold").length)} sub="Disputes or verification" />
            <StatTile label="Commission retained" value={money(PAYOUTS.reduce((s, p) => s + p.commission, 0), { cents: false })} sub="Across all runs" />
          </div>
          <Panel flush>
            <div className="p-5 pb-4">
              <PanelHead title="Payout runs" hint="Most recent first" />
            </div>
            <div className="px-5 pb-5">
              <DataTable
                rows={PAYOUTS.slice(0, 24)}
                columns={[
                  { label: "Merchant", render: (p) => <MerchantCell merchantId={p.id.split("_")[1] ?? MERCHANTS[0].id} /> },
                  { label: "Period", render: (p) => <span className="font-mono text-[11.5px] text-chalk-dim">{p.period}</span> },
                  { label: "Gross", align: "right", render: (p) => <span className="font-mono text-[12.5px] tabular-nums">{money(p.amount, { cents: false })}</span> },
                  { label: "Commission", align: "right", render: (p) => <span className="font-mono text-[12px] tabular-nums text-ember-soft">{p.commission ? `\u2212${money(p.commission, { cents: false })}` : "\u2014"}</span> },
                  { label: "Net", align: "right", render: (p) => <span className="font-mono text-[12.5px] tabular-nums text-lime">{money(p.amount - p.commission, { cents: false })}</span> },
                  { label: "Status", render: (p) => <Pill tone={p.status === "paid" ? "success" : p.status === "in transit" ? "info" : p.status === "on hold" ? "danger" : "warn"}>{p.status}</Pill> },
                  { label: "Method", render: (p) => <span className="font-mono text-[10.5px] text-chalk-dim">{p.method}</span> },
                ]}
              />
            </div>
          </Panel>
        </Section>
      );

    case "commissions":
      return (
        <Section intro="Commission is the platform's marketplace revenue. It applies only to sales that came through ferixas.com \u2014 storefront orders keep the full amount for the merchant.">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile label="Base rate" value="12%" sub="Default for new tenants" />
            <StatTile label="Commission earned" value={money(totals.commission, { cents: false })} sub="Modelled marketplace sales" />
            <StatTile label="Effective rate" value={`${((totals.commission / (totals.gmv || 1)) * 100).toFixed(1)}%`} sub="Blended across channels" />
            <StatTile label="Store revenue untouched" value={money(ORDERS.filter((o) => o.channel === "store").reduce((s, o) => s + o.total, 0), { cents: false })} sub="No platform cut" />
          </div>
          <DataTable
            rows={MERCHANTS}
            columns={[
              { label: "Merchant", render: (m) => <MerchantCell merchantId={m.id} /> },
              { label: "Plan", render: (m) => <Pill tone={m.plan === "Platform" ? "lime" : "neutral"}>{m.plan}</Pill> },
              { label: "Rate", render: (m) => <span className="font-mono text-[12.5px] text-chalk">{commission[m.id]}%</span> },
              { label: "Commission paid", align: "right", render: (m) => <span className="font-mono text-[12.5px] tabular-nums">{money(merchantStats(m.id).commission, { cents: false })}</span> },
              { label: "Marketplace share", align: "right", render: (m) => {
                const stats = merchantStats(m.id);
                const share = stats.revenue ? (stats.commission / (stats.revenue * 0.12 || 1)) * 100 : 0;
                return <span className="font-mono text-[12px] text-chalk-dim">{Math.min(100, share).toFixed(0)}%</span>;
              } },
            ]}
          />
        </Section>
      );

    case "refunds":
      return (
        <Section intro="Refund requests raised by customers. Merchants can approve their own; the platform reviews anything contested or above the auto-approve threshold.">
          <Panel flush>
            <div className="p-5 pb-4">
              <PanelHead title="Refund register" hint="Approve or decline in place" />
            </div>
            <div className="px-5 pb-5">
              <DataTable
                rows={REFUNDS}
                columns={[
                  { label: "Reference", render: (r) => <span className="font-mono text-[11.5px] text-chalk">{r.id}</span> },
                  { label: "Order", render: (r) => <span className="font-mono text-[11.5px] text-chalk-dim">{r.orderId}</span> },
                  { label: "Merchant", render: (r) => <MerchantCell merchantId={r.merchantId} /> },
                  { label: "Reason", render: (r) => <span className="block max-w-[220px] truncate text-[12px] text-chalk-dim">{r.reason}</span> },
                  { label: "Amount", align: "right", render: (r) => <span className="font-mono text-[12.5px] tabular-nums">{money(r.amount)}</span> },
                  { label: "State", render: (r) => <Pill tone={(refundStatus[r.id] ?? r.status) === "refunded" ? "success" : "warn"}>{refundStatus[r.id] ?? r.status}</Pill> },
                  {
                    label: "Actions",
                    align: "right",
                    render: (r) => (
                      <div className="flex justify-end gap-1.5">
                        <StudioButton
                          onClick={() => {
                            setRefundStatus({ ...refundStatus, [r.id]: "refunded" });
                            toast.success(`${r.id} refunded`);
                          }}
                        >
                          <Check width={12} height={12} /> Approve
                        </StudioButton>
                        <StudioButton
                          variant="danger"
                          onClick={() => {
                            setRefundStatus({ ...refundStatus, [r.id]: "declined" });
                            toast.success(`${r.id} declined`);
                          }}
                        >
                          <X width={12} height={12} /> Decline
                        </StudioButton>
                      </div>
                    ),
                  },
                ]}
              />
            </div>
          </Panel>
        </Section>
      );

    case "subscriptions":
      return (
        <Section intro="Merchant plans. Commission, custom domains and the AI design assistant all vary by plan, which is what makes the tiering visible in the product rather than just on a pricing page.">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {SUBSCRIPTION_PLANS.map((plan) => (
              <div key={plan.name} className="rounded-[3px] border border-hairline bg-panel p-4">
                <div className="flex items-center justify-between">
                  <span className="font-display text-[14.5px] font-semibold text-chalk">{plan.name}</span>
                  {plan.name === "Platform" ? <Pill tone="lime">First party</Pill> : null}
                </div>
                <p className="mt-2 font-mono text-[20px] font-semibold tabular-nums text-chalk">
                  {money(plan.price, { cents: false })}
                  <span className="text-[11px] text-chalk-dim">/mo</span>
                </p>
                <p className="mt-2 text-[12px] leading-relaxed text-chalk-dim">{plan.features}</p>
                <p className="mt-3 border-t border-hairline pt-3 font-mono text-[11px] text-chalk-dim">
                  {num(plan.merchants)} merchant{plan.merchants === 1 ? "" : "s"}
                </p>
              </div>
            ))}
          </div>
          <Panel>
            <PanelHead title="Subscription revenue" hint="Monthly recurring, modelled" />
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                ["MRR", money(totals.mrr, { cents: false })],
                ["Paying merchants", num(507)],
                ["Average revenue per merchant", money(totals.mrr / 507, { cents: false })],
              ].map(([label, value]) => (
                <div key={label} className="rounded-[2px] border border-hairline p-4">
                  <p className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-chalk-dim">{label}</p>
                  <p className="mt-2 font-mono text-[18px] font-semibold tabular-nums text-chalk">{value}</p>
                </div>
              ))}
            </div>
          </Panel>
        </Section>
      );

    case "templates":
      return (
        <Section intro="Store templates offered to merchants inside the Design Engine. Applying one changes spacing, type scale and surface treatment \u2014 never a merchant's products or copy.">
          <DataTable
            rows={STORE_TEMPLATES}
            columns={[
              { label: "Template", render: (t) => <span className="text-[12.5px] text-chalk">{t.name}</span> },
              { label: "Key", render: (t) => <span className="font-mono text-[11.5px] text-chalk-dim">{t.id}</span> },
              { label: "Direction", render: (t) => <span className="block max-w-[320px] text-[12px] text-chalk-dim">{t.style}</span> },
              { label: "Tenants using it", align: "right", render: (t) => <span className="font-mono text-[12.5px] tabular-nums">{num(t.tenants)}</span> },
              { label: "Status", render: () => <Pill tone="success">Published</Pill> },
            ]}
          />
        </Section>
      );

    case "ai-usage":
      return (
        <Section intro="Usage of the Design Engine's AI assistant. Every proposal is a draft until the merchant applies it, so this is a measure of helpful suggestions rather than automatic changes.">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile label="Proposals" value={num(AI_USAGE.proposals)} sub="This quarter" />
            <StatTile label="Applied" value={num(AI_USAGE.applied)} sub={`${AI_USAGE.acceptedRate}% acceptance`} />
            <StatTile label="Tokens" value={num(AI_USAGE.tokens, { compact: true })} sub="Across all tenants" />
            <StatTile label="Credits per proposal" value={String(AI_USAGE.creditsPerProposal)} sub={`Cost ${money(AI_USAGE.costUsd, { cents: false })} modelled`} />
          </div>
          <Panel flush>
            <div className="p-5 pb-4">
              <PanelHead title="Usage by tenant" hint="Proposals requested" />
            </div>
            <div className="px-5 pb-5">
              <DataTable
                rows={AI_USAGE.byTenant}
                columns={[
                  { label: "Merchant", render: (row) => <MerchantCell merchantId={row.merchantId} /> },
                  { label: "Proposals", align: "right", render: (row) => <span className="font-mono text-[12.5px] tabular-nums">{num(row.proposals)}</span> },
                  { label: "Applied", align: "right", render: (row) => <span className="font-mono text-[12.5px] tabular-nums text-lime">{num(row.applied)}</span> },
                  { label: "Acceptance", align: "right", render: (row) => <span className="font-mono text-[12px] text-chalk-dim">{((row.applied / row.proposals) * 100).toFixed(0)}%</span> },
                  { label: "Credits", align: "right", render: (row) => <span className="font-mono text-[12px] text-chalk-dim">{num(row.proposals * AI_USAGE.creditsPerProposal)}</span> },
                ]}
              />
            </div>
          </Panel>
        </Section>
      );

    case "countries":
      return (
        <Section intro="Where the marketplace operates. Merchants can only sell into enabled countries, and each one has its own tax and payout rules.">
          <DataTable
            rows={PLATFORM.countries}
            columns={[
              { label: "Country", render: (c) => <span className="text-[12.5px] text-chalk">{c.name}</span> },
              { label: "Code", render: (c) => <span className="font-mono text-[11.5px] text-chalk-dim">{c.code}</span> },
              { label: "Merchants", align: "right", render: (c) => <span className="font-mono text-[12.5px] tabular-nums">{num(c.stores)}</span> },
              { label: "Share of platform", align: "right", render: (c) => <span className="font-mono text-[12.5px] tabular-nums text-chalk-dim">{c.share}%</span> },
              {
                label: "Status",
                render: (c) => (
                  <button
                    type="button"
                    onClick={() => {
                      setCountry((prev) =>
                        prev.includes(c.code) ? prev.filter((code) => code !== c.code) : [...prev, c.code],
                      );
                      toast.success(`${c.name} ${country.includes(c.code) ? "disabled" : "enabled"} for selling`);
                    }}
                    className="cursor-pointer"
                  >
                    <Pill tone={country.includes(c.code) ? "neutral" : "success"}>
                      {country.includes(c.code) ? "Disabled" : "Live"}
                    </Pill>
                  </button>
                ),
              },
            ]}
          />
        </Section>
      );

    case "currencies":
      return (
        <Section intro="Presentment currencies. Merchants price in one currency and the platform converts at checkout; payouts settle in the merchant's own currency.">
          <DataTable
            rows={PLATFORM.currencies}
            columns={[
              { label: "Currency", render: (c) => <span className="text-[12.5px] text-chalk">{c.code}</span> },
              { label: "Symbol", render: (c) => <span className="font-mono text-[13px] text-chalk">{c.symbol}</span> },
              { label: "Rate to USD", align: "right", render: (c) => <span className="font-mono text-[12px] tabular-nums text-chalk-dim">{c.rate}</span> },
              { label: "Merchants", align: "right", render: (c) => <span className="font-mono text-[12.5px] tabular-nums">{num(c.stores)}</span> },
              { label: "Role", render: (c) => <Pill tone={c.primary ? "lime" : "neutral"}>{c.primary ? "Platform default" : "Presentment"}</Pill> },
            ]}
          />
        </Section>
      );

    case "integrations":
      return (
        <Section intro="The services the platform depends on. Payments, shipping and domains are live; anything in beta or planned is flagged so support knows where the gaps are.">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile label="Connected" value={String(INTEGRATIONS.filter((i) => i.status === "connected").length)} sub="In production" />
            <StatTile label="Beta" value={String(INTEGRATIONS.filter((i) => i.status === "beta").length)} sub="Available, limited" />
            <StatTile label="Planned" value={String(INTEGRATIONS.filter((i) => i.status === "planned").length)} sub="On the roadmap" />
            <StatTile label="Events (30d)" value={num(INTEGRATIONS.reduce((s, i) => s + i.events30d, 0), { compact: true })} sub="Across live integrations" />
          </div>
          <DataTable
            rows={INTEGRATIONS}
            columns={[
              { label: "Service", render: (i) => <span className="text-[12.5px] text-chalk">{i.name}</span> },
              { label: "Category", render: (i) => <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-chalk-dim">{i.category}</span> },
              {
                label: "Status",
                render: (i) => (
                  <Pill tone={i.status === "connected" ? "success" : i.status === "beta" ? "warn" : "neutral"}>
                    {i.status}
                  </Pill>
                ),
              },
              { label: "Events (30d)", align: "right", render: (i) => <span className="font-mono text-[12px] tabular-nums text-chalk-dim">{i.events30d ? num(i.events30d) : "\u2014"}</span> },
              { label: "Last sync", align: "right", render: (i) => <span className="font-mono text-[11px] text-chalk-dim">{i.lastSync ? relative(i.lastSync) : "\u2014"}</span> },
              {
                label: "",
                align: "right",
                render: (i) =>
                  i.status === "connected" ? (
                    <StudioButton onClick={() => toast.success(`${i.name} re-synced (simulated)`)}>
                      <RefreshCw width={12} height={12} /> Sync
                    </StudioButton>
                  ) : null,
              },
            ]}
          />
        </Section>
      );

    case "disputes":
      return (
        <Section intro="Disputes sit between a customer and a merchant, with the platform holding the payment until it is resolved. Resolving here releases or refunds the held amount.">
          <Panel flush>
            <div className="p-5 pb-4">
              <PanelHead title="Dispute register" hint="Oldest unresolved first" />
            </div>
            <div className="px-5 pb-5">
              <DataTable
                rows={DISPUTES}
                columns={[
                  { label: "Case", render: (d) => <span className="font-mono text-[11.5px] text-chalk">{d.id}</span> },
                  { label: "Order", render: (d) => <span className="font-mono text-[11.5px] text-chalk-dim">{d.orderId}</span> },
                  { label: "Merchant", render: (d) => <MerchantCell merchantId={d.merchantId} /> },
                  { label: "Reason", render: (d) => <span className="block max-w-[220px] truncate text-[12px] text-chalk-dim">{d.reason}</span> },
                  { label: "Amount", align: "right", render: (d) => <span className="font-mono text-[12.5px] tabular-nums">{money(d.amount)}</span> },
                  { label: "State", render: (d) => <Pill tone={(disputeStatus[d.id] ?? d.status) === "resolved" ? "success" : (disputeStatus[d.id] ?? d.status) === "escalated" ? "danger" : "warn"}>{disputeStatus[d.id] ?? d.status}</Pill> },
                  {
                    label: "Actions",
                    align: "right",
                    render: (d) => (
                      <div className="flex justify-end gap-1.5">
                        <StudioButton
                          onClick={() => {
                            setDisputeStatus({ ...disputeStatus, [d.id]: "resolved" });
                            toast.success(`${d.id} resolved in the customer's favour`);
                          }}
                        >
                          <Check width={12} height={12} /> Resolve
                        </StudioButton>
                        <StudioButton
                          variant="danger"
                          onClick={() => {
                            setDisputeStatus({ ...disputeStatus, [d.id]: "escalated" });
                            toast.success(`${d.id} escalated`);
                          }}
                        >
                          Escalate
                        </StudioButton>
                      </div>
                    ),
                  },
                ]}
              />
            </div>
          </Panel>
        </Section>
      );

    case "reports":
      return (
        <Section intro="Scheduled exports for finance and operations. Each report is generated from live data and delivered to the configured destination.">
          <DataTable
            rows={REPORT_EXPORTS}
            columns={[
              { label: "Report", render: (r) => <span className="text-[12.5px] text-chalk">{r.name}</span> },
              { label: "Cadence", render: (r) => <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-chalk-dim">{r.cadence}</span> },
              { label: "Rows", align: "right", render: (r) => <span className="font-mono text-[12px] tabular-nums text-chalk-dim">{num(r.rows)}</span> },
              { label: "Last run", align: "right", render: (r) => <span className="font-mono text-[11px] text-chalk-dim">{dateLong(r.lastRun)}</span> },
              {
                label: "",
                align: "right",
                render: (r) => (
                  <StudioButton onClick={() => toast.success(`${r.name} queued (simulated)`)}>
                    <FileSpreadsheet width={12} height={12} /> Run now
                  </StudioButton>
                ),
              },
            ]}
          />
        </Section>
      );

    case "audit-logs":
      return (
        <Section intro="Every privileged action, who took it and from where. Merchants see their own store's entries; the platform sees all of them.">
          <DataTable
            rows={AUDIT_LOG}
            columns={[
              { label: "When", render: (r) => <span className="font-mono text-[11px] text-chalk-dim">{dateShort(r.at)} {relative(r.at)}</span> },
              { label: "Actor", render: (r) => <span className="block max-w-[200px] truncate text-[12px] text-chalk">{r.actor}</span> },
              { label: "Action", render: (r) => <span className="block max-w-[320px] truncate text-[12px] text-chalk-dim">{r.action}</span> },
              { label: "Target", render: (r) => <span className="block max-w-[160px] truncate font-mono text-[11px] text-chalk-dim">{r.target}</span> },
              { label: "IP", align: "right", render: (r) => <span className="font-mono text-[11px] text-chalk-dim">{r.ip}</span> },
            ]}
          />
        </Section>
      );

    case "settings":
      return (
        <Section intro="Platform-wide defaults. Everything here changes behaviour for every tenant, so each row states its consequence plainly.">
          <div className="grid gap-3 lg:grid-cols-3">
            {ADMIN_SETTINGS_ROWS.map((group) => (
              <Panel key={group.group}>
                <PanelHead title={group.group} hint="Applies platform wide" />
                <div className="space-y-3">
                  {group.rows.map((row) => (
                    <div key={row.label}>
                      <label className="font-mono text-[10px] uppercase tracking-[0.14em] text-chalk-dim">
                        {row.label}
                      </label>
                      <input
                        value={settings[`${group.group}-${row.label}`] ?? row.value}
                        onChange={(e) =>
                          setSettings({ ...settings, [`${group.group}-${row.label}`]: e.target.value })
                        }
                        className={`${inputClass} mt-1`}
                      />
                      <p className="mt-1 text-[11.5px] text-chalk-dim">{row.detail}</p>
                    </div>
                  ))}
                </div>
              </Panel>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <StudioButton variant="primary" onClick={() => toast.success("Platform settings saved")}>
              Save platform settings
            </StudioButton>
            <StudioButton onClick={() => toast.info("Settings are session-local in the prototype")}>
              Reset to defaults
            </StudioButton>
          </div>
          <Panel>
            <PanelHead title="Product structure" hint="How the platform is put together" />
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                ["Commerce core", "Products, orders, payments, customers, inventory and sales channels \u2014 one record per thing, shared by every storefront."],
                ["Design engine", "Visual canvas, components, responsive rules, templates, versioning and the AI assistant that drafts changes."],
                ["Storefronts", "The Ferixas marketplace, merchant stores on platform subdomains, and merchant custom domains \u2014 all rendering the same documents."],
              ].map(([title, body]) => (
                <div key={title} className="rounded-[2px] border border-hairline p-4">
                  <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-lime">{title}</p>
                  <p className="mt-2 text-[12.5px] leading-relaxed text-chalk-dim">{body}</p>
                </div>
              ))}
            </div>
            <Link
              href="/docs/structure"
              className="mt-4 inline-flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.12em] text-lime"
            >
              <Globe2 width={12} height={12} /> Read the structure page
            </Link>
          </Panel>
        </Section>
      );

    default:
      return (
        <Section intro="That admin section is not part of the prototype. The full section list is in the sidebar.">
          <Panel>
            <div className="flex items-center gap-3">
              <Sparkles width={18} height={18} className="text-lime" />
              <p className="text-[13px] text-chalk-dim">
                Use the navigation to open a section. {ADMIN_SETTINGS_ROWS.length} configuration groups
                and {MERCHANTS.length} tenants are modelled here.
              </p>
            </div>
            <Link href="/admin" className="mt-4 inline-block">
              <StudioButton variant="outline">Back to the dashboard</StudioButton>
            </Link>
          </Panel>
        </Section>
      );
  }
}

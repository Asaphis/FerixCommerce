import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, AlertTriangle, ExternalLink, MapPin, Percent, Store, Trash2 } from "lucide-react";
import { requireAdmin } from "@/lib/data";
import { getMerchant, ApiError, type MerchantDetail } from "@/lib/api";
import { MerchantForm } from "@/components/ops/merchant-form";
import { Empty, Eyebrow, Panel, PanelHead, Pill, Readout } from "@/components/ops/bits";
import { CmsActionForm } from "@/components/ops/cms-action-form";
import { Field, SubmitButton } from "@/components/ops/controls";
import { deleteMerchantAction, restrictMerchantAction, suspendMerchantAction } from "@/lib/actions";
import { Distribution, KeyValue } from "@/components/ops/marks";
import { CellLabel, DataTable, inputClass, Row, Td, TdLead, TablePanel } from "@/components/ops/table";
import { compact, dateLong, money, num, relative, titleCase } from "@/lib/format";
import { SellerProductControls } from "@/components/ops/seller-product-controls";

function statusTone(status: string) {
  if (status === "active") return "mint" as const;
  if (status === "review") return "amber" as const;
  return "rose" as const;
}

export default async function MerchantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { session, admin } = await requireAdmin();
  const permissions = admin.permissions ?? [];
  const canDelete = permissions.includes("*");
  const canManageAccount = canDelete || permissions.includes("merchant.approve");
  const canManageProducts = canDelete || permissions.includes("catalog.manage");
  let detail: MerchantDetail | null = null;
  let loadError = "";
  try {
    detail = await getMerchant(session, id);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    loadError = error instanceof ApiError ? error.message : "The seller record could not be loaded. Try again or return to the merchant list.";
  }
  if (!detail) {
    return <div className="grid min-w-0 gap-5">
      <Link href="/merchants" className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-chalk-dim hover:text-chalk"><ArrowLeft width={12} height={12} /> All merchants</Link>
      <Panel><PanelHead title="Seller record unavailable" hint="The merchant list is still available while this record is checked." />
        <p role="alert" className="text-[12.5px] leading-relaxed text-rose">{loadError || "The seller record could not be loaded."}</p>
        <Link href="/merchants" className="mt-4 inline-flex text-[12px] text-signal hover:underline">Return to Merchants</Link>
      </Panel>
    </div>;
  }
  const { merchant, summary, statuses, catalog, orders, commissionEarned } = detail;

  return (
    <div className="grid min-w-0 gap-5">
      <div>
        <Link
          href="/merchants"
          className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-chalk-dim transition-colors hover:text-chalk"
        >
          <ArrowLeft width={12} height={12} /> All merchants
        </Link>
      </div>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <span
            className="grid h-14 w-14 shrink-0 place-items-center rounded-[2px] font-display text-[20px] font-extrabold"
            style={{ background: merchant.brand?.accent ?? "#e4572e", color: merchant.brand?.accentInk ?? "#ffffff" }}
          >
            {merchant.name.slice(0, 1)}
          </span>
          <div>
            <Eyebrow>Merchant</Eyebrow>
            <h1 className="mt-1 font-display text-[23px] font-semibold text-chalk">{merchant.name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Pill tone={statusTone(merchant.status)}>
                {merchant.status === "active" ? <Store width={10} height={10} /> : <AlertTriangle width={10} height={10} />}
                {merchant.status}
              </Pill>
              <Pill tone={merchant.verified ? "mint" : "neutral"}>
                {merchant.verified ? "Verified" : "Not verified"}
              </Pill>
              <Pill tone={merchant.marketplaceEnabled ? "violet" : "neutral"}>
                {merchant.marketplaceEnabled ? "Marketplace on" : "Marketplace off"}
              </Pill>
              <span className="inline-flex items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-[0.14em] text-chalk-dim">
                <MapPin width={11} height={11} /> {merchant.location}
              </span>
            </div>
          </div>
        </div>
        <div className="text-right">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-chalk-dim">
            {merchant.customDomain ?? merchant.domain}
          </p>
          <p className="mt-1 inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-signal">
            {merchant.brand?.template ?? "FERIXAS"} template <ExternalLink width={10} height={10} />
          </p>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 xl:grid-cols-4">
        <Readout label="Gross merchandise value" value={money(summary.revenueTotal, { cents: false })} sub={`${money(summary.revenue30d, { cents: false })} in 30 days`} tone="mint" />
        <Readout
          label="Commission earned"
          value={money(commissionEarned, { cents: false })}
          sub={`at ${merchant.commissionPct}% · ${money(summary.commission30d, { cents: false })} in 30 days`}
          icon={<Percent width={15} height={15} />}
          tone="violet"
        />
        <Readout label="Orders" value={num(summary.ordersTotal)} sub={`Average ${money(summary.averageOrder, { cents: false })}`} />
        <Readout
          label="Catalogue"
          value={num(catalog.length)}
          sub={`${catalog.filter((p) => p.channels.marketplace).length} on the marketplace · ${compact(catalog.reduce((s, p) => s + p.sold30d, 0))} units sold`}
        />
      </div>

      <div className="grid gap-3 lg:grid-cols-[1.35fr_1fr]">
        {canManageAccount ? <MerchantForm detail={detail} /> : (
          <Panel><PanelHead title="Commercial settings" hint="View-only access" /><p className="text-[12px] leading-relaxed text-chalk-dim">You can inspect this seller record, but changing account or commercial settings requires merchant approval permission.</p></Panel>
        )}

        <div className="grid gap-3">
          <Panel>
            <PanelHead title="Order pipeline" />
            <Distribution
              rows={[
                { label: "Awaiting action", value: statuses.processing ?? 0, tone: "amber" },
                { label: "In transit", value: statuses.shipped ?? 0, tone: "signal" },
                { label: "Delivered", value: statuses.delivered ?? 0, tone: "mint" },
                { label: "Cancelled", value: statuses.cancelled ?? 0, tone: "rose" },
              ]}
            />
          </Panel>

          <Panel>
            <PanelHead title="Trading record" />
            <ul className="grid gap-2.5 text-[12.5px]">
              <KeyValue label="Trading since" value={dateLong(merchant.since)} />
              <KeyValue label="Plan" value={merchant.plan} />
              <KeyValue label="Response rate" value={merchant.responseRate == null ? "Not measured" : `${merchant.responseRate}%`} />
              <KeyValue label="Fulfilment rate" value={merchant.fulfilmentRate == null ? "Not measured" : `${merchant.fulfilmentRate}%`} />
              <KeyValue label="Rating" value={merchant.rating == null ? `No reviews yet · ${compact(merchant.reviewCount)} reviews` : `${merchant.rating.toFixed(1)} · ${compact(merchant.reviewCount)} reviews`} />
              <KeyValue label="Followers" value={compact(merchant.followers)} />
            </ul>
          </Panel>

        </div>
      </div>

      <Panel>
        <PanelHead
          title="Approved Ferixas marketplace profile"
          hint="Read-only here. The seller proposes profile changes; Admin reviews them in the Review queue."
          action={canManageAccount ? <Link href={`/review?tab=profiles&merchantId=${encodeURIComponent(merchant.id)}`} className="font-mono text-[10px] uppercase tracking-[0.12em] text-signal hover:underline">Review profile proposals</Link> : undefined}
        />
        <p className="mb-3 text-[11px] leading-relaxed text-chalk-dim">This is the seller profile displayed on Ferixas. The seller’s separate website is not embedded here; contact and address details below are for Admin review and are not public by default.</p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <KeyValue label="Profile name" value={detail.profile.name || merchant.name} />
          <KeyValue label="Tagline" value={detail.profile.tagline || "Not provided"} />
          <KeyValue label="Public location" value={detail.profile.location || "Not provided"} />
          <KeyValue label="Business name" value={detail.profile.businessName || "Not provided"} />
          <KeyValue label="Business email" value={detail.profile.businessEmail || "Not provided"} />
          <KeyValue label="Business phone" value={detail.profile.businessPhone || "Not provided"} />
          <KeyValue label="Private address" value={[detail.profile.addressLine1, detail.profile.addressLine2, detail.profile.city, detail.profile.region, detail.profile.postalCode, detail.profile.country].filter(Boolean).join(", ") || "Not provided"} />
          <KeyValue label="Website (verification only)" value={detail.profile.website || "Not provided"} />
          <KeyValue label="Public contact opt-in" value={`Email ${detail.profile.showBusinessEmail ? "on" : "off"} · phone ${detail.profile.showPhone ? "on" : "off"}`} />
        </div>
        {detail.profile.about ? <p className="mt-3 rounded-[8px] border border-hairline bg-panel-2 p-3 text-[12px] leading-relaxed text-chalk-dim">{detail.profile.about}</p> : null}
      </Panel>

      <Panel flush>
        <div className="p-5 pb-3">
          <PanelHead title="Ferixas seller catalogue" action={canManageAccount ? <Link href={`/review?tab=products&merchantId=${encodeURIComponent(merchant.id)}`} className="font-mono text-[10px] uppercase tracking-[0.12em] text-signal hover:underline">Review submissions</Link> : undefined} />
        </div>
        {catalog.length ? (
          <TablePanel>
            <DataTable
              head={["Product", "SKU", "Price", "Stock", "Sold 30d", "Marketplace", "Status", "Management"]}
              minWidthClass="md:min-w-[980px]"
            >
              {catalog.map((product) => (
                <Row key={product.id}>
                  <TdLead className="text-[13px] text-chalk">{product.title}</TdLead>
                  <Td className="font-mono text-[11.5px] text-chalk-dim">
                    <CellLabel>SKU</CellLabel>
                    {product.sku}
                  </Td>
                  <Td className="font-mono text-[12.5px] text-chalk">
                    <CellLabel>Price</CellLabel>
                    {money(product.price)}
                  </Td>
                  <Td className="font-mono text-[12.5px] tabular-nums text-chalk-dim">
                    <CellLabel>Stock</CellLabel>
                    {product.stock}
                  </Td>
                  <Td className="font-mono text-[12.5px] tabular-nums text-chalk-dim">
                    <CellLabel>Sold 30d</CellLabel>
                    {num(product.sold30d)}
                  </Td>
                  <Td>
                    <Pill tone={product.channels?.marketplace ? "violet" : "neutral"}>{product.channels?.marketplace ? "Visible" : "Hidden"}</Pill>
                  </Td>
                  <Td className="ml-auto md:ml-0">
                    <Pill tone={product.status === "approved" ? "mint" : product.status === "pending_review" ? "amber" : "neutral"}>
                      {product.status === "archived" && product.adminRemoved ? "Admin archived" : product.status}
                    </Pill>
                  </Td>
                  <Td className="ml-auto md:ml-0">{canManageProducts ? <SellerProductControls merchantId={merchant.id} product={product} /> : <span className="text-[11px] text-chalk-dim">View only</span>}</Td>
                </Row>
              ))}
            </DataTable>
          </TablePanel>
        ) : (
          <div className="px-5 pb-5">
            <Empty title="No products" body="This merchant has not listed anything yet." />
          </div>
        )}
      </Panel>

      <Panel flush>
        <div className="p-5 pb-3">
          <PanelHead title="Recent Ferixas marketplace orders" action={
            <Link href={`/orders?merchantId=${merchant.id}`} className="font-mono text-[10px] uppercase tracking-[0.14em] text-signal">
              Filter the order view
            </Link>
          } />
        </div>
        {orders.length ? (
          <TablePanel>
            <DataTable
              head={["Order", "Customer", "Placed", "Status", "Seller item subtotal", "Settled seller commission"]}
              minWidthClass="md:min-w-[700px]"
            >
              {orders.map((order) => (
                <Row key={order.id}>
                  <TdLead className="font-mono text-[12px] text-chalk">{order.number}</TdLead>
                  <Td className="text-[12.5px] text-chalk-dim">
                    <CellLabel>Customer</CellLabel>
                    {order.customer.name}
                  </Td>
                  <Td className="font-mono text-[11.5px] text-chalk-dim">
                    <CellLabel>Placed</CellLabel>
                    {relative(order.placedAt)}
                  </Td>
                  <Td>
                    <Pill
                      tone={
                        order.fulfillment === "delivered"
                          ? "mint"
                          : order.fulfillment === "shipped"
                            ? "signal"
                            : order.fulfillment === "cancelled"
                              ? "rose"
                              : "amber"
                      }
                    >
                      {titleCase(order.fulfillment)}
                    </Pill>
                  </Td>
                  <Td className="font-mono text-[12px] tabular-nums text-chalk">
                    <CellLabel>Seller item subtotal</CellLabel>
                    {money(order.sellerGross ?? 0)}
                  </Td>
                  <Td className="ml-auto font-mono text-[12px] tabular-nums text-violet md:ml-0">
                    <CellLabel>Settled seller commission</CellLabel>
                    {money(order.sellerCommission ?? 0)}
                  </Td>
                </Row>
              ))}
            </DataTable>
          </TablePanel>
        ) : (
          <div className="px-5 pb-5">
            <Empty title="No orders yet" body="This merchant has not sold anything yet." />
          </div>
        )}
      </Panel>

      {canManageAccount ? (
        <Panel>
          <PanelHead title="Account controls" hint="These actions apply immediately. Suspending blocks sign-in; marketplace restriction hides the seller’s Ferixas listings without changing their separate website." />
          <div className="mt-4 flex flex-wrap items-center gap-2.5">
            <CmsActionForm action={suspendMerchantAction} className="inline-flex">
              <input type="hidden" name="id" value={merchant.id} />
              <input type="hidden" name="suspend" value={merchant.status === "suspended" ? "false" : "true"} />
              <SubmitButton variant="outline" pendingLabel="Saving">{merchant.status === "suspended" ? "Reactivate seller account" : "Suspend seller account"}</SubmitButton>
            </CmsActionForm>
            <CmsActionForm action={restrictMerchantAction} className="inline-flex">
              <input type="hidden" name="id" value={merchant.id} />
              <input type="hidden" name="restricted" value={merchant.marketplaceEnabled ? "true" : "false"} />
              <SubmitButton variant="outline" pendingLabel="Saving">{merchant.marketplaceEnabled ? "Hide all seller listings on Ferixas" : "Restore marketplace access"}</SubmitButton>
            </CmsActionForm>
          </div>

          {canDelete ? (
            <CmsActionForm action={deleteMerchantAction} className="mt-4 grid gap-3 border-t border-hairline pt-4">
              <input type="hidden" name="id" value={merchant.id} />
              <p className="text-[12px] leading-relaxed text-chalk-dim">Permanent account removal also removes its catalogue and sign-ins. The API refuses deletion while orders exist; suspend the seller to preserve trading history instead.</p>
              <Field title="Type DELETE to confirm permanent removal"><input name="confirm" required pattern="DELETE" autoComplete="off" className={inputClass} /></Field>
              <SubmitButton variant="danger" pendingLabel="Deleting"><Trash2 width={13} height={13} /> Delete this seller</SubmitButton>
            </CmsActionForm>
          ) : null}
        </Panel>
      ) : (
        <Panel><PanelHead title="Account controls" hint="View-only access" /><p className="text-[12px] leading-relaxed text-chalk-dim">Suspension and marketplace access changes require merchant approval permission. Your access remains read-only.</p></Panel>
      )}
    </div>
  );
}

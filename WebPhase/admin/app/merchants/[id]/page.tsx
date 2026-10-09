import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, AlertTriangle, ExternalLink, MapPin, Percent, Store } from "lucide-react";
import { requireAdmin } from "@/lib/data";
import { getMerchant, listReviewQueue, ApiError } from "@/lib/api";
import { MerchantForm } from "@/components/ops/merchant-form";
import { Empty, Eyebrow, Panel, PanelHead, Pill, Readout } from "@/components/ops/bits";
import { CmsActionForm } from "@/components/ops/cms-action-form";
import { SubmitButton } from "@/components/ops/controls";
import { Trash2 } from "lucide-react";
import { deleteMerchantAction, editMerchantAction, restrictMerchantAction, suspendMerchantAction } from "@/lib/actions";
import { Distribution, KeyValue } from "@/components/ops/marks";
import { CellLabel, DataTable, Row, Td, TdLead, TablePanel } from "@/components/ops/table";
import { compact, dateLong, money, num, relative, titleCase } from "@/lib/format";

function statusTone(status: string) {
  if (status === "active") return "mint" as const;
  if (status === "review") return "amber" as const;
  return "rose" as const;
}

export default async function MerchantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { session, admin } = await requireAdmin();
  // The endpoint removes a seller only for an owner, so the control is offered only to an
  // owner. The gate is the server's; this keeps the screen from promising a refusal.
  const canDelete = (admin.permissions ?? []).includes("*");
  let detail;
  try {
    detail = await getMerchant(session, id);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }
  const { merchant, about, summary, statuses, catalog, orders, commissionEarned } = detail;
  // Only this seller's submissions, from the queue the platform has.
  const queue = await listReviewQueue(session).catch(() => ({ items: [], counts: {} }));
  const waiting = queue.items.filter((item) => item.merchantId === merchant.id);

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
            style={{ background: merchant.brand.accent, color: merchant.brand.accentInk }}
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
            {merchant.brand.template} template <ExternalLink width={10} height={10} />
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
        <MerchantForm detail={detail} />

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
              <KeyValue label="Response rate" value={`${merchant.responseRate}%`} />
              <KeyValue label="Fulfilment rate" value={`${merchant.fulfilmentRate}%`} />
              <KeyValue label="Rating" value={`${merchant.rating.toFixed(1)} · ${compact(merchant.reviewCount)} reviews`} />
              <KeyValue label="Followers" value={compact(merchant.followers)} />
            </ul>
          </Panel>

          <Panel>
            <PanelHead title="About the store" />
            <p className="text-[12.5px] leading-relaxed text-chalk-dim">{about}</p>
          </Panel>
        </div>
      </div>

      <Panel flush>
        <div className="p-5 pb-3">
          <PanelHead title="Catalogue" />
        </div>
        {catalog.length ? (
          <TablePanel>
            <DataTable
              head={["Product", "SKU", "Price", "Stock", "Sold 30d", "Channels", "Status"]}
              minWidthClass="md:min-w-[760px]"
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
                  <Td className="w-full md:w-auto">
                    <div className="flex flex-wrap gap-1.5">
                      {product.channels.store ? <Pill tone="signal">Store</Pill> : null}
                      {product.channels.marketplace ? <Pill tone="violet">Market</Pill> : null}
                    </div>
                  </Td>
                  <Td className="ml-auto md:ml-0">
                    <Pill tone={product.status === "active" ? "mint" : product.status === "draft" ? "amber" : "neutral"}>
                      {product.status}
                    </Pill>
                  </Td>
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
          <PanelHead title="Recent orders" action={
            <Link href={`/orders?merchantId=${merchant.id}`} className="font-mono text-[10px] uppercase tracking-[0.14em] text-signal">
              Filter the order view
            </Link>
          } />
        </div>
        {orders.length ? (
          <TablePanel>
            <DataTable
              head={["Order", "Customer", "Channel", "Placed", "Status", "Commission", "Total"]}
              minWidthClass="md:min-w-[700px]"
            >
              {orders.map((order) => (
                <Row key={order.id}>
                  <TdLead className="font-mono text-[12px] text-chalk">{order.number}</TdLead>
                  <Td className="text-[12.5px] text-chalk-dim">
                    <CellLabel>Customer</CellLabel>
                    {order.customer.name}
                  </Td>
                  <Td>
                    <Pill tone={order.channel === "marketplace" ? "violet" : "neutral"}>{order.channel}</Pill>
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
                  <Td className="font-mono text-[12px] tabular-nums text-violet">
                    <CellLabel>Commission</CellLabel>
                    {money(order.commission)}
                  </Td>
                  <Td className="ml-auto font-mono text-[12.5px] tabular-nums text-chalk md:ml-0">
                    <CellLabel>Total</CellLabel>
                    {money(order.total)}
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

      <Panel>
        <PanelHead
          title="Waiting on the platform"
          hint="What this seller has submitted, and what each one is waiting for."
          action={<Pill tone={waiting.length ? "amber" : "mint"}>{waiting.length} waiting</Pill>}
        />
        {waiting.length ? (
          <div className="grid gap-2.5">
            {waiting.map((item) => (
              <div key={item.id} className="rounded-[12px] border border-hairline px-3.5 py-3">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-semibold text-chalk">{item.title}</span>
                    <span className="mt-0.5 block truncate font-mono text-[10px] uppercase tracking-[0.12em] text-chalk-dim">
                      {money(item.price)} · stock {item.stock} · by {item.submittedBy || "the store"}
                    </span>
                  </span>
                  <Pill tone={item.reviewStatus === "in_review" ? "amber" : "neutral"}>{item.reviewStatus}</Pill>
                </div>
                {item.reviewNote ? (
                  <p className="mt-2 text-[12px] leading-relaxed text-chalk-dim">{item.reviewNote}</p>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <Empty title="Nothing waiting" body="This seller has no products in review." />
        )}
      </Panel>

      <Panel>
        <PanelHead
          title="Edit this seller"
          hint="Name, where they are, what they pay the platform, and whether they sell on the marketplace. Only what you type is changed."
        />
        <CmsActionForm action={editMerchantAction} className="mt-4 grid gap-3">
          <input type="hidden" name="id" value={merchant.id} />
          <div className="grid gap-3 md:grid-cols-2">
            <Field title="Store name">
              <input name="name" defaultValue={merchant.name} className={inputClass} />
            </Field>
            <Field title="Where they are">
              <input name="location" defaultValue={merchant.location} className={inputClass} />
            </Field>
          </div>
          <Field title="Tagline">
            <input name="tagline" defaultValue={merchant.tagline} className={inputClass} />
          </Field>
          <Field title="About the store">
            <input name="about" defaultValue={about} className={inputClass} />
          </Field>
          <div className="grid gap-3 md:grid-cols-3">
            <Field title="Commission %">
              <input name="commissionPct" type="number" min={0} max={40} step="0.5" defaultValue={merchant.commissionPct} className={inputClass} />
            </Field>
            <Field title="Plan">
              <input name="plan" defaultValue={merchant.plan} className={inputClass} />
            </Field>
            <label className="flex items-center gap-2 pt-6 text-[12.5px] text-chalk">
              <input type="checkbox" name="marketplaceEnabled" defaultChecked={(merchant as { marketplaceEnabled?: boolean }).marketplaceEnabled !== false} className="size-4 accent-signal" />
              Sells on the marketplace
            </label>
          </div>
          <div>
            <SubmitButton pendingLabel="Saving">Save the details</SubmitButton>
          </div>
        </CmsActionForm>
      </Panel>

      <Panel>
        <PanelHead
          title="Account controls"
          hint="Suspending stops them signing in and selling. Restricting takes them out of the marketplace. Neither deletes anything."
        />
        <div className="mt-4 flex flex-wrap items-center gap-2.5">
          <CmsActionForm action={suspendMerchantAction} className="inline-flex">
            <input type="hidden" name="id" value={merchant.id} />
            <input type="hidden" name="suspend" value={merchant.status === "suspended" ? "false" : "true"} />
            <SubmitButton variant="outline" pendingLabel="Saving">
              {merchant.status === "suspended" ? "Reactivate this seller" : "Suspend this seller"}
            </SubmitButton>
          </CmsActionForm>

          <CmsActionForm action={restrictMerchantAction} className="inline-flex">
            <input type="hidden" name="id" value={merchant.id} />
            <input type="hidden" name="restricted" value={merchant.marketplaceEnabled ? "true" : "false"} />
            <SubmitButton variant="outline" pendingLabel="Saving">
              {merchant.marketplaceEnabled ? "Take out of the marketplace" : "Put back in the marketplace"}
            </SubmitButton>
          </CmsActionForm>

          {canDelete ? (
            <CmsActionForm action={deleteMerchantAction} className="grid w-full gap-2 border-t border-hairline pt-3">
              <input type="hidden" name="id" value={merchant.id} />
              <p className="text-[12px] leading-relaxed text-chalk-dim">
                {"Deleting removes the account, its products and its sign-ins. A seller with orders cannot be deleted — suspend them instead, which stops them trading and keeps the history."}
              </p>
              <SubmitButton variant="danger" pendingLabel="Deleting">
                <Trash2 width={13} height={13} /> Delete this seller
              </SubmitButton>
            </CmsActionForm>
          ) : null}
        </div>
      </Panel>
    </div>
  );
}
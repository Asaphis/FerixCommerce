import Link from "next/link";
import { ArrowLeft, Check, RotateCcw, X } from "lucide-react";
import { requireAdmin } from "@/lib/data";
import { assetUrl, listReviewQueue } from "@/lib/api";
import { CmsActionForm } from "@/components/ops/cms-action-form";
import { Empty, Panel, PanelHead, Pill } from "@/components/ops/bits";
import { PageHeader, inputClass } from "@/components/ops/table";
import { Field, SubmitButton } from "@/components/ops/controls";
import { approveProductAction, rejectProductAction, requestChangesAction } from "@/lib/actions";
import { money } from "@/lib/format";

/**
 * The review queue.
 *
 * What sellers have submitted, oldest first, and the three things an operator can do about
 * each one. Approving is what puts a listing on sale - until then it is in no shop, on no
 * seller's page and in nobody's counts - so this screen is the gate, and it is the only one.
 */
export default async function ReviewPage() {
  const { session } = await requireAdmin();
  const queue = await listReviewQueue(session).catch(() => ({ items: [], counts: {} }));
  const waiting = queue.items;

  return (
    <div className="grid min-w-0 gap-5">
      <PageHeader
        back={
          <Link href="/catalog" className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-chalk-dim transition-colors hover:text-chalk">
            <ArrowLeft width={13} height={13} /> Catalogue
          </Link>
        }
        eyebrow="Marketplace"
        title="Waiting for review"
        description="What sellers have submitted. Nothing reaches a customer until it is approved here."
        action={<Pill tone={waiting.length ? "amber" : "mint"}>{waiting.length} waiting</Pill>}
      />

      {waiting.length ? (
        <div className="grid gap-4">
          {waiting.map((item) => (
            <Panel key={item.id}>
              <PanelHead
                title={item.title || "Untitled listing"}
                hint={`${item.merchantName} · ${money(item.price)} · stock ${item.stock}`}
                action={
                  <Pill tone={String(item.reviewStatus) === "changes_requested" ? "amber" : "violet"}>
                    {String(item.reviewStatus).replace(/_/g, " ")}
                  </Pill>
                }
              />
              <div className="grid gap-3 sm:grid-cols-[112px_minmax(0,1fr)]">
                {item.images?.length ? (
                  <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-1">
                    {item.images.slice(0, 2).map((image, index) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={`${image}-${index}`} src={assetUrl(image)} alt={`${item.title} ${index + 1}`} className="aspect-square w-full rounded-[9px] border border-hairline bg-panel-2 object-cover" />
                    ))}
                  </div>
                ) : null}
                <div className="min-w-0 rounded-[10px] border border-hairline bg-panel-2 p-3 text-[12px]">
                  <p className="whitespace-pre-wrap leading-relaxed text-chalk">{item.description || "No product description supplied."}</p>
                  {item.bullets?.length ? <div className="mt-3"><p className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-chalk-dim">Highlights</p><ul className="mt-1 grid gap-1 text-chalk">{item.bullets.map((bullet, index) => <li key={`${bullet}-${index}`}>• {bullet}</li>)}</ul></div> : null}
                  {item.variants?.length ? <p className="mt-3 text-chalk"><span className="text-chalk-dim">Options:</span> {item.variants.map((variant) => `${variant.name}: ${variant.values.join(", ")}`).join(" · ")}</p> : null}
                  {item.tags?.length ? <p className="mt-2 text-chalk"><span className="text-chalk-dim">Tags:</span> {item.tags.join(", ")}</p> : null}
                  {item.collections?.length ? <p className="mt-2 text-chalk"><span className="text-chalk-dim">Collections:</span> {item.collections.join(", ")}</p> : null}
                </div>
              </div>
              {item.reviewNote ? (
                <p className="rounded-[10px] border border-hairline bg-panel-2 px-3.5 py-2.5 text-[12.5px] leading-relaxed text-chalk-dim">
                  <span className="text-chalk">Your last note:</span> {item.reviewNote}
                </p>
              ) : null}
              <div className="mt-3 grid gap-2 rounded-[10px] border border-hairline bg-panel-2 p-3 text-[12px] sm:grid-cols-2">
                <p><span className="text-chalk-dim">Category:</span> {item.category || "Unassigned"} · <span className="text-chalk-dim">Brand:</span> {item.brandName || "Unassigned"}</p>
                <p><span className="text-chalk-dim">Shipping:</span> {item.shipping_amount == null ? "Not supplied" : money(item.shipping_amount)} · {item.estimated_delivery_days ? `${item.estimated_delivery_days} day estimate` : "no ETA"}</p>
                <p><span className="text-chalk-dim">Package:</span> {[item.package_weight ? `${item.package_weight} kg` : "", item.package_dimensions, item.shipping_origin].filter(Boolean).join(" · ") || "Not supplied"}</p>
                <p><span className="text-chalk-dim">Submitted:</span> {item.submittedAt || "—"} by {item.submittedBy || "seller"}</p>
                <p className="sm:col-span-2"><span className="text-chalk-dim">Requested CMS sections:</span> {item.section_tags?.length ? item.section_tags.join(", ") : "No section request"}</p>
              </div>

              <CmsActionForm action={approveProductAction} className="mt-3 flex flex-wrap items-end gap-3">
                <input type="hidden" name="id" value={item.id} />
                <SubmitButton pendingLabel="Approving">
                  <Check width={14} height={14} /> Approve
                </SubmitButton>
              </CmsActionForm>

              <div className="mt-4 grid gap-3 border-t border-hairline pt-4 sm:grid-cols-2">
                <CmsActionForm action={requestChangesAction} className="grid gap-2.5">
                  <input type="hidden" name="id" value={item.id} />
                  <Field title="Send it back">
                    <input name="note" className={inputClass} placeholder="The main photo is the wrong size" />
                  </Field>
                  <div>
                    <SubmitButton variant="outline" pendingLabel="Sending">
                      <RotateCcw width={13} height={13} /> Ask for changes
                    </SubmitButton>
                  </div>
                </CmsActionForm>

                <CmsActionForm action={rejectProductAction} className="grid gap-2.5">
                  <input type="hidden" name="id" value={item.id} />
                  <Field title="Reject it">
                    <input name="note" className={inputClass} placeholder="Not something the platform sells" />
                  </Field>
                  <div>
                    <SubmitButton variant="danger" pendingLabel="Rejecting">
                      <X width={13} height={13} /> Reject
                    </SubmitButton>
                  </div>
                </CmsActionForm>
              </div>
            </Panel>
          ))}
        </div>
      ) : (
        <Empty
          title="Nothing waiting"
          body="When a seller submits a product it arrives here, oldest first, and stays out of every shop until it is approved."
        />
      )}
    </div>
  );
}

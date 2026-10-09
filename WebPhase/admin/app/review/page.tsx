import Link from "next/link";
import { ArrowLeft, Check, RotateCcw, X } from "lucide-react";
import { requireAdmin } from "@/lib/data";
import { listReviewQueue } from "@/lib/api";
import { CmsActionForm } from "@/components/ops/cms-action-form";
import { Empty, Panel, PanelHead, Pill } from "@/components/ops/bits";
import { PageHeader, inputClass, selectClass } from "@/components/ops/table";
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
              {item.reviewNote ? (
                <p className="rounded-[10px] border border-hairline bg-panel-2 px-3.5 py-2.5 text-[12.5px] leading-relaxed text-chalk-dim">
                  <span className="text-chalk">Your last note:</span> {item.reviewNote}
                </p>
              ) : null}

              <CmsActionForm action={approveProductAction} className="mt-3 flex flex-wrap items-end gap-3">
                <input type="hidden" name="id" value={item.id} />
                <Field title="Put it where">
                  <select name="placement" defaultValue="" className={selectClass}>
                    <option value="">The seller&rsquo;s own shop only</option>
                    <option value="homepage">Also the homepage</option>
                    <option value="deals">Today&rsquo;s deals</option>
                    <option value="brand">Its brand row</option>
                    <option value="store">Its store page</option>
                  </select>
                </Field>
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

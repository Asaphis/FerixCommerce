import { Archive, Check, Eye, EyeOff, RotateCcw, Sparkles } from "lucide-react";
import type { MerchantDetail } from "@/lib/api";
import { removeSellerProductAction, restoreSellerProductAction, updateSellerProductAction } from "@/lib/actions";
import { CmsActionForm } from "@/components/ops/cms-action-form";
import { Field, SubmitButton } from "@/components/ops/controls";
import { Pill } from "@/components/ops/bits";
import { inputClass, textareaClass } from "@/components/ops/table";

type SellerProduct = MerchantDetail["catalog"][number];

export function SellerProductControls({ merchantId, product }: { merchantId: string; product: SellerProduct }) {
  const marketplace = product.channels?.marketplace === true;
  const editable = product.status === "approved";
  const removedByAdmin = product.adminRemoved === true;

  return (
    <details className="min-w-[180px]">
      <summary className="cursor-pointer select-none rounded-[2px] border border-hairline px-3 py-2 text-[11px] font-medium text-chalk hover:border-chalk-dim">
        Manage listing
      </summary>
      <div className="mt-2 grid min-w-[280px] gap-3 rounded-[10px] border border-hairline bg-panel-2 p-3 sm:min-w-[390px]">
        {editable ? (
          <CmsActionForm action={updateSellerProductAction} className="grid gap-3">
            <input type="hidden" name="merchantId" value={merchantId} />
            <input type="hidden" name="productId" value={product.id} />
            <div className="grid gap-3 sm:grid-cols-2">
              <Field title="Title">
                <input name="title" required minLength={2} maxLength={180} defaultValue={product.title} className={inputClass} />
              </Field>
              <Field title="Category slug">
                <input name="category" required defaultValue={product.category} className={inputClass} />
              </Field>
              <Field title="SKU (admin only)">
                <input name="sku" defaultValue={product.sku} className={inputClass} />
              </Field>
              <Field title="Price">
                <input name="price" type="number" min="0" step="0.01" required defaultValue={product.price} className={inputClass} />
              </Field>
              <Field title="Compare-at price">
                <input name="compareAt" type="number" min="0" step="0.01" defaultValue={product.compareAt ?? ""} className={inputClass} />
              </Field>
              <Field title="Stock on hand">
                <input name="stock" type="number" min="0" step="1" required defaultValue={product.stock} className={inputClass} />
              </Field>
            </div>
            <Field title="Description">
              <textarea name="description" maxLength={5000} defaultValue={product.description} className={textareaClass} />
            </Field>
            <Field title="Image URLs — one per line">
              <textarea name="images" defaultValue={(product.images ?? []).join("\n")} className={textareaClass} />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field title="Collections — comma separated">
                <input name="collections" defaultValue={(product.collections ?? []).join(", ")} className={inputClass} />
              </Field>
              <Field title="Tags — comma separated">
                <input name="tags" defaultValue={(product.tags ?? []).join(", ")} className={inputClass} />
              </Field>
            </div>
            <div className="grid gap-2 border-t border-hairline pt-3">
              <label className="flex items-start gap-2 text-[11.5px] text-chalk">
                <input type="checkbox" name="marketplace" defaultChecked={marketplace} className="mt-0.5 size-4 accent-signal" />
                <span><span className="block font-medium">Visible on Ferixas marketplace</span><span className="text-chalk-dim">Untick to hide this listing without changing the seller’s account.</span></span>
              </label>
              <label className="flex items-start gap-2 text-[11.5px] text-chalk">
                <input type="checkbox" name="featured" defaultChecked={product.featured} className="mt-0.5 size-4 accent-signal" />
                <span><span className="block font-medium">Feature on marketplace homepage</span><span className="text-chalk-dim">Featured products are prioritized in the homepage Featured rail.</span></span>
              </label>
            </div>
            <SubmitButton pendingLabel="Saving"><Check width={13} height={13} /> Save listing</SubmitButton>
          </CmsActionForm>
        ) : product.status === "archived" && removedByAdmin ? (
          <div className="grid gap-2">
            <p className="text-[11.5px] leading-relaxed text-chalk-dim">This listing was removed by Admin. Historical orders, reviews, and placements are retained.</p>
            <CmsActionForm action={restoreSellerProductAction} className="grid gap-2">
              <input type="hidden" name="merchantId" value={merchantId} />
              <input type="hidden" name="productId" value={product.id} />
              <SubmitButton variant="outline" pendingLabel="Restoring"><RotateCcw width={13} height={13} /> Restore previous state</SubmitButton>
            </CmsActionForm>
          </div>
        ) : (
          <p className="text-[11.5px] leading-relaxed text-chalk-dim">
            {product.status === "pending_review" || product.status === "draft"
              ? "This submission is not approved. Review its submitted snapshot in the Review queue; edits here could bypass seller review."
              : "This product is not an editable approved listing."}
          </p>
        )}

        {product.status !== "archived" ? (
          <div className="border-t border-hairline pt-3">
            <div className="mb-2 flex items-center gap-2">
              <Pill tone={marketplace ? "violet" : "neutral"}>{marketplace ? "Marketplace visible" : "Hidden"}</Pill>
              <span className="text-[10.5px] text-chalk-dim">Removing preserves order/review history when present.</span>
            </div>
            <CmsActionForm action={removeSellerProductAction} className="grid gap-2">
              <input type="hidden" name="merchantId" value={merchantId} />
              <input type="hidden" name="productId" value={product.id} />
              <Field title="Type REMOVE to confirm">
                <input name="confirm" required pattern="REMOVE" autoComplete="off" className={inputClass} />
              </Field>
              <SubmitButton variant="danger" pendingLabel="Removing">
                {product.status === "approved" && marketplace ? <EyeOff width={13} height={13} /> : <Archive width={13} height={13} />}
                Remove listing
              </SubmitButton>
            </CmsActionForm>
          </div>
        ) : null}
        {product.featured && product.status === "approved" && marketplace ? <p className="flex items-center gap-1 text-[10.5px] text-signal"><Sparkles width={12} height={12} /> Featured in the homepage rail</p> : null}
        {!marketplace && product.status === "approved" ? <p className="flex items-center gap-1 text-[10.5px] text-chalk-dim"><Eye width={12} height={12} /> Hidden from marketplace shoppers</p> : null}
      </div>
    </details>
  );
}

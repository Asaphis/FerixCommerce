"use client";

import { useActionState } from "react";
import { Package, Truck } from "lucide-react";
import { SubmitButton } from "@/components/studio/controls";
import { Notice, inputClass } from "@/components/studio/forms";
import { setOrderStatusAction, type FormState } from "@/lib/actions";

export function OrderStatusForms({ orderId, carrier, tracking, carriers }: { orderId: string; carrier: string | null; tracking: string | null; carriers: string[] }) {
  const [state, action] = useActionState<FormState, FormData>(setOrderStatusAction, {});
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap gap-2">
        {[
          { to: "processing", label: "Processing" },
          { to: "shipped", label: "Shipped" },
          { to: "delivered", label: "Delivered" },
          { to: "cancelled", label: "Cancelled" },
        ].map((option) => (
          <form key={option.to} action={action} className="flex flex-wrap items-end gap-2">
            <input type="hidden" name="id" value={orderId} />
            <input type="hidden" name="fulfillment" value={option.to} />
            {option.to === "shipped" ? (
              <>
                <label className="block"><span className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-chalk-dim">Carrier</span><select name="carrier" defaultValue={carrier ?? carriers[0]} className="mt-1.5 h-9 rounded-[5px] border border-hairline bg-panel-2 px-2 text-[12.5px] text-chalk outline-none focus:border-ember">{carriers.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
                <label className="block"><span className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-chalk-dim">Tracking</span><input name="tracking" defaultValue={tracking ?? ""} placeholder="Auto if blank" className={`${inputClass} mt-1.5 h-9 w-full sm:w-[150px]`} /></label>
              </>
            ) : null}
            <SubmitButton variant={option.to === "cancelled" ? "danger" : "outline"} pendingLabel="Saving" className="py-2"><Truck width={12} height={12} /> {option.label}</SubmitButton>
          </form>
        ))}
      </div>
      <Notice state={state} />
    </div>
  );
}

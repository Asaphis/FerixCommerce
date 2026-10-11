import { Sparkles } from "lucide-react";
import { requireMerchant } from "@/lib/data";
import { Eyebrow, Panel, Pill } from "@/components/studio/bits";

export default async function StoreDesignPage() {
  await requireMerchant();

  return (
    <div className="grid gap-5">
      <header>
        <h1 className="mt-1.5 font-display text-[23px] font-semibold text-chalk">Studio</h1>
      </header>
      <Panel className="border-lime/25">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-[60ch]">
            <Pill tone="neutral">Not available yet</Pill>
            <h2 className="mt-3 font-display text-[18px] font-semibold text-chalk">Seller website builder</h2>
          </div>
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-[2px] border border-lime/30 bg-lime/10 text-lime" aria-hidden="true">
            <Sparkles width={18} height={18} />
          </span>
        </div>
      </Panel>
    </div>
  );
}

import type { ReactNode } from "react";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { OpsMark, Operator } from "@/components/ops/marks";
import { MobileBottomNav, OpsNav } from "@/components/ops/nav";
import { currentAdmin } from "@/lib/data";

export async function OpsShell({ children }: { children: ReactNode }) {
  const admin = await currentAdmin();

  if (!admin) {
    return <div className="min-h-screen bg-void">{children}</div>;
  }

  return (
    <div className="min-h-screen bg-void lg:flex">
      <aside className="border-b border-hairline bg-panel lg:fixed lg:inset-y-0 lg:w-[230px] lg:border-b-0 lg:border-r">
        <div className="flex items-center gap-2.5 px-4 py-4">
          <OpsMark />
          <div className="min-w-0">
            <p className="font-display text-[13px] font-extrabold tracking-[0.14em] text-chalk">FERIXAS</p>
            <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-signal">Platform console</p>
          </div>
        </div>

        <Operator email={admin.email} platformName={admin.platformName} />
        <OpsNav />

        <div className="hidden px-4 pb-5 lg:block">
          <p className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-chalk-dim">
            <ShieldCheck width={11} height={11} className="text-signal" /> Operator access
          </p>
          <p className="mt-2 font-mono text-[9px] leading-relaxed text-chalk-dim/70">
            Changes here take effect immediately for shoppers and merchants on both the storefront and
            the marketplace.
          </p>
          <Link
            href="/settings"
            className="mt-3 inline-block font-mono text-[9.5px] uppercase tracking-[0.14em] text-signal hover:underline"
          >
            Platform settings
          </Link>
        </div>
      </aside>

      <main className="min-w-0 flex-1 lg:ml-[230px]">
        <div className="mx-auto max-w-[1200px] px-4 py-6">{children}</div>
      </main>
      <MobileBottomNav />
    </div>
  );
}

import type { ReactNode } from "react";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { OpsMark, Operator } from "@/components/ops/marks";
import { OpsBottomNav, OpsRail, OpsSidebar } from "@/components/ops/nav";
import { NAV_GROUPS } from "@/components/ops/nav-data";
import { currentAdmin } from "@/lib/data";

/** Every destination, flattened from the shared definition for other screens. */
export const OPS_LINKS = NAV_GROUPS.flatMap((group) => group.items);

export async function OpsShell({ children }: { children: ReactNode }) {
  const admin = await currentAdmin();

  if (!admin) {
    return <div className="min-h-screen bg-[var(--canvas)]">{children}</div>;
  }

  return (
    <div className="min-h-screen bg-[var(--canvas)] md:flex">
      <aside className="hidden md:fixed md:inset-y-0 md:flex md:w-[64px] md:flex-col md:border-r md:border-[#303941] md:bg-[#202a31] xl:w-[230px]">
        <div className="flex items-center gap-2.5 px-2 py-4 xl:px-4">
          <OpsMark />
          <div className="hidden min-w-0 xl:block">
            <p className="font-display text-[13px] font-extrabold tracking-[0.14em] text-chalk">FERIXAS</p>
            <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-signal">Platform console</p>
          </div>
        </div>

        <div className="hidden xl:block">
          <Operator email={admin.email} platformName={admin.platformName} />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="xl:hidden">
            <OpsRail />
          </div>
          <div className="hidden xl:block">
            <OpsSidebar />
          </div>
        </div>

        <div className="hidden px-4 pb-5 xl:block">
          <p className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-chalk-dim">
            <ShieldCheck width={11} height={11} className="text-signal" /> Operator access
          </p>
          <p className="mt-2 font-mono text-[9px] leading-relaxed text-chalk-dim/70">
            Changes here take effect immediately for shoppers and merchants on both the storefront and
            the marketplace.
          </p>
          <Link
            href="/settings"
            className="mt-3 inline-block min-h-[44px] py-2 font-mono text-[9.5px] uppercase tracking-[0.14em] text-signal hover:underline"
          >
            Platform settings
          </Link>
        </div>
      </aside>

      <main className="min-w-0 flex-1 md:pl-[64px] xl:pl-[230px]">
        <div className="mx-auto w-full max-w-[1280px] px-4 pb-28 pt-5 sm:px-6 md:pb-8 lg:px-8">{children}</div>
      </main>
      <OpsBottomNav />
    </div>
  );
}

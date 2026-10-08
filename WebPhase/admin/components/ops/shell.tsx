import type { ReactNode } from "react";
import Link from "next/link";
import { Settings2, ShieldCheck } from "lucide-react";
import { OpsMark, Operator } from "@/components/ops/marks";
import { OpsBottomNav, OpsRail, OpsSidebar } from "@/components/ops/nav";
import { NAV_GROUPS } from "@/components/ops/nav-data";
import { currentAdmin } from "@/lib/data";

/** Every destination, flattened from the shared definition for other screens. */
export const OPS_LINKS = NAV_GROUPS.flatMap((group) => group.items);

export async function OpsShell({ children }: { children: ReactNode }) {
  const admin = await currentAdmin();
  if (!admin) return <div className="min-h-screen bg-[var(--canvas)]">{children}</div>;

  return (
    <div className="min-h-screen bg-[var(--canvas)] md:flex">
      <aside className="hidden md:fixed md:inset-y-0 md:z-40 md:flex md:w-[64px] md:flex-col md:border-r md:border-white/10 md:bg-[#102d43] xl:w-[244px]">
        <div className="flex items-center gap-2.5 px-2 py-4 xl:px-4">
          <OpsMark />
          <div className="hidden min-w-0 xl:block">
            <p className="font-display text-[13px] font-extrabold tracking-[0.12em] text-white">FERIXAS</p>
            <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#f05a28]">Admin console</p>
          </div>
        </div>
        <div className="hidden xl:block"><Operator email={admin.email} platformName={admin.platformName} /></div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="xl:hidden"><OpsRail /></div>
          <div className="hidden xl:block"><OpsSidebar /></div>
        </div>
        <div className="hidden px-4 pb-5 xl:block">
          <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-white/70"><ShieldCheck width={13} height={13} className="text-[#f05a28]" /> Operator access</p>
          <Link href="/settings" className="mt-3 inline-flex min-h-[40px] items-center gap-2 text-[11px] font-semibold text-white/65 transition-colors hover:text-white"><Settings2 width={14} height={14} /> Platform settings</Link>
        </div>
      </aside>

      <div className="min-w-0 flex-1 md:pl-[64px] xl:pl-[244px]">
        <header className="sticky top-0 z-30 flex min-h-[60px] items-center justify-between gap-3 border-b border-line bg-white/95 px-4 shadow-[0_2px_10px_rgba(16,45,67,0.05)] backdrop-blur sm:px-6">
          <Link href="/" className="flex shrink-0 items-center gap-2" aria-label="Ferixas admin overview">
            <OpsMark className="h-7 w-7" />
            <span className="leading-tight"><span className="block font-display text-[12px] font-extrabold tracking-[0.1em] text-ink">FERIXAS</span><span className="block text-[10px] text-ink-soft">Admin console</span></span>
          </Link>
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <span className="hidden items-center gap-1.5 border-l border-line pl-3 text-[11px] font-medium text-ink-soft sm:flex"><ShieldCheck width={14} height={14} className="text-ember" /> Platform operator</span>
            <Link href="/settings" aria-label="Platform settings" className="grid h-9 w-9 place-items-center rounded-[2px] rounded-tr-[9px] border border-line text-ink-soft transition-colors hover:border-ember hover:text-ember"><Settings2 width={16} height={16} /></Link>
          </div>
        </header>
        <main className="min-w-0">
          <div className="mx-auto w-full max-w-[1460px] px-4 pb-28 pt-5 sm:px-6 md:pb-8 lg:px-8">{children}</div>
        </main>
      </div>
      <OpsBottomNav />
    </div>
  );
}

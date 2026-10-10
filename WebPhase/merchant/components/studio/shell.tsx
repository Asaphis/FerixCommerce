import Link from "next/link";
import type { ReactNode } from "react";
import { Store, Plus } from "lucide-react";
import { FerixasMark } from "@/components/studio/marks";
import { StudioBottomNav, StudioRail, StudioSidebar } from "@/components/studio/nav";
import { NAV_GROUPS } from "@/components/studio/nav-data";
import { currentMerchant } from "@/lib/data";

/** Every destination, flattened from the shared definition for other screens. */
export const STUDIO_LINKS = NAV_GROUPS.flatMap((group) => group.items);

export async function StudioShell({ children }: { children: ReactNode }) {
  const merchant = await currentMerchant();

  if (!merchant) return <div className="merchant-app min-h-screen bg-bone">{children}</div>;

  return (
    <div className="merchant-app min-h-screen bg-bone md:flex">
      <aside className="hidden md:fixed md:inset-y-0 md:z-40 md:flex md:w-[64px] md:flex-col md:border-r md:border-white/10 md:bg-[#102d43] xl:w-[244px]">
        <div className="flex items-center gap-2.5 px-2 py-4 xl:px-4">
          <FerixasMark />
          <div className="hidden min-w-0 xl:block">
            <p className="font-display text-[13px] font-extrabold tracking-[0.12em] text-white">FERIXAS</p>
            <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-white/55">Seller center</p>
          </div>
        </div>
        <div className="mx-3 mb-4 hidden rounded-[2px] rounded-tr-[12px] border border-white/10 bg-white/[0.06] p-3 xl:block">
          <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-white/55">Ferixas seller account</p>
          <p className="mt-1 truncate text-[13px] font-semibold text-white">{merchant.name}</p>
          <p className="mt-0.5 truncate text-[10px] text-white/55">{merchant.plan} plan · {merchant.location}</p>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="xl:hidden"><StudioRail /></div>
          <div className="hidden xl:block"><StudioSidebar /></div>
        </div>
        <div className="hidden px-4 pb-5 xl:block">
        <Link
            href="/settings#seller-profile"
            className="flex min-h-[42px] items-center gap-2 rounded-[2px] rounded-tr-[10px] border border-white/15 px-3 py-2 text-[11px] font-semibold text-white/75 transition-colors hover:border-white/40 hover:text-white"
          >
            <Store width={14} height={14} /> Manage marketplace profile
          </Link>
        </div>
      </aside>

      <div className="min-w-0 flex-1 md:pl-[64px] xl:pl-[244px]">
        <header className="sticky top-0 z-30 flex min-h-[60px] items-center justify-between gap-3 border-b border-line-warm bg-white/95 px-4 shadow-[0_2px_10px_rgba(16,45,67,0.05)] backdrop-blur sm:px-6">
          <Link href="/" className="flex shrink-0 items-center gap-2" aria-label="Ferixas seller dashboard">
            <FerixasMark className="h-7 w-7" />
            <span className="leading-tight"><span className="block font-display text-[12px] font-extrabold tracking-[0.1em] text-ink">FERIXAS</span><span className="block text-[10px] text-ink-soft">Seller center</span></span>
          </Link>
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <span className="hidden min-w-0 items-center gap-1.5 border-l border-line-warm pl-3 text-[12px] font-medium text-ink sm:flex">
              <Store width={14} height={14} className="shrink-0 text-ember" /><span className="max-w-[170px] truncate">{merchant.name}</span>
            </span>
            <Link href="/products/new" className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-[2px] rounded-tr-[9px] bg-ember px-3 text-[11px] font-bold text-white shadow-sm transition-colors hover:bg-[#dc481c] sm:h-10 sm:px-4 sm:text-[12px]">
              <Plus width={15} height={15} /><span className="hidden xs:inline">Add product</span><span className="xs:hidden">Add</span>
            </Link>
          </div>
        </header>
        <main className="min-w-0">
          <div className="mx-auto w-full max-w-[1460px] px-4 py-5 sm:px-6 sm:py-7 lg:px-8">{children}</div>
        </main>
      </div>
      <StudioBottomNav />
    </div>
  );
}

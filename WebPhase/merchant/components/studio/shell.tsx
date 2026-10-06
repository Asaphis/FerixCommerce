import Link from "next/link";
import type { ReactNode } from "react";
import { Store } from "lucide-react";
import { FerixasMark } from "@/components/studio/marks";
import { StudioBottomNav, StudioRail, StudioSidebar } from "@/components/studio/nav";
import { NAV_GROUPS } from "@/components/studio/nav-data";
import { currentMerchant } from "@/lib/data";

/** Every destination, flattened from the shared definition for other screens. */
export const STUDIO_LINKS = NAV_GROUPS.flatMap((group) => group.items);

export async function StudioShell({ children }: { children: ReactNode }) {
  const merchant = await currentMerchant();

  if (!merchant) {
    return <div className="min-h-screen bg-void">{children}</div>;
  }

  return (
    <div className="min-h-screen bg-void md:flex">
      <aside className="hidden md:fixed md:inset-y-0 md:flex md:w-[64px] md:flex-col md:border-r md:border-hairline md:bg-panel xl:w-[228px]">
        <div className="flex items-center gap-2.5 px-2 py-4 xl:px-4">
          <FerixasMark />
          <div className="hidden min-w-0 xl:block">
            <p className="font-display text-[13px] font-extrabold tracking-[0.14em] text-chalk">FERIXAS</p>
            <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-chalk-dim">Seller workspace</p>
          </div>
        </div>

        <div className="mx-4 mb-4 hidden rounded-[2px] border border-hairline bg-panel-2 p-3 xl:block">
          <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-chalk-dim">Signed in as</p>
          <p className="mt-1 truncate text-[13px] font-medium text-chalk">{merchant.name}</p>
          <p className="font-mono text-[10px] text-chalk-dim">
            {merchant.plan} plan · {merchant.location}
          </p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="xl:hidden">
            <StudioRail />
          </div>
          <div className="hidden xl:block">
            <StudioSidebar />
          </div>
        </div>

        <div className="hidden px-4 pb-5 xl:block">
          <Link
            href={merchant.customDomain ? `https://${merchant.customDomain}` : `https://${merchant.domain}`}
            className="flex min-h-[44px] items-center gap-2 rounded-[2px] border border-hairline px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-chalk-dim transition-colors hover:border-chalk-dim hover:text-chalk"
          >
            <Store width={12} height={12} />
            View storefront
          </Link>
          <p className="mt-3 font-mono text-[9px] leading-relaxed text-chalk-dim/70">
            Your store and the marketplace share one catalogue.
          </p>
        </div>
      </aside>

      <main className="min-w-0 flex-1 md:pl-[64px] xl:pl-[228px]">
        <div className="mx-auto max-w-[1180px] px-4 py-6">{children}</div>
      </main>
      <StudioBottomNav />
    </div>
  );
}

import Link from "next/link";
import type { ReactNode } from "react";
import {
  BarChart3,
  Boxes,
  LayoutDashboard,
  Package,
  ShoppingCart,
  Store,
  Settings2,
  Users,
  Wallet,
} from "lucide-react";
import { FerixasMark } from "@/components/studio/marks";
import { SideNav } from "@/components/studio/nav";
import { currentMerchant } from "@/lib/data";

export async function StudioShell({ children }: { children: ReactNode }) {
  const merchant = await currentMerchant();

  if (!merchant) {
    return <div className="min-h-screen bg-void">{children}</div>;
  }

  return (
    <div className="min-h-screen bg-void lg:flex">
      <aside className="border-b border-hairline bg-panel lg:fixed lg:inset-y-0 lg:w-[228px] lg:border-b-0 lg:border-r">
        <div className="flex items-center gap-2.5 px-4 py-4">
          <FerixasMark />
          <div className="min-w-0">
            <p className="font-display text-[13px] font-extrabold tracking-[0.14em] text-chalk">FERIXAS</p>
            <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-chalk-dim">Seller workspace</p>
          </div>
        </div>

        <div className="mx-4 mb-4 rounded-[2px] border border-hairline bg-panel-2 p-3">
          <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-chalk-dim">Signed in as</p>
          <p className="mt-1 truncate text-[13px] font-medium text-chalk">{merchant.name}</p>
          <p className="font-mono text-[10px] text-chalk-dim">{merchant.plan} plan · {merchant.location}</p>
        </div>

        <SideNav />

        <div className="hidden px-4 pb-5 lg:block">
          <Link
            href={merchant.customDomain ? `https://${merchant.customDomain}` : `https://${merchant.domain}`}
            className="flex items-center gap-2 rounded-[2px] border border-hairline px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-chalk-dim transition-colors hover:border-chalk-dim hover:text-chalk"
          >
            <Store width={12} height={12} />
            View storefront
          </Link>
          <p className="mt-3 font-mono text-[9px] leading-relaxed text-chalk-dim/70">
            Your store and the marketplace share one catalogue.
          </p>
        </div>
      </aside>

      <main className="min-w-0 flex-1 lg:ml-[228px]">
        <div className="mx-auto max-w-[1180px] px-4 py-6">{children}</div>
      </main>
    </div>
  );
}

export const STUDIO_LINKS = [
  { href: "/", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/products", label: "Products", Icon: Package },
  { href: "/inventory", label: "Inventory", Icon: Boxes },
  { href: "/orders", label: "Orders", Icon: ShoppingCart },
  { href: "/customers", label: "Customers", Icon: Users },
  { href: "/analytics", label: "Analytics", Icon: BarChart3 },
  { href: "/payouts", label: "Payouts", Icon: Wallet },
  { href: "/settings", label: "Store settings", Icon: Settings2 },
];

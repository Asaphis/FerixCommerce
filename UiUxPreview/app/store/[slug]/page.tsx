"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { useFerixas } from "@/lib/store";
import { useDesign } from "@/lib/design/design-store";
import { DesignRenderer } from "@/components/design/renderer";
import { FerixasMark } from "@/components/brand/mark";

/**
 * A merchant storefront: the platform utility bar, then the published design
 * document rendered exactly as the Design Engine canvas shows it.
 */
export default function MerchantStorePage() {
  const params = useParams<{ slug: string }>();
  const { merchants, products, cartCount, addToCart } = useFerixas();
  const { publishedFor } = useDesign();

  const merchant = merchants.find((m) => m.slug === params.slug || m.id === params.slug);

  if (!merchant) {
    return (
      <div className="grid min-h-screen place-items-center bg-bone px-4 text-center">
        <div>
          <ShoppingBag width={26} height={26} className="mx-auto text-ink-soft" />
          <h1 className="mt-4 font-display text-[22px] font-semibold text-ink">
            No store at that address
          </h1>
          <Link
            href="/stores"
            className="mt-5 inline-flex cursor-pointer items-center gap-2 rounded-[2px] bg-ink px-4 py-2.5 text-[13px] text-bone"
          >
            Browse stores <ArrowLeft width={14} height={14} />
          </Link>
        </div>
      </div>
    );
  }

  const catalog = products.filter(
    (p) => p.merchantId === merchant.id && p.status === "active" && p.channels.store,
  );
  const nodes = publishedFor(merchant.id);

  return (
    <div className="min-h-screen" style={{ background: merchant.brand.canvas }}>
      <div className="sticky top-0 z-40 border-b border-hairline bg-void/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1240px] items-center gap-3 px-4 py-2.5">
          <Link href="/" className="flex shrink-0 items-center gap-2">
            <FerixasMark className="h-5 w-5" />
            <span className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-chalk-dim">
              Marketplace
            </span>
          </Link>
          <span className="hidden truncate font-mono text-[10.5px] text-chalk-dim sm:block">
            You are shopping on {merchant.name} \u00b7 {merchant.customDomain ?? merchant.domain}
          </span>
          <div className="ml-auto flex items-center gap-2">
            <Link
              href="/stores"
              className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-chalk-dim transition-colors hover:text-lime"
            >
              All stores
            </Link>
            <Link
              href="/cart"
              className="inline-flex items-center gap-1.5 rounded-[2px] bg-lime px-2.5 py-1.5 font-mono text-[9.5px] uppercase tracking-[0.14em] text-void"
            >
              <ShoppingBag width={12} height={12} /> Cart {cartCount}
            </Link>
          </div>
        </div>
      </div>

      <DesignRenderer
        nodes={nodes}
        brand={merchant.brand}
        merchant={merchant}
        products={catalog}
        interactive
        cartCount={cartCount}
        onAddToCart={(product) => {
          addToCart(product.id, null, 1);
          toast.success(`${product.title} added \u2014 sold by ${merchant.name}`);
        }}
      />

      <div className="border-t border-hairline bg-void px-4 py-3">
        <p className="mx-auto max-w-[1240px] font-mono text-[10px] uppercase tracking-[0.14em] text-chalk-dim">
          {merchant.name} \u00b7 designed in the Ferixas Design Engine \u00b7 same cart and checkout as
          the marketplace
        </p>
      </div>
    </div>
  );
}

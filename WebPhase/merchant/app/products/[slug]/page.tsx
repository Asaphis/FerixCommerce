import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireMerchant } from "@/lib/data";
import { getProduct, ApiError } from "@/lib/api";
import { ProductDeleteForm } from "@/components/studio/product-delete-form";
import { ProductForm } from "@/components/studio/product-form";
import { Eyebrow, Panel, PanelHead, Pill, StatTile } from "@/components/studio/bits";
import { Thumb } from "@/components/studio/marks";
import { dateShort, money, num, titleCase } from "@/lib/format";

export default async function ProductDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { session, merchant } = await requireMerchant();
  let data;
  try {
    data = await getProduct(session, slug);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }
  const { product, sold, lowStockAt, categories } = data;

  return (
    <div className="grid gap-5">
      <div>
        <Link
          href="/products"
          className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-chalk-dim transition-colors hover:text-chalk"
        >
          <ArrowLeft width={12} height={12} /> All products
        </Link>
      </div>

      <header className="shrinkable flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <Thumb seed={product.slug} className="h-16 w-16" />
          <div>
            <Eyebrow>{titleCase(product.category)}</Eyebrow>
            <h1 className="mt-1.5 font-display text-[23px] font-semibold text-chalk">{product.title}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Pill tone={product.status === "active" ? "success" : product.status === "draft" ? "warn" : "neutral"}>
                {product.status}
              </Pill>
              {product.channels.store ? <Pill tone="lime">My store</Pill> : null}
              {product.channels.marketplace ? <Pill tone="info">Marketplace</Pill> : null}
              <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-chalk-dim">
                {product.sku} · listed {dateShort(product.createdAt)}
              </span>
            </div>
          </div>
        </div>
        <ProductDeleteForm id={product.id} />
      </header>

      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 xl:grid-cols-4">
        <StatTile label="Price" value={money(product.price)} sub={product.compareAt ? `was ${money(product.compareAt)}` : "no discount"} />
        <StatTile
          label="In stock"
          value={String(product.stock)}
          sub={product.stock <= lowStockAt ? "at or below your low-stock line" : `healthy · low at ${lowStockAt}`}
          accent={product.stock <= lowStockAt ? "sand" : "chalk"}
        />
        <StatTile label="Sold to date" value={num(sold)} sub={`${num(product.sold30d)} in the last 30 days`} accent="azure" />
        <StatTile label="Product views" value="Coming soon" sub="Visitor tracking is not connected" accent="sand" />
      </div>

      <ProductForm product={product} categories={categories.length ? categories : [product.category]} />

      <Panel>
        <PanelHead
          title="Where this sells"
          hint="Changing a channel takes effect immediately on both surfaces"
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-[2px] border border-hairline p-3.5">
            <Eyebrow>Your storefront</Eyebrow>
            <p className="mt-1.5 text-[13px] text-chalk">{product.channels.store ? "Visible" : "Hidden"}</p>
            <p className="mt-1 font-mono text-[10.5px] text-chalk-dim">{merchant.customDomain ?? merchant.domain}</p>
          </div>
          <div className="rounded-[2px] border border-hairline p-3.5">
            <Eyebrow>Ferixas marketplace</Eyebrow>
            <p className="mt-1.5 text-[13px] text-chalk">{product.channels.marketplace ? "Listed" : "Not listed"}</p>
            <p className="mt-1 font-mono text-[10.5px] text-chalk-dim">ferixas.com · {merchant.commissionPct ?? 8}% commission on marketplace sales</p>
          </div>
        </div>
      </Panel>
    </div>
  );
}

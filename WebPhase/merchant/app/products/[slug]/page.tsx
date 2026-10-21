import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireMerchant } from "@/lib/data";
import { getProduct, getProductOptions, listMedia, listProducts, ApiError } from "@/lib/api";
import { ProductDeleteForm } from "@/components/studio/product-delete-form";
import { ProductForm } from "@/components/studio/product-form";
import { Panel, PanelHead, Pill, StatTile } from "@/components/studio/bits";
import { Thumb } from "@/components/studio/marks";
import { dateShort, money, num, titleCase } from "@/lib/format";

export default async function ProductDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { session, merchant } = await requireMerchant();
  const options = await getProductOptions(session);
  // The seller's own files, so a picture already uploaded can be reused.
  let library: { url: string; label: string }[] = [];
  try {
    const media = await listMedia(session);
    library = (media.assets ?? []).map((asset) => ({
      url: String(asset.url),
      label: String((asset as { label?: string; alt?: string }).label ?? (asset as { alt?: string }).alt ?? asset.url),
    }));
  } catch {
    library = [];
  }
  let data;
  try {
    data = await getProduct(session, slug);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      const catalogue = await listProducts(session).catch(() => null);
      const match = catalogue?.items?.find((item) => item.slug === slug || item.id === slug);
      if (match?.id) {
        data = await getProduct(session, match.slug, match.id);
      } else return (
        <div className="grid gap-4">
          <Link href="/products" className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-chalk-dim hover:text-chalk">
            <ArrowLeft width={12} height={12} /> All products
          </Link>
          <Panel className="border-sand/40 bg-sand/5">
            <PanelHead title="Product not found" />
            <p className="text-[13px] text-chalk">This product was not returned by your catalogue. Refresh Products before trying again.</p>
            <p className="mt-2 font-mono text-[10px] text-chalk-dim">Reference: {slug}</p>
            <Link href="/products" className="mt-4 inline-flex min-h-10 items-center rounded-[2px] bg-lime px-3 text-[12px] font-semibold text-void">Return to products</Link>
          </Panel>
        </div>
      );
    }
    throw error;
  }
  const { product, sold, lowStockAt, history } = data;
  const reviewStatus = product.reviewStatus ?? product.status;
  const requestedChanges = reviewStatus === "changes_requested" && product.reviewNote?.trim();

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
            <h1 className="mt-1.5 font-display text-[23px] font-semibold text-chalk">{product.title}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Pill tone={product.status === "approved" ? "success" : product.status === "pending_review" ? "warn" : product.status === "rejected" ? "neutral" : "neutral"}>
                {product.status}
              </Pill>
              <Pill tone="info">Ferixas marketplace</Pill>
              <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-chalk-dim">
                {product.sku} · listed {dateShort(product.createdAt)}
              </span>
            </div>
          </div>
        </div>
        <ProductDeleteForm id={product.id} />
      </header>

      {requestedChanges ? (
        <Panel>
          <div className="border-l-2 border-amber bg-amber/5 p-4">
            <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-amber">Changes requested by Admin</p>
            <p className="mt-2 text-[13px] text-chalk">{requestedChanges}</p>
            <p className="mt-2 font-mono text-[10.5px] text-chalk-dim">Update the listing and submit again. It remains hidden until the next review decision.</p>
          </div>
        </Panel>
      ) : product.status === "rejected" && product.rejection_reason ? (
        <Panel>
          <div className="border-l-2 border-rose bg-rose/5 p-4">
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-rose">Product Rejected</p>
                <p className="mt-2 text-[13px] text-chalk">{product.rejection_reason}</p>
                <p className="mt-2 font-mono text-[10.5px] text-chalk-dim">
                  Edit this product and resubmit to send it back for review.
                </p>
              </div>
            </div>
          </div>
        </Panel>
      ) : product.status === "pending_review" ? (
        <Panel>
          <div className="border-l-2 border-amber bg-amber/5 p-4">
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-amber">Pending Admin Review</p>
                <p className="mt-2 text-[13px] text-chalk">
                  Your product is being reviewed by our team. It will appear on the marketplace once approved.
                </p>
              </div>
            </div>
          </div>
        </Panel>
      ) : null}

      {!history?.length && (product.submittedAt || product.updatedAt) ? (
        <p className="font-mono text-[10px] text-chalk-dim">
          {product.submittedAt ? `Submitted ${dateShort(product.submittedAt)}` : "Listing created"}
          {product.updatedAt ? ` · Updated ${dateShort(product.updatedAt)}` : ""}
        </p>
      ) : null}

      {history?.length ? (
        <Panel>
          <PanelHead title="Product history" />
          <ol className="grid gap-3">
            {history.map((event) => (
              <li key={event.id} className="grid grid-cols-[10px_minmax(0,1fr)] gap-3">
                <span aria-hidden="true" className="mt-1.5 size-2 rounded-full bg-lime" />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <p className="text-[12px] font-medium text-chalk">{event.label}</p>
                    <p className="font-mono text-[9.5px] text-chalk-dim">{dateShort(event.at)} · {event.actor}</p>
                  </div>
                  {event.detail ? <p className="mt-1 break-words text-[11px] leading-relaxed text-chalk-dim">{event.detail}</p> : null}
                </div>
              </li>
            ))}
          </ol>
        </Panel>
      ) : null}

      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 xl:grid-cols-3">
        <StatTile label="Price" value={money(product.price)} sub={product.compareAt ? `was ${money(product.compareAt)}` : undefined} />
        <StatTile
          label="In stock"
          value={String(product.stock)}
          sub={product.stock <= lowStockAt ? "at or below your low-stock line" : `healthy · low at ${lowStockAt}`}
          accent={product.stock <= lowStockAt ? "sand" : "chalk"}
        />
        <StatTile label="Sold to date" value={num(sold)} sub={`${num(product.sold30d)} in the last 30 days`} accent="azure" />
      </div>

      <ProductForm
          product={product}
          categories={options.categories.map((item) => item.slug)}
          brands={options.brands}
          sections={options.sections}
          library={library}
        />

      <Panel>
        <PanelHead title="Marketplace listing" />
        <p className="text-[12px] text-chalk-dim">Admin approval required · {merchant.commissionPct ?? 10}% commission</p>
      </Panel>
    </div>
  );
}

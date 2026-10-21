import Link from "next/link";
import { requireMerchant } from "@/lib/data";
import { ProductForm } from "@/components/studio/product-form";

import { ApiError, getProductOptions, listMedia } from "@/lib/api";

export default async function NewProductPage() {
  const { merchant, session } = await requireMerchant();
  let options;
  try {
    options = await getProductOptions(session);
  } catch (error) {
    const reason = error instanceof ApiError ? error.message : "The catalogue service could not be reached.";
    return (
      <div className="grid gap-4">
        <h1 className="mt-1.5 font-display text-[23px] font-semibold text-chalk">New product</h1>
        <div role="alert" className="grid gap-3 rounded-[8px] border border-rose/30 bg-rose/10 p-4 text-[13px] text-chalk">
          <p>Product categories could not be loaded, so this product cannot be submitted yet.</p>
          <p className="text-chalk-dim">{reason}</p>
          <Link href="/products/new" className="w-fit font-semibold text-lime hover:underline">Try again</Link>
        </div>
      </div>
    );
  }

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

  return (
    <div className="grid gap-4">
      <header>
        <h1 className="mt-1.5 font-display text-[23px] font-semibold text-chalk">New product</h1>
      </header>

      <ProductForm categories={options.categories.map((item) => item.slug)} brands={options.brands} sections={options.sections} storeName={merchant.name} library={library} />
    </div>
  );
}

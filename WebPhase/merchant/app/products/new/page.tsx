import { requireMerchant } from "@/lib/data";
import { ProductForm } from "@/components/studio/product-form";
import { Eyebrow } from "@/components/studio/bits";

const CATEGORIES = [
  "electronics", "audio", "computing", "gaming", "phones",
  "fashion", "home", "beauty", "sports", "pantry",
];

export default async function NewProductPage() {
  const { merchant } = await requireMerchant();

  return (
    <div className="grid gap-4">
      <header>
        <Eyebrow>Catalogue</Eyebrow>
        <h1 className="mt-1.5 font-display text-[23px] font-semibold text-chalk">New product</h1>
      </header>

      <ProductForm categories={CATEGORIES} storeName={merchant.name} />
    </div>
  );
}

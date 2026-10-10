import { requireMerchant } from "@/lib/data";
import { ProductForm } from "@/components/studio/product-form";
import { Eyebrow } from "@/components/studio/bits";
import { getProductOptions } from "@/lib/api";

export default async function NewProductPage() {
  const { merchant, session } = await requireMerchant();
  const options = await getProductOptions(session);

  return (
    <div className="grid gap-4">
      <header>
        <Eyebrow>Catalogue</Eyebrow>
        <h1 className="mt-1.5 font-display text-[23px] font-semibold text-chalk">New product</h1>
      </header>

      <ProductForm categories={options.categories.map((item) => item.slug)} brands={options.brands} collections={options.collections} sections={options.sections} storeName={merchant.name} />
    </div>
  );
}

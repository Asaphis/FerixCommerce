import { requireMerchant } from "@/lib/data";
import { ProductForm } from "@/components/studio/product-form";
import { Eyebrow, Panel, PanelHead } from "@/components/studio/bits";

const CATEGORIES = [
  "electronics", "audio", "computing", "gaming", "phones",
  "fashion", "home", "beauty", "sports", "pantry",
];

export default async function NewProductPage() {
  const { merchant } = await requireMerchant();

  return (
    <div className="grid gap-5">
      <header>
        <Eyebrow>Catalogue</Eyebrow>
        <h1 className="mt-1.5 font-display text-[23px] font-semibold text-chalk">New product</h1>
        <p className="mt-1.5 max-w-[70ch] text-[13px] leading-relaxed text-chalk-dim">
          It is saved straight to {merchant.name}&apos;s catalogue on the store backend. Which channels it
          sells on is your choice, and you can change it later.
        </p>
      </header>

      <ProductForm categories={CATEGORIES} />

      <Panel>
        <PanelHead title="How channels work" hint="This is the core Ferixas idea" />
        <ul className="grid gap-3 text-[12.5px] leading-relaxed text-chalk-dim sm:grid-cols-3">
          <li className="rounded-[2px] border border-hairline p-3">
            <span className="block text-chalk">My store only</span>
            Sells on your own storefront, invisible on the marketplace.
          </li>
          <li className="rounded-[2px] border border-hairline p-3">
            <span className="block text-chalk">Marketplace only</span>
            Listed on Ferixas, not in your storefront.
          </li>
          <li className="rounded-[2px] border border-hairline p-3">
            <span className="block text-chalk">Both</span>
            One product record, one stock count, two places to buy it.
          </li>
        </ul>
      </Panel>
    </div>
  );
}

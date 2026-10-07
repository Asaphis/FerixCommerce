import { requireAdmin, explain } from "@/lib/data";
import { assetUrl, listBrands } from "@/lib/api";
import BrandsManager from "@/components/ops/brands-manager";

export default async function BrandsPage() {
  const { session } = await requireAdmin();
  try {
    const { brands } = await listBrands(session);
    return <BrandsManager initialBrands={brands.map((brand) => ({ ...brand, imageUrl: assetUrl(brand.imageUrl) }))} />;
  } catch (error) {
    return <BrandsManager initialBrands={[]} loadError={explain(error)} />;
  }
}

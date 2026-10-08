import { requireAdmin, explain } from "@/lib/data";
import { assetUrl, listBrands, listMedia } from "@/lib/api";
import BrandsManager from "@/components/ops/brands-manager";

export default async function BrandsPage() {
  const { session } = await requireAdmin();

  const library = await listMedia(session).catch(() => ({ assets: [], storage: "" }));
  // The picker needs a plain url and label; an asset carries whichever of these it has.
  const libraryOptions = library.assets.map((asset) => {
    const row = asset as { url: string; label?: string; alt?: string; name?: string };
    return { url: row.url, label: row.label ?? row.alt ?? row.name ?? row.url };
  });
  try {
    const { brands } = await listBrands(session);
    return <BrandsManager initialBrands={brands.map((brand) => ({ ...brand, imageUrl: assetUrl(brand.imageUrl) }))} libraryAssets={libraryOptions} />;
  } catch (error) {
    return <BrandsManager initialBrands={[]} libraryAssets={libraryOptions} loadError={explain(error)} />;
  }
}

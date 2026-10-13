import Link from "next/link";
import { assetUrl, getBrands } from "@/lib/api";
import { Eyebrow } from "@/components/ferix/marks";

export const metadata = {
  title: "Brands — Ferixas",
  description: "Discover brands available from sellers on the Ferixas marketplace.",
};

export default async function BrandsPage() {
  const { brands } = await getBrands().catch(() => ({ brands: [] }));

  return (
    <main className="mx-auto max-w-[1240px] px-4 py-7 lg:px-6 lg:py-10">
      <Eyebrow>Brand directory</Eyebrow>
      <h1 className="mt-2 font-display text-[26px] font-semibold text-ink sm:text-[32px]">Shop by brand</h1>
      <p className="mt-2 max-w-[68ch] text-[13px] leading-relaxed text-ink-soft">
        Explore brands managed by Ferixas and browse their available products.
      </p>
      {brands.length ? (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {brands.map((brand) => {
            const image = assetUrl(brand.imageUrl);
            return (
              <Link key={brand.id || brand.slug} href={`/brands/${brand.slug}`} className="group flex min-w-0 flex-col items-center rounded-[3px] border border-line-warm bg-white px-3 py-5 transition-colors hover:border-ember/40">
                {image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={image} alt={brand.name} className="h-16 w-16 rounded-full object-cover ring-1 ring-line-warm" />
                ) : (
                  <span className="grid h-16 w-16 place-items-center rounded-full bg-bone-soft font-display text-[20px] font-bold text-ink-soft ring-1 ring-line-warm">{brand.name.slice(0, 1)}</span>
                )}
                <span className="mt-3 w-full truncate text-center text-[12px] font-semibold text-ink group-hover:text-ember">{brand.name}</span>
                {brand.description ? <span className="mt-1 line-clamp-2 text-center text-[11px] leading-relaxed text-ink-soft">{brand.description}</span> : null}
              </Link>
            );
          })}
        </div>
      ) : (
        <p className="mt-6 rounded-[3px] border border-line-warm bg-white px-4 py-8 text-center text-[13px] text-ink-soft">
          Brands will appear here when they are added by the marketplace team.
        </p>
      )}
    </main>
  );
}

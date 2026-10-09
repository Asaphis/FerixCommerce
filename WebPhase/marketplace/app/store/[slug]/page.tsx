import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Check, Heart, Mail, MapPin, Package, Phone, Star } from "lucide-react";
import { assetUrl, getStore, ApiError } from "@/lib/api";
import { savedIds } from "@/lib/data";
import { ProductGrid } from "@/components/ferix/cards";
import { Eyebrow, LinkButton, SectionHead } from "@/components/ferix/marks";
import { compact, dateLong } from "@/lib/format";

export default async function StorePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let data;
  try {
    data = await getStore(slug);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }
  const { store, about, products, categories, stats, responseRate, fulfilmentRate } = data;
  const saved = await savedIds();
  const brand = store.brand;
  const record = store as unknown as { logo?: string; imageUrl?: string; image?: string };
  const storeArtwork = assetUrl(record.logo ?? record.imageUrl ?? record.image ?? null);

  return (
    <div>
      <section
        style={{ background: brand.canvas, borderTop: `4px solid ${brand.accent}` }}
        className="border-b border-line-warm"
      >
        <div className="mx-auto max-w-[1240px] px-4 py-10">
          <nav className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-soft">
            <Link href="/" className="transition-colors hover:text-ember">Ferixas</Link>
            <span>/</span>
            <Link href="/stores" className="transition-colors hover:text-ember">Stores</Link>
          </nav>

          <div className="mt-5 flex flex-wrap items-start gap-5">
            <span
              className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden font-display text-[22px] font-extrabold sm:h-16 sm:w-16 sm:text-[24px]"
              style={{ background: brand.accent, color: brand.accentInk, borderRadius: brand.radius }}
            >
              {storeArtwork ? (
                <img src={storeArtwork} alt="" className="h-full w-full object-cover" />
              ) : (
                store.name.slice(0, 1)
              )}
            </span>
            <div className="min-w-0 w-full sm:w-auto sm:flex-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="font-display text-[22px] font-semibold leading-tight text-ink sm:text-[28px]">{store.name}</h1>
                {store.verified ? (
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-[3px] font-mono text-[10px] uppercase tracking-[0.12em]"
                    style={{ borderColor: `${brand.accent}66`, background: `${brand.accent}1a`, color: brand.accent }}
                  >
                    <Check width={10} height={10} /> Verified
                  </span>
                ) : null}
              </div>
              <p className="mt-2 max-w-[64ch] text-[14px] leading-relaxed text-ink-soft">{store.tagline}</p>
              <div className="mt-3 flex flex-wrap items-center gap-4 font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-soft">
                <span className="inline-flex items-center gap-1.5">
                  <MapPin width={12} height={12} /> {store.location}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Star width={12} height={12} /> {stats.rating.toFixed(1)} · {compact(stats.reviewCount)} reviews
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Package width={12} height={12} /> {stats.products} products
                </span>
                <span>Trading since {dateLong(store.since)}</span>
              </div>
            </div>
            <div className="flex w-full flex-col items-start gap-3 sm:w-auto sm:items-end">
              <button
                className="inline-flex items-center gap-2 rounded-full border border-line-warm bg-white px-4 py-2 text-[13px] font-medium text-ink transition-colors hover:border-ember hover:text-ember"
                disabled
              >
                <Heart width={14} height={14} />
                Follow ({compact(stats.followers)})
              </button>
              <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-soft">
                {store.customDomain ?? store.domain}
              </p>
              <LinkButton href={`/browse?store=${store.slug}`} variant="outline">
                Shop on the marketplace
              </LinkButton>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1240px] px-4 py-8">
        <div className="grid grid-cols-1 gap-6 border-b border-line-warm pb-8 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <Eyebrow>About the store</Eyebrow>
            <p className="mt-2.5 max-w-[70ch] text-[14px] leading-relaxed text-ink-soft">{about}</p>
            
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              { label: "Response rate", value: `${responseRate}%` },
              { label: "Fulfilment rate", value: `${fulfilmentRate}%` },
              { label: "Followers", value: compact(stats.followers) },
            ].map((item) => (
              <div key={item.label} className="rounded-[3px] border border-line-warm bg-white p-3.5">
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft">{item.label}</p>
                <p className="mt-1.5 font-mono text-[19px] font-semibold text-ink">{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {categories.map((category) => (
            <Link
              key={category.slug}
              href={`/browse?store=${store.slug}&category=${category.slug}`}
              className="rounded-[2px] border border-line-warm bg-white px-3 py-2 text-[12.5px] text-ink transition-colors hover:border-ink/30"
            >
              {category.name} <span className="text-ink-soft">({category.count})</span>
            </Link>
          ))}
        </div>

        <div className="mt-10">
          <SectionHead
            eyebrow="The catalogue"
            title={`Everything ${store.name} sells`}
            action={
              <Link
                href={`/browse?store=${store.slug}`}
                className="group inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft transition-colors hover:text-ember"
              >
                Filter the catalogue
                <ArrowRight width={14} height={14} className="transition-transform group-hover:translate-x-0.5" />
              </Link>
            }
          />
          <ProductGrid products={products} savedIds={saved} />
        </div>

        <div className="mt-12 border-t border-line-warm pt-8">
          <SectionHead
            eyebrow="More from Ferixas"
            title="You might also like"
          />
          <p className="mt-2 text-[13px] text-ink-soft">
            Discover more products from other verified sellers on the Ferixas marketplace.
          </p>
          <div className="mt-4">
            <LinkButton href="/browse" variant="outline">
              Browse marketplace
            </LinkButton>
          </div>
        </div>

        <p className="mt-10 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft/70">
          {store.name} sells here and on {store.customDomain ?? store.domain} from one product record · same cart and checkout
        </p>
      </section>
    </div>
  );
}

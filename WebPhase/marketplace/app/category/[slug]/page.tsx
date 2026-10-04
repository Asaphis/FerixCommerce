import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { getCategories } from "@/lib/api";
import { CatalogListing, type Query } from "@/components/ferix/catalog-listing";
import { Eyebrow } from "@/components/ferix/marks";

/** Department landing pages: a short introduction, then the shared listing. */
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const feed = await getCategories().catch(() => ({ categories: [] }));
  const category = feed.categories.find((item) => item.slug === slug);
  return {
    title: category ? `${category.name} — Ferixas` : "Department — Ferixas",
    description: category?.blurb ?? "Shop this department across every merchant store on Ferixas.",
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Query>;
}) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const feed = await getCategories().catch(() => ({ categories: [] }));
  const category = feed.categories.find((item) => item.slug === slug);
  if (!category) notFound();

  const siblings = feed.categories.filter((item) => item.slug !== category.slug).slice(0, 6);

  return (
    <>
      <section className="border-b border-line-warm bg-white">
        <div className="mx-auto max-w-[1240px] px-4 py-5 lg:px-6 lg:py-7">
          <Eyebrow>Department</Eyebrow>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
            <div className="min-w-0">
              <h2 className="font-display text-[24px] font-semibold leading-tight text-ink lg:text-[32px]">
                {category.name}
              </h2>
              <p className="mt-1.5 max-w-[62ch] text-[13px] leading-relaxed text-ink-soft">{category.blurb}</p>
            </div>
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft">
              {category.count} product{category.count === 1 ? "" : "s"} listed
            </p>
          </div>

          {siblings.length ? (
            <div className="no-scrollbar -mx-4 mt-4 flex gap-1.5 overflow-x-auto px-4 lg:mx-0 lg:flex-wrap lg:px-0">
              {siblings.map((sibling) => (
                <Link
                  key={sibling.slug}
                  href={`/category/${sibling.slug}`}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-[2px] border border-line-warm px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft transition-colors hover:border-ink/30 hover:text-ink"
                >
                  {sibling.name}
                  <ArrowRight width={11} height={11} />
                </Link>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      <CatalogListing
        query={query}
        basePath={`/category/${category.slug}`}
        locked={{ category: category.slug }}
        heading={category.name}
        crumbs={[{ label: "Home", href: "/" }, { label: "Browse", href: "/browse" }, { label: category.name }]}
      />
    </>
  );
}

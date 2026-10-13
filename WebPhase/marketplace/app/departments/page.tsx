import { getCategories } from "@/lib/api";
import { CategoryTile } from "@/components/ferix/cards";
import { Eyebrow } from "@/components/ferix/marks";

export const metadata = {
  title: "Departments — Ferixas",
  description: "Browse every department available on the Ferixas marketplace.",
};

export default async function DepartmentsPage() {
  const { categories } = await getCategories().catch(() => ({ categories: [] }));

  return (
    <main className="mx-auto max-w-[1240px] px-4 py-7 lg:px-6 lg:py-10">
      <Eyebrow>Shop by department</Eyebrow>
      <h1 className="mt-2 font-display text-[26px] font-semibold text-ink sm:text-[32px]">All departments</h1>
      <p className="mt-2 max-w-[68ch] text-[13px] leading-relaxed text-ink-soft">
        Browse the departments managed by Ferixas. A department may be listed here before its first products are published.
      </p>
      {categories.length ? (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {categories.map((category) => <CategoryTile key={category.slug} category={category} size="large" />)}
        </div>
      ) : (
        <p className="mt-6 rounded-[3px] border border-line-warm bg-white px-4 py-8 text-center text-[13px] text-ink-soft">
          Departments will appear here when they are added by the marketplace team.
        </p>
      )}
    </main>
  );
}

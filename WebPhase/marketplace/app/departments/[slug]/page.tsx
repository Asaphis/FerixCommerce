import { redirect } from "next/navigation";

/** Preserve old department links while keeping one canonical category route. */
export default async function DepartmentAliasPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  redirect(`/category/${encodeURIComponent(slug)}`);
}

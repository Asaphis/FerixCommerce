import { getCataloguePage, getHome, listAdverts } from "@/lib/api";
import { savedIds } from "@/lib/data";
import { RenderSections, type HomePayload, type Section } from "@/components/ferix/render-sections";

/**
 * Information-page CMS policy: render CMS blocks only when the information
 * document exists (published). A missing/unpublished document leaves the
 * route's established editorial fallback intact; API outages do likewise.
 */
export async function CmsInfoSections({ pageType }: { pageType: string }) {
  const [page, home, saved] = await Promise.all([
    getCataloguePage(pageType).catch(() => null),
    getHome().catch(() => null),
    savedIds().catch(() => [] as string[]),
  ]);
  if (!page?.page || !home) return null;
  const sections = page.sections
    .filter((section) => section && section.visible !== false)
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  if (!sections.length) return null;
  const advertSection = sections.find((section) => section.type === "promo_slots");
  const adverts = advertSection
    ? (await listAdverts(advertSection.placement || "home").catch(() => ({ adverts: [] }))).adverts
    : [];
  const renderHome = { ...home, placements: page.placements ?? {} } as unknown as HomePayload;
  return <div className="pb-8">{RenderSections({ sections: sections as Section[], home: renderHome, adverts, saved, mode: "page" })}</div>;
}

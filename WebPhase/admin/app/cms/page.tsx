import Link from "next/link";
import { ArrowRight, Boxes, Image as ImageIcon, Layers, Megaphone, Palette, Tag, UploadCloud } from "lucide-react";
import { requireAdmin, explain } from "@/lib/data";
import { listCmsPages, type CmsPage } from "@/lib/api";
import { Empty, Eyebrow, Panel, PanelHead, Pill } from "@/components/ops/bits";
import { PageHeader } from "@/components/ops/table";

// The records - products, departments, brands, sellers - have pages of their own.
// What is left here exists only to fill a place in a page: a banner, a promotion,
// and the library both draw from.
  { href: "/cms/banners", label: "Banners", detail: "Hero and promo creatives", Icon: Megaphone },
  { href: "/cms/collections", label: "Collections", detail: "Curated product groupings", Icon: Palette },
  { href: "/cms/adverts", label: "Adverts", detail: "Promotions inside the product list", Icon: Megaphone },
  { href: "/cms/media", label: "Media", detail: "Images and video", Icon: ImageIcon },
  { href: "/cms/publishing", label: "Publishing", detail: "Version history and restore", Icon: UploadCloud },
];

/** What a page is, in the words an operator uses - never the internal type. */
const PAGE_LOCATION: Record<string, string> = {
  marketplace_home: "The homepage",
  marketplace_explore: "The explore and search results",
  marketplace_product: "Every product page",
  marketplace_store: "Every store page",
};

export default async function CmsPage() {
  const { session } = await requireAdmin();

  // The pages are the point of this screen, so an unreachable API reports itself
  // and leaves every destination below usable.
  let pages: CmsPage[] = [];
  let loadError: string | null = null;
  try {
    pages = (await listCmsPages(session)).pages;
  } catch (error) {
    loadError = explain(error);
  }

  return (
    <div className="grid min-w-0 gap-5">
      <PageHeader
        eyebrow="Marketplace"
        title="Content"
        action={
          <Link
            href="/"
            target="_blank"
            className="inline-flex min-h-9 items-center gap-2 rounded-[10px] border border-hairline px-3 text-[12.5px] font-semibold text-chalk transition-colors hover:bg-panel-2"
          >
            Preview the storefront
          </Link>
        }
      />

      {loadError ? (
        <div role="status" className="rounded-[12px] border border-[#e34d32]/40 bg-[#e34d32]/8 px-4 py-3 text-[13px] leading-relaxed text-[#b23a24]">
          <span className="font-semibold">The content API could not be reached.</span> Every screen below still opens,
          and nothing has been lost. {loadError}
        </div>
      ) : null}

      <Panel>
        <PanelHead
          title="Pages"
          hint="Pick a page, then the section inside it"
          action={<Pill tone="mint">{pages.length} pages</Pill>}
        />
        {pages.length ? (
          <ul className="grid gap-2">
            {pages.map((page) => (
              <li key={page.id} className="min-w-0">
                <Link
                  href={`/cms/pages/${page.id}`}
                  className="group flex w-full min-w-0 items-center gap-3 rounded-[12px] border border-hairline bg-panel px-3.5 py-3 transition-colors hover:border-signal/40 hover:bg-white sm:px-4"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-panel-2 text-signal">
                    <Layers width={16} height={16} />
                  </span>
                  {/* Everything that can be long lives in this one shrinking column, so a phone
                      cannot push the row past the panel edge and clip the sentence. */}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-display text-[14px] font-semibold text-chalk group-hover:text-signal">
                      {page.title}
                    </span>
                    <span className="mt-0.5 block truncate font-mono text-[10px] uppercase tracking-[0.1em] text-chalk-dim">
                      <span className="hidden md:inline">
                        {PAGE_LOCATION[page.documentType] ?? page.title} ·{" "}
                      </span>
                      {page.sectionCount} sections · {page.visibleCount} live
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    {page.hasDraft ? <Pill tone="amber">Draft</Pill> : null}
                    <Pill tone={page.status === "published" ? "mint" : "amber"}>{page.status}</Pill>
                  </span>
                  <ArrowRight
                    width={15}
                    height={15}
                    className="hidden shrink-0 text-chalk-dim transition-transform group-hover:translate-x-0.5 sm:block"
                  />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <Empty
            title="No pages yet"
            body="A page is a document holding an ordered list of sections. Seeding the content creates the storefront pages."
          />
        )}
      </Panel>

      <Panel>
        <PanelHead title="Libraries" hint="What each page's sections draw from" />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {AREAS.map(({ href, label, detail, Icon }) => (
            <Link
              key={href}
              href={href}
              className="group flex items-start justify-between gap-3 rounded-[12px] border border-hairline bg-panel p-4 transition-colors hover:border-chalk-dim/40 hover:bg-panel-2"
            >
              <span className="flex items-start gap-3">
                <span className="mt-0.5 text-signal"><Icon width={16} height={16} /></span>
                <span>
                  <span className="block font-display text-[14px] font-semibold text-chalk">{label}</span>
                  <span className="mt-1 block text-[12.5px] text-chalk-dim">{detail}</span>
                </span>
              </span>
              <ArrowRight width={15} height={15} className="mt-1 shrink-0 text-chalk-dim transition-transform group-hover:translate-x-0.5" />
            </Link>
          ))}
        </div>
      </Panel>
    </div>
  );
}

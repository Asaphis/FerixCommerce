import Link from "next/link";
import { ArrowRight, Boxes, Image as ImageIcon, Layers, Megaphone, Palette, UploadCloud } from "lucide-react";
import { requireAdmin } from "@/lib/data";
import { listDocuments } from "@/lib/api";
import { Empty, Eyebrow, Panel, PanelHead, Pill } from "@/components/ops/bits";
import { relative, titleCase } from "@/lib/format";

const SECTIONS = [
  {
    href: "/cms/homepage",
    label: "Homepage",
    detail: "Sections, order and copy for ferixas.com",
    Icon: Layers,
  },
  {
    href: "/cms/banners",
    label: "Banners",
    detail: "Hero and promo creatives",
    Icon: Megaphone,
  },
  {
    href: "/cms/categories",
    label: "Departments",
    detail: "Category tiles, text links and order",
    Icon: Boxes,
  },
  {
    href: "/cms/collections",
    label: "Collections",
    detail: "Curated product groupings",
    Icon: Palette,
  },
  {
    href: "/cms/media",
    label: "Media",
    detail: "Images and video for every surface",
    Icon: ImageIcon,
  },
  {
    href: "/cms/publishing",
    label: "Publishing",
    detail: "Version history and restore",
    Icon: UploadCloud,
  },
];

export default async function CmsPage() {
  const { session } = await requireAdmin();
  const { documents } = await listDocuments(session);

  return (
    <div className="grid min-w-0 gap-5">
      <header>
        <Eyebrow>Marketplace</Eyebrow>
        <h1 className="mt-1.5 font-display text-[23px] font-semibold text-chalk">Content management</h1>
        <p className="mt-1.5 max-w-[74ch] text-[13px] leading-relaxed text-chalk-dim">
          Everything a shopper sees on the storefront is edited here. Saving writes a draft; publishing makes it
          live. Every save is versioned, so any change can be rolled back.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {SECTIONS.map(({ href, label, detail, Icon }) => (
          <Link
            key={href}
            href={href}
            className="group flex items-start justify-between gap-3 rounded-[2px] border border-hairline bg-panel p-4 transition-colors hover:border-chalk-dim/40 hover:bg-panel-2"
          >
            <div className="flex items-start gap-3">
              <span className="mt-0.5 text-signal">
                <Icon width={16} height={16} />
              </span>
              <div>
                <p className="font-display text-[14px] font-semibold text-chalk">{label}</p>
                <p className="mt-1 text-[12.5px] text-chalk-dim">{detail}</p>
              </div>
            </div>
            <ArrowRight
              width={15}
              height={15}
              className="mt-1 shrink-0 text-chalk-dim transition-transform group-hover:translate-x-0.5"
            />
          </Link>
        ))}
      </div>

      <Panel>
        <PanelHead
          title="Content documents"
          hint="Each document is a page of the storefront that the CMS controls."
          action={
            <Link
              href="/cms/homepage"
              className="rounded-[2px] border border-hairline px-3 py-2 text-[12.5px] text-chalk transition-colors hover:bg-panel-2"
            >
              Open homepage
            </Link>
          }
        />
        {documents.length === 0 ? (
          <Empty
            title="No documents yet"
            body="Opening the homepage editor creates the first document. Until then the storefront renders its built-in layout."
          />
        ) : (
          <ul className="grid gap-2">
            {documents.map((doc) => (
              <li
                key={doc.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-[2px] border border-hairline bg-panel-2 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate font-display text-[13.5px] font-semibold text-chalk">{doc.title}</p>
                  <p className="mt-0.5 font-mono text-[10.5px] text-chalk-dim">
                    {doc.id} · {titleCase(doc.documentType)}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Pill tone={doc.status === "published" ? "mint" : "amber"}>{doc.status}</Pill>
                  <span className="font-mono text-[10.5px] text-chalk-dim">
                    {doc.updatedBy ? `${doc.updatedBy} · ` : ""}
                    {relative(doc.updatedAt)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

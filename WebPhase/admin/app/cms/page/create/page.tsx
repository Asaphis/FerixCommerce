import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireAdmin, explain } from "@/lib/data";
import { createPageAction } from "@/lib/actions";
import { CmsActionForm } from "@/components/ops/cms-action-form";
import { Empty, Panel, PanelHead, Pill } from "@/components/ops/bits";
import { PageHeader, inputClass, selectClass } from "@/components/ops/table";
import { Field, SubmitButton } from "@/components/ops/controls";

export default async function CmsPageCreate() {
  const { session } = await requireAdmin();

  return (
    <div className="grid min-w-0 gap-5">
      <PageHeader
        back={
          <Link
            href="/cms"
            className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-chalk-dim transition-colors hover:text-chalk"
          >
            <ArrowLeft width={13} height={13} /> Content
          </Link>
        }
        eyebrow="Marketplace"
        title="Add new page"
        action={
          <>
            <Link
              href="/"
              target="_blank"
              className="inline-flex min-h-9 items-center gap-2 rounded-[10x] border border-hairline px-3 text-[12.5px] font-semibold text-chalk transition-colors hover:bg-panel-2"
            >
              Preview the storefront
            </Link>
          </>
        }
      />

      <Panel>
        <PanelHead title="Create a new dynamic page" />
        <CmsActionForm action={createPageAction} className="space-y-4">
          <Field title="Page title (required)">
            <input
              name="title"
              className={inputClass}
              placeholder="e.g., Deals Hub, Seasonal Sale, Brand Story"
              required
            />
          </Field>
          <Field title="Page type">
            <select name="document_type" className={selectClass} required>
              <option value="">Select page type</option>
              <option value="marketplace_home">Homepage</option>
              <option value="marketplace_explore">Explore & Search Results</option>
              <option value="marketplace_product">Product Page</option>
              <option value="marketplace_store">Storefront Page</option>
              <option value="marketplace_deals">Deals Page</option>
              <option value="marketplace_collection">Collection Page</option>
              <option value="marketplace_brand">Brand Page</option>
              <option value="marketplace_category">Category Page</option>
            </select>
          </Field>
          <SubmitButton pendingLabel="Creating">Create page</SubmitButton>
        </CmsActionForm>
      </Panel>
    </div>
  );
}
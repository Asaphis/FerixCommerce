import Link from "next/link";
import { ArrowLeft, Megaphone, Plus } from "lucide-react";
import { requireAdmin, explain } from "@/lib/data";
import { listAdverts, type AdminAdvert } from "@/lib/api";
import { CmsActionForm } from "@/components/ops/cms-action-form";
import { MediaUploadField } from "@/components/ops/media-upload-field";
import { Empty, Panel, PanelHead, Pill } from "@/components/ops/bits";
import { PageHeader, inputClass, selectClass } from "@/components/ops/table";
import { Field, SubmitButton } from "@/components/ops/controls";
import { deleteAdvertAction, saveAdvertAction } from "@/lib/actions";

/** An hour ago, so a new advertisement starts immediately rather than by default. */
function nowForInput() {
  return new Date(Date.now() - 60 * 60 * 1000).toISOString().slice(0, 16);
}

function inNinetyDays() {
  return new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16);
}

function shortDate(value?: string) {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

const BLANK: AdminAdvert = {
  id: "", name: "", headline: "", body: "", mediaUrl: "", kind: "image",
  href: "/browse", placement: "explore", sponsor: "", position: 1,
  active: true, startsAt: nowForInput(), endsAt: inNinetyDays(),
};

export default async function AdvertsPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const { id } = await searchParams;
  const { session } = await requireAdmin();

  let adverts: AdminAdvert[] = [];
  let counts = { total: 0, running: 0, explore: 0 };
  let loadError: string | null = null;
  try {
    const result = await listAdverts(session);
    adverts = result.adverts;
    counts = result.counts;
  } catch (error) {
    loadError = explain(error);
  }

  const chosen = adverts.find((advert) => advert.id === id);
  const active = chosen ?? BLANK;

  return (
    <div className="grid min-w-0 gap-5">
      <PageHeader
        back={
          <Link href="/cms" className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-chalk-dim transition-colors hover:text-chalk">
            <ArrowLeft width={13} height={13} /> Content
          </Link>
        }
        eyebrow="Marketplace"
        title="Advertisements"
        description="Promotions that run inside a page's product list, with their own dates."
        action={
          <>
            <Pill tone="mint">{counts.running} running</Pill>
            <Pill tone="neutral">{counts.total} total</Pill>
            <Link href="/cms/adverts" className="inline-flex min-h-9 items-center gap-1.5 rounded-[10px] bg-signal px-3 text-[12.5px] font-semibold text-white transition-colors hover:bg-[#e4572e]">
              <Plus width={14} height={14} /> New
            </Link>
          </>
        }
      />

      {loadError ? (
        <div role="status" className="rounded-[12px] border border-[#e34d32]/40 bg-[#e34d32]/8 px-4 py-3 text-[13px] text-[#b23a24]">
          <span className="font-semibold">The content API could not be reached.</span> {loadError}
        </div>
      ) : null}

      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(320px,400px)] xl:items-start">
        <Panel flush>
          <div className="p-4 pb-3 sm:p-5 sm:pb-3">
            <PanelHead title="Running and scheduled" hint={`${counts.explore} placed in the product list`} />
          </div>
          {adverts.length ? (
            <ul className="grid gap-2 px-4 pb-4 sm:px-5 sm:pb-5">
              {adverts.map((advert) => (
                <li key={advert.id} className="rounded-[12px] border border-hairline bg-panel px-4 py-3.5">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-panel-2 text-signal">
                      <Megaphone width={15} height={15} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13.5px] font-semibold text-chalk">{advert.headline || advert.name}</span>
                      <span className="mt-0.5 block truncate font-mono text-[10px] uppercase tracking-[0.12em] text-chalk-dim">
                        {advert.name} · {advert.kind ?? "image"} · {advert.sponsor ? `sponsored by ${advert.sponsor}` : "house"}
                      </span>
                    </span>
                    <Pill tone={advert.placement === "explore" ? "violet" : "neutral"}>{advert.placement ?? "explore"}</Pill>
                    <Pill tone={advert.running ? "mint" : "neutral"}>{advert.running ? "Running" : advert.active ? "Scheduled" : "Off"}</Pill>
                    <Link href={`/cms/adverts?id=${advert.id}`} className="shrink-0 rounded-[9px] border border-hairline px-3 py-1.5 text-[11px] font-semibold text-chalk transition-colors hover:bg-panel-2">
                      Edit
                    </Link>
                  </div>
                  <p className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[10px] uppercase tracking-[0.12em] text-chalk-dim">
                    <span>{shortDate(advert.startsAt)} to {shortDate(advert.endsAt)}</span>
                    {advert.href ? <span>{advert.href}</span> : null}
                    {advert.mediaUrl ? <span>has artwork</span> : null}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-4 pb-4 sm:px-5 sm:pb-5">
              <Empty title="No advertisements yet" body="Create one and it will run inside the product list for the placement you choose, until its own end date." />
            </div>
          )}
        </Panel>

        <Panel>
          <PanelHead
            title={chosen ? "Edit advertisement" : "New advertisement"}
            hint="Dates are inclusive. An advert outside them simply stops appearing."
          />
          <CmsActionForm action={saveAdvertAction} className="mt-4 grid gap-3">
            <input type="hidden" name="id" value={active.id} />
            <Field title="Name">
              <input name="name" required defaultValue={active.name} key={`n-${active.id}`} className={inputClass} placeholder="Autumn edit" />
            </Field>
            <Field title="Headline">
              <input name="headline" required defaultValue={active.headline} key={`h-${active.id}`} className={inputClass} placeholder="Autumn edit: quiet pieces, bold colours" />
            </Field>
            <Field title="Supporting line">
              <input name="body" defaultValue={active.body} key={`b-${active.id}`} className={inputClass} placeholder="Hand-picked from three stores." />
            </Field>
            <MediaUploadField
              key={`media-${active.id || "new"}`}
              urlName="mediaUrl"
              fileName="mediaFile"
              defaultUrl={active.mediaUrl}
              kind="auto"
              urlLabel="Artwork URL"
              fileLabel="Upload artwork"
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <Field title="Kind">
                <select name="kind" defaultValue={active.kind ?? "image"} key={`k-${active.id}`} className={selectClass}>
                  <option value="image">Image</option>
                  <option value="video">Video</option>
                </select>
              </Field>
              <Field title="Placement">
                <select name="placement" defaultValue={active.placement ?? "explore"} key={`p-${active.id}`} className={selectClass}>
                  <option value="explore">Explore product list</option>
                  <option value="home">Homepage</option>
                  <option value="both">Both</option>
                </select>
              </Field>
            </div>
            <Field title="Destination">
              <input name="href" defaultValue={active.href} key={`d-${active.id}`} className={inputClass} placeholder="/browse?onSale=1" />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field title="Sponsor">
                <input name="sponsor" defaultValue={active.sponsor} key={`s-${active.id}`} className={inputClass} placeholder="Blank for house advertising" />
              </Field>
              <Field title="Order">
                <input name="position" type="number" min={1} defaultValue={active.position ?? 1} key={`o-${active.id}`} className={inputClass} />
              </Field>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field title="Starts">
                <input name="startsAt" type="datetime-local" defaultValue={(active.startsAt ?? "").slice(0, 16)} key={`st-${active.id}`} className={inputClass} />
              </Field>
              <Field title="Ends">
                <input name="endsAt" type="datetime-local" defaultValue={(active.endsAt ?? "").slice(0, 16)} key={`en-${active.id}`} className={inputClass} />
              </Field>
            </div>
            <label className="flex items-center gap-2 text-[12.5px] text-chalk">
              <input type="checkbox" name="active" defaultChecked={active.active ?? true} key={`a-${active.id}`} className="size-4 accent-[var(--ember)]" /> Active
            </label>
            <div className="flex flex-wrap gap-2">
              <SubmitButton pendingLabel="Saving">{chosen ? "Save advertisement" : "Create advertisement"}</SubmitButton>
              {chosen ? (
                <Link href="/cms/adverts" className="inline-flex min-h-11 items-center rounded-[5px] border border-hairline px-3.5 text-[12.5px] font-medium text-chalk transition-colors hover:bg-panel-2">
                  Cancel
                </Link>
              ) : null}
            </div>
          </CmsActionForm>

          {chosen ? (
            <CmsActionForm action={deleteAdvertAction} className="mt-5 grid gap-2 border-t border-hairline pt-4">
              <input type="hidden" name="id" value={chosen.id} />
              <p className="text-[12px] text-chalk-dim">
                Deleting removes it for good. To pause it instead, untick Active above.
              </p>
              <SubmitButton variant="danger" pendingLabel="Deleting">Delete advertisement</SubmitButton>
            </CmsActionForm>
          ) : null}
        </Panel>
      </div>
    </div>
  );
}

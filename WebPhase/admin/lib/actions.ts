"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import * as api from "@/lib/api";
import { clearSession, readSession, writeSession } from "@/lib/session";

export type FormState = { error?: string; message?: string };

function refresh(path = "/") {
  revalidatePath(path);
  revalidatePath("/", "layout");
}

// ── Session ────────────────────────────────────────────────────────────

export async function signInAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Enter your email and password." };
  let result: Awaited<ReturnType<typeof api.adminLogin>>;
  try {
    result = await api.adminLogin({ email, password });
  } catch (error) {
    return { error: error instanceof api.ApiError ? error.message : "We could not sign you in." };
  }
  await writeSession(result.token);
  refresh();
  redirect("/");
}

export async function signOutAction(): Promise<void> {
  const session = await readSession();
  try {
    await api.adminLogout(session);
  } catch {
    // clearing locally is what matters
  }
  await clearSession();
  refresh();
  redirect("/login");
}

// ── Merchants ──────────────────────────────────────────────────────────

export async function merchantStatusAction(formData: FormData): Promise<void> {
  const session = await readSession();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!session || !id || !status) return;
  try {
    await api.updateMerchant(session, { id, status });
  } catch {
    return;
  }
  refresh("/merchants");
  revalidatePath(`/merchants/${id}`);
}

export async function saveMerchantAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await readSession();
  if (!session) redirect("/login");
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Which merchant?" };
  const plan = String(formData.get("plan") ?? "");
  const commission = Number(formData.get("commissionPct") ?? 8);
  try {
    await api.updateMerchant(session, {
      id,
      status: String(formData.get("status") ?? "active"),
      plan,
      commissionPct: commission,
      marketplaceEnabled: formData.get("marketplaceEnabled") === "on",
      verified: formData.get("verified") === "on",
    });
  } catch (error) {
    return { error: error instanceof api.ApiError ? error.message : "We could not save that merchant." };
  }
  refresh("/merchants");
  revalidatePath(`/merchants/${id}`);
  return { message: "Merchant updated. The change applies immediately." };
}

// ── Settings ───────────────────────────────────────────────────────────

export async function saveSettingsAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await readSession();
  if (!session) redirect("/login");
  const platformName = String(formData.get("platformName") ?? "").trim();
  if (platformName.length < 2) return { error: "Enter the platform name." };
  try {
    await api.updateSettings(session, {
      platformName,
      supportEmail: String(formData.get("supportEmail") ?? "").trim(),
      defaultCommissionPct: Number(formData.get("defaultCommissionPct") ?? 8),
      currency: String(formData.get("currency") ?? "USD"),
      payoutCadence: String(formData.get("payoutCadence") ?? "weekly"),
      taxRatePct: Number(formData.get("taxRatePct") ?? 7.5),
      marketplaceEnabled: formData.get("marketplaceEnabled") === "on",
      newMerchantsNeedReview: formData.get("newMerchantsNeedReview") === "on",
    });
  } catch (error) {
    return { error: error instanceof api.ApiError ? error.message : "We could not save the platform settings." };
  }
  refresh("/settings");
  return { message: "Platform settings saved." };
}

// ── CMS: brands --------------------------------------------------------
export async function saveBrandAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await readSession();
  if (!session) redirect("/login");
  const id = String(formData.get("id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim();
  if (!name || !slug) return { error: "Brand name and slug are required." };
  let imageUrl = String(formData.get("imageUrl") ?? "").trim();
  try {
    const file = formData.get("imageFile");
    if (file instanceof File && file.size > 0) {
      const uploaded = await api.uploadMedia(session, file, { kind: "image", alt: name, folder: "brands" });
      imageUrl = uploaded.asset.url;
    }
    const body = {
      ...(id ? { id } : {}), name, slug,
      description: String(formData.get("description") ?? "").trim(),
      imageUrl,
      featured: formData.get("featured") === "on",
      visible: formData.get("visible") === "on",
      position: Number(formData.get("position") ?? 1),
    };
    if (id) await api.updateBrand(session, body);
    else await api.saveBrand(session, body);
  } catch (error) {
    return { error: error instanceof api.ApiError ? error.message : "We could not save this brand." };
  }
  refresh("/cms/brands");
  return { message: id ? "Brand updated." : "Brand created." };
}
export async function deleteBrandAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await readSession();
  if (!session) redirect("/login");
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { error: "Choose a brand to delete." };
  try { await api.deleteBrand(session, id); }
  catch (error) { return { error: error instanceof api.ApiError ? error.message : "We could not delete this brand." }; }
  refresh("/cms/brands");
  return { message: "Brand deleted." };
}

// ── CMS pages ──────────────────────────────────────────────────────────

/** Save a page's sections as a draft. The live storefront is untouched. */
export async function saveCmsPageAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await readSession();
  if (!session) redirect("/login");
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { error: "That page is missing." };
  let sections: api.CmsSection[] = [];
  try {
    sections = JSON.parse(String(formData.get("sections") ?? "[]")) as api.CmsSection[];
  } catch {
    return { error: "The sections could not be read." };
  }
  try {
    await api.saveCmsPage(session, { id, sections });
  } catch (error) {
    return { error: error instanceof api.ApiError ? error.message : "The draft could not be saved." };
  }
  refresh(`/cms/pages/${id}`);
  refresh("/cms");
  return { message: "Draft saved. The storefront is unchanged until you publish." };
}

/** Publish the draft. This is the moment the storefront changes. */
export async function publishCmsPageAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await readSession();
  if (!session) redirect("/login");
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { error: "That page is missing." };
  try {
    await api.publishCmsPage(session, id);
  } catch (error) {
    return { error: error instanceof api.ApiError ? error.message : "The page could not be published." };
  }
  refresh(`/cms/pages/${id}`);
  refresh("/cms");
  refresh("/");
  return { message: "Published. The storefront now serves this version." };
}

/** Switch one section on or off, keeping everything else where it is. */
export async function toggleCmsSectionAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await readSession();
  if (!session) redirect("/login");
  const id = String(formData.get("id") ?? "").trim();
  const sectionId = String(formData.get("sectionId") ?? "").trim();
  const visible = formData.get("visible") === "on";
  if (!id || !sectionId) return { error: "That section is missing." };
  try {
    const { page } = await api.getCmsPage(session, id);
    const sections = page.sections.map((section) =>
      section.id === sectionId ? { ...section, visible } : section,
    );
    await api.saveCmsPage(session, { id, sections });
  } catch (error) {
    return { error: error instanceof api.ApiError ? error.message : "That section could not be changed." };
  }
  refresh(`/cms/pages/${id}`);
  return { message: visible ? "Back on the storefront." : "Hidden. Still in the list, nothing deleted." };
}

/** Move a section one place up or down, which is what reorders the shop. */
export async function moveCmsSectionAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await readSession();
  if (!session) redirect("/login");
  const id = String(formData.get("id") ?? "").trim();
  const sectionId = String(formData.get("sectionId") ?? "").trim();
  const direction = String(formData.get("direction") ?? "up");
  if (!id || !sectionId) return { error: "That section is missing." };
  try {
    const { page } = await api.getCmsPage(session, id);
    const sections = [...page.sections];
    const from = sections.findIndex((section) => section.id === sectionId);
    if (from === -1) return { error: "That section is no longer on this page." };

    if (direction === "top" || direction === "bottom") {
      // Straight to one end, keeping everything else in order.
      const [moved] = sections.splice(from, 1);
      if (direction === "top") sections.unshift(moved);
      else sections.push(moved);
    } else {
      const to = from + (direction === "down" ? 1 : -1);
      if (to < 0 || to >= sections.length) return {};
      const [moved] = sections.splice(from, 1);
      sections.splice(to, 0, moved);
    }
    await api.saveCmsPage(session, { id, sections });
  } catch (error) {
    return { error: error instanceof api.ApiError ? error.message : "That section could not be moved." };
  }
  refresh(`/cms/pages/${id}`);
  return { message: "Order changed. Publish to put it on the storefront." };
}

/** Add a section to a page. It lands at the bottom, empty, as a draft. */
export async function addCmsSectionAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await readSession();
  if (!session) redirect("/login");
  const id = String(formData.get("id") ?? "").trim();
  const type = String(formData.get("type") ?? "").trim();
  const label = String(formData.get("name") ?? "").trim();
  if (!id || !type) return { error: "Choose what kind of section to add." };
  try {
    const { page } = await api.getCmsPage(session, id);
    const sections = [...page.sections];
    sections.push({
      id: `sec_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      type,
      name: label || type.replace(/_/g, " "),
      position: sections.length + 1,
      visible: true,
    } as api.CmsSection);
    await api.saveCmsPage(session, { id, sections });
  } catch (error) {
    return { error: error instanceof api.ApiError ? error.message : "That section could not be added." };
  }
  refresh(`/cms/pages/${id}`);
  return { message: "Added at the bottom of the draft. Open it to fill it in." };
}

/** Take a section off a page for good. */
export async function removeCmsSectionAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await readSession();
  if (!session) redirect("/login");
  const id = String(formData.get("id") ?? "").trim();
  const sectionId = String(formData.get("sectionId") ?? "").trim();
  if (!id || !sectionId) return { error: "That section is missing." };
  try {
    const { page } = await api.getCmsPage(session, id);
    const sections = page.sections.filter((section) => section.id !== sectionId);
    if (sections.length === page.sections.length) return { error: "That section is no longer on this page." };
    await api.saveCmsPage(session, { id, sections });
  } catch (error) {
    return { error: error instanceof api.ApiError ? error.message : "That section could not be removed." };
  }
  refresh(`/cms/pages/${id}`);
  return { message: "Removed. Publish to take it off the storefront." };
}

/** Save the fields of one section. */
export async function saveCmsSectionAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await readSession();
  if (!session) redirect("/login");
  const id = String(formData.get("id") ?? "").trim();
  const sectionId = String(formData.get("sectionId") ?? "").trim();
  if (!id || !sectionId) return { error: "That section is missing." };
  try {
    const { page } = await api.getCmsPage(session, id);
    const current = page.sections.find((section) => section.id === sectionId);
    if (!current) return { error: "That section is no longer on this page." };

    const numericFields = new Set(["across", "rowsPerSet", "interruptAfter", "limit", "adEvery", "height", "duration", "width", "scrim", "columns", "perPage"]);
    const booleanFields = new Set(["mediaOnly", "seeAll", "swipe", "showAsTile", "showAsText", "showFollow", "showText", "showButtons", "verifiedOnly"]);
    const next: Record<string, unknown> = { ...current };
    for (const [field, value] of formData.entries()) {
      if (!field.startsWith("field_") || value instanceof File) continue;
      const key = field.slice("field_".length);
      if (["mediaUrl", "mediaLibraryUrl", "mediaFile", "kind"].includes(key)) continue;
      const text = String(value).trim();
      if (numericFields.has(key)) {
        if (!text) {
          delete next[key];
        } else {
          const number = Number(text);
          if (!Number.isFinite(number)) return { error: `Enter a valid number for ${key}.` };
          next[key] = number;
        }
      } else if (booleanFields.has(key)) {
        next[key] = text === "true" || text === "on";
      } else {
        next[key] = text;
      }
    }

    const mediaFile = formData.get("field_mediaFile");
    let uploadedMediaUrl = "";
    let uploadedKind = "";
    if (mediaFile instanceof File && mediaFile.size > 0) {
      uploadedKind = mediaFile.type.startsWith("video/") ? "video" : "image";
      const alt = String(formData.get("field_title") ?? current.title ?? current.name ?? "Ferixas hero media").trim();
      const uploaded = await api.uploadMedia(session, mediaFile, {
        kind: uploadedKind,
        alt: alt || "Ferixas hero media",
        folder: "banners",
      });
      uploadedMediaUrl = uploaded.asset.url;
    }

    const hasMediaFields = formData.has("field_mediaUrl") || formData.has("field_mediaLibraryUrl") || uploadedMediaUrl;
    if (hasMediaFields) {
      const libraryUrl = String(formData.get("field_mediaLibraryUrl") ?? "").trim();
      const typedUrl = String(formData.get("field_mediaUrl") ?? "").trim();
      const mediaUrl = uploadedMediaUrl || libraryUrl || typedUrl;
      const selectedKind = String(formData.get("field_kind") ?? "image").toLowerCase();
      const kind = uploadedKind || (selectedKind === "video" || /\.(mp4|webm|mov|m4v)(?:$|\?)/i.test(mediaUrl) ? "video" : "image");
      next.mediaUrl = mediaUrl;
      next.kind = kind;
    }

    const isMediaOnly = next.mediaOnly === true || String(next.mediaOnly) === "true";
    const savedMediaUrl = String(next.mediaUrl ?? "").trim();
    if (isMediaOnly && current.type === "hero_slim" && !savedMediaUrl) {
      return { error: "Choose an image or video before setting this Explore banner to media-only." };
    }
    if (isMediaOnly && current.type === "hero_banner" && !savedMediaUrl) {
      const { banners } = await api.listBanners(session);
      if (!banners.some((banner) => banner.active && (banner.mediaUrl || banner.image || banner.videoUrl))) {
        return { error: "Add an active banner image or video, or upload direct media, before using media-only mode." };
      }
    }

    const sections = page.sections.map((section) => section.id === sectionId ? next as api.CmsSection : section);
    await api.saveCmsPage(session, { id, sections });
  } catch (error) {
    return { error: error instanceof api.ApiError ? error.message : "Those changes could not be saved." };
  }
  refresh(`/cms/pages/${id}`);
  return { message: "Saved as a draft. Publish to put it on the storefront." };
}

// ── Advertisements ─────────────────────────────────────────────────────

export async function saveAdvertAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await readSession();
  if (!session) redirect("/login");
  const id = String(formData.get("id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const headline = String(formData.get("headline") ?? "").trim();
  if (!name || !headline) return { error: "A name and a headline are both needed." };

  let mediaUrl = String(formData.get("mediaUrl") ?? "").trim()
    || String(formData.get("mediaLibraryUrl") ?? "").trim();
  try {
    const file = formData.get("mediaFile");
    if (file instanceof File && file.size > 0) {
      const uploaded = await api.uploadMedia(session, file, {
        kind: String(formData.get("kind") ?? "image") === "video" ? "video" : "image",
        alt: headline,
        folder: "adverts",
      });
      mediaUrl = uploaded.asset.url;
    }
    await api.saveAdvert(session, {
      ...(id ? { id } : {}),
      name,
      headline,
      body: String(formData.get("body") ?? "").trim(),
      mediaUrl,
      kind: String(formData.get("kind") ?? "image"),
      href: String(formData.get("href") ?? "").trim(),
      placement: String(formData.get("placement") ?? "explore"),
      sponsor: String(formData.get("sponsor") ?? "").trim(),
      position: Number(formData.get("position") ?? 1),
      active: formData.get("active") === "on",
      startsAt: String(formData.get("startsAt") ?? "") || undefined,
      endsAt: String(formData.get("endsAt") ?? "") || undefined,
    });
  } catch (error) {
    return { error: error instanceof api.ApiError ? error.message : "That advertisement could not be saved." };
  }
  refresh("/cms/adverts");
  return { message: id ? "Saved." : "Advertisement created." };
}

export async function deleteAdvertAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await readSession();
  if (!session) redirect("/login");
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { error: "That advertisement is missing." };
  try {
    await api.deleteAdvert(session, id);
  } catch (error) {
    return { error: error instanceof api.ApiError ? error.message : "That advertisement could not be deleted." };
  }
  refresh("/cms/adverts");
  return { message: "Deleted." };
}

// ── Seller accounts ────────────────────────────────────────────────────
// Suspend stops them trading and signing in; restricting takes them out of the
// marketplace without closing the account. Both are reversible. Deleting is not, and
// is the owner's alone - the endpoint refuses an administrator, and a seller with
// orders, which arrives here as the API's own sentence rather than a generic failure.

export async function suspendMerchantAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await readSession();
  if (!session) redirect("/login");
  const id = String(formData.get("id") ?? "").trim();
  const suspend = formData.get("suspend") !== "false";
  if (!id) return { error: "That seller is missing." };
  try {
    await api.updateMerchant(session, { id, status: suspend ? "suspended" : "active" });
  } catch (error) {
    return { error: error instanceof api.ApiError ? error.message : "That seller could not be changed." };
  }
  refresh("/merchants");
  return {
    message: suspend
      ? "Suspended. They cannot sign in or trade until this is lifted."
      : "Active again. They can sign in and trade.",
  };
}

export async function restrictMerchantAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await readSession();
  if (!session) redirect("/login");
  const id = String(formData.get("id") ?? "").trim();
  const restricted = formData.get("restricted") !== "false";
  if (!id) return { error: "That seller is missing." };
  try {
    await api.updateMerchant(session, { id, marketplaceEnabled: !restricted });
  } catch (error) {
    return { error: error instanceof api.ApiError ? error.message : "That seller could not be changed." };
  }
  refresh("/merchants");
  return {
    message: restricted
      ? "Taken out of the marketplace. Their account and products are untouched."
      : "Back in the marketplace.",
  };
}

export async function deleteMerchantAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await readSession();
  if (!session) redirect("/login");
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { error: "That seller is missing." };
  try {
    await api.deleteMerchant(session, id);
  } catch (error) {
    return { error: error instanceof api.ApiError ? error.message : "That seller could not be deleted." };
  }
  refresh("/merchants");
  return { message: "Seller account removed, along with their products and sign-ins." };
}

// ── Acting on an order ─────────────────────────────────────────────────
// Every one of these is refused by the endpoint when it would be wrong - cancelling a
// delivered order, refunding one that was never paid - and the refusal arrives as the
// API's own sentence rather than a generic failure.

async function orderAction(action: "cancel" | "refund" | "resend", formData: FormData): Promise<FormState> {
  const session = await readSession();
  if (!session) redirect("/login");
  const id = String(formData.get("id") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();
  if (!id) return { error: "That order is missing." };
  let message = "";
  try {
    const result = await api.actOnOrder(session, action, reason ? { id, reason } : { id });
    message = result.message;
  } catch (error) {
    return { error: error instanceof api.ApiError ? error.message : "That could not be done to this order." };
  }
  refresh("/orders");
  return { message };
}

export async function cancelOrderAction(_prev: FormState, formData: FormData): Promise<FormState> {
  return orderAction("cancel", formData);
}

export async function refundOrderAction(_prev: FormState, formData: FormData): Promise<FormState> {
  return orderAction("refund", formData);
}

export async function resendOrderAction(_prev: FormState, formData: FormData): Promise<FormState> {
  return orderAction("resend", formData);
}

/** Change a seller's own details. Every field is optional: only what was typed is sent. */
export async function editMerchantAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await readSession();
  if (!session) redirect("/login");
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { error: "That seller is missing." };

  const body: Record<string, unknown> = { id };
  for (const field of ["name", "tagline", "location", "about"]) {
    const value = String(formData.get(field) ?? "").trim();
    if (value) body[field] = value;
  }
  const commission = String(formData.get("commissionPct") ?? "").trim();
  if (commission) body.commissionPct = Number(commission);
  const plan = String(formData.get("plan") ?? "").trim();
  if (plan) body.plan = plan;
  // The marketplace switch always states itself: a switch has two states, and silence would
  // mean one of them by accident.
  body.marketplaceEnabled = formData.get("marketplaceEnabled") === "on";

  try {
    await api.updateMerchant(session, body);
  } catch (error) {
    return { error: error instanceof api.ApiError ? error.message : "That seller could not be saved." };
  }
  refresh("/merchants");
  refresh(`/merchants/${id}`);
  return { message: "Saved. The change applies from the next order." };
}

// ── The review queue ────────────────────────────────────────────────────
// Approving is the moment a seller's listing goes on sale: the endpoint sets it active, so
// nothing reaches a customer until someone here says so. A reason travels with the other two,
// because "changes requested" without a reason is a message nobody can act on.

async function decideOnProduct(
  decision: "approve" | "changes" | "reject",
  formData: FormData,
): Promise<FormState> {
  const session = await readSession();
  if (!session) redirect("/login");
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { error: "That product is missing." };
  const note = String(formData.get("note") ?? "").trim();
  if (decision !== "approve" && !note) {
    return { error: "Say why, so the seller knows what to change." };
  }
  const placement = String(formData.get("placement") ?? "").trim();
  try {
    await api.decideProduct(session, {
      id,
      decision,
      ...(note ? { note } : {}),
      ...(decision === "approve" && placement ? { placement } : {}),
    });
  } catch (error) {
    return { error: error instanceof api.ApiError ? error.message : "That could not be decided." };
  }
  refresh("/review");
  return {
    message:
      decision === "approve"
        ? "Approved. It is on sale now."
        : decision === "changes"
          ? "Sent back to the seller with your note."
          : "Rejected. The seller keeps it in their own catalogue.",
  };
}

export async function approveProductAction(_prev: FormState, formData: FormData): Promise<FormState> {
  return decideOnProduct("approve", formData);
}

export async function requestChangesAction(_prev: FormState, formData: FormData): Promise<FormState> {
  return decideOnProduct("changes", formData);
}

export async function rejectProductAction(_prev: FormState, formData: FormData): Promise<FormState> {
  return decideOnProduct("reject", formData);
}


export async function createCmsSectionAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await readSession();
  if (!session) redirect("/login");
  
  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 2) return { error: "Section name is required." };
  
  try {
    await api.createCmsSection(session, {
      name,
      slug: String(formData.get("slug") ?? "").trim() || undefined,
      description: String(formData.get("description") ?? "").trim() || undefined,
      is_active: formData.get("is_active") === "true",
      sort_order: Number(formData.get("sort_order") ?? 0),
    });
    revalidatePath("/cms/sections");
    return { message: "Section created successfully." };
  } catch (error) {
    if (error instanceof api.ApiError) return { error: error.message };
    return { error: "Failed to create section." };
  }
}


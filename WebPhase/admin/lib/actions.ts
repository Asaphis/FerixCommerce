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
  const direction = String(formData.get("direction") ?? "up") === "down" ? 1 : -1;
  if (!id || !sectionId) return { error: "That section is missing." };
  try {
    const { page } = await api.getCmsPage(session, id);
    const sections = [...page.sections];
    const from = sections.findIndex((section) => section.id === sectionId);
    const to = from + direction;
    if (from === -1 || to < 0 || to >= sections.length) return {};
    const [moved] = sections.splice(from, 1);
    sections.splice(to, 0, moved);
    await api.saveCmsPage(session, { id, sections });
  } catch (error) {
    return { error: error instanceof api.ApiError ? error.message : "That section could not be moved." };
  }
  refresh(`/cms/pages/${id}`);
  return { message: "Order changed. Publish to put it on the storefront." };
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
    const sections = page.sections.map((section) => {
      if (section.id !== sectionId) return section;
      const next: Record<string, unknown> = { ...section };
      for (const [field, value] of formData.entries()) {
        if (field.startsWith("field_")) next[field.slice("field_".length)] = String(value);
      }
      return next as api.CmsSection;
    });
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

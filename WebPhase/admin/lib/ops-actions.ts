"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import * as api from "@/lib/api";
import { readSession } from "@/lib/session";
import type { FormState } from "@/lib/actions";

function refresh(path: string) {
  revalidatePath(path);
  revalidatePath("/", "layout");
}

const str = (form: FormData, key: string, fallback = "") => String(form.get(key) ?? fallback).trim();
const bool = (form: FormData, key: string) => form.get(key) === "on" || form.get(key) === "true";
const lines = (form: FormData, key: string) =>
  str(form, key)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
const csv = (form: FormData, key: string) =>
  str(form, key)
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

async function uploadedMediaUrl(
  session: string,
  form: FormData,
  fieldName: string,
  kind: string,
  alt: string,
  folder: string,
): Promise<string> {
  const file = form.get(fieldName);
  if (!(file instanceof File) || file.size === 0) return "";
  const result = await api.uploadMedia(session, file, { kind, alt, folder });
  return result.asset.url;
}

function actionError(error: unknown, fallback: string): FormState {
  return { error: error instanceof api.ApiError ? error.message : fallback };
}

// ── Catalogue ──────────────────────────────────────────────────────────

function productPayload(form: FormData) {
  return {
    title: str(form, "title"),
    slug: str(form, "slug") || undefined,
    category: str(form, "category", "home"),
    description: str(form, "description"),
    bullets: lines(form, "bullets"),
    price: Number(form.get("price") ?? 0),
    compareAt: form.get("compareAt") ? Number(form.get("compareAt")) : null,
    stock: Number(form.get("stock") ?? 0),
    sku: str(form, "sku"),
    status: str(form, "status", "draft"),
    featured: bool(form, "featured"),
    store: bool(form, "store"),
    marketplace: bool(form, "marketplace"),
    collections: csv(form, "collections"),
    tags: csv(form, "tags"),
    images: lines(form, "images"),
    seoTitle: str(form, "seoTitle"),
    seoDescription: str(form, "seoDescription"),
  };
}


/**
 * Put a product into every section that was ticked on the form.
 *
 * It only ever places. A section that is not ticked is left alone rather than removed,
 * because a form that has not been shown a product's existing placements would otherwise
 * untick them all and quietly take the product out of every section it was in.
 */
async function placeTickedSections(session: string, form: FormData, slug: string, title: string) {
  let available: api.SectionOption[] = [];
  try {
    available = (await api.getProductSections(session, slug)).available;
  } catch {
    return;
  }
  for (const section of available) {
    const key = `section__${section.documentId}__${section.sectionId}`;
    if (form.get(key) !== "on") continue;
    const price = str(form, `price${key}`);
    const quantity = str(form, `qty${key}`);
    try {
      await api.placeProductInSection(session, {
        slug,
        documentId: section.documentId,
        sectionId: section.sectionId,
        sectionType: section.sectionType,
        title,
        ...(price ? { price: Number(price) } : {}),
        ...(quantity ? { quantity: Number(quantity) } : {}),
      });
    } catch {
      // One section failing to take the product must not lose the product itself.
      continue;
    }
  }
}

export async function createCatalogProductAction(form: FormData): Promise<void> {
  const session = await readSession();
  if (!session) redirect("/login");
  const payload = productPayload(form);
  if (!payload.title) return;
  // The picture, resolved the way every other upload in this file resolves one: a file from
  // the device, an asset from the library, or a pasted address, in that order.
  const uploaded = await uploadedMediaUrl(session, form, "mediaFile", "image", String(payload.title), "products");
  const chosen = uploaded || str(form, "mediaLibraryUrl") || str(form, "imageUrl");
  if (chosen) payload.images = [chosen];
  try {
    await api.createCatalogProduct(session, payload as unknown as Record<string, unknown>);
  } catch {
    return;
  }
  await placeTickedSections(session, form, String(payload.slug ?? ""), String(payload.title ?? ""));
  refresh("/catalog");
  redirect("/catalog");
}

export async function updateCatalogProductAction(form: FormData): Promise<void> {
  const session = await readSession();
  if (!session) redirect("/login");
  const id = str(form, "id");
  if (!id) return;
  const payload = productPayload(form);
  const uploaded = await uploadedMediaUrl(session, form, "mediaFile", "image", String(payload.title ?? "Product"), "products");
  const chosen = uploaded || str(form, "mediaLibraryUrl") || str(form, "imageUrl");
  if (chosen) payload.images = [chosen];
  try {
    await api.updateCatalogProduct(session, { id, ...payload } as unknown as Record<string, unknown>);
  } catch {
    return;
  }
  await placeTickedSections(session, form, str(form, "slug"), String(payload.title ?? ""));
  refresh("/catalog");
  revalidatePath(`/catalog/${str(form, "slug")}`);
}

export async function deleteCatalogProductAction(form: FormData): Promise<void> {
  const session = await readSession();
  if (!session) redirect("/login");
  const id = str(form, "id");
  const slug = str(form, "slug");
  if (!id) return;
  try {
    await api.deleteCatalogProduct(session, id);
  } catch {
    return;
  }
  refresh("/catalog");
  if (slug) redirect("/catalog");
}

// ── CMS: banners ───────────────────────────────────────────────────────

export async function saveBannerAction(_previous: FormState, form: FormData): Promise<FormState> {
  const session = await readSession();
  if (!session) redirect("/login");
  const headline = str(form, "headline");
  const showText = bool(form, "showText");
  if (!headline && showText) return { error: "Enter a banner headline, or turn off copy to use media only." };
  const kind = str(form, "kind", "image");
  try {
    const uploadedUrl = await uploadedMediaUrl(session, form, "mediaFile", kind, headline || "Ferixas campaign", "banners");
    const libraryUrl = str(form, "mediaLibraryUrl");
    const mediaUrl = uploadedUrl || libraryUrl || str(form, "mediaUrl");
    if (!mediaUrl) return { error: "Choose a media-library asset, paste a URL, or upload a banner file." };
    const videoUrl = kind === "video" ? uploadedUrl || libraryUrl || str(form, "mediaUrl") || str(form, "videoUrl") || null : null;
    await api.saveBanner(session, {
      id: str(form, "id") || undefined,
      kind,
      // Off means the banner shows its image or video alone: the headline, body and buttons
      // all go with the overlay, scrim included. Absent means shown, so nothing that already
      // exists changes behaviour.
      showText,
      eyebrow: str(form, "eyebrow"),
      headline,
      body: str(form, "body"),
      ctaLabel: str(form, "ctaLabel", "Shop now"),
      ctaHref: str(form, "ctaHref", "/browse"),
      secondaryLabel: str(form, "secondaryLabel") || null,
      secondaryHref: str(form, "secondaryHref") || null,
      mediaUrl,
      videoUrl,
      accent: str(form, "accent", "#c8ff3d"),
      audience: str(form, "audience", "everyone"),
      active: bool(form, "active"),
      order: Number(form.get("order") ?? 99),
    });
  } catch (error) {
    return actionError(error, "We could not upload or save this banner.");
  }
  refresh("/cms/banners");
  return { message: str(form, "id") ? "Banner changes saved." : "Banner created." };
}

export async function deleteBannerAction(form: FormData): Promise<void> {
  const session = await readSession();
  if (!session) redirect("/login");
  const id = str(form, "id");
  if (!id) return;
  try {
    await api.deleteBanner(session, id);
  } catch {
    return;
  }
  refresh("/cms/banners");
}

// ── CMS: categories and collections ────────────────────────────────────

export async function saveCategoryAction(_previous: FormState, form: FormData): Promise<FormState> {
  const session = await readSession();
  if (!session) redirect("/login");
  const name = str(form, "name");
  if (!name) return { error: "Enter a department name." };
  try {
    const imageFileUrl = await uploadedMediaUrl(session, form, "imageFile", "image", name, "categories");
    await api.saveCategory(session, {
      slug: str(form, "slug") || undefined,
      name,
      blurb: str(form, "blurb"),
      glyph: str(form, "glyph", "Tag"),
      image: imageFileUrl || str(form, "image") || undefined,
      showInNav: bool(form, "showInNav"),
      showAsTile: bool(form, "showAsTile"),
      showAsText: bool(form, "showAsText"),
      visible: bool(form, "visible"),
      position: Number(form.get("position") ?? 0),
    });
  } catch (error) {
    return actionError(error, "We could not upload the department image or save this department.");
  }
  refresh("/cms/categories");
  return { message: "Department saved." };
}

export async function deleteCategoryAction(form: FormData): Promise<void> {
  const session = await readSession();
  if (!session) redirect("/login");
  const slug = str(form, "slug");
  if (!slug) return;
  try {
    await api.deleteCategory(session, slug);
  } catch {
    return;
  }
  refresh("/cms/categories");
}

export async function saveCollectionAction(_previous: FormState, form: FormData): Promise<FormState> {
  const session = await readSession();
  if (!session) redirect("/login");
  const name = str(form, "name");
  if (!name) return { error: "Enter a collection name." };
  try {
    const imageFileUrl = await uploadedMediaUrl(session, form, "imageFile", "image", name, "collections");
    await api.saveCollection(session, {
      slug: str(form, "slug") || undefined,
      name,
      blurb: str(form, "blurb"),
      image: imageFileUrl || str(form, "image") || undefined,
      visible: bool(form, "visible"),
      position: Number(form.get("position") ?? 0),
    });
  } catch (error) {
    return actionError(error, "We could not upload the collection image or save this collection.");
  }
  refresh("/cms/collections");
  return { message: "Collection saved." };
}

export async function deleteCollectionAction(form: FormData): Promise<void> {
  const session = await readSession();
  if (!session) redirect("/login");
  const slug = str(form, "slug");
  if (!slug) return;
  try {
    await api.deleteCollection(session, slug);
  } catch {
    return;
  }
  refresh("/cms/collections");
}

// ── CMS: media ─────────────────────────────────────────────────────────

export async function addMediaAction(_previous: FormState, form: FormData): Promise<FormState> {
  const session = await readSession();
  if (!session) redirect("/login");
  const url = str(form, "url");
  const file = form.get("file");
  const kind = str(form, "kind", "image");
  const alt = str(form, "alt");
  const folder = str(form, "folder", "platform");
  if (!(file instanceof File && file.size > 0) && !url) return { error: "Choose a file or enter a hosted media URL." };
  try {
    if (file instanceof File && file.size > 0) {
      await api.uploadMedia(session, file, { kind, alt, folder });
    } else {
      await api.addMedia(session, { url, kind, alt, folder });
    }
  } catch (error) {
    return actionError(error, "We could not upload or add this media asset.");
  }
  refresh("/cms/media");
  return { message: "Media asset added to the library." };
}

export async function removeMediaAction(form: FormData): Promise<void> {
  const session = await readSession();
  if (!session) redirect("/login");
  const id = str(form, "id");
  if (!id) return;
  try {
    await api.removeMedia(session, id);
  } catch {
    return;
  }
  refresh("/cms/media");
}

// ── CMS: documents ─────────────────────────────────────────────────────

export async function saveHomepageAction(_previous: FormState, form: FormData): Promise<FormState> {
  const session = await readSession();
  if (!session) redirect("/login");
  const documentId = str(form, "documentId", "doc_marketplace_home");
  const ids = form.getAll("sectionId").map(String);
  const sections = ids.map((id, index) => ({
    id,
    type: str(form, `type_${id}`, "rich_text"),
    title: str(form, `title_${id}`),
    subtitle: str(form, `subtitle_${id}`),
    ctaLabel: str(form, `ctaLabel_${id}`),
    ctaHref: str(form, `ctaHref_${id}`),
    position: Number(form.get(`position_${id}`) ?? index + 1),
    visible: form.get(`visible_${id}`) === "on",
  }));
  try {
    await api.saveDocument(session, { id: documentId, data: { sections }, note: "Homepage saved" });
  } catch (error) {
    return actionError(error, "We could not save the homepage draft.");
  }
  refresh("/cms/homepage");
  return { message: "Homepage draft saved." };
}

export async function publishHomepageAction(form: FormData): Promise<void> {
  const session = await readSession();
  if (!session) redirect("/login");
  try {
    await api.publishDocument(session, str(form, "documentId", "doc_marketplace_home"));
  } catch {
    return;
  }
  refresh("/cms/homepage");
  refresh("/cms/publishing");
}

export async function restoreVersionAction(form: FormData): Promise<void> {
  const session = await readSession();
  if (!session) redirect("/login");
  const versionId = str(form, "versionId");
  if (!versionId) return;
  try {
    await api.restoreDocumentVersion(session, versionId);
  } catch {
    return;
  }
  refresh("/cms/homepage");
  refresh("/cms/publishing");
}

// ── Promotions ─────────────────────────────────────────────────────────

export async function savePromotionAction(form: FormData): Promise<void> {
  const session = await readSession();
  if (!session) redirect("/login");
  const name = str(form, "name");
  if (!name) return;
  const productIds = form.getAll("itemProductId").map(String);
  const items = productIds
    .map((productId, index) => ({
      productId,
      salePrice: Number(form.get(`itemPrice_${index}`) ?? 0),
      quantityLimit: Number(form.get(`itemLimit_${index}`) ?? 0),
    }))
    .filter((item) => item.productId);
  try {
    await api.savePromotion(session, {
      id: str(form, "id") || undefined,
      name,
      headline: str(form, "headline"),
      bannerUrl: str(form, "bannerUrl"),
      startsAt: str(form, "startsAt") || undefined,
      endsAt: str(form, "endsAt") || undefined,
      status: str(form, "status", "draft"),
      items,
    });
  } catch {
    return;
  }
  refresh("/promotions");
}

export async function deletePromotionAction(form: FormData): Promise<void> {
  const session = await readSession();
  if (!session) redirect("/login");
  const id = str(form, "id");
  if (!id) return;
  try {
    await api.deletePromotion(session, id);
  } catch {
    return;
  }
  refresh("/promotions");
}

// ── Payouts ────────────────────────────────────────────────────────────

export async function updatePayoutAction(form: FormData): Promise<void> {
  const session = await readSession();
  if (!session) redirect("/login");
  const id = str(form, "id");
  const status = str(form, "status");
  if (!id || !status) return;
  try {
    await api.updatePayout(session, { id, status });
  } catch {
    return;
  }
  refresh("/payouts");
}

// ── Team ───────────────────────────────────────────────────────────────

export async function saveStaffAction(form: FormData): Promise<void> {
  const session = await readSession();
  if (!session) redirect("/login");
  const email = str(form, "email");
  const id = str(form, "id");
  if (!id && !email) return;
  try {
    await api.saveStaff(session, {
      id: id || undefined,
      name: str(form, "name"),
      email: email || undefined,
      role: str(form, "role", "admin"),
      password: str(form, "password") || undefined,
    });
  } catch {
    return;
  }
  refresh("/team");
}

export async function deleteStaffAction(form: FormData): Promise<void> {
  const session = await readSession();
  if (!session) redirect("/login");
  const id = str(form, "id");
  if (!id) return;
  try {
    await api.deleteStaff(session, id);
  } catch {
    return;
  }
  refresh("/team");
}

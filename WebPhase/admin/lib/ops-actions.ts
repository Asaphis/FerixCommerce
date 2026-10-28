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

function fail(path: string, error: unknown, fallback: string): never {
  const message = error instanceof api.ApiError ? error.message : fallback;
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

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
  const variants = lines(form, "variants").map((line) => {
    const [name, values] = line.split(":", 2);
    return { name: name.trim(), values: (values ?? "").split("|").map((value) => value.trim()).filter(Boolean) };
  }).filter((variant) => variant.name && variant.values.length);
  return {
    title: str(form, "title"),
    slug: str(form, "slug") || undefined,
    category: str(form, "category", "home"),
    brand: str(form, "brand"),
    description: str(form, "description"),
    bullets: lines(form, "bullets"),
    price: Number(form.get("price") ?? 0),
    compareAt: form.get("compareAt") ? Number(form.get("compareAt")) : null,
    stock: Number(form.get("stock") ?? 0),
    lowStockAt: Number(form.get("lowStockAt") ?? 8),
    sku: str(form, "sku"),
    status: str(form, "status", "draft"),
    featured: bool(form, "featured"),
    store: bool(form, "store"),
    marketplace: bool(form, "marketplace"),
    collections: csv(form, "collections"),
    tags: csv(form, "tags"),
    images: lines(form, "images"),
    variants,
    seoTitle: str(form, "seoTitle"),
    seoDescription: str(form, "seoDescription"),
    shipping_amount: form.get("shipping_amount") ? Number(form.get("shipping_amount")) : null,
    estimated_delivery_days: form.get("estimated_delivery_days") ? Number(form.get("estimated_delivery_days")) : null,
    package_weight: form.get("package_weight") ? Number(form.get("package_weight")) : null,
    package_dimensions: str(form, "package_dimensions"),
    shipping_origin: str(form, "shipping_origin"),
  };
}


/** Persist the complete section checkbox state for one authoritative product. */
async function syncProductSections(session: string, form: FormData, slug: string, title: string) {
  const current = await api.getProductSections(session, slug);
  const sections = current.available.filter((section) => {
    const key = `section__${section.documentId}__${section.sectionId}`;
    return form.get(key) === "on";
  }).map((section) => {
    const key = `section__${section.documentId}__${section.sectionId}`;
    const slot = `${section.documentId}__${section.sectionId}`;
    const price = str(form, `price${key}`);
    const quantity = str(form, `qty${key}`);
    // A section says what it asks a product for. A Flash Sale wants a price and
    // its own window; a plain row wants nothing. Anything the placement does not
    // own as a column travels in its config.
    const config: Record<string, string | number> = {};
    let placementPrice = "";
    let placementCompareAt = "";
    let startsAt = "";
    let endsAt = "";
    let position = "";
    for (const field of section.productConfigSchema ?? []) {
      const raw = str(form, `config__${slot}__${field.key}`);
      if (!raw) continue;
      if (field.key === "price") placementPrice = raw;
      else if (field.key === "compareAt") placementCompareAt = raw;
      else if (field.key === "startsAt") startsAt = raw;
      else if (field.key === "endsAt") endsAt = raw;
      else if (field.key === "position") position = raw;
      else config[field.key] = field.kind === "number" ? Number(raw) : raw;
    }
    return {
      documentId: section.documentId,
      sectionId: section.sectionId,
      sectionType: section.sectionType,
      title,
      ...(placementPrice || price ? { price: Number(placementPrice || price) } : {}),
      compareAt: placementCompareAt ? Number(placementCompareAt) : null,
      quantity: quantity ? Number(quantity) : null,
      position: position ? Number(position) : null,
      startsAt: startsAt || null,
      endsAt: endsAt || null,
      config,
    };
  });
  const visibleKeys = new Set(sections.map((row) => `${row.documentId}__${row.sectionId}`));
  for (const row of current.placements) {
    const key = `${row.documentId}__${row.sectionId}`;
    if (!visibleKeys.has(key)) sections.push({
      documentId: row.documentId,
      sectionId: row.sectionId,
      sectionType: row.sectionType,
      title,
      price: row.price ?? null,
      compareAt: row.compareAt ?? null,
      quantity: row.quantity ?? null,
      position: row.position ?? null,
      config: (row.config ?? {}) as Record<string, string | number>,
      startsAt: row.startsAt ?? null,
      endsAt: row.endsAt ?? null,
    });
  }
  await api.replaceProductSections(session, { slug, sections });
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
  if (chosen) payload.images = [...new Set([...(payload.images as string[]), chosen])];
  // Tick "remove" on an image and it is dropped; the rest keep their order.
  const dropImages = form.getAll("removeImage").map(String);
  if (dropImages.length) {
    payload.images = (payload.images as string[]).filter((url) => !dropImages.includes(url));
  }
  try {
    const created = await api.createCatalogProduct(session, payload as unknown as Record<string, unknown>);
    const product = created.product as { slug?: string; title?: string };
    if (!product.slug) throw new Error("The API did not return the created product slug.");
    await syncProductSections(session, form, product.slug, product.title || String(payload.title ?? ""));
  } catch (error) {
    fail("/catalog/new", error, "We could not create this product.");
  }
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
  if (chosen) payload.images = [...new Set([...(payload.images as string[]), chosen])];
  // Tick "remove" on an image and it is dropped; the rest keep their order.
  const dropImages = form.getAll("removeImage").map(String);
  if (dropImages.length) {
    payload.images = (payload.images as string[]).filter((url) => !dropImages.includes(url));
  }
  try {
    const updated = await api.updateCatalogProduct(session, { id, ...payload } as unknown as Record<string, unknown>);
    const product = updated.product as { slug?: string; title?: string };
    if (!product.slug) throw new Error("The API did not return the updated product slug.");
    await syncProductSections(session, form, product.slug, product.title || String(payload.title ?? ""));
  } catch (error) {
    fail(`/catalog/${encodeURIComponent(str(form, "slug"))}`, error, "We could not save this product.");
  }
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
  } catch (error) {
    fail("/catalog", error, "We could not remove this product.");
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
  } catch (error) {
    fail("/cms/banners", error, "We could not remove this banner.");
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
    const libraryUrl = str(form, "mediaLibraryUrl");
    await api.saveCategory(session, {
      slug: str(form, "slug") || undefined,
      name,
      blurb: str(form, "blurb"),
      glyph: str(form, "glyph", "Tag"),
      image: imageFileUrl || libraryUrl || str(form, "image") || str(form, "imageUrl") || undefined,
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
  } catch (error) {
    fail("/cms/categories", error, "We could not remove this department.");
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
  } catch (error) {
    fail("/cms/collections", error, "We could not remove this collection.");
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
  // What the library searches on: a label, and where the file came from.
  const label = str(form, "label");
  const tags = str(form, "tags");
  const originPage = str(form, "originPage");
  const originSection = str(form, "originSection");
  const library = { label, tags, originPage, originSection };
  if (!(file instanceof File && file.size > 0) && !url) return { error: "Choose a file or enter a hosted media URL." };
  try {
    if (file instanceof File && file.size > 0) {
      await api.uploadMedia(session, file, { kind, alt, folder, ...library });
    } else {
      await api.addMedia(session, { url, kind, alt, folder, ...library });
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
  } catch (error) {
    fail("/cms/media", error, "We could not remove this media asset.");
  }
  refresh("/cms/media");
}

// ── CMS: documents ─────────────────────────────────────────────────────

// ── Promotions ─────────────────────────────────────────────────────────

export async function savePromotionAction(form: FormData): Promise<void> {
  const session = await readSession();
  if (!session) redirect("/login");
  const name = str(form, "name");
  if (!name) redirect("/promotions?error=Enter%20a%20promotion%20name.");
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
  } catch (error) {
    fail("/promotions", error, "We could not save this promotion.");
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
  } catch (error) {
    fail("/promotions", error, "We could not remove this promotion.");
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
  } catch (error) {
    fail("/payouts", error, "Payout status could not be changed.");
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
      permissions: bool(form, "customPermissions") ? form.getAll("permissions").map(String) : undefined,
    });
  } catch (error) {
    fail("/team", error, "We could not save this team member.");
  }
  refresh("/team");
  redirect("/team?saved=1");
}

export async function deleteStaffAction(form: FormData): Promise<void> {
  const session = await readSession();
  if (!session) redirect("/login");
  const id = str(form, "id");
  if (!id) return;
  try {
    await api.deleteStaff(session, id);
  } catch (error) {
    fail("/team", error, "We could not remove this team member.");
  }
  refresh("/team");
  redirect("/team?saved=1");
}

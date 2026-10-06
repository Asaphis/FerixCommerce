"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import * as api from "@/lib/api";
import { readSession } from "@/lib/session";

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

export async function createCatalogProductAction(form: FormData): Promise<void> {
  const session = await readSession();
  if (!session) redirect("/login");
  const payload = productPayload(form);
  if (!payload.title) return;
  try {
    await api.createCatalogProduct(session, payload as unknown as Record<string, unknown>);
  } catch {
    return;
  }
  refresh("/catalog");
  redirect("/catalog");
}

export async function updateCatalogProductAction(form: FormData): Promise<void> {
  const session = await readSession();
  if (!session) redirect("/login");
  const id = str(form, "id");
  if (!id) return;
  try {
    await api.updateCatalogProduct(session, { id, ...productPayload(form) } as unknown as Record<string, unknown>);
  } catch {
    return;
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
  } catch {
    return;
  }
  refresh("/catalog");
  if (slug) redirect("/catalog");
}

// ── CMS: banners ───────────────────────────────────────────────────────

export async function saveBannerAction(form: FormData): Promise<void> {
  const session = await readSession();
  if (!session) redirect("/login");
  const headline = str(form, "headline");
  if (!headline) return;
  try {
    await api.saveBanner(session, {
      id: str(form, "id") || undefined,
      kind: str(form, "kind", "image"),
      eyebrow: str(form, "eyebrow"),
      headline,
      body: str(form, "body"),
      ctaLabel: str(form, "ctaLabel", "Shop now"),
      ctaHref: str(form, "ctaHref", "/browse"),
      secondaryLabel: str(form, "secondaryLabel") || null,
      secondaryHref: str(form, "secondaryHref") || null,
      mediaUrl: str(form, "mediaUrl"),
      videoUrl: str(form, "videoUrl") || null,
      accent: str(form, "accent", "#c8ff3d"),
      audience: str(form, "audience", "everyone"),
      active: bool(form, "active"),
      order: Number(form.get("order") ?? 99),
    });
  } catch {
    return;
  }
  refresh("/cms/banners");
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

export async function saveCategoryAction(form: FormData): Promise<void> {
  const session = await readSession();
  if (!session) redirect("/login");
  if (!str(form, "name")) return;
  try {
    await api.saveCategory(session, {
      slug: str(form, "slug") || undefined,
      name: str(form, "name"),
      blurb: str(form, "blurb"),
      glyph: str(form, "glyph", "Tag"),
      image: str(form, "image") || undefined,
      showInNav: bool(form, "showInNav"),
      showAsTile: bool(form, "showAsTile"),
      showAsText: bool(form, "showAsText"),
      visible: bool(form, "visible"),
      position: Number(form.get("position") ?? 0),
    });
  } catch {
    return;
  }
  refresh("/cms/categories");
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

export async function saveCollectionAction(form: FormData): Promise<void> {
  const session = await readSession();
  if (!session) redirect("/login");
  if (!str(form, "name")) return;
  try {
    await api.saveCollection(session, {
      slug: str(form, "slug") || undefined,
      name: str(form, "name"),
      blurb: str(form, "blurb"),
      image: str(form, "image") || undefined,
      visible: bool(form, "visible"),
      position: Number(form.get("position") ?? 0),
    });
  } catch {
    return;
  }
  refresh("/cms/collections");
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

export async function addMediaAction(form: FormData): Promise<void> {
  const session = await readSession();
  if (!session) redirect("/login");
  const url = str(form, "url");
  if (!url) return;
  try {
    await api.addMedia(session, {
      url,
      kind: str(form, "kind", "image"),
      alt: str(form, "alt"),
      folder: str(form, "folder", "platform"),
    });
  } catch {
    return;
  }
  refresh("/cms/media");
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

export async function saveHomepageAction(form: FormData): Promise<void> {
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
  } catch {
    return;
  }
  refresh("/cms/homepage");
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
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
  let result: Awaited<ReturnType<typeof api.merchantLogin>>;
  try {
    result = await api.merchantLogin({ email, password });
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
    await api.merchantLogout(session);
  } catch {
    // clearing locally is what matters
  }
  await clearSession();
  refresh();
  redirect("/login");
}

// ── Catalogue ──────────────────────────────────────────────────────────

export async function createProductAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await readSession();
  if (!session) redirect("/login");
  const title = String(formData.get("title") ?? "").trim();
  const price = Number(formData.get("price") ?? 0);
  if (title.length < 2) return { error: "Give the product a title." };
  if (price < 0) return { error: "Price cannot be negative." };
  const compareRaw = String(formData.get("compareAt") ?? "").trim();
  try {
    const created = await api.createProduct(session, {
      title,
      category: String(formData.get("category") ?? "electronics"),
      price,
      compareAt: compareRaw ? Number(compareRaw) : null,
      stock: Number(formData.get("stock") ?? 0),
      status: String(formData.get("status") ?? "draft"),
      store: formData.get("store") === "on",
      marketplace: formData.get("marketplace") === "on",
      description: String(formData.get("description") ?? "").trim() || null,
    });
    refresh("/products");
    redirect(`/products/${created.product.slug}`);
  } catch (error) {
    if (error instanceof api.ApiError) return { error: error.message };
    throw error;
  }
}

export async function saveProductAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await readSession();
  if (!session) redirect("/login");
  const id = String(formData.get("id") ?? "");
  const slug = String(formData.get("slug") ?? "");
  if (!id) return { error: "Which product?" };
  const title = String(formData.get("title") ?? "").trim();
  if (title.length < 2) return { error: "Give the product a title." };
  const compareRaw = String(formData.get("compareAt") ?? "").trim();
  try {
    await api.updateProduct(session, {
      id,
      title,
      category: String(formData.get("category") ?? "electronics"),
      price: Number(formData.get("price") ?? 0),
      compareAt: compareRaw ? Number(compareRaw) : 0,
      stock: Number(formData.get("stock") ?? 0),
      status: String(formData.get("status") ?? "draft"),
      store: formData.get("store") === "on",
      marketplace: formData.get("marketplace") === "on",
      description: String(formData.get("description") ?? "").trim(),
    });
  } catch (error) {
    return { error: error instanceof api.ApiError ? error.message : "We could not save that product." };
  }
  refresh(`/products/${slug}`);
  return { message: "Product saved. Your store and the marketplace both use this record." };
}

export async function deleteProductAction(formData: FormData): Promise<void> {
  const session = await readSession();
  const id = String(formData.get("id") ?? "");
  if (!session || !id) return;
  try {
    await api.deleteProduct(session, id);
  } catch {
    return;
  }
  refresh("/products");
  redirect("/products");
}

export async function adjustStockAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await readSession();
  if (!session) redirect("/login");
  const id = String(formData.get("id") ?? "");
  const delta = Number(formData.get("delta") ?? 0);
  if (!id || !delta) return { error: "Enter how many units to add or remove." };
  try {
    await api.adjustStock(session, {
      id,
      delta,
      reason: String(formData.get("reason") ?? "Manual adjustment"),
    });
  } catch (error) {
    return { error: error instanceof api.ApiError ? error.message : "We could not adjust that stock." };
  }
  refresh("/inventory");
  return { message: `Stock updated by ${delta > 0 ? "+" : ""}${delta} units.` };
}

// ── Orders ─────────────────────────────────────────────────────────────

export async function setOrderStatusAction(formData: FormData): Promise<void> {
  const session = await readSession();
  const id = String(formData.get("id") ?? "");
  const fulfillment = String(formData.get("fulfillment") ?? "");
  if (!session || !id || !fulfillment) return;
  const carrier = String(formData.get("carrier") ?? "").trim();
  const tracking = String(formData.get("tracking") ?? "").trim();
  try {
    await api.setOrderStatus(session, {
      id,
      fulfillment,
      carrier: carrier || null,
      tracking: tracking || null,
    });
  } catch {
    return;
  }
  refresh("/orders");
  revalidatePath(`/orders/${id}`);
}

// ── Settings ───────────────────────────────────────────────────────────

export async function saveSettingsAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await readSession();
  if (!session) redirect("/login");
  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 2) return { error: "Enter your store name." };
  try {
    await api.updateSettings(session, {
      name,
      tagline: String(formData.get("tagline") ?? "").trim(),
      about: String(formData.get("about") ?? "").trim(),
      location: String(formData.get("location") ?? "").trim(),
      customDomain: String(formData.get("customDomain") ?? "").trim(),
      template: String(formData.get("template") ?? "FERRUM"),
      accent: String(formData.get("accent") ?? "#e4572e"),
      lowStockAt: Number(formData.get("lowStockAt") ?? 25),
      payoutCadence: String(formData.get("payoutCadence") ?? "weekly"),
      marketplaceEnabled: formData.get("marketplaceEnabled") === "on",
      autoFulfil: formData.get("autoFulfil") === "on",
      orderEmails: formData.get("orderEmails") === "on",
    });
  } catch (error) {
    return { error: error instanceof api.ApiError ? error.message : "We could not save your settings." };
  }
  refresh("/settings");
  return { message: "Store settings saved." };
}

// ── Storefront (Store Design) ──────────────────────────────────────────

export async function saveStorefrontAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await readSession();
  if (!session) redirect("/login");

  const linkCount = Number(formData.get("navCount") ?? 0);
  const navigation: { label: string; href: string }[] = [];
  for (let index = 0; index < linkCount; index += 1) {
    const label = String(formData.get(`navLabel.${index}`) ?? "").trim();
    const href = String(formData.get(`navHref.${index}`) ?? "").trim();
    if (!label && !href) continue;
    if (!label) return { error: "Every navigation link needs a label." };
    if (!href) return { error: `Add a link for “${label}”.` };
    navigation.push({ label, href });
  }

  const sectionCount = Number(formData.get("sectionCount") ?? 0);
  const sections: Record<string, unknown>[] = [];
  for (let index = 0; index < sectionCount; index += 1) {
    const id = String(formData.get(`sectionId.${index}`) ?? "");
    if (!id) continue;
    sections.push({
      id,
      type: String(formData.get(`sectionType.${index}`) ?? "section"),
      title: String(formData.get(`sectionTitle.${index}`) ?? "").trim(),
      subtitle: String(formData.get(`sectionSubtitle.${index}`) ?? "").trim(),
      position: Number(formData.get(`sectionPosition.${index}`) ?? index + 1),
      visible: formData.get(`sectionVisible.${index}`) === "on",
    });
  }

  try {
    await api.saveStorefront(session, { navigation, sections });
  } catch (error) {
    return { error: error instanceof api.ApiError ? error.message : "We could not save your storefront." };
  }
  refresh("/store-design");
  return { message: "Storefront content saved. Publish when you want shoppers to see it." };
}

export async function publishStorefrontAction(_prev: FormState, _formData: FormData): Promise<FormState> {
  const session = await readSession();
  if (!session) redirect("/login");
  try {
    await api.publishStorefront(session);
  } catch (error) {
    return { error: error instanceof api.ApiError ? error.message : "We could not publish your storefront." };
  }
  refresh("/store-design");
  return { message: "Storefront published. Shoppers now see this version." };
}

// ── Media library ──────────────────────────────────────────────────────

export async function addMediaAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await readSession();
  if (!session) redirect("/login");
  const url = String(formData.get("url") ?? "").trim();
  const file = formData.get("file");
  const kind = String(formData.get("kind") ?? "image");
  const alt = String(formData.get("alt") ?? "").trim();
  const folder = String(formData.get("folder") ?? "store").trim() || "store";
  if (!(file instanceof File && file.size > 0) && !/^https?:\/\/\S+$/i.test(url)) {
    return { error: "Choose an image/video file or paste a full http:// or https:// URL." };
  }
  try {
    if (file instanceof File && file.size > 0) {
      await api.uploadMedia(session, file, { kind, alt, folder });
    } else {
      await api.addMedia(session, { url, kind, alt, folder });
    }
  } catch (error) {
    return { error: error instanceof api.ApiError ? error.message : "We could not add that asset." };
  }
  refresh("/media");
  return { message: "Asset added to your library." };
}

export async function removeMediaAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await readSession();
  if (!session) redirect("/login");
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Which asset?" };
  try {
    await api.removeMedia(session, id);
  } catch (error) {
    return { error: error instanceof api.ApiError ? error.message : "We could not remove that asset." };
  }
  refresh("/media");
  return { message: "Asset removed from your library." };
}

// ── Promotions ─────────────────────────────────────────────────────────

export async function createPromotionAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await readSession();
  if (!session) redirect("/login");
  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 2) return { error: "Give the promotion a name." };

  const productIds = formData.getAll("itemProduct").map((value) => String(value));
  const prices = formData.getAll("itemPrice").map((value) => String(value));
  const limits = formData.getAll("itemLimit").map((value) => String(value));
  const items = productIds
    .map((productId, index) => ({
      productId,
      salePrice: Number(prices[index] ?? 0),
      quantityLimit: Number(limits[index] ?? 0),
    }))
    .filter((item) => item.productId);

  if (!items.length) return { error: "Add at least one product to the promotion." };
  if (items.some((item) => !Number.isFinite(item.salePrice) || item.salePrice < 0)) {
    return { error: "Sale prices cannot be negative." };
  }

  const startsAt = String(formData.get("startsAt") ?? "").trim();
  const endsAt = String(formData.get("endsAt") ?? "").trim();
  try {
    await api.createPromotion(session, {
      name,
      headline: String(formData.get("headline") ?? "").trim(),
      bannerUrl: String(formData.get("bannerUrl") ?? "").trim(),
      startsAt: startsAt || null,
      endsAt: endsAt || null,
      status: String(formData.get("status") ?? "draft"),
      items,
    });
  } catch (error) {
    return { error: error instanceof api.ApiError ? error.message : "We could not create that promotion." };
  }
  refresh("/promotions");
  return { message: "Promotion created. Your product records are unchanged." };
}

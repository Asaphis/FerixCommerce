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

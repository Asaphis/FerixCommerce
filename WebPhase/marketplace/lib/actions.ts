"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import * as api from "@/lib/api";
import { clearSession, readCredentials, writeCartId, writeSession } from "@/lib/session";

export type FormState = { error?: string; message?: string };

async function withCart() {
  const { session, cartId } = await readCredentials();
  const id = cartId ?? `cart_${Math.random().toString(36).slice(2, 14)}`;
  if (!cartId) await writeCartId(id);
  return { session, cartId: id };
}

function refreshAll() {
  revalidatePath("/", "layout");
}

/**
 * Where to land after signing in. Only same-site paths are honoured, so a
 * crafted `return` value can never bounce a shopper to another domain.
 */
function safeReturn(formData: FormData, fallback: string): string {
  const raw = String(formData.get("return") ?? "").trim();
  if (!raw.startsWith("/") || raw.startsWith("//")) return fallback;
  return raw;
}

/**
 * Phone numbers are collected as a dialling code plus the local number, so what
 * reaches the backend is always "+234 803 411 2290". The code field is a
 * datalist, so a shopper can pick a suggestion or type their own.
 */
function combinePhone(formData: FormData): string {
  const number = String(formData.get("phone") ?? "").trim();
  if (!number) return "";
  const raw = String(formData.get("dial") ?? "").trim();
  if (!raw) return number;
  const digits = raw.replace(/\D/g, "");
  return digits ? `+${digits} ${number}`.replace(/\s+/g, " ") : number;
}

// ── Accounts ───────────────────────────────────────────────────────────

export async function registerAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (name.length < 2) return { error: "Enter your full name." };
  if (!email.includes("@")) return { error: "Enter a valid email address." };
  if (password.length < 8) return { error: "Your password needs at least 8 characters." };

  const creds = await withCart();
  let result: Awaited<ReturnType<typeof api.register>>;
  try {
    result = await api.register({ name, email, password }, creds);
  } catch (error) {
    return { error: error instanceof api.ApiError ? error.message : "We could not create your account." };
  }
  await writeSession(result.token);
  await writeCartId(result.cartId);
  refreshAll();
  redirect(safeReturn(formData, "/account"));
}

export async function loginAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Enter your email and password." };

  const creds = await withCart();
  let result: Awaited<ReturnType<typeof api.login>>;
  try {
    result = await api.login({ email, password }, creds);
  } catch (error) {
    return { error: error instanceof api.ApiError ? error.message : "We could not sign you in." };
  }
  await writeSession(result.token);
  await writeCartId(result.cartId);
  refreshAll();
  redirect(safeReturn(formData, "/account"));
}

export async function signOutAction(): Promise<void> {
  const creds = await readCredentials();
  try {
    await api.logout(creds);
  } catch {
    // signing out locally is what matters
  }
  await clearSession();
  refreshAll();
  redirect("/");
}

// ── Cart ───────────────────────────────────────────────────────────────

export async function addToCartAction(formData: FormData): Promise<FormState> {
  const productId = String(formData.get("productId") ?? "");
  if (!productId) return { error: "Choose a product before adding it." };
  // A product can have several variant groups (size, colour); they arrive as
  // variant_<group> fields and are combined into the line's variant label.
  const chosen = Array.from(formData.entries())
    .filter(([field]) => field.startsWith("variant_"))
    .map(([, value]) => String(value))
    .filter(Boolean);
  const single = formData.get("variant");
  const variant = chosen.length ? chosen.join(" / ") : single ? String(single) : null;
  const qty = Number(formData.get("qty") ?? 1);
  const creds = await withCart();
  try {
    const cart = await api.addCartItem({ productId, variant, qty: qty > 0 ? qty : 1 }, creds);
    if (cart.cartId) await writeCartId(cart.cartId);
  } catch (error) {
    return { error: error instanceof api.ApiError ? error.message : "We could not add that item. Please try again." };
  }
  refreshAll();
  return { message: "Added to your cart." };
}

/** Progressive-enhancement adapter for forms that do not render action state. */
export async function addToCartPageAction(formData: FormData): Promise<void> {
  await addToCartAction(formData);
}

export async function setQtyAction(formData: FormData): Promise<void> {
  const key = String(formData.get("key") ?? "");
  const qty = Number(formData.get("qty") ?? 1);
  if (!key) redirect("/cart?error=That%20cart%20line%20is%20no%20longer%20available.");
  const creds = await withCart();
  try {
    if (qty <= 0) {
      await api.removeCartItem({ key }, creds);
    } else {
      await api.setCartQty({ key, qty }, creds);
    }
  } catch (error) {
    redirect(`/cart?error=${encodeURIComponent(error instanceof api.ApiError ? error.message : "We could not update that quantity.")}`);
  }
  refreshAll();
}

export async function removeLineAction(formData: FormData): Promise<void> {
  const key = String(formData.get("key") ?? "");
  if (!key) redirect("/cart?error=That%20cart%20line%20is%20no%20longer%20available.");
  const creds = await withCart();
  try {
    await api.removeCartItem({ key }, creds);
  } catch (error) {
    redirect(`/cart?error=${encodeURIComponent(error instanceof api.ApiError ? error.message : "We could not remove that item.")}`);
  }
  refreshAll();
}

export async function saveForLaterAction(formData: FormData): Promise<void> {
  const key = String(formData.get("key") ?? "");
  if (!key) return;
  const creds = await readCredentials();
  if (!creds.session) redirect(`/login?return=${encodeURIComponent("/cart")}`);
  await api.saveForLater({ key }, creds);
  refreshAll();
}

export async function toggleWishlistAction(formData: FormData): Promise<void> {
  const productId = String(formData.get("productId") ?? "");
  const back = String(formData.get("back") ?? "/account/wishlist");
  if (!productId) redirect(`${back}?error=Choose%20a%20product%20before%20saving%20it.`);
  const creds = await readCredentials();
  // Keep the way back. A bare /login stranded a guest on a page they could not
  // leave, with the product they were saving lost.
  if (!creds.session) redirect(`/login?return=${encodeURIComponent(back)}`);
  try {
    await api.toggleWishlist(productId, creds);
  } catch (error) {
    redirect(`${back}?error=${encodeURIComponent(error instanceof api.ApiError ? error.message : "We could not update your saved items.")}`);
  }
  revalidatePath(back);
  refreshAll();
}

/** Follow or unfollow a seller. Only signed-in users can follow; guests are
 * redirected to sign in and land back on the store page they came from. */
export async function toggleFollowAction(formData: FormData): Promise<void> {
  const slug = String(formData.get("slug") ?? "");
  const follow = String(formData.get("follow") ?? "") === "true";
  if (!slug) return;
  const creds = await readCredentials();
  if (!creds.session) redirect(`/login?return=${encodeURIComponent(`/store/${slug}`)}`);
  try {
    if (follow) {
      await api.followSeller(slug, creds);
    } else {
      await api.unfollowSeller(slug, creds);
    }
  } catch (error) {
    const msg = error instanceof api.ApiError ? error.message : "We could not update your following.";
    redirect(`/store/${slug}?error=${encodeURIComponent(msg)}`);
  }
  revalidatePath(`/store/${slug}`, "page");
  revalidatePath("/", "layout");
  revalidatePath("/account/following", "page");
}

export async function reorderAction(formData: FormData): Promise<void> {
  const orderId = String(formData.get("orderId") ?? "");
  if (!orderId) return;
  const creds = await withCart();
  await api.reorder(orderId, creds);
  refreshAll();
  redirect("/cart");
}

// ── Addresses ──────────────────────────────────────────────────────────

export async function saveAddressAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const creds = await readCredentials();
  if (!creds.session) redirect("/login");
  const id = String(formData.get("id") ?? "");
  const body = {
    label: String(formData.get("label") ?? "Home") || "Home",
    name: String(formData.get("name") ?? "").trim(),
    phone: combinePhone(formData),
    line1: String(formData.get("line1") ?? "").trim(),
    line2: String(formData.get("line2") ?? "").trim() || null,
    city: String(formData.get("city") ?? "").trim(),
    region: String(formData.get("region") ?? "").trim(),
    postcode: String(formData.get("postcode") ?? "").trim(),
    country: String(formData.get("country") ?? "").trim(),
    isDefault: formData.get("isDefault") === "on",
  };
  if (!body.name || !body.line1 || !body.city || !body.country) {
    return { error: "Name, street, city and country are all needed." };
  }
  try {
    if (id) await api.updateAddress({ ...body, id }, creds);
    else await api.addAddress(body, creds);
  } catch (error) {
    return { error: error instanceof api.ApiError ? error.message : "We could not save that address." };
  }
  revalidatePath("/account/addresses");
  revalidatePath("/checkout");
  return { message: id ? "Address updated." : "Address saved." };
}

export async function deleteAddressAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const creds = await readCredentials();
  if (!creds.session || !id) return;
  await api.deleteAddress(id, creds);
  revalidatePath("/account/addresses");
  revalidatePath("/checkout");
}

export async function setDefaultAddressAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const creds = await readCredentials();
  if (!creds.session || !id) return;
  await api.updateAddress({ id, isDefault: true }, creds);
  revalidatePath("/account/addresses");
  revalidatePath("/checkout");
}

// ── Reviews ────────────────────────────────────────────────────────────

export async function saveReviewAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const creds = await readCredentials();
  if (!creds.session) redirect("/login");
  const id = String(formData.get("id") ?? "");
  const productId = String(formData.get("productId") ?? "");
  const rating = Number(formData.get("rating") ?? 5);
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  if (title.length < 2) return { error: "Give your review a short headline." };
  if (body.length < 4) return { error: "Tell other shoppers a little more." };
  try {
    if (id) await api.updateReview({ id, rating, title, body }, creds);
    else if (productId) await api.createReview({ productId, rating, title, body }, creds);
    else return { error: "Pick a product to review." };
  } catch (error) {
    return { error: error instanceof api.ApiError ? error.message : "We could not save that review." };
  }
  revalidatePath("/account/reviews");
  return { message: id ? "Review updated." : "Thank you — your review is published." };
}

export async function deleteReviewAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const creds = await readCredentials();
  if (!creds.session || !id) return;
  await api.deleteReview(id, creds);
  revalidatePath("/account/reviews");
}

// ── Settings ───────────────────────────────────────────────────────────

export async function saveSettingsAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const creds = await readCredentials();
  if (!creds.session) redirect("/login");
  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 2) return { error: "Enter your name." };
  try {
    await api.updateSettings(
      {
        name,
        phone: combinePhone(formData),
        language: String(formData.get("language") ?? "English"),
        currency: String(formData.get("currency") ?? "USD"),
        marketingEmails: formData.get("marketingEmails") === "on",
        orderEmails: formData.get("orderEmails") === "on",
        smsUpdates: formData.get("smsUpdates") === "on",
        profilePublic: formData.get("profilePublic") === "on",
      },
      creds,
    );
  } catch (error) {
    return { error: error instanceof api.ApiError ? error.message : "We could not save your settings." };
  }
  refreshAll();
  return { message: "Settings saved." };
}

/**
 * The backend PATCH merges only the fields it receives, so each form sends just
 * its own fields — saving a profile change can never reset notification choices.
 */
export async function saveProfileAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const creds = await readCredentials();
  if (!creds.session) redirect("/login");
  const name = String(formData.get("name") ?? "").trim();
  const phone = combinePhone(formData);
  if (name.length < 2) return { error: "Enter your full name." };
  try {
    await api.updateSettings({ name, phone }, creds);
  } catch (error) {
    return { error: error instanceof api.ApiError ? error.message : "We could not save your details." };
  }
  refreshAll();
  return { message: "Profile updated." };
}

export async function savePreferencesAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const creds = await readCredentials();
  if (!creds.session) redirect("/login");
  try {
    await api.updateSettings(
      {
        language: String(formData.get("language") ?? "English"),
        currency: String(formData.get("currency") ?? "USD"),
        marketingEmails: formData.get("marketingEmails") === "on",
        orderEmails: formData.get("orderEmails") === "on",
        smsUpdates: formData.get("smsUpdates") === "on",
        profilePublic: formData.get("profilePublic") === "on",
      },
      creds,
    );
  } catch (error) {
    return { error: error instanceof api.ApiError ? error.message : "We could not save your preferences." };
  }
  refreshAll();
  return { message: "Preferences saved." };
}

// ── Checkout ───────────────────────────────────────────────────────────

export async function placeOrderAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const creds = await readCredentials();
  if (!creds.session) redirect("/login");
  const addressId = String(formData.get("addressId") ?? "");
  if (!addressId) return { error: "Choose where this order should be delivered." };
  let order: Awaited<ReturnType<typeof api.placeOrder>>;
  try {
    order = await api.placeOrder(
      {
        addressId,
        shippingMethod: String(formData.get("shippingMethod") ?? "standard"),
        paymentMethod: String(formData.get("paymentMethod") ?? "card"),
        note: String(formData.get("note") ?? "").trim() || undefined,
      },
      creds,
    );
  } catch (error) {
    return { error: error instanceof api.ApiError ? error.message : "We could not place that order." };
  }
  refreshAll();
  redirect(`/account/orders/${order.order.id}?placed=1`);
}

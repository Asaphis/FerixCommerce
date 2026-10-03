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

import { redirect } from "next/navigation";
import * as api from "@/lib/api";
import { readSession } from "@/lib/session";

/** The merchant signed in on this browser, or null. */
export async function currentMerchant(): Promise<api.Merchant | null> {
  const session = await readSession();
  if (!session) return null;
  try {
    return (await api.merchantMe(session)).merchant;
  } catch {
    return null;
  }
}

/** Sends anyone who is not signed in to the sign-in page. */
export async function requireMerchant(): Promise<{ session: string; merchant: api.Merchant }> {
  const session = await readSession();
  if (!session) redirect("/login");
  let merchant: api.Merchant | null = null;
  try {
    merchant = (await api.merchantMe(session)).merchant;
  } catch {
    redirect("/login");
  }
  if (!merchant) redirect("/login");
  return { session, merchant };
}

export function explain(error: unknown): string {
  if (error instanceof api.ApiError) return error.message;
  return "Something went wrong talking to the store backend. Please try again.";
}

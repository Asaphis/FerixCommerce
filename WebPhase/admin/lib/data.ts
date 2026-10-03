import { redirect } from "next/navigation";
import * as api from "@/lib/api";
import { readSession } from "@/lib/session";

/** The operator signed in on this browser, or null. */
export async function currentAdmin(): Promise<api.Admin | null> {
  const session = await readSession();
  if (!session) return null;
  try {
    return (await api.adminMe(session)).admin;
  } catch {
    return null;
  }
}

/** Sends anyone who is not signed in to the sign-in page. */
export async function requireAdmin(): Promise<{ session: string; admin: api.Admin }> {
  const session = await readSession();
  if (!session) redirect("/login");
  let admin: api.Admin | null = null;
  try {
    admin = (await api.adminMe(session)).admin;
  } catch {
    redirect("/login");
  }
  if (!admin) redirect("/login");
  return { session, admin };
}

export function explain(error: unknown): string {
  if (error instanceof api.ApiError) return error.message;
  return "Something went wrong talking to the platform backend. Please try again.";
}

import { redirect } from "next/navigation";
import * as api from "@/lib/api";
import { readCredentials } from "@/lib/session";

/** Header needs the shopper and the cart count on every page. */
export async function headerState(): Promise<{ user: api.AccountUser | null; cartCount: number }> {
  const creds = await readCredentials();
  const [user, cart] = await Promise.all([
    creds.session ? api.getUser(creds).then((r) => r.user).catch(() => null) : Promise.resolve(null),
    api.getCart(creds).catch(() => null),
  ]);
  return { user, cartCount: cart?.count ?? 0 };
}

export async function currentUser(): Promise<api.AccountUser | null> {
  const creds = await readCredentials();
  if (!creds.session) return null;
  try {
    return (await api.getUser(creds)).user;
  } catch {
    return null;
  }
}

/**
 * Sends anyone who cannot be verified to the sign-in page.
 *
 * Anything unexpected used to be rethrown, which in a production build replaces
 * the whole page with "This page stopped loading" and a reference number the
 * shopper cannot act on. An account page is never useful without a verified
 * session, so every failure path now ends at sign-in, carrying the way back:
 *
 *   no session      -> sign in
 *   expired session -> sign in
 *   unreachable API -> sign in
 *   anything else   -> sign in
 */
export async function requireAccount(): Promise<api.Account> {
  const creds = await readCredentials();
  const signIn = () => redirect("/login?return=%2Faccount");

  if (!creds.session) signIn();

  try {
    return await api.getAccount(creds);
  } catch (error) {
    if (error instanceof api.ApiError && error.status === 401) signIn();
    console.error("[ferixas] account could not be loaded:", error);
    signIn();
    throw error; // unreachable: signIn always redirects, keeps the return type honest
  }
}

/** Product ids this shopper has saved, for the heart on every card. */
export async function savedIds(): Promise<string[]> {
  const creds = await readCredentials();
  if (!creds.session) return [];
  try {
    const { wishlist } = await api.getWishlist(creds);
    return wishlist.map((product) => product.id);
  } catch {
    return [];
  }
}

export async function cartState(): Promise<api.Cart> {
  const creds = await readCredentials();
  return api.getCart(creds);
}

/** Turns a thrown API error into something a page can show. */
export function explain(error: unknown): string {
  if (error instanceof api.ApiError) return error.message;
  return "Something went wrong talking to the store. Please try again.";
}

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

/** Sends anyone who is not signed in to the sign-in page. */
export async function requireAccount(): Promise<api.Account> {
  const creds = await readCredentials();
  if (!creds.session) redirect("/login");
  try {
    return await api.getAccount(creds);
  } catch (error) {
    if (error instanceof api.ApiError && error.status === 401) redirect("/login");
    throw error;
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

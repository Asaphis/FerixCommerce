import { cookies } from "next/headers";

const SESSION = "ferix_session";
const CART = "ferix_cart";

const base = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  secure: process.env.NODE_ENV === "production",
};

/** The signed-in shopper's session token, if there is one. */
export async function readSession(): Promise<string | null> {
  const store = await cookies();
  return store.get(SESSION)?.value ?? null;
}

export async function writeSession(token: string, maxAge = 60 * 60 * 24 * 30) {
  const store = await cookies();
  store.set({ name: SESSION, value: token, ...base, maxAge });
}

export async function clearSession() {
  const store = await cookies();
  store.delete(SESSION);
}

/** The cart a visitor is using. Signed-in shoppers get theirs from the account. */
export async function readCartId(): Promise<string | null> {
  const store = await cookies();
  return store.get(CART)?.value ?? null;
}

export async function writeCartId(cartId: string) {
  const store = await cookies();
  store.set({ name: CART, value: cartId, ...base, maxAge: 60 * 60 * 24 * 90 });
}

export async function readCredentials(): Promise<{ session: string | null; cartId: string | null }> {
  const store = await cookies();
  return {
    session: store.get(SESSION)?.value ?? null,
    cartId: store.get(CART)?.value ?? null,
  };
}

import { cookies } from "next/headers";

const SESSION = "ferix_merchant";

const base = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  secure: process.env.NODE_ENV === "production",
};

/** The signed-in merchant's session token, if there is one. */
export async function readSession(): Promise<string | null> {
  const store = await cookies();
  return store.get(SESSION)?.value ?? null;
}

export async function writeSession(token: string, maxAge = 60 * 60 * 24 * 14) {
  const store = await cookies();
  store.set({ name: SESSION, value: token, ...base, maxAge });
}

export async function clearSession() {
  const store = await cookies();
  store.delete(SESSION);
}

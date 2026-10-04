import { redirect } from "next/navigation";

/**
 * The order detail page lives inside the account area at
 * `/account/orders/[id]`, so every order keeps its place in the account
 * navigation. This route is kept as a permanent redirect for older links.
 */
export default async function LegacyOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/account/orders/${id}`);
}

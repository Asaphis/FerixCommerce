import type { Order } from "@/lib/api";

/**
 * Order presentation rules, in one place.
 *
 * The backend owns order state; this file only turns `fulfillment` into the
 * label, tone and tracking ladder the customer sees. The dashboard, the order
 * list and the order detail page all read from here so a status can never mean
 * two different things in two different screens.
 */

export type PillTone = "neutral" | "success" | "warn" | "info" | "danger" | "ember";

const LABELS: Record<string, string> = {
  pending: "Awaiting payment",
  paid: "Paid",
  processing: "Processing",
  packed: "Packed",
  shipped: "In transit",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

const TONES: Record<string, PillTone> = {
  pending: "warn",
  paid: "info",
  processing: "warn",
  packed: "info",
  shipped: "info",
  out_for_delivery: "info",
  delivered: "success",
  cancelled: "neutral",
  refunded: "neutral",
};

export const statusLabel = (fulfillment: string) =>
  LABELS[fulfillment] ?? fulfillment.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export const statusTone = (fulfillment: string): PillTone => TONES[fulfillment] ?? "neutral";

/** The plain-language line that leads the tracking card. */
export function statusHeadline(order: Order): string {
  switch (order.fulfillment) {
    case "pending":
      return "Waiting for your payment";
    case "processing":
      return "The seller is preparing your parcel";
    case "packed":
      return "Packed and waiting for the courier";
    case "shipped":
    case "out_for_delivery":
      return "On its way to you";
    case "delivered":
      return "Delivered";
    case "cancelled":
      return "This order was cancelled";
    case "refunded":
      return "This order was refunded";
    default:
      return "Order update";
  }
}

/** Stage ladder: index 0..4, complete when its index is below the current stage. */
export const STAGES = ["Order placed", "Payment confirmed", "Packed by seller", "In transit", "Delivered"] as const;

const STAGE_INDEX: Record<string, number> = {
  pending: 0,
  paid: 1,
  processing: 2,
  packed: 2,
  shipped: 3,
  out_for_delivery: 3,
  delivered: 4,
  cancelled: 0,
  refunded: 0,
};

export type Stage = { label: string; at: string | null; state: "done" | "current" | "todo" };

export function orderStages(order: Order): Stage[] {
  const current = STAGE_INDEX[order.fulfillment] ?? 0;
  const stamp = new Map<string, string | null>();
  for (const entry of order.timeline ?? []) stamp.set(entry.label.toLowerCase(), entry.at);

  return STAGES.map((label, index) => {
    const match = [...stamp.entries()].find(([key]) => key.includes(label.split(" ")[0].toLowerCase()));
    const state: Stage["state"] = index < current ? "done" : index === current ? "current" : "todo";
    return { label, at: match?.[1] ?? null, state };
  });
}

/** Newest first — the backend returns seeded orders oldest-first. */
export const byNewest = (orders: Order[]) =>
  [...orders].sort((a, b) => new Date(b.placedAt).getTime() - new Date(a.placedAt).getTime());

/** The order the shopper most likely opened the account to check on. */
export function activeOrder(orders: Order[]): Order | null {
  const live = byNewest(orders).filter((order) => !["delivered", "cancelled", "refunded"].includes(order.fulfillment));
  return live[0] ?? byNewest(orders)[0] ?? null;
}

export function itemsSummary(order: Order): string {
  if (!order.items.length) return "No items";
  const [first, ...rest] = order.items;
  return rest.length ? `${first.title} +${rest.length} more` : first.title;
}

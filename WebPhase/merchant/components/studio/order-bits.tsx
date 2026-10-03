export function statusTone(status: string) {
  if (status === "delivered") return "success" as const;
  if (status === "shipped") return "info" as const;
  if (status === "cancelled") return "danger" as const;
  return "warn" as const;
}

export function carriersLabel(carrier: string | null) {
  return carrier ?? "Carrier not set";
}

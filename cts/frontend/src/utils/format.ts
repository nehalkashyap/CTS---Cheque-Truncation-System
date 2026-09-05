export function formatINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatTime(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
}

export function statusLabel(status: string): string {
  const map: Record<string, string> = {
    processing: "Processing",
    accepted: "Accepted",
    rejected: "Rejected",
    manual_review: "Manual review",
  };
  return map[status] || status;
}

export function reasonLabel(reason: string): string {
  if (!reason) return "";
  return reason
    .split("_")
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ");
}

import { CheckCircle2, Clock, XCircle, AlertCircle } from "lucide-react";
import { statusLabel } from "../utils/format";

const STYLES: Record<string, string> = {
  processing: "bg-warn/10 text-warn border-warn/30",
  accepted: "bg-success/10 text-success border-success/30",
  rejected: "bg-danger/10 text-danger border-danger/30",
  manual_review: "bg-mist/10 text-mist border-mist/30",
};

const ICONS: Record<string, JSX.Element> = {
  processing: <Clock size={12} />,
  accepted: <CheckCircle2 size={12} />,
  rejected: <XCircle size={12} />,
  manual_review: <AlertCircle size={12} />,
};

export default function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium font-mono ${
        STYLES[status] || "bg-ink-700 text-mist border-ink-border"
      }`}
    >
      {ICONS[status]}
      {statusLabel(status)}
    </span>
  );
}

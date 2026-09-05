import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { CheckCircle2, XCircle, AlertCircle, Headset, Sparkles } from "lucide-react";
import { api } from "../lib/api";
import type { Cheque } from "../types";
import { formatINR, formatDate, formatTime, reasonLabel } from "../utils/format";
import StatusBadge from "../components/StatusBadge";
import Skeleton from "../components/Skeleton";
import { useToast } from "../context/ToastContext";

interface TimelineItem { label: string; done: boolean; score?: number; passed?: boolean }

export default function ChequeDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { show } = useToast();
  const [cheque, setCheque] = useState<Cheque | null>(null);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [breakdown, setBreakdown] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!id) return;
    api.get<Cheque>(`/cheques/${id}`).then(setCheque);
    api
      .get<{ timeline: TimelineItem[]; breakdown: Record<string, number> }>(`/cheques/${id}/timeline`)
      .then((data) => {
        setTimeline(data.timeline);
        setBreakdown(data.breakdown);
      });
  }, [id]);

  async function escalate() {
    if (!cheque) return;
    try {
      await api.post("/support/tickets", {
        cheque_id: cheque.id,
        reason: cheque.rejection_reason ? reasonLabel(cheque.rejection_reason) : "General assistance",
      });
      show("Support ticket created. A CTS agent will respond shortly.", "success");
    } catch {
      show("Couldn't create a ticket right now.", "error");
    }
  }

  if (!cheque) {
    return (
      <div className="flex flex-col gap-4 max-w-2xl mx-auto">
        <Skeleton className="h-40" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  const rejected = cheque.status === "rejected";
  const manual = cheque.status === "manual_review";

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6 pb-10">
      {rejected && (
        <div className="ledger-card border-danger/30 bg-danger/5 p-5 flex items-start gap-3">
          <AlertCircle size={18} className="text-danger shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-cream mb-1">Cheque verification requires attention</p>
            <p className="text-sm text-mist mb-1">Cheque {cheque.display_id} was rejected.</p>
            <p className="text-xs text-mist mb-3">Reason: {reasonLabel(cheque.rejection_reason)}</p>
            <div className="flex gap-2">
              <button onClick={() => navigate("/cheques/add")} className="btn-secondary !text-xs !px-3 !py-1.5">Upload Again</button>
              <button onClick={escalate} className="btn-secondary !text-xs !px-3 !py-1.5">
                <Headset size={12} /> Ask CTS Assistant
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="ledger-card p-6 sm:p-7">
        <div className="flex items-start justify-between mb-5">
          <div>
            <p className="font-mono text-sm text-gold-500 mb-1">{cheque.display_id}</p>
            <p className="font-display text-3xl text-cream mono-figure">{formatINR(cheque.amount_numeric)}</p>
            <p className="text-sm text-mist mt-1">{cheque.bank_name}</p>
          </div>
          <StatusBadge status={cheque.status} />
        </div>

        <div className="ledger-divider pt-5 mb-5">
          <p className="text-xs text-mist mb-3">Timeline</p>
          <div className="flex flex-col gap-4">
            {timeline.length > 0 ? (
              timeline.map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  {item.done ? (
                    <CheckCircle2 size={16} className="text-success shrink-0 mt-0.5" />
                  ) : (
                    <span className="w-4 h-4 rounded-full border border-ink-border shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p className="text-sm text-cream">{item.label}</p>
                    <p className="text-xs text-mist font-mono">{cheque.processed_at ? formatTime(cheque.processed_at) : ""}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex items-start gap-3">
                <span className="w-4 h-4 rounded-full border-2 border-warn border-t-transparent animate-spin shrink-0 mt-0.5" />
                <p className="text-sm text-mist">Still processing — check back shortly.</p>
              </div>
            )}
          </div>
        </div>

        {Object.keys(breakdown).length > 0 && (
          <div className="ledger-divider pt-5">
            <p className="text-xs text-mist mb-3">Verification breakdown</p>
            <div className="flex flex-col gap-2.5">
              {(Object.entries(breakdown) as [string, number][]).map(([label, score]) => (
                <div key={label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-mist">{label}</span>
                    <span className="font-mono text-cream">{score.toFixed(0)}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-ink-800 overflow-hidden">
                    <div
                      className={`h-full ${score >= 70 ? "bg-success" : score >= 50 ? "bg-warn" : "bg-danger"}`}
                      style={{ width: `${Math.min(100, score)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-2.5">
        <Link to="/dashboard" className="btn-secondary flex-1">Back to Dashboard</Link>
        {(rejected || manual) && (
          <button onClick={escalate} className="btn-primary flex-1">
            <Sparkles size={15} /> Get help
          </button>
        )}
      </div>
    </div>
  );
}

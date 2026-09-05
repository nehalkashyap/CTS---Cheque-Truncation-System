import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, PlusCircle } from "lucide-react";
import { api } from "../lib/api";
import type { Cheque } from "../types";
import { formatINR } from "../utils/format";
import Skeleton from "../components/Skeleton";
import EmptyState from "../components/EmptyState";

export default function Processing() {
  const [cheques, setCheques] = useState<Cheque[] | null>(null);

  useEffect(() => {
    api.get<Cheque[]>("/cheques?status=progress").then(setCheques);
  }, []);

  return (
    <div className="flex flex-col gap-5 pb-10">
      <div>
        <h2 className="font-display text-2xl text-cream mb-1.5">Processing</h2>
        <p className="text-sm text-mist">Cheques currently being evaluated by CTS.</p>
      </div>

      {cheques === null ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {[0, 1].map((i) => <Skeleton key={i} className="h-40" />)}
        </div>
      ) : cheques.length === 0 ? (
        <EmptyState
          icon={<Loader2 size={20} />}
          title="Nothing in progress"
          description="Cheques you deposit will show up here while CTS verifies them."
          actionLabel="Deposit a Cheque"
          actionTo="/cheques/add"
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {cheques.map((c) => (
            <Link key={c.id} to={`/cheques/${c.id}`} className="ledger-card p-5 hover:border-gold-500/40 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-sm text-cream">{c.display_id}</span>
                <span className={`flex items-center gap-1 text-xs font-mono ${c.status === "manual_review" ? "text-gold-500" : "text-warn"}`}>
                  {c.status === "manual_review" ? "Manual review" : <><Loader2 size={12} className="animate-spin" /> Processing</>}
                </span>
              </div>
              <p className="text-sm text-mist mb-1">{c.bank_name}</p>
              <p className="font-mono text-lg text-cream mb-4">{formatINR(c.amount_numeric)}</p>
              <div className="flex flex-col gap-1.5 text-xs text-mist mb-3">
                <StepRow label="Image analysis" done />
                <StepRow label="MICR extraction" done />
                <StepRow label="Signature check" />
                <StepRow label="Amount validation" />
              </div>
              <div className="h-1.5 rounded-full bg-ink-800 overflow-hidden">
                <div className="h-full bg-gold-500" style={{ width: "45%" }} />
              </div>
            </Link>
          ))}
        </div>
      )}

      <Link to="/cheques/add" className="btn-secondary self-start">
        <PlusCircle size={15} /> Deposit another cheque
      </Link>
    </div>
  );
}

function StepRow({ label, done = false }: { label: string; done?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span>{label}</span>
      <span className={done ? "text-success" : "text-mist/50"}>{done ? "✓" : "◌"}</span>
    </div>
  );
}

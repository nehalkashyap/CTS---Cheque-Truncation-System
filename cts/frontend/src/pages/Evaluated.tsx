import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search, ListChecks } from "lucide-react";
import { api } from "../lib/api";
import type { Cheque } from "../types";
import { formatINR, formatDate } from "../utils/format";
import StatusBadge from "../components/StatusBadge";
import Skeleton from "../components/Skeleton";
import EmptyState from "../components/EmptyState";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "accepted", label: "Accepted" },
  { key: "rejected", label: "Rejected" },
  { key: "manual_review", label: "Manual Review" },
];

const SORTS = [
  { key: "newest", label: "Newest" },
  { key: "oldest", label: "Oldest" },
  { key: "highest", label: "Highest amount" },
  { key: "lowest", label: "Lowest amount" },
];

export default function Evaluated() {
  const [cheques, setCheques] = useState<Cheque[] | null>(null);
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("newest");
  const [query, setQuery] = useState("");

  useEffect(() => {
    api.get<Cheque[]>("/cheques").then((all) => setCheques(all.filter((c) => c.status !== "processing")));
  }, []);

  const visible = useMemo(() => {
    if (!cheques) return [];
    let list = cheques;
    if (filter !== "all") list = list.filter((c) => c.status === filter);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (c) =>
          c.display_id.toLowerCase().includes(q) ||
          c.bank_name.toLowerCase().includes(q) ||
          String(c.amount_numeric).includes(q)
      );
    }
    const sorted = [...list];
    if (sort === "newest") sorted.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
    if (sort === "oldest") sorted.sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at));
    if (sort === "highest") sorted.sort((a, b) => b.amount_numeric - a.amount_numeric);
    if (sort === "lowest") sorted.sort((a, b) => a.amount_numeric - b.amount_numeric);
    return sorted;
  }, [cheques, filter, sort, query]);

  return (
    <div className="flex flex-col gap-5 pb-10">
      <div>
        <h2 className="font-display text-2xl text-cream mb-1.5">Evaluated</h2>
        <p className="text-sm text-mist">Your completed cheque history.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="flex gap-1 bg-ink-900 border border-ink-border rounded-sm p-1 w-fit overflow-x-auto">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 text-xs rounded-sm whitespace-nowrap transition-colors ${
                filter === f.key ? "bg-gold-500 text-ink-950 font-semibold" : "text-mist hover:text-cream"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-mist" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search cheque, bank, amount…"
              className="input-field pl-9"
            />
          </div>
          <select value={sort} onChange={(e) => setSort(e.target.value)} className="input-field w-auto">
            {SORTS.map((s) => (
              <option key={s.key} value={s.key}>{s.label}</option>
            ))}
          </select>
        </div>
      </div>

      {cheques === null ? (
        <div className="flex flex-col gap-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-16" />)}</div>
      ) : visible.length === 0 ? (
        <EmptyState
          icon={<ListChecks size={20} />}
          title="No cheques found"
          description="Try a different filter or search term."
        />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden sm:block ledger-card overflow-hidden">
            <div className="grid grid-cols-[1fr_1fr_1fr_1fr_1fr] text-xs text-mist/70 px-4 py-3 ledger-divider">
              <span>Cheque ID</span><span>Bank</span><span>Amount</span><span>Date</span><span>Status</span>
            </div>
            {visible.map((c) => (
              <Link key={c.id} to={`/cheques/${c.id}`} className="grid grid-cols-[1fr_1fr_1fr_1fr_1fr] items-center px-4 py-3.5 ledger-divider hover:bg-ink-800/60 transition-colors">
                <span className="font-mono text-sm text-cream">{c.display_id}</span>
                <span className="text-sm text-mist">{c.bank_name}</span>
                <span className="font-mono text-sm text-cream">{formatINR(c.amount_numeric)}</span>
                <span className="text-sm text-mist font-mono">{formatDate(c.created_at)}</span>
                <StatusBadge status={c.status} />
              </Link>
            ))}
          </div>

          {/* Mobile cards */}
          <div className="sm:hidden flex flex-col gap-3">
            {visible.map((c) => (
              <Link key={c.id} to={`/cheques/${c.id}`} className="ledger-card p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-sm text-cream">{c.display_id}</span>
                  <StatusBadge status={c.status} />
                </div>
                <p className="text-sm text-mist mb-1">{c.bank_name}</p>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-lg text-cream">{formatINR(c.amount_numeric)}</span>
                  <span className="text-xs text-mist font-mono">{formatDate(c.created_at)}</span>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

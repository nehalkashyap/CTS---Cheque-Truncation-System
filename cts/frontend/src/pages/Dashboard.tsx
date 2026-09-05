import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PlusCircle } from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import type { DashboardStats } from "../types";
import StatCard from "../components/StatCard";
import StatusBadge from "../components/StatusBadge";
import Skeleton from "../components/Skeleton";
import EmptyState from "../components/EmptyState";
import { formatINR, formatDate } from "../utils/format";

const RANGE_OPTIONS = [
  { label: "7 days", value: 7 },
  { label: "30 days", value: 30 },
  { label: "90 days", value: 90 },
];

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [range, setRange] = useState(7);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .get<DashboardStats>(`/dashboard?range_days=${range}`)
      .then(setStats)
      .finally(() => setLoading(false));
  }, [range]);

  const firstName = user?.name.split(" ")[0] || "";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="flex flex-col gap-8 pb-10">
      {/* Hero */}
      <div className="ledger-card p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
          <div>
            <h2 className="font-display text-2xl sm:text-3xl text-cream mb-1.5">
              {greeting}, {firstName}.
            </h2>
            <p className="text-mist text-sm">
              {stats && stats.rejected > 0
                ? `${stats.rejected} cheque${stats.rejected > 1 ? "s" : ""} need${stats.rejected === 1 ? "s" : ""} your attention.`
                : "Your cheque processing is under control."}
            </p>
          </div>
          <Link to="/cheques/add" className="btn-primary whitespace-nowrap">
            <PlusCircle size={16} />
            Add New Cheque
          </Link>
        </div>
      </div>

      {/* Stat cards */}
      {loading || !stats ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard index={0} value={stats.total_deposited} label="Total cheques deposited" delta={`+${stats.total_deposited_change_pct}%`} accent="gold" />
          <StatCard index={1} value={stats.processing} label="Currently being verified" accent="warn" />
          <StatCard index={2} value={stats.accepted} label="Successfully evaluated" accent="success" />
          <StatCard index={3} value={stats.rejected} label="Needs attention" accent="danger" />
        </div>
      )}

      {/* Activity chart */}
      <div className="ledger-card p-5 sm:p-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <h3 className="font-display text-lg text-cream">Cheque activity</h3>
          <div className="flex gap-1 bg-ink-950 border border-ink-border rounded-sm p-1">
            {RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setRange(opt.value)}
                className={`px-3 py-1 text-xs rounded-sm transition-colors ${
                  range === opt.value ? "bg-gold-500 text-ink-950 font-semibold" : "text-mist hover:text-cream"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        {loading || !stats ? (
          <Skeleton className="h-56" />
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={stats.activity}>
              <CartesianGrid strokeDasharray="3 3" stroke="#233350" vertical={false} />
              <XAxis dataKey="label" stroke="#8FA1BD" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#8FA1BD" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: "#101D32", border: "1px solid #233350", borderRadius: 4, fontSize: 12 }}
                labelStyle={{ color: "#F6F1E4" }}
                cursor={{ fill: "rgba(214,168,79,0.06)" }}
              />
              <Bar dataKey="value" fill="#D6A84F" radius={[3, 3, 0, 0]} maxBarSize={36} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Recent cheques */}
      <div className="ledger-card p-5 sm:p-6">
        <h3 className="font-display text-lg text-cream mb-4">Recent Cheques</h3>
        {loading ? (
          <div className="flex flex-col gap-2">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-14" />)}
          </div>
        ) : stats && stats.recent_cheques.length > 0 ? (
          <div className="flex flex-col">
            {/* header row - desktop only */}
            <div className="hidden sm:grid grid-cols-[1fr_1fr_1fr_1fr] text-xs text-mist/70 px-3 pb-2">
              <span>Cheque ID</span>
              <span>Bank</span>
              <span>Amount</span>
              <span>Status</span>
            </div>
            {stats.recent_cheques.map((c) => (
              <Link
                key={c.id}
                to={`/cheques/${c.id}`}
                className="grid grid-cols-2 sm:grid-cols-[1fr_1fr_1fr_1fr] items-center gap-y-1.5 px-3 py-3 rounded-sm hover:bg-ink-800/60 transition-colors ledger-divider first:border-t-0"
              >
                <span className="font-mono text-sm text-cream">{c.display_id}</span>
                <span className="text-sm text-mist">{c.bank_name}</span>
                <span className="font-mono text-sm text-cream">{formatINR(c.amount_numeric)}</span>
                <span className="justify-self-start sm:justify-self-auto"><StatusBadge status={c.status} /></span>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<PlusCircle size={20} />}
            title="No cheques yet"
            description="Your processed cheques will appear here."
            actionLabel="Deposit Your First Cheque"
            actionTo="/cheques/add"
          />
        )}
      </div>
      {stats && <p className="text-xs text-mist/60 text-center">Data as of {formatDate(new Date().toISOString())}</p>}
    </div>
  );
}

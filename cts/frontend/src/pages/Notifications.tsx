import { useEffect, useState } from "react";
import { CheckCircle2, AlertTriangle, ShieldAlert, MessageCircle, Info, Bell } from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import type { Notification } from "../types";
import { formatDate, formatTime } from "../utils/format";
import EmptyState from "../components/EmptyState";
import Skeleton from "../components/Skeleton";

const ICONS: Record<string, JSX.Element> = {
  success: <CheckCircle2 size={17} className="text-success" />,
  warning: <AlertTriangle size={17} className="text-warn" />,
  security: <ShieldAlert size={17} className="text-gold-500" />,
  support: <MessageCircle size={17} className="text-mist" />,
  info: <Info size={17} className="text-mist" />,
};

export default function Notifications() {
  const [notifications, setNotifications] = useState<Notification[] | null>(null);

  useEffect(() => {
    api.get<Notification[]>("/notifications").then(setNotifications);
  }, []);

  async function markAllRead() {
    await api.put("/notifications/read-all");
    setNotifications((n) => n?.map((x) => ({ ...x, read: true })) || null);
  }

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-5 pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl text-cream mb-1.5">Notifications</h2>
          <p className="text-sm text-mist">Updates on your cheques, security, and support.</p>
        </div>
        {notifications && notifications.some((n) => !n.read) && (
          <button onClick={markAllRead} className="btn-secondary !text-xs !px-3 !py-1.5">Mark all read</button>
        )}
      </div>

      {notifications === null ? (
        <div className="flex flex-col gap-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-20" />)}</div>
      ) : notifications.length === 0 ? (
        <EmptyState icon={<Bell size={20} />} title="Nothing here yet" description="Notifications about your cheques will show up here." />
      ) : (
        <div className="ledger-card overflow-hidden">
          {notifications.map((n) => (
            <Link
              key={n.id}
              to={n.related_cheque_id ? `/cheques/${n.related_cheque_id}` : "#"}
              className={`flex gap-3 px-5 py-4 ledger-divider hover:bg-ink-800/60 transition-colors ${!n.read ? "bg-ink-800/40" : ""}`}
            >
              <div className="mt-0.5 shrink-0">{ICONS[n.type] || ICONS.info}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-cream">{n.title}</p>
                <p className="text-sm text-mist mt-0.5">{n.message}</p>
                <p className="text-xs text-mist/70 mt-1.5 font-mono">{formatDate(n.created_at)} · {formatTime(n.created_at)}</p>
              </div>
              {!n.read && <span className="w-2 h-2 rounded-full bg-gold-500 mt-1.5 shrink-0" />}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

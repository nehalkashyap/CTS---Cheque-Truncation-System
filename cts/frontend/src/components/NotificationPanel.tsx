import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, AlertTriangle, ShieldAlert, MessageCircle, Info } from "lucide-react";
import { api } from "../lib/api";
import type { Notification } from "../types";
import { formatTime } from "../utils/format";
import { Link } from "react-router-dom";

const ICONS: Record<string, JSX.Element> = {
  success: <CheckCircle2 size={16} className="text-success" />,
  warning: <AlertTriangle size={16} className="text-warn" />,
  security: <ShieldAlert size={16} className="text-gold-500" />,
  support: <MessageCircle size={16} className="text-mist" />,
  info: <Info size={16} className="text-mist" />,
};

export default function NotificationPanel({ onClose }: { onClose: () => void }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<Notification[]>("/notifications")
      .then(setNotifications)
      .finally(() => setLoading(false));
  }, []);

  async function markAllRead() {
    await api.put("/notifications/read-all");
    setNotifications((n) => n.map((x) => ({ ...x, read: true })));
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -8, scale: 0.98 }}
        transition={{ duration: 0.15 }}
        className="absolute right-0 top-full mt-2 w-[22rem] max-w-[90vw] ledger-card shadow-card z-50"
      >
        <div className="flex items-center justify-between px-4 py-3 ledger-divider">
          <h3 className="text-sm font-semibold text-cream">Notifications</h3>
          <button onClick={markAllRead} className="text-xs text-gold-500 hover:text-gold-400">
            Mark all read
          </button>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {loading && <div className="p-4 text-sm text-mist">Loading…</div>}
          {!loading && notifications.length === 0 && (
            <div className="p-6 text-center text-sm text-mist">You're all caught up.</div>
          )}
          {notifications.map((n) => (
            <Link
              key={n.id}
              to={n.related_cheque_id ? `/cheques/${n.related_cheque_id}` : "/notifications"}
              onClick={onClose}
              className={`flex gap-3 px-4 py-3 ledger-divider hover:bg-ink-800/60 transition-colors ${
                !n.read ? "bg-ink-800/40" : ""
              }`}
            >
              <div className="mt-0.5 shrink-0">{ICONS[n.type] || ICONS.info}</div>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-cream">{n.title}</p>
                <p className="text-xs text-mist mt-0.5 line-clamp-2">{n.message}</p>
                <p className="text-[11px] text-mist/70 mt-1 font-mono">{formatTime(n.created_at)}</p>
              </div>
              {!n.read && <span className="w-2 h-2 rounded-full bg-gold-500 mt-1.5 shrink-0" />}
            </Link>
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

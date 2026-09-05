import { useEffect, useRef, useState } from "react";
import { Menu, Bell } from "lucide-react";
import NotificationPanel from "./NotificationPanel";
import { api } from "../lib/api";
import type { Notification } from "../types";

export default function Header({ title, onMenuClick }: { title: string; onMenuClick: () => void }) {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api
      .get<Notification[]>("/notifications")
      .then((list) => setUnread(list.filter((n) => !n.read).length))
      .catch(() => {});
  }, [open]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between gap-3 px-4 sm:px-8 py-4 bg-ink-950/90 backdrop-blur border-b border-ink-border">
      <div className="flex items-center gap-3 min-w-0">
        <button className="lg:hidden text-mist hover:text-cream" onClick={onMenuClick}>
          <Menu size={20} />
        </button>
        <h1 className="font-display text-lg sm:text-xl text-cream truncate">{title}</h1>
      </div>
      <div ref={ref} className="relative">
        <button
          onClick={() => setOpen((o) => !o)}
          className="relative w-9 h-9 rounded-sm border border-ink-border flex items-center justify-center text-mist hover:text-cream hover:border-gold-500/50 transition-colors"
        >
          <Bell size={17} />
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-gold-500 text-ink-950 text-[10px] font-bold flex items-center justify-center">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
        {open && <NotificationPanel onClose={() => setOpen(false)} />}
      </div>
    </header>
  );
}

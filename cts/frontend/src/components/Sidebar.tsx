import { NavLink } from "react-router-dom";
import {
  LayoutDashboard, PlusCircle, Loader2, ListChecks, UserCircle, Landmark,
  MessageSquareText, Bell, Settings, LogOut, X,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

interface NavItem {
  to: string;
  label: string;
  icon: JSX.Element;
}

const OVERVIEW: NavItem[] = [{ to: "/dashboard", label: "Dashboard", icon: <LayoutDashboard size={17} /> }];

const CHEQUES: NavItem[] = [
  { to: "/cheques/add", label: "Add Cheque", icon: <PlusCircle size={17} /> },
  { to: "/cheques/processing", label: "Processing", icon: <Loader2 size={17} /> },
  { to: "/cheques/evaluated", label: "Evaluated", icon: <ListChecks size={17} /> },
];

const ACCOUNT: NavItem[] = [
  { to: "/profile", label: "Profile", icon: <UserCircle size={17} /> },
  { to: "/banks", label: "Bank Accounts", icon: <Landmark size={17} /> },
];

const SUPPORT: NavItem[] = [
  { to: "/support", label: "AI Assistant", icon: <MessageSquareText size={17} /> },
  { to: "/notifications", label: "Notifications", icon: <Bell size={17} /> },
];

function Section({ title, items, onNavigate }: { title?: string; items: NavItem[]; onNavigate?: () => void }) {
  return (
    <div className="mb-6">
      {title && <p className="text-[11px] font-semibold text-mist/70 tracking-wide px-3 mb-2">{title}</p>}
      <div className="flex flex-col gap-0.5">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-2 rounded-sm text-sm transition-colors ${
                isActive
                  ? "bg-ink-800 text-gold-500 border-l-2 border-gold-500 -ml-px pl-[11px]"
                  : "text-mist hover:text-cream hover:bg-ink-800/60"
              }`
            }
          >
            {item.icon}
            {item.label}
          </NavLink>
        ))}
      </div>
    </div>
  );
}

export default function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { logout, user } = useAuth();

  return (
    <>
      {open && (
        <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={onClose} />
      )}
      <aside
        className={`fixed lg:sticky top-0 left-0 h-screen w-64 bg-ink-900 border-r border-ink-border z-40 flex flex-col
          transition-transform duration-200 lg:translate-x-0
          ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex items-center justify-between px-5 py-5">
          <div className="flex items-baseline gap-1.5">
            <span className="font-display text-xl text-cream tracking-tight">CTS</span>
            <span className="w-1.5 h-1.5 rounded-full bg-gold-500" />
          </div>
          <button className="lg:hidden text-mist" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-2">
          <Section title="OVERVIEW" items={OVERVIEW} onNavigate={onClose} />
          <Section title="CHEQUES" items={CHEQUES} onNavigate={onClose} />
          <Section title="ACCOUNT" items={ACCOUNT} onNavigate={onClose} />
          <Section title="SUPPORT" items={SUPPORT} onNavigate={onClose} />
        </nav>

        <div className="ledger-divider px-3 py-3">
          <NavLink
            to="/settings"
            className="flex items-center gap-2.5 px-3 py-2 rounded-sm text-sm text-mist hover:text-cream hover:bg-ink-800/60"
          >
            <Settings size={17} />
            Settings
          </NavLink>
          <button
            onClick={logout}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-sm text-sm text-mist hover:text-cream hover:bg-ink-800/60"
          >
            <LogOut size={17} />
            Logout
          </button>
          {user && (
            <div className="flex items-center gap-2.5 px-3 pt-3 mt-1 ledger-divider">
              <div className="w-7 h-7 rounded-full bg-gold-500/20 border border-gold-500/40 flex items-center justify-center text-gold-500 text-xs font-semibold">
                {user.name.charAt(0)}
              </div>
              <div className="min-w-0">
                <p className="text-xs text-cream truncate">{user.name}</p>
                <p className="text-[11px] text-mist truncate">{user.email}</p>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

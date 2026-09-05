import { ReactNode } from "react";
import { Link } from "react-router-dom";

interface Props {
  icon: ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  actionTo?: string;
}

export default function EmptyState({ icon, title, description, actionLabel, actionTo }: Props) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6 ledger-card">
      <div className="w-12 h-12 rounded-full bg-ink-800 border border-ink-border flex items-center justify-center text-gold-500 mb-4">
        {icon}
      </div>
      <h3 className="font-display text-lg text-cream mb-1.5">{title}</h3>
      <p className="text-sm text-mist max-w-sm mb-5">{description}</p>
      {actionLabel && actionTo && (
        <Link to={actionTo} className="btn-primary">
          {actionLabel}
        </Link>
      )}
    </div>
  );
}

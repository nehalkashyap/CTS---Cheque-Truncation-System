import { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface Props {
  value: number;
  label: string;
  delta?: string;
  accent?: "gold" | "success" | "warn" | "danger";
  index?: number;
}

const ACCENTS: Record<string, string> = {
  gold: "text-gold-500",
  success: "text-success",
  warn: "text-warn",
  danger: "text-danger",
};

export default function StatCard({ value, label, delta, accent = "gold", index = 0 }: Props) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const duration = 700;
    const start = performance.now();
    let raf: number;
    function tick(now: number) {
      const progress = Math.min(1, (now - start) / duration);
      setDisplay(Math.round(progress * value));
      if (progress < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.4, ease: "easeOut" }}
      className="ledger-card p-5"
    >
      <div className="flex items-baseline gap-2">
        <span className={`font-display text-4xl ${ACCENTS[accent]} mono-figure`}>{display}</span>
        {delta && <span className="text-xs text-success font-mono">{delta}</span>}
      </div>
      <p className="text-sm text-mist mt-1.5">{label}</p>
    </motion.div>
  );
}

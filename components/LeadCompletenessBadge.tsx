export default function LeadCompletenessBadge({
  pct,
  compact = false,
}: {
  pct: number;
  compact?: boolean;
}) {
  const tone =
    pct >= 85 ? "text-emerald-300 bg-emerald-500/15" : pct >= 65 ? "text-sky-300 bg-sky-500/15" : "text-slate-300 bg-white/10";

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${tone}`}
      title="Complétude documentaire (SIREN, parcelle, dirigeants, propriétaire foncier…)"
    >
      {compact ? `${pct} %` : `Complétude ${pct} %`}
    </span>
  );
}

export function LeadDirigeantBadge({ compact = false }: { compact?: boolean }) {
  return (
    <span
      className="inline-flex items-center rounded-full bg-violet-500/15 px-2 py-0.5 text-xs font-semibold text-violet-200"
      title="Dirigeant exploitant identifié (open data SIREN)"
    >
      {compact ? "Dirigeant" : "Dirigeant identifié"}
    </span>
  );
}

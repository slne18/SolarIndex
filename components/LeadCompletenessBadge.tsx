"use client";

import { fmt } from "@/lib/i18n/format";
import { useTranslations } from "@/components/LocaleProvider";

export default function LeadCompletenessBadge({
  pct,
  compact = false,
}: {
  pct: number;
  compact?: boolean;
}) {
  const t = useTranslations();
  const tone =
    pct >= 85 ? "text-emerald-300 bg-emerald-500/15" : pct >= 65 ? "text-sky-300 bg-sky-500/15" : "text-slate-300 bg-white/10";

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${tone}`}
      title={t("leads.completenessTitle")}
    >
      {compact
        ? fmt(t("leads.completenessCompact"), { pct })
        : fmt(t("leads.completeness"), { pct })}
    </span>
  );
}

function DirectorIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      className={className}
      viewBox="0 0 20 20"
      fill="currentColor"
    >
      <path d="M10 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM6 8a4 4 0 1 1 8 0 4 4 0 0 1-8 0Zm-2 9a6 6 0 0 1 12 0h-1.5a4.5 4.5 0 0 0-9 0H4Z" />
    </svg>
  );
}

export function LeadDirigeantBadge({ compact = false }: { compact?: boolean }) {
  const t = useTranslations();

  return (
    <span
      className="lead-dirigeant-badge inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold"
      title={t("leads.directorTitle")}
    >
      <DirectorIcon className="h-3.5 w-3.5 shrink-0 opacity-90" />
      {compact ? t("leads.director") : t("leads.directorIdentified")}
    </span>
  );
}

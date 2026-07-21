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

export function LeadDirigeantBadge({ compact = false }: { compact?: boolean }) {
  const t = useTranslations();

  return (
    <span
      className="inline-flex items-center rounded-full bg-violet-500/15 px-2 py-0.5 text-xs font-semibold text-violet-200"
      title={t("leads.directorTitle")}
    >
      {compact ? t("leads.director") : t("leads.directorIdentified")}
    </span>
  );
}

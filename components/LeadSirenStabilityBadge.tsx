"use client";

import { useTranslations } from "@/components/LocaleProvider";
import { fmt } from "@/lib/i18n/format";
import {
  hasSirenStabilityData,
  isSirenEntrepriseActive,
  sirenAncienneteAnnees,
  type SirenStabilityLead,
} from "@/lib/sirene-stability";

export default function LeadSirenStabilityBadge({
  lead,
  compact = false,
  light = false,
}: {
  lead: SirenStabilityLead;
  compact?: boolean;
  light?: boolean;
}) {
  const t = useTranslations();

  if (!hasSirenStabilityData(lead)) return null;

  const years = sirenAncienneteAnnees(lead.siren_date_creation);
  const active = isSirenEntrepriseActive(lead.siren_etat_administratif);
  if (years == null) return null;

  const label = compact
    ? t("leads.sirenStability.badgeShort").replace("{years}", String(years))
    : fmt(t("leads.sirenStability.badge"), { years });

  const hint =
    active === false
      ? t("leads.sirenStability.hintInactive")
      : active === true
        ? fmt(t("leads.sirenStability.hintActive"), { years })
        : fmt(t("leads.sirenStability.hint"), { years });

  const tone = light
    ? active === false
      ? "bg-amber-100 text-amber-900"
      : years >= 5
        ? "bg-emerald-100 text-emerald-800"
        : "bg-slate-100 text-slate-700"
    : active === false
      ? "bg-amber-500/15 text-amber-300"
      : years >= 5
        ? "bg-emerald-500/15 text-emerald-300"
        : "bg-slate-500/15 text-slate-300";

  return (
    <span
      className={`inline-flex w-fit rounded-full px-2 py-0.5 text-xs font-semibold ${tone}`}
      title={hint}
    >
      {label}
    </span>
  );
}

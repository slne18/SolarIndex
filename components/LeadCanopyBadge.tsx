"use client";

import { useTranslations } from "@/components/LocaleProvider";
import {
  canopyCoverageLabel,
  isCanopyPhotoSignal,
  isHuwartCanopyLead,
  isVegetationOpportunityLead,
  type CanopyDisplayLead,
} from "@/lib/lead-canopy-display";

export default function LeadCanopyBadge({
  lead,
  compact = false,
  light = false,
}: {
  lead: CanopyDisplayLead;
  compact?: boolean;
  light?: boolean;
}) {
  const t = useTranslations();

  if (!isCanopyPhotoSignal(lead)) return null;

  const pctLabel = canopyCoverageLabel(lead);
  const huwart = isHuwartCanopyLead(lead);
  const vegetation = isVegetationOpportunityLead(lead);

  const label = pctLabel
    ? compact
      ? t("leads.canopy.badgePctShort").replace("{pct}", pctLabel.replace(/\u00a0/g, " "))
      : t("leads.canopy.badgePct").replace("{pct}", pctLabel.replace(/\u00a0/g, " "))
    : t("leads.canopy.badgePossible");

  const hint = huwart
    ? t("leads.canopy.hintHuwart")
    : vegetation
      ? t("leads.canopy.hintSuspect")
      : t("leads.canopy.hintPhoto");

  const tone = light
    ? huwart
      ? "bg-emerald-100 text-emerald-800"
      : "bg-sky-100 text-sky-800"
    : huwart
      ? "bg-emerald-500/15 text-emerald-300"
      : "bg-sky-500/15 text-sky-300";

  return (
    <span
      className={`inline-flex w-fit rounded-full px-2 py-0.5 text-xs font-semibold ${tone}`}
      title={hint}
    >
      {label}
    </span>
  );
}

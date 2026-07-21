"use client";

import { useTranslations } from "@/components/LocaleProvider";

interface LeadAvailabilityBadgeProps {
  available: boolean;
}

export default function LeadAvailabilityBadge({ available }: LeadAvailabilityBadgeProps) {
  const t = useTranslations();

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
        available ? "bg-accent/15 text-accent" : "bg-white/10 text-slate-400"
      }`}
      title={available ? t("leads.badge.availableTitle") : t("leads.badge.unavailableTitle")}
    >
      {available ? t("leads.badge.available") : t("leads.badge.unavailable")}
    </span>
  );
}

"use client";

import type { LeadTier } from "@/lib/types";
import { tierLabelKey } from "@/lib/i18n/leads-labels";
import { useTranslations } from "@/components/LocaleProvider";

export default function LeadTierBadge({
  tier,
  compact = false,
}: {
  tier: LeadTier;
  compact?: boolean;
}) {
  const t = useTranslations();
  const premium = tier === "premium";
  const descriptionKey = premium ? "leads.tier.premiumDesc" : "leads.tier.standardDesc";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
        premium
          ? "bg-solar/15 text-solar ring-1 ring-solar/30"
          : "lead-tier-badge-standard bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/35"
      }`}
      title={t(descriptionKey)}
    >
      {premium ? "★ " : null}
      {t(tierLabelKey(tier))}
      {!compact && premium ? (
        <span className="hidden sm:inline">{t("leads.tier.premiumVerified")}</span>
      ) : null}
    </span>
  );
}

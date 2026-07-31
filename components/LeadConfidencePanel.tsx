"use client";

import type { PublicLead } from "@/lib/types";
import { fmt } from "@/lib/i18n/format";
import {
  confidenceFactorLabelKey,
  scoreLevelKey,
  tierLabelKey,
} from "@/lib/i18n/leads-labels";
import { useTranslations } from "@/components/LocaleProvider";
import { getDetectionStatus } from "@/lib/detection-status";
import { confidenceFactors } from "@/lib/lead-confidence";
import { effectiveLeadScore } from "@/lib/huwart-law";
import LeadTierBadge from "./LeadTierBadge";

export default function LeadConfidencePanel({ lead }: { lead: PublicLead }) {
  const t = useTranslations();
  const factors = confidenceFactors(lead);
  const score = effectiveLeadScore(lead);
  const detection = getDetectionStatus(lead);
  const tierDescKey = lead.tier === "premium" ? "leads.tier.premiumDesc" : "leads.tier.standardDesc";

  return (
    <div className="card p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-900">{t("leads.confidence.title")}</h2>
        <LeadTierBadge tier={lead.tier} />
      </div>

      <p className="mt-2 text-sm text-slate-600">
        {fmt(t("leads.confidence.intro"), {
          score: score.toFixed(2),
          level: t(scoreLevelKey(score)),
        })}
      </p>

      <ul className="mt-5 space-y-3">
        {factors.map((f) => (
          <li key={f.id} className="flex gap-3 text-sm">
            <span
              className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                f.ok ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-800"
              }`}
              aria-hidden
            >
              {f.ok ? "✓" : "!"}
            </span>
            <div>
              <div className="font-medium text-slate-800">{t(confidenceFactorLabelKey(f.id))}</div>
              <div className="text-slate-600">{f.detail}</div>
            </div>
          </li>
        ))}
      </ul>

      <div
        className={`mt-5 rounded-lg border p-4 text-xs ${
          detection?.tone === "warn"
            ? "border-amber-200 bg-amber-50"
            : "border-slate-200 bg-slate-50"
        }`}
      >
        <p className="text-slate-600">
          <strong className="text-slate-800">{t(tierLabelKey(lead.tier))}</strong>
          {" — "}
          {t(tierDescKey)}
        </p>
        {detection ? (
          <p
            className={`mt-3 border-t pt-3 ${
              detection.tone === "warn"
                ? "border-amber-200 text-amber-900"
                : "border-slate-200 text-slate-600"
            }`}
          >
            <strong>{detection.badge}</strong>
            {" — "}
            {detection.detail}
            {detection.disclaimer ? ` ${detection.disclaimer}` : null}
          </p>
        ) : null}
      </div>
    </div>
  );
}

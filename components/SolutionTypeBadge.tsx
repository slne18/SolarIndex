"use client";

import { useTranslations } from "@/components/LocaleProvider";
import {
  attractsLandscaper,
  attractsSolarInstaller,
  solutionTypeLabelKey,
  solutionTypeShortKey,
  type TypeSolutionRecherchee,
} from "@/lib/solution-type";

const TONE: Record<TypeSolutionRecherchee, string> = {
  pv_pur: "bg-solar/15 text-solar",
  mixte_pv_vegetal: "bg-emerald-500/15 text-emerald-300",
  vegetalisation_uniquement: "bg-lime-500/15 text-lime-300",
};

export default function SolutionTypeBadge({
  type,
  compact = false,
  showAudience = false,
  light = false,
}: {
  type: TypeSolutionRecherchee;
  compact?: boolean;
  showAudience?: boolean;
  light?: boolean;
}) {
  const t = useTranslations();
  const labelKey = compact ? solutionTypeShortKey(type) : solutionTypeLabelKey(type);
  const tone = light
    ? type === "pv_pur"
      ? "bg-solar/20 text-amber-900"
      : type === "mixte_pv_vegetal"
        ? "bg-emerald-100 text-emerald-800"
        : "bg-lime-100 text-lime-800"
    : TONE[type];

  return (
    <span className="inline-flex flex-col gap-0.5">
      <span
        className={`inline-flex w-fit rounded-full px-2 py-0.5 text-xs font-semibold ${tone}`}
        title={t(solutionTypeLabelKey(type))}
      >
        {t(labelKey)}
      </span>
      {showAudience ? (
        <span className="text-[10px] leading-snug text-slate-500">
          {attractsSolarInstaller(type) ? t("solutionType.audienceSolar") : null}
          {attractsSolarInstaller(type) && attractsLandscaper(type) ? " · " : null}
          {attractsLandscaper(type) ? t("solutionType.audienceLandscaper") : null}
        </span>
      ) : null}
    </span>
  );
}

"use client";

import { useTranslations } from "@/components/LocaleProvider";
import { fmt } from "@/lib/i18n/format";
import {
  type TypeOffre,
  TYPE_OFFRE_SHORT_LABELS,
  typeOffreDetailLabel,
} from "@/lib/rfp-offer-type";
import type { MessageKey } from "@/lib/i18n";

export default function RfpOfferTypeBadge({
  typeOffre,
  dureeContratAns,
  compact = false,
  light = false,
}: {
  typeOffre: TypeOffre;
  dureeContratAns?: number | null;
  compact?: boolean;
  light?: boolean;
}) {
  const t = useTranslations();
  const isFinancing = typeOffre === "tiers_investissement";
  const label = compact
    ? t(`rfp.offerType.${typeOffre}.short` as MessageKey)
    : typeOffreDetailLabel(typeOffre, dureeContratAns ?? null);
  const title = isFinancing && dureeContratAns
    ? fmt(t("rfp.offerType.tiersInvestissementHint"), { years: dureeContratAns })
    : t(`rfp.offerType.${typeOffre}.hint` as MessageKey);

  const tone = light
    ? isFinancing
      ? "bg-violet-100 text-violet-800"
      : "bg-sky-100 text-sky-800"
    : isFinancing
      ? "bg-violet-500/15 text-violet-300"
      : "bg-sky-500/15 text-sky-300";

  return (
    <span
      className={`inline-flex w-fit rounded-full px-2 py-0.5 text-xs font-semibold ${tone}`}
      title={title}
    >
      {label || TYPE_OFFRE_SHORT_LABELS[typeOffre]}
    </span>
  );
}

"use client";

import { useTranslations } from "@/components/LocaleProvider";
import type { MessageKey } from "@/lib/i18n";

type OwnerPersonaLabelVariant = "hero" | "switcher" | "footer" | "nav";

export default function OwnerPersonaLabel({
  variant = "hero",
  className = "",
  subtitleKey = "persona.ownerSubtitle",
}: {
  variant?: OwnerPersonaLabelVariant;
  className?: string;
  subtitleKey?: MessageKey;
}) {
  const t = useTranslations();

  return (
    <span className={`persona-owner-label persona-owner-label-${variant} ${className}`.trim()}>
      <span className="persona-owner-label-title block">{t("persona.owner")}</span>
      <span className="persona-owner-label-sub block">{t(subtitleKey)}</span>
    </span>
  );
}

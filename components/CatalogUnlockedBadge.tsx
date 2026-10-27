"use client";

import { useTranslations } from "@/components/LocaleProvider";

export default function CatalogUnlockedBadge({ compact = false }: { compact?: boolean }) {
  const t = useTranslations();
  return (
    <span
      className={
        compact
          ? "inline-flex rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400"
          : "inline-flex rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400"
      }
    >
      {t("catalog.unlockedBadge")}
    </span>
  );
}

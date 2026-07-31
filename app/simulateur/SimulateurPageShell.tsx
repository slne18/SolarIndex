"use client";

import { useTranslations } from "@/components/LocaleProvider";

export default function SimulateurPageShell() {
  const t = useTranslations();

  return (
    <div className="container-x py-10 sm:py-14">
      <h1 className="hero-tool-title">{t("simulateur.title")}</h1>
      <p className="hero-on-photo-lead mt-3 !mx-0 max-w-none xl:whitespace-nowrap">{t("simulateur.lead")}</p>
    </div>
  );
}

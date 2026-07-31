"use client";

import { useTranslations } from "@/components/LocaleProvider";

export default function SimulateurPageShell() {
  const t = useTranslations();

  return (
    <div className="container-x py-10 sm:py-14">
      <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
        {t("simulateur.title")}
      </h1>
      <p className="mt-3 max-w-2xl text-base leading-relaxed text-white/[0.88]">{t("simulateur.lead")}</p>
    </div>
  );
}

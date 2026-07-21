"use client";

import type { ReactNode } from "react";
import OwnerPersonaLabel from "@/components/OwnerPersonaLabel";
import { useTranslations } from "@/components/LocaleProvider";

export default function SimulateurPageShell({ children }: { children: ReactNode }) {
  const t = useTranslations();

  return (
    <div className="container-x py-10 sm:py-14">
      <OwnerPersonaLabel variant="hero" />
      <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
        {t("simulateur.title")}
      </h1>
      <p className="mt-3 max-w-2xl text-base leading-relaxed text-slate-400">{t("simulateur.lead")}</p>
      <div className="mt-8">{children}</div>
    </div>
  );
}

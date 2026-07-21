"use client";

import { Suspense, type ReactNode } from "react";
import { useTranslations } from "@/components/LocaleProvider";

export default function VerifierPageShell({ children }: { children: ReactNode }) {
  const t = useTranslations();

  return (
    <div className="container-x py-10 sm:py-14">
      <p className="pill-accent w-fit">{t("verifier.pill")}</p>
      <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
        {t("verifier.title")}
      </h1>
      <p className="mt-3 max-w-2xl text-base leading-relaxed text-slate-400">{t("verifier.lead")}</p>
      <Suspense fallback={<p className="mt-8 text-sm text-slate-500">{t("common.loading")}</p>}>
        <div className="mt-8">{children}</div>
      </Suspense>
    </div>
  );
}

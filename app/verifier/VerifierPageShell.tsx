"use client";

import { Suspense, type ReactNode } from "react";
import { useTranslations } from "@/components/LocaleProvider";

export default function VerifierPageShell() {
  const t = useTranslations();

  return (
    <div className="container-x py-10 sm:py-14">
      <h1 className="hero-tool-title">{t("verifier.title")}</h1>
      <p className="hero-on-photo-lead mt-3 !mx-0 max-w-2xl">{t("verifier.lead")}</p>
    </div>
  );
}

export function VerifierPageContent({ children }: { children: ReactNode }) {
  const t = useTranslations();

  return (
    <Suspense fallback={<p className="text-sm text-slate-500">{t("common.loading")}</p>}>
      {children}
    </Suspense>
  );
}

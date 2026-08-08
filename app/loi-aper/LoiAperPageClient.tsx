"use client";

import HomeChooserLink from "@/components/HomeChooserLink";
import LoiAperContent from "@/components/LoiAperContent";
import { useTranslations } from "@/components/LocaleProvider";

export default function LoiAperPageClient() {
  const t = useTranslations();

  return (
    <div className="surface-light min-h-[60vh] py-14 sm:py-20">
      <div className="container-x mx-auto max-w-4xl">
        <HomeChooserLink href="/" className="text-sm text-slate-500 transition hover:text-slate-800">
          {t("common.backHome")}
        </HomeChooserLink>
        <div className="mt-8">
          <LoiAperContent showDetail />
        </div>
      </div>
    </div>
  );
}

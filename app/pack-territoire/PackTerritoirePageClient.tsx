"use client";

import Link from "next/link";
import PackTerritoireButton from "@/components/PackTerritoireButton";
import { PRIX_LEAD } from "@/lib/leads";
import {
  TERRITOIRE_LEADS_QUOTA,
  TERRITOIRE_PACK_DISCOUNT_PCT,
  TERRITOIRE_PACK_EUR,
} from "@/lib/subscription";
import { useTranslations } from "@/components/LocaleProvider";
import { fmt } from "@/lib/i18n/format";

export default function PackTerritoirePageClient() {
  const t = useTranslations();

  return (
    <div className="container-x py-16">
      <Link href="/" className="text-sm text-slate-400 hover:text-white">
        {t("common.backHome")}
      </Link>

      <div className="relative mx-auto mt-8 max-w-xl pt-8">
        <span className="absolute left-0 top-0 rounded-full bg-solar px-2.5 py-1 text-xs font-bold text-night">
          −{TERRITOIRE_PACK_DISCOUNT_PCT} %
        </span>
        <span className="pill">{t("pack.pill")}</span>
        <h1 className="mt-4 text-3xl font-bold tracking-tight">
          {fmt(t("pack.title"), { quota: TERRITOIRE_LEADS_QUOTA })}
        </h1>
        <p className="mt-3 text-slate-400">
          {fmt(t("pack.lead"), { price: TERRITOIRE_PACK_EUR })}
        </p>

        <ul className="mt-8 space-y-3 text-sm text-slate-300">
          <li className="flex gap-2">
            <span className="text-solar">✓</span>
            {fmt(t("pack.feature1"), { quota: TERRITOIRE_LEADS_QUOTA })}
          </li>
          <li className="flex gap-2">
            <span className="text-solar">✓</span>
            {fmt(t("pack.feature2"), {
              standard: PRIX_LEAD.standard,
              premium: PRIX_LEAD.premium,
            })}
          </li>
          <li className="flex gap-2">
            <span className="text-solar">✓</span>
            {t("pack.feature3")}
          </li>
          <li className="flex gap-2">
            <span className="text-solar">✓</span>
            {t("pack.feature4")}
          </li>
          <li className="flex gap-2">
            <span className="text-solar">✓</span>
            {t("pack.feature5")}
          </li>
        </ul>

        <div className="card mt-10 p-6">
          <PackTerritoireButton />
          <p className="mt-4 text-center text-xs text-slate-500">{t("pack.paymentNote")}</p>
        </div>

        <p className="mt-6 text-center text-sm text-slate-400">
          {t("pack.unitPref")}{" "}
          <Link href="/leads" className="text-solar underline">
            {t("pack.browseCatalog")}
          </Link>
        </p>
      </div>
    </div>
  );
}

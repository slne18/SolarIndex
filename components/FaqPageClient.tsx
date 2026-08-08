"use client";

import { useEffect, useState } from "react";
import HomeChooserLink from "@/components/HomeChooserLink";
import FaqAccordionList from "@/components/FaqAccordionList";
import FaqAskForm from "@/components/FaqAskForm";
import { FAQ_IDS } from "@/lib/i18n/faq-ids";
import { useLocale, useTranslations } from "@/components/LocaleProvider";
import type { FaqPublishedView } from "@/lib/faq-db";
import type { MessageKey } from "@/lib/i18n";

interface FaqPageClientProps {
  publishedItems: FaqPublishedView[];
}

export default function FaqPageClient({ publishedItems: initialPublished }: FaqPageClientProps) {
  const { locale } = useLocale();
  const t = useTranslations();
  const [publishedItems, setPublishedItems] = useState(initialPublished);

  const staticItems = FAQ_IDS.map((id) => ({
    id,
    question: t(`faq.${id}.q` as MessageKey),
    answer: t(`faq.${id}.a` as MessageKey),
  }));

  const items = [...staticItems, ...publishedItems];

  useEffect(() => {
    let cancelled = false;
    async function loadPublished() {
      try {
        const res = await fetch(`/api/faq?locale=${locale}`, { cache: "no-store" });
        if (!res.ok) return;
        const body = (await res.json()) as { entries?: FaqPublishedView[] };
        if (!cancelled && body.entries) setPublishedItems(body.entries);
      } catch {
        /* ignore — garde les entrées SSR */
      }
    }
    void loadPublished();
    return () => {
      cancelled = true;
    };
  }, [locale]);

  return (
    <div className="surface-light min-h-[60vh] py-14 sm:py-20">
      <div className="container-x mx-auto max-w-3xl">
        <HomeChooserLink href="/" className="text-sm text-slate-500 transition hover:text-slate-800">
          {t("common.backHome")}
        </HomeChooserLink>
        <h1 className="mt-6 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          {t("faq.title")}
        </h1>
        <p className="mt-3 text-slate-600">{t("faq.lead")}</p>

        <div className="mt-10">
          <FaqAccordionList items={items} initialOpenId={FAQ_IDS[0]} />
        </div>

        <FaqAskForm />
      </div>
    </div>
  );
}

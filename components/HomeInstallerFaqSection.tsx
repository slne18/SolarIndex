"use client";

import SectionEyebrow from "@/components/SectionEyebrow";
import FaqAccordionList from "@/components/FaqAccordionList";
import FaqAskForm from "@/components/FaqAskForm";
import { useTranslations } from "@/components/LocaleProvider";
import { INSTALLER_FAQ_IDS } from "@/lib/i18n/faq-installer-ids";
import type { MessageKey } from "@/lib/i18n";

export default function HomeInstallerFaqSection() {
  const t = useTranslations();

  const faqItems = INSTALLER_FAQ_IDS.map((id) => ({
    id,
    question: t(`faq.${id}.q` as MessageKey),
    answer: t(`faq.${id}.a` as MessageKey),
  }));

  return (
    <section className="surface-light border-t border-slate-100 py-14 sm:pb-24">
      <div className="container-x">
        <div className="mx-auto max-w-3xl text-center">
          <SectionEyebrow>{t("home.installerFaq.eyebrow")}</SectionEyebrow>
          <h2 className="section-title mt-3">{t("home.installerFaq.title")}</h2>
        </div>
        <div className="mx-auto mt-10 max-w-3xl">
          <FaqAccordionList items={faqItems} initialOpenId={INSTALLER_FAQ_IDS[0]} />
          <FaqAskForm />
        </div>
      </div>
    </section>
  );
}

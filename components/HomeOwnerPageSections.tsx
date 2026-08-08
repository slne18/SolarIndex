"use client";

import Link from "next/link";
import SectionEyebrow from "@/components/SectionEyebrow";
import HowStepsTimeline from "@/components/HowStepsTimeline";
import { useTranslations } from "@/components/LocaleProvider";
import type { MessageKey } from "@/lib/i18n";

const WHY_CARDS: { titleKey: MessageKey; textKey: MessageKey }[] = [
  { titleKey: "home.ownerWhy.card1Title", textKey: "home.ownerWhy.card1Text" },
  { titleKey: "home.ownerWhy.card2Title", textKey: "home.ownerWhy.card2Text" },
  { titleKey: "home.ownerWhy.card3Title", textKey: "home.ownerWhy.card3Text" },
  { titleKey: "home.ownerWhy.card4Title", textKey: "home.ownerWhy.card4Text" },
];

const HOW_STEPS: { href: string; labelKey: MessageKey; match: (path: string) => boolean }[] = [
  {
    href: "/verifier",
    labelKey: "home.ownerHow.step1",
    match: (path) => path.startsWith("/verifier"),
  },
  {
    href: "/simulateur",
    labelKey: "home.ownerHow.step2",
    match: (path) => path.startsWith("/simulateur"),
  },
  {
    href: "/appels-offres/nouveau",
    labelKey: "home.ownerHow.step3",
    match: (path) => path.startsWith("/appels-offres/nouveau"),
  },
  {
    href: "/mon-espace",
    labelKey: "home.ownerHow.step4",
    match: (path) => path.startsWith("/mon-espace") || path.startsWith("/appels-offres"),
  },
];

const TRANSPARENCY_KEYS = [
  "home.ownerTransparency.item1",
  "home.ownerTransparency.item2",
  "home.ownerTransparency.item3",
  "home.ownerTransparency.item4",
  "home.ownerTransparency.item5",
  "home.ownerTransparency.item6",
] as const satisfies readonly MessageKey[];

export default function HomeOwnerPageSections() {
  const t = useTranslations();

  return (
    <div className="surface-light">
      <section className="container-x py-14 sm:py-20">
        <div className="mx-auto max-w-4xl text-center">
          <SectionEyebrow>{t("home.ownerWhy.eyebrow")}</SectionEyebrow>
          <h2 className="section-title mt-3">{t("home.ownerWhy.title")}</h2>
        </div>
        <div className="owner-why-grid mt-10">
          {WHY_CARDS.map((card) => (
            <article key={card.titleKey} className="owner-why-card">
              <h3 className="owner-why-card-title">{t(card.titleKey)}</h3>
              <p className="owner-why-card-text">{t(card.textKey)}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="container-x border-t border-slate-100 py-14 sm:py-20">
        <div className="mx-auto max-w-4xl text-center">
          <SectionEyebrow>{t("home.ownerHow.eyebrow")}</SectionEyebrow>
          <h2 className="section-title mt-3">{t("home.ownerHow.title")}</h2>
        </div>
        <HowStepsTimeline steps={HOW_STEPS} t={t} />
      </section>

      <section className="container-x border-t border-slate-100 py-14 sm:py-20">
        <div className="mx-auto max-w-3xl text-center">
          <SectionEyebrow>{t("home.ownerTransparency.eyebrow")}</SectionEyebrow>
          <h2 className="section-title mt-3">{t("home.ownerTransparency.title")}</h2>
          <p className="section-lead mx-auto mt-4 max-w-2xl text-slate-600">
            {t("home.ownerTransparency.lead")}
          </p>
        </div>
        <ul className="owner-transparency-grid mt-10">
          {TRANSPARENCY_KEYS.map((key) => (
            <li key={key} className="owner-transparency-item">
              <span className="owner-transparency-check" aria-hidden>
                ✓
              </span>
              <span>{t(key)}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="container-x pb-16 sm:pb-24">
        <div className="owner-deposit-cta">
          <h2 className="owner-deposit-cta-title">{t("home.ownerDepositCta.title")}</h2>
          <ul className="owner-deposit-cta-bullets">
            <li>{t("home.ownerDepositCta.bullet1")}</li>
            <li>{t("home.ownerDepositCta.bullet2")}</li>
            <li>{t("home.ownerDepositCta.bullet3")}</li>
          </ul>
          <Link href="/appels-offres/nouveau" className="btn-solar owner-deposit-cta-btn">
            {t("home.ownerDepositCta.button")}
            <span aria-hidden> →</span>
          </Link>
        </div>
      </section>
    </div>
  );
}

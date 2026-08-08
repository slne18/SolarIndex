"use client";

import SectionEyebrow from "@/components/SectionEyebrow";
import { useTranslations } from "@/components/LocaleProvider";
import type { MessageKey } from "@/lib/i18n";

const LEADS_BULLETS = [
  "home.installerWhy.leadsItem1",
  "home.installerWhy.leadsItem2",
  "home.installerWhy.leadsItem3",
] as const satisfies readonly MessageKey[];

const RFP_BULLETS = [
  "home.installerWhy.rfpItem1",
  "home.installerWhy.rfpItem2",
  "home.installerWhy.rfpItem3",
  "home.installerWhy.rfpItem4",
] as const satisfies readonly MessageKey[];

const ADVANTAGE_CARDS = [
  { titleKey: "home.installerAdvantages.card1Title", textKey: "home.installerAdvantages.card1Text", icon: "target" },
  { titleKey: "home.installerAdvantages.card2Title", textKey: "home.installerAdvantages.card2Text", icon: "clock" },
  { titleKey: "home.installerAdvantages.card3Title", textKey: "home.installerAdvantages.card3Text", icon: "layers" },
  { titleKey: "home.installerAdvantages.card4Title", textKey: "home.installerAdvantages.card4Text", icon: "pin" },
] as const;

const HOW_STEPS = [
  {
    titleKey: "home.installerHow.step1Title",
    textKey: "home.installerHow.step1Text",
    icon: "search",
  },
  {
    titleKey: "home.installerHow.step2Title",
    textKey: "home.installerHow.step2Text",
    icon: "chart",
  },
  {
    titleKey: "home.installerHow.step3Title",
    textKey: "home.installerHow.step3Text",
    icon: "cart",
  },
  {
    titleKey: "home.installerHow.step4Title",
    textKey: "home.installerHow.step4Text",
    icon: "phone",
  },
] as const satisfies readonly { titleKey: MessageKey; textKey: MessageKey; icon: string }[];

function InstallerIcon({ name }: { name: string }) {
  if (name === "search") {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <circle cx="11" cy="11" r="7" />
        <path d="M20 20l-3-3" strokeLinecap="round" />
      </svg>
    );
  }
  if (name === "doc") {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <path d="M8 4h8l4 4v12H8z" strokeLinejoin="round" />
        <path d="M16 4v4h4M10 13h6M10 17h4" strokeLinecap="round" />
      </svg>
    );
  }
  if (name === "target") {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="5" />
        <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
      </svg>
    );
  }
  if (name === "clock") {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (name === "layers") {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <path d="M12 3l9 5-9 5-9-5 9-5z" strokeLinejoin="round" />
        <path d="M3 12l9 5 9-5M3 17l9 5 9-5" strokeLinejoin="round" />
      </svg>
    );
  }
  if (name === "pin") {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <path d="M12 21s6-5.2 6-10a6 6 0 10-12 0c0 4.8 6 10 6 10z" strokeLinejoin="round" />
        <circle cx="12" cy="11" r="2.5" />
      </svg>
    );
  }
  if (name === "chart") {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <path d="M4 19V5M4 19h16" strokeLinecap="round" />
        <path d="M8 16V11M12 16V8M16 16v-5" strokeLinecap="round" />
      </svg>
    );
  }
  if (name === "cart") {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <path d="M6 6h15l-1.5 9H8L6 6z" strokeLinejoin="round" />
        <circle cx="10" cy="19" r="1.5" fill="currentColor" stroke="none" />
        <circle cx="17" cy="19" r="1.5" fill="currentColor" stroke="none" />
        <path d="M6 6L5 3H2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (name === "phone") {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <path
          d="M8 3h3l1 5-2 1a11 11 0 005 5l1-2 5 1v3a2 2 0 01-2 2A15 15 0 018 5a2 2 0 012-2z"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path
        d="M8 4h3l2 5h7v2H7.5L5 4H4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M6.5 14h11l1.5 6H8" strokeLinejoin="round" />
    </svg>
  );
}

export default function HomeInstallerPageSections() {
  const t = useTranslations();

  return (
    <div className="surface-light">
      <section className="container-x py-14 sm:py-20">
        <div className="mx-auto max-w-3xl text-center">
          <SectionEyebrow>{t("home.installerWhy.eyebrow")}</SectionEyebrow>
          <h2 className="section-title mt-3">{t("home.installerWhy.title")}</h2>
        </div>
        <div className="installer-source-grid mt-10">
          <article className="installer-source-card">
            <span className="installer-source-icon">
              <InstallerIcon name="search" />
            </span>
            <h3 className="installer-source-title">{t("home.installerWhy.leadsTitle")}</h3>
            <p className="installer-source-desc">{t("home.installerWhy.leadsDesc")}</p>
            <ul className="installer-source-list">
              {LEADS_BULLETS.map((key) => (
                <li key={key}>{t(key)}</li>
              ))}
            </ul>
          </article>
          <article className="installer-source-card">
            <span className="installer-source-icon">
              <InstallerIcon name="doc" />
            </span>
            <h3 className="installer-source-title">{t("home.installerWhy.rfpTitle")}</h3>
            <p className="installer-source-desc">{t("home.installerWhy.rfpDesc")}</p>
            <ul className="installer-source-list">
              {RFP_BULLETS.map((key) => (
                <li key={key}>{t(key)}</li>
              ))}
            </ul>
          </article>
        </div>
      </section>

      <section className="container-x border-t border-slate-100 py-14 sm:py-20">
        <div className="mx-auto max-w-3xl text-center">
          <SectionEyebrow>{t("home.installerAdvantages.eyebrow")}</SectionEyebrow>
          <h2 className="section-title mt-3">{t("home.installerAdvantages.title")}</h2>
        </div>
        <div className="installer-advantages-grid mt-10">
          {ADVANTAGE_CARDS.map((card) => (
            <article key={card.titleKey} className="installer-advantage-card">
              <span className="installer-advantage-icon">
                <InstallerIcon name={card.icon} />
              </span>
              <h3 className="installer-advantage-title">{t(card.titleKey)}</h3>
              <p className="installer-advantage-text">{t(card.textKey)}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="container-x border-t border-slate-100 py-14 sm:py-20">
        <div className="mx-auto max-w-3xl text-center">
          <SectionEyebrow>{t("home.installerHow.eyebrow")}</SectionEyebrow>
          <h2 className="section-title mt-3">{t("home.installerHow.title")}</h2>
        </div>
        <ol className="installer-how-grid mt-10">
          {HOW_STEPS.map((step, index) => (
            <li key={step.titleKey} className="installer-how-card">
              <span className="installer-how-num" aria-hidden>
                {index + 1}
              </span>
              <span className="installer-how-icon">
                <InstallerIcon name={step.icon} />
              </span>
              <h3 className="installer-how-title">{t(step.titleKey)}</h3>
              <p className="installer-how-text">{t(step.textKey)}</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

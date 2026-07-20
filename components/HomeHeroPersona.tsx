"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";
import { usePersona } from "@/components/PersonaProvider";
import { useTranslations } from "@/components/LocaleProvider";
import HeroActionList, {
  HeroActionCalculatorIcon,
  HeroActionCheckIcon,
  HeroActionDocumentIcon,
  HeroActionRadarIcon,
  HeroActionUploadIcon,
} from "@/components/HeroActionList";
import { INSTALLER_CHANTIERS_LINKS } from "@/lib/installer-nav";
import type { Persona } from "@/lib/persona";

const CARD_ICONS: Record<Persona, ReactNode> = {
  installer: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <circle cx="12" cy="12" r="9" opacity="0.35" />
      <circle cx="12" cy="12" r="5.5" opacity="0.55" />
      <circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" />
      <path d="M12 12 L20 6" strokeLinecap="round" />
    </svg>
  ),
  owner: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M4 10h16v10H4z" strokeLinejoin="round" />
      <path d="M2 10l10-6 10 6" strokeLinejoin="round" />
      <path d="M9 20v-6h6v6" strokeLinejoin="round" />
    </svg>
  ),
};

export default function HomeHeroPersona() {
  const { persona, sessionPick, ready, setPersona, clearPersona } = usePersona();
  const t = useTranslations();

  useEffect(() => {
    clearPersona();
  }, [clearPersona]);

  const showChooser = !ready || persona === null || !sessionPick;

  const personaCards: {
    id: Persona;
    title: string;
    subtitle?: string;
    description: string;
  }[] = [
    {
      id: "installer",
      title: t("home.installerCardTitle"),
      description: t("home.installerCardDesc"),
    },
    {
      id: "owner",
      title: t("home.ownerCardTitle"),
      subtitle: t("home.ownerCardSubtitle"),
      description: t("home.ownerCardDesc"),
    },
  ];

  return (
    <section className="hero-surface relative overflow-hidden">
      <div className="container-x relative flex flex-1 flex-col justify-center py-10 sm:py-14">
        <div className="mx-auto w-full max-w-4xl text-center animate-fade-up">
          {showChooser ? (
            <>
              <h1 className="text-4xl font-extrabold leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-[3.25rem]">
                {t("home.chooseTitlePrefix")}
                <span className="text-gradient">{t("home.chooseTitleAccent")}</span>
              </h1>
              <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-slate-400 sm:text-lg">
                {t("home.chooseLead")}
              </p>
              <div className="persona-cards mt-10">
                {personaCards.map((card) => (
                  <button
                    key={card.id}
                    type="button"
                    className="persona-card"
                    onClick={() => setPersona(card.id)}
                  >
                    <span className="persona-card-icon">{CARD_ICONS[card.id]}</span>
                    <span className="persona-card-title">{card.title}</span>
                    {card.subtitle ? (
                      <span className="persona-card-subtitle">{card.subtitle}</span>
                    ) : null}
                    <span className="persona-card-desc">{card.description}</span>
                  </button>
                ))}
              </div>
            </>
          ) : persona === "installer" ? (
            <InstallerHero t={t} />
          ) : (
            <OwnerHero t={t} />
          )}
        </div>
      </div>

      <div className="mt-auto flex justify-center pb-8 pt-4 sm:pb-10">
        <a
          href="#loi-aper"
          className="group flex flex-col items-center gap-1 text-xs font-medium uppercase tracking-widest text-slate-300 transition hover:text-white"
        >
          {t("home.discover")}
          <svg
            className="mt-1 h-4 w-4 animate-bounce text-slate-400 group-hover:text-solar"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden
          >
            <path d="M12 5v14M5 12l7 7 7-7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </a>
      </div>
    </section>
  );
}

function InstallerHero({ t }: { t: (key: import("@/lib/i18n").MessageKey) => string }) {
  return (
    <>
      <p className="mt-6 text-xs font-semibold uppercase tracking-widest text-solar">
        {t("persona.installer")}
      </p>
      <h1 className="mt-3 text-4xl font-extrabold leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-[3.25rem]">
        {t("home.installerHeroTitle")}{" "}
        <span className="text-gradient">{t("home.installerHeroAccent")}</span>
      </h1>
      <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-slate-400 sm:text-lg">
        {t("home.installerHeroLead")}
      </p>
      <HeroActionList
        items={[
          {
            href: INSTALLER_CHANTIERS_LINKS[0].href,
            label: t("home.installerLeadsLabel"),
            hint: t("home.installerLeadsHint"),
            icon: <HeroActionRadarIcon />,
          },
          {
            href: INSTALLER_CHANTIERS_LINKS[1].href,
            label: t("home.installerRfpLabel"),
            hint: t("home.installerRfpHint"),
            icon: <HeroActionDocumentIcon />,
          },
        ]}
      />
    </>
  );
}

function OwnerHero({ t }: { t: (key: import("@/lib/i18n").MessageKey) => string }) {
  return (
    <>
      <p className="mt-6 text-xs font-semibold uppercase tracking-widest text-solar">
        {t("persona.owner")}
      </p>
      <h1 className="mt-3 text-4xl font-extrabold leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-[3.25rem]">
        {t("home.ownerHeroTitle")}{" "}
        <span className="text-gradient">{t("home.ownerHeroAccent")}</span>
      </h1>
      <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-slate-400 sm:text-lg">
        {t("home.ownerHeroLead")}
      </p>
      <HeroActionList
        badge={t("home.freeBadge")}
        items={[
          {
            href: "/verifier",
            label: t("home.ownerVerifyLabel"),
            hint: t("home.ownerVerifyHint"),
            icon: <HeroActionCheckIcon />,
          },
          {
            href: "/simulateur",
            label: t("home.ownerSimLabel"),
            hint: t("home.ownerSimHint"),
            icon: <HeroActionCalculatorIcon />,
          },
          {
            href: "/appels-offres/nouveau",
            label: t("home.ownerDepositLabel"),
            hint: t("home.ownerDepositHint"),
            icon: <HeroActionUploadIcon />,
          },
        ]}
      />
    </>
  );
}

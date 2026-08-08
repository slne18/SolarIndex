"use client";

import type { ReactNode } from "react";
import { usePersona } from "@/components/PersonaProvider";
import { useTranslations } from "@/components/LocaleProvider";
import HeroActionList, {
  HeroActionCheckIcon,
  HeroActionDocumentIcon,
  HeroActionPercentIcon,
  HeroActionRadarIcon,
  HeroActionUploadIcon,
} from "@/components/HeroActionList";
import HomeHeroBenefits from "@/components/HomeHeroBenefits";
import HeroScrollCue from "@/components/HeroScrollCue";
import { INSTALLER_CHANTIERS_LINKS } from "@/lib/installer-nav";
import type { Persona } from "@/lib/persona";

const CARD_ICONS: Record<Persona, ReactNode> = {
  installer: <HeroActionRadarIcon />,
  owner: <HeroActionOwnerIcon />,
};

export default function HomeHeroPersona() {
  const { persona, sessionPick, ready, setPersona } = usePersona();
  const t = useTranslations();

  const showChooser = !ready || persona === null || !sessionPick;

  const personaCards: {
    id: Persona;
    title: string;
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
      description: t("home.ownerCardDesc"),
    },
  ];

  return (
    <section
      className={`hero-surface relative overflow-hidden ${
        !showChooser && persona ? "hero-surface-owner" : ""
      }`.trim()}
    >
      <div className="container-x relative flex flex-1 flex-col justify-center py-10 sm:py-14">
        <div className="mx-auto w-full max-w-6xl animate-fade-up">
          {showChooser ? (
            <>
              <div className="hero-home-head">
                <h1 className="hero-home-platform-title">
                  <span className="block">
                    {t("home.chooseTitleLine1Before")}
                    <span className="hero-home-platform-accent">{t("home.chooseTitleAccent")}</span>
                    {t("home.chooseTitleLine1After")}
                  </span>
                  <span className="block">
                    Solar<span className="hero-home-platform-accent">Index</span>
                    {t("home.chooseTitleLine2After")}
                  </span>
                </h1>
                <p className="hero-home-lead">
                  Solar<span className="hero-home-platform-accent">Index</span>
                  {t("home.heroLeadAfter")}
                </p>
              </div>
              <div className="hero-home-chooser mt-8 sm:mt-10">
                <div className="hero-actions-wrap">
                  <div className="hero-actions">
                    {personaCards.map((card) => (
                      <button
                        key={card.id}
                        type="button"
                        className="hero-action group"
                        onClick={() => setPersona(card.id)}
                      >
                        <span className="hero-action-icon" aria-hidden>
                          {CARD_ICONS[card.id]}
                        </span>
                        <span className="hero-action-body">
                          <span className="hero-action-label">{card.title}</span>
                          <span className="hero-action-hint">{card.description}</span>
                        </span>
                        <svg
                          className="hero-action-arrow"
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          aria-hidden
                        >
                          <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                    ))}
                  </div>
                </div>
                <HomeHeroBenefits />
              </div>
            </>
          ) : (
            <div className="text-center">
              {persona === "installer" ? <InstallerHero t={t} /> : <OwnerHero t={t} />}
            </div>
          )}
        </div>
      </div>

      {showChooser ? (
        <HeroScrollCue href="#loi-aper" label={t("home.discover")} />
      ) : persona ? (
        <HeroScrollCue href="#decouvrir" label={t("home.discover")} />
      ) : null}
    </section>
  );
}

function InstallerHero({ t }: { t: (key: import("@/lib/i18n").MessageKey) => string }) {
  return (
    <>
      <p className="mt-6 text-xs font-semibold uppercase tracking-[0.2em] text-solar">
        {t("home.installerHeroEyebrow")}
      </p>
      <h1 className="hero-persona-title">
        {t("home.installerHeroTitleBefore")}
        <span className="text-solar">APER</span>
        {t("home.installerHeroTitleAfter")}
      </h1>
      <p className="hero-on-photo-lead mx-auto max-w-3xl font-bold">{t("home.installerHeroLead")}</p>
      <p className="hero-on-photo-lead mx-auto mt-4 max-w-3xl">
        Solar<span className="hero-home-platform-accent">Index</span>
        {t("home.installerHeroBodyBefore")}
        <span className="text-solar">APER</span>
        {t("home.installerHeroBodyAfter")}
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
      <p className="mt-6 text-xs font-semibold uppercase tracking-[0.2em] text-solar">
        {t("home.ownerHeroEyebrow")}
      </p>
      <h1 className="hero-persona-title">
        {t("home.ownerHeroTitleBefore")}
        <span className="text-solar">APER</span>
        {t("home.ownerHeroTitleAfter")}
      </h1>
      <p className="hero-on-photo-lead mx-auto max-w-3xl">{t("home.ownerHeroLead")}</p>
      <HeroActionList
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
            icon: <HeroActionPercentIcon />,
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

function HeroActionOwnerIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path d="M4 10h16v10H4z" strokeLinejoin="round" />
      <path d="M2 10l10-6 10 6" strokeLinejoin="round" />
      <path d="M9 20v-6h6v6" strokeLinejoin="round" />
    </svg>
  );
}

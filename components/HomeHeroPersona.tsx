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
        showChooser ? "" : persona === "owner" ? "hero-surface-owner" : ""
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
                  <span className="block">{t("home.chooseTitleLine2")}</span>
                </h1>
                <p className="hero-home-lead">{t("home.heroLead")}</p>
              </div>
              <div className="hero-home-chooser mt-8 sm:mt-10">
                <div className="persona-cards">
                  {personaCards.map((card) => (
                    <button
                      key={card.id}
                      type="button"
                      className="persona-card persona-card-row group"
                      onClick={() => setPersona(card.id)}
                    >
                      <span className="persona-card-icon shrink-0">{CARD_ICONS[card.id]}</span>
                      <span className="persona-card-content min-w-0 flex-1">
                        <span className="persona-card-title block">{card.title}</span>
                        <span className="persona-card-desc mt-1.5 block">{card.description}</span>
                      </span>
                      <svg
                        className="persona-card-arrow shrink-0"
                        width="20"
                        height="20"
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
      ) : persona === "installer" ? (
        <HeroScrollCue href="#tarifs" label={t("home.viewPricing")} />
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
      <h1 className="hero-persona-title">{t("home.installerHeroTitle")}</h1>
      <p className="hero-on-photo-lead mx-auto max-w-3xl">{t("home.installerHeroLead")}</p>
      <p className="hero-on-photo-lead mx-auto mt-4 max-w-3xl text-slate-300/90">
        {t("home.installerHeroBody")}
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
      <h1 className="hero-persona-title">{t("home.ownerHeroTitle")}</h1>
      <p className="hero-on-photo-lead mx-auto max-w-3xl">{t("home.ownerHeroLead")}</p>
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

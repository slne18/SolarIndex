"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";
import { PERSONA_LABELS, type Persona } from "@/lib/persona";
import { usePersona } from "@/components/PersonaProvider";
import HeroActionList, {
  HeroActionCalculatorIcon,
  HeroActionCheckIcon,
  HeroActionDocumentIcon,
  HeroActionRadarIcon,
  HeroActionUploadIcon,
} from "@/components/HeroActionList";
import { INSTALLER_CHANTIERS_LINKS } from "@/lib/installer-nav";

const PERSONA_CARDS: {
  id: Persona;
  title: string;
  subtitle?: string;
  description: string;
  icon: ReactNode;
}[] = [
  {
    id: "installer",
    title: "Je suis installateur",
    description:
      "Prospectez des parkings non conformes APER : leads enrichis et appels d'offres.",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <circle cx="12" cy="12" r="9" opacity="0.35" />
        <circle cx="12" cy="12" r="5.5" opacity="0.55" />
        <circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" />
        <path d="M12 12 L20 6" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: "owner",
    title: "Je suis propriétaire",
    subtitle: "ou un gestionnaire de parking",
    description:
      "Vérifiez si vous êtes concerné, estimez vos gains et recevez des propositions d'installateurs.",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <path d="M4 10h16v10H4z" strokeLinejoin="round" />
        <path d="M2 10l10-6 10 6" strokeLinejoin="round" />
        <path d="M9 20v-6h6v6" strokeLinejoin="round" />
      </svg>
    ),
  },
];

export default function HomeHeroPersona() {
  const { persona, sessionPick, ready, setPersona, clearPersona } = usePersona();

  useEffect(() => {
    clearPersona();
  }, [clearPersona]);

  const showChooser = !ready || persona === null || !sessionPick;

  return (
    <section className="hero-surface relative overflow-hidden">
      <div className="container-x relative flex flex-1 flex-col justify-center py-10 sm:py-14">
        <div className="mx-auto w-full max-w-4xl text-center animate-fade-up">
          {showChooser ? (
            <>
              <h1 className="text-4xl font-extrabold leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-[3.25rem]">
                La loi APER concerne{" "}
                <span className="text-gradient">installateurs et propriétaires.</span>
              </h1>
              <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-slate-400 sm:text-lg">
                Choisissez votre profil pour accéder aux bons outils et parcours.
              </p>
              <div className="persona-cards mt-10">
                {PERSONA_CARDS.map((card) => (
                  <button
                    key={card.id}
                    type="button"
                    className="persona-card"
                    onClick={() => setPersona(card.id)}
                  >
                    <span className="persona-card-icon">{card.icon}</span>
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
            <InstallerHero />
          ) : (
            <OwnerHero />
          )}
        </div>
      </div>

      <div className="mt-auto flex justify-center pb-8 pt-4 sm:pb-10">
        <a
          href="#loi-aper"
          className="group flex flex-col items-center gap-1 text-xs font-medium uppercase tracking-widest text-slate-300 transition hover:text-white"
        >
          Découvrir
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

function InstallerHero() {
  return (
    <>
      <p className="mt-6 text-xs font-semibold uppercase tracking-widest text-solar">
        {PERSONA_LABELS.installer}
      </p>
      <h1 className="mt-3 text-4xl font-extrabold leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-[3.25rem]">
        Repérez les parkings non conformes APER{" "}
        <span className="text-gradient">avant l&apos;amende.</span>
      </h1>
      <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-slate-400 sm:text-lg">
        Deux sources de chantiers pour votre prospection B2B.
      </p>
      <HeroActionList
        items={[
          {
            href: INSTALLER_CHANTIERS_LINKS[0].href,
            label: INSTALLER_CHANTIERS_LINKS[0].label,
            hint: INSTALLER_CHANTIERS_LINKS[0].hint,
            icon: <HeroActionRadarIcon />,
          },
          {
            href: INSTALLER_CHANTIERS_LINKS[1].href,
            label: INSTALLER_CHANTIERS_LINKS[1].label,
            hint: INSTALLER_CHANTIERS_LINKS[1].hint,
            icon: <HeroActionDocumentIcon />,
          },
        ]}
      />
    </>
  );
}

function OwnerHero() {
  return (
    <>
      <p className="mt-6 text-xs font-semibold uppercase tracking-widest text-solar">
        {PERSONA_LABELS.owner}
      </p>
      <h1 className="mt-3 text-4xl font-extrabold leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-[3.25rem]">
        Votre parking est-il concerné{" "}
        <span className="text-gradient">par la loi APER ?</span>
      </h1>
      <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-slate-400 sm:text-lg">
        Vérifiez votre obligation, estimez vos gains, puis déposez votre projet pour recevoir des
        propositions d&apos;installateurs solaires.
      </p>
      <HeroActionList
        badge="Gratuit · sans engagement"
        items={[
          {
            href: "/verifier",
            label: "Vérifier mon parking",
            hint: "Éligibilité APER et échéances",
            icon: <HeroActionCheckIcon />,
          },
          {
            href: "/simulateur",
            label: "Simuler gains & économies",
            hint: "ROI estimé et amende évitée",
            icon: <HeroActionCalculatorIcon />,
          },
          {
            href: "/appels-offres/nouveau",
            label: "Déposer mon projet",
            hint: "Des installateurs vous envoient leurs propositions",
            icon: <HeroActionUploadIcon />,
          },
        ]}
      />
    </>
  );
}

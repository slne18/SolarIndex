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

const PERSONA_CARDS: {
  id: Persona;
  title: string;
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
      <div className="container-x relative pt-14 pb-8 sm:pt-20 sm:pb-10">
        <div className="mx-auto max-w-4xl text-center animate-fade-up">
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

      <div className="flex justify-center pb-14 sm:pb-16">
        <a
          href="#loi-aper"
          className="group flex flex-col items-center gap-1 text-xs font-medium uppercase tracking-widest text-slate-500 transition hover:text-slate-300"
        >
          Découvrir
          <svg
            className="mt-1 h-4 w-4 animate-bounce text-slate-600 group-hover:text-solar"
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
            href: "/leads",
            label: "Accéder aux leads",
            hint: "Parkings ≥ 1 500 m² repérés, enrichis cadastre & SIREN, scorés pour la prospection",
            icon: <HeroActionRadarIcon />,
          },
          {
            href: "/appels-offres",
            label: "Consulter les appels d'offres",
            hint: "Projets déposés par les gérants prêts à équiper",
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
        Vérifiez gratuitement votre obligation, estimez vos gains, puis déposez votre projet pour
        recevoir des propositions d&apos;installateurs solaires — sans engagement.
      </p>
      <HeroActionList
        items={[
          {
            href: "/verifier",
            label: "Vérifier mon parking",
            hint: "Éligibilité APER · outil gratuit",
            icon: <HeroActionCheckIcon />,
          },
          {
            href: "/simulateur",
            label: "Simuler gains & économies",
            hint: "ROI et amende évitée · outil gratuit",
            icon: <HeroActionCalculatorIcon />,
          },
          {
            href: "/appels-offres/nouveau",
            label: "Déposer mon projet",
            hint: "Gratuit · installateurs vous contactent avec des propositions",
            icon: <HeroActionUploadIcon />,
          },
        ]}
      />
    </>
  );
}

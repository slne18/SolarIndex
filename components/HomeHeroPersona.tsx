"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { PERSONA_LABELS, type Persona } from "@/lib/persona";
import { usePersona } from "@/components/PersonaProvider";

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
      "Prospectez des parkings non conformes APER : leads enrichis, appels d'offres et outils de qualification.",
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
  const { persona, ready, setPersona, clearPersona } = usePersona();

  return (
    <section className="hero-surface relative overflow-hidden">
      <div className="container-x relative pt-14 pb-8 sm:pt-20 sm:pb-10">
        <div className="mx-auto max-w-4xl text-center animate-fade-up">
          <p className="pill-accent mx-auto w-fit">
            Parkings solaires APER · France entière
          </p>

          {!ready || persona === null ? (
            <>
              <h1 className="mt-6 text-4xl font-extrabold leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-[3.25rem]">
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
            <InstallerHero onSwitch={clearPersona} />
          ) : (
            <OwnerHero onSwitch={clearPersona} />
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

function SwitchProfileButton({ onSwitch }: { onSwitch: () => void }) {
  return (
    <button type="button" className="persona-switch-link mt-6" onClick={onSwitch}>
      Changer de profil
    </button>
  );
}

function InstallerHero({ onSwitch }: { onSwitch: () => void }) {
  return (
    <>
      <p className="mt-6 text-xs font-semibold uppercase tracking-widest text-solar">
        {PERSONA_LABELS.installer}
      </p>
      <h1 className="mt-3 text-4xl font-extrabold leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-[3.25rem]">
        Repérez les parkings non conformes APER{" "}
        <span className="text-gradient">avant l&apos;amende.</span>
      </h1>
      <div className="mx-auto mt-5 max-w-2xl space-y-3 text-base leading-relaxed text-slate-400 sm:text-lg">
        <p>Deux sources de chantiers pour votre prospection B2B.</p>
        <p>
          <strong className="font-medium text-slate-300">Leads automatisés</strong> — parkings ≥
          1 500 m² repérés, enrichis cadastre &amp; SIREN, scorés pour la prospection.
        </p>
        <p>
          <strong className="font-medium text-slate-300">Appels d&apos;offres</strong> — projets
          déposés par des gérants prêts à équiper.
        </p>
      </div>
      <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
        <Link href="/leads" className="btn-solar min-w-[15.5rem]">
          Accéder aux leads
        </Link>
        <Link href="/appels-offres" className="btn-mint min-w-[15.5rem]">
          Appels d&apos;offres
        </Link>
      </div>
      <SwitchProfileButton onSwitch={onSwitch} />
    </>
  );
}

function OwnerHero({ onSwitch }: { onSwitch: () => void }) {
  return (
    <>
      <p className="mt-6 text-xs font-semibold uppercase tracking-widest text-solar">
        {PERSONA_LABELS.owner}
      </p>
      <h1 className="mt-3 text-4xl font-extrabold leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-[3.25rem]">
        Votre parking est-il concerné{" "}
        <span className="text-gradient">par la loi APER ?</span>
      </h1>
      <div className="mx-auto mt-5 max-w-2xl space-y-3 text-base leading-relaxed text-slate-400 sm:text-lg">
        <p>Vérifiez votre éligibilité, estimez vos gains et recevez des propositions d&apos;installateurs.</p>
        <p>
          <strong className="font-medium text-slate-300">Sans engagement</strong> — outils gratuits
          puis dépôt de projet modéré pour être contacté par des professionnels.
        </p>
      </div>
      <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <Link href="/verifier" className="btn-solar min-w-[15.5rem]">
          Vérifier mon parking
        </Link>
        <Link href="/simulateur" className="btn-ghost min-w-[15.5rem]">
          Simuler gains &amp; économies
        </Link>
        <Link href="/appels-offres/nouveau" className="btn-mint min-w-[15.5rem]">
          Déposer mon projet
        </Link>
      </div>
      <SwitchProfileButton onSwitch={onSwitch} />
    </>
  );
}

"use client";

import { usePersona } from "@/components/PersonaProvider";
import HeroActionList, {
  HeroActionCalculatorIcon,
  HeroActionDocumentIcon,
  HeroActionRadarIcon,
  HeroActionUploadIcon,
} from "@/components/HeroActionList";

export default function PersonaToolCta() {
  const { persona, ready } = usePersona();

  if (!ready) return null;

  if (persona === "installer") {
    return (
      <div className="card mt-10 border-white/[0.12] p-5 sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Installateur solaire
        </p>
        <p className="mt-2 text-sm leading-relaxed text-slate-300">
          Utilisez cet outil pour qualifier un parking avant prospection, puis retrouvez-le dans le
          catalogue leads.
        </p>
        <HeroActionList
          className="hero-actions-compact"
          items={[
            {
              href: "/leads",
              label: "Parcourir les leads",
              hint: "Catalogue automatisé",
              icon: <HeroActionRadarIcon />,
            },
            {
              href: "/appels-offres",
              label: "Consulter les appels d'offres",
              hint: "Projets déposés",
              icon: <HeroActionDocumentIcon />,
            },
          ]}
        />
      </div>
    );
  }

  return (
    <div className="card mt-10 border-white/[0.12] p-5 sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
        Propriétaire
      </p>
      <p className="mt-2 text-sm leading-relaxed text-slate-300">
        Étape suivante : déposez votre projet pour recevoir des propositions d&apos;installateurs
        (mise en relation commerciale privée).
      </p>
      <HeroActionList
        className="hero-actions-compact"
        items={[
          {
            href: "/appels-offres/nouveau",
            label: "Déposer mon projet",
            hint: "Mise en relation installateurs",
            icon: <HeroActionUploadIcon />,
          },
          {
            href: "/simulateur",
            label: "Simuler mes gains",
            hint: "ROI et économies",
            icon: <HeroActionCalculatorIcon />,
          },
        ]}
      />
    </div>
  );
}

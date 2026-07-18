"use client";

import Link from "next/link";
import { usePersona } from "@/components/PersonaProvider";

export default function PersonaToolCta() {
  const { persona, ready } = usePersona();

  if (!ready) return null;

  if (persona === "installer") {
    return (
      <div className="card mt-10 border-solar/20 bg-solar/5 p-5 sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-solar">
          Installateur solaire
        </p>
        <p className="mt-2 text-sm leading-relaxed text-slate-300">
          Utilisez cet outil pour qualifier un parking avant prospection, puis retrouvez-le dans le
          catalogue leads.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/leads" className="btn-solar text-sm">
            Parcourir les leads
          </Link>
          <Link href="/appels-offres" className="btn-ghost text-sm">
            Appels d&apos;offres
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="card mt-10 border-mint/20 bg-mint/5 p-5 sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-wider text-mint">
        Propriétaire
      </p>
      <p className="mt-2 text-sm leading-relaxed text-slate-300">
        Étape suivante : déposez votre projet pour recevoir des propositions d&apos;installateurs
        (mise en relation commerciale privée).
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <Link href="/appels-offres/nouveau" className="btn-mint text-sm">
          Déposer mon projet
        </Link>
        <Link href="/simulateur" className="btn-ghost text-sm">
          Simuler mes gains
        </Link>
      </div>
    </div>
  );
}

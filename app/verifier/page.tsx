import { Suspense } from "react";
import { buildPageMetadata } from "@/lib/seo-config";
import VerifierClient from "./VerifierClient";

export const metadata = buildPageMetadata({
  title: "Vérifier l'éligibilité APER de mon parking",
  description:
    "Vérifiez gratuitement si votre parking est concerné par l'obligation de solarisation APER : surface, échéance, amende et dérogations potentielles.",
  path: "/verifier",
  keywords: [
    "vérifier éligibilité APER",
    "parking loi APER",
    "obligation ombrières parking",
    "surface parking APER",
  ],
});

export default function VerifierPage() {
  return (
    <div className="container-x py-10 sm:py-14">
      <p className="pill-accent w-fit">Outil gratuit</p>
      <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
        Vérificateur d&apos;éligibilité APER
      </h1>
      <p className="mt-3 max-w-2xl text-base leading-relaxed text-slate-400">
        Saisissez l&apos;adresse de votre parking. Nous détectons la surface via OpenStreetMap ou le
        cadastre, puis estimons votre échéance réglementaire et les dérogations possibles.
      </p>
      <Suspense fallback={<p className="mt-8 text-sm text-slate-500">Chargement…</p>}>
        <div className="mt-8">
          <VerifierClient />
        </div>
      </Suspense>
    </div>
  );
}

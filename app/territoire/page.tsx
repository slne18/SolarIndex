import { buildPageMetadata } from "@/lib/seo-config";
import TerritoireClient from "./TerritoireClient";

export const metadata = buildPageMetadata({
  title: "Leads dans ma zone — estimation APER autour de vous",
  description:
    "Installateurs photovoltaïques : estimez le nombre de leads parking APER disponibles dans votre zone (25, 50 ou 100 km) ou par département.",
  path: "/territoire",
});

export default function TerritoirePage() {
  return (
    <div className="container-x py-10 sm:py-14">
      <p className="pill-accent w-fit">Installateurs</p>
      <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
        Leads dans ma zone
      </h1>
      <p className="mt-3 max-w-2xl text-base text-slate-400">
        Estimez combien de leads parking APER sont disponibles autour de votre adresse ou dans un
        département — idéal avant d&apos;acheter le Pack Territoire.
      </p>
      <div className="mt-8">
        <TerritoireClient />
      </div>
    </div>
  );
}

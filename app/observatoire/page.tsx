import { buildPageMetadata } from "@/lib/seo-config";
import ObservatoireClient from "./ObservatoireClient";

export const metadata = buildPageMetadata({
  title: "Observatoire parkings solaires France — statistiques loi APER",
  description:
    "Carte de chaleur nationale des parkings non conformes à la loi APER : statistiques par département, surface totale et valeur pipeline estimée.",
  path: "/observatoire",
  keywords: [
    "observatoire parkings solaires France",
    "statistiques loi APER par département",
    "carte parkings non conformes photovoltaïque",
  ],
});

export default function ObservatoirePage() {
  return (
    <div className="surface-light min-h-screen pb-16">
      <div className="container-x py-10 sm:py-14">
        <p className="pill-accent w-fit">Open Data</p>
        <h1 className="section-title mt-4">Observatoire national APER</h1>
        <p className="section-lead mt-3 max-w-3xl">
          Statistiques agrégées par département — aucune donnée individuelle de lead. Carte
          partageable pour la presse et les professionnels du photovoltaïque.
        </p>
        <div className="mt-10">
          <ObservatoireClient />
        </div>
      </div>
    </div>
  );
}

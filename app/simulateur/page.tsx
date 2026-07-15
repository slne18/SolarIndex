import { buildPageMetadata } from "@/lib/seo-config";
import SimulateurClient from "./SimulateurClient";

export const metadata = buildPageMetadata({
  title: "Simulateur ombrière parking — rentabilité loi APER",
  description:
    "Simulateur gratuit pour gestionnaires de parking : surface solaire obligatoire, production kWh, économies autoconsommation, revenus EDF OA et ROI ombrières photovoltaïques.",
  path: "/simulateur",
  keywords: [
    "simulateur ombrière parking",
    "calcul rentabilité panneaux solaires parking",
    "loi APER simulateur",
    "ombrières photovoltaïques rentabilité",
    "simulateur parking solaire",
  ],
});

export default function SimulateurPage() {
  return (
    <div className="container-x py-10 sm:py-14">
      <p className="pill-accent w-fit">Gestionnaires de parking</p>
      <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
        Simulateur ombrières solaires
      </h1>
      <p className="mt-3 max-w-2xl text-base leading-relaxed text-slate-400">
        Estimez la surface solaire obligatoire, la production, les économies d&apos;autoconsommation,
        les revenus EDF OA et le retour sur investissement — gratuitement, sans compte.
      </p>
      <div className="mt-8">
        <SimulateurClient />
      </div>
    </div>
  );
}

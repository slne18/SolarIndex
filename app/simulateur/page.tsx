import { buildPageMetadata } from "@/lib/seo-config";
import SimulateurClient from "./SimulateurClient";
import SimulateurPageShell from "./SimulateurPageShell";

export const metadata = buildPageMetadata({
  title: "Combien votre parking peut-il vous rapporter ?",
  description:
    "Estimez gratuitement vos économies solaires, revenus EDF OA, amende évitée et ROI — puis déposez un projet parking pour recevoir des propositions d'installateurs (acteurs privés).",
  path: "/simulateur",
  keywords: [
    "simulateur ombrière parking",
    "calcul rentabilité panneaux solaires parking",
    "loi APER simulateur",
    "économies parking solaire",
    "gains ombrières photovoltaïques",
  ],
});

export default function SimulateurPage() {
  return (
    <>
      <div className="hero-surface hero-surface-compact">
        <SimulateurPageShell />
      </div>
      <div className="surface-light border-t border-slate-100">
        <div className="container-x owner-tool-page py-10 sm:py-14">
          <SimulateurClient />
        </div>
      </div>
    </>
  );
}

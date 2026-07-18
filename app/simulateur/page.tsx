import PersonaToolCta from "@/components/PersonaToolCta";
import { buildPageMetadata } from "@/lib/seo-config";
import SimulateurClient from "./SimulateurClient";

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
    <div className="container-x py-10 sm:py-14">
      <p className="pill-accent w-fit">Gestionnaires de parking</p>
      <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
        Combien votre parking peut-il vous rapporter ?
      </h1>
      <p className="mt-3 max-w-2xl text-base leading-relaxed text-slate-400">
        Estimez vos économies d&apos;électricité, les revenus solaires, l&apos;amende évitée et le
        retour sur investissement — puis recevez des propositions d&apos;installateurs via un appel
        d&apos;offres.
      </p>
      <div className="mt-8">
        <SimulateurClient />
      </div>
      <PersonaToolCta />
    </div>
  );
}

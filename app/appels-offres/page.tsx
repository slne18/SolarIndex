import AppelsOffresPageClient from "./AppelsOffresPageClient";
import { buildPageMetadata } from "@/lib/seo-config";

export const dynamic = "force-dynamic";

export const metadata = buildPageMetadata({
  title: "Consultation installateurs — projets parking déposés",
  description:
    "Projets solaires déposés par des gérants de parkings privés. Mise en relation commerciale hors marchés publics. Accès aux coordonnées pour installateurs photovoltaïques.",
  path: "/appels-offres",
});

export default function AppelsOffresPage() {
  return <AppelsOffresPageClient />;
}

import AppelsOffresPageClient from "./AppelsOffresPageClient";
import { buildPageMetadata } from "@/lib/seo-config";

export const dynamic = "force-dynamic";

export const metadata = buildPageMetadata({
  title: "Appels d'offres ombrières parking — projets gérants",
  description:
    "Projets solaires déposés par les gérants de parkings prêts à équiper. Accès aux coordonnées du déposant pour installateurs photovoltaïques.",
  path: "/appels-offres",
});

export default function AppelsOffresPage() {
  return <AppelsOffresPageClient />;
}

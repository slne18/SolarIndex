import LeadsPageClient from "./LeadsPageClient";
import { buildPageMetadata } from "@/lib/seo-config";

export const dynamic = "force-dynamic";

export const metadata = buildPageMetadata({
  title: "Catalogue leads parking APER — France",
  description:
    "Parcourez les parkings non conformes à la loi APER par région et département. Estimez les leads dans votre zone, fiches B2B avec SIREN et parcelle cadastrale.",
  path: "/leads",
});

export default function LeadsPage() {
  return <LeadsPageClient />;
}

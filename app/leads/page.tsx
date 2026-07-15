import LeadsPageClient from "./LeadsPageClient";
import { buildPageMetadata } from "@/lib/seo-config";

export const dynamic = "force-dynamic";

export const metadata = buildPageMetadata({
  title: "Catalogue leads parking APER — France",
  description:
    "Parcourez les parkings non conformes à la loi APER par région et département. Fiches B2B avec SIREN, dirigeants et parcelle cadastrale pour installateurs photovoltaïques.",
  path: "/leads",
});

export default function LeadsPage() {
  return <LeadsPageClient />;
}

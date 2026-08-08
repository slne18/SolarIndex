import LoiAperPageClient from "./LoiAperPageClient";
import { buildPageMetadata } from "@/lib/seo-config";

export const metadata = buildPageMetadata({
  title: "La loi APER — obligations réglementaires des parkings",
  description:
    "Comprenez l'obligation APER : seuils de surface, échéances 2026 et 2028, amendes, mix panneaux + végétalisation (loi Huwart) et calendrier de mise en conformité.",
  path: "/loi-aper",
  keywords: [
    "loi APER",
    "obligation parking",
    "ombrières photovoltaïques",
    "échéance APER 2026",
    "loi Huwart parking",
  ],
});

export default function LoiAperPage() {
  return <LoiAperPageClient />;
}

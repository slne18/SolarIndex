import type { Metadata } from "next";
import FaqPageClient from "@/components/FaqPageClient";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: `FAQ — ${SITE_NAME}`,
  description: "Questions fréquentes sur les leads APER et appels d'offres SolarIndex.",
};

export default function FaqPage() {
  return <FaqPageClient />;
}

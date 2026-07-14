import type { Metadata } from "next";
import { zoneLabel } from "./seo-zones";
import type { SeoZoneStats } from "./seo-leads";

const SITE = process.env.NEXT_PUBLIC_URL || "https://solarindex.fr";

export function buildZoneMetadata(params: {
  region: string;
  departement?: string | null;
  stats: SeoZoneStats;
  path: string;
}): Metadata {
  const zone = zoneLabel(params.region, params.departement);
  const title = `Leads parking loi APER — ${zone} | SolarIndex`;
  const description = `${params.stats.leadCount.toLocaleString("fr-FR")} parkings non conformes identifiés en ${zone} : ${Math.round(params.stats.totalSurfaceM2).toLocaleString("fr-FR")} m² de surface, ${Math.round(params.stats.totalValeurEur).toLocaleString("fr-FR")} € de valeur chantier estimée. Ombrières photovoltaïques obligatoires (loi APER).`;

  return {
    title,
    description,
    keywords: [
      "loi APER",
      "ombrières photovoltaïques",
      "parking solaire",
      "lead B2B",
      params.region,
      ...(params.departement ? [`département ${params.departement}`] : []),
    ],
    openGraph: {
      title,
      description,
      type: "website",
      locale: "fr_FR",
      url: `${SITE}${params.path}`,
      siteName: "SolarIndex",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
    alternates: {
      canonical: `${SITE}${params.path}`,
    },
  };
}

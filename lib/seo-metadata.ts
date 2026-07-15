import type { Metadata } from "next";
import { absoluteUrl, SEO_KEYWORDS } from "./seo-config";
import { zoneLabel } from "./seo-zones";
import type { SeoZoneStats } from "./seo-leads";

export function buildZoneMetadata(params: {
  region: string;
  departement?: string | null;
  stats: SeoZoneStats;
  path: string;
}): Metadata {
  const zone = zoneLabel(params.region, params.departement);
  const title = `Leads parking loi APER — ${zone}`;
  const description = `${params.stats.leadCount.toLocaleString("fr-FR")} parkings non conformes identifiés en ${zone} : ${Math.round(params.stats.totalSurfaceM2).toLocaleString("fr-FR")} m² de surface, ${Math.round(params.stats.totalValeurEur).toLocaleString("fr-FR")} € de valeur chantier estimée. Ombrières photovoltaïques obligatoires (loi APER).`;

  return {
    title,
    description,
    keywords: [
      ...SEO_KEYWORDS,
      params.region,
      ...(params.departement ? [`département ${params.departement}`] : []),
    ],
    openGraph: {
      title: `${title} | SolarIndex`,
      description,
      type: "website",
      locale: "fr_FR",
      url: absoluteUrl(params.path),
      siteName: "SolarIndex",
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | SolarIndex`,
      description,
    },
    alternates: {
      canonical: absoluteUrl(params.path),
    },
  };
}

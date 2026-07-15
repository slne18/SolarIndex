import type { Metadata } from "next";
import { SITE_NAME, SITE_URL } from "./site";

export const SEO_DEFAULT_DESCRIPTION =
  "Leads parkings non conformes loi APER et appels d'offres solaires pour installateurs photovoltaïques en France. Ombrières obligatoires, prospection B2B par région.";

export const SEO_KEYWORDS = [
  "loi APER",
  "ombrières photovoltaïques",
  "parking solaire",
  "lead installateur solaire",
  "prospection B2B photovoltaïque",
  "parking non conforme",
  "appel d'offres ombrière",
  "SolarIndex",
];

/** Pages publiques indexables (hors zones dynamiques). */
export const SEO_STATIC_PATHS: {
  path: string;
  changeFrequency: "weekly" | "daily" | "monthly";
  priority: number;
}[] = [
  { path: "", changeFrequency: "weekly", priority: 1 },
  { path: "/leads", changeFrequency: "daily", priority: 0.9 },
  { path: "/appels-offres", changeFrequency: "daily", priority: 0.85 },
  { path: "/pack-territoire", changeFrequency: "monthly", priority: 0.7 },
  { path: "/faq", changeFrequency: "monthly", priority: 0.6 },
  { path: "/legal/confidentialite", changeFrequency: "monthly", priority: 0.3 },
  { path: "/legal/mentions-legales", changeFrequency: "monthly", priority: 0.3 },
  { path: "/legal/cgv", changeFrequency: "monthly", priority: 0.3 },
];

export function absoluteUrl(path: string): string {
  const base = SITE_URL.replace(/\/$/, "");
  return path ? `${base}${path.startsWith("/") ? path : `/${path}`}` : base;
}

export function buildPageMetadata(params: {
  title: string;
  description?: string;
  path: string;
  keywords?: string[];
}): Metadata {
  const description = params.description ?? SEO_DEFAULT_DESCRIPTION;
  const url = absoluteUrl(params.path);

  return {
    title: params.title,
    description,
    keywords: params.keywords ?? SEO_KEYWORDS,
    openGraph: {
      title: params.title,
      description,
      type: "website",
      locale: "fr_FR",
      url,
      siteName: SITE_NAME,
    },
    twitter: {
      card: "summary_large_image",
      title: params.title,
      description,
    },
    alternates: {
      canonical: url,
    },
  };
}

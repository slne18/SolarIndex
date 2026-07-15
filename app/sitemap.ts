import type { MetadataRoute } from "next";
import { SEO_STATIC_PATHS, absoluteUrl } from "@/lib/seo-config";
import { getSeoDepartementParams, getSeoRegionSlugs } from "@/lib/seo-leads";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const entries: MetadataRoute.Sitemap = SEO_STATIC_PATHS.map(({ path, changeFrequency, priority }) => ({
    url: absoluteUrl(path),
    lastModified: now,
    changeFrequency,
    priority,
  }));

  const [regions, departements] = await Promise.all([
    getSeoRegionSlugs(),
    getSeoDepartementParams(),
  ]);

  for (const region of regions) {
    entries.push({
      url: absoluteUrl(`/leads/${region}`),
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.8,
    });
  }

  for (const { region, departement } of departements) {
    entries.push({
      url: absoluteUrl(`/leads/${region}/${departement}`),
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.75,
    });
  }

  return entries;
}

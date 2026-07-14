import { getAdminClient } from "./supabase";
import { VISION_COVERAGE_EQUIPE } from "./pv-overlap";
import { MAX_BUYERS_PER_LEAD } from "./lead-slots";
import { SURFACE_GRAY_LOW_MAX_M2 } from "./surface-thresholds";
import { computePrixLeadFromRow, leadTier } from "./leads";
import type { LeadRow, LeadTier } from "./types";
import {
  ALL_REGIONS,
  allStaticDepartementParams,
  departementToSlug,
  getDepartmentsForRegion,
  regionToSlug,
} from "./seo-zones";

export const SEO_LEADS_LIMIT = 40;
export const SEO_REVALIDATE_SECONDS = 3600;

export interface SeoZoneStats {
  leadCount: number;
  totalSurfaceM2: number;
  totalValeurEur: number;
}

export interface SeoLeadPreview {
  id: string;
  ville: string | null;
  departement: string;
  region: string | null;
  surface_m2: number;
  puissance_kwc: number | null;
  valeur_chantier_eur: number | null;
  flag_urgence: string;
  score_confiance: number;
  detection: string;
  tier: LeadTier;
  prix_lead: number;
}

type SeoQueryOpts = {
  region?: string;
  departement?: string;
  limit?: number;
};

function toSeoPreview(row: LeadRow): SeoLeadPreview {
  return {
    id: row.id,
    ville: row.ville,
    departement: row.departement,
    region: row.region,
    surface_m2: row.surface_m2,
    puissance_kwc: row.puissance_kwc,
    valeur_chantier_eur: row.valeur_chantier_eur,
    flag_urgence: row.flag_urgence,
    score_confiance: row.score_confiance,
    detection: row.detection,
    tier: leadTier(row),
    prix_lead: computePrixLeadFromRow(row),
  };
}

// Supabase filter builder — typage simplifié pour éviter l'explosion générique TS.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SeoFilterQuery = any;

function applySeoFilters(q: SeoFilterQuery, opts: Pick<SeoQueryOpts, "region" | "departement">): SeoFilterQuery {
  let query = q
    .eq("statut", "disponible")
    .lt("buyers_count", MAX_BUYERS_PER_LEAD)
    .neq("detection", "equipe")
    .or(
      `vision_surface_couverte_pct.is.null,vision_surface_couverte_pct.lte.${VISION_COVERAGE_EQUIPE}`,
    )
    .not("siren", "is", null)
    .not("id_parcelle", "is", null)
    .not("adresse", "is", null)
    .neq("adresse", "")
    .gt("surface_m2", SURFACE_GRAY_LOW_MAX_M2);

  if (opts.region) query = query.eq("region", opts.region);
  if (opts.departement) query = query.eq("departement", opts.departement);
  return query;
}

export async function getSeoZoneStats(
  opts: Pick<SeoQueryOpts, "region" | "departement">,
): Promise<SeoZoneStats> {
  const { data, error, count } = await applySeoFilters(
    getAdminClient()
      .from("leads")
      .select("surface_m2, valeur_chantier_eur", { count: "exact" }),
    opts,
  );
  if (error) throw error;

  const rows = (data ?? []) as { surface_m2: number | null; valeur_chantier_eur: number | null }[];
  return {
    leadCount: count ?? rows.length,
    totalSurfaceM2: rows.reduce((s, r) => s + (Number(r.surface_m2) || 0), 0),
    totalValeurEur: rows.reduce((s, r) => s + (Number(r.valeur_chantier_eur) || 0), 0),
  };
}

export async function getSeoZoneLeads(
  opts: SeoQueryOpts,
): Promise<SeoLeadPreview[]> {
  const limit = opts.limit ?? SEO_LEADS_LIMIT;
  const { data, error } = await applySeoFilters(
    getAdminClient()
      .from("leads")
      .select(
        "id, ville, departement, region, surface_m2, puissance_kwc, valeur_chantier_eur, flag_urgence, score_confiance, detection, surface_tag_present, source_surface, adresse, siren, id_parcelle",
      ),
    opts,
  )
    .order("valeur_chantier_eur", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return ((data ?? []) as LeadRow[]).map(toSeoPreview);
}

/** Slugs région ayant au moins un lead vendable (build statique). */
export async function getSeoRegionSlugs(): Promise<string[]> {
  try {
    const supabase = getAdminClient();
    const { data, error } = await supabase
      .from("leads")
      .select("region")
      .eq("statut", "disponible")
      .lt("buyers_count", MAX_BUYERS_PER_LEAD)
      .neq("detection", "equipe")
      .or(
        `vision_surface_couverte_pct.is.null,vision_surface_couverte_pct.lte.${VISION_COVERAGE_EQUIPE}`,
      )
      .not("region", "is", null);
    if (error) throw error;
    const slugs = new Set(
      (data ?? [])
        .map((r) => r.region as string)
        .filter(Boolean)
        .map(regionToSlug),
    );
    if (slugs.size === 0) return ALL_REGIONS.map(regionToSlug);
    return [...slugs].sort();
  } catch {
    return ALL_REGIONS.map(regionToSlug);
  }
}

/** Paires région + département pour generateStaticParams. */
export async function getSeoDepartementParams(): Promise<
  { region: string; departement: string }[]
> {
  try {
    const supabase = getAdminClient();
    const { data, error } = await supabase
      .from("leads")
      .select("region, departement")
      .eq("statut", "disponible")
      .lt("buyers_count", MAX_BUYERS_PER_LEAD)
      .neq("detection", "equipe")
      .or(
        `vision_surface_couverte_pct.is.null,vision_surface_couverte_pct.lte.${VISION_COVERAGE_EQUIPE}`,
      )
      .not("region", "is", null)
      .not("departement", "is", null);
    if (error) throw error;

    const pairs = new Map<string, { region: string; departement: string }>();
    for (const row of data ?? []) {
      const region = row.region as string;
      const dept = row.departement as string;
      if (!region || !dept) continue;
      const key = `${regionToSlug(region)}:${departementToSlug(dept)}`;
      pairs.set(key, {
        region: regionToSlug(region),
        departement: departementToSlug(dept),
      });
    }
    if (pairs.size === 0) return allStaticDepartementParams();
    return [...pairs.values()];
  } catch {
    return allStaticDepartementParams();
  }
}

export { getDepartmentsForRegion };

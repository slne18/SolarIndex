import { getAdminClient } from "./supabase";
import { MAX_BUYERS_PER_LEAD } from "./lead-slots";
import { PV_OVERLAP_MIN, VISION_COVERAGE_EQUIPE } from "./pv-overlap";
import { SURFACE_GRAY_LOW_MAX_M2 } from "./surface-thresholds";
import { LeadRow } from "./types";

export const PAGE_SIZE = 20;

export type LeadSort = "valeur" | "surface" | "date";

export interface LeadQueryOptions {
  region?: string;
  departement?: string;
  surfaceMin?: number;
  flag?: string; // 'URGENCE_ABSOLUE' | 'CONFORME_REQUIS'
  naf?: string;
  statut?: string;
  sort?: LeadSort;
  page?: number; // 0-indexed
  pageSize?: number;
  // Masquer aussi les leads "à vérifier" (doute sur un équipement existant).
  hideAverifier?: boolean;
  /** Filtre tier Premium (critères pipeline stricts). */
  premiumOnly?: boolean;
  /** Uniquement les leads avec dirigeant exploitant identifié. */
  dirigeantOnly?: boolean;
  /** Inclure les leads vendus (admin). Par défaut : catalogue = disponibles uniquement. */
  includeSold?: boolean;
}

const SORT_COLUMN: Record<LeadSort, string> = {
  valeur: "valeur_chantier_eur",
  surface: "surface_m2",
  date: "created_at",
};

type SupabaseQuery = ReturnType<
  ReturnType<ReturnType<typeof getAdminClient>["from"]>["select"]
>;

function applyCatalogFilters(query: SupabaseQuery, opts: LeadQueryOptions): SupabaseQuery {
  query = query
    .not("siren", "is", null)
    .not("id_parcelle", "is", null)
    .not("adresse", "is", null)
    .neq("adresse", "")
    .neq("detection", "equipe")
    .or(
      `vision_surface_couverte_pct.is.null,vision_surface_couverte_pct.lte.${VISION_COVERAGE_EQUIPE}`,
    )
    .gt("surface_m2", SURFACE_GRAY_LOW_MAX_M2);

  if (opts.region) query = query.eq("region", opts.region);
  if (opts.departement) query = query.eq("departement", opts.departement);
  if (opts.flag) query = query.eq("flag_urgence", opts.flag);
  if (opts.naf) query = query.eq("code_naf", opts.naf);
  if (opts.statut) {
    query = query.eq("statut", opts.statut);
  } else if (!opts.includeSold) {
    query = query.eq("statut", "disponible").lt("buyers_count", MAX_BUYERS_PER_LEAD);
  }
  if (typeof opts.surfaceMin === "number" && !Number.isNaN(opts.surfaceMin)) {
    query = query.gte("surface_m2", opts.surfaceMin);
  }
  if (opts.hideAverifier) {
    query = query.eq("detection", "libre");
  }
  if (opts.premiumOnly) {
    query = query
      .eq("detection", "libre")
      .eq("surface_tag_present", true)
      .eq("source_surface", "cadastre")
      .gte("score_confiance", 0.8);
  }
  if (opts.dirigeantOnly) {
    query = query.or("dirigeant_exploitant.not.is.null,dirigeant_nom.not.is.null");
  }
  return query;
}

/** Recouvrement OSM < 5 % (catalogue en premier). */
function filterOverlapClear(query: SupabaseQuery): SupabaseQuery {
  return query.or(`pv_overlap_pct.is.null,pv_overlap_pct.lt.${PV_OVERLAP_MIN}`);
}

/** Zone de doute OSM : recouvrement ≥ 5 % et < 50 % (equipe déjà exclus). */
function filterOverlapDoubt(query: SupabaseQuery): SupabaseQuery {
  return query.gte("pv_overlap_pct", PV_OVERLAP_MIN);
}

async function fetchLeadPage(
  supabase: ReturnType<typeof getAdminClient>,
  opts: LeadQueryOptions,
  tier: "clear" | "doubt",
  from: number,
  to: number,
  sort: LeadSort,
): Promise<LeadRow[]> {
  let query = applyCatalogFilters(supabase.from("leads").select("*"), opts);
  query = tier === "clear" ? filterOverlapClear(query) : filterOverlapDoubt(query);
  query = query.order(SORT_COLUMN[sort], { ascending: false }).range(from, to);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as LeadRow[];
}

async function countLeadTier(
  supabase: ReturnType<typeof getAdminClient>,
  opts: LeadQueryOptions,
  tier: "clear" | "doubt",
): Promise<number> {
  let query = applyCatalogFilters(
    supabase.from("leads").select("*", { count: "exact", head: true }),
    opts,
  );
  query = tier === "clear" ? filterOverlapClear(query) : filterOverlapDoubt(query);
  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
}

// Liste paginée + filtrée des leads. Retourne les lignes brutes (le masquage
// des champs sensibles est appliqué dans la route API).
export async function queryLeads(
  opts: LeadQueryOptions,
): Promise<{ rows: LeadRow[]; count: number }> {
  const supabase = getAdminClient();
  const pageSize = opts.pageSize ?? PAGE_SIZE;
  const page = opts.page ?? 0;
  const sort = opts.sort ?? "valeur";

  const useTierSort = !opts.hideAverifier && !opts.premiumOnly;

  if (!useTierSort) {
    let query = applyCatalogFilters(supabase.from("leads").select("*", { count: "exact" }), opts);
    query = query.order(SORT_COLUMN[sort], { ascending: false });
    const from = page * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);
    const { data, error, count } = await query;
    if (error) throw error;
    return { rows: (data ?? []) as LeadRow[], count: count ?? 0 };
  }

  const clearCount = await countLeadTier(supabase, opts, "clear");
  const doubtCount = await countLeadTier(supabase, opts, "doubt");
  const total = clearCount + doubtCount;
  const globalOffset = page * pageSize;
  const rows: LeadRow[] = [];

  if (globalOffset < clearCount) {
    const clearTo = Math.min(globalOffset + pageSize - 1, clearCount - 1);
    rows.push(...(await fetchLeadPage(supabase, opts, "clear", globalOffset, clearTo, sort)));
  }

  const remaining = pageSize - rows.length;
  if (remaining > 0 && doubtCount > 0 && globalOffset + rows.length >= clearCount) {
    const doubtOffset = Math.max(0, globalOffset - clearCount);
    const doubtTo = doubtOffset + remaining - 1;
    rows.push(...(await fetchLeadPage(supabase, opts, "doubt", doubtOffset, doubtTo, sort)));
  }

  return { rows, count: total };
}

// Récupère un lead unique par id.
export async function getLeadById(id: string): Promise<LeadRow | null> {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as LeadRow) ?? null;
}

export async function userOwnsLead(leadId: string, userId: string): Promise<boolean> {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("purchases")
    .select("id")
    .eq("lead_id", leadId)
    .eq("user_id", userId)
    .eq("statut", "paid")
    .maybeSingle();
  if (error) throw error;
  return !!data;
}

// Récupère les leads existants pour un ensemble d'osm_id (pour l'ingestion).
export async function getExistingByOsmIds(
  osmIds: number[],
): Promise<{ osm_id: number; statut: string }[]> {
  if (osmIds.length === 0) return [];
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("leads")
    .select("osm_id, statut")
    .in("osm_id", osmIds);
  if (error) throw error;
  return (data ?? []) as { osm_id: number; statut: string }[];
}

// Upsert d'un lot de leads (conflit sur osm_id).
export async function upsertLeads(rows: Record<string, unknown>[]): Promise<void> {
  if (rows.length === 0) return;
  const supabase = getAdminClient();
  const { error } = await supabase
    .from("leads")
    .upsert(rows, { onConflict: "osm_id" });
  if (error) throw error;
}

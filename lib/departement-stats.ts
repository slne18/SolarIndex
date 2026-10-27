import { getAdminClient } from "./supabase";
import { VISION_COVERAGE_EQUIPE } from "./pv-overlap";
import { SURFACE_GRAY_LOW_MAX_M2 } from "./surface-thresholds";

export interface DepartementStat {
  departement: string;
  total: number;
  urgences: number;
  pipeline_eur: number;
}

export interface DepartementStatsResponse {
  departements: DepartementStat[];
  max_total: number;
}

type StatsRow = {
  departement: string;
  total: number | string;
  urgences: number | string;
  pipeline_eur: number | string;
};

function toStatsResponse(rows: StatsRow[]): DepartementStatsResponse {
  const departements: DepartementStat[] = rows.map((row) => ({
    departement: String(row.departement),
    total: Number(row.total) || 0,
    urgences: Number(row.urgences) || 0,
    pipeline_eur: Number(row.pipeline_eur) || 0,
  }));
  const max_total = departements.reduce((m, d) => Math.max(m, d.total), 0);
  return { departements, max_total };
}

function mergeStatsRows(
  map: Map<string, DepartementStat>,
  rows: { departement: unknown; flag_urgence?: unknown; valeur_chantier_eur?: unknown; surface_estimee_m2?: unknown }[],
  mode: "lead" | "rfp",
) {
  for (const row of rows) {
    const dept = String(row.departement);
    const cur = map.get(dept) ?? { departement: dept, total: 0, urgences: 0, pipeline_eur: 0 };
    cur.total += 1;
    if (mode === "lead") {
      if (row.flag_urgence === "URGENCE_ABSOLUE") cur.urgences += 1;
      cur.pipeline_eur += Number(row.valeur_chantier_eur) || 0;
    } else {
      const surf = Number(row.surface_estimee_m2) || 0;
      const kwc = (surf * 0.5) / 5;
      cur.pipeline_eur += Math.round(kwc * 1200);
    }
    map.set(dept, cur);
  }
}

/** PostgREST plafonne à 1000 lignes — on pagine si la RPC SQL n'existe pas encore. */
async function paginateLeadStats(): Promise<DepartementStatsResponse> {
  const supabase = getAdminClient();
  const pageSize = 1000;
  const map = new Map<string, DepartementStat>();
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from("leads")
      .select("departement, flag_urgence, valeur_chantier_eur")
      .eq("statut", "disponible")
      .not("siren", "is", null)
      .not("id_parcelle", "is", null)
      .not("adresse", "is", null)
      .neq("adresse", "")
      .neq("detection", "equipe")
      .or(
        `vision_surface_couverte_pct.is.null,vision_surface_couverte_pct.lte.${VISION_COVERAGE_EQUIPE}`,
      )
      .gt("surface_m2", SURFACE_GRAY_LOW_MAX_M2)
      .not("departement", "is", null)
      .order("id")
      .range(offset, offset + pageSize - 1);

    if (error) throw error;
    const rows = data ?? [];
    mergeStatsRows(map, rows, "lead");
    if (rows.length < pageSize) break;
    offset += pageSize;
  }

  const departements = [...map.values()].sort((a, b) => b.total - a.total);
  const max_total = departements.reduce((m, d) => Math.max(m, d.total), 0);
  return { departements, max_total };
}

async function paginateRfpStats(): Promise<DepartementStatsResponse> {
  const supabase = getAdminClient();
  const pageSize = 1000;
  const map = new Map<string, DepartementStat>();
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from("rfp_submissions")
      .select("departement, surface_estimee_m2")
      .eq("statut", "publie")
      .not("departement", "is", null)
      .order("id")
      .range(offset, offset + pageSize - 1);

    if (error) throw error;
    const rows = data ?? [];
    mergeStatsRows(map, rows, "rfp");
    if (rows.length < pageSize) break;
    offset += pageSize;
  }

  const departements = [...map.values()].sort((a, b) => b.total - a.total);
  const max_total = departements.reduce((m, d) => Math.max(m, d.total), 0);
  return { departements, max_total };
}

/** Agrège les leads catalogue vendables par département. */
export async function getLeadStatsParDepartement(): Promise<DepartementStatsResponse> {
  const supabase = getAdminClient();
  const { data, error } = await supabase.rpc("lead_stats_par_departement");

  if (!error && data) {
    return toStatsResponse(data as StatsRow[]);
  }

  // Fallback : pagination client (migration 0017 non appliquée)
  return paginateLeadStats();
}

/** Agrège les RFP publiés par département. */
export async function getRfpStatsParDepartement(): Promise<DepartementStatsResponse> {
  try {
    const supabase = getAdminClient();
    const { data, error } = await supabase.rpc("rfp_stats_par_departement");

    if (!error && data) {
      return toStatsResponse(data as StatsRow[]);
    }

    return paginateRfpStats();
  } catch (e) {
    console.warn("[getRfpStatsParDepartement]", e);
    return { departements: [], max_total: 0 };
  }
}

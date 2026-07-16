import { getAdminClient } from "./supabase";
import { MAX_BUYERS_PER_LEAD } from "./lead-slots";
import { PV_OVERLAP_EQUIPE, VISION_COVERAGE_EQUIPE } from "./pv-overlap";
import { SURFACE_APER_MIN_M2, SURFACE_GRAY_LOW_MAX_M2 } from "./surface-thresholds";

export type LeadsRecapDeptStat = {
  departement: string;
  catalogCount: number;
  /** Leads exclus du catalogue car considérés déjà équipés (OSM, photo ou statut pipeline). */
  considereCommeEquipeCount: number;
  surfaceM2: number;
  pipelineEur: number;
};

export type LeadsRecapResponse = {
  departements: LeadsRecapDeptStat[];
  totals: {
    catalogCount: number;
    considereCommeEquipeCount: number;
    surfaceM2: number;
    pipelineEur: number;
    considereCommeEquipePct: number | null;
  };
};

type CatalogRow = {
  departement: string;
  surface_m2: number;
  valeur_chantier_eur: number | null;
};

type ExcludedRow = {
  departement: string;
};

function emptyDept(dept: string): LeadsRecapDeptStat {
  return {
    departement: dept,
    catalogCount: 0,
    considereCommeEquipeCount: 0,
    surfaceM2: 0,
    pipelineEur: 0,
  };
}

async function paginateCatalog(): Promise<Map<string, LeadsRecapDeptStat>> {
  const supabase = getAdminClient();
  const pageSize = 1000;
  const map = new Map<string, LeadsRecapDeptStat>();
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from("leads")
      .select("departement, surface_m2, valeur_chantier_eur")
      .eq("statut", "disponible")
      .lt("buyers_count", MAX_BUYERS_PER_LEAD)
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
    const rows = (data ?? []) as CatalogRow[];
    for (const row of rows) {
      const dept = String(row.departement);
      const cur = map.get(dept) ?? emptyDept(dept);
      cur.catalogCount += 1;
      cur.surfaceM2 += Number(row.surface_m2) || 0;
      cur.pipelineEur += Number(row.valeur_chantier_eur) || 0;
      map.set(dept, cur);
    }
    if (rows.length < pageSize) break;
    offset += pageSize;
  }

  return map;
}

/** Leads hors vente car considérés conformes / déjà équipés (aligné exclusions catalogue). */
async function paginateConsidereCommeEquipe(map: Map<string, LeadsRecapDeptStat>): Promise<void> {
  const supabase = getAdminClient();
  const pageSize = 1000;
  let offset = 0;

  const exclusionFilter = [
    "detection.eq.equipe",
    `vision_surface_couverte_pct.gt.${VISION_COVERAGE_EQUIPE}`,
    `pv_overlap_pct.gte.${PV_OVERLAP_EQUIPE}`,
  ].join(",");

  while (true) {
    const { data, error } = await supabase
      .from("leads")
      .select("departement")
      .gte("surface_m2", SURFACE_APER_MIN_M2)
      .not("departement", "is", null)
      .or(exclusionFilter)
      .order("id")
      .range(offset, offset + pageSize - 1);

    if (error) throw error;
    const rows = (data ?? []) as ExcludedRow[];
    for (const row of rows) {
      const dept = String(row.departement);
      const cur = map.get(dept) ?? emptyDept(dept);
      cur.considereCommeEquipeCount += 1;
      map.set(dept, cur);
    }
    if (rows.length < pageSize) break;
    offset += pageSize;
  }
}

export async function getLeadsRecapStats(): Promise<LeadsRecapResponse> {
  const map = await paginateCatalog();
  await paginateConsidereCommeEquipe(map);

  const departements = [...map.values()]
    .map((d) => ({
      ...d,
      surfaceM2: Math.round(d.surfaceM2),
      pipelineEur: Math.round(d.pipelineEur),
    }))
    .filter((d) => d.catalogCount > 0 || d.considereCommeEquipeCount > 0)
    .sort((a, b) => b.catalogCount - a.catalogCount);

  const catalogCount = departements.reduce((s, d) => s + d.catalogCount, 0);
  const considereCommeEquipeCount = departements.reduce(
    (s, d) => s + d.considereCommeEquipeCount,
    0,
  );
  const surfaceM2 = departements.reduce((s, d) => s + d.surfaceM2, 0);
  const pipelineEur = departements.reduce((s, d) => s + d.pipelineEur, 0);
  const denom = catalogCount + considereCommeEquipeCount;

  return {
    departements,
    totals: {
      catalogCount,
      considereCommeEquipeCount,
      surfaceM2,
      pipelineEur,
      considereCommeEquipePct:
        denom > 0 ? Math.round((considereCommeEquipeCount / denom) * 100) : null,
    },
  };
}

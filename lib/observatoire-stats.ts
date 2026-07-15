import { getAdminClient } from "./supabase";
import { MAX_BUYERS_PER_LEAD } from "./lead-slots";
import { VISION_COVERAGE_EQUIPE } from "./pv-overlap";
import { SURFACE_APER_MIN_M2, SURFACE_GRAY_LOW_MAX_M2 } from "./surface-thresholds";

export type ObservatoireDeptStat = {
  departement: string;
  catalogCount: number;
  equippedCount: number;
  surfaceM2: number;
  pipelineEur: number;
};

export type ObservatoireResponse = {
  departements: ObservatoireDeptStat[];
  totals: {
    catalogCount: number;
    equippedCount: number;
    surfaceM2: number;
    pipelineEur: number;
    equippedPct: number | null;
  };
  max_count: number;
};

type CatalogRow = {
  departement: string;
  surface_m2: number;
  valeur_chantier_eur: number | null;
};

type EquippedRow = {
  departement: string;
};

async function paginateCatalog(): Promise<Map<string, ObservatoireDeptStat>> {
  const supabase = getAdminClient();
  const pageSize = 1000;
  const map = new Map<string, ObservatoireDeptStat>();
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
      const cur = map.get(dept) ?? {
        departement: dept,
        catalogCount: 0,
        equippedCount: 0,
        surfaceM2: 0,
        pipelineEur: 0,
      };
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

async function paginateEquipped(map: Map<string, ObservatoireDeptStat>): Promise<void> {
  const supabase = getAdminClient();
  const pageSize = 1000;

  async function addEquipped(filter: (offset: number) => Promise<EquippedRow[]>) {
    let offset = 0;
    while (true) {
      const rows = await filter(offset);
      for (const row of rows) {
        const dept = String(row.departement);
        const cur = map.get(dept) ?? {
          departement: dept,
          catalogCount: 0,
          equippedCount: 0,
          surfaceM2: 0,
          pipelineEur: 0,
        };
        cur.equippedCount += 1;
        map.set(dept, cur);
      }
      if (rows.length < pageSize) break;
      offset += pageSize;
    }
  }

  await addEquipped(async (offset) => {
    const { data, error } = await supabase
      .from("leads")
      .select("departement")
      .gte("surface_m2", SURFACE_APER_MIN_M2)
      .not("departement", "is", null)
      .eq("detection", "equipe")
      .order("id")
      .range(offset, offset + pageSize - 1);
    if (error) throw error;
    return (data ?? []) as EquippedRow[];
  });

  await addEquipped(async (offset) => {
    const { data, error } = await supabase
      .from("leads")
      .select("departement")
      .gte("surface_m2", SURFACE_APER_MIN_M2)
      .not("departement", "is", null)
      .neq("detection", "equipe")
      .gt("vision_surface_couverte_pct", VISION_COVERAGE_EQUIPE)
      .order("id")
      .range(offset, offset + pageSize - 1);
    if (error) throw error;
    return (data ?? []) as EquippedRow[];
  });
}

export async function getObservatoireStats(): Promise<ObservatoireResponse> {
  const map = await paginateCatalog();
  await paginateEquipped(map);

  const departements = [...map.values()]
    .map((d) => ({
      ...d,
      surfaceM2: Math.round(d.surfaceM2),
      pipelineEur: Math.round(d.pipelineEur),
    }))
    .filter((d) => d.catalogCount > 0 || d.equippedCount > 0)
    .sort((a, b) => b.catalogCount - a.catalogCount);

  const catalogCount = departements.reduce((s, d) => s + d.catalogCount, 0);
  const equippedCount = departements.reduce((s, d) => s + d.equippedCount, 0);
  const surfaceM2 = departements.reduce((s, d) => s + d.surfaceM2, 0);
  const pipelineEur = departements.reduce((s, d) => s + d.pipelineEur, 0);
  const denom = catalogCount + equippedCount;

  return {
    departements,
    totals: {
      catalogCount,
      equippedCount,
      surfaceM2,
      pipelineEur,
      equippedPct: denom > 0 ? Math.round((equippedCount / denom) * 100) : null,
    },
    max_count: departements.reduce((m, d) => Math.max(m, d.catalogCount), 0),
  };
}

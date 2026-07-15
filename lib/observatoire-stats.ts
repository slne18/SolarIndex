import { getAdminClient } from "./supabase";
import { SURFACE_APER_MIN_M2 } from "./surface-thresholds";

export type ObservatoireDeptStat = {
  departement: string;
  count: number;
  surfaceM2: number;
  pipelineEur: number;
  equippedPct: number | null;
};

export type ObservatoireResponse = {
  departements: ObservatoireDeptStat[];
  totals: {
    count: number;
    surfaceM2: number;
    pipelineEur: number;
    equippedPct: number | null;
  };
  max_count: number;
};

type Row = {
  departement: string;
  surface_m2: number;
  valeur_chantier_eur: number | null;
  detection: string;
  vision_surface_couverte_pct: number | null;
};

function isEquipped(row: Row): boolean {
  if (row.detection === "equipe") return true;
  if (row.vision_surface_couverte_pct != null && row.vision_surface_couverte_pct > 45) {
    return true;
  }
  return false;
}

export async function getObservatoireStats(): Promise<ObservatoireResponse> {
  const supabase = getAdminClient();
  const pageSize = 1000;
  const map = new Map<string, { count: number; surfaceM2: number; pipelineEur: number; equipped: number }>();
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from("leads")
      .select("departement, surface_m2, valeur_chantier_eur, detection, vision_surface_couverte_pct")
      .gte("surface_m2", SURFACE_APER_MIN_M2)
      .not("departement", "is", null)
      .order("id")
      .range(offset, offset + pageSize - 1);

    if (error) throw error;
    const rows = (data ?? []) as Row[];
    for (const row of rows) {
      const dept = String(row.departement);
      const cur = map.get(dept) ?? { count: 0, surfaceM2: 0, pipelineEur: 0, equipped: 0 };
      cur.count += 1;
      cur.surfaceM2 += Number(row.surface_m2) || 0;
      cur.pipelineEur += Number(row.valeur_chantier_eur) || 0;
      if (isEquipped(row)) cur.equipped += 1;
      map.set(dept, cur);
    }
    if (rows.length < pageSize) break;
    offset += pageSize;
  }

  const departements: ObservatoireDeptStat[] = [...map.entries()]
    .map(([departement, s]) => ({
      departement,
      count: s.count,
      surfaceM2: Math.round(s.surfaceM2),
      pipelineEur: Math.round(s.pipelineEur),
      equippedPct: s.count > 0 ? Math.round((s.equipped / s.count) * 100) : null,
    }))
    .sort((a, b) => b.count - a.count);

  const totals = departements.reduce(
    (acc, d) => {
      acc.count += d.count;
      acc.surfaceM2 += d.surfaceM2;
      acc.pipelineEur += d.pipelineEur;
      return acc;
    },
    { count: 0, surfaceM2: 0, pipelineEur: 0, equipped: 0 },
  );

  const equippedTotal = [...map.values()].reduce((s, d) => s + d.equipped, 0);

  return {
    departements,
    totals: {
      count: totals.count,
      surfaceM2: totals.surfaceM2,
      pipelineEur: totals.pipelineEur,
      equippedPct:
        totals.count > 0 ? Math.round((equippedTotal / totals.count) * 100) : null,
    },
    max_count: departements.reduce((m, d) => Math.max(m, d.count), 0),
  };
}

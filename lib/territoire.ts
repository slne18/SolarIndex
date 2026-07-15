import { getAdminClient } from "./supabase";
import { MAX_BUYERS_PER_LEAD } from "./lead-slots";
import { VISION_COVERAGE_EQUIPE } from "./pv-overlap";
import { leadTier } from "./leads";
import { SURFACE_GRAY_LOW_MAX_M2 } from "./surface-thresholds";
import { bboxAroundPoint, haversineKm } from "./verifier/geo";

export type TerritoireRadiusKm = 25 | 50 | 100;

export type TerritoireSummary = {
  mode: "radius" | "departement";
  label: string;
  radiusKm?: TerritoireRadiusKm;
  departement?: string;
  total: number;
  urgences: number;
  standard: number;
  premium: number;
  pipelineEur: number;
};

type LeadRow = {
  latitude: number;
  longitude: number;
  departement: string;
  flag_urgence: string;
  valeur_chantier_eur: number | null;
  surface_m2: number;
  score_confiance: number;
  statut: string;
  buyers_count: number;
  siren: string | null;
  id_parcelle: string | null;
  adresse: string | null;
  detection: string;
  vision_surface_couverte_pct: number | null;
  surface_tag_present: boolean | null;
  source_surface: string | null;
};

function isSellable(row: LeadRow): boolean {
  return (
    row.statut === "disponible" &&
    row.buyers_count < MAX_BUYERS_PER_LEAD &&
    row.siren != null &&
    row.id_parcelle != null &&
    row.adresse != null &&
    row.adresse !== "" &&
    row.detection !== "equipe" &&
    (row.vision_surface_couverte_pct == null ||
      row.vision_surface_couverte_pct <= VISION_COVERAGE_EQUIPE) &&
    row.surface_m2 > SURFACE_GRAY_LOW_MAX_M2
  );
}

async function fetchSellableLeads(): Promise<LeadRow[]> {
  const supabase = getAdminClient();
  const pageSize = 1000;
  const rows: LeadRow[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from("leads")
      .select(
        "latitude, longitude, departement, flag_urgence, valeur_chantier_eur, surface_m2, score_confiance, statut, buyers_count, siren, id_parcelle, adresse, detection, vision_surface_couverte_pct, surface_tag_present, source_surface",
      )
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
      .order("id")
      .range(offset, offset + pageSize - 1);

    if (error) throw error;
    const batch = (data ?? []) as LeadRow[];
    rows.push(...batch.filter(isSellable));
    if (batch.length < pageSize) break;
    offset += pageSize;
  }

  return rows;
}

function aggregate(leads: LeadRow[], meta: Omit<TerritoireSummary, "total" | "urgences" | "standard" | "premium" | "pipelineEur">): TerritoireSummary {
  let urgences = 0;
  let standard = 0;
  let premium = 0;
  let pipelineEur = 0;
  for (const l of leads) {
    if (l.flag_urgence === "URGENCE_ABSOLUE") urgences += 1;
    const tier = leadTier(l);
    if (tier === "premium") premium += 1;
    else standard += 1;
    pipelineEur += Number(l.valeur_chantier_eur) || 0;
  }
  return {
    ...meta,
    total: leads.length,
    urgences,
    standard,
    premium,
    pipelineEur: Math.round(pipelineEur),
  };
}

export async function getTerritoireByDepartement(departement: string): Promise<TerritoireSummary> {
  const all = await fetchSellableLeads();
  const filtered = all.filter((l) => l.departement === departement);
  return aggregate(filtered, {
    mode: "departement",
    label: `Département ${departement}`,
    departement,
  });
}

export async function getTerritoireByRadius(
  lat: number,
  lon: number,
  radiusKm: TerritoireRadiusKm,
  label: string,
): Promise<TerritoireSummary> {
  const all = await fetchSellableLeads();
  const bbox = bboxAroundPoint(lat, lon, radiusKm * 1000 * 1.05);
  const filtered = all.filter((l) => {
    if (
      l.latitude < bbox.minLat ||
      l.latitude > bbox.maxLat ||
      l.longitude < bbox.minLon ||
      l.longitude > bbox.maxLon
    ) {
      return false;
    }
    return haversineKm(lat, lon, l.latitude, l.longitude) <= radiusKm;
  });
  return aggregate(filtered, {
    mode: "radius",
    label,
    radiusKm,
  });
}

import { PV_OVERLAP_EQUIPE, VISION_COVERAGE_EQUIPE } from "./pv-overlap";
import { SURFACE_URGENCE_M2 } from "./surface-thresholds";

/**
 * Filtre PostgREST : lead considéré comme équipé (hors vente pour ce motif).
 * - pipeline / OSM ≥ 50 %
 * - grand parking (≥ 10 000 m²) avec photo > 45 %
 */
export function considereCommeEquipeOrFilter(): string {
  return [
    "detection.eq.equipe",
    `pv_overlap_pct.gte.${PV_OVERLAP_EQUIPE}`,
    `and(surface_m2.gte.${SURFACE_URGENCE_M2},vision_surface_couverte_pct.gt.${VISION_COVERAGE_EQUIPE})`,
  ].join(",");
}

export function isConsidereCommeEquipeLead(lead: {
  detection?: string | null;
  pv_overlap_pct?: number | null;
  surface_m2?: number | null;
  vision_surface_couverte_pct?: number | null;
}): boolean {
  if (lead.detection === "equipe") return true;
  const overlap = Number(lead.pv_overlap_pct);
  if (Number.isFinite(overlap) && overlap >= PV_OVERLAP_EQUIPE) return true;
  const surface = Number(lead.surface_m2) || 0;
  const vision = Number(lead.vision_surface_couverte_pct);
  if (surface >= SURFACE_URGENCE_M2 && Number.isFinite(vision) && vision > VISION_COVERAGE_EQUIPE) {
    return true;
  }
  return false;
}

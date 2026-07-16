import { PV_OVERLAP_EQUIPE, VISION_COVERAGE_EQUIPE } from "./pv-overlap";
import {
  SURFACE_GRAY_LOW_MAX_M2,
  SURFACE_GRAY_LOW_MIN_M2,
  SURFACE_URGENCE_M2,
  isInGrayLowBand,
} from "./surface-thresholds";

/**
 * Filtre PostgREST : lead considéré comme équipé / hors catalogue vendable.
 * - pipeline / OSM ≥ 50 %
 * - grand parking (≥ 10 000 m²) avec photo > 45 %
 * - SIREN ou parcelle cadastrale non identifiables
 * - zone grise APER (1 500–1 600 m²)
 */
export function considereCommeEquipeOrFilter(): string {
  return [
    "detection.eq.equipe",
    `pv_overlap_pct.gte.${PV_OVERLAP_EQUIPE}`,
    `and(surface_m2.gte.${SURFACE_URGENCE_M2},vision_surface_couverte_pct.gt.${VISION_COVERAGE_EQUIPE})`,
    "siren.is.null",
    "id_parcelle.is.null",
    `and(surface_m2.gte.${SURFACE_GRAY_LOW_MIN_M2},surface_m2.lte.${SURFACE_GRAY_LOW_MAX_M2})`,
  ].join(",");
}

export function isConsidereCommeEquipeLead(lead: {
  detection?: string | null;
  pv_overlap_pct?: number | null;
  surface_m2?: number | null;
  vision_surface_couverte_pct?: number | null;
  siren?: string | null;
  id_parcelle?: string | null;
}): boolean {
  if (!(lead.siren ?? "").trim() || !(lead.id_parcelle ?? "").trim()) return true;
  if (isInGrayLowBand(Number(lead.surface_m2) || 0)) return true;
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

import {
  isUrgenceAbsolueLead,
  isVisionEquippedPct,
  PV_OVERLAP_EQUIPE,
} from "./pv-overlap";

/** Seuil panneaux minimum (loi Huwart) pour un mix végétalisation. */
export const HUWART_MIN_PANEL_PCT = 17.5;
export const HUWART_MIN_PANEL_RATIO = HUWART_MIN_PANEL_PCT / 100;

/** Référence officielle — loi de simplification du droit de l'urbanisme et du logement. */
export const HUWART_LAW_REF =
  "Loi n° 2025-1129 du 26 novembre 2025 (dite loi Huwart)";

/** Liens Legifrance. */
export const HUWART_LAW_LINKS = {
  loi2025: "https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000052857880",
} as const;

/** Pénalité score confiance (alignée dérogations pente dans solarindex_pipeline.py). */
export const HUWART_SCORE_PENALTY = 0.05;

export type HuwartLeadInput = {
  flag_urgence?: string | null;
  pv_overlap_pct?: number | null;
  vision_surface_couverte_pct?: number | null;
  vision_checked_at?: string | null;
  detection?: string | null;
};

/** Recouvrement ombrière affiché (OSM sauf urgences analysées en photo). */
export function leadOmbriereCoveragePct(lead: HuwartLeadInput): number | null {
  if (isUrgenceAbsolueLead(lead)) {
    if (!lead.vision_checked_at) return null;
    const pct = lead.vision_surface_couverte_pct;
    return pct != null && !Number.isNaN(pct) ? pct : null;
  }
  const ratio = lead.pv_overlap_pct;
  if (ratio == null || Number.isNaN(ratio)) return null;
  return ratio * 100;
}

/** Parking avec au moins 17,5 % de recouvrement ombrière mesuré. */
export function isHuwartPartialComplianceLead(lead: HuwartLeadInput): boolean {
  const pct = leadOmbriereCoveragePct(lead);
  return pct != null && pct >= HUWART_MIN_PANEL_PCT;
}

/** Déjà considéré équipé — pas de pénalité score supplémentaire. */
export function isHuwartEquippedLead(lead: HuwartLeadInput): boolean {
  if (lead.detection === "equipe") return true;
  if (isVisionEquippedPct(lead.vision_surface_couverte_pct)) return true;
  const overlap = lead.pv_overlap_pct ?? 0;
  return overlap >= PV_OVERLAP_EQUIPE;
}

/** Baisse le score pour les parkings Huwart encore vendables. */
export function isHuwartScorePenaltyLead(lead: HuwartLeadInput): boolean {
  if (!isHuwartPartialComplianceLead(lead)) return false;
  return !isHuwartEquippedLead(lead);
}

export function effectiveLeadScore(lead: HuwartLeadInput & { score_confiance?: number | null }): number {
  const base = lead.score_confiance ?? 0.5;
  if (!isHuwartScorePenaltyLead(lead)) return base;
  return Math.max(0.3, base - HUWART_SCORE_PENALTY);
}

import { HUWART_MIN_PANEL_PCT } from "./huwart-law";
import { formatVisionCoveragePct, isUrgenceAbsolueLead, isVisionEquippedPct } from "./pv-overlap";

export type CanopyDisplayLead = {
  flag_urgence?: string | null;
  vision_checked_at?: string | null;
  vision_surface_couverte_pct?: number | null;
  vision_flag?: boolean | null;
  detection?: string | null;
};

/** Urgence avec signal photo ombrière affichable (hors parking déjà équipé). */
export function isCanopyPhotoSignal(lead: CanopyDisplayLead): boolean {
  if (!isUrgenceAbsolueLead(lead)) return false;
  if (!lead.vision_checked_at) return false;
  if (lead.detection === "equipe") return false;
  const pct = lead.vision_surface_couverte_pct;
  if (isVisionEquippedPct(pct)) return false;
  if (lead.vision_flag) return true;
  return pct != null && !Number.isNaN(pct) && pct > 0;
}

export function canopyCoveragePct(lead: CanopyDisplayLead): number | null {
  if (!lead.vision_checked_at) return null;
  const pct = lead.vision_surface_couverte_pct;
  if (pct == null || Number.isNaN(pct)) return null;
  return pct;
}

export function canopyCoverageLabel(lead: CanopyDisplayLead): string | null {
  return formatVisionCoveragePct(canopyCoveragePct(lead));
}

/** Mix / végétalisation pertinent (seuil Huwart ou ombrière suspectée). */
export function isVegetationOpportunityLead(lead: CanopyDisplayLead): boolean {
  if (!isCanopyPhotoSignal(lead)) return false;
  const pct = canopyCoveragePct(lead);
  if (pct != null && pct >= HUWART_MIN_PANEL_PCT) return true;
  return !!lead.vision_flag;
}

export function isHuwartCanopyLead(lead: CanopyDisplayLead): boolean {
  const pct = canopyCoveragePct(lead);
  return pct != null && pct >= HUWART_MIN_PANEL_PCT;
}

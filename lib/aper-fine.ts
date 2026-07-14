import { SURFACE_URGENCE_M2 } from "./surface-thresholds";

/** Amende annuelle max. pour parkings ≥ 1 500 m² et < 10 000 m² (loi APER). */
export const APER_FINE_BELOW_URGENCE_EUR = 20_000;

/** Amende annuelle max. pour parkings ≥ 10 000 m² (loi APER). */
export const APER_FINE_AT_OR_ABOVE_URGENCE_EUR = 40_000;

export function maxAperAnnualFineEur(surfaceM2: number): number {
  return (Number(surfaceM2) || 0) >= SURFACE_URGENCE_M2
    ? APER_FINE_AT_OR_ABOVE_URGENCE_EUR
    : APER_FINE_BELOW_URGENCE_EUR;
}

export function formatAperAnnualFine(surfaceM2: number): string {
  return `${maxAperAnnualFineEur(surfaceM2).toLocaleString("fr-FR")} €/an`;
}

export const APER_FINE_TIER_LINES = [
  "20 000 €/an (< 10 000 m²)",
  "40 000 €/an (≥ 10 000 m²)",
] as const;

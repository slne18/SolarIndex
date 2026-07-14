import type { FlagUrgence } from "./types";

/** Seuil légal APER (détection pipeline). */
export const SURFACE_APER_MIN_M2 = 1_500;

/** Zone grise non vendue : incertitude autour du seuil légal. */
export const SURFACE_GRAY_LOW_MIN_M2 = 1_500;
export const SURFACE_GRAY_LOW_MAX_M2 = 1_600;

/** Seuil légal urgence absolue (loi APER). */
export const SURFACE_URGENCE_M2 = 10_000;

/** Urgence absolue affichée / tarifée seulement au-delà de cette marge (10k–11k = conforme). */
export const SURFACE_URGENCE_CONFIRM_M2 = 11_000;

/** @deprecated Alias historique — préférer SURFACE_APER_MIN_M2. */
export const SURFACE_SELL_EXCLUDED_MAX_M2 = SURFACE_GRAY_LOW_MAX_M2;

export function isInGrayLowBand(surfaceM2: number): boolean {
  const s = Number(surfaceM2) || 0;
  return s >= SURFACE_GRAY_LOW_MIN_M2 && s <= SURFACE_GRAY_LOW_MAX_M2;
}

export function isSurfaceSellable(surfaceM2: number): boolean {
  return !isInGrayLowBand(surfaceM2) && (Number(surfaceM2) || 0) > SURFACE_GRAY_LOW_MAX_M2;
}

export function isInUrgenceGrayBand(surfaceM2: number): boolean {
  const s = Number(surfaceM2) || 0;
  return s >= SURFACE_URGENCE_M2 && s <= SURFACE_URGENCE_CONFIRM_M2;
}

export function computeFlagUrgence(surfaceM2: number): FlagUrgence {
  const s = Number(surfaceM2) || 0;
  if (s > SURFACE_URGENCE_CONFIRM_M2) return "URGENCE_ABSOLUE";
  return "CONFORME_REQUIS";
}

export function isUrgencePricingBand(surfaceM2: number): boolean {
  return computeFlagUrgence(surfaceM2) === "URGENCE_ABSOLUE";
}

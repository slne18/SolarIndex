import { SURFACE_APER_MIN_M2, SURFACE_URGENCE_M2 } from "./surface-thresholds";
import { formatAperAnnualFine } from "./aper-fine";

export const APER_LAW_START = new Date("2024-01-01T00:00:00+01:00");
export const APER_DEADLINE_40 = new Date("2026-07-01T00:00:00+02:00");
export const APER_DEADLINE_50 = new Date("2027-07-01T00:00:00+02:00");

export const PENTE_DEROGATION_PCT = 5;

export type AperEligibilityStatus =
  | "concerned"
  | "below_threshold"
  | "manual_required";

export function aperEligibilityStatus(surfaceM2: number | null): AperEligibilityStatus {
  if (surfaceM2 == null || !Number.isFinite(surfaceM2) || surfaceM2 <= 0) {
    return "manual_required";
  }
  if (surfaceM2 >= SURFACE_APER_MIN_M2) return "concerned";
  return "below_threshold";
}

export function aperEligibilityLabel(status: AperEligibilityStatus): string {
  switch (status) {
    case "concerned":
      return "Concerné par l'obligation APER";
    case "below_threshold":
      return "Non soumis au seuil actuel (1 500 m²)";
    case "manual_required":
      return "Surface à confirmer";
  }
}

export function applicableAperDeadline(surfaceM2: number): {
  ratio: string;
  date: string;
  note?: string;
} {
  if (surfaceM2 >= SURFACE_URGENCE_M2) {
    return {
      ratio: "40 %",
      date: "1er juillet 2026",
      note: "Puis obligation 50 % au 1er juillet 2027 pour les grands parcs.",
    };
  }
  return {
    ratio: "50 %",
    date: "1er juillet 2027",
  };
}

export function countdownProgress(start: Date, target: Date, now = new Date()): number {
  const total = target.getTime() - start.getTime();
  if (total <= 0) return 100;
  const elapsed = now.getTime() - start.getTime();
  return Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));
}

export function daysUntil(target: Date, now = new Date()): number {
  const ms = target.getTime() - now.getTime();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

export { formatAperAnnualFine };

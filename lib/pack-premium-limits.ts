import type { LeadRow, LeadTier } from "./types";

/** @deprecated Plus de plafond Premium/Standard dans le pack — conservé pour compat. */
export const TERRITOIRE_PREMIUM_URGENCE_MAX = 0;
export const TERRITOIRE_PREMIUM_CONFORME_MAX = 0;

export type PackPremiumBand = "urgence" | "conforme";

export interface PackPremiumQuota {
  urgence: { max: number; used: number; remaining: number };
  conforme: { max: number; used: number; remaining: number };
}

type LeadForPack = Pick<
  LeadRow,
  | "detection"
  | "surface_tag_present"
  | "source_surface"
  | "score_confiance"
  | "adresse"
  | "siren"
  | "id_parcelle"
  | "surface_m2"
>;

/** Bande Premium (analytics uniquement — n'affecte plus le pack). */
export function premiumPackBand(_lead: LeadForPack): PackPremiumBand | null {
  return null;
}

export function premiumPackBandFromTier(_tier: LeadTier, _surface_m2: number): PackPremiumBand | null {
  return null;
}

export function packPremiumRemaining(_period: unknown): PackPremiumQuota {
  return {
    urgence: { max: 0, used: 0, remaining: 0 },
    conforme: { max: 0, used: 0, remaining: 0 },
  };
}

/** Tout lead éligible si le pack a encore des crédits globaux. */
export function canRedeemLeadWithPack(_lead: LeadForPack, _period: unknown): boolean {
  return true;
}

export function canRedeemLeadWithPackFromQuota(
  _lead: LeadForPack,
  _packPremium: PackPremiumQuota | null,
): boolean {
  return true;
}

export function canRedeemLeadWithPackFromQuotaByTier(
  _lead: { tier: LeadTier; surface_m2: number },
  _packPremium: PackPremiumQuota | null,
): boolean {
  return true;
}

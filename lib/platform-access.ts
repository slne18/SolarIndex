/** Abonnement mensuel — accès catalogue leads (hors premium) + appels d'offres publics. */
export const PRIX_PLATEFORME_MENSUEL = 300;

/** Remise 1er mois (-20 %). */
export const PLATFORM_INTRO_DISCOUNT_PCT = 20;

export const PRIX_PLATEFORME_PREMIER_MOIS = Math.round(
  PRIX_PLATEFORME_MENSUEL * (1 - PLATFORM_INTRO_DISCOUNT_PCT / 100),
);

/** Âge max d'un lead pour rester « premium » (photo vérifiée + récent). */
export const PREMIUM_LEAD_MAX_AGE_MS = 183 * 24 * 60 * 60 * 1000;

export function premiumLeadCutoffIso(now = new Date()): string {
  return new Date(now.getTime() - PREMIUM_LEAD_MAX_AGE_MS).toISOString();
}

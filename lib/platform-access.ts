/** Abonnement mensuel — accès catalogue leads (hors premium) + appels d'offres publics. */
export const PRIX_PLATEFORME_MENSUEL = 300;

/** Âge max d'un lead pour rester « premium » (photo vérifiée + récent). */
export const PREMIUM_LEAD_MAX_AGE_MS = 183 * 24 * 60 * 60 * 1000;

export function premiumLeadCutoffIso(now = new Date()): string {
  return new Date(now.getTime() - PREMIUM_LEAD_MAX_AGE_MS).toISOString();
}

/** Configuration Plausible (mesure d'audience sans cookies). */

export const PLAUSIBLE_DOMAIN =
  process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN?.trim() || "solarindex.fr";

/** Script site-specific depuis le dashboard Plausible (Settings → Installation). */
export const PLAUSIBLE_SCRIPT_SRC =
  process.env.NEXT_PUBLIC_PLAUSIBLE_SRC?.trim() ||
  "https://plausible.io/js/pa-ovrHkV6d0xXFSasjvDwiU.js";

export function isPlausibleEnabled(): boolean {
  return !!PLAUSIBLE_DOMAIN || !!process.env.NEXT_PUBLIC_PLAUSIBLE_SRC?.trim();
}

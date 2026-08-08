/** FAQ affichée sur la page d'accueil installateur. */
export const INSTALLER_FAQ_IDS = [
  "lead-definition",
  "data-verified",
  "subscription",
  "products",
  "zones",
] as const;

export type InstallerFaqId = (typeof INSTALLER_FAQ_IDS)[number];

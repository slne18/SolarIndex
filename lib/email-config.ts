/** Destinataires alertes admin (modération RFP, etc.). */
export function adminEmailRecipients(): string[] {
  const raw =
    process.env.ADMIN_EMAIL ||
    process.env.RESEND_ADMIN_EMAIL ||
    "contact@solarindex.fr";
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

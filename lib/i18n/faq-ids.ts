/** Identifiants FAQ — questions/réponses dans les fichiers de locale (`faq.{id}.q` / `.a`). */
export const FAQ_IDS = [
  "lead-definition",
  "data-verified",
  "subscription",
  "products",
  "lead-content",
  "zones",
  "exclusivity",
  "payment",
  "guarantee",
  "rfp-deposit",
  "rfp-legal",
  "data-sources",
  "gdpr",
  "account",
] as const;

export type FaqId = (typeof FAQ_IDS)[number];

export const SITE_NAME = "SolarIndex";
export const CONTACT_EMAIL = "contact@solarindex.fr";
export const SITE_URL = process.env.NEXT_PUBLIC_URL || "https://www.solarindex.fr";

export function contactMailto(subject: string, body?: string): string {
  const params = new URLSearchParams({ subject });
  if (body?.trim()) params.set("body", body.trim());
  return `mailto:${CONTACT_EMAIL}?${params.toString()}`;
}

export function faqQuestionMailto(question: string): string {
  return contactMailto(
    "Question FAQ SolarIndex",
    `Bonjour,\n\nMa question :\n${question.trim()}\n\nMerci.`,
  );
}

export const SITE_NAME = "SolarIndex";
export const CONTACT_EMAIL = "contact@solarindex.fr";
export const SITE_URL = process.env.NEXT_PUBLIC_URL || "https://www.solarindex.fr";

export function contactMailto(subject: string, body?: string): string {
  const encodedSubject = encodeURIComponent(subject);
  const parts = [`subject=${encodedSubject}`];
  if (body?.trim()) {
    const normalizedBody = body.trim().replace(/\r?\n/g, "\r\n");
    parts.push(`body=${encodeURIComponent(normalizedBody)}`);
  }
  return `mailto:${CONTACT_EMAIL}?${parts.join("&")}`;
}

export function faqQuestionMailto(question: string): string {
  return contactMailto(
    "FAQ SolarIndex",
    `Bonjour,\n\n${question.trim()}\n\nMerci.`,
  );
}

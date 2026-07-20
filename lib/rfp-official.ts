/** Hôtes de plateformes de marchés publics / consultations reconnues (indicatif). */
export const OFFICIAL_PROCUREMENT_HOSTS = [
  "marches-publics.gouv.fr",
  "marches-securises.fr",
  "achatpublic.com",
  "achatpublic.fr",
  "e-marchespublics.com",
  "maximilien.fr",
  "marches-publics.info",
  "marchesonline.com",
  "marches-publics.eu",
  "aws-achat.info",
  "klekoon.com",
  "xmarches.fr",
  "marche-et-public.fr",
] as const;

export function normalizeOfficialUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function isKnownOfficialPlatform(url: string): boolean {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "").toLowerCase();
    return OFFICIAL_PROCUREMENT_HOSTS.some(
      (known) => host === known || host.endsWith(`.${known}`),
    );
  } catch {
    return false;
  }
}

export function parseDocumentsComplementaires(raw: unknown): string[] {
  if (typeof raw !== "string") return [];
  return raw
    .split(/\r?\n/)
    .map((line) => normalizeOfficialUrl(line) ?? line.trim())
    .filter(Boolean)
    .slice(0, 10);
}

export function serializeDocumentsComplementaires(urls: string[]): string | null {
  const cleaned = urls
    .map((u) => normalizeOfficialUrl(u) ?? u.trim())
    .filter(Boolean)
    .slice(0, 10);
  return cleaned.length > 0 ? cleaned.join("\n") : null;
}

export type RfpOwnerType = "prive" | "fonciere" | "centre_commercial" | "concession" | "autre";

export const RFP_OWNER_TYPE_LABELS: Record<RfpOwnerType, string> = {
  prive: "Acteur privé",
  fonciere: "Foncière / investisseur",
  centre_commercial: "Centre commercial / retail",
  concession: "Concession / exploitant",
  autre: "Autre",
};

export function isRfpOwnerType(value: string): value is RfpOwnerType {
  return value in RFP_OWNER_TYPE_LABELS;
}

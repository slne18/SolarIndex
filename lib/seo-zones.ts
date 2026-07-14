import { DEPT_REGION } from "./regions";

/** Régions administratives uniques (France). */
export const ALL_REGIONS = [...new Set(Object.values(DEPT_REGION))].sort();

const SLUG_TO_REGION = new Map(
  ALL_REGIONS.map((region) => [regionToSlug(region), region]),
);

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Slug URL pour une région (ex. « Occitanie » → « occitanie »). */
export function regionToSlug(region: string): string {
  return region
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function regionFromSlug(slug: string): string | null {
  return SLUG_TO_REGION.get(slug.toLowerCase()) ?? null;
}

export function isLeadUuid(value: string): boolean {
  return UUID_RE.test(value);
}

/** Normalise le slug département (ex. « 2a » → « 2A »). */
export function departementFromSlug(slug: string): string | null {
  const upper = slug.toUpperCase();
  if (DEPT_REGION[upper]) return upper;
  if (slug.toLowerCase() === "2a") return "2A";
  if (slug.toLowerCase() === "2b") return "2B";
  return null;
}

export function departementToSlug(code: string): string {
  return code.toLowerCase();
}

export function getDepartmentsForRegion(region: string): string[] {
  return Object.entries(DEPT_REGION)
    .filter(([, r]) => r === region)
    .map(([code]) => code)
    .sort((a, b) => a.localeCompare(b, "fr"));
}

export function allStaticRegionParams(): { region: string }[] {
  return ALL_REGIONS.map((r) => ({ region: regionToSlug(r) }));
}

export function allStaticDepartementParams(): { region: string; departement: string }[] {
  const out: { region: string; departement: string }[] = [];
  for (const region of ALL_REGIONS) {
    for (const dept of getDepartmentsForRegion(region)) {
      out.push({ region: regionToSlug(region), departement: departementToSlug(dept) });
    }
  }
  return out;
}

export function zoneLabel(region: string, departement?: string | null): string {
  if (departement) return `département ${departement} (${region})`;
  return region;
}

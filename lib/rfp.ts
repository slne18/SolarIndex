import { getRegion } from "./regions";

/** Seuil surface pour la grille tarifaire appels d'offres (aligné APER 10 000 m²). */
export const RFP_SURFACE_TIER_M2 = 10_000;

export const PRIX_RFP = {
  sous_10000: 350,
  a_partir_10000: 550,
} as const;

/** Prix d'accès installateur à un appel d'offres, selon la surface estimée du parking. */
export function computeRfpAccessPrice(surfaceEstimeeM2: number | null | undefined): number {
  const surface = Number(surfaceEstimeeM2) || 0;
  if (surface >= RFP_SURFACE_TIER_M2) return PRIX_RFP.a_partir_10000;
  return PRIX_RFP.sous_10000;
}

export type RfpStatut =
  | "en_attente_verification"
  | "en_attente_moderation"
  | "publie"
  | "rejete"
  | "ferme";

export interface RfpSubmissionRow {
  id: string;
  created_at: string;
  statut: RfpStatut;
  entreprise: string;
  siret: string | null;
  siret_verifie: boolean;
  contact_nom: string;
  contact_fonction: string | null;
  contact_email: string;
  contact_telephone: string;
  email_verifie: boolean;
  adresse: string;
  latitude: number | null;
  longitude: number | null;
  departement: string | null;
  region: string | null;
  surface_estimee_m2: number | null;
  deja_equipe_partiel: boolean;
  derogation_pente: boolean;
  derogation_abf: boolean;
  budget_indicatif: string | null;
  delai_souhaite: string | null;
  notes_particulieres: string | null;
  photos_urls: string[] | null;
  consentement_rgpd: boolean;
  acheteurs_count: number;
  acheteurs_max: number;
}

export const RFP_SENSITIVE_FIELDS = [
  "entreprise",
  "contact_nom",
  "contact_fonction",
  "contact_email",
  "contact_telephone",
  "adresse",
  "latitude",
  "longitude",
  "photos_urls",
] as const;

export type PublicRfp = Pick<
  RfpSubmissionRow,
  | "id"
  | "created_at"
  | "statut"
  | "departement"
  | "region"
  | "surface_estimee_m2"
  | "deja_equipe_partiel"
  | "derogation_pente"
  | "derogation_abf"
  | "budget_indicatif"
  | "delai_souhaite"
  | "acheteurs_count"
> & {
  prix_acces: number;
  is_owned?: boolean;
  notes_particulieres?: string | null;
};

export type OwnedRfp = RfpSubmissionRow & { is_owned: true; prix_acces: number };

export function toPublicRfp(row: RfpSubmissionRow): PublicRfp {
  return {
    id: row.id,
    created_at: row.created_at,
    statut: row.statut,
    departement: row.departement,
    region: row.region,
    surface_estimee_m2: row.surface_estimee_m2,
    deja_equipe_partiel: row.deja_equipe_partiel,
    derogation_pente: row.derogation_pente,
    derogation_abf: row.derogation_abf,
    budget_indicatif: row.budget_indicatif,
    delai_souhaite: row.delai_souhaite,
    acheteurs_count: row.acheteurs_count,
    prix_acces: computeRfpAccessPrice(row.surface_estimee_m2),
  };
}

export function toOwnedRfp(row: RfpSubmissionRow): OwnedRfp {
  return { ...row, is_owned: true, prix_acces: computeRfpAccessPrice(row.surface_estimee_m2) };
}

export function departementFromPostal(codePostal: string | null | undefined): string | null {
  if (!codePostal || codePostal.length < 2) return null;
  if (codePostal.startsWith("97") || codePostal.startsWith("98")) {
    return codePostal.slice(0, 3);
  }
  if (codePostal.startsWith("20")) {
    return codePostal.slice(0, 3) === "201" ? "2A" : "2B";
  }
  return codePostal.slice(0, 2);
}

export function inferGeoFromAddress(adresse: string): {
  departement: string | null;
  region: string | null;
} {
  const cpMatch = adresse.match(/\b(\d{5})\b/);
  const dept = departementFromPostal(cpMatch?.[1]);
  return { departement: dept, region: getRegion(dept) };
}

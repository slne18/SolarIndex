import { enrichPublicRfp, type PublicRfpEnrichment } from "./rfp-official-fields";
import { resolveRfpSolutionType } from "./solution-type";
import type { RfpOwnerType } from "./rfp-official";
import type { TypeSolutionRecherchee } from "./solution-type";
import { getRegion } from "./regions";

/** Seuil surface pour la grille tarifaire appels d'offres (aligné APER 10 000 m²). */
export const RFP_SURFACE_TIER_M2 = 10_000;

export const PRIX_RFP = {
  sous_10000: 400,
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
  adresse: string | null;
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
  est_personne_publique: boolean;
  acceptation_conditions_deposant: boolean;
  deposant_user_id: string | null;
  ao_publie_officiellement: boolean;
  lien_consultation_officielle: string | null;
  date_limite_offres: string | null;
  nombre_places: number | null;
  type_proprietaire: RfpOwnerType | null;
  parking_deja_etudie: boolean;
  documents_complementaires: string | null;
  type_solution_recherchee: TypeSolutionRecherchee;
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
  | "acheteurs_max"
  | "ao_publie_officiellement"
  | "lien_consultation_officielle"
  | "date_limite_offres"
  | "nombre_places"
  | "type_proprietaire"
  | "parking_deja_etudie"
  | "type_solution_recherchee"
> & {
  prix_acces: number;
  is_owned?: boolean;
  notes_particulieres?: string | null;
  lien_plateforme_connue: boolean;
  documents_complementaires: string[];
  solar: PublicRfpEnrichment["solar"];
};

export type OwnedRfp = Omit<RfpSubmissionRow, "documents_complementaires"> & {
  is_owned: true;
  prix_acces: number;
  lien_plateforme_connue: boolean;
  documents_complementaires: string[];
  solar: PublicRfpEnrichment["solar"];
};

export function toPublicRfp(row: RfpSubmissionRow): PublicRfp {
  const extra = enrichPublicRfp(row);
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
    acheteurs_max: row.acheteurs_max,
    ao_publie_officiellement: extra.ao_publie_officiellement,
    lien_consultation_officielle: extra.lien_consultation_officielle,
    date_limite_offres: extra.date_limite_offres,
    nombre_places: extra.nombre_places,
    type_proprietaire: extra.type_proprietaire,
    parking_deja_etudie: extra.parking_deja_etudie,
    type_solution_recherchee: resolveRfpSolutionType(row.type_solution_recherchee),
    lien_plateforme_connue: extra.lien_plateforme_connue,
    documents_complementaires: extra.documents_complementaires,
    solar: extra.solar,
    prix_acces: computeRfpAccessPrice(row.surface_estimee_m2),
  };
}

export function toOwnedRfp(row: RfpSubmissionRow): OwnedRfp {
  const extra = enrichPublicRfp(row);
  return {
    ...row,
    is_owned: true,
    prix_acces: computeRfpAccessPrice(row.surface_estimee_m2),
    lien_plateforme_connue: extra.lien_plateforme_connue,
    documents_complementaires: extra.documents_complementaires,
    solar: extra.solar,
  };
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

export function inferGeoFromAddress(adresse: string | null | undefined): {
  departement: string | null;
  region: string | null;
} {
  const trimmed = adresse?.trim();
  if (!trimmed) return { departement: null, region: null };
  const cpMatch = trimmed.match(/\b(\d{5})\b/);
  const dept = departementFromPostal(cpMatch?.[1]);
  return { departement: dept, region: getRegion(dept) };
}

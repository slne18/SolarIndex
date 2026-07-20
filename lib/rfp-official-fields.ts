import type { RfpSubmissionRow } from "./rfp";
import { estimateRfpSolarMetrics, type RfpSolarEstimate } from "./rfp-estimates";
import {
  isKnownOfficialPlatform,
  isRfpOwnerType,
  normalizeOfficialUrl,
  parseDocumentsComplementaires,
  serializeDocumentsComplementaires,
  type RfpOwnerType,
} from "./rfp-official";

export interface RfpOfficialFieldsInput {
  ao_publie_officiellement?: boolean;
  lien_consultation_officielle?: string;
  date_limite_offres?: string | null;
  nombre_places?: number | string | null;
  type_proprietaire?: string | null;
  parking_deja_etudie?: boolean;
  documents_complementaires?: string | null;
}

export interface RfpOfficialFieldsPayload {
  ao_publie_officiellement: boolean;
  lien_consultation_officielle: string | null;
  date_limite_offres: string | null;
  nombre_places: number | null;
  type_proprietaire: RfpOwnerType | null;
  parking_deja_etudie: boolean;
  documents_complementaires: string | null;
}

function parseDateOnly(value: string): string | null {
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
  const d = new Date(`${trimmed}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  return trimmed;
}

function parsePlaces(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(String(value).replace(/\s/g, ""));
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n);
}

export function validateRfpOfficialFields(
  input: RfpOfficialFieldsInput,
): { ok: true; data: RfpOfficialFieldsPayload } | { ok: false; error: string } {
  const aoPublie = !!input.ao_publie_officiellement;
  const lienRaw = (input.lien_consultation_officielle ?? "").trim();
  const lien = lienRaw ? normalizeOfficialUrl(lienRaw) : null;
  const dateLimiteRaw = (input.date_limite_offres ?? "").trim();
  const dateLimite = dateLimiteRaw ? parseDateOnly(dateLimiteRaw) : null;
  const nombrePlaces = parsePlaces(input.nombre_places);
  const typeRaw = (input.type_proprietaire ?? "").trim();
  const typeProprietaire = typeRaw && isRfpOwnerType(typeRaw) ? typeRaw : null;
  const parkingEtudie = !!input.parking_deja_etudie;
  const docs = serializeDocumentsComplementaires(
    parseDocumentsComplementaires(input.documents_complementaires ?? ""),
  );

  if (aoPublie) {
    if (!lien) {
      return {
        ok: false,
        error: "Indiquez une URL HTTPS valide vers votre consultation officielle (PLACE, AWS, Megalis, etc.).",
      };
    }
    if (!dateLimite) {
      return {
        ok: false,
        error: "Indiquez la date limite de remise des offres (AAAA-MM-JJ).",
      };
    }
    const today = new Date().toISOString().slice(0, 10);
    if (dateLimite < today) {
      return { ok: false, error: "La date limite de remise des offres doit être future ou du jour." };
    }
  } else if (lien || dateLimite) {
    return {
      ok: false,
      error: "Cochez « Appel d'offres publié » pour renseigner le lien officiel et la date limite.",
    };
  }

  return {
    ok: true,
    data: {
      ao_publie_officiellement: aoPublie,
      lien_consultation_officielle: aoPublie ? lien : null,
      date_limite_offres: aoPublie ? dateLimite : null,
      nombre_places: nombrePlaces,
      type_proprietaire: typeProprietaire,
      parking_deja_etudie: parkingEtudie,
      documents_complementaires: docs,
    },
  };
}

export type PublicRfpEnrichment = {
  ao_publie_officiellement: boolean;
  lien_consultation_officielle: string | null;
  lien_plateforme_connue: boolean;
  date_limite_offres: string | null;
  nombre_places: number | null;
  type_proprietaire: RfpOwnerType | null;
  parking_deja_etudie: boolean;
  documents_complementaires: string[];
  solar: RfpSolarEstimate | null;
};

export function enrichPublicRfp(row: RfpSubmissionRow): PublicRfpEnrichment {
  const aoPublie = row.ao_publie_officiellement ?? false;
  const lien = row.lien_consultation_officielle ?? null;
  return {
    ao_publie_officiellement: aoPublie,
    lien_consultation_officielle: aoPublie ? lien : null,
    lien_plateforme_connue: lien ? isKnownOfficialPlatform(lien) : false,
    date_limite_offres: row.date_limite_offres ?? null,
    nombre_places: row.nombre_places ?? null,
    type_proprietaire: row.type_proprietaire ?? null,
    parking_deja_etudie: row.parking_deja_etudie ?? false,
    documents_complementaires: parseDocumentsComplementaires(row.documents_complementaires ?? ""),
    solar: estimateRfpSolarMetrics(row.surface_estimee_m2, row.region),
  };
}

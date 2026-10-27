import {
  DetectionEtat,
  FlagUrgence,
  LeadRow,
  PipelineLead,
  PublicLead,
  SENSITIVE_FIELDS,
  SourceSurface,
  LeadTier,
} from "./types";
import { getRegion } from "./regions";
import { isLeadPremium } from "./lead-confidence";
import { leadCompleteness } from "./lead-completeness";
import { parseTypeSolutionRecherchee } from "./solution-type";
import { MAX_BUYERS_PER_LEAD } from "./lead-slots";
import { isVisionEquippedPct } from "./pv-overlap";
import {
  SURFACE_URGENCE_M2,
  computeFlagUrgence,
  isSurfaceSellable,
} from "./surface-thresholds";

export { SURFACE_URGENCE_M2 } from "./surface-thresholds";

/** Lead éligible au catalogue et au checkout (hors leads déjà achetés). */
export function isLeadSellable(
  lead: Pick<
    LeadRow,
    | "adresse"
    | "detection"
    | "siren"
    | "id_parcelle"
    | "surface_m2"
    | "vision_surface_couverte_pct"
  >,
): boolean {
  if (lead.detection === "equipe") return false;
  if (isVisionEquippedPct(lead.vision_surface_couverte_pct)) return false;
  if (!(lead.adresse ?? "").trim()) return false;
  if (!(lead.siren ?? "").trim() || !(lead.id_parcelle ?? "").trim()) return false;
  if (!isSurfaceSellable(Number(lead.surface_m2) || 0)) return false;
  return true;
}

export function leadTier(
  lead: Pick<LeadRow, "vision_checked_at" | "created_at">,
): LeadTier {
  return isLeadPremium(lead) ? "premium" : "standard";
}

// Grille tarifaire par tier (€ TTC / lead premium — les autres via abonnement plateforme).
export const PRIX_LEAD = {
  premium: 50,
  standard: 100,
} as const;

export function computePrixLead(_surface_m2: number, tier: LeadTier = "standard"): number {
  return PRIX_LEAD[tier];
}

export function computePrixLeadFromRow(
  lead: Pick<LeadRow, "surface_m2" | "vision_checked_at" | "created_at">,
): number {
  return computePrixLead(Number(lead.surface_m2), leadTier(lead));
}

export function prixLeadCentimesFromRow(
  lead: Pick<LeadRow, "surface_m2" | "vision_checked_at" | "created_at">,
): number {
  return computePrixLeadFromRow(lead) * 100;
}

// Normalise le flag d'urgence du pipeline (avec emoji) vers l'enum DB.
export function normalizeFlag(raw: string | undefined, surface_m2: number): FlagUrgence {
  if (raw && raw.toUpperCase().includes("URGENCE")) {
    return computeFlagUrgence(surface_m2);
  }
  if (raw === "URGENCE_ABSOLUE" || raw === "CONFORME_REQUIS") {
    return computeFlagUrgence(surface_m2);
  }
  return computeFlagUrgence(surface_m2);
}

// Déduit le code département depuis un code INSEE commune (ex: '33281' → '33').
export function deptFromInsee(code_insee: string | null | undefined): string | null {
  if (!code_insee) return null;
  // Corse : '2A...' / '2B...' ; DROM : 3 chiffres ('971...').
  if (code_insee.startsWith("2A") || code_insee.startsWith("2B")) {
    return code_insee.slice(0, 2);
  }
  if (code_insee.startsWith("97") || code_insee.startsWith("98")) {
    return code_insee.slice(0, 3);
  }
  return code_insee.slice(0, 2);
}

// Retire les champs sensibles d'un lead et ajoute tier + prix calculé.
export function toPublicLead(lead: LeadRow): PublicLead {
  const clone: Record<string, unknown> = { ...lead };
  for (const field of SENSITIVE_FIELDS) {
    delete clone[field];
  }
  const tier = leadTier(lead);
  const { pct, hasDirigeant } = leadCompleteness(lead);
  clone.tier = tier;
  clone.prix_lead = computePrixLeadFromRow(lead);
  clone.max_buyers = MAX_BUYERS_PER_LEAD;
  clone.has_dirigeant = hasDirigeant;
  clone.completude_pct = pct;
  return clone as PublicLead;
}

// Ajoute tier + prix sans masquer (lead possédé par l'acheteur).
export function toOwnedLead(lead: LeadRow): LeadRow & {
  tier: LeadTier;
  prix_lead: number;
  has_dirigeant: boolean;
  completude_pct: number;
} {
  const tier = leadTier(lead);
  const { pct, hasDirigeant } = leadCompleteness(lead);
  return { ...lead, tier, prix_lead: computePrixLeadFromRow(lead), has_dirigeant: hasDirigeant, completude_pct: pct };
}

// Transforme une ligne brute du pipeline Python en ligne insérable dans `leads`.
export function mapPipelineToLead(
  p: PipelineLead,
): Omit<LeadRow, "id" | "created_at" | "acheteur_id" | "vendu_at" | "prix_vente_eur" | "buyers_count"> {
  const departement =
    p.departement || deptFromInsee(p.code_insee) || "";

  return {
    osm_id: Number(p.osm_id),
    osm_type: p.osm_type ?? null,
    latitude: Number(p.latitude ?? 0),
    longitude: Number(p.longitude ?? 0),
    departement,
    region: getRegion(departement),

    surface_m2: Number(p.surface_m2),
    flag_urgence: normalizeFlag(p.flag_urgence, Number(p.surface_m2)),
    nom_osm: p.nom_osm ?? null,
    adresse: p.adresse_cadastre || p.adresse_osm || null,
    ville: p.ville_ban || p.ville_osm || null,

    surface_solaire_m2: p.surface_solaire_m2 ?? null,
    puissance_kwc: p.puissance_kwc ?? null,
    valeur_chantier_eur: p.valeur_chantier_eur ?? null,

    code_insee: p.code_insee ?? null,
    id_parcelle: p.id_parcelle ?? null,
    siren: p.siren ?? null,
    raison_sociale: p.raison_sociale ?? null,
    code_naf: p.code_naf ?? null,
    libelle_naf: p.libelle_naf ?? null,
    dirigeant_nom: p.dirigeant_exploitant ?? p.dirigeant_nom ?? null,
    dirigeant_exploitant: p.dirigeant_exploitant ?? p.dirigeant_nom ?? null,
    dirigeant_exploitant_qualite: p.dirigeant_exploitant_qualite ?? null,
    dirigeant_proprietaire: p.dirigeant_proprietaire ?? null,
    dirigeant_proprietaire_qualite: p.dirigeant_proprietaire_qualite ?? null,
    telephone: p.telephone_exploitant ?? p.telephone ?? null,
    telephone_exploitant: p.telephone_exploitant ?? p.telephone ?? null,
    telephone_proprietaire: p.telephone_proprietaire ?? null,
    email_contact: p.email_contact ?? null,

    // Détection PV : renseignée si le pipeline a tourné avec --verify.
    pv_osm: p.pv_osm ?? null,
    pv_overlap_pct:
      typeof p.pv_overlap_pct === "number" ? p.pv_overlap_pct : null,
    pv_registry_count:
      typeof p.pv_registry_count === "number" ? p.pv_registry_count : null,
    detection: normalizeDetection(p.detection),
    verified_at: p.detection ? new Date().toISOString() : null,

    // Bypass 1 & 2 : provenance de la surface
    surface_tag_present:
      typeof p.surface_tag_present === "boolean" ? p.surface_tag_present : null,
    surface_osm_m2:
      typeof p.surface_osm_m2 === "number" ? p.surface_osm_m2 : null,
    surface_cadastrale_m2:
      typeof p.surface_cadastrale_m2 === "number" ? p.surface_cadastrale_m2 : null,
    source_surface: normalizeSourceSurface(p.source_surface),

    // Bypass 3 : propriétaire foncier (MAJIC DGFiP)
    proprietaire_foncier: p.proprietaire_foncier ?? null,
    siren_proprietaire_foncier: p.siren_proprietaire_foncier ?? null,

    // Stabilité exploitant (SIRENE)
    siren_date_creation: p.siren_date_creation ?? null,
    siren_etat_administratif: p.siren_etat_administratif ?? null,
    siren_anciennete_checked_at: p.siren_anciennete_checked_at ?? null,

    // Bypass 4 : validation vision ombrières
    vision_flag: typeof p.vision_flag === "boolean" ? p.vision_flag : null,
    vision_confidence:
      typeof p.vision_confidence === "number" ? p.vision_confidence : null,
    vision_checked_at: p.vision_checked_at ?? null,
    vision_surface_couverte_pct:
      typeof p.vision_surface_couverte_pct === "number"
        ? p.vision_surface_couverte_pct
        : null,
    vision_ortho_date: p.vision_ortho_date ?? null,

    // Bypass 5 : dérogations APER
    derogation_pente:
      typeof p.derogation_pente === "boolean" ? p.derogation_pente : null,
    derogation_abf:
      typeof p.derogation_abf === "boolean" ? p.derogation_abf : null,
    pente_pct: typeof p.pente_pct === "number" ? p.pente_pct : null,

    // Confiance : score du pipeline (bypasses) si présent, sinon proxy géocodage.
    score_confiance:
      typeof p.score_confiance === "number" && p.score_confiance > 0
        ? Math.min(1, Math.max(0, p.score_confiance))
        : typeof p.geocode_score === "number" && p.geocode_score > 0
          ? Math.min(1, Math.max(0, p.geocode_score))
          : 0.5,
    type_solution_recherchee:
      parseTypeSolutionRecherchee(p.type_solution_recherchee) ??
      (typeof p.pv_overlap_pct === "number" && p.pv_overlap_pct >= 0.175
        ? "mixte_pv_vegetal"
        : "pv_pur"),
    statut: "disponible",
  };
}

// Normalise la provenance de surface (défaut 'osm').
export function normalizeSourceSurface(
  raw: string | undefined | null,
): SourceSurface {
  if (raw === "cadastre" || raw === "osm_fallback" || raw === "osm") return raw;
  return "osm";
}

// Normalise la valeur de détection du pipeline vers l'enum (défaut 'libre').
export function normalizeDetection(raw: string | undefined | null): DetectionEtat {
  if (raw === "equipe" || raw === "a_verifier" || raw === "libre") return raw;
  return "libre";
}

import type { LeadRow, PublicLead, SourceSurface, LeadTier } from "./types";
import { PREMIUM_LEAD_MAX_AGE_MS } from "./platform-access";
import {
  effectiveLeadScore,
  HUWART_LAW_REF,
  isHuwartPartialComplianceLead,
  isHuwartScorePenaltyLead,
} from "./huwart-law";
import {
  hasSirenStabilityData,
  isSirenEntrepriseActive,
  sirenAncienneteAnnees,
} from "./sirene-stability";
import {
  formatVisionCoveragePct,
  isUrgenceAbsolueLead,
  isVisionEquippedPct,
  PV_OVERLAP_MIN,
  pvOverlapSummary,
  visionRecouvrementSummary,
} from "./pv-overlap";

/** Lead premium : photo aérienne vérifiée et fiche catalogue de moins de 6 mois. */
export function isLeadPremium(
  lead: Pick<LeadRow, "vision_checked_at" | "created_at">,
  now = Date.now(),
): boolean {
  if (!lead.vision_checked_at) return false;
  const created = new Date(lead.created_at).getTime();
  if (Number.isNaN(created)) return false;
  return now - created <= PREMIUM_LEAD_MAX_AGE_MS;
}

export type ConfidenceFactor = {
  id: ConfidenceFactorId;
  ok: boolean;
  label: string;
  detail: string;
};

export type ConfidenceFactorId =
  | "solar"
  | "aper_conformity"
  | "surfacing"
  | "cadastral"
  | "siren_stability"
  | "completeness"
  | "regulatory"
  | "registry";

const PHOTO_RESERVEE_URGENCES =
  " Photo aérienne non analysée (réservée aux urgences).";

function equipementSolaireDetail(
  lead: Pick<
    LeadRow,
    | "detection"
    | "vision_checked_at"
    | "vision_surface_couverte_pct"
    | "pv_overlap_pct"
    | "flag_urgence"
  >,
  isUrgence: boolean,
  overlap: ReturnType<typeof pvOverlapSummary>,
  visionPct: string | null,
  visionEquipped: boolean,
): string {
  let detail: string;

  if (lead.detection === "equipe") {
    detail = isUrgence ? visionRecouvrementSummary(lead).detail : overlap.detail;
  } else if (isUrgence && lead.vision_checked_at) {
    detail = visionRecouvrementSummary(lead).detail;
  } else if (visionEquipped && visionPct) {
    detail = `Photo aérienne : couverture estimée ${visionPct} — parking considéré déjà équipé.`;
  } else if (lead.detection === "a_verifier") {
    detail = overlap.formatted
      ? overlap.detail
      : "Doute : recouvrement partiel (entre 5 et 50 %) — à confirmer sur site.";
  } else {
    detail = overlap.formatted
      ? overlap.detail
      : "Aucun recouvrement PV significatif (< 5 %) sur la géométrie OSM.";
  }

  if (!isUrgence && !lead.vision_checked_at) {
    detail += PHOTO_RESERVEE_URGENCES;
  }

  return detail;
}

/** Équipement + Huwart : une seule explication lorsque le score est pénalisé. */
function mergedAperConformityDetail(solarDetail: string): string {
  return [
    solarDetail,
    `${HUWART_LAW_REF} : l'obligation de 50 % peut être remplie par un mix panneaux (min. 17,5 % de la surface) + végétalisation équivalente. Ce parking peut donc déjà être partiellement ou totalement conforme via une solution non détectable automatiquement (végétalisation, mix, ombrière non cartographiée).`,
    "Le score de confiance est abaissé en conséquence : nos signaux cartographiques et photo restent incertains, et le besoin commercial en ombrière PV peut être plus faible qu'il n'y paraît.",
  ].join("\n\n");
}

function regulatoryDetailOnlyPenteAbf(
  lead: Pick<LeadRow, "derogation_pente" | "derogation_abf">,
): string | null {
  const parts: string[] = [];
  if (lead.derogation_pente || lead.derogation_abf) {
    parts.push("Pente forte et/ou zone ABF : démarches supplémentaires possibles.");
  }
  if (parts.length === 0) return null;
  return parts.join(" ");
}

/** Détail lisible des signaux qui composent le score / le tier. */
type ConfidenceFactorsInput = Pick<
  LeadRow,
  | "detection"
  | "surface_tag_present"
  | "source_surface"
  | "surface_cadastrale_m2"
  | "score_confiance"
  | "vision_checked_at"
  | "vision_flag"
  | "derogation_pente"
  | "derogation_abf"
  | "pv_overlap_pct"
  | "pv_registry_count"
  | "vision_surface_couverte_pct"
  | "vision_ortho_date"
  | "flag_urgence"
  | "siren_date_creation"
  | "siren_etat_administratif"
  | "siren_anciennete_checked_at"
> & {
  /** Calculé à la volée pour l'API (pas une colonne Supabase). */
  completude_pct?: number;
};

export function confidenceFactors(lead: ConfidenceFactorsInput): ConfidenceFactor[] {
  const src = lead.source_surface as SourceSurface | null;
  const isUrgence = isUrgenceAbsolueLead(lead);
  const overlap = isUrgence ? visionRecouvrementSummary(lead) : pvOverlapSummary(lead);
  const visionPct = formatVisionCoveragePct(lead.vision_surface_couverte_pct);
  const visionEquipped = isVisionEquippedPct(lead.vision_surface_couverte_pct);
  const overlapRatio = lead.pv_overlap_pct ?? 0;
  const registryCount = lead.pv_registry_count ?? 0;
  const equipementOk = isUrgence
    ? lead.detection !== "equipe" &&
      !!lead.vision_checked_at &&
      !visionEquipped &&
      !lead.vision_flag
    : lead.detection !== "equipe" &&
      !visionEquipped &&
      overlapRatio < PV_OVERLAP_MIN;

  const huwartPenalty = isHuwartScorePenaltyLead(lead);
  const mergeSolarHuwart = huwartPenalty;
  const solarDetail = equipementSolaireDetail(
    lead,
    isUrgence,
    overlap,
    visionPct,
    visionEquipped,
  );

  const factors: ConfidenceFactor[] = [];

  if (mergeSolarHuwart) {
    factors.push({
      id: "aper_conformity",
      ok: false,
      label: "Conformité APER & équipement",
      detail: mergedAperConformityDetail(solarDetail),
    });
  } else {
    factors.push({
      id: "solar",
      ok: equipementOk,
      label: "Équipement solaire",
      detail: solarDetail,
    });
  }

  if (typeof lead.completude_pct === "number") {
    const pct = lead.completude_pct;
    const levelLabel =
      pct >= 85 ? "élevée" : pct >= 65 ? "bonne" : pct >= 45 ? "moyenne" : "partielle";
    factors.push({
      id: "completeness",
      ok: pct >= 65,
      label: "Complétude documentaire",
      detail: `${pct} % — niveau ${levelLabel}. Part des champs B2B renseignés (SIREN, parcelle, adresse, NAF, dirigeants, propriétaire foncier…) ; hors téléphone et email.`,
    });
  }

  if (hasSirenStabilityData(lead)) {
    const years = sirenAncienneteAnnees(lead.siren_date_creation);
    const active = isSirenEntrepriseActive(lead.siren_etat_administratif);
    if (years != null) {
      let detail: string;
      if (active === false) {
        detail =
          "État administratif SIRENE : entreprise cessée — vérifier l'exploitant actuel du parking avant prospection.";
      } else if (active === true) {
        detail = `Entreprise active · immatriculée depuis ${years} ans (registre SIRENE).`;
      } else {
        detail = `Entreprise immatriculée depuis ${years} ans (registre SIRENE).`;
      }
      factors.push({
        id: "siren_stability",
        ok: active !== false,
        label: "Ancienneté exploitant (SIREN)",
        detail,
      });
    }
  }

  factors.push(
    {
      id: "surfacing",
      ok: !!lead.surface_tag_present,
      label: "Revêtement du parking",
      detail: lead.surface_tag_present
        ? "Sur OpenStreetMap (carte collaborative), ce parking est explicitement décrit en asphalte ou béton."
        : "La surface parking dont la taille a été calculée peut inclure des zones annexes ou être moins fiable.",
    },
    {
      id: "cadastral",
      ok: src === "cadastre",
      label: "Surface cadastrale",
      detail:
        src === "cadastre"
          ? `Surface officielle du terrain (cadastre IGN) retenue pour le calcul${
              lead.surface_cadastrale_m2 ? ` : ${Math.round(lead.surface_cadastrale_m2).toLocaleString("fr-FR")} m²` : ""
            }.`
          : src === "osm_fallback"
            ? "Le cadastre et la carte ne concordent pas assez : on conserve la surface issue de la carte."
            : "Pas de surface cadastrale utilisable : seule la mesure sur la carte OpenStreetMap fait foi.",
    },
  );

  const penteAbfDetail = mergeSolarHuwart
    ? regulatoryDetailOnlyPenteAbf(lead)
    : regulatoryDetail(lead);
  const regulatoryOk =
    !lead.derogation_pente && !lead.derogation_abf && !huwartPenalty;

  if (penteAbfDetail !== null) {
    factors.push({
      id: "regulatory",
      ok: regulatoryOk,
      label: "Réglementaire",
      detail: penteAbfDetail,
    });
  } else if (!mergeSolarHuwart) {
    factors.push({
      id: "regulatory",
      ok: regulatoryOk,
      label: "Réglementaire",
      detail: regulatoryDetail(lead),
    });
  }

  factors.push({
    id: "registry",
    ok: registryCount === 0,
    label: "Registre PV communal (ODRÉ)",
    detail:
      registryCount > 0
        ? `${registryCount} installation${registryCount > 1 ? "s" : ""} photovoltaïque${registryCount > 1 ? "s" : ""} de puissance comparable recensée${registryCount > 1 ? "s" : ""} dans la commune. Signal communal uniquement — sans lien établi avec ce parking précis.`
        : "Aucune installation comparable recensée dans la commune (registre ODRÉ).",
  });

  return factors;
}

function regulatoryDetail(
  lead: Pick<
    LeadRow,
    | "derogation_pente"
    | "derogation_abf"
    | "pv_overlap_pct"
    | "vision_surface_couverte_pct"
    | "vision_checked_at"
    | "flag_urgence"
    | "detection"
  >,
): string {
  const parts: string[] = [];

  if (lead.derogation_pente || lead.derogation_abf) {
    parts.push("Pente forte et/ou zone ABF : démarches supplémentaires possibles.");
  }

  if (isHuwartPartialComplianceLead(lead)) {
    parts.push(
      `${HUWART_LAW_REF} : l'obligation de 50 % peut être remplie par un mix panneaux (min. 17,5 % de la surface) + végétalisation équivalente. Ce parking peut donc déjà être partiellement ou totalement conforme via une solution non détectable automatiquement.`,
    );
    if (isHuwartScorePenaltyLead(lead)) {
      parts.push("Score de confiance réduit en conséquence.");
    }
  }

  if (parts.length === 0) {
    return "Pas d'alerte pente/ABF majeure dans nos sources.";
  }

  return parts.join(" ");
}

export function tierLabel(tier: LeadTier): string {
  return tier === "premium" ? "Premium" : "Standard";
}

export function tierShortDescription(tier: LeadTier): string {
  return tier === "premium"
    ? "Photo aérienne vérifiée et fiche récente (< 6 mois) — achat unitaire."
    : "Inclus dans l'abonnement Accès plateforme.";
}

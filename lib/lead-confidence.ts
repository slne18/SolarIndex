import type { LeadRow, PublicLead, SourceSurface, LeadTier } from "./types";
import {
  formatVisionCoveragePct,
  isUrgenceAbsolueLead,
  isVisionEquippedPct,
  PV_OVERLAP_MIN,
  pvOverlapSummary,
  visionRecouvrementSummary,
} from "./pv-overlap";

/** Critères objectifs du tier Premium (alignés pipeline + base). */
export function isLeadPremium(
  lead: Pick<
    LeadRow,
    | "detection"
    | "surface_tag_present"
    | "source_surface"
    | "score_confiance"
    | "adresse"
    | "siren"
    | "id_parcelle"
  >,
): boolean {
  if (lead.detection !== "libre") return false;
  if (!lead.surface_tag_present) return false;
  if (lead.source_surface !== "cadastre") return false;
  if ((lead.score_confiance ?? 0) < 0.8) return false;
  if (!(lead.adresse ?? "").trim()) return false;
  if (!(lead.siren ?? "").trim() || !(lead.id_parcelle ?? "").trim()) return false;
  return true;
}

export type ConfidenceFactor = {
  id: ConfidenceFactorId;
  ok: boolean;
  label: string;
  detail: string;
};

export type ConfidenceFactorId = "solar" | "surfacing" | "cadastral" | "regulatory" | "registry";

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

/** Détail lisible des signaux qui composent le score / le tier. */
export function confidenceFactors(
  lead: Pick<
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
  >,
): ConfidenceFactor[] {
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

  return [
    {
      id: "solar",
      ok: equipementOk,
      label: "Équipement solaire",
      detail: equipementSolaireDetail(lead, isUrgence, overlap, visionPct, visionEquipped),
    },
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
    {
      id: "regulatory",
      ok: !lead.derogation_pente && !lead.derogation_abf,
      label: "Réglementaire",
      detail:
        lead.derogation_pente || lead.derogation_abf
          ? "Pente forte et/ou zone ABF : démarches supplémentaires possibles."
          : "Pas d'alerte pente/ABF majeure dans nos sources.",
    },
    {
      id: "registry",
      ok: registryCount === 0,
      label: "Registre PV communal (ODRÉ)",
      detail:
        registryCount > 0
          ? `${registryCount} installation${registryCount > 1 ? "s" : ""} photovoltaïque${registryCount > 1 ? "s" : ""} de puissance comparable recensée${registryCount > 1 ? "s" : ""} dans la commune. Signal communal uniquement — sans lien établi avec ce parking précis.`
          : "Aucune installation comparable recensée dans la commune (registre ODRÉ).",
    },
  ];
}

export function tierLabel(tier: LeadTier): string {
  return tier === "premium" ? "Premium" : "Standard";
}

export function tierShortDescription(tier: LeadTier): string {
  return tier === "premium"
    ? "Tous les signaux principaux sont au vert : prospection prioritaire."
    : "Opportunité réelle, mais au moins un signal demande des vérifications avant de contacter le prospect. Prix réduit.";
}

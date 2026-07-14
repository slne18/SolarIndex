import type { DetectionEtat } from "./types";

/** Seuils alignés sur solarindex_pipeline.py (Signal A OSM). */
export const PV_OVERLAP_EQUIPE = 0.5;
export const PV_OVERLAP_MIN = 0.05;

/** Recouvrement photo (0–100) au-delà duquel le parking est considéré équipé. */
export const VISION_COVERAGE_EQUIPE = 45;

export function isVisionEquippedPct(pct: number | null | undefined): boolean {
  return pct != null && !Number.isNaN(pct) && pct > VISION_COVERAGE_EQUIPE;
}

export interface PvOverlapSummary {
  formatted: string | null;
  short: string;
  detail: string;
}

export interface VisionCoverageSummary {
  formatted: string | null;
  short: string;
  detail: string;
}

export interface LeadCoverageSummary {
  osm: PvOverlapSummary;
  vision: VisionCoverageSummary | null;
}

export function formatPvOverlapPct(ratio: number | null | undefined): string | null {
  if (ratio == null || Number.isNaN(ratio)) return null;
  const pct = ratio * 100;
  if (pct === 0) return "0\u00a0%";
  if (pct < 0.1) return "< 0,1\u00a0%";
  return `${pct.toLocaleString("fr-FR", {
    maximumFractionDigits: pct < 10 ? 1 : 0,
    minimumFractionDigits: pct < 10 && pct >= 0.1 ? 1 : 0,
  })}\u00a0%`;
}

export function formatVisionCoveragePct(pct: number | null | undefined): string | null {
  if (pct == null || Number.isNaN(pct)) return null;
  if (pct === 0) return "0\u00a0%";
  if (pct < 0.1) return "< 0,1\u00a0%";
  return `${pct.toLocaleString("fr-FR", {
    maximumFractionDigits: pct < 10 ? 1 : 0,
    minimumFractionDigits: pct < 10 && pct >= 0.1 ? 1 : 0,
  })}\u00a0%`;
}

export function formatVisionOrthoDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso.includes("T") ? iso : `${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("fr-FR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function pvOverlapSummary(lead: {
  pv_overlap_pct?: number | null;
  detection?: DetectionEtat | string | null;
}): PvOverlapSummary {
  const formatted = formatPvOverlapPct(lead.pv_overlap_pct);

  if (formatted === null) {
    return {
      formatted: null,
      short: "Non analysé",
      detail:
        "Estimation de recouvrement PV non disponible (lead ingéré sans analyse OSM).",
    };
  }

  const ratio = lead.pv_overlap_pct ?? 0;
  const pctLabel = formatted;

  if (ratio >= PV_OVERLAP_EQUIPE) {
    return {
      formatted,
      short: pctLabel,
      detail: `Recouvrement estimé : ${pctLabel} de la surface parking — parking considéré déjà équipé.`,
    };
  }

  if (ratio >= PV_OVERLAP_MIN) {
    return {
      formatted,
      short: pctLabel,
      detail: `Recouvrement estimé : ${pctLabel} de la surface parking — doute géométrique, à confirmer sur site.`,
    };
  }

  return {
    formatted,
    short: pctLabel,
    detail: `Recouvrement estimé : ${pctLabel} de la surface parking — aucun panneau significatif cartographié.`,
  };
}

export function visionCoverageSummary(lead: {
  vision_surface_couverte_pct?: number | null;
  vision_checked_at?: string | null;
  vision_ortho_date?: string | null;
  vision_flag?: boolean | null;
}): VisionCoverageSummary | null {
  if (!lead.vision_checked_at) return null;

  const formatted = formatVisionCoveragePct(lead.vision_surface_couverte_pct);
  const orthoDate = formatVisionOrthoDate(lead.vision_ortho_date);
  const orthoSuffix = orthoDate ? ` (orthophoto du ${orthoDate})` : "";

  if (formatted === null) {
    return {
      formatted: null,
      short: lead.vision_flag ? "Ombrière possible" : "Analysé",
      detail: lead.vision_flag
        ? `Photo aérienne : ombrière possible.${orthoSuffix}`
        : `Photo aérienne : aucune ombrière repérée.${orthoSuffix}`,
    };
  }

  const pctLabel = formatted;
  const pct = lead.vision_surface_couverte_pct ?? 0;

  if (isVisionEquippedPct(pct)) {
    return {
      formatted,
      short: pctLabel,
      detail: `Photo aérienne : couverture estimée ${pctLabel} — parking considéré déjà équipé (hors vente).${orthoSuffix}`,
    };
  }

  if (lead.vision_flag) {
    return {
      formatted,
      short: pctLabel,
      detail: `Photo aérienne : couverture estimée ${pctLabel} — ombrière possible, vérification recommandée.${orthoSuffix}`,
    };
  }

  return {
    formatted,
    short: pctLabel,
    detail: `Photo aérienne : couverture estimée ${pctLabel} — aucune ombrière significative repérée.${orthoSuffix}`,
  };
}

export function isUrgenceAbsolueLead(lead: { flag_urgence?: string | null }): boolean {
  return lead.flag_urgence === "URGENCE_ABSOLUE";
}

type CoverageLeadInput = {
  flag_urgence?: string | null;
  pv_overlap_pct?: number | null;
  detection?: DetectionEtat | string | null;
  vision_surface_couverte_pct?: number | null;
  vision_checked_at?: string | null;
  vision_ortho_date?: string | null;
  vision_flag?: boolean | null;
};

/** Recouvrement affiché sur fiche / checkout : photo IGN pour les urgences, OSM sinon. */
export function displayRecouvrementSummary(lead: CoverageLeadInput): PvOverlapSummary {
  if (isUrgenceAbsolueLead(lead)) {
    return visionRecouvrementSummary(lead);
  }
  return pvOverlapSummary(lead);
}

export function displayRecouvrementSourceLine(lead: CoverageLeadInput): string {
  if (isUrgenceAbsolueLead(lead)) {
    return "Source : photo aérienne IGN.";
  }
  const osm = pvOverlapSummary(lead);
  return osm.formatted ? "Source : recouvrement géométrique OpenStreetMap." : "";
}

/** Recouvrement estimé issu de l'orthophoto (urgences ≥ 10 000 m²). */
export function visionRecouvrementSummary(lead: {
  vision_surface_couverte_pct?: number | null;
  vision_checked_at?: string | null;
  vision_ortho_date?: string | null;
  vision_flag?: boolean | null;
}): PvOverlapSummary {
  if (!lead.vision_checked_at) {
    return {
      formatted: null,
      short: "Non analysé",
      detail:
        "Recouvrement estimé non disponible — analyse photo aérienne en cours ou indisponible.",
    };
  }

  const formatted = formatVisionCoveragePct(lead.vision_surface_couverte_pct);
  const orthoDate = formatVisionOrthoDate(lead.vision_ortho_date);
  const orthoSuffix = orthoDate ? ` Orthophoto du ${orthoDate}.` : "";

  if (formatted === null) {
    return {
      formatted: null,
      short: lead.vision_flag ? "Ombrière possible" : "Analysé",
      detail: lead.vision_flag
        ? `Recouvrement estimé : ombrière possible sur la photo aérienne.${orthoSuffix}`
        : `Recouvrement estimé : aucune ombrière repérée sur la photo aérienne.${orthoSuffix}`,
    };
  }

  const pctLabel = formatted;
  const pct = lead.vision_surface_couverte_pct ?? 0;

  if (isVisionEquippedPct(pct)) {
    return {
      formatted,
      short: pctLabel,
      detail: `Recouvrement estimé : ${pctLabel} de la surface parking — parking considéré déjà équipé.${orthoSuffix}`,
    };
  }

  if (lead.vision_flag) {
    return {
      formatted,
      short: pctLabel,
      detail: `Recouvrement estimé : ${pctLabel} de la surface parking — ombrière possible, vérification recommandée.${orthoSuffix}`,
    };
  }

  return {
    formatted,
    short: pctLabel,
    detail: `Recouvrement estimé : ${pctLabel} de la surface parking — aucune ombrière significative repérée.${orthoSuffix}`,
  };
}

export function leadCoverageSummary(lead: CoverageLeadInput): LeadCoverageSummary {
  return {
    osm: pvOverlapSummary(lead),
    vision: visionCoverageSummary(lead),
  };
}

/** Lignes courtes pour table catalogue (recouvrement OSM uniquement). */
export function coverageBadgeLines(lead: Parameters<typeof leadCoverageSummary>[0]): string[] {
  const { osm } = leadCoverageSummary(lead);
  return [`OSM ${osm.short}`];
}

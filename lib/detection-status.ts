import type { DetectionEtat } from "./types";
import { isUrgenceAbsolueLead } from "./pv-overlap";

export type DetectionStatus = {
  badge: string;
  title: string;
  detail: string;
  disclaimer: string;
  tone: "ok" | "warn";
};

/** Libellé + explication du statut detection (libre / a_verifier) pour la fiche lead. */
export function getDetectionStatus(lead: {
  detection: DetectionEtat | string;
  flag_urgence?: string | null;
}): DetectionStatus | null {
  const isUrgence = isUrgenceAbsolueLead(lead);

  if (lead.detection === "libre") {
    return {
      badge: "✓ Vérifié",
      title: "Aucun équipement repéré",
      detail: isUrgence
        ? "Recouvrement photo ≤ 45 % et pas d'ombrière significative sur l'orthophoto IGN."
        : "Recouvrement cartographié OpenStreetMap < 5 % — aucun panneau significatif repéré.",
      disclaimer:
        "Analyse automatique sur Open Data — pas une visite terrain. Une confirmation sur site reste recommandée avant engagement commercial.",
      tone: "ok",
    };
  }

  if (lead.detection === "a_verifier") {
    return {
      badge: "⚠ À vérifier",
      title: "Doute sur l'équipement existant",
      detail: isUrgence
        ? "Ombrière possible repérée sur la photo aérienne, ou recouvrement ambigu."
        : "Recouvrement cartographié OpenStreetMap entre 5 % et 50 % — signal géométrique partiel ou ambigu.",
      disclaimer: "Confirmer sur site avant prospection.",
      tone: "warn",
    };
  }

  return null;
}

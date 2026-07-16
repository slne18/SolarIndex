import type { LeadRow } from "./types";

export type LeadCompleteness = {
  /** 0–100 : richesse documentaire B2B (sans tel/email). */
  pct: number;
  hasDirigeant: boolean;
  label: string;
};

function hasDirigeantExploitant(
  lead: Pick<LeadRow, "dirigeant_exploitant" | "dirigeant_nom">,
): boolean {
  return !!(lead.dirigeant_exploitant?.trim() || lead.dirigeant_nom?.trim());
}

/** Score de complétude documentaire pour la prospection (identité + parcelle + GPS). */
export function leadCompleteness(
  lead: Pick<
    LeadRow,
    | "siren"
    | "raison_sociale"
    | "id_parcelle"
    | "adresse"
    | "code_naf"
    | "dirigeant_exploitant"
    | "dirigeant_nom"
    | "proprietaire_foncier"
    | "dirigeant_proprietaire"
    | "source_surface"
    | "detection"
    | "surface_tag_present"
  >,
): LeadCompleteness {
  const checks: { weight: number; ok: boolean }[] = [
    { weight: 15, ok: !!(lead.siren?.trim() && lead.raison_sociale?.trim()) },
    { weight: 15, ok: !!(lead.id_parcelle?.trim()) },
    { weight: 10, ok: !!(lead.adresse?.trim()) },
    { weight: 10, ok: !!(lead.code_naf?.trim()) },
    { weight: 20, ok: hasDirigeantExploitant(lead) },
    { weight: 10, ok: !!(lead.proprietaire_foncier?.trim()) },
    { weight: 10, ok: !!(lead.dirigeant_proprietaire?.trim()) },
    { weight: 5, ok: lead.source_surface === "cadastre" },
    { weight: 5, ok: lead.detection === "libre" && !!lead.surface_tag_present },
  ];

  const totalWeight = checks.reduce((s, c) => s + c.weight, 0);
  const earned = checks.filter((c) => c.ok).reduce((s, c) => s + c.weight, 0);
  const pct = Math.round((earned / totalWeight) * 100);
  const hasDirigeant = hasDirigeantExploitant(lead);

  let label = "Partielle";
  if (pct >= 85) label = "Élevée";
  else if (pct >= 65) label = "Bonne";
  else if (pct >= 45) label = "Moyenne";

  return { pct, hasDirigeant, label };
}

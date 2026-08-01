export type TypeOffre = "devis_installation" | "tiers_investissement";

export const TYPE_OFFRE_LABELS: Record<TypeOffre, string> = {
  devis_installation: "Devis installation",
  tiers_investissement: "Tiers-investissement",
};

export const TYPE_OFFRE_SHORT_LABELS: Record<TypeOffre, string> = {
  devis_installation: "Devis",
  tiers_investissement: "Financement",
};

export function isTypeOffre(value: string): value is TypeOffre {
  return value === "devis_installation" || value === "tiers_investissement";
}

export function parseTypeOffre(value: unknown): TypeOffre | null {
  const raw = typeof value === "string" ? value.trim() : "";
  return isTypeOffre(raw) ? raw : null;
}

export function parseDureeContratAns(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(String(value).replace(/\s/g, ""));
  if (!Number.isFinite(n) || n < 1 || n > 40) return null;
  return Math.round(n);
}

export function validateRfpOfferInput(input: {
  type_offre?: unknown;
  duree_contrat_ans?: unknown;
}): { ok: true; type_offre: TypeOffre; duree_contrat_ans: number | null } | { ok: false; error: string } {
  const typeOffre = parseTypeOffre(input.type_offre);
  if (!typeOffre) {
    return { ok: false, error: "Type d'offre invalide." };
  }

  const duree = parseDureeContratAns(input.duree_contrat_ans);
  if (typeOffre === "tiers_investissement") {
    if (duree == null) {
      return { ok: false, error: "Indiquez la durée de contrat (en années) pour une offre tiers-investissement." };
    }
    return { ok: true, type_offre: typeOffre, duree_contrat_ans: duree };
  }

  return { ok: true, type_offre: typeOffre, duree_contrat_ans: duree };
}

export function typeOffreDetailLabel(typeOffre: TypeOffre, dureeContratAns: number | null): string {
  if (typeOffre === "tiers_investissement" && dureeContratAns != null) {
    return `${TYPE_OFFRE_LABELS[typeOffre]} · ${dureeContratAns} an${dureeContratAns > 1 ? "s" : ""}`;
  }
  return TYPE_OFFRE_LABELS[typeOffre];
}

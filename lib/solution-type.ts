import { isHuwartPartialComplianceLead } from "./huwart-law";
import type { MessageKey } from "./i18n/locales/fr";

export type TypeSolutionRecherchee =
  | "pv_pur"
  | "mixte_pv_vegetal"
  | "vegetalisation_uniquement";

export const TYPE_SOLUTION_RECHERCHEE_VALUES: TypeSolutionRecherchee[] = [
  "pv_pur",
  "mixte_pv_vegetal",
  "vegetalisation_uniquement",
];

export function parseTypeSolutionRecherchee(raw: unknown): TypeSolutionRecherchee | null {
  if (
    typeof raw === "string" &&
    TYPE_SOLUTION_RECHERCHEE_VALUES.includes(raw as TypeSolutionRecherchee)
  ) {
    return raw as TypeSolutionRecherchee;
  }
  return null;
}

export function solutionTypeLabelKey(type: TypeSolutionRecherchee): MessageKey {
  const map: Record<TypeSolutionRecherchee, MessageKey> = {
    pv_pur: "solutionType.pvPur",
    mixte_pv_vegetal: "solutionType.mixtePvVegetal",
    vegetalisation_uniquement: "solutionType.vegetalisationUniquement",
  };
  return map[type];
}

export function solutionTypeShortKey(type: TypeSolutionRecherchee): MessageKey {
  const map: Record<TypeSolutionRecherchee, MessageKey> = {
    pv_pur: "solutionType.pvPurShort",
    mixte_pv_vegetal: "solutionType.mixtePvVegetalShort",
    vegetalisation_uniquement: "solutionType.vegetalisationUniquementShort",
  };
  return map[type];
}

export type SolutionTypeLeadInput = {
  type_solution_recherchee?: TypeSolutionRecherchee | string | null;
  flag_urgence?: string | null;
  pv_overlap_pct?: number | null;
  vision_surface_couverte_pct?: number | null;
  vision_checked_at?: string | null;
  detection?: string | null;
};

/** Type effectif : colonne DB ou inférence Huwart pour les leads catalogue. */
export function resolveLeadSolutionType(lead: SolutionTypeLeadInput): TypeSolutionRecherchee {
  const stored = parseTypeSolutionRecherchee(lead.type_solution_recherchee);
  if (stored) return stored;
  if (isHuwartPartialComplianceLead(lead)) return "mixte_pv_vegetal";
  return "pv_pur";
}

export function resolveRfpSolutionType(
  type: TypeSolutionRecherchee | string | null | undefined,
): TypeSolutionRecherchee {
  return parseTypeSolutionRecherchee(type) ?? "pv_pur";
}

export function attractsLandscaper(type: TypeSolutionRecherchee): boolean {
  return type === "mixte_pv_vegetal" || type === "vegetalisation_uniquement";
}

export function attractsSolarInstaller(type: TypeSolutionRecherchee): boolean {
  return type === "pv_pur" || type === "mixte_pv_vegetal";
}

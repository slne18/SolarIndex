import type { RfpStatut } from "./rfp";

/** Statuts où le déposant peut corriger sa fiche (propriétaire / gérant). */
export const RFP_DEPOSANT_EDITABLE_STATUTS: RfpStatut[] = [
  "en_attente_verification",
  "en_attente_moderation",
  "publie",
];

export function isRfpDeposantEditableStatut(statut: RfpStatut): boolean {
  return RFP_DEPOSANT_EDITABLE_STATUTS.includes(statut);
}

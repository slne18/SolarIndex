import type { LeadRow } from "./types";

export type LeadSlotFields = Pick<LeadRow, "statut">;

/** Lead encore achetable dans le catalogue (hors retrait manuel / statuts hors vente). */
export function isLeadSlotOpen(lead: LeadSlotFields): boolean {
  return lead.statut === "disponible";
}

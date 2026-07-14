import type { LeadRow } from "@/lib/types";

/** Nombre maximum d'acheteurs par lead (modèle hybride, sans exclusivité). */
export const MAX_BUYERS_PER_LEAD = 3;

export type LeadSlotFields = Pick<LeadRow, "buyers_count" | "statut">;

export function isLeadSlotOpen(lead: LeadSlotFields): boolean {
  const count = lead.buyers_count ?? 0;
  return count < MAX_BUYERS_PER_LEAD && lead.statut !== "complet";
}

export function leadAvailabilityLabel(available: boolean): string {
  return available ? "Disponible" : "Indisponible";
}

export function buyersCountLabel(count: number): string {
  const n = Math.min(Math.max(0, count), MAX_BUYERS_PER_LEAD);
  return `${n}/${MAX_BUYERS_PER_LEAD} acheteurs`;
}

export function remainingSlots(count: number): number {
  return Math.max(0, MAX_BUYERS_PER_LEAD - (count ?? 0));
}

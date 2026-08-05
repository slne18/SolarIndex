export type SirenStabilityLead = {
  siren_date_creation?: string | null;
  siren_etat_administratif?: string | null;
  siren_anciennete_checked_at?: string | null;
};

export function sirenAncienneteAnnees(dateCreation: string | null | undefined): number | null {
  if (!dateCreation?.trim()) return null;
  const created = new Date(`${dateCreation.slice(0, 10)}T12:00:00Z`);
  if (Number.isNaN(created.getTime())) return null;
  const now = new Date();
  let years = now.getUTCFullYear() - created.getUTCFullYear();
  const monthDiff = now.getUTCMonth() - created.getUTCMonth();
  const dayDiff = now.getUTCDate() - created.getUTCDate();
  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) years -= 1;
  return Math.max(0, years);
}

export function isSirenEntrepriseActive(etat: string | null | undefined): boolean | null {
  if (!etat?.trim()) return null;
  const code = etat.trim().toUpperCase();
  if (code === "A") return true;
  if (code === "C") return false;
  return null;
}

export function hasSirenStabilityData(lead: SirenStabilityLead): boolean {
  return !!(lead.siren_anciennete_checked_at && lead.siren_date_creation);
}

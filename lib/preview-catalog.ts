import type { CatalogAccess } from "./catalog-access";

/** Consultation catalogue / fiche lead sans compte (achat = connexion requise). */
export const ANONYMOUS_CATALOG_ACCESS: CatalogAccess = {
  needsOnboarding: false,
  departementLock: null,
  sampleRemaining: 0,
  sampleDepartement: null,
  subscriptionActive: false,
};

export function catalogLeadsHref(): string {
  return "/leads";
}

export function catalogAuthHeaders(token: string | null | undefined): HeadersInit {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

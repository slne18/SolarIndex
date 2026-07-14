import { getSubscriptionQuota } from "./subscription";
import { getUserProfile } from "./profile";

export interface CatalogAccess {
  needsOnboarding: boolean;
  departementLock: string | null;
  sampleRemaining: number;
  sampleDepartement: string | null;
  subscriptionActive: boolean;
}

const NO_SAMPLE_ACCESS: CatalogAccess = {
  needsOnboarding: false,
  departementLock: null,
  sampleRemaining: 0,
  sampleDepartement: null,
  subscriptionActive: false,
};

/** Règles d'accès au catalogue (sans échantillon gratuit). */
export async function getCatalogAccess(userId: string): Promise<CatalogAccess> {
  const [profile, sub] = await Promise.all([
    getUserProfile(userId),
    getSubscriptionQuota(userId),
  ]);

  if (!profile) {
    return NO_SAMPLE_ACCESS;
  }

  return {
    ...NO_SAMPLE_ACCESS,
    subscriptionActive: sub.active,
  };
}

/** Vérifie qu'un lead disponible est visible pour cet utilisateur. */
export function canViewLeadDepartement(
  _access: CatalogAccess,
  _leadDepartement: string,
): boolean {
  return true;
}

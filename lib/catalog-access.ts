import { getSubscriptionQuota } from "./subscription";
import { getUserProfile } from "./profile";

export const SAMPLE_LEADS_QUOTA = 1;

export interface CatalogAccess {
  /** Doit choisir un département échantillon avant le catalogue. */
  needsOnboarding: boolean;
  /** Filtre forcé tant qu'il reste des crédits échantillon (sans abo). */
  departementLock: string | null;
  sampleRemaining: number;
  sampleDepartement: string | null;
  subscriptionActive: boolean;
}

/** Règles d'accès au catalogue selon profil + abonnement. */
export async function getCatalogAccess(userId: string): Promise<CatalogAccess> {
  const [profile, sub] = await Promise.all([
    getUserProfile(userId),
    getSubscriptionQuota(userId),
  ]);

  if (!profile) {
    return {
      needsOnboarding: true,
      departementLock: null,
      sampleRemaining: 0,
      sampleDepartement: null,
      subscriptionActive: false,
    };
  }

  const sampleRemaining = profile.sample_leads_remaining ?? 0;
  const sampleDepartement = profile.sample_departement;
  const subscriptionActive = sub.active;

  const needsOnboarding = !sampleDepartement && sampleRemaining > 0 && !subscriptionActive;

  const departementLock =
    !subscriptionActive && sampleRemaining > 0 && sampleDepartement
      ? sampleDepartement
      : null;

  return {
    needsOnboarding,
    departementLock,
    sampleRemaining,
    sampleDepartement,
    subscriptionActive,
  };
}

/** Vérifie qu'un lead disponible est visible pour cet utilisateur. */
export function canViewLeadDepartement(
  access: CatalogAccess,
  leadDepartement: string,
): boolean {
  if (access.departementLock) {
    return leadDepartement === access.departementLock;
  }
  return true;
}

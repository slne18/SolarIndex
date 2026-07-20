import { getAdminClient } from "./supabase";
import type { ProjetDelai, UserType } from "./profile-onboarding";

export interface UserProfile {
  id: string;
  email: string | null;
  entreprise: string | null;
  plan: string | null;
  abonnement_actif: boolean;
  leads_achetes: number;
  sample_leads_remaining: number;
  sample_departement: string | null;
  user_type: UserType | null;
  proprietaire_raison_sociale: string | null;
  proprietaire_nom: string | null;
  responsable_prenom: string | null;
  responsable_nom: string | null;
  telephone: string | null;
  telephone_bureau: string | null;
  adresse_parking: string | null;
  surface_m2_estimee: number | null;
  projet_delai: ProjetDelai | null;
  commentaire: string | null;
  profile_completed_at: string | null;
}

const PROFILE_SELECT =
  "id, email, entreprise, plan, abonnement_actif, leads_achetes, sample_leads_remaining, sample_departement, user_type, proprietaire_raison_sociale, proprietaire_nom, responsable_prenom, responsable_nom, telephone, telephone_bureau, adresse_parking, surface_m2_estimee, projet_delai, commentaire, profile_completed_at";

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await getAdminClient()
    .from("profiles")
    .select(PROFILE_SELECT)
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    ...data,
    sample_leads_remaining: data.sample_leads_remaining ?? 0,
  };
}

export function isProfileComplete(profile: Pick<UserProfile, "profile_completed_at">): boolean {
  return profile.profile_completed_at != null;
}

export async function setSampleDepartement(
  userId: string,
  departement: string,
): Promise<boolean> {
  const dept = departement.trim();
  if (!/^\d{2,3}$/.test(dept)) return false;

  const { data, error } = await getAdminClient()
    .from("profiles")
    .update({ sample_departement: dept })
    .eq("id", userId)
    .is("sample_departement", null)
    .select("id");
  if (error) throw error;
  return (data?.length ?? 0) > 0;
}

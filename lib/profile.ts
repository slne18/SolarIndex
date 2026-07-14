import { getAdminClient } from "./supabase";

export interface UserProfile {
  id: string;
  email: string | null;
  entreprise: string | null;
  plan: string | null;
  abonnement_actif: boolean;
  leads_achetes: number;
  sample_leads_remaining: number;
  sample_departement: string | null;
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await getAdminClient()
    .from("profiles")
    .select(
      "id, email, entreprise, plan, abonnement_actif, leads_achetes, sample_leads_remaining, sample_departement",
    )
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    ...data,
    sample_leads_remaining: data.sample_leads_remaining ?? 0,
  };
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

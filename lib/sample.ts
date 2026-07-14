import { getAdminClient } from "./supabase";
import { getUserProfile } from "./profile";
import { SAMPLE_LEADS_QUOTA } from "./catalog-access";

export interface SampleQuota {
  remaining: number;
  quota: number;
  departement: string | null;
  departementLocked: boolean;
}

export async function getSampleQuota(userId: string): Promise<SampleQuota> {
  const profile = await getUserProfile(userId);
  const remaining = profile?.sample_leads_remaining ?? 0;
  const departement = profile?.sample_departement ?? null;
  return {
    remaining,
    quota: SAMPLE_LEADS_QUOTA,
    departement,
    departementLocked: remaining > 0 && !!departement,
  };
}

export async function redeemSampleLead(params: {
  leadId: string;
  userId: string;
}): Promise<boolean> {
  const stripeRef = `sample-${params.userId}-${params.leadId}`;
  const { data, error } = await getAdminClient().rpc("fulfill_sample_lead", {
    p_lead_id: params.leadId,
    p_user_id: params.userId,
    p_stripe_ref: stripeRef,
  });
  if (error) throw error;
  return data === true;
}

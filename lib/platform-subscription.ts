import { getAdminClient } from "./supabase";

export type PlatformSubscriptionRow = {
  id: string;
  user_id: string;
  stripe_subscription_id: string;
  statut: string;
  periode_debut: string;
  periode_fin: string;
};

export type PlatformAccessStatus = {
  active: boolean;
  periodEnd: string | null;
  stripeSubscriptionId: string | null;
};

export async function getPlatformAccessStatus(userId: string): Promise<PlatformAccessStatus> {
  const now = new Date().toISOString();
  const { data, error } = await getAdminClient()
    .from("platform_subscriptions")
    .select("*")
    .eq("user_id", userId)
    .eq("statut", "active")
    .lte("periode_debut", now)
    .gt("periode_fin", now)
    .order("periode_debut", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  const row = data as PlatformSubscriptionRow | null;
  return {
    active: !!row,
    periodEnd: row?.periode_fin ?? null,
    stripeSubscriptionId: row?.stripe_subscription_id ?? null,
  };
}

export async function hasActivePlatformAccess(userId: string): Promise<boolean> {
  const status = await getPlatformAccessStatus(userId);
  return status.active;
}

export async function upsertPlatformSubscription(params: {
  userId: string;
  stripeSubscriptionId: string;
  periodStart: Date;
  periodEnd: Date;
}): Promise<void> {
  const supabase = getAdminClient();
  const { error } = await supabase.from("platform_subscriptions").upsert(
    {
      user_id: params.userId,
      stripe_subscription_id: params.stripeSubscriptionId,
      statut: "active",
      periode_debut: params.periodStart.toISOString(),
      periode_fin: params.periodEnd.toISOString(),
    },
    { onConflict: "stripe_subscription_id", ignoreDuplicates: false },
  );
  if (error) throw error;
}

export async function activatePlatformProfile(
  userId: string,
  stripeCustomerId?: string | null,
): Promise<void> {
  const supabase = getAdminClient();
  const { error } = await supabase.from("profiles").upsert(
    {
      id: userId,
      plan: "platform",
      abonnement_actif: true,
      ...(stripeCustomerId ? { stripe_customer_id: stripeCustomerId } : {}),
    },
    { onConflict: "id" },
  );
  if (error) throw error;
}

export async function deactivatePlatformProfile(userId: string): Promise<void> {
  const supabase = getAdminClient();
  await supabase
    .from("platform_subscriptions")
    .update({ statut: "cancelled" })
    .eq("user_id", userId)
    .eq("statut", "active");
  const { error } = await supabase
    .from("profiles")
    .update({ plan: "free", abonnement_actif: false })
    .eq("id", userId)
    .eq("plan", "platform");
  if (error) throw error;
}

export function platformLeadStripeRef(userId: string, leadId: string): string {
  return `platform-lead-${userId}-${leadId}`;
}

export function platformRfpStripeRef(userId: string, rfpId: string): string {
  return `platform-rfp-${userId}-${rfpId}`;
}

import { getAdminClient } from "./supabase";

export const TERRITOIRE_LEADS_QUOTA = 5;

/** Référence : 5 leads Premium au tarif unitaire. */
export const TERRITOIRE_PACK_REFERENCE_EUR = TERRITOIRE_LEADS_QUOTA * 150;

/** Prix pack TTC (achat unique). */
export const TERRITOIRE_PACK_EUR = 500;

/** Remise vs 5 × Premium à l'unité. */
export const TERRITOIRE_PACK_DISCOUNT_PCT = Math.round(
  (1 - TERRITOIRE_PACK_EUR / TERRITOIRE_PACK_REFERENCE_EUR) * 100,
);

/** @deprecated Utiliser TERRITOIRE_PACK_EUR — pack ponctuel, plus d'abonnement mensuel. */
export const TERRITOIRE_MONTHLY_EUR = TERRITOIRE_PACK_EUR;

export interface SubscriptionPeriod {
  id: string;
  user_id: string;
  stripe_subscription_id: string;
  quota_leads: number;
  leads_consommes: number;
  premium_urgence_consommes?: number;
  premium_conforme_consommes?: number;
  periode_debut: string;
  periode_fin: string;
  statut: string;
}

export interface SubscriptionQuota {
  active: boolean;
  plan: "territoire" | "free";
  periodId: string | null;
  quota: number;
  remaining: number;
  periodEnd: string | null;
}

/** Période de facturation active avec crédits restants. */
export async function getActiveSubscriptionPeriod(
  userId: string,
): Promise<SubscriptionPeriod | null> {
  const supabase = getAdminClient();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("subscription_periods")
    .select("*")
    .eq("user_id", userId)
    .eq("statut", "active")
    .lte("periode_debut", now)
    .gt("periode_fin", now)
    .order("periode_debut", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as SubscriptionPeriod) ?? null;
}

export async function getSubscriptionQuota(userId: string): Promise<SubscriptionQuota> {
  const supabase = getAdminClient();
  const now = new Date().toISOString();
  const { data: periods, error } = await supabase
    .from("subscription_periods")
    .select("*")
    .eq("user_id", userId)
    .eq("statut", "active")
    .lte("periode_debut", now)
    .gt("periode_fin", now)
    .order("periode_debut", { ascending: true });
  if (error) throw error;

  let totalRemaining = 0;
  let redeemPeriodId: string | null = null;
  let redeemPeriod: SubscriptionPeriod | null = null;
  let latestEnd: string | null = null;

  for (const p of (periods ?? []) as SubscriptionPeriod[]) {
    const rem = Math.max(0, p.quota_leads - p.leads_consommes);
    totalRemaining += rem;
    if (rem > 0 && !redeemPeriodId) {
      redeemPeriodId = p.id;
      redeemPeriod = p;
    }
    if (!latestEnd || p.periode_fin > latestEnd) latestEnd = p.periode_fin;
  }

  const hasCredits = totalRemaining > 0;

  return {
    active: hasCredits,
    plan: hasCredits ? "territoire" : "free",
    periodId: redeemPeriodId,
    quota: TERRITOIRE_LEADS_QUOTA,
    remaining: totalRemaining,
    periodEnd: latestEnd,
  };
}

export async function canRedeemSubscriptionLead(userId: string): Promise<boolean> {
  const q = await getSubscriptionQuota(userId);
  return q.active && q.remaining > 0;
}

/** Crée ou remplace la période courante (idempotent sur stripe_subscription_id + début). */
export async function upsertSubscriptionPeriod(params: {
  userId: string;
  stripeSubscriptionId: string;
  periodStart: Date;
  periodEnd: Date;
  quota?: number;
}): Promise<void> {
  const supabase = getAdminClient();
  const { error } = await supabase.from("subscription_periods").upsert(
    {
      user_id: params.userId,
      stripe_subscription_id: params.stripeSubscriptionId,
      quota_leads: params.quota ?? TERRITOIRE_LEADS_QUOTA,
      leads_consommes: 0,
      periode_debut: params.periodStart.toISOString(),
      periode_fin: params.periodEnd.toISOString(),
      statut: "active",
    },
    { onConflict: "stripe_subscription_id,periode_debut", ignoreDuplicates: false },
  );
  if (error) throw error;
}

export async function activateTerritoireProfile(
  userId: string,
  stripeCustomerId?: string | null,
): Promise<void> {
  const supabase = getAdminClient();
  const { error } = await supabase.from("profiles").upsert(
    {
      id: userId,
      plan: "territoire",
      abonnement_actif: true,
      ...(stripeCustomerId ? { stripe_customer_id: stripeCustomerId } : {}),
    },
    { onConflict: "id" },
  );
  if (error) throw error;
}

export async function deactivateTerritoireProfile(userId: string): Promise<void> {
  const supabase = getAdminClient();
  await supabase
    .from("subscription_periods")
    .update({ statut: "cancelled" })
    .eq("user_id", userId)
    .eq("statut", "active");
  const { error } = await supabase
    .from("profiles")
    .update({ plan: "free", abonnement_actif: false })
    .eq("id", userId);
  if (error) throw error;
}

/** Rédemption via RPC Postgres (atomique). */
export async function redeemSubscriptionLead(params: {
  leadId: string;
  userId: string;
  periodId: string;
}): Promise<boolean> {
  const stripeRef = `sub-${params.periodId}-${params.leadId}`;
  const { data, error } = await getAdminClient().rpc("fulfill_subscription_lead", {
    p_lead_id: params.leadId,
    p_user_id: params.userId,
    p_period_id: params.periodId,
    p_stripe_ref: stripeRef,
  });
  if (error) throw error;
  return data === true;
}

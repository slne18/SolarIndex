import { getAdminClient } from "./supabase";
import { getLeadById } from "./db";
import { getRfpById } from "./rfp-db";
import { sendLeadDeliveryEmail } from "./email";
import { sendRfpAccessDeliveryEmail } from "./email-rfp";
import type { ProfilAcheteur } from "./profil-acheteur";
import type { TypeOffre } from "./rfp-offer-type";

export type PurchaseType = "unit" | "subscription" | "sample" | "platform";

export interface FulfillLeadParams {
  leadId: string;
  userId: string;
  montantEur: number;
  stripeSessionId: string;
  stripePaymentId?: string | null;
  purchaseType?: PurchaseType;
}

/** Réserve un slot d'achat (max 3), enregistre l'achat, incrémente le profil, envoie l'email. Idempotent. */
export async function fulfillLeadPurchase(params: FulfillLeadParams): Promise<boolean> {
  const {
    leadId,
    userId,
    montantEur,
    stripeSessionId,
    stripePaymentId = null,
    purchaseType = "unit",
  } = params;

  const supabase = getAdminClient();

  const { data: slotOk, error: rpcErr } = await supabase.rpc("fulfill_lead_slot", {
    p_lead_id: leadId,
    p_user_id: userId,
    p_stripe_ref: stripeSessionId,
    p_montant_eur: montantEur,
    p_purchase_type: purchaseType,
  });
  if (rpcErr) throw rpcErr;

  if (!slotOk) {
    const { data: existing } = await supabase
      .from("purchases")
      .select("id")
      .eq("stripe_session_id", stripeSessionId)
      .eq("statut", "paid")
      .maybeSingle();
    return !!existing;
  }

  if (stripePaymentId) {
    await supabase
      .from("purchases")
      .update({ stripe_payment_id: stripePaymentId })
      .eq("stripe_session_id", stripeSessionId);
  }

  const { data: prof } = await supabase
    .from("profiles")
    .select("leads_achetes, email, profil_acheteur")
    .eq("id", userId)
    .maybeSingle();
  if (prof) {
    await supabase
      .from("profiles")
      .update({ leads_achetes: (prof.leads_achetes ?? 0) + 1 })
      .eq("id", userId);
  }

  const deliveredLead = await getLeadById(leadId);
  const to = prof?.email ?? undefined;
  if (deliveredLead && to) {
    await sendLeadDeliveryEmail(to, deliveredLead, {
      profilAcheteur: (prof?.profil_acheteur as ProfilAcheteur | null) ?? "installateur",
    });
  }

  return true;
}

export async function fulfillRfpPurchase(params: {
  rfpId: string;
  userId: string;
  montantEur: number;
  stripeSessionId: string;
  stripePaymentId?: string | null;
  typeOffre?: TypeOffre;
  dureeContratAns?: number | null;
}): Promise<boolean> {
  const supabase = getAdminClient();

  const { data: existing } = await supabase
    .from("rfp_purchases")
    .select("id")
    .eq("stripe_session_id", params.stripeSessionId)
    .maybeSingle();
  if (existing) return true;

  const { data: owned } = await supabase
    .from("rfp_purchases")
    .select("id")
    .eq("rfp_id", params.rfpId)
    .eq("user_id", params.userId)
    .maybeSingle();
  if (owned) return true;

  const { data: rfp } = await supabase
    .from("rfp_submissions")
    .select("acheteurs_count")
    .eq("id", params.rfpId)
    .eq("statut", "publie")
    .maybeSingle();
  if (!rfp) return false;

  const typeOffre = params.typeOffre ?? "devis_installation";
  const dureeContratAns =
    typeOffre === "tiers_investissement" ? (params.dureeContratAns ?? null) : null;

  const { error: insErr } = await supabase.from("rfp_purchases").insert({
    rfp_id: params.rfpId,
    user_id: params.userId,
    stripe_session_id: params.stripeSessionId,
    stripe_payment_id: params.stripePaymentId,
    montant_eur: params.montantEur,
    statut: "completed",
    type_offre: typeOffre,
    duree_contrat_ans: dureeContratAns,
  });
  if (insErr) throw insErr;

  await supabase
    .from("rfp_submissions")
    .update({ acheteurs_count: rfp.acheteurs_count + 1 })
    .eq("id", params.rfpId);

  const { data: prof } = await supabase
    .from("profiles")
    .select("email, profil_acheteur")
    .eq("id", params.userId)
    .maybeSingle();
  const delivered = await getRfpById(params.rfpId);
  const to = prof?.email ?? undefined;
  if (delivered && to) {
    await sendRfpAccessDeliveryEmail(to, delivered, {
      profilAcheteur: (prof?.profil_acheteur as ProfilAcheteur | null) ?? "installateur",
      typeOffre,
      dureeContratAns,
    });
  }

  return true;
}

/** Effets de bord post-rédemption abo (profil + email). RPC a déjà réservé le slot. */
export async function afterSubscriptionRedemption(
  leadId: string,
  userId: string,
): Promise<void> {
  const supabase = getAdminClient();
  const { data: prof } = await supabase
    .from("profiles")
    .select("leads_achetes, email, profil_acheteur")
    .eq("id", userId)
    .maybeSingle();
  if (prof) {
    await supabase
      .from("profiles")
      .update({ leads_achetes: (prof.leads_achetes ?? 0) + 1 })
      .eq("id", userId);
  }
  const deliveredLead = await getLeadById(leadId);
  const to = prof?.email ?? undefined;
  if (deliveredLead && to) {
    await sendLeadDeliveryEmail(to, deliveredLead, {
      profilAcheteur: (prof?.profil_acheteur as ProfilAcheteur | null) ?? "installateur",
    });
  }
}

/** Email + compteur profil après rédemption échantillon (RPC a déjà réservé le slot). */
export async function afterSampleRedemption(
  leadId: string,
  userId: string,
): Promise<void> {
  await afterSubscriptionRedemption(leadId, userId);
}

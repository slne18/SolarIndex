import { getBearerToken } from "@/lib/auth";
import { getAnonClient } from "@/lib/supabase";
import { getLeadById, userOwnsLead } from "@/lib/db";
import { afterSubscriptionRedemption } from "@/lib/fulfillment";
import { isLeadSellable } from "@/lib/leads";
import { isLeadSlotOpen } from "@/lib/lead-slots";
import { getStripe, isStripeConfigured, prixLeadCentimes } from "@/lib/stripe";
import { getSubscriptionQuota, redeemSubscriptionLead } from "@/lib/subscription";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const NO_STORE = { "Cache-Control": "no-store, max-age=0" } as const;

// POST /api/checkout  { leadId }
// Abonné Territoire avec quota → rédemption immédiate (sans Stripe).
// Sinon → Stripe Checkout Session (paiement unitaire).
export async function POST(req: Request) {
  let body: { leadId?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Corps JSON invalide." }, { status: 400, headers: NO_STORE });
  }
  const leadId = body.leadId;
  if (!leadId) {
    return Response.json({ error: "leadId requis." }, { status: 400, headers: NO_STORE });
  }

  const token = getBearerToken(req);
  if (!token) {
    return Response.json(
      { error: "Connexion requise pour acheter un lead." },
      { status: 401, headers: NO_STORE },
    );
  }
  const { data: userData, error: userErr } = await getAnonClient().auth.getUser(token);
  if (userErr || !userData?.user) {
    return Response.json(
      { error: "Session invalide ou expirée." },
      { status: 401, headers: NO_STORE },
    );
  }
  const user = userData.user;

  let lead;
  try {
    lead = await getLeadById(leadId);
  } catch (e) {
    return Response.json(
      { error: "Échec de lecture du lead.", details: String(e) },
      { status: 500, headers: NO_STORE },
    );
  }
  if (!lead) {
    return Response.json({ error: "Lead introuvable." }, { status: 404, headers: NO_STORE });
  }
  if (!isLeadSlotOpen(lead)) {
    return Response.json({ error: "Ce lead n'est plus disponible." }, { status: 409, headers: NO_STORE });
  }
  if (await userOwnsLead(leadId, user.id)) {
    return Response.json({ error: "Vous avez déjà acheté ce lead." }, { status: 409, headers: NO_STORE });
  }
  if (!isLeadSellable(lead)) {
    return Response.json(
      { error: "Ce lead n'est pas éligible à la vente." },
      { status: 409, headers: NO_STORE },
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_URL || "http://localhost:3000";

  // Crédit Pack Territoire (5 leads, achat unique).
  const quota = await getSubscriptionQuota(user.id);
  if (quota.active && quota.remaining > 0 && quota.periodId) {
    try {
      const ok = await redeemSubscriptionLead({
        leadId: lead.id,
        userId: user.id,
        periodId: quota.periodId,
      });
      if (!ok) {
        return Response.json(
          { error: "Impossible d'utiliser un crédit (lead déjà pris ou quota épuisé)." },
          { status: 409, headers: NO_STORE },
        );
      }
      await afterSubscriptionRedemption(lead.id, user.id);
      return Response.json(
        {
          redeemed: true,
          url: `${appUrl}/success?pack=1`,
          remaining: quota.remaining - 1,
        },
        { headers: NO_STORE },
      );
    } catch (e) {
      return Response.json(
        { error: "Échec de la rédemption pack.", details: String(e) },
        { status: 500, headers: NO_STORE },
      );
    }
  }

  if (!isStripeConfigured()) {
    return Response.json(
      { error: "Paiement non configuré (STRIPE_SECRET_KEY manquant)." },
      { status: 503, headers: NO_STORE },
    );
  }

  const montantCentimes = prixLeadCentimes(lead);

  try {
    const session = await getStripe().checkout.sessions.create({
      mode: "payment",
      customer_email: user.email ?? undefined,
      client_reference_id: user.id,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "eur",
            unit_amount: montantCentimes,
            product_data: {
              name: `Lead SolarIndex — ${lead.ville || "Parking"} (${lead.departement})`,
              description: `${Math.round(lead.surface_m2)} m² · ${lead.flag_urgence === "URGENCE_ABSOLUE" ? "Urgence absolue" : "À équiper"}`,
            },
          },
        },
      ],
      metadata: { leadId: lead.id, userId: user.id },
      success_url: `${appUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/leads/${lead.id}`,
    });
    return Response.json({ url: session.url }, { headers: NO_STORE });
  } catch (e) {
    return Response.json(
      { error: "Échec de création de la session de paiement.", details: String(e) },
      { status: 502, headers: NO_STORE },
    );
  }
}

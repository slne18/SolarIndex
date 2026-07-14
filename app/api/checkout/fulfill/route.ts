import { getBearerToken } from "@/lib/auth";
import { getAnonClient } from "@/lib/supabase";
import { fulfillLeadPurchase, fulfillRfpPurchase } from "@/lib/fulfillment";
import { getStripe, isStripeConfigured } from "@/lib/stripe";
import {
  handleTerritoirePackCheckoutCompleted,
} from "@/lib/stripe-subscription";
import type Stripe from "stripe";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const NO_STORE = { "Cache-Control": "no-store, max-age=0" } as const;

/** Secours si le webhook Stripe est en retard ou mal configuré. */
export async function POST(req: Request) {
  if (!isStripeConfigured()) {
    return Response.json({ error: "Stripe non configuré." }, { status: 503, headers: NO_STORE });
  }

  const token = getBearerToken(req);
  if (!token) {
    return Response.json({ error: "Connexion requise." }, { status: 401, headers: NO_STORE });
  }
  const { data: userData, error: userErr } = await getAnonClient().auth.getUser(token);
  if (userErr || !userData?.user) {
    return Response.json({ error: "Session invalide." }, { status: 401, headers: NO_STORE });
  }
  const user = userData.user;

  let body: { sessionId?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Corps JSON invalide." }, { status: 400, headers: NO_STORE });
  }
  const sessionId = body.sessionId?.trim();
  if (!sessionId) {
    return Response.json({ error: "sessionId requis." }, { status: 400, headers: NO_STORE });
  }

  let session: Stripe.Checkout.Session;
  try {
    session = await getStripe().checkout.sessions.retrieve(sessionId);
  } catch (e) {
    return Response.json(
      { error: "Session Stripe introuvable.", details: String(e) },
      { status: 404, headers: NO_STORE },
    );
  }

  if (session.payment_status !== "paid" && session.status !== "complete") {
    return Response.json({ error: "Paiement non finalisé." }, { status: 409, headers: NO_STORE });
  }

  const ownerId = session.metadata?.userId || session.client_reference_id || "";
  if (ownerId !== user.id) {
    return Response.json({ error: "Cette session ne vous appartient pas." }, { status: 403, headers: NO_STORE });
  }

  try {
    if (session.metadata?.plan === "territoire") {
      await handleTerritoirePackCheckoutCompleted(session);
      return Response.json({ fulfilled: true, kind: "pack" }, { headers: NO_STORE });
    }

    if (session.metadata?.product === "rfp") {
      const rfpId = session.metadata?.rfpId;
      if (!rfpId) {
        return Response.json({ error: "Métadonnées RFP manquantes." }, { status: 422, headers: NO_STORE });
      }
      const montantEur =
        session.amount_total != null ? Math.round(session.amount_total / 100) : 0;
      await fulfillRfpPurchase({
        rfpId,
        userId: user.id,
        montantEur,
        stripeSessionId: session.id,
        stripePaymentId:
          typeof session.payment_intent === "string" ? session.payment_intent : null,
      });
      return Response.json({ fulfilled: true, kind: "rfp", rfpId }, { headers: NO_STORE });
    }

    const leadId = session.metadata?.leadId;
    if (!leadId) {
      return Response.json({ error: "Métadonnées lead manquantes." }, { status: 422, headers: NO_STORE });
    }

    const montantEur =
      session.amount_total != null ? Math.round(session.amount_total / 100) : 0;
    await fulfillLeadPurchase({
      leadId,
      userId: user.id,
      montantEur,
      stripeSessionId: session.id,
      stripePaymentId:
        typeof session.payment_intent === "string" ? session.payment_intent : null,
      purchaseType: "unit",
    });

    return Response.json({ fulfilled: true, kind: "lead", leadId }, { headers: NO_STORE });
  } catch (e) {
    return Response.json(
      { error: "Échec livraison.", details: String(e) },
      { status: 500, headers: NO_STORE },
    );
  }
}

import type Stripe from "stripe";
import { getStripe, isStripeConfigured } from "@/lib/stripe";
import {
  handleInvoicePaid,
  handleSubscriptionCheckoutCompleted,
  handleSubscriptionDeleted,
  handleTerritoirePackCheckoutCompleted,
} from "@/lib/stripe-subscription";
import { fulfillLeadPurchase, fulfillRfpPurchase } from "@/lib/fulfillment";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// POST /api/webhooks/stripe
export async function POST(req: Request) {
  if (!isStripeConfigured()) {
    return new Response("Stripe non configuré.", { status: 503 });
  }
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!secret) {
    return new Response("STRIPE_WEBHOOK_SECRET manquant.", { status: 503 });
  }

  const sig = req.headers.get("stripe-signature");
  if (!sig) return new Response("Signature manquante.", { status: 400 });

  const raw = Buffer.from(await req.arrayBuffer()).toString("utf8");
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(raw, sig, secret);
  } catch (e) {
    return new Response(`Signature invalide: ${String(e)}`, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode === "subscription") {
          await handleSubscriptionCheckoutCompleted(session);
        } else if (session.metadata?.plan === "territoire") {
          await handleTerritoirePackCheckoutCompleted(session);
        } else if (session.metadata?.product === "rfp") {
          await fulfillRfpCheckout(session);
        } else {
          await fulfillUnitCheckout(session);
        }
        break;
      }
      case "invoice.paid":
        await handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      default:
        break;
    }
  } catch (e) {
    console.error("[webhook] échec:", event.type, e);
    return new Response("Erreur de traitement.", { status: 500 });
  }

  return Response.json({ received: true });
}

async function fulfillRfpCheckout(session: Stripe.Checkout.Session) {
  const rfpId = session.metadata?.rfpId;
  const userId = session.metadata?.userId || session.client_reference_id || undefined;
  if (!rfpId || !userId) {
    console.warn("[webhook] metadata rfpId/userId manquante, ignoré.");
    return;
  }
  const montantEur =
    session.amount_total != null ? Math.round(session.amount_total / 100) : 0;
  await fulfillRfpPurchase({
    rfpId,
    userId,
    montantEur,
    stripeSessionId: session.id,
    stripePaymentId:
      typeof session.payment_intent === "string" ? session.payment_intent : null,
  });
}

async function fulfillUnitCheckout(session: Stripe.Checkout.Session) {
  const leadId = session.metadata?.leadId;
  const userId = session.metadata?.userId || session.client_reference_id || undefined;
  if (!leadId || !userId) {
    console.warn("[webhook] metadata leadId/userId manquante, ignoré.");
    return;
  }

  const montantEur =
    session.amount_total != null ? Math.round(session.amount_total / 100) : 0;

  await fulfillLeadPurchase({
    leadId,
    userId,
    montantEur,
    stripeSessionId: session.id,
    stripePaymentId:
      typeof session.payment_intent === "string" ? session.payment_intent : null,
    purchaseType: "unit",
  });
}

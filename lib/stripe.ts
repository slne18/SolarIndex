import Stripe from "stripe";
import { prixLeadCentimesFromRow } from "./leads";
import { TERRITOIRE_PACK_EUR } from "./subscription";
import type { LeadRow } from "./types";

// Client Stripe paresseux : instancié au premier appel côté serveur uniquement.
let _stripe: Stripe | null = null;

export function isStripeConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}

export function getStripe(): Stripe {
  if (_stripe) return _stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY manquant : paiement non configuré.");
  }
  _stripe = new Stripe(key);
  return _stripe;
}

/** Prix Stripe (centimes) selon tier premium / standard. */
export function prixLeadCentimes(
  lead: Pick<LeadRow, "surface_m2" | "vision_checked_at" | "created_at">,
): number {
  return prixLeadCentimesFromRow(lead);
}

/** Line item Stripe Checkout pour le Pack Territoire (achat unique, 10 leads). */
export function territoirePackLineItem(): Stripe.Checkout.SessionCreateParams.LineItem {
  const priceId = process.env.STRIPE_TERRITOIRE_PACK_PRICE_ID;
  if (priceId) {
    return { price: priceId, quantity: 1 };
  }
  return {
    quantity: 1,
    price_data: {
      currency: "eur",
      unit_amount: TERRITOIRE_PACK_EUR * 100,
      product_data: {
        name: "Pack Territoire SolarIndex",
        description: "5 leads — achat unique, Standard ou Premium au choix",
      },
    },
  };
}

/** @deprecated Pack ponctuel — utiliser territoirePackLineItem. */
export function territoireSubscriptionLineItem(): Stripe.Checkout.SessionCreateParams.LineItem {
  return territoirePackLineItem();
}

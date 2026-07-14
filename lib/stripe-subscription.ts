import type Stripe from "stripe";
import { getStripe } from "./stripe";
import {
  activateTerritoireProfile,
  deactivateTerritoireProfile,
  TERRITOIRE_LEADS_QUOTA,
  upsertSubscriptionPeriod,
} from "./subscription";

const PACK_VALIDITY_YEARS = 10;

function periodFromSubscription(sub: Stripe.Subscription): {
  start: Date;
  end: Date;
} {
  const raw = sub as Stripe.Subscription & {
    current_period_start?: number;
    current_period_end?: number;
  };
  const startSec = raw.current_period_start ?? Math.floor(Date.now() / 1000);
  const endSec = raw.current_period_end ?? startSec + 30 * 86400;
  return {
    start: new Date(startSec * 1000),
    end: new Date(endSec * 1000),
  };
}

function subscriptionIdFromInvoice(invoice: Stripe.Invoice): string | null {
  const raw = invoice as Stripe.Invoice & {
    subscription?: string | { id: string } | null;
  };
  if (typeof raw.subscription === "string") return raw.subscription;
  return raw.subscription?.id ?? null;
}

function packPeriodEnd(start: Date): Date {
  const end = new Date(start);
  end.setFullYear(end.getFullYear() + PACK_VALIDITY_YEARS);
  return end;
}

/** Pack Territoire — paiement unique Stripe Checkout (10 crédits leads). */
export async function handleTerritoirePackCheckoutCompleted(
  session: Stripe.Checkout.Session,
): Promise<void> {
  const userId = session.metadata?.userId || session.client_reference_id;
  if (!userId || session.metadata?.plan !== "territoire") return;

  const customerId =
    typeof session.customer === "string"
      ? session.customer
      : session.customer?.id ?? null;

  const start = new Date();
  await activateTerritoireProfile(userId, customerId);
  await upsertSubscriptionPeriod({
    userId,
    stripeSubscriptionId: session.id,
    periodStart: start,
    periodEnd: packPeriodEnd(start),
    quota: TERRITOIRE_LEADS_QUOTA,
  });
}

/** Legacy — abonnement Stripe récurrent (anciens clients). */
export async function handleSubscriptionCheckoutCompleted(
  session: Stripe.Checkout.Session,
): Promise<void> {
  const userId = session.metadata?.userId || session.client_reference_id;
  const subId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id;
  if (!userId || !subId) return;

  const sub = await getStripe().subscriptions.retrieve(subId);
  const { start, end } = periodFromSubscription(sub);
  const customerId =
    typeof sub.customer === "string" ? sub.customer : sub.customer?.id ?? null;

  await activateTerritoireProfile(userId, customerId);
  await upsertSubscriptionPeriod({
    userId,
    stripeSubscriptionId: subId,
    periodStart: start,
    periodEnd: end,
    quota: TERRITOIRE_LEADS_QUOTA,
  });
}

export async function handleInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
  if (invoice.billing_reason !== "subscription_cycle") return;
  const subId = subscriptionIdFromInvoice(invoice);
  if (!subId) return;

  const sub = await getStripe().subscriptions.retrieve(subId);
  const userId = sub.metadata?.userId;
  if (!userId) return;

  const { start, end } = periodFromSubscription(sub);
  await upsertSubscriptionPeriod({
    userId,
    stripeSubscriptionId: subId,
    periodStart: start,
    periodEnd: end,
    quota: TERRITOIRE_LEADS_QUOTA,
  });
}

export async function handleSubscriptionDeleted(sub: Stripe.Subscription): Promise<void> {
  const userId = sub.metadata?.userId;
  if (!userId) return;
  await deactivateTerritoireProfile(userId);
}

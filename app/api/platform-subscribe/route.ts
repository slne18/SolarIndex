import { getBearerToken } from "@/lib/auth";
import { getUserProfile } from "@/lib/profile";
import { canPurchaseLeads } from "@/lib/profile-onboarding";
import { hasActivePlatformAccess } from "@/lib/platform-subscription";
import { getAnonClient } from "@/lib/supabase";
import {
  getStripe,
  isStripeConfigured,
  platformIntroCouponId,
  platformSubscriptionLineItem,
} from "@/lib/stripe";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const NO_STORE = { "Cache-Control": "no-store, max-age=0" } as const;

/** POST /api/platform-subscribe — Stripe Checkout abonnement Accès plateforme. */
export async function POST(req: Request) {
  const token = getBearerToken(req);
  if (!token) {
    return Response.json({ error: "Connexion requise." }, { status: 401, headers: NO_STORE });
  }
  const { data: userData, error: userErr } = await getAnonClient().auth.getUser(token);
  if (userErr || !userData?.user) {
    return Response.json({ error: "Session invalide." }, { status: 401, headers: NO_STORE });
  }
  const user = userData.user;

  const profile = await getUserProfile(user.id);
  if (!profile || !canPurchaseLeads(profile.user_type)) {
    return Response.json(
      { error: "L'abonnement Accès plateforme est réservé aux installateurs." },
      { status: 403, headers: NO_STORE },
    );
  }

  if (await hasActivePlatformAccess(user.id)) {
    return Response.json(
      { error: "Vous avez déjà un abonnement Accès plateforme actif." },
      { status: 409, headers: NO_STORE },
    );
  }

  if (!isStripeConfigured()) {
    return Response.json(
      { error: "Paiement non configuré (STRIPE_SECRET_KEY manquant)." },
      { status: 503, headers: NO_STORE },
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_URL || "http://localhost:3000";
  const introCoupon = platformIntroCouponId();

  try {
    const session = await getStripe().checkout.sessions.create({
      mode: "subscription",
      customer_email: user.email ?? undefined,
      client_reference_id: user.id,
      line_items: [platformSubscriptionLineItem()],
      ...(introCoupon ? { discounts: [{ coupon: introCoupon }] } : {}),
      metadata: { plan: "platform", userId: user.id },
      subscription_data: {
        metadata: { plan: "platform", userId: user.id },
      },
      success_url: `${appUrl}/success?platform=welcome`,
      cancel_url: `${appUrl}/#tarifs`,
    });
    return Response.json({ url: session.url }, { headers: NO_STORE });
  } catch (e) {
    return Response.json(
      { error: "Échec de création de l'abonnement.", details: String(e) },
      { status: 502, headers: NO_STORE },
    );
  }
}

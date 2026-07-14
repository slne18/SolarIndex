import { getBearerToken } from "@/lib/auth";
import { getAnonClient } from "@/lib/supabase";
import { getStripe, isStripeConfigured, territoirePackLineItem } from "@/lib/stripe";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const NO_STORE = { "Cache-Control": "no-store, max-age=0" } as const;

// POST /api/pack-territoire — Stripe Checkout Pack Territoire (500 €, 5 leads, achat unique).
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

  if (!isStripeConfigured()) {
    return Response.json(
      { error: "Paiement non configuré (STRIPE_SECRET_KEY manquant)." },
      { status: 503, headers: NO_STORE },
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_URL || "http://localhost:3000";

  try {
    const session = await getStripe().checkout.sessions.create({
      mode: "payment",
      customer_email: user.email ?? undefined,
      client_reference_id: user.id,
      line_items: [territoirePackLineItem()],
      metadata: { plan: "territoire", userId: user.id },
      success_url: `${appUrl}/success?pack=welcome`,
      cancel_url: `${appUrl}/pack-territoire`,
    });
    return Response.json({ url: session.url }, { headers: NO_STORE });
  } catch (e) {
    return Response.json(
      { error: "Échec de création du paiement.", details: String(e) },
      { status: 502, headers: NO_STORE },
    );
  }
}

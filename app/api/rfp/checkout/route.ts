import { getBearerToken } from "@/lib/auth";
import { getUserProfile } from "@/lib/profile";
import { canPurchaseRfpAccess } from "@/lib/profile-onboarding";
import { getAnonClient } from "@/lib/supabase";
import { getRfpById, userOwnsRfp } from "@/lib/rfp-db";
import { computeRfpAccessPrice } from "@/lib/rfp";
import { isRfpDeposant } from "@/lib/rfp-withdrawal";
import { getStripe, isStripeConfigured } from "@/lib/stripe";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const NO_STORE = { "Cache-Control": "no-store, max-age=0" } as const;

// POST /api/rfp/checkout { rfpId }
export async function POST(req: Request) {
  let body: { rfpId?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "JSON invalide." }, { status: 400, headers: NO_STORE });
  }
  const rfpId = body.rfpId;
  if (!rfpId) {
    return Response.json({ error: "rfpId requis." }, { status: 400, headers: NO_STORE });
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

  const profile = await getUserProfile(user.id);
  if (!profile || !canPurchaseRfpAccess(profile.user_type)) {
    return Response.json(
      {
        error:
          "L'achat d'accès aux appels d'offres est réservé aux installateurs. Déposez votre projet depuis Mon espace si vous êtes propriétaire ou gérant.",
      },
      { status: 403, headers: NO_STORE },
    );
  }

  const row = await getRfpById(rfpId);
  if (!row || row.statut !== "publie") {
    return Response.json({ error: "Appel d'offres indisponible." }, { status: 404, headers: NO_STORE });
  }
  if (isRfpDeposant(row, user.id, user.email ?? "")) {
    return Response.json(
      { error: "Vous ne pouvez pas acheter l'accès à votre propre dépôt." },
      { status: 403, headers: NO_STORE },
    );
  }
  if (await userOwnsRfp(rfpId, user.id)) {
    return Response.json({ error: "Accès déjà acheté." }, { status: 409, headers: NO_STORE });
  }
  if (!isStripeConfigured()) {
    return Response.json({ error: "Paiement non configuré." }, { status: 503, headers: NO_STORE });
  }

  const appUrl = process.env.NEXT_PUBLIC_URL || "http://localhost:3000";

  const prixAcces = computeRfpAccessPrice(row.surface_estimee_m2);

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
            unit_amount: prixAcces * 100,
            product_data: {
              name: `Accès appel d'offres — dép. ${row.departement ?? "?"}`,
              description: `Contact direct gérant · ${Math.round(Number(row.surface_estimee_m2) || 0)} m² estimés`,
            },
          },
        },
      ],
      metadata: { rfpId, userId: user.id, product: "rfp" },
      success_url: `${appUrl}/success?rfp=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/appels-offres/${rfpId}`,
    });
    return Response.json({ url: session.url }, { headers: NO_STORE });
  } catch (e) {
    return Response.json(
      { error: "Échec Stripe.", details: String(e) },
      { status: 502, headers: NO_STORE },
    );
  }
}

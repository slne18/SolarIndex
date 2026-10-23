import { getBearerToken } from "@/lib/auth";
import { getUserProfile } from "@/lib/profile";
import { canPurchaseRfpAccess } from "@/lib/profile-onboarding";
import { getAnonClient } from "@/lib/supabase";
import { getRfpById, userOwnsRfp } from "@/lib/rfp-db";
import { computeRfpAccessPrice } from "@/lib/rfp";
import { isRfpDeposant } from "@/lib/rfp-withdrawal";
import { validateRfpOfferInput } from "@/lib/rfp-offer-type";
import { fulfillRfpPurchase } from "@/lib/fulfillment";
import {
  hasActivePlatformAccess,
  platformRfpStripeRef,
} from "@/lib/platform-subscription";
import { getStripe, isStripeConfigured } from "@/lib/stripe";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const NO_STORE = { "Cache-Control": "no-store, max-age=0" } as const;

// POST /api/rfp/checkout { rfpId, type_offre?, duree_contrat_ans? }
export async function POST(req: Request) {
  let body: { rfpId?: string; type_offre?: string; duree_contrat_ans?: number | string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "JSON invalide." }, { status: 400, headers: NO_STORE });
  }
  const rfpId = body.rfpId;
  if (!rfpId) {
    return Response.json({ error: "rfpId requis." }, { status: 400, headers: NO_STORE });
  }

  const offer = validateRfpOfferInput({
    type_offre: body.type_offre ?? "devis_installation",
    duree_contrat_ans: body.duree_contrat_ans,
  });
  if (!offer.ok) {
    return Response.json({ error: offer.error }, { status: 400, headers: NO_STORE });
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

  if (row.ao_publie_officiellement && (await hasActivePlatformAccess(user.id))) {
    try {
      const ok = await fulfillRfpPurchase({
        rfpId,
        userId: user.id,
        montantEur: 0,
        stripeSessionId: platformRfpStripeRef(user.id, rfpId),
        typeOffre: offer.type_offre,
        dureeContratAns: offer.type_offre === "tiers_investissement" ? offer.duree_contrat_ans : null,
      });
      if (!ok) {
        return Response.json({ error: "Accès déjà acquis ou projet indisponible." }, { status: 409, headers: NO_STORE });
      }
      return Response.json(
        { redeemed: true, url: `${appUrl}/success?platform=rfp&rfp=${rfpId}` },
        { headers: NO_STORE },
      );
    } catch (e) {
      return Response.json(
        { error: "Échec du déblocage plateforme.", details: String(e) },
        { status: 500, headers: NO_STORE },
      );
    }
  }

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
      metadata: {
        rfpId,
        userId: user.id,
        product: "rfp",
        typeOffre: offer.type_offre,
        dureeContratAns:
          offer.duree_contrat_ans != null ? String(offer.duree_contrat_ans) : "",
      },
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

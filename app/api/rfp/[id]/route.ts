import { getBearerToken } from "@/lib/auth";
import { getUserProfile } from "@/lib/profile";
import { canDepositProject, canPurchaseRfpAccess } from "@/lib/profile-onboarding";
import { getAnonClient } from "@/lib/supabase";
import { getRfpById, userOwnsRfp } from "@/lib/rfp-db";
import { toOwnedRfp, toPublicRfp } from "@/lib/rfp";
import { isRfpDeposantEditableStatut } from "@/lib/rfp-deposant-edit";
import { patchRfpAsDeposant, type DeposantRfpUpdateBody } from "@/lib/rfp-deposant-patch";
import { isRfpDeposant, withdrawRfpSubmission } from "@/lib/rfp-withdrawal";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const NO_STORE = { "Cache-Control": "no-store, max-age=0" } as const;

// GET /api/rfp/[id]
export async function GET(
  req: Request,
  { params }: { params: { id: string } },
) {
  let row;
  try {
    row = await getRfpById(params.id);
  } catch (e) {
    return Response.json(
      { error: "Échec lecture.", details: String(e) },
      { status: 500, headers: NO_STORE },
    );
  }

  if (!row) {
    return Response.json({ error: "Appel d'offres introuvable." }, { status: 404, headers: NO_STORE });
  }

  const token = getBearerToken(req);
  let userId: string | null = null;
  let userEmail = "";
  if (token) {
    const { data } = await getAnonClient().auth.getUser(token);
    userId = data.user?.id ?? null;
    userEmail = data.user?.email ?? "";
  }

  const isDeposant = userId ? isRfpDeposant(row, userId, userEmail) : false;
  const isOwned = userId ? await userOwnsRfp(params.id, userId) : false;

  const buyerCanViewClosed = isOwned && row.statut === "ferme";
  const deposantCanView =
    isDeposant && isRfpDeposantEditableStatut(row.statut);
  if (row.statut !== "publie" && !deposantCanView && !buyerCanViewClosed) {
    return Response.json({ error: "Appel d'offres introuvable." }, { status: 404, headers: NO_STORE });
  }

  const profile = userId ? await getUserProfile(userId) : null;
  const showContacts = isOwned || isDeposant;
  const canPurchase =
    !!profile && canPurchaseRfpAccess(profile.user_type) && !isDeposant;
  const canEdit = isDeposant && isRfpDeposantEditableStatut(row.statut);

  return Response.json(
    {
      rfp: showContacts ? toOwnedRfp(row) : toPublicRfp(row),
      is_owned: isOwned,
      is_deposant: isDeposant,
      can_purchase: canPurchase,
      can_edit: canEdit,
    },
    { headers: NO_STORE },
  );
}

// PATCH /api/rfp/[id] — correction par le déposant (propriétaire / gérant)
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  const token = getBearerToken(req);
  if (!token) {
    return Response.json({ error: "Connexion requise." }, { status: 401, headers: NO_STORE });
  }

  const { data: userData, error: userErr } = await getAnonClient().auth.getUser(token);
  if (userErr || !userData?.user) {
    return Response.json({ error: "Session invalide." }, { status: 401, headers: NO_STORE });
  }

  const profile = await getUserProfile(userData.user.id);
  if (!profile || !canDepositProject(profile.user_type)) {
    return Response.json(
      {
        error:
          "La modification de projet est réservée aux propriétaires et gérants de parking.",
      },
      { status: 403, headers: NO_STORE },
    );
  }

  let body: DeposantRfpUpdateBody;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Corps JSON invalide." }, { status: 400, headers: NO_STORE });
  }

  try {
    const result = await patchRfpAsDeposant(
      params.id,
      userData.user.id,
      userData.user.email ?? "",
      body,
    );
    if (!result.ok) {
      return Response.json({ error: result.error }, { status: result.status, headers: NO_STORE });
    }
    return Response.json(
      {
        ok: true,
        message: "Projet mis à jour.",
        rfp: toOwnedRfp(result.row),
      },
      { headers: NO_STORE },
    );
  } catch (e) {
    return Response.json(
      { error: "Échec mise à jour.", details: String(e) },
      { status: 500, headers: NO_STORE },
    );
  }
}

// DELETE /api/rfp/[id] — retrait par le déposant
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } },
) {
  const token = getBearerToken(req);
  if (!token) {
    return Response.json({ error: "Connexion requise." }, { status: 401, headers: NO_STORE });
  }

  const { data: userData, error: userErr } = await getAnonClient().auth.getUser(token);
  if (userErr || !userData?.user) {
    return Response.json({ error: "Session invalide." }, { status: 401, headers: NO_STORE });
  }

  try {
    const row = await withdrawRfpSubmission(
      params.id,
      userData.user.id,
      userData.user.email ?? "",
    );
    return Response.json(
      {
        ok: true,
        message: "Annonce retirée du catalogue. Les installateurs ayant déjà acheté l'accès conservent les coordonnées transmises avant le retrait.",
        statut: row.statut,
      },
      { headers: NO_STORE },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const status = msg.includes("autorisé") || msg.includes("introuvable") || msg.includes("retiré")
      ? 403
      : 500;
    return Response.json({ error: msg }, { status, headers: NO_STORE });
  }
}

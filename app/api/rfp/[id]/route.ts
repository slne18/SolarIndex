import { getBearerToken } from "@/lib/auth";
import { getAnonClient } from "@/lib/supabase";
import { getRfpById, userOwnsRfp } from "@/lib/rfp-db";
import { toOwnedRfp, toPublicRfp } from "@/lib/rfp";
import { withdrawRfpSubmission } from "@/lib/rfp-withdrawal";

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

  if (!row || row.statut !== "publie") {
    return Response.json({ error: "Appel d'offres introuvable." }, { status: 404, headers: NO_STORE });
  }

  const token = getBearerToken(req);
  let userId: string | null = null;
  if (token) {
    const { data } = await getAnonClient().auth.getUser(token);
    userId = data.user?.id ?? null;
  }

  const isOwned = userId ? await userOwnsRfp(params.id, userId) : false;

  return Response.json(
    {
      rfp: isOwned ? toOwnedRfp(row) : toPublicRfp(row),
      is_owned: isOwned,
    },
    { headers: NO_STORE },
  );
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

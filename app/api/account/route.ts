import { getUserIdFromRequest } from "@/lib/auth";
import { deleteUserAccount } from "@/lib/account-deletion";
import { ACCOUNT_DELETE_CONFIRMATION } from "@/lib/account-constants";
import { getAnonClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const NO_STORE = { "Cache-Control": "no-store, max-age=0" } as const;

// DELETE /api/account  { confirmation: "SUPPRIMER MON COMPTE" }
export async function DELETE(req: Request) {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  if (!token) {
    return Response.json({ error: "Connexion requise." }, { status: 401, headers: NO_STORE });
  }

  const { data: userData, error: userErr } = await getAnonClient().auth.getUser(token);
  if (userErr || !userData?.user) {
    return Response.json({ error: "Session invalide." }, { status: 401, headers: NO_STORE });
  }

  let body: { confirmation?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Corps JSON invalide." }, { status: 400, headers: NO_STORE });
  }

  if (body.confirmation !== ACCOUNT_DELETE_CONFIRMATION) {
    return Response.json(
      {
        error: `Saisissez exactement « ${ACCOUNT_DELETE_CONFIRMATION} » pour confirmer.`,
      },
      { status: 400, headers: NO_STORE },
    );
  }

  const user = userData.user;

  try {
    await deleteUserAccount(user.id, user.email ?? "");
    return Response.json(
      { ok: true, message: "Compte supprimé. Vos dépôts publiés ont été retirés du catalogue." },
      { headers: NO_STORE },
    );
  } catch (e) {
    return Response.json(
      { error: "Impossible de supprimer le compte.", details: String(e) },
      { status: 500, headers: NO_STORE },
    );
  }
}

// GET /api/account — statut minimal (pour UI paramètres)
export async function GET(req: Request) {
  const userId = await getUserIdFromRequest(req);
  if (!userId) {
    return Response.json({ error: "Non connecté." }, { status: 401, headers: NO_STORE });
  }
  return Response.json({ ok: true }, { headers: NO_STORE });
}

import { getUserIdFromRequest } from "@/lib/auth";
import { getUserProfile } from "@/lib/profile";
import { listRfpResponsesForDeposant } from "@/lib/rfp-responses";
import { getAnonClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const NO_STORE = { "Cache-Control": "no-store, max-age=0" } as const;

/** GET /api/rfp/[id]/responses — liste des réponses pour le déposant du projet. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await getUserIdFromRequest(req);
  if (!userId) {
    return Response.json({ error: "Non connecté." }, { status: 401, headers: NO_STORE });
  }

  const profile = await getUserProfile(userId);
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  let email = profile?.email ?? "";
  if (!email && token) {
    const { data } = await getAnonClient().auth.getUser(token);
    email = data.user?.email ?? "";
  }

  try {
    const responses = await listRfpResponsesForDeposant(id, userId, email);
    if (responses === null) {
      return Response.json({ error: "Accès refusé." }, { status: 403, headers: NO_STORE });
    }
    return Response.json({ responses }, { headers: NO_STORE });
  } catch (e) {
    return Response.json(
      { error: "Impossible de charger les réponses.", details: String(e) },
      { status: 500, headers: NO_STORE },
    );
  }
}

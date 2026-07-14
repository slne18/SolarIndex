import { getBearerToken } from "@/lib/auth";
import { getAnonClient } from "@/lib/supabase";
import { getRfpById, userOwnsRfp } from "@/lib/rfp-db";
import { toOwnedRfp, toPublicRfp } from "@/lib/rfp";

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

import { getBearerToken } from "@/lib/auth";
import { getAnonClient } from "@/lib/supabase";
import { getSubscriptionQuota } from "@/lib/subscription";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const NO_STORE = { "Cache-Control": "no-store, max-age=0" } as const;

// GET /api/subscription — crédits Pack Territoire restants.
export async function GET(req: Request) {
  const token = getBearerToken(req);
  if (!token) {
    return Response.json({ error: "Non connecté." }, { status: 401, headers: NO_STORE });
  }
  const { data: userData, error: userErr } = await getAnonClient().auth.getUser(token);
  if (userErr || !userData?.user) {
    return Response.json({ error: "Session invalide." }, { status: 401, headers: NO_STORE });
  }

  try {
    const quota = await getSubscriptionQuota(userData.user.id);
    return Response.json(quota, { headers: NO_STORE });
  } catch (e) {
    return Response.json(
      { error: "Échec lecture crédits pack.", details: String(e) },
      { status: 500, headers: NO_STORE },
    );
  }
}

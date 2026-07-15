import { getBearerToken } from "@/lib/auth";
import { getAnonClient } from "@/lib/supabase";
import { getCatalogAccess } from "@/lib/catalog-access";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const NO_STORE = { "Cache-Control": "no-store, max-age=0" } as const;

// GET /api/sample — compat API (échantillon désactivé, quota toujours 0).
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
    const access = await getCatalogAccess(userData.user.id);
    return Response.json(
      {
        remaining: 0,
        quota: 0,
        departement: null,
        departementLocked: false,
        needsOnboarding: access.needsOnboarding,
        departementLock: access.departementLock,
        subscriptionActive: access.subscriptionActive,
      },
      { headers: NO_STORE },
    );
  } catch (e) {
    return Response.json(
      { error: "Échec lecture échantillon.", details: String(e) },
      { status: 500, headers: NO_STORE },
    );
  }
}

import { getBearerToken } from "@/lib/auth";
import { getAnonClient } from "@/lib/supabase";
import { setSampleDepartement } from "@/lib/profile";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const NO_STORE = { "Cache-Control": "no-store, max-age=0" } as const;

// POST /api/sample/department  { departement: "33" }
export async function POST(req: Request) {
  const token = getBearerToken(req);
  if (!token) {
    return Response.json({ error: "Non connecté." }, { status: 401, headers: NO_STORE });
  }
  const { data: userData, error: userErr } = await getAnonClient().auth.getUser(token);
  if (userErr || !userData?.user) {
    return Response.json({ error: "Session invalide." }, { status: 401, headers: NO_STORE });
  }

  let body: { departement?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Corps JSON invalide." }, { status: 400, headers: NO_STORE });
  }

  const departement = body.departement?.trim();
  if (!departement || !/^\d{2,3}$/.test(departement)) {
    return Response.json(
      { error: "Code département invalide (ex. 33, 75, 971)." },
      { status: 400, headers: NO_STORE },
    );
  }

  try {
    const ok = await setSampleDepartement(userData.user.id, departement);
    if (!ok) {
      return Response.json(
        { error: "Département déjà choisi ou profil introuvable." },
        { status: 409, headers: NO_STORE },
      );
    }
    return Response.json({ departement }, { headers: NO_STORE });
  } catch (e) {
    return Response.json(
      { error: "Échec enregistrement département.", details: String(e) },
      { status: 500, headers: NO_STORE },
    );
  }
}

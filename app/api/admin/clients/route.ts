import { requireAdmin } from "@/lib/admin-auth";
import { getAdminClientsByRegion } from "@/lib/admin-data";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  try {
    const regions = await getAdminClientsByRegion();
    return Response.json({ regions });
  } catch (e) {
    console.error("[admin/clients]", e);
    return Response.json({ error: "Erreur serveur admin." }, { status: 500 });
  }
}

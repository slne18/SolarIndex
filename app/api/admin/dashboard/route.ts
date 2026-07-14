import { requireAdmin } from "@/lib/admin-auth";
import { getAdminDashboard } from "@/lib/admin-data";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  try {
    const data = await getAdminDashboard();
    return Response.json(data);
  } catch (e) {
    console.error("[admin/dashboard]", e);
    return Response.json({ error: "Erreur serveur admin." }, { status: 500 });
  }
}

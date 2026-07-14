import { requireAdmin } from "@/lib/admin-auth";
import { parseAdminLeadQuery } from "@/lib/admin-client";
import { queryAdminLeads } from "@/lib/admin-data";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  try {
    const url = new URL(req.url);
    const opts = parseAdminLeadQuery(url);
    const { rows, count } = await queryAdminLeads(opts);
    return Response.json({
      leads: rows,
      total: count,
      page: opts.page ?? 0,
      pageSize: opts.pageSize ?? 50,
    });
  } catch (e) {
    console.error("[admin/leads]", e);
    return Response.json({ error: "Erreur serveur admin." }, { status: 500 });
  }
}

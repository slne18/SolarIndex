import { requireAdmin } from "@/lib/admin-auth";
import { leadsToCsv } from "@/lib/admin-csv";
import { parseAdminLeadQuery } from "@/lib/admin-client";
import { exportAdminLeads } from "@/lib/admin-data";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  try {
    const url = new URL(req.url);
    const opts = parseAdminLeadQuery(url);
    const rows = await exportAdminLeads(opts);
    const csv = leadsToCsv(rows);
    const stamp = new Date().toISOString().slice(0, 10);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="solarindex-leads-${stamp}.csv"`,
      },
    });
  } catch (e) {
    console.error("[admin/leads/export]", e);
    return Response.json({ error: "Export impossible." }, { status: 500 });
  }
}

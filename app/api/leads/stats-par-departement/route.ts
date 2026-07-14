import { getLeadStatsParDepartement } from "@/lib/departement-stats";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const NO_STORE = { "Cache-Control": "no-store, max-age=0" } as const;

// GET /api/leads/stats-par-departement
export async function GET() {
  try {
    const stats = await getLeadStatsParDepartement();
    return Response.json(stats, { headers: NO_STORE });
  } catch (e) {
    return Response.json(
      { error: "Échec agrégation départements.", details: String(e) },
      { status: 500, headers: NO_STORE },
    );
  }
}

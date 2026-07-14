import { getRfpStatsParDepartement } from "@/lib/departement-stats";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const NO_STORE = { "Cache-Control": "no-store, max-age=0" } as const;

// GET /api/rfp/stats-par-departement
export async function GET() {
  try {
    const stats = await getRfpStatsParDepartement();
    return Response.json(stats, { headers: NO_STORE });
  } catch (e) {
    console.warn("[GET /api/rfp/stats-par-departement]", e);
    return Response.json(
      { departements: [], max_total: 0 },
      { headers: NO_STORE },
    );
  }
}

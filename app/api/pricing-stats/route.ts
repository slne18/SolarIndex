import { getPricingStats } from "@/lib/pricing-stats";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const NO_STORE = { "Cache-Control": "no-store, max-age=0" } as const;

/** GET /api/pricing-stats — volumes catalogue pour affichage tarifs (% débloqués). */
export async function GET() {
  try {
    const stats = await getPricingStats();
    return Response.json(stats, { headers: NO_STORE });
  } catch (e) {
    console.error("[GET /api/pricing-stats]", e);
    return Response.json({ error: "Impossible de charger les statistiques tarifaires." }, { status: 500 });
  }
}

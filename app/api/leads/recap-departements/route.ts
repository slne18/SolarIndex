import { getLeadsRecapStats } from "@/lib/leads-recap-stats";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;

const NO_STORE = { "Cache-Control": "no-store, max-age=0" } as const;

export async function GET() {
  try {
    const data = await getLeadsRecapStats();
    return Response.json(data, { headers: NO_STORE });
  } catch (e) {
    console.error("[leads/recap-departements]", e);
    return Response.json({ error: "Stats indisponibles." }, { status: 503, headers: NO_STORE });
  }
}

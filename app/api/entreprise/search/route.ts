import { searchEntreprisesFr } from "@/lib/entreprise-search";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// GET /api/entreprise/search?q=carrefour
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q") ?? "";
  const results = await searchEntreprisesFr(q, 8);
  return Response.json({ results }, { headers: { "Cache-Control": "no-store" } });
}

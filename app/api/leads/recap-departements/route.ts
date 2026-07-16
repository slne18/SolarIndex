import { NextResponse } from "next/server";
import { getLeadsRecapStats } from "@/lib/leads-recap-stats";
import { cacheGet, cacheSet } from "@/lib/simple-cache";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const CACHE_KEY = "leads:recap-departements:v2";

export async function GET() {
  const cached = cacheGet<Awaited<ReturnType<typeof getLeadsRecapStats>>>(CACHE_KEY);
  if (cached) {
    return NextResponse.json(cached, {
      headers: { "Cache-Control": "public, max-age=3600, s-maxage=86400" },
    });
  }

  try {
    const data = await getLeadsRecapStats();
    cacheSet(CACHE_KEY, data, CACHE_TTL_MS);
    return NextResponse.json(data, {
      headers: { "Cache-Control": "public, max-age=3600, s-maxage=86400" },
    });
  } catch (e) {
    console.error("[leads/recap-departements]", e);
    return NextResponse.json({ error: "Stats indisponibles." }, { status: 503 });
  }
}

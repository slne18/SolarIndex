import { NextResponse } from "next/server";
import { cacheGet, cacheSet } from "@/lib/simple-cache";
import { getObservatoireStats } from "@/lib/observatoire-stats";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const CACHE_KEY = "observatoire:stats-departements";

export async function GET() {
  const cached = cacheGet<Awaited<ReturnType<typeof getObservatoireStats>>>(CACHE_KEY);
  if (cached) {
    return NextResponse.json(cached, {
      headers: { "Cache-Control": "public, max-age=3600, s-maxage=86400" },
    });
  }

  try {
    const data = await getObservatoireStats();
    cacheSet(CACHE_KEY, data, CACHE_TTL_MS);
    return NextResponse.json(data, {
      headers: { "Cache-Control": "public, max-age=3600, s-maxage=86400" },
    });
  } catch (e) {
    console.error("[observatoire]", e);
    return NextResponse.json({ error: "Stats indisponibles." }, { status: 503 });
  }
}

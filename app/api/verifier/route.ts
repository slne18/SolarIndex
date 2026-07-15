import { NextResponse } from "next/server";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";
import { runVerifier } from "@/lib/verifier/run";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const NO_STORE = { "Cache-Control": "no-store, max-age=0" } as const;
const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 60 * 60 * 1000;

export async function POST(req: Request) {
  const ip = clientIp(req);
  const rl = checkRateLimit(`verifier:${ip}`, RATE_LIMIT, RATE_WINDOW_MS);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Limite atteinte (20 vérifications/heure). Réessayez plus tard." },
      { status: 429, headers: { ...NO_STORE, "Retry-After": String(rl.retryAfterSec) } },
    );
  }

  let body: {
    lat?: number;
    lon?: number;
    label?: string;
    manualSurfaceM2?: number;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide." }, { status: 400, headers: NO_STORE });
  }

  const lat = Number(body.lat);
  const lon = Number(body.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return NextResponse.json(
      { error: "Coordonnées lat/lon requises." },
      { status: 400, headers: NO_STORE },
    );
  }
  if (lat < 41 || lat > 52 || lon < -5.5 || lon > 10) {
    return NextResponse.json(
      { error: "Adresse hors France métropolitaine." },
      { status: 400, headers: NO_STORE },
    );
  }

  try {
    const result = await runVerifier({
      lat,
      lon,
      label: body.label,
      manualSurfaceM2: body.manualSurfaceM2,
    });
    return NextResponse.json(result, { headers: NO_STORE });
  } catch (e) {
    console.error("[verifier]", e);
    return NextResponse.json(
      { error: "Vérification impossible pour le moment." },
      { status: 503, headers: NO_STORE },
    );
  }
}

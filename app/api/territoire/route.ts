import { NextResponse } from "next/server";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";
import {
  getTerritoireByDepartement,
  getTerritoireByRadius,
  type TerritoireRadiusKm,
} from "@/lib/territoire";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const NO_STORE = { "Cache-Control": "no-store, max-age=0" } as const;

export async function GET(req: Request) {
  const ip = clientIp(req);
  const rl = checkRateLimit(`territoire:${ip}`, 30, 60 * 60 * 1000);
  if (!rl.ok) {
    return NextResponse.json({ error: "Trop de requêtes." }, { status: 429, headers: NO_STORE });
  }

  const sp = new URL(req.url).searchParams;
  const departement = sp.get("departement")?.trim();

  try {
    if (departement) {
      const summary = await getTerritoireByDepartement(departement);
      return NextResponse.json(summary, { headers: NO_STORE });
    }

    const lat = Number(sp.get("lat"));
    const lon = Number(sp.get("lon"));
    const radiusKm = Number(sp.get("radiusKm") || 50) as TerritoireRadiusKm;
    const label = sp.get("label")?.trim() || "Votre zone";

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return NextResponse.json(
        { error: "lat/lon ou departement requis." },
        { status: 400, headers: NO_STORE },
      );
    }
    if (![25, 50, 100].includes(radiusKm)) {
      return NextResponse.json({ error: "Rayon invalide." }, { status: 400, headers: NO_STORE });
    }

    const summary = await getTerritoireByRadius(lat, lon, radiusKm, label);
    return NextResponse.json(summary, { headers: NO_STORE });
  } catch (e) {
    console.error("[territoire]", e);
    return NextResponse.json({ error: "Calcul impossible." }, { status: 503, headers: NO_STORE });
  }
}

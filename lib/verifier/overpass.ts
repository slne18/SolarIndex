import { cacheGet, cacheSet } from "@/lib/simple-cache";
import { centroidFromCoords, geodesicAreaM2, haversineKm } from "./geo";

const OVERPASS_MIRRORS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
] as const;

const CACHE_TTL_MS = 7 * 60 * 1000;

type OsmNode = { lat: number; lon: number };
type OsmElement = {
  type: "way" | "relation";
  id: number;
  geometry?: OsmNode[];
  members?: Array<{ role?: string; geometry?: OsmNode[] }>;
};

function extractCoords(element: OsmElement): Array<[number, number]> {
  if (element.type === "way") {
    return (element.geometry ?? []).map((n) => [n.lon, n.lat] as [number, number]);
  }
  for (const member of element.members ?? []) {
    if (member.role === "outer" && member.geometry?.length) {
      return member.geometry.map((n) => [n.lon, n.lat] as [number, number]);
    }
  }
  return [];
}

function buildParkingQuery(lat: number, lon: number, radiusM = 150): string {
  return `
[out:json][timeout:25];
(
  way["amenity"="parking"](around:${radiusM},${lat},${lon});
  relation["amenity"="parking"](around:${radiusM},${lat},${lon});
);
out geom;
`.trim();
}

async function fetchOverpass(query: string): Promise<OsmElement[]> {
  let lastError = "Overpass indisponible";
  for (const mirror of OVERPASS_MIRRORS) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 12_000);
      const res = await fetch(mirror, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ data: query }),
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (res.status === 429 || res.status >= 502) {
        lastError = `${res.status} sur ${mirror}`;
        continue;
      }
      if (!res.ok) {
        lastError = `${res.status} sur ${mirror}`;
        continue;
      }
      const data = (await res.json()) as { elements?: OsmElement[] };
      return data.elements ?? [];
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
    }
  }
  throw new Error(lastError);
}

export type ParkingDetection = {
  surfaceM2: number;
  source: "osm_parking";
  osmId: number;
  osmType: string;
  distanceM: number;
};

export async function detectParkingNearPoint(
  lat: number,
  lon: number,
): Promise<ParkingDetection | null> {
  const cacheKey = `overpass:${lat.toFixed(4)}:${lon.toFixed(4)}`;
  const cached = cacheGet<ParkingDetection | null>(cacheKey);
  if (cached !== undefined) return cached;

  const elements = await fetchOverpass(buildParkingQuery(lat, lon));
  let best: ParkingDetection | null = null;

  for (const el of elements) {
    const coords = extractCoords(el);
    if (coords.length < 3) continue;
    const area = geodesicAreaM2(coords);
    if (area <= 0) continue;
    const c = centroidFromCoords(coords);
    const distanceM = haversineKm(lat, lon, c.lat, c.lon) * 1000;
    if (!best || distanceM < best.distanceM) {
      best = {
        surfaceM2: Math.round(area * 10) / 10,
        source: "osm_parking",
        osmId: el.id,
        osmType: el.type,
        distanceM: Math.round(distanceM),
      };
    }
  }

  cacheSet(cacheKey, best, CACHE_TTL_MS);
  return best;
}

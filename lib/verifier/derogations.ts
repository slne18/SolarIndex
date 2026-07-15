import { PENTE_DEROGATION_PCT } from "@/lib/aper-deadlines";

const ELEVATION_GEOPF =
  "https://data.geopf.fr/altimetrie/1.0/calcul/alti/rest/elevation.json";
const WFS_GEOPF = "https://data.geopf.fr/wfs/ows";
const SUP_TYPENAME = "wfs_sup:assiette_sup_s";

export async function fetchPentePct(
  lat: number,
  lon: number,
  surfaceM2: number,
): Promise<number | null> {
  if (surfaceM2 <= 0) return null;
  const rayonM = Math.sqrt(surfaceM2 / Math.PI);
  const dLat = rayonM / 111_000;
  const dLon = rayonM / (111_000 * Math.cos((lat * Math.PI) / 180));
  const coins: Array<[number, number]> = [
    [lat - dLat, lon - dLon],
    [lat - dLat, lon + dLon],
    [lat + dLat, lon - dLon],
    [lat + dLat, lon + dLon],
  ];
  const params = new URLSearchParams({
    lon: coins.map((c) => c[1].toFixed(6)).join("|"),
    lat: coins.map((c) => c[0].toFixed(6)).join("|"),
    resource: "ign_rge_alti_wld",
    delimiter: "|",
    zonly: "true",
  });
  const res = await fetch(`${ELEVATION_GEOPF}?${params}`, { next: { revalidate: 0 } });
  if (!res.ok) return null;
  const data = (await res.json()) as { elevations?: unknown[] };
  const alts = (data.elevations ?? []).filter(
    (a): a is number => typeof a === "number" && a > -9000,
  );
  if (alts.length < 2) return null;
  const diagonale = Math.sqrt((2 * rayonM) ** 2 + (2 * rayonM) ** 2);
  if (diagonale <= 0) return null;
  const pente = Math.round(((Math.max(...alts) - Math.min(...alts)) / diagonale) * 1000) / 10;
  return pente <= 100 ? pente : null;
}

export async function fetchZoneAbf(lat: number, lon: number): Promise<boolean> {
  const d = 0.00012;
  const bbox = `${lat - d},${lon - d},${lat + d},${lon + d},urn:ogc:def:crs:EPSG::4326`;
  const params = new URLSearchParams({
    SERVICE: "WFS",
    VERSION: "2.0.0",
    REQUEST: "GetFeature",
    TYPENAMES: SUP_TYPENAME,
    OUTPUTFORMAT: "application/json",
    SRSNAME: "urn:ogc:def:crs:EPSG::4326",
    BBOX: bbox,
    COUNT: "50",
  });
  try {
    const res = await fetch(`${WFS_GEOPF}?${params}`, { next: { revalidate: 0 } });
    if (!res.ok) return false;
    const data = (await res.json()) as {
      features?: Array<{ properties?: { suptype?: string } }>;
    };
    return (data.features ?? []).some((f) => {
      const sup = String(f.properties?.suptype ?? "").toLowerCase();
      return sup === "ac1" || sup === "ac2";
    });
  } catch {
    return false;
  }
}

export { PENTE_DEROGATION_PCT };

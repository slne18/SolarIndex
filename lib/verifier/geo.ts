/** Projection WGS84 → Lambert-93 (EPSG:2154), formules IGN. */
function wgs84ToLambert93(lat: number, lon: number): [number, number] {
  const e = 0.0818191910428158;
  const n = 0.725607765;
  const C = 11754255.426;
  const xs = 700000;
  const ys = 12655612.05;
  const latRad = (lat * Math.PI) / 180;
  const lonRad = ((lon - 3) * Math.PI) / 180;
  const latIso =
    Math.log(
      Math.tan(Math.PI / 4 + latRad / 2) *
        Math.pow((1 - e * Math.sin(latRad)) / (1 + e * Math.sin(latRad)), e / 2),
    );
  const R = C * Math.exp(-n * latIso);
  return [xs + R * Math.sin(n * lonRad), ys - R * Math.cos(n * lonRad)];
}

/** Surface réelle en m² (polygone lon/lat WGS84). */
export function geodesicAreaM2(coords: Array<[number, number]>): number {
  if (coords.length < 3) return 0;
  const projected = coords.map(([lon, lat]) => wgs84ToLambert93(lat, lon));
  let area = 0;
  for (let i = 0; i < projected.length; i++) {
    const [x1, y1] = projected[i]!;
    const [x2, y2] = projected[(i + 1) % projected.length]!;
    area += x1 * y2 - x2 * y1;
  }
  return Math.abs(area / 2);
}

export function centroidFromCoords(coords: Array<[number, number]>): { lat: number; lon: number } {
  if (coords.length === 0) return { lat: 0, lon: 0 };
  let sx = 0;
  let sy = 0;
  for (const [lon, lat] of coords) {
    sx += lon;
    sy += lat;
  }
  return { lat: sy / coords.length, lon: sx / coords.length };
}

export function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function bboxAroundPoint(lat: number, lon: number, radiusM: number) {
  const dLat = radiusM / 111_000;
  const dLon = radiusM / (111_000 * Math.cos((lat * Math.PI) / 180));
  return { minLat: lat - dLat, maxLat: lat + dLat, minLon: lon - dLon, maxLon: lon + dLon };
}

/** Bornes approximatives France métropolitaine (aligné POST /api/verifier). */
export function isMetropolitanFrancePoint(lat: number, lon: number): boolean {
  return lat >= 41 && lat <= 52 && lon >= -5.5 && lon <= 10;
}

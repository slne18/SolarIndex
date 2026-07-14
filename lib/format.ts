// Formatage homogène en français (espaces de milliers).

export function nf(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  return Math.round(n).toLocaleString("fr-FR");
}

export function euros(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  return `${Math.round(n).toLocaleString("fr-FR")} €`;
}

// Grands montants : 2,69 M€ pour la lisibilité.
export function eurosCompact(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toLocaleString("fr-FR", { maximumFractionDigits: 2 })} M€`;
  if (n >= 1_000) return `${(n / 1_000).toLocaleString("fr-FR", { maximumFractionDigits: 0 })} k€`;
  return `${Math.round(n)} €`;
}

export function flagLabel(flag: string): { label: string; urgence: boolean } {
  const urgence = flag === "URGENCE_ABSOLUE";
  return { label: urgence ? "Urgence absolue" : "À équiper", urgence };
}

export function scoreLabel(score: number | null | undefined): string {
  const s = score ?? 0;
  if (s >= 0.8) return "Élevé";
  if (s >= 0.5) return "Moyen";
  return "À vérifier";
}

export function formatCoords(
  lat: number | null | undefined,
  lng: number | null | undefined,
): string | null {
  if (lat == null || lng == null || Number.isNaN(lat) || Number.isNaN(lng)) return null;
  if (lat === 0 && lng === 0) return null;
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

export function openStreetMapUrl(lat: number, lng: number, zoom = 17): string {
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=${zoom}/${lat}/${lng}`;
}

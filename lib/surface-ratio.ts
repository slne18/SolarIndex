/** Bande cadastre/OSM acceptée pour retenir la contenance IGN (aligné pipeline). */
export const SURFACE_RATIO_MIN = 0.3;
export const SURFACE_RATIO_MAX = 1.5;

export function resolveSurface(
  surfaceOsm: number,
  surfaceCadastrale: number | null | undefined,
): { surface: number; source: "cadastre" | "osm_fallback" } {
  const osm = Number(surfaceOsm) || 0;
  const cad =
    surfaceCadastrale != null && !Number.isNaN(Number(surfaceCadastrale))
      ? Number(surfaceCadastrale)
      : null;
  if (!cad || cad <= 0) {
    return { surface: osm, source: "osm_fallback" };
  }
  const ratio = osm > 0 ? cad / osm : 1;
  if (ratio > SURFACE_RATIO_MAX || ratio < SURFACE_RATIO_MIN) {
    return { surface: osm, source: "osm_fallback" };
  }
  return { surface: Math.round(cad * 10) / 10, source: "cadastre" };
}

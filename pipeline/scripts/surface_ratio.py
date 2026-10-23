"""Logique surface cadastre/OSM — alignée solarindex_pipeline.resolve_surface."""
from __future__ import annotations

SURFACE_RATIO_MIN = 0.3
SURFACE_RATIO_MAX = 1.5


def resolve_surface(
    surface_osm: float,
    surface_cadastrale: float | None,
) -> tuple[float, str]:
    if surface_cadastrale is None or surface_cadastrale <= 0:
        return surface_osm, "osm_fallback"
    ratio = surface_cadastrale / surface_osm if surface_osm > 0 else 1.0
    if ratio > SURFACE_RATIO_MAX or ratio < SURFACE_RATIO_MIN:
        return surface_osm, "osm_fallback"
    return round(surface_cadastrale, 1), "cadastre"

"""Seuils surface APER — alignés lib/surface-thresholds.ts"""
from __future__ import annotations

SURFACE_APER_MIN_M2 = 1_500
SURFACE_GRAY_LOW_MIN_M2 = 1_500
SURFACE_GRAY_LOW_MAX_M2 = 1_600
SURFACE_URGENCE_M2 = 10_000
SURFACE_URGENCE_CONFIRM_M2 = 11_000


def is_in_gray_low_band(surface_m2: float) -> bool:
    return SURFACE_GRAY_LOW_MIN_M2 <= surface_m2 <= SURFACE_GRAY_LOW_MAX_M2


def is_surface_sellable(surface_m2: float) -> bool:
    return not is_in_gray_low_band(surface_m2) and surface_m2 > SURFACE_GRAY_LOW_MAX_M2


def compute_flag_urgence(surface_m2: float) -> str:
    if surface_m2 > SURFACE_URGENCE_CONFIRM_M2:
        return "URGENCE_ABSOLUE"
    return "CONFORME_REQUIS"

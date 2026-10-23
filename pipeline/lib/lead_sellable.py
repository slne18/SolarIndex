"""Critères lead vendable — alignés lib/leads.ts et lib/db.ts applyCatalogFilters."""
from __future__ import annotations

import math
from typing import Any, Mapping

from lib.surface_thresholds import is_surface_sellable

VISION_COVERAGE_EQUIPE = 45


MAX_BUYERS_PER_LEAD = 3


def catalog_rest_filters() -> dict[str, str]:
    """Filtres PostgREST catalogue vendable (alignés lib/db.ts + catalog-stats)."""
    return {
        **sellable_rest_filters(),
        "statut": "eq.disponible",
        "buyers_count": f"lt.{MAX_BUYERS_PER_LEAD}",
    }


def is_vision_equipped_pct(pct: float | None) -> bool:
    if pct is None:
        return False
    try:
        value = float(pct)
    except (TypeError, ValueError):
        return False
    return not math.isnan(value) and value > VISION_COVERAGE_EQUIPE


def is_lead_sellable(lead: Mapping[str, Any]) -> bool:
    if lead.get("detection") == "equipe":
        return False
    if is_vision_equipped_pct(lead.get("vision_surface_couverte_pct")):
        return False
    if not str(lead.get("adresse") or "").strip():
        return False
    if not str(lead.get("siren") or "").strip() or not str(lead.get("id_parcelle") or "").strip():
        return False
    try:
        surface_m2 = float(lead.get("surface_m2") or 0)
    except (TypeError, ValueError):
        surface_m2 = 0.0
    return is_surface_sellable(surface_m2)


def sellable_rest_filters() -> dict[str, str]:
    """Filtres PostgREST pour les leads vendables (hors statut / slots catalogue)."""
    return {
        "detection": "neq.equipe",
        "siren": "not.is.null",
        "id_parcelle": "not.is.null",
        "and": "(adresse.not.is.null,adresse.neq.)",
        "surface_m2": "gt.1600",
        "or": (
            f"(vision_surface_couverte_pct.is.null,"
            f"vision_surface_couverte_pct.lte.{VISION_COVERAGE_EQUIPE})"
        ),
    }

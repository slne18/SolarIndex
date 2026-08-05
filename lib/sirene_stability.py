"""
Stabilité exploitant via API Recherche d'entreprises (date création, état administratif).
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from lib.company_enrichment import fetch_company_by_siren

_VALID_ETATS = frozenset({"A", "C"})


def extract_siren_stability(company: dict[str, Any] | None) -> dict[str, str | None]:
    if not company:
        return {"siren_date_creation": None, "siren_etat_administratif": None}

    raw_date = company.get("date_creation")
    date_creation: str | None = None
    if isinstance(raw_date, str) and raw_date.strip():
        date_creation = raw_date.strip()[:10]

    etat = company.get("etat_administratif")
    etat_administratif: str | None = None
    if isinstance(etat, str) and etat.strip().upper() in _VALID_ETATS:
        etat_administratif = etat.strip().upper()

    return {
        "siren_date_creation": date_creation,
        "siren_etat_administratif": etat_administratif,
    }


def fetch_siren_stability(
    siren: str | None,
    cache: dict[str, dict] | None = None,
) -> dict[str, str | None]:
    company = fetch_company_by_siren(siren, cache=cache)
    return extract_siren_stability(company)


def stability_patch_payload(
    siren: str | None,
    cache: dict[str, dict] | None = None,
) -> dict[str, str | None]:
    """Payload Supabase incluant horodatage de vérification."""
    data = fetch_siren_stability(siren, cache=cache)
    data["siren_anciennete_checked_at"] = datetime.now(timezone.utc).isoformat()
    return data

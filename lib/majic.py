"""
Jointure propriétaire foncier via MAJIC DGFiP (open data, zéro API payante).

Source : parcelles_personnes_morales_latest.parquet
https://www.data.gouv.fr/datasets/fichiers-des-locaux-et-des-parcelles-des-personnes-morales-version-unifiee
"""
from __future__ import annotations

import re
from typing import Any

MAJIC_PARQUET_URL = (
    "https://static.data.gouv.fr/resources/fichiers-des-locaux-et-des-parcelles-"
    "des-personnes-morales-version-unifiee/20251103-131324/"
    "parcelles-personnes-morales-latest.parquet"
)

_PUBLIC_DENOM_RE = re.compile(
    r"\b(COMMUNE|ETAT|DEPARTEMENT|REGION|SYNDICAT|MINISTERE|COMMUNAUTE)\b",
    re.I,
)


def build_id_parcelle(
    code_insee: str | None,
    prefixe: str | None,
    section: str | None,
    numero_parcelle: int | str | None,
) -> str:
    """
    Construit l'IDU cadastral (aligné IGN apicarto / leads.id_parcelle).

    Format : {code_insee 5}{prefixe 3}{section 2}{numéro 4}
    Ex. 33063 + 000 + TS + 0013 → 33063000TS0013
    """
    insee = str(code_insee or "").strip()
    pref = str(prefixe or "").strip()
    if not pref or pref.upper() in ("Z", "ZZ", "NONE", "NAN"):
        pref = "000"
    else:
        pref = pref.zfill(3)[-3:]

    sec = str(section or "").strip().upper()
    if len(sec) == 1:
        sec = sec.rjust(2, " ")
    elif len(sec) > 2:
        sec = sec[:2]

    try:
        num = str(int(numero_parcelle)).zfill(4)
    except (TypeError, ValueError):
        num = "0000"

    return f"{insee}{pref}{sec}{num}"


def normalize_siren(raw: str | None) -> str | None:
    s = re.sub(r"\s+", "", str(raw or "").strip())
    if not s:
        return None
    if len(s) == 9 and s.isalnum():
        return s.upper()
    return None


def owner_priority(row: dict[str, Any]) -> int:
    """Score de priorité quand plusieurs PM sur une même parcelle."""
    siren = normalize_siren(row.get("siren") or row.get("numero_siren")) or ""
    denom = str(row.get("denomination") or "").upper()
    score = 0
    if siren and not siren.startswith("U"):
        score += 20
    if siren.startswith("U"):
        score -= 15
    if _PUBLIC_DENOM_RE.search(denom):
        score -= 10
    if "SAS" in denom or "SARL" in denom or "SCI" in denom:
        score += 3
    return score


def pick_best_owner(rows: list[dict[str, Any]]) -> dict[str, Any] | None:
    if not rows:
        return None
    return max(rows, key=owner_priority)


def row_to_majic_record(row: dict[str, Any]) -> dict[str, Any] | None:
    """Convertit une ligne parquet MAJIC → enregistrement majic_proprietaires."""
    id_parcelle = row.get("id_parcelle") or build_id_parcelle(
        row.get("code_insee"),
        row.get("prefixe"),
        row.get("section"),
        row.get("numero_parcelle"),
    )
    denomination = (row.get("denomination") or "").strip()
    if not id_parcelle or not denomination:
        return None
    siren = normalize_siren(row.get("siren") or row.get("numero_siren"))
    return {
        "id_parcelle": id_parcelle,
        "denomination": denomination,
        "siren": siren,
        "forme_juridique": row.get("forme_juridique") or row.get("forme_juridique_abregee"),
        "forme_juridique_libelle": row.get("forme_juridique_libelle"),
        "millesime": row.get("millesime"),
    }


def majic_to_proprietaire(record: dict[str, Any] | None) -> dict:
    """Mappe une ligne majic_proprietaires → champs bypass 3 leads."""
    empty = {
        "proprietaire_foncier": None,
        "siren_proprietaire_foncier": None,
    }
    if not record:
        return empty
    denom = (record.get("denomination") or "").strip()
    if not denom:
        return empty
    return {
        "proprietaire_foncier": denom,
        "siren_proprietaire_foncier": normalize_siren(record.get("siren")),
    }


def dedupe_majic_records(records: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Garde le meilleur propriétaire par id_parcelle."""
    by_parcelle: dict[str, list[dict[str, Any]]] = {}
    for rec in records:
        ref = rec.get("id_parcelle")
        if ref:
            by_parcelle.setdefault(ref, []).append(rec)
    out: list[dict[str, Any]] = []
    for ref, group in by_parcelle.items():
        best = pick_best_owner(group)
        if best:
            out.append(best)
    return out

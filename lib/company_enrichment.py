"""
Enrichissement dirigeants + téléphone (best-effort) pour un SIREN.

Sources :
  - Dirigeants : API Recherche d'entreprises (open data, sans clé)
  - Téléphone : scan compléments open data, puis Pappers si PAPPERS_API_TOKEN est défini
"""
from __future__ import annotations

import os
import re
import time
from typing import Any

import requests

API_RECHERCHE = "https://recherche-entreprises.api.gouv.fr/search"
API_PAPPERS = "https://api.pappers.fr/v2/entreprise"
USER_AGENT = "SolarIndex-Pipeline/1.0"
_PAUSE = float(os.environ.get("ENRICH_API_PAUSE_S", "0.5"))

_DIRIGEANT_PRIORITY = (
    "président du conseil d'administration",
    "president du conseil d'administration",
    "président",
    "president",
    "directeur général",
    "directeur general",
    "gérant",
    "gerant",
    "administrateur",
    "personne ayant le pouvoir d'engager",
)

_PHONE_RE = re.compile(
    r"(?<!\d)(?:\+33[\s.-]?|0)([1-9])(?:[\s.-]?\d{2}){4}(?!\d)"
)

_company_cache: dict[str, dict[str, Any]] = {}


def _normalize_siren(raw: str | None) -> str | None:
    s = re.sub(r"\s+", "", str(raw or "").strip())
    if len(s) == 9 and s.isdigit():
        return s
    return None


def _get_json(url: str, params: dict | None = None) -> dict | None:
    try:
        r = requests.get(
            url,
            params=params or {},
            timeout=20,
            headers={"User-Agent": USER_AGENT},
        )
        if r.status_code != 200:
            return None
        return r.json()
    except (requests.RequestException, ValueError):
        return None


def _format_dirigeant(entry: dict[str, Any]) -> tuple[str, str]:
    prenoms = " ".join((entry.get("prenoms") or "").split()).title()
    nom = (entry.get("nom") or "").strip().upper()
    qualite = (entry.get("qualite") or "").strip()
    name = " ".join(x for x in (prenoms, nom) if x)
    return name, qualite


format_dirigeant = _format_dirigeant


def pick_best_dirigeant(dirigeants: list[dict[str, Any]] | None) -> dict[str, Any] | None:
    if not dirigeants:
        return None
    physiques = [d for d in dirigeants if (d.get("type_dirigeant") or "") == "personne physique"]
    pool = physiques or dirigeants

    def score(entry: dict[str, Any]) -> tuple[int, str]:
        qualite = (entry.get("qualite") or "").lower()
        rank = len(_DIRIGEANT_PRIORITY)
        for i, needle in enumerate(_DIRIGEANT_PRIORITY):
            if needle in qualite:
                rank = i
                break
        name, _ = _format_dirigeant(entry)
        return rank, name

    return min(pool, key=score)


def _normalize_phone(raw: str) -> str | None:
    digits = re.sub(r"\D", "", raw)
    if digits.startswith("33") and len(digits) >= 11:
        digits = "0" + digits[2:]
    if len(digits) == 10 and digits[0] in "0123456789" and digits[1] in "123456789":
        return f"{digits[0:2]} {digits[2:4]} {digits[4:6]} {digits[6:8]} {digits[8:10]}"
    return None


def _scan_phones(obj: Any, skip_keys: frozenset[str] = frozenset()) -> list[str]:
    found: list[str] = []
    if isinstance(obj, dict):
        for key, value in obj.items():
            if key in skip_keys:
                continue
            found.extend(_scan_phones(value, skip_keys))
    elif isinstance(obj, list):
        for item in obj:
            found.extend(_scan_phones(item, skip_keys))
    elif isinstance(obj, str):
        for match in _PHONE_RE.finditer(obj):
            phone = _normalize_phone(match.group(0))
            if phone:
                found.append(phone)
    return found


def fetch_company_by_siren(siren: str | None, cache: dict[str, dict] | None = None) -> dict | None:
    ref = _normalize_siren(siren)
    if not ref:
        return None
    store = cache if cache is not None else _company_cache
    if ref in store:
        return store[ref]

    data = _get_json(
        API_RECHERCHE,
        {
            "q": ref,
            "per_page": 1,
        },
    )
    time.sleep(_PAUSE)
    company = (data or {}).get("results") or []
    result = company[0] if company else None
    store[ref] = result
    return result


def _fetch_pappers(siren: str) -> dict | None:
    token = os.environ.get("PAPPERS_API_TOKEN", "").strip()
    if not token:
        return None
    return _get_json(
        API_PAPPERS,
        {
            "siren": siren,
            "api_token": token,
        },
    )


def _phone_from_pappers(data: dict | None) -> str | None:
    if not data:
        return None
    for key in ("telephone", "telephone_pro", "telephone_standard"):
        phone = _normalize_phone(str(data.get(key) or ""))
        if phone:
            return phone
    for rep in data.get("representants") or []:
        if (rep.get("personne_morale") is True):
            continue
        for key in ("telephone", "telephone_pro"):
            phone = _normalize_phone(str(rep.get(key) or ""))
            if phone:
                return phone
    return None


def _dirigeant_from_pappers(data: dict | None) -> tuple[str | None, str | None]:
    if not data:
        return None, None
    reps = [r for r in (data.get("representants") or []) if not r.get("personne_morale")]
    if not reps:
        return None, None

    def score(rep: dict[str, Any]) -> tuple[int, str]:
        qualite = (rep.get("qualite") or rep.get("fonction") or "").lower()
        rank = len(_DIRIGEANT_PRIORITY)
        for i, needle in enumerate(_DIRIGEANT_PRIORITY):
            if needle in qualite:
                rank = i
                break
        prenom = (rep.get("prenom") or rep.get("prenoms") or "").strip().title()
        nom = (rep.get("nom") or "").strip().upper()
        return rank, f"{prenom} {nom}".strip()

    best = min(reps, key=score)
    prenom = (best.get("prenom") or best.get("prenoms") or "").strip().title()
    nom = (best.get("nom") or "").strip().upper()
    qualite = (best.get("qualite") or best.get("fonction") or "").strip()
    name = " ".join(x for x in (prenom, nom) if x)
    return name or None, qualite or None


def enrich_company_contacts(
    siren: str | None,
    cache: dict[str, dict] | None = None,
) -> dict[str, str | None]:
    """
    Retourne dirigeant + téléphone pour un SIREN.
    Clés : dirigeant, dirigeant_qualite, telephone
    """
    empty = {"dirigeant": None, "dirigeant_qualite": None, "telephone": None}
    ref = _normalize_siren(siren)
    if not ref:
        return empty

    company = fetch_company_by_siren(ref, cache=cache)
    best = pick_best_dirigeant((company or {}).get("dirigeants"))
    dirigeant, qualite = (None, None)
    if best:
        dirigeant, qualite = _format_dirigeant(best)

    phones = _scan_phones(company or {}, skip_keys=frozenset({"dirigeants", "finances"}))
    telephone = phones[0] if phones else None

    pappers = _fetch_pappers(ref)
    if pappers:
        time.sleep(_PAUSE)
        if not dirigeant:
            dirigeant, qualite = _dirigeant_from_pappers(pappers)
        if not telephone:
            telephone = _phone_from_pappers(pappers)

    return {
        "dirigeant": dirigeant,
        "dirigeant_qualite": qualite,
        "telephone": telephone,
    }


def enrich_lead_contacts(
    siren_exploitant: str | None,
    siren_proprietaire: str | None = None,
    cache: dict[str, dict] | None = None,
) -> dict[str, str | None]:
    """Enrichit exploitant + propriétaire foncier (si SIREN PM distinct)."""
    exp = enrich_company_contacts(siren_exploitant, cache=cache)
    prop_siren = _normalize_siren(siren_proprietaire)
    exp_siren = _normalize_siren(siren_exploitant)
    prop: dict[str, str | None] = {"dirigeant": None, "dirigeant_qualite": None, "telephone": None}
    if prop_siren and prop_siren != exp_siren:
        prop = enrich_company_contacts(prop_siren, cache=cache)

    return {
        "dirigeant_exploitant": exp["dirigeant"],
        "dirigeant_exploitant_qualite": exp["dirigeant_qualite"],
        "telephone_exploitant": exp["telephone"],
        "dirigeant_proprietaire": prop["dirigeant"],
        "dirigeant_proprietaire_qualite": prop["dirigeant_qualite"],
        "telephone_proprietaire": prop["telephone"],
        # Rétrocompatibilité
        "dirigeant_nom": exp["dirigeant"],
        "telephone": exp["telephone"],
    }

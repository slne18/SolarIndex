"""Estime les leads avec match ODRÉ dans la bande [0.5×, 1.5×]."""
import os
from collections import defaultdict

import requests

import solarindex_pipeline as pipe

BAND_LOW = 0.5
BAND_HIGH = 1.5

SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "").rstrip("/")
SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
REST = f"{SUPABASE_URL}/rest/v1/leads"
HEADERS = {"apikey": SERVICE_KEY, "Authorization": f"Bearer {SERVICE_KEY}"}


def fetch_all_solar_by_insee() -> dict[str, list[float]]:
    """Télécharge une fois le registre solaire ≥ 100 kW (France entière)."""
    by_insee: dict[str, list[float]] = defaultdict(list)
    offset = 0
    limit = 100
    total = None
    while True:
        data = pipe._get_json(pipe.API_ODRE_REGISTRE, {
            "where": (
                'filiere="Solaire" and regime="En service" '
                f"and puismaxinstallee>={pipe.PV_REGISTRY_MIN_KW}"
            ),
            "select": "codeinseecommune,puismaxinstallee",
            "limit": limit,
            "offset": offset,
        })
        if not data:
            break
        if total is None:
            total = data.get("total_count", 0)
            print(f"Registre ODRÉ solaire ≥ {pipe.PV_REGISTRY_MIN_KW} kW : {total} lignes")
        rows = data.get("results", [])
        if not rows:
            break
        for row in rows:
            insee = (row.get("codeinseecommune") or "").strip()
            p = row.get("puismaxinstallee")
            if insee and p is not None:
                by_insee[insee].append(float(p))
        offset += len(rows)
        if offset % 5000 == 0 or len(rows) < limit:
            print(f"  … {offset}/{total or '?'} lignes ODRÉ")
        if len(rows) < limit:
            break
    print(f"→ {len(by_insee)} communes avec au moins 1 installation")
    return by_insee


def fetch_leads() -> list[dict]:
    rows = []
    last_id = "00000000-0000-0000-0000-000000000000"
    while True:
        r = requests.get(
            REST,
            params={
                "select": "id,code_insee,puissance_kwc,pv_registry_count",
                "id": f"gt.{last_id}",
                "order": "id.asc",
                "limit": 1000,
            },
            headers=HEADERS,
            timeout=60,
        )
        r.raise_for_status()
        batch = r.json()
        if not batch:
            break
        rows.extend(batch)
        last_id = batch[-1]["id"]
    return rows


def match_count(parking_kwc: float, powers: list[float] | None) -> int:
    if not powers:
        return 0 if powers is not None else -1
    if parking_kwc <= 0:
        return 0
    low = parking_kwc * BAND_LOW
    high = parking_kwc * BAND_HIGH
    return sum(1 for p in powers if low <= p <= high)


def main() -> None:
    solar = fetch_all_solar_by_insee()
    leads = fetch_leads()
    print(f"Leads : {len(leads)}")

    new_positive = old_positive = 0
    dist = {1: 0, 2: 0, "3+": 0}
    zero = unknown = 0

    for lead in leads:
        old = lead.get("pv_registry_count")
        if old is not None and old > 0:
            old_positive += 1
        insee = (lead.get("code_insee") or "").strip()
        kwc = float(lead.get("puissance_kwc") or 0)
        if not insee:
            unknown += 1
            continue
        powers = solar.get(insee)
        if powers is None:
            unknown += 1
            continue
        cnt = match_count(kwc, powers)
        if cnt == 0:
            zero += 1
        else:
            new_positive += 1
            if cnt >= 3:
                dist["3+"] += 1
            else:
                dist[cnt] += 1

    total = len(leads)
    print()
    print(f"Bande ODRÉ : [{BAND_LOW}× – {BAND_HIGH}×] puissance_kwc")
    print(f"Total leads               : {total}")
    print(f"Ancienne bande (0.5–3×)    : {old_positive} ({old_positive/total*100:.1f}%)")
    print(f"Nouvelle bande (0.5–1.5×) : {new_positive} ({new_positive/total*100:.1f}%)")
    print(f"  · 1 match   : {dist[1]}")
    print(f"  · 2 matches : {dist[2]}")
    print(f"  · ≥3 matches: {dist['3+']}")
    print(f"  · 0 match   : {zero}")
    print(f"  · inconnu   : {unknown}")


if __name__ == "__main__":
    main()

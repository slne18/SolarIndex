"""
Recalcule surface_m2, source_surface, flag_urgence et potentiel solaire
après changement de SURFACE_RATIO_MIN/MAX (ex. passage à 0,3× – 1,5×).

Usage :
  .venv/bin/python scripts/backfill_surface_ratio.py [--dry-run] [--limit N]
"""
from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

import requests

_ROOT = Path(__file__).resolve().parent.parent
_SCRIPTS = Path(__file__).resolve().parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))
if str(_SCRIPTS) not in sys.path:
    sys.path.insert(0, str(_SCRIPTS))

from surface_ratio import SURFACE_RATIO_MIN, SURFACE_RATIO_MAX, resolve_surface
from lib.surface_thresholds import compute_flag_urgence

SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "").rstrip("/")
SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
REST = f"{SUPABASE_URL}/rest/v1/leads"
HEADERS = {
    "apikey": SERVICE_KEY,
    "Authorization": f"Bearer {SERVICE_KEY}",
    "Content-Type": "application/json",
}
PAGE = 500


def _get(params: dict) -> list[dict]:
    r = requests.get(REST, params=params, headers=HEADERS, timeout=120)
    r.raise_for_status()
    return r.json()


def _patch(lead_id: str, payload: dict) -> None:
    r = requests.patch(
        REST,
        params={"id": f"eq.{lead_id}"},
        headers={**HEADERS, "Prefer": "return=minimal"},
        json=payload,
        timeout=30,
    )
    r.raise_for_status()


def _load_env() -> None:
    try:
        with open(".env.local", encoding="utf-8") as fh:
            for raw in fh:
                line = raw.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                key, _, val = line.partition("=")
                key, val = key.strip(), val.strip().strip('"').strip("'")
                if key and val and key not in os.environ:
                    os.environ[key] = val
    except OSError:
        pass


_load_env()

# Potentiel solaire (aligné pipeline)
RATIO_SOLAIRE = 0.50
M2_PAR_KWC = 5
COUT_KWC_EUR = 1200


def compute_solar_potential(surface_m2: float) -> dict:
    s_solaire = surface_m2 * RATIO_SOLAIRE
    p_kwc = s_solaire / M2_PAR_KWC
    return {
        "surface_solaire_m2": round(s_solaire, 1),
        "puissance_kwc": round(p_kwc, 1),
        "valeur_chantier_eur": round(p_kwc * COUT_KWC_EUR, 0),
    }


def recompute(lead: dict) -> dict:
    osm = float(lead.get("surface_osm_m2") or lead.get("surface_m2") or 0)
    cad_raw = lead.get("surface_cadastrale_m2")
    cad = float(cad_raw) if cad_raw is not None else None
    retenue, source = resolve_surface(osm, cad)
    solar = compute_solar_potential(retenue)
    flag = compute_flag_urgence(retenue)
    return {
        "surface_m2": retenue,
        "source_surface": source,
        "flag_urgence": flag,
        **solar,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Backfill surface ratio 0.3–1.5×")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--limit", type=int, default=0, help="Max leads to update (0 = all)")
    args = parser.parse_args()

    if not SUPABASE_URL or not SERVICE_KEY:
        print("❌ NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquant.")
        sys.exit(1)

    print(f"Ratio cadastre/OSM : [{SURFACE_RATIO_MIN}, {SURFACE_RATIO_MAX}]")

    offset = 0
    scanned = 0
    updated = 0
    unchanged = 0

    while True:
        batch = _get(
            {
                "select": "id,surface_m2,surface_osm_m2,surface_cadastrale_m2,source_surface,flag_urgence,surface_solaire_m2,puissance_kwc,valeur_chantier_eur",
                "order": "id.asc",
                "limit": str(PAGE),
                "offset": str(offset),
            }
        )
        if not batch:
            break

        for lead in batch:
            scanned += 1
            payload = recompute(lead)
            changed = any(
                payload[k] != lead.get(k)
                for k in payload
            )
            if not changed:
                unchanged += 1
                continue

            if args.dry_run:
                if updated < 5:
                    print(
                        f"  [dry-run] {lead['id'][:8]}… "
                        f"{lead.get('source_surface')}→{payload['source_surface']} "
                        f"{lead.get('surface_m2')}→{payload['surface_m2']} m² "
                        f"{lead.get('flag_urgence')}→{payload['flag_urgence']}"
                    )
            else:
                _patch(lead["id"], payload)

            updated += 1
            if args.limit and updated >= args.limit:
                break

        if args.limit and updated >= args.limit:
            break
        if len(batch) < PAGE:
            break
        offset += PAGE

    mode = "simulés" if args.dry_run else "mis à jour"
    print(f"✅ {scanned} leads scannés · {updated} {mode} · {unchanged} inchangés")


if __name__ == "__main__":
    main()

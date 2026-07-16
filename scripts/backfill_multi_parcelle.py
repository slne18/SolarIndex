#!/usr/bin/env python3
"""
Recalcule id_parcelle + surface cadastrale via multi-parcelle (polygone OSM).

Cible les leads avec osm_id et parcelle déjà renseignée (ou tous si --all).

Usage :
  .venv/bin/python scripts/backfill_multi_parcelle.py [--limit N] [--dry-run]

Pré-requis : NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (.env.local)
"""
from __future__ import annotations

import argparse
import os
import sys
import time

import requests

import solarindex_pipeline as pipe

SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "").rstrip("/")
SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
REST = f"{SUPABASE_URL}/rest/v1/leads"
HEADERS = {
    "apikey": SERVICE_KEY,
    "Authorization": f"Bearer {SERVICE_KEY}",
    "Content-Type": "application/json",
}
PAGE = 40


def _fetch_batch(limit: int, offset: int) -> list[dict]:
    r = requests.get(
        REST,
        params={
            "select": "id,osm_id,latitude,longitude,surface_osm_m2,surface_m2",
            "osm_id": "not.is.null",
            "statut": "neq.vendu",
            "order": "surface_m2.desc",
            "limit": limit,
            "offset": offset,
        },
        headers=HEADERS,
        timeout=60,
    )
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
    if not r.ok:
        raise requests.HTTPError(f"{r.status_code} {r.text[:300]}", response=r)


def run(limit: int, dry_run: bool) -> None:
    if not SUPABASE_URL or not SERVICE_KEY:
        print("❌ Variables Supabase manquantes.")
        sys.exit(1)

    done = 0
    offset = 0
    multi_count = 0

    while True:
        batch_size = PAGE if not limit else min(PAGE, limit - done)
        if batch_size <= 0:
            break
        rows = _fetch_batch(batch_size, offset)
        if not rows:
            break
        offset += len(rows)

        osm_ids = [int(r["osm_id"]) for r in rows]
        geoms = pipe.fetch_parking_geoms_by_osm_ids(osm_ids)

        for row in rows:
            lead_id = row["id"]
            lat = float(row["latitude"])
            lon = float(row["longitude"])
            surf = float(row.get("surface_osm_m2") or row.get("surface_m2") or 0)
            coords = geoms.get(int(row["osm_id"]))
            if not coords:
                continue

            parc = pipe.get_parcelle(lat, lon, polygon_coords=coords)
            id_parcelle = (parc.get("id_parcelle") or "").strip()
            if not id_parcelle:
                continue

            retenue, source = pipe.resolve_surface(surf, parc.get("surface_cadastrale_m2"))
            solar = pipe.compute_solar_potential(retenue)
            methode = parc.get("parcelle_methode") or ""
            if methode.startswith("multi_parcelle"):
                multi_count += 1

            payload = {
                "id_parcelle": id_parcelle,
                "surface_cadastrale_m2": parc.get("surface_cadastrale_m2"),
                "surface_m2": retenue,
                "source_surface": source,
                "surface_solaire_m2": solar["surface_solaire_m2"],
                "puissance_kwc": solar["puissance_kwc"],
                "valeur_chantier_eur": solar["valeur_chantier_eur"],
                "flag_urgence": pipe.compute_flag_urgence(retenue),
            }

            if not dry_run:
                _patch(lead_id, payload)

            done += 1
            if done % 25 == 0:
                print(f"  {done} traités · {multi_count} multi-parcelle…")
            time.sleep(pipe.ENRICH_API_PAUSE_S)

            if limit and done >= limit:
                print(f"✅ Terminé : {done} leads, {multi_count} multi-parcelle.")
                return

    print(f"✅ Terminé : {done} leads, {multi_count} multi-parcelle.")


def main() -> None:
    parser = argparse.ArgumentParser(description="Backfill parcelle multi-parcelle OSM")
    parser.add_argument("--limit", type=int, default=0)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    run(args.limit, args.dry_run)


if __name__ == "__main__":
    main()

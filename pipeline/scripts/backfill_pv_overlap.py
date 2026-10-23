"""
Backfill recouvrement PV OSM (pv_overlap_pct) sur les leads déjà en base.

Stratégie : par département, index solaire OSM une fois puis recouvrement géométrique
par lead (géométrie parking via Overpass, fallback cercle si absent).

Usage :
  .venv/bin/python pipeline/scripts/backfill_pv_overlap.py [--dry-run] [--limit N] [--dept 33]

Pré-requis : NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (.env.local)
"""
from __future__ import annotations

import argparse
import os
import sys
import time
from datetime import datetime, timezone

import requests

from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from paths import ensure_pipeline_on_path  # noqa: E402

ensure_pipeline_on_path()

import solarindex_pipeline as pipe

SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "").rstrip("/")
SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
REST = f"{SUPABASE_URL}/rest/v1/leads"
HEADERS = {
    "apikey": SERVICE_KEY,
    "Authorization": f"Bearer {SERVICE_KEY}",
    "Content-Type": "application/json",
}
PAGE = 500
PATCH_BATCH = 50


def _get(params: dict) -> list[dict]:
    r = requests.get(REST, params=params, headers=HEADERS, timeout=120)
    r.raise_for_status()
    return r.json()


def _patch_batch(updates: list[tuple[str, dict]]) -> None:
    for lead_id, payload in updates:
        r = requests.patch(
            REST,
            params={"id": f"eq.{lead_id}"},
            headers={**HEADERS, "Prefer": "return=minimal"},
            json=payload,
            timeout=30,
        )
        r.raise_for_status()


def fetch_departements(only_dept: str | None, recalc_all: bool) -> list[str]:
    """Liste des départements ayant au moins un lead à backfiller."""
    if only_dept:
        return [only_dept]
    if recalc_all:
        depts: set[str] = set()
        last_id = "00000000-0000-0000-0000-000000000000"
        while True:
            rows = _get({
                "select": "id,departement",
                "id": f"gt.{last_id}",
                "order": "id.asc",
                "limit": PAGE,
            })
            if not rows:
                break
            for row in rows:
                last_id = row["id"]
                d = (row.get("departement") or "").strip()
                if d:
                    depts.add(d)
        return sorted(depts)

    depts: set[str] = set()
    last_id = "00000000-0000-0000-0000-000000000000"
    while True:
        rows = _get({
            "select": "id,departement",
            "pv_overlap_pct": "is.null",
            "id": f"gt.{last_id}",
            "order": "id.asc",
            "limit": PAGE,
        })
        if not rows:
            break
        for row in rows:
            last_id = row["id"]
            d = (row.get("departement") or "").strip()
            if d:
                depts.add(d)
    return sorted(depts)


def fetch_leads_for_dept(dept: str, limit: int, recalc_all: bool) -> list[dict]:
    params = {
        "select": (
            "id,osm_id,latitude,longitude,surface_m2,pv_registry_count,"
            "vision_flag,vision_confidence,detection"
        ),
        "departement": f"eq.{dept}",
        "order": "id.asc",
        "limit": min(PAGE, limit) if limit else PAGE,
    }
    if not recalc_all:
        params["pv_overlap_pct"] = "is.null"
    rows = _get(params)
    if limit and len(rows) > limit:
        return rows[:limit]
    return rows


def compute_updates(
    leads: list[dict],
    geom_map: dict[int, list[tuple[float, float]]],
    solar_tree,
    solar_polys: list,
) -> list[tuple[str, dict]]:
    now = datetime.now(timezone.utc).isoformat()
    updates: list[tuple[str, dict]] = []
    for lead in leads:
        osm_id = int(lead["osm_id"])
        coords = geom_map.get(osm_id)
        parking = pipe.parking_polygon_l93(
            float(lead["latitude"]),
            float(lead["longitude"]),
            float(lead["surface_m2"] or 0),
            coords,
        )
        overlap = pipe.pv_overlap_ratio(parking, solar_tree, solar_polys)
        reg_match = lead.get("pv_registry_count")
        if reg_match is None:
            reg_match = -1
        osm_det = pipe.classify_detection(overlap, int(reg_match))
        detection = pipe.merge_detection_with_vision(
            osm_det,
            lead.get("vision_flag"),
            lead.get("vision_confidence"),
        )
        updates.append((lead["id"], {
            "pv_overlap_pct": round(overlap, 4),
            "pv_osm": overlap >= pipe.PV_OVERLAP_MIN,
            "detection": detection,
            "verified_at": now,
        }))
    return updates


def backfill_department(dept: str, dry_run: bool, limit: int, recalc_all: bool) -> int:
    print(f"\n── Département {dept} ──")
    try:
        solar_tree, solar_polys = pipe.fetch_solar_index(dept)
    except RuntimeError as e:
        print(f"  ❌ Index PV indisponible : {e}")
        return 0

    total_done = 0
    while True:
        batch_limit = PAGE
        if limit:
            remaining = limit - total_done
            if remaining <= 0:
                break
            batch_limit = min(PAGE, remaining)

        leads = fetch_leads_for_dept(dept, batch_limit, recalc_all)
        if not leads:
            if total_done == 0:
                print("  (aucun lead sans pv_overlap_pct)")
            break

        print(f"  Lot {total_done + 1}…{total_done + len(leads)} ({len(leads)} leads)")
        osm_ids = list({int(l["osm_id"]) for l in leads})
        geom_map = pipe.fetch_parking_geoms_by_osm_ids(osm_ids)
        print(f"  → {len(geom_map)}/{len(osm_ids)} géométries OSM")

        updates = compute_updates(leads, geom_map, solar_tree, solar_polys)
        if dry_run:
            for lid, p in updates[:2]:
                print(f"  [dry-run] {lid[:8]}… overlap={p['pv_overlap_pct']} det={p['detection']}")
            total_done += len(updates)
            break

        for i in range(0, len(updates), PATCH_BATCH):
            chunk = updates[i : i + PATCH_BATCH]
            _patch_batch(chunk)
            total_done += len(chunk)
        print(f"  … {total_done} cumulés")
        if limit and total_done >= limit:
            break

    return total_done


def main() -> None:
    ap = argparse.ArgumentParser(description="Backfill pv_overlap_pct (OSM) par département")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--limit", type=int, default=0, help="Max leads total (0 = tous)")
    ap.add_argument("--all", action="store_true",
                    help="Recalcule tous les leads (pas seulement pv_overlap_pct NULL)")
    ap.add_argument("--dept", type=str, default="", help="Un seul département (ex. 33)")
    args = ap.parse_args()

    if not SUPABASE_URL or not SERVICE_KEY:
        print("❌ NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY manquants.")
        sys.exit(1)

    only_dept = args.dept.strip() or None
    depts = fetch_departements(only_dept, args.all)
    if not depts:
        print("✅ Aucun département / lead à traiter.")
        return

    print(f"[backfill-pv] {len(depts)} département(s) · dry_run={args.dry_run} · "
          f"limit={args.limit or '∞'} · all={args.all}")
    total = 0
    remaining_limit = args.limit

    for dept in depts:
        if remaining_limit is not None and remaining_limit <= 0:
            break
        dept_limit = remaining_limit if remaining_limit else 0
        n = backfill_department(dept, args.dry_run, dept_limit, args.all)
        total += n
        if remaining_limit:
            remaining_limit -= n
            if remaining_limit <= 0:
                break

    print(f"\n✅ Terminé : {total} leads {'simulés' if args.dry_run else 'mis à jour'}.")


if __name__ == "__main__":
    main()

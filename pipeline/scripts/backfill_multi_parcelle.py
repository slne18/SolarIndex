#!/usr/bin/env python3
"""
Recalcule id_parcelle + surface cadastrale via multi-parcelle (polygone OSM).

Par défaut : catalogue vendable uniquement (~55k leads), pas toute la base (~63k).

Usage :
  .venv/bin/python pipeline/scripts/backfill_multi_parcelle.py
  .venv/bin/python pipeline/scripts/backfill_multi_parcelle.py --workers 6
  .venv/bin/python pipeline/scripts/backfill_multi_parcelle.py --all

Reprise après crash / Ctrl+C : relance la même commande (offset sauvegardé automatiquement).
  .venv/bin/python pipeline/scripts/backfill_multi_parcelle.py --no-resume

Premier run sans fichier de progression (ancienne version) : reprendre manuellement.
  .venv/bin/python pipeline/scripts/backfill_multi_parcelle.py --workers 6 --offset 4720

Pré-requis :
  NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (.env.local)
"""
from __future__ import annotations

import argparse
import json
import os
import signal
import sys
import threading
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import requests

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from paths import REPO_ROOT, ensure_pipeline_on_path  # noqa: E402

ensure_pipeline_on_path()

import solarindex_pipeline as pipe  # noqa: E402
from lib.lead_sellable import sellable_rest_filters  # noqa: E402

SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "").rstrip("/")
SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
REST = f"{SUPABASE_URL}/rest/v1/leads"
HEADERS = {
    "apikey": SERVICE_KEY,
    "Authorization": f"Bearer {SERVICE_KEY}",
    "Content-Type": "application/json",
}
PAGE = 80
BACKFILL_GEOM_PAUSE_S = 1.0
PROGRESS_PATH = REPO_ROOT / "data" / "cache" / "multi_parcelle_progress.json"

REFRESH_NEVER = "never"
REFRESH_ON_CHANGE = "on-change"
REFRESH_ALWAYS = "always"

_COMPARE_FIELDS = (
    "id_parcelle",
    "surface_cadastrale_m2",
    "surface_m2",
    "source_surface",
    "surface_solaire_m2",
    "puissance_kwc",
    "valeur_chantier_eur",
    "flag_urgence",
    "proprietaire_foncier",
    "siren_proprietaire_foncier",
    "dirigeant_proprietaire",
    "dirigeant_proprietaire_qualite",
)


@dataclass
class BatchStats:
    recalculated: int = 0
    patched: int = 0
    skipped_unchanged: int = 0
    skipped_no_geom: int = 0
    skipped_no_parcelle: int = 0
    multi_parcelle: int = 0
    parcel_changed: int = 0
    proprio_refreshed: int = 0


@dataclass
class SharedCaches:
    majic: dict[str, dict] = field(default_factory=dict)
    dirigeants: dict[str, dict] = field(default_factory=dict)
    lock: threading.Lock = field(default_factory=threading.Lock)


def _progress_key(sellable_only: bool) -> str:
    return "sellable" if sellable_only else "all"


def _load_progress(sellable_only: bool) -> int:
    try:
        raw = json.loads(PROGRESS_PATH.read_text(encoding="utf-8"))
        if raw.get("scope") != _progress_key(sellable_only):
            return 0
        return max(0, int(raw.get("offset", 0)))
    except (OSError, json.JSONDecodeError, TypeError, ValueError):
        return 0


def _save_progress(offset: int, sellable_only: bool) -> None:
    PROGRESS_PATH.parent.mkdir(parents=True, exist_ok=True)
    PROGRESS_PATH.write_text(
        json.dumps(
            {
                "scope": _progress_key(sellable_only),
                "offset": offset,
                "updated_at": time.strftime("%Y-%m-%dT%H:%M:%S"),
            },
            indent=2,
        ),
        encoding="utf-8",
    )


def _clear_progress() -> None:
    try:
        PROGRESS_PATH.unlink(missing_ok=True)
    except OSError:
        pass


def _fetch_batch(limit: int, offset: int, *, sellable_only: bool) -> list[dict]:
    params: dict = {
        "select": (
            "id,osm_id,latitude,longitude,surface_osm_m2,surface_m2,"
            "id_parcelle,siren,proprietaire_foncier,siren_proprietaire_foncier,"
            "surface_cadastrale_m2,source_surface,surface_solaire_m2,"
            "puissance_kwc,valeur_chantier_eur,flag_urgence,"
            "dirigeant_proprietaire,dirigeant_proprietaire_qualite"
        ),
        "osm_id": "not.is.null",
        "statut": "neq.vendu",
        "order": "surface_m2.desc",
        "limit": limit,
        "offset": offset,
    }
    if sellable_only:
        params.update(sellable_rest_filters())
    r = requests.get(REST, params=params, headers=HEADERS, timeout=60)
    r.raise_for_status()
    return r.json()


def _patch(lead_id: str, payload: dict, attempts: int = 5) -> None:
    last: Exception | None = None
    for i in range(attempts):
        try:
            r = requests.patch(
                REST,
                params={"id": f"eq.{lead_id}"},
                headers={**HEADERS, "Prefer": "return=minimal"},
                json=payload,
                timeout=30,
            )
            if not r.ok:
                raise requests.HTTPError(f"{r.status_code} {r.text[:300]}", response=r)
            return
        except (requests.RequestException, OSError) as exc:
            last = exc
            wait = min(60, 10 * (i + 1))
            print(
                f"    ⚠️  PATCH {lead_id[:8]}… {type(exc).__name__} "
                f"— retry {i + 1}/{attempts} dans {wait}s"
            )
            time.sleep(wait)
    raise last  # type: ignore[misc]


def _should_refresh_proprietaire(mode: str, old_id: str, new_id: str) -> bool:
    if mode == REFRESH_NEVER:
        return False
    if mode == REFRESH_ALWAYS:
        return True
    return old_id != new_id


def _norm(value: Any) -> Any:
    if value is None or value == "":
        return None
    if isinstance(value, (int, float)):
        return round(float(value), 1)
    if isinstance(value, str):
        s = value.strip()
        return s or None
    return value


def _payload_unchanged(row: dict, payload: dict) -> bool:
    for key in _COMPARE_FIELDS:
        if key not in payload:
            continue
        if _norm(row.get(key)) != _norm(payload.get(key)):
            return False
    return True


def _proprietaire_payload(
    id_parcelle: str,
    siren_exploitant: str | None,
    caches: SharedCaches,
) -> dict:
    with caches.lock:
        prop = pipe.resolve_proprietaire_foncier(id_parcelle, cache=caches.majic)
    payload = {
        "proprietaire_foncier": prop.get("proprietaire_foncier"),
        "siren_proprietaire_foncier": prop.get("siren_proprietaire_foncier"),
        "dirigeant_proprietaire": None,
        "dirigeant_proprietaire_qualite": None,
    }
    siren_prop = prop.get("siren_proprietaire_foncier")
    if not siren_prop:
        return payload

    try:
        from lib.company_enrichment import enrich_lead_contacts

        with caches.lock:
            contacts = enrich_lead_contacts(
                siren_exploitant,
                siren_prop,
                cache=caches.dirigeants,
            )
        payload["dirigeant_proprietaire"] = contacts.get("dirigeant_proprietaire")
        payload["dirigeant_proprietaire_qualite"] = contacts.get(
            "dirigeant_proprietaire_qualite"
        )
    except Exception as exc:
        print(f"    ⚠️  dirigeant propriétaire : {type(exc).__name__}")
    return payload


def _process_row(
    row: dict,
    coords: list[tuple[float, float]] | None,
    refresh_proprietaire: str,
    caches: SharedCaches,
    *,
    skip_unchanged: bool,
    dry_run: bool = False,
) -> BatchStats:
    stats = BatchStats()
    if not coords:
        stats.skipped_no_geom = 1
        return stats

    lead_id = row["id"]
    lat = float(row["latitude"])
    lon = float(row["longitude"])
    surf = float(row.get("surface_osm_m2") or row.get("surface_m2") or 0)
    old_parcelle = (row.get("id_parcelle") or "").strip()

    parc = pipe.get_parcelle(lat, lon, polygon_coords=coords)
    id_parcelle = (parc.get("id_parcelle") or "").strip()
    if not id_parcelle:
        stats.skipped_no_parcelle = 1
        return stats

    retenue, source = pipe.resolve_surface(surf, parc.get("surface_cadastrale_m2"))
    solar = pipe.compute_solar_potential(retenue)
    methode = parc.get("parcelle_methode") or ""

    stats.recalculated = 1
    if methode.startswith("multi_parcelle"):
        stats.multi_parcelle = 1
    if old_parcelle != id_parcelle:
        stats.parcel_changed = 1

    payload: dict = {
        "id_parcelle": id_parcelle,
        "surface_cadastrale_m2": parc.get("surface_cadastrale_m2"),
        "surface_m2": retenue,
        "source_surface": source,
        "surface_solaire_m2": solar["surface_solaire_m2"],
        "puissance_kwc": solar["puissance_kwc"],
        "valeur_chantier_eur": solar["valeur_chantier_eur"],
        "flag_urgence": pipe.compute_flag_urgence(retenue),
    }

    if _should_refresh_proprietaire(refresh_proprietaire, old_parcelle, id_parcelle):
        payload.update(_proprietaire_payload(id_parcelle, row.get("siren"), caches))
        stats.proprio_refreshed = 1

    if skip_unchanged and _payload_unchanged(row, payload):
        stats.skipped_unchanged = 1
        return stats

    if not dry_run:
        _patch(lead_id, payload)
        stats.patched = 1
    return stats


def _merge_stats(total: BatchStats, part: BatchStats) -> None:
    total.recalculated += part.recalculated
    total.patched += part.patched
    total.skipped_unchanged += part.skipped_unchanged
    total.skipped_no_geom += part.skipped_no_geom
    total.skipped_no_parcelle += part.skipped_no_parcelle
    total.multi_parcelle += part.multi_parcelle
    total.parcel_changed += part.parcel_changed
    total.proprio_refreshed += part.proprio_refreshed


def run(
    limit: int,
    dry_run: bool,
    refresh_proprietaire: str,
    sellable_only: bool,
    *,
    start_offset: int = 0,
    resume: bool = True,
    workers: int = 4,
    skip_unchanged: bool = True,
) -> None:
    if not SUPABASE_URL or not SERVICE_KEY:
        print("❌ Variables Supabase manquantes.")
        sys.exit(1)

    scope = "catalogue vendable" if sellable_only else "toute la base"
    print(f"🎯 Périmètre : {scope}")
    print(f"⚡ Mode rapide : {workers} workers apicarto · skip inchangés={skip_unchanged}")

    if refresh_proprietaire != REFRESH_NEVER:
        print(f"🏛️  Refresh propriétaire : {refresh_proprietaire}")

    geom_cache = pipe._load_osm_geom_cache()
    if geom_cache:
        print(f"📦 Cache géométries OSM : {len(geom_cache):,} parkings")
    print(
        f"🌍 Overpass : lots {pipe.OVERPASS_GEOM_CHUNK} ids · "
        f"pause {BACKFILL_GEOM_PAUSE_S}s entre lots manquants"
    )

    offset = start_offset
    committed_offset = start_offset
    if offset > 0:
        print(f"▶ Reprise à l'offset {offset:,}")
    else:
        print("▶ Démarrage offset 0")
    if not dry_run and offset > 0:
        _save_progress(offset, sellable_only)

    totals = BatchStats()
    caches = SharedCaches()
    t0 = time.time()

    def _persist_progress() -> None:
        if dry_run:
            return
        _save_progress(committed_offset, sellable_only)

    def _on_stop(signum: int, _frame: object) -> None:
        sig = signal.Signals(signum).name
        print(f"\n⏸  Interruption ({sig}) — progression sauvegardée à l'offset {committed_offset:,}")
        _persist_progress()
        sys.exit(130 if signum == signal.SIGINT else 143)

    signal.signal(signal.SIGINT, _on_stop)
    signal.signal(signal.SIGTERM, _on_stop)

    try:
        while True:
            batch_size = PAGE if not limit else min(PAGE, limit - totals.recalculated)
            if batch_size <= 0:
                break
            rows = _fetch_batch(batch_size, offset, sellable_only=sellable_only)
            if not rows:
                break
            offset += len(rows)

            osm_ids = [int(r["osm_id"]) for r in rows]
            geoms = pipe.fetch_parking_geoms_by_osm_ids(
                osm_ids,
                verbose=False,
                geom_pause=BACKFILL_GEOM_PAUSE_S,
            )

            if dry_run:
                for row in rows:
                    part = _process_row(
                        row,
                        geoms.get(int(row["osm_id"])),
                        refresh_proprietaire,
                        caches,
                        skip_unchanged=skip_unchanged,
                        dry_run=True,
                    )
                    _merge_stats(totals, part)
            else:
                with ThreadPoolExecutor(max_workers=workers) as pool:
                    futures = [
                        pool.submit(
                            _process_row,
                            row,
                            geoms.get(int(row["osm_id"])),
                            refresh_proprietaire,
                            caches,
                            skip_unchanged=skip_unchanged,
                            dry_run=False,
                        )
                        for row in rows
                    ]
                    for fut in as_completed(futures):
                        _merge_stats(totals, fut.result())

                committed_offset = offset
                _persist_progress()

            elapsed = max(time.time() - t0, 1.0)
            rate = totals.recalculated / elapsed * 60
            print(
                f"  {offset:,} parcourus · {totals.recalculated:,} recalculés · "
                f"{totals.patched:,} patchés · {totals.skipped_unchanged:,} skip (inchangé) · "
                f"{totals.multi_parcelle} multi · {totals.parcel_changed} parcelle Δ · "
                f"~{rate:.0f}/min"
            )

            if limit and totals.recalculated >= limit:
                print(
                    f"✅ Limite atteinte : {offset:,} parcourus, {totals.recalculated:,} recalculés, "
                    f"{totals.patched:,} patchés, {totals.skipped_unchanged:,} inchangés."
                )
                return
    except BaseException:
        if not dry_run:
            print(
                f"\n⚠️  Erreur — progression sauvegardée à l'offset {committed_offset:,} "
                f"(relancez la même commande pour reprendre)"
            )
            _persist_progress()
        raise

    _clear_progress()
    elapsed = max(time.time() - t0, 1.0)
    print(
        f"✅ Terminé : {offset:,} parcourus, {totals.recalculated:,} recalculés, "
        f"{totals.patched:,} patchés, {totals.skipped_unchanged:,} inchangés, "
        f"{totals.multi_parcelle} multi-parcelle, {totals.parcel_changed} parcelle Δ "
        f"({elapsed / 60:.0f} min, ~{totals.recalculated / elapsed * 60:.0f}/min)."
    )


def main() -> None:
    parser = argparse.ArgumentParser(description="Backfill parcelle multi-parcelle OSM")
    parser.add_argument("--limit", type=int, default=0)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--all", action="store_true")
    parser.add_argument("--no-resume", action="store_true")
    parser.add_argument("--offset", type=int, default=None)
    parser.add_argument(
        "--workers",
        type=int,
        default=4,
        help="Requêtes apicarto en parallèle (défaut 4)",
    )
    parser.add_argument(
        "--no-skip-unchanged",
        action="store_true",
        help="PATCH même si les valeurs sont identiques",
    )
    parser.add_argument(
        "--refresh-proprietaire",
        choices=[REFRESH_NEVER, REFRESH_ON_CHANGE, REFRESH_ALWAYS],
        default=REFRESH_ON_CHANGE,
    )
    args = parser.parse_args()
    sellable_only = not args.all
    if args.offset is not None:
        start_offset = max(0, args.offset)
        resume = False
    elif args.no_resume:
        start_offset = 0
        _clear_progress()
        resume = False
    else:
        start_offset = _load_progress(sellable_only)
        resume = True
    run(
        args.limit,
        args.dry_run,
        args.refresh_proprietaire,
        sellable_only,
        start_offset=start_offset,
        resume=resume,
        workers=max(1, args.workers),
        skip_unchanged=not args.no_skip_unchanged,
    )


if __name__ == "__main__":
    main()

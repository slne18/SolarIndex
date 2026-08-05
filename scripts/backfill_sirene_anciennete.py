#!/usr/bin/env python3
"""
Backfill ancienneté exploitant (date création + état administratif SIRENE).

Cible par défaut : catalogue vendable complet (~56k leads), urgences et non-urgences
ensemble — un seul passage, sans séparation par flag.

Reprise automatique : relancer la même commande (siren_anciennete_checked_at IS NULL).

Usage :
  .venv/bin/python scripts/backfill_sirene_anciennete.py
  .venv/bin/python scripts/backfill_sirene_anciennete.py --estimate-only
  .venv/bin/python scripts/backfill_sirene_anciennete.py --limit 500 --dry-run
  .venv/bin/python scripts/backfill_sirene_anciennete.py --all

Pré-requis : NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (.env.local)
             Migration 0030_sirene_anciennete.sql appliquée sur Supabase.
"""
from __future__ import annotations

import argparse
import os
import sys
import time
from datetime import timedelta
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

import solarindex_pipeline as pipe  # noqa: E402 — charge .env.local
from lib.lead_sellable import catalog_rest_filters, is_lead_sellable, sellable_rest_filters  # noqa: E402
from lib.sirene_stability import stability_patch_payload  # noqa: E402

SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "").rstrip("/")
SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
REST = f"{SUPABASE_URL}/rest/v1/leads"
HEADERS = {
    "apikey": SERVICE_KEY,
    "Authorization": f"Bearer {SERVICE_KEY}",
    "Content-Type": "application/json",
}
PAGE = 80
GET_TIMEOUT = 120
PATCH_TIMEOUT = 120
RETRY_ATTEMPTS = 8
LOG_PATH = os.environ.get("SIRENE_BACKFILL_LOG", "/tmp/sirene_anciennete_backfill.log")


def _log(msg: str) -> None:
    line = f"{time.strftime('%Y-%m-%d %H:%M:%S')} {msg}"
    print(line, flush=True)
    try:
        with open(LOG_PATH, "a", encoding="utf-8") as f:
            f.write(line + "\n")
    except OSError:
        pass


def _retry_request(fn, label: str, attempts: int = RETRY_ATTEMPTS):
    last: Exception | None = None
    for i in range(attempts):
        try:
            return fn()
        except (requests.RequestException, OSError) as exc:
            last = exc
            wait = min(90, 10 * (i + 1))
            _log(f"    ⚠️  {label} · {type(exc).__name__} — retry {i + 1}/{attempts} dans {wait}s")
            time.sleep(wait)
    raise last  # type: ignore[misc]


def _pending_filters(*, catalog_only: bool) -> dict[str, str]:
    params: dict[str, str] = {
        "siren": "not.is.null",
        "siren_anciennete_checked_at": "is.null",
    }
    if catalog_only:
        params.update(catalog_rest_filters())
    else:
        params.update(sellable_rest_filters())
    return params


def _count_remaining(*, catalog_only: bool) -> int:
    def do() -> int:
        r = requests.get(
            REST,
            params={"select": "id", **_pending_filters(catalog_only=catalog_only)},
            headers={
                **HEADERS,
                "Prefer": "count=exact",
                "Range-Unit": "items",
                "Range": "0-0",
            },
            timeout=GET_TIMEOUT,
        )
        r.raise_for_status()
        cr = r.headers.get("content-range", "0/0")
        return int(cr.split("/")[-1])

    return _retry_request(do, "COUNT remaining")


def _get(params: dict) -> list[dict]:
    def do() -> list[dict]:
        r = requests.get(REST, params=params, headers=HEADERS, timeout=GET_TIMEOUT)
        r.raise_for_status()
        return r.json()

    return _retry_request(do, "GET leads")


def _patch(lead_id: str, payload: dict) -> None:
    def do() -> None:
        r = requests.patch(
            REST,
            params={"id": f"eq.{lead_id}"},
            headers={**HEADERS, "Prefer": "return=minimal"},
            json=payload,
            timeout=PATCH_TIMEOUT,
        )
        r.raise_for_status()

    _retry_request(do, f"PATCH {lead_id[:8]}")


def _estimate(n_leads: int, unique_ratio: float = 0.6) -> str:
    unique = max(1, int(n_leads * unique_ratio))
    seconds = unique * pipe.ENRICH_API_PAUSE_S
    return str(timedelta(seconds=int(seconds)))


def _ensure_schema() -> None:
    r = requests.get(
        REST,
        params={"select": "siren_anciennete_checked_at", "limit": "1"},
        headers=HEADERS,
        timeout=GET_TIMEOUT,
    )
    if r.status_code >= 400:
        _log(
            "❌ Schéma SIRENE absent ou inaccessible — appliquez "
            "supabase/migrations/0030_sirene_anciennete.sql sur Supabase puis relancez."
        )
        if r.text:
            _log(f"    Détail : {r.text[:300]}")
        sys.exit(1)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=0, help="Max leads (0 = tout le catalogue)")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--estimate-only", action="store_true")
    parser.add_argument(
        "--all",
        action="store_true",
        help="Tous les leads vendables (hors filtre statut/slots catalogue)",
    )
    args = parser.parse_args()
    catalog_only = not args.all

    if not SUPABASE_URL or not SERVICE_KEY:
        _log("❌ NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY manquants.")
        sys.exit(1)

    _ensure_schema()

    scope = "catalogue vendable (disponible + slots)" if catalog_only else "leads vendables (tous statuts)"
    remaining = _count_remaining(catalog_only=catalog_only)
    to_process = min(remaining, args.limit) if args.limit else remaining

    _log(f"📋 {remaining:,} lead(s) {scope} sans ancienneté SIRENE")
    if args.estimate_only:
        _log(f"⏱  Estimation : {to_process:,} leads · ~{_estimate(to_process)} (cache SIREN ~40 % d'appels en moins)")
        return

    if remaining == 0:
        _log("✅ Rien à faire.")
        return

    _log(f"🚀 Backfill {scope} — {to_process:,} lead(s) · pause {pipe.ENRICH_API_PAUSE_S}s/SIREN · log {LOG_PATH}")

    cache: dict[str, dict] = {}
    done = updated = skipped = errors = 0
    t0 = time.time()

    while True:
        fetch_n = min(PAGE, args.limit - done) if args.limit else PAGE
        if args.limit and fetch_n <= 0:
            break

        rows = _get(
            {
                "select": "id,siren,adresse,id_parcelle,surface_m2,detection,vision_surface_couverte_pct,statut,buyers_count",
                **_pending_filters(catalog_only=catalog_only),
                "order": "surface_m2.desc",
                "offset": 0,
                "limit": fetch_n,
            }
        )
        if not rows:
            break

        for row in rows:
            if not is_lead_sellable(row):
                if not args.dry_run:
                    _patch(row["id"], {"siren_anciennete_checked_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())})
                skipped += 1
                done += 1
                continue

            siren = str(row.get("siren") or "").strip()
            if not siren:
                skipped += 1
                done += 1
                continue

            try:
                payload = stability_patch_payload(siren, cache=cache)
            except (requests.RequestException, OSError) as exc:
                errors += 1
                _log(f"    ⚠️  SIREN {siren[:9]} · {type(exc).__name__} — pause 30s")
                time.sleep(30)
                continue

            has_date = bool(payload.get("siren_date_creation"))
            if args.dry_run:
                _log(f"[dry-run] {row['id'][:8]} · {siren} → {payload}")
            else:
                _patch(row["id"], payload)

            updated += 1
            done += 1

            if done % 100 == 0:
                elapsed = max(1, time.time() - t0)
                rate = done / elapsed * 3600
                _log(f"    … {done:,}/{to_process:,} · {updated:,} MAJ · {rate:.0f} leads/h")

        if len(rows) < fetch_n:
            break

    elapsed = timedelta(seconds=int(time.time() - t0))
    _log(f"✅ Terminé en {elapsed} — {updated:,} enrichi(s), {skipped:,} ignoré(s), {errors:,} erreur(s)")


if __name__ == "__main__":
    main()

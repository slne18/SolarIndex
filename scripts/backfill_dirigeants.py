#!/usr/bin/env python3
"""
Backfill dirigeants exploitant / propriétaire (+ téléphone best-effort).

Reprise automatique : relancer la même commande après une coupure (timeout réseau).
Seuls les leads vendables avec dirigeant_exploitant IS NULL sont retraités
(critères alignés lib/leads.ts isLeadSellable).

Usage :
  .venv/bin/python scripts/backfill_dirigeants.py [--limit N] [--dry-run] [--all]

Pré-requis : NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (.env.local)
Optionnel : PAPPERS_API_TOKEN pour téléphones (faible couverture open data seule)
"""
from __future__ import annotations

import argparse
import os
import sys
import time
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

import solarindex_pipeline as pipe  # noqa: E402 — charge .env.local
from lib.company_enrichment import enrich_lead_contacts  # noqa: E402
from lib.lead_sellable import is_lead_sellable, sellable_rest_filters  # noqa: E402

SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "").rstrip("/")
SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
REST = f"{SUPABASE_URL}/rest/v1/leads"
HEADERS = {
    "apikey": SERVICE_KEY,
    "Authorization": f"Bearer {SERVICE_KEY}",
    "Content-Type": "application/json",
}
PAGE = 40
GET_TIMEOUT = 90
PATCH_TIMEOUT = 90
RETRY_ATTEMPTS = 8


def _retry_request(fn, label: str, attempts: int = RETRY_ATTEMPTS):
    """Retry Supabase / réseau transitoire (DNS, timeout, SSL, 502/503)."""
    last: Exception | None = None
    for i in range(attempts):
        try:
            return fn()
        except (requests.RequestException, OSError) as exc:
            last = exc
            wait = min(90, 10 * (i + 1))
            print(
                f"    ⚠️  {label} · {type(exc).__name__} — retry {i + 1}/{attempts} dans {wait}s",
                flush=True,
            )
            time.sleep(wait)
    raise last  # type: ignore[misc]


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


def _pending_filters(sellable_only: bool) -> dict[str, str]:
    params: dict[str, str] = {
        "dirigeant_exploitant": "is.null",
    }
    if sellable_only:
        params.update(sellable_rest_filters())
    else:
        params["siren"] = "not.is.null"
    return params


def _count_remaining(sellable_only: bool) -> int:
    def do() -> int:
        r = requests.get(
            REST,
            params={
                "select": "id",
                **_pending_filters(sellable_only),
            },
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


def _build_payload(row: dict, cache: dict[str, dict]) -> dict:
    payload = enrich_lead_contacts(
        row.get("siren"),
        row.get("siren_proprietaire_foncier"),
        cache=cache,
    )
    clean = {k: v for k, v in payload.items() if v is not None}
    # Marquer comme traité même sans dirigeant (évite boucle infinie sur is.null).
    if not payload.get("dirigeant_exploitant"):
        clean["dirigeant_exploitant"] = ""
    return clean


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=0, help="Max leads (0 = tous)")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument(
        "--all",
        action="store_true",
        help="Traiter tous les leads avec SIREN (y compris non vendables)",
    )
    args = parser.parse_args()
    sellable_only = not args.all

    if not SUPABASE_URL or not SERVICE_KEY:
        print("❌ NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY manquants.")
        sys.exit(1)

    remaining_start = _count_remaining(sellable_only)
    scope = "vendables" if sellable_only else "tous (SIREN)"
    print(
        f"📋 {remaining_start:,} lead(s) {scope} sans dirigeant_exploitant",
        flush=True,
    )

    cache: dict[str, dict] = {}
    done = updated = skipped = 0

    while True:
        fetch_n = min(PAGE, args.limit - done) if args.limit else PAGE
        if args.limit and fetch_n <= 0:
            break

        rows = _get(
            {
                "select": (
                    "id,siren,siren_proprietaire_foncier,dirigeant_exploitant,"
                    "adresse,id_parcelle,surface_m2,detection,vision_surface_couverte_pct"
                ),
                **_pending_filters(sellable_only),
                "order": "surface_m2.desc",
                "offset": 0,
                "limit": fetch_n,
            }
        )
        if not rows:
            break

        for row in rows:
            if sellable_only and not is_lead_sellable(row):
                if not args.dry_run:
                    _patch(row["id"], {"dirigeant_exploitant": ""})
                skipped += 1
                done += 1
                continue
            try:
                clean = _build_payload(row, cache)
            except (requests.RequestException, OSError) as exc:
                print(
                    f"    ⚠️  enrich {row['id'][:8]} · {type(exc).__name__} — pause 30s",
                    flush=True,
                )
                time.sleep(30)
                continue

            has_dirigeant = bool(clean.get("dirigeant_exploitant"))
            if args.dry_run:
                print(f"[dry-run] {row['id'][:8]} → {clean}")
            else:
                _patch(row["id"], clean)
                if has_dirigeant:
                    updated += 1
                else:
                    skipped += 1
            done += 1
            if done % 25 == 0:
                print(
                    f"… {done:,} traités · {updated:,} enrichis · {skipped:,} sans dirigeant",
                    flush=True,
                )

        if len(rows) < fetch_n:
            break

    remaining_end = _count_remaining(sellable_only) if not args.dry_run else remaining_start
    print(
        f"✅ Terminé : {updated:,} enrichi(s) · {skipped:,} sans dirigeant · "
        f"{done:,} traité(s) · reste {remaining_end:,}",
        flush=True,
    )


if __name__ == "__main__":
    main()

"""
Backfill enrichissement national (BAN + apicarto + SIREN + bypasses 2/3/5)
sur les leads déjà en base — sans re-scanner Overpass.

Cible : detection IN ('libre', 'a_verifier'), adresse IS NULL, statut != 'vendu',
tri surface_m2 DESC. Reprise automatique si interruption (même filtre).

Pause 0,5 s entre chaque appel BAN / apicarto / SIREN (ENRICH_API_PAUSE_S).

Usage :
  .venv/bin/python scripts/backfill_enrich.py [--limit N] [--dry-run] [--estimate-only]

Pré-requis : SUPABASE_SERVICE_ROLE_KEY + NEXT_PUBLIC_SUPABASE_URL (.env.local)
"""
import argparse
import os
import sys
import time
from datetime import timedelta

import requests

import solarindex_pipeline as pipe  # déclenche _load_dotenv()

SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "").rstrip("/")
SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
REST = f"{SUPABASE_URL}/rest/v1/leads"
HEADERS = {
    "apikey": SERVICE_KEY,
    "Authorization": f"Bearer {SERVICE_KEY}",
    "Content-Type": "application/json",
}
PAGE = 50
API_CALLS_PER_LEAD = 3  # BAN, apicarto, SIREN
LOG_PATH = os.environ.get("ENRICH_BACKFILL_LOG", "/tmp/enrich_backfill.log")

QUERY = {
    "adresse": "is.null",
    "detection": "in.(libre,a_verifier)",
    "statut": "neq.vendu",
}


def _log(msg: str) -> None:
    line = f"{time.strftime('%Y-%m-%d %H:%M:%S')} {msg}"
    print(line, flush=True)
    with open(LOG_PATH, "a", encoding="utf-8") as f:
        f.write(line + "\n")


def _count_remaining() -> int:
    h = {
        **HEADERS,
        "Prefer": "count=exact",
        "Range-Unit": "items",
        "Range": "0-0",
    }
    r = requests.get(
        REST,
        params={"select": "id", **QUERY},
        headers=h,
        timeout=60,
    )
    r.raise_for_status()
    cr = r.headers.get("content-range", "0/0")
    return int(cr.split("/")[-1])


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


def _fetch_batch(limit: int, exclude_ids: set[str] | None = None) -> list[dict]:
    """Récupère les prochains leads à enrichir (dédupliqués par id)."""
    exclude_ids = exclude_ids or set()
    need = limit + len(exclude_ids)
    r = requests.get(
        REST,
        params={
            "select": "id,osm_id,latitude,longitude,surface_osm_m2,surface_m2,score_confiance,ville",
            **QUERY,
            "order": "surface_m2.desc,id.asc",
            "limit": min(need, 200),
        },
        headers=HEADERS,
        timeout=60,
    )
    r.raise_for_status()
    rows = r.json()
    out: list[dict] = []
    seen: set[str] = set()
    for row in rows:
        lid = row["id"]
        if lid in exclude_ids or lid in seen:
            continue
        seen.add(lid)
        out.append(row)
        if len(out) >= limit:
            break
    return out


def estimate_duration(n_leads: int) -> str:
    seconds = n_leads * API_CALLS_PER_LEAD * pipe.ENRICH_API_PAUSE_S
    return str(timedelta(seconds=int(seconds)))


def run(limit: int, dry_run: bool, estimate_only: bool) -> None:
    if not SUPABASE_URL or not SERVICE_KEY:
        print("❌ NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquant.")
        sys.exit(1)

    remaining = _count_remaining()
    to_process = min(limit, remaining) if limit else remaining
    est = estimate_duration(to_process)

    _log(f"📊 Leads à enrichir : {remaining} (ce run : {to_process or '∞'})")
    _log(f"⏱  Estimation : {to_process} × {API_CALLS_PER_LEAD} appels × "
         f"{pipe.ENRICH_API_PAUSE_S}s ≈ {est} (hors Pappers / dérogations)")

    if estimate_only:
        return

    if remaining == 0:
        _log("✅ Rien à faire — tous les leads libre/a_verifier ont une adresse.")
        return

    done = 0
    errors = 0
    skipped = 0
    failed_ids: set[str] = set()
    t0 = time.time()

    while True:
        batch_size = PAGE if not limit else min(PAGE, limit - done)
        if batch_size <= 0:
            break
        rows = _fetch_batch(batch_size, failed_ids)
        if not rows:
            if failed_ids:
                _log(f"⚠️  {len(failed_ids)} leads en échec PATCH — arrêt pour éviter boucle.")
            break

        osm_ids = [int(r["osm_id"]) for r in rows if r.get("osm_id")]
        geoms = pipe.fetch_parking_geoms_by_osm_ids(osm_ids) if osm_ids else {}

        for row in rows:
            lead_id = row["id"]
            lat = float(row["latitude"])
            lon = float(row["longitude"])
            surf = row.get("surface_osm_m2") or row.get("surface_m2") or 0
            score = float(row.get("score_confiance") or 0.5)
            ville = row.get("ville") or ""
            osm_id = row.get("osm_id")
            polygon_coords = geoms.get(int(osm_id)) if osm_id is not None else None

            try:
                result, errs = pipe.enrich_lead(
                    lat, lon, float(surf), score, None, ville,
                    polygon_coords=polygon_coords,
                )
                if errs:
                    errors += 1
                    _log(f"⚠️  {lead_id} · {' · '.join(errs)}")
                payload = pipe.supabase_enrich_payload(result)
                if not dry_run:
                    _patch(lead_id, payload)
            except Exception as exc:
                errors += 1
                failed_ids.add(lead_id)
                skipped += 1
                _log(f"❌ {lead_id} · {type(exc).__name__}: {exc}")
                continue

            done += 1
            if done % 10 == 0:
                elapsed = time.time() - t0
                rate = done / elapsed if elapsed > 0 else 0
                left = (limit or remaining) - done
                eta = timedelta(seconds=int(left / rate)) if rate > 0 else "?"
                _log(f"  {done} traités · {errors} avec erreurs partielles · ETA ~{eta}")

            if limit and done >= limit:
                _log(f"→ Limite {limit} atteinte. {done} traités, {errors} erreurs loguées.")
                return

    _log(f"✅ Terminé : {done} leads enrichis, {errors} avec erreurs partielles.")


def main() -> None:
    parser = argparse.ArgumentParser(description="Backfill enrichissement national SolarIndex")
    parser.add_argument("--limit", type=int, default=0, help="Plafond de leads (0 = tous)")
    parser.add_argument("--dry-run", action="store_true", help="Appels API sans PATCH Supabase")
    parser.add_argument("--estimate-only", action="store_true",
                        help="Affiche le décompte et l'estimation puis quitte")
    args = parser.parse_args()
    run(args.limit, args.dry_run, args.estimate_only)


if __name__ == "__main__":
    main()

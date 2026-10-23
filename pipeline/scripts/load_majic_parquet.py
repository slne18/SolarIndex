#!/usr/bin/env python3
"""
Charge la table Supabase majic_proprietaires depuis le Parquet MAJIC DGFiP.

Source (France entière, unifié) :
  https://www.data.gouv.fr/datasets/fichiers-des-locaux-et-des-parcelles-des-personnes-morales-version-unifiee

Usage :
  .venv/bin/python pipeline/scripts/load_majic_parquet.py --from-leads
  .venv/bin/python pipeline/scripts/load_majic_parquet.py --full
  .venv/bin/python pipeline/scripts/load_majic_parquet.py --download-only

Par défaut (--from-leads) : ne charge que les id_parcelle présents dans leads
→ ~60k lignes, quelques minutes, adapté au backfill SolarIndex.

Pré-requis : pip install duckdb pyarrow
  + NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY dans .env.local
"""
from __future__ import annotations

import argparse
import json
import os
import shutil
import sys
import tempfile
import time
from pathlib import Path

import requests

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from paths import REPO_ROOT, ensure_pipeline_on_path  # noqa: E402

ensure_pipeline_on_path()

from lib.majic import (  # noqa: E402
    MAJIC_PARQUET_URL,
    build_id_parcelle,
    dedupe_majic_records,
    owner_priority,
    row_to_majic_record,
)

DATA_DIR = REPO_ROOT / "data" / "majic"
DEFAULT_PARQUET = DATA_DIR / "parcelles_personnes_morales_latest.parquet"
RECORDS_CACHE = DATA_DIR / "from_leads_records.jsonl"
BATCH = 250


def _request_retry(method: str, url: str, label: str, attempts: int = 8, **kwargs) -> requests.Response:
    """Retry réseau / SSL transitoires (Supabase, Wi‑Fi)."""
    last: Exception | None = None
    for i in range(attempts):
        try:
            r = requests.request(method, url, **kwargs)
            r.raise_for_status()
            return r
        except (requests.RequestException, OSError) as exc:
            last = exc
            wait = min(90, 15 * (i + 1))
            print(f"    ⚠️  {label} · {type(exc).__name__} — retry {i + 1}/{attempts} dans {wait}s")
            time.sleep(wait)
    raise last  # type: ignore[misc]


def _majic_ids_in_db() -> set[str]:
    url, headers = _supabase()
    rest = f"{url}/rest/v1/majic_proprietaires"
    ids: set[str] = set()
    offset = 0
    while True:
        r = _request_retry(
            "GET",
            rest,
            "GET majic_proprietaires ids",
            params={"select": "id_parcelle", "offset": offset, "limit": 1000},
            headers=headers,
            timeout=90,
        )
        rows = r.json()
        if not rows:
            break
        for row in rows:
            ref = (row.get("id_parcelle") or "").strip()
            if ref:
                ids.add(ref)
        offset += len(rows)
        if len(rows) < 1000:
            break
    return ids


def _load_dotenv() -> None:
    env = REPO_ROOT / ".env.local"
    if not env.exists():
        return
    for line in env.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        os.environ.setdefault(k.strip(), v.strip())


def _supabase() -> tuple[str, dict]:
    url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "").rstrip("/")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    if not url or not key:
        print("❌ NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY manquants.")
        sys.exit(1)
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates",
    }
    return url, headers


def _lead_parcelles() -> set[str]:
    url, headers = _supabase()
    rest = f"{url}/rest/v1/leads"
    refs: set[str] = set()
    offset = 0
    while True:
        r = _request_retry(
            "GET",
            rest,
            "GET leads id_parcelle",
            params={
                "select": "id_parcelle",
                "id_parcelle": "not.is.null",
                "offset": offset,
                "limit": 1000,
            },
            headers=headers,
            timeout=60,
        )
        rows = r.json()
        if not rows:
            break
        for row in rows:
            ref = (row.get("id_parcelle") or "").strip()
            if ref:
                refs.add(ref)
        offset += len(rows)
        if len(rows) < 1000:
            break
    return refs


def _depts_from_refs(refs: set[str]) -> set[str]:
    out: set[str] = set()
    for ref in refs:
        if len(ref) < 2:
            continue
        if ref[:2] in ("2A", "2B"):
            out.add(ref[:2])
        elif len(ref) >= 3 and ref[:2] == "97":
            out.add(ref[:3])
        else:
            out.add(ref[:2])
    return out


def download_parquet(dest: Path = DEFAULT_PARQUET, url: str = MAJIC_PARQUET_URL) -> Path:
    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.exists() and dest.stat().st_size > 10_000_000:
        print(f"✅ Parquet déjà présent : {dest} ({dest.stat().st_size // 1_000_000} Mo)")
        return dest
    print(f"⬇️  Téléchargement MAJIC → {dest} …")
    with requests.get(url, stream=True, timeout=600) as r:
        r.raise_for_status()
        total = int(r.headers.get("content-length") or 0)
        done = 0
        with open(dest, "wb") as f:
            for chunk in r.iter_content(chunk_size=1 << 20):
                if chunk:
                    f.write(chunk)
                    done += len(chunk)
                    if total and done % (50 << 20) < (1 << 20):
                        print(f"   … {done // (1 << 20)} / {total // (1 << 20)} Mo", flush=True)
    print(f"✅ Téléchargé ({dest.stat().st_size // 1_000_000} Mo)")
    return dest


def _duckdb_parquet_path(parquet: Path) -> str:
    return str(parquet.resolve()).replace("'", "''")


def _parquet_for_read(parquet: Path) -> Path:
    """
    Copie le Parquet hors iCloud / Desktop si besoin.
    Les timeouts DuckDB « Operation timed out » viennent souvent d'un fichier non local.
    """
    src_size = parquet.stat().st_size
    local = DATA_DIR / ".parquet_local_copy.parquet"
    if local.exists() and local.stat().st_size == src_size:
        print(f"✅ Parquet local : {local.name} ({src_size // 1_000_000} Mo)")
        return local

    tmp = Path(tempfile.gettempdir()) / "solarindex_majic.parquet"
    if tmp.exists() and tmp.stat().st_size == src_size:
        print(f"✅ Parquet local (/tmp) : {src_size // 1_000_000} Mo")
        return tmp

    dest = tmp
    print(f"📂 Copie Parquet → {dest} ({src_size // 1_000_000} Mo, évite timeout iCloud)…")
    shutil.copy2(parquet, dest)
    print("✅ Copie terminée")
    return dest


def _save_records_cache(records: list[dict], path: Path = RECORDS_CACHE) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as f:
        for rec in records:
            f.write(json.dumps(rec, ensure_ascii=False) + "\n")
    print(f"💾 Cache extraction : {path} ({len(records):,} lignes)")


def _load_records_cache(path: Path = RECORDS_CACHE) -> list[dict]:
    records: list[dict] = []
    with path.open(encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                records.append(json.loads(line))
    print(f"💾 Cache chargé : {path.name} ({len(records):,} lignes)")
    return records


def _duckdb_query(con, sql: str, label: str, attempts: int = 3):
    last: Exception | None = None
    for i in range(attempts):
        try:
            return con.execute(sql).fetchall()
        except Exception as exc:
            last = exc
            if "timed out" not in str(exc).lower() and "io error" not in str(exc).lower():
                raise
            wait = 10 * (i + 1)
            print(f"    ⚠️  {label} · {type(exc).__name__} — retry {i + 1}/{attempts} dans {wait}s")
            time.sleep(wait)
    raise last  # type: ignore[misc]


def extract_records(
    parquet: Path,
    target_refs: set[str] | None,
    full: bool,
) -> list[dict]:
    try:
        import duckdb
    except ImportError:
        print("❌ pip install duckdb")
        sys.exit(1)

    path = _duckdb_parquet_path(_parquet_for_read(parquet))
    con = duckdb.connect()
    con.execute("SET threads TO 2")

    id_expr = """
        code_insee || coalesce(nullif(trim(cast(prefixe as varchar)), ''), '000') ||
        CASE WHEN length(trim(section)) = 1 THEN ' ' || upper(trim(section))
             ELSE upper(substr(trim(section), 1, 2)) END ||
        lpad(cast(numero_parcelle as varchar), 4, '0')
    """

    if full:
        print("🔍 Extraction MAJIC (France entière, dédoublonnage)…")
        sql = f"""
        WITH raw AS (
          SELECT
            {id_expr} AS id_parcelle,
            trim(denomination) AS denomination,
            trim(numero_siren) AS numero_siren,
            cast(forme_juridique as varchar) AS forme_juridique,
            forme_juridique_libelle,
            millesime,
            CASE
              WHEN trim(numero_siren) <> '' AND upper(trim(numero_siren)) NOT LIKE 'U%' THEN 20
              WHEN upper(trim(numero_siren)) LIKE 'U%' THEN -15
              ELSE 0
            END AS pri
          FROM read_parquet('{path}')
          WHERE trim(denomination) <> ''
        ),
        ranked AS (
          SELECT *, row_number() OVER (PARTITION BY id_parcelle ORDER BY pri DESC) AS rn
          FROM raw
        )
        SELECT id_parcelle, denomination, numero_siren, forme_juridique,
               forme_juridique_libelle, millesime
        FROM ranked WHERE rn = 1
        ORDER BY id_parcelle
        """
        rows = _duckdb_query(con, sql, "Extraction MAJIC full")
        cols = [d[0] for d in con.description]
        return [dict(zip(cols, row)) for row in rows]

    if not target_refs:
        print("⚠️  Aucune parcelle cible.")
        return []

    depts = sorted(_depts_from_refs(target_refs))
    print(f"🔍 Extraction MAJIC pour {len(target_refs)} parcelle(s) ({len(depts)} dept)…")

    select_cols = """
      code_insee, prefixe, section, numero_parcelle,
      trim(denomination) AS denomination,
      trim(numero_siren) AS numero_siren,
      cast(forme_juridique as varchar) AS forme_juridique,
      forme_juridique_libelle,
      millesime
    """
    cols: list[str] | None = None
    by_ref: dict[str, list[dict]] = {}

    for i, dept in enumerate(depts, 1):
        sql = f"""
        SELECT {select_cols}
        FROM read_parquet('{path}')
        WHERE departement = '{dept}'
          AND trim(denomination) <> ''
        """
        rows = _duckdb_query(con, sql, f"Dept {dept}")
        if cols is None:
            cols = [d[0] for d in con.description]
        for row in rows:
            rec = dict(zip(cols, row))
            ref = build_id_parcelle(
                rec.get("code_insee"),
                rec.get("prefixe"),
                rec.get("section"),
                rec.get("numero_parcelle"),
            )
            if ref not in target_refs:
                continue
            rec["id_parcelle"] = ref
            rec["siren"] = rec.get("numero_siren")
            by_ref.setdefault(ref, []).append(rec)
        if i % 10 == 0 or i == len(depts):
            print(f"    dept {i}/{len(depts)} · {len(by_ref)} parcelle(s) matchées")

    out: list[dict] = []
    for ref in sorted(target_refs):
        group = by_ref.get(ref, [])
        if not group:
            continue
        best = max(group, key=owner_priority)
        mapped = row_to_majic_record(best)
        if mapped:
            out.append(mapped)
    return out


def upsert_records(records: list[dict], truncate: bool = False, skip: int = 0) -> None:
    url, headers = _supabase()
    rest = f"{url}/rest/v1/majic_proprietaires"

    if truncate:
        r = _request_retry(
            "DELETE",
            rest,
            "TRUNCATE majic_proprietaires",
            params={"id_parcelle": "not.is.null"},
            headers={**headers, "Prefer": "return=minimal"},
            timeout=120,
        )
        if r.status_code not in (200, 204):
            print(f"⚠️  Truncate majic_proprietaires : {r.status_code} {r.text[:200]}")

    if skip:
        records = records[skip:]
        print(f"⏭️  Reprise à l'offset {skip:,} — {len(records):,} lignes restantes")

    total = len(records)
    done = skip
    for i in range(0, total, BATCH):
        chunk = records[i : i + BATCH]
        payload = [
            {
                "id_parcelle": r["id_parcelle"],
                "denomination": r["denomination"],
                "siren": r.get("siren"),
                "forme_juridique": r.get("forme_juridique"),
                "forme_juridique_libelle": r.get("forme_juridique_libelle"),
                "millesime": r.get("millesime"),
            }
            for r in chunk
        ]
        batch_n = (skip + i) // BATCH + 1
        _request_retry(
            "POST",
            rest,
            f"Upsert batch {batch_n} ({len(payload)} lignes)",
            headers=headers,
            json=payload,
            timeout=120,
        )
        done += len(chunk)
        if done % 5000 == 0 or done == skip + total:
            print(f"  … {done}/{skip + total} lignes majic_proprietaires")
        time.sleep(0.05)


def main() -> None:
    _load_dotenv()
    ap = argparse.ArgumentParser(description="Charge majic_proprietaires depuis Parquet DGFiP")
    ap.add_argument("--from-leads", action="store_true",
                    help="Ne charge que les parcelles référencées dans leads (défaut)")
    ap.add_argument("--full", action="store_true",
                    help="Charge toute la France (~18 M parcelles PM, long)")
    ap.add_argument("--download-only", action="store_true", help="Télécharge le Parquet sans charger")
    ap.add_argument("--parquet", type=Path, default=DEFAULT_PARQUET, help="Chemin Parquet local")
    ap.add_argument("--truncate", action="store_true", help="Vide majic_proprietaires avant insert")
    ap.add_argument("--skip", type=int, default=0,
                    help="Reprendre l'upsert à partir de la N-ième ligne (ordre stable)")
    ap.add_argument("--resume", action="store_true",
                    help="Reprendre après la dernière coupure (skip = lignes déjà en base)")
    ap.add_argument("--upsert-only", action="store_true",
                    help="Saute l'extraction Parquet — utilise le cache JSONL local")
    ap.add_argument("--url", default=MAJIC_PARQUET_URL, help="URL Parquet (override)")
    args = ap.parse_args()
    parquet_url = args.url

    parquet = download_parquet(args.parquet, url=parquet_url)
    if args.download_only:
        return

    full = args.full
    from_leads = args.from_leads or not full
    targets = None if full else _lead_parcelles()
    if from_leads and targets is not None:
        print(f"📋 {len(targets)} id_parcelle uniques dans leads")

    if args.upsert_only:
        if not RECORDS_CACHE.exists():
            print(f"❌ Cache absent : {RECORDS_CACHE}")
            print("   Lancez d'abord sans --upsert-only pour extraire le Parquet.")
            sys.exit(1)
        records = _load_records_cache()
    elif from_leads and args.resume and RECORDS_CACHE.exists():
        records = _load_records_cache()
    else:
        records = extract_records(parquet, targets, full=full)
        if from_leads and records:
            _save_records_cache(records)
    if full:
        records = dedupe_majic_records([
            row_to_majic_record({**r, "siren": r.get("numero_siren")}) or {}
            for r in records
        ])
        records = [r for r in records if r.get("id_parcelle")]

    print(f"📦 {len(records)} propriétaires PM à upserter")
    if not records:
        print("✅ Rien à charger.")
        return

    skip = args.skip
    if args.resume and not args.truncate and skip == 0:
        in_db = _majic_ids_in_db()
        before = len(records)
        records = [r for r in records if r["id_parcelle"] not in in_db]
        print(
            f"♻️  Reprise : {len(in_db):,} parcelle(s) déjà en base "
            f"→ {len(records):,} restantes (sur {before:,})"
        )
    elif skip > 0:
        records = records[skip:]
        print(f"⏭️  Reprise à l'offset {skip:,} — {len(records):,} lignes restantes")

    if not records:
        print("✅ Toutes les parcelles du cache sont déjà en base.")
        return

    upsert_records(records, truncate=args.truncate, skip=0)
    print("✅ majic_proprietaires chargé.")


if __name__ == "__main__":
    main()

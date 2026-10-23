"""
Backfill des bypasses 3 (propriétaire MAJIC DGFiP) et 4 (vision ombrières Haiku)
sur les leads DÉJÀ en base — sans re-scanner Overpass/cadastre.

Bypass 3 : jointure locale sur majic_proprietaires (Parquet open data pré-chargé).
  1. .venv/bin/python pipeline/scripts/load_majic_parquet.py --from-leads
  2. .venv/bin/python pipeline/scripts/backfill_bypasses.py --mode proprietaire

Réutilise resolve_proprietaire_foncier (pipeline) et apply_vision_result (vision).

Usage :
  .venv/bin/python pipeline/scripts/backfill_bypasses.py --mode proprietaire [--limit N] [--dry-run]
  .venv/bin/python pipeline/scripts/backfill_bypasses.py --mode proprietaire --refresh
    # Recalcule propriétaire même si déjà renseigné (après multi-parcelle)
  .venv/bin/python pipeline/scripts/backfill_bypasses.py --mode vision       [--limit N] [--dry-run]
  .venv/bin/python pipeline/scripts/backfill_bypasses.py --mode vision_pct   [--limit N] [--dry-run]

Pré-requis :
  majic_proprietaires chargée (load_majic_parquet.py) + migration 0013
  ANTHROPIC_API_KEY (mode vision) + SUPABASE_SERVICE_ROLE_KEY
"""
import argparse
import os
import sys
import time

import requests
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from paths import ensure_pipeline_on_path  # noqa: E402

ensure_pipeline_on_path()

import solarindex_pipeline as pipe  # déclenche _load_dotenv()

SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "").rstrip("/")
SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
REST = f"{SUPABASE_URL}/rest/v1/leads"
HEADERS = {
    "apikey": SERVICE_KEY,
    "Authorization": f"Bearer {SERVICE_KEY}",
    "Content-Type": "application/json",
}
PAGE = 200


def _get(params: dict) -> list[dict]:
    r = requests.get(REST, params=params, headers=HEADERS, timeout=60)
    r.raise_for_status()
    return r.json()


def _retry_request(fn, label: str, attempts: int = 5):
    """Retry Supabase / réseau transitoire (DNS, timeout, SSL)."""
    last: Exception | None = None
    for i in range(attempts):
        try:
            return fn()
        except (requests.RequestException, OSError) as exc:
            last = exc
            wait = min(60, 10 * (i + 1))
            print(f"    ⚠️  {label} · {type(exc).__name__} — retry {i + 1}/{attempts} dans {wait}s")
            time.sleep(wait)
    raise last  # type: ignore[misc]


def _patch(lead_id: str, payload: dict) -> None:
    def do() -> None:
        r = requests.patch(
            REST, params={"id": f"eq.{lead_id}"},
            headers={**HEADERS, "Prefer": "return=minimal"},
            json=payload, timeout=30,
        )
        r.raise_for_status()

    _retry_request(do, f"PATCH {lead_id[:8]}")


def _majic_count() -> int:
    r = requests.head(
        f"{SUPABASE_URL}/rest/v1/majic_proprietaires",
        params={"select": "id_parcelle"},
        headers={**HEADERS, "Prefer": "count=exact"},
        timeout=30,
    )
    if r.status_code == 404:
        return -1
    r.raise_for_status()
    cr = r.headers.get("Content-Range", "")
    if "/" in cr:
        return int(cr.split("/")[-1])
    return 0


# ─── Mode 3 : propriétaire foncier (MAJIC DGFiP, jointure parcelle) ───────────
def backfill_proprietaire(limit: int, dry_run: bool, refresh: bool = False) -> None:
    """
    Jointure leads.id_parcelle → majic_proprietaires (tri surface_m2 DESC).
    Sans --limit : appelle la RPC SQL backfill_proprietaire_from_majic (bulk).
    Avec --refresh : recalcule même les leads qui ont déjà un propriétaire.
    """
    n_majic = _majic_count()
    if n_majic == -1:
        print("❌ Table majic_proprietaires absente — appliquez migration 0013.")
        sys.exit(1)
    if n_majic == 0:
        print("❌ majic_proprietaires vide — lancez :")
        print("   .venv/bin/python pipeline/scripts/load_majic_parquet.py --from-leads")
        sys.exit(1)
    print(f"📚 majic_proprietaires : {n_majic:,} parcelles PM")

    if limit == 0 and not dry_run and not refresh:
        r = requests.post(
            f"{REST}/rpc/backfill_proprietaire_from_majic",
            headers={**HEADERS, "Prefer": "return=representation"},
            json={},
            timeout=600,
        )
        if r.status_code == 404:
            print("⚠️  RPC backfill_proprietaire_from_majic absente — mode lead par lead.")
            print("   Accélérer : SQL Editor Supabase → supabase/RUN_MAJIC_bypass3.sql (l. 21-36)")
        elif r.status_code >= 400:
            r.raise_for_status()
        else:
            updated = r.json()
            count = updated if isinstance(updated, int) else (updated[0] if updated else 0)
            print(f"✅ Terminé : {count} lead(s) enrichi(s) via jointure MAJIC.")
            return

    done = resolved = updated = 0
    cache: dict[str, dict] = {}
    offset = 0
    while True:
        fetch_n = min(PAGE, limit - done) if limit else PAGE
        if limit and fetch_n <= 0:
            break
        params: dict = {
            "select": "id,id_parcelle,surface_m2,proprietaire_foncier,siren_proprietaire_foncier",
            "id_parcelle": "not.is.null",
            "order": "surface_m2.desc",
            "offset": offset,
            "limit": fetch_n,
        }
        if not refresh:
            params["proprietaire_foncier"] = "is.null"
        rows = _get(params)
        if not rows:
            break
        offset += len(rows)
        for row in rows:
            ref = (row.get("id_parcelle") or "").strip()
            if not ref:
                continue
            if ref not in cache:
                cache[ref] = pipe.resolve_proprietaire_foncier(ref, cache=cache)
            prop = cache[ref]
            if prop.get("proprietaire_foncier"):
                resolved += 1
            new_prop = prop.get("proprietaire_foncier")
            new_siren = prop.get("siren_proprietaire_foncier")
            old_prop = row.get("proprietaire_foncier")
            old_siren = row.get("siren_proprietaire_foncier")
            changed = (new_prop != old_prop) or (new_siren != old_siren)
            if refresh and not changed:
                done += 1
                if limit and done >= limit:
                    print(f"→ Limite {limit} atteinte. {done} leads, {updated} mis à jour.")
                    return
                continue
            if changed:
                updated += 1
            if not dry_run:
                _patch(row["id"], {
                    "proprietaire_foncier": new_prop,
                    "siren_proprietaire_foncier": new_siren,
                })
            done += 1
            if done % 500 == 0:
                print(f"  {done} leads · {resolved} propriétaires PM identifiés")
            if limit and done >= limit:
                print(f"→ Limite {limit} atteinte. {done} leads, {resolved} résolus.")
                return
        if len(rows) < fetch_n:
            break

    if done == 0:
        msg = (
            "Aucun lead à traiter."
            if refresh
            else "Aucun lead avec parcelle sans propriétaire foncier à traiter."
        )
        print(f"✅ {msg}")
    elif dry_run:
        extra = f", {updated} changement(s) estimé(s)" if refresh else ""
        print(f"✅ Dry-run : {done} lead(s) traitables, {resolved} match MAJIC estimés{extra}.")
    else:
        extra = f", {updated} mis à jour" if refresh else ""
        print(f"✅ Terminé : {done} leads, {resolved} propriétaires PM identifiés{extra}.")


# ─── Mode 4 : vision ombrières (Haiku, Batch API −50 %) ───────────────────────
def _anthropic_retry(fn, label: str, attempts: int = 8):
    """Retry sur erreurs réseau / SSL transitoires (Anthropic, httpx)."""
    import anthropic
    last: Exception | None = None
    for i in range(attempts):
        try:
            return fn()
        except (anthropic.APIConnectionError, anthropic.InternalServerError,
                anthropic.RateLimitError, requests.RequestException, OSError) as exc:
            last = exc
            wait = min(90, 15 * (i + 1))
            print(f"    ⚠️  {label} · {type(exc).__name__} — retry {i + 1}/{attempts} dans {wait}s")
            time.sleep(wait)
    raise last  # type: ignore[misc]


def _anthropic_batch_create(client, reqs: list, min_batch: int = 5) -> list:
    """Crée un ou plusieurs batches Anthropic ; split auto si upload échoue (SSL)."""
    import anthropic

    label = f"Batch create ({len(reqs)} images)"
    try:
        return [_anthropic_retry(
            lambda: client.messages.batches.create(requests=reqs),
            label,
        )]
    except (anthropic.APIConnectionError, anthropic.InternalServerError) as exc:
        if len(reqs) <= min_batch:
            raise exc
        mid = len(reqs) // 2
        print(f"    ↳ échec persistant — split {len(reqs)} → {mid} + {len(reqs) - mid}")
        return (
            _anthropic_batch_create(client, reqs[:mid], min_batch)
            + _anthropic_batch_create(client, reqs[mid:], min_batch)
        )


def _vision_apply_batch_results(client, batch_ids, id_by_custom: dict, dry_run: bool) -> tuple[int, int]:
    """Poll + applique les résultats pour un ou plusieurs batch IDs."""
    flagged = equipped = 0

    for batch_id in batch_ids:
        print(f"  Batch {batch_id} — polling…")
        while True:
            status = _anthropic_retry(
                lambda bid=batch_id: client.messages.batches.retrieve(bid),
                "Batch poll",
                attempts=5,
            )
            c = status.request_counts
            print(f"    … processing={c.processing} ok={c.succeeded} err={c.errored}")
            if status.processing_status == "ended":
                break
            time.sleep(30)

        results = _anthropic_retry(
            lambda bid=batch_id: list(client.messages.batches.results(bid)),
            "Batch results",
        )
        for item in results:
            lead = id_by_custom.get(item.custom_id)
            if not lead:
                continue
            if item.result.type == "succeeded":
                vis = pipe._parse_vision_json(item.result.message.content[0].text)
            else:
                vis = {"ombriere_detectee": None, "confidence": 0.0}
            rec = {"detection": lead["detection"], "score_confiance": lead["score_confiance"]}
            pipe.apply_vision_result(rec, vis, ortho_date=lead.get("_ortho_date"))
            if rec.get("vision_flag"):
                flagged += 1
            if rec.get("detection") == "equipe":
                equipped += 1
            if not dry_run:
                _patch(lead["id"], _vision_patch(rec))
    return flagged, equipped


def _vision_patch(rec: dict) -> dict:
    """Payload Supabase après apply_vision_result."""
    return {
        "vision_flag": rec.get("vision_flag", False),
        "vision_confidence": rec.get("vision_confidence"),
        "vision_checked_at": rec.get("vision_checked_at"),
        "vision_surface_couverte_pct": rec.get("vision_surface_couverte_pct"),
        "vision_ortho_date": rec.get("vision_ortho_date"),
        "detection": rec.get("detection"),
        "score_confiance": rec.get("score_confiance"),
    }


def _vision_batch_chunk(leads: list[dict], dry_run: bool) -> tuple[int, int, int]:
    """Lot Anthropic Batch. Returns (traités, flaggés, équipés photo > 45 %)."""
    try:
        import anthropic
    except ImportError:
        print("❌ pip install anthropic"); sys.exit(1)

    from datetime import datetime, timezone
    client = anthropic.Anthropic(api_key=pipe.ANTHROPIC_KEY)
    id_by_custom: dict[str, dict] = {}
    reqs = []

    for i, lead in enumerate(leads):
        if i > 0 and i % 25 == 0:
            print(f"    ortho {i}/{len(leads)}…")
        pack = pipe.fetch_ortho(
            lead["latitude"], lead["longitude"], lead["surface_m2"] or 0)
        if pack is None:
            if not dry_run:
                _patch(lead["id"], {
                    "vision_checked_at": datetime.now(timezone.utc).isoformat(),
                })
            continue
        lead["_ortho_date"] = pack.get("ortho_date")
        cid = lead["id"]
        id_by_custom[cid] = lead
        reqs.append({"custom_id": cid, "params": {
            "model": pipe.VISION_MODEL, "max_tokens": 200,
            "messages": [{"role": "user", "content": [
                {"type": "image", "source": {"type": "base64",
                 "media_type": "image/png", "data": pack["image_b64"]}},
                {"type": "text", "text": pipe.VISION_PROMPT},
            ]}],
        }})

    if not reqs:
        return len(leads), 0, 0

    batches = _anthropic_batch_create(client, reqs)
    ids = [b.id for b in batches]
    print(f"  Batch{'es' if len(ids) > 1 else ''} {', '.join(ids)} — {len(reqs)} images")

    flagged, equipped = _vision_apply_batch_results(client, ids, id_by_custom, dry_run)
    return len(leads), flagged, equipped


def _vision_sync_chunk(leads: list[dict], dry_run: bool) -> tuple[int, int, int]:
    """Vision synchrone (1 appel / lead) — plus lent mais sans attente batch."""
    from datetime import datetime, timezone

    flagged = 0
    equipped = 0
    for i, lead in enumerate(leads):
        if i > 0 and i % 10 == 0:
            print(f"    sync {i}/{len(leads)}…")
        pack = pipe.fetch_ortho(
            lead["latitude"], lead["longitude"], lead["surface_m2"] or 0)
        if pack is None:
            if not dry_run:
                _patch(lead["id"], {
                    "vision_checked_at": datetime.now(timezone.utc).isoformat(),
                })
            continue
        vis = pipe.check_vision_ombriere(pack["image_b64"])
        rec = {"detection": lead["detection"], "score_confiance": lead["score_confiance"]}
        pipe.apply_vision_result(rec, vis, ortho_date=pack.get("ortho_date"))
        if rec.get("vision_flag"):
            flagged += 1
        if rec.get("detection") == "equipe":
            equipped += 1
        if not dry_run:
            _patch(lead["id"], _vision_patch(rec))
        time.sleep(0.25)
    return len(leads), flagged, equipped


def _urgence_vision_query(limit: int) -> list[dict]:
    """Urgences absolues disponibles sans % photo (nouvelles ou re-analyse)."""
    return _get({
        "select": "id,latitude,longitude,surface_m2,detection,score_confiance",
        "flag_urgence": "eq.URGENCE_ABSOLUE",
        "vision_surface_couverte_pct": "is.null",
        "statut": "eq.disponible",
        "order": "valeur_chantier_eur.desc",
        "limit": limit,
    })


def backfill_vision(limit: int, dry_run: bool, chunk: int = 25) -> None:
    """Vision Batch sur toutes les URGENCE_ABSOLUE sans % photo."""
    if not pipe.ANTHROPIC_KEY:
        print("❌ ANTHROPIC_API_KEY absent de .env.local."); sys.exit(1)

    CHUNK = chunk
    done = flagged = equipped = 0
    while True:
        fetch_n = min(CHUNK, limit - done) if limit else CHUNK
        if limit and fetch_n <= 0:
            break
        rows = _urgence_vision_query(fetch_n)
        if not rows:
            break
        n, f, e = _vision_batch_chunk(rows, dry_run)
        done += n
        flagged += f
        equipped += e
        print(
            f"  [{done}] {flagged} ombrières · {equipped} exclus (> {pipe.VISION_COVERAGE_EQUIPE:.0f} % photo)"
        )
        if limit and done >= limit:
            print(f"→ Limite {limit} atteinte.")
            break
    if done == 0:
        print("✅ Aucune URGENCE_ABSOLUE sans % photo à analyser.")
    else:
        print(
            f"✅ Terminé : {done} urgences · {flagged} ombrières suspectées · "
            f"{equipped} hors catalogue (photo > {pipe.VISION_COVERAGE_EQUIPE:.0f} %)"
        )


# ─── Mode 4b : compléter vision_surface_couverte_pct (re-analyse orthophoto) ──
def backfill_vision_pct(limit: int, dry_run: bool, sync: bool = False) -> None:
    """Re-analyse (hors urgences déjà couvertes par --mode vision)."""
    if not pipe.ANTHROPIC_KEY:
        print("❌ ANTHROPIC_API_KEY absent de .env.local."); sys.exit(1)

    CHUNK = 10 if sync else 50
    done = 0
    run_chunk = _vision_sync_chunk if sync else _vision_batch_chunk
    mode_label = "sync" if sync else "batch"
    print(f"  vision_pct via API {mode_label} (non-urgence ou complément)")
    while True:
        fetch_n = min(CHUNK, limit - done) if limit else CHUNK
        if limit and fetch_n <= 0:
            break
        rows = _get({
            "select": "id,latitude,longitude,surface_m2,detection,score_confiance",
            "vision_checked_at": "not.is.null",
            "vision_surface_couverte_pct": "is.null",
            "flag_urgence": "neq.URGENCE_ABSOLUE",
            "statut": "eq.disponible",
            "order": "valeur_chantier_eur.desc",
            "limit": fetch_n,
        })
        if not rows:
            break
        n, _, _ = run_chunk(rows, dry_run)
        done += n
        print(f"  [{done}] lots vision_pct traités")
        if limit and done >= limit:
            break
    if done == 0:
        print("✅ Aucun lead non-urgence à compléter.")
    else:
        print(f"✅ Terminé : {done} leads re-analysés pour le % couverture.")


def main() -> None:
    ap = argparse.ArgumentParser(description="Backfill bypasses 3 & 4 sur la base")
    ap.add_argument("--mode", required=True,
                  choices=["proprietaire", "vision", "vision_pct"])
    ap.add_argument("--limit", type=int, default=0, help="0 = tous")
    ap.add_argument("--dry-run", action="store_true", help="N'écrit rien en base")
    ap.add_argument("--sync", action="store_true",
                    help="vision_pct : appels synchrones (plus lent, pas d'attente batch)")
    ap.add_argument("--chunk-size", type=int, default=25,
                    help="vision : leads par lot (défaut 25, réduire si erreurs SSL)")
    ap.add_argument(
        "--refresh",
        action="store_true",
        help="proprietaire : recalcule même si proprietaire_foncier déjà renseigné",
    )
    args = ap.parse_args()

    if not SUPABASE_URL or not SERVICE_KEY:
        print("❌ NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY manquants.")
        sys.exit(1)

    print(f"[backfill] mode={args.mode} limit={args.limit or '∞'} dry_run={args.dry_run}")
    if args.mode == "proprietaire":
        backfill_proprietaire(args.limit, args.dry_run, refresh=args.refresh)
    elif args.mode == "vision":
        backfill_vision(args.limit, args.dry_run, chunk=args.chunk_size)
    else:
        backfill_vision_pct(args.limit, args.dry_run, sync=args.sync)


if __name__ == "__main__":
    main()

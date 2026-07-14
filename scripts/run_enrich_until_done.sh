#!/usr/bin/env bash
# Backfill enrichissement national par lots — reprend automatiquement si tué.
# Durée indicative : ~34 h pour ~82k leads (3 appels API × 0,5 s / lead).
set -uo pipefail
cd "$(dirname "$0")/.."
PY=.venv/bin/python
LOG=/tmp/enrich_backfill.log

echo "START enrich backfill $(date '+%F %T')" | tee -a "$LOG"

$PY scripts/backfill_enrich.py --estimate-only 2>&1 | tee -a "$LOG"

while true; do
  remaining=$($PY - <<'PY'
import os, requests, solarindex_pipeline as pipe
url=os.environ["NEXT_PUBLIC_SUPABASE_URL"].rstrip("/")+"/rest/v1/leads"
k=os.environ["SUPABASE_SERVICE_ROLE_KEY"]
h={"apikey":k,"Authorization":f"Bearer {k}","Prefer":"count=exact","Range-Unit":"items","Range":"0-0"}
r=requests.get(url,params={"select":"id","adresse":"is.null","detection":"in.(libre,a_verifier)","statut":"neq.vendu"},headers=h,timeout=30)
print(r.headers.get("content-range","0/0").split("/")[-1])
PY
)
  echo "$(date '+%H:%M:%S') — restants: $remaining" | tee -a "$LOG"
  [ "$remaining" = "0" ] && break

  $PY -u scripts/backfill_enrich.py --limit 100 2>&1 | tee -a "$LOG"
  code=${PIPESTATUS[0]}
  [ "$code" -ne 0 ] && echo "ERREUR exit $code, pause 30s…" | tee -a "$LOG" && sleep 30
  sleep 2
done

echo "DONE enrich backfill $(date '+%F %T')" | tee -a "$LOG"

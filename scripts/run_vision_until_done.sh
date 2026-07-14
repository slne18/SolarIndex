#!/usr/bin/env bash
# Lance le backfill vision (bypass 4) par lots de 50, en boucle jusqu'à épuisement.
# Reprise automatique : relancer ce script suffit si le process est tué.
set -uo pipefail
cd "$(dirname "$0")/.."
PY=.venv/bin/python
LOG=/tmp/vision_backfill.log

echo "START vision backfill $(date '+%F %T')" | tee -a "$LOG"

while true; do
  remaining=$($PY - <<'PY'
import os, requests, solarindex_pipeline as pipe
url=os.environ["NEXT_PUBLIC_SUPABASE_URL"].rstrip("/")+"/rest/v1/leads"
k=os.environ["SUPABASE_SERVICE_ROLE_KEY"]
h={"apikey":k,"Authorization":f"Bearer {k}","Prefer":"count=exact","Range-Unit":"items","Range":"0-0"}
r=requests.get(url,params={"select":"id","flag_urgence":"eq.URGENCE_ABSOLUE","detection":"eq.libre","vision_checked_at":"is.null","statut":"neq.vendu"},headers=h,timeout=30)
print(r.headers.get("content-range","0/0").split("/")[-1])
PY
)
  echo "$(date '+%H:%M:%S') — restants: $remaining" | tee -a "$LOG"
  [ "$remaining" = "0" ] && break

  $PY -u scripts/backfill_bypasses.py --mode vision --limit 50 2>&1 | tee -a "$LOG"
  code=${PIPESTATUS[0]}
  [ "$code" -ne 0 ] && echo "ERREUR exit $code, pause 10s…" | tee -a "$LOG" && sleep 10
  sleep 2
done

echo "DONE vision backfill $(date '+%F %T')" | tee -a "$LOG"

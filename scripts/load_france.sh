#!/usr/bin/env bash
# Extraction (rapide) + ingestion directe Supabase pour une liste de départements.
#   bash scripts/load_france.sh 75 13 69 59 31
set -uo pipefail
cd "$(dirname "$0")/.."
PY=.venv/bin/python

ok=0; fail=0
for DEPT in "$@"; do
  CSV="/tmp/leads_${DEPT}.csv"
  echo "═══ Département ${DEPT} ═══"
  if "$PY" solarindex_pipeline.py --dept "$DEPT" --output "$CSV" > "/tmp/pipe_${DEPT}.log" 2>&1; then
    retained=$(grep -oE "[0-9]+ parkings retenus" "/tmp/pipe_${DEPT}.log" | head -1 || echo "?")
    echo "  pipeline OK (${retained})"
    if [ -f "$CSV" ]; then
      DEFAULT_DEPT="$DEPT" node scripts/ingest_direct.mjs "$CSV" && ok=$((ok+1)) || { echo "  ingestion KO"; fail=$((fail+1)); }
    else
      echo "  (aucun CSV produit — 0 parking)"; ok=$((ok+1))
    fi
  else
    echo "  ❌ pipeline KO :"; tail -3 "/tmp/pipe_${DEPT}.log" | sed 's/^/     /'
    fail=$((fail+1))
  fi
  sleep 2
done
echo "──────── Bilan lot : ${ok} OK, ${fail} échecs ────────"

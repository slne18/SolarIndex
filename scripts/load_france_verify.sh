#!/usr/bin/env bash
# Passe de VÉRIFICATION (détection panneaux existants) + ingestion par département.
# Plus lente que load_france.sh : géocodage commune + registre ODRÉ par parking.
#   bash scripts/load_france_verify.sh 48 33 35
set -uo pipefail
cd "$(dirname "$0")/.."
PY=.venv/bin/python

ok=0; fail=0
for DEPT in "$@"; do
  CSV="/tmp/leads_${DEPT}_verify.csv"
  echo "═══ Département ${DEPT} (verify) ═══"
  if "$PY" pipeline/solarindex_pipeline.py --dept "$DEPT" --output "$CSV" --verify > "/tmp/pipe_${DEPT}_v.log" 2>&1; then
    det=$(grep -oE "Détection PV : .*" "/tmp/pipe_${DEPT}_v.log" | head -1 || echo "")
    echo "  pipeline OK — ${det}"
    if [ -f "$CSV" ]; then
      DEFAULT_DEPT="$DEPT" node scripts/ingest_direct.mjs "$CSV" && ok=$((ok+1)) || { echo "  ingestion KO"; fail=$((fail+1)); }
    else
      echo "  (aucun CSV produit — 0 parking)"; ok=$((ok+1))
    fi
  else
    echo "  ❌ pipeline KO :"; tail -3 "/tmp/pipe_${DEPT}_v.log" | sed 's/^/     /'
    fail=$((fail+1))
  fi
  sleep 2
done
echo "──────── Bilan lot (verify) : ${ok} OK, ${fail} échecs ────────"

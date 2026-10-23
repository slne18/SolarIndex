#!/usr/bin/env bash
# ╔══════════════════════════════════════════════════════════════════════════╗
# ║  Run national SolarIndex AVEC bypasses 1/2/5 (+ détection) et ingestion.   ║
# ║  - Bypass 1 : parkings sans tag surface (2e requête Overpass)              ║
# ║  - Bypass 2 : surface cadastrale (contenance IGN) sur les leads enrichis   ║
# ║  - Bypass 5 : dérogations pente + ABF sur les leads enrichis               ║
# ║  (Bypass 3 Pappers / 4 vision : skip auto tant que les clés sont absentes) ║
# ║                                                                            ║
# ║  Reprise sur reprise : un département déjà fait (marqueur) est sauté.       ║
# ║  Usage : bash scripts/load_france_bypasses.sh                              ║
# ║          MAX_ENRICH=100 bash scripts/load_france_bypasses.sh   (défaut 100)║
# ╚══════════════════════════════════════════════════════════════════════════╝
set -uo pipefail
cd "$(dirname "$0")/.."
PY=.venv/bin/python
MAX_ENRICH="${MAX_ENRICH:-100}"

DONE_DIR="/tmp/solarindex_done"
LOG="/tmp/load_france_bypasses.log"
mkdir -p "$DONE_DIR"

DEPTS=(
  01 02 03 04 05 06 07 08 09 10 11 12 13 14 15 16 17 18 19 2A 2B
  21 22 23 24 25 26 27 28 29 30 31 32 33 34 35 36 37 38 39 40
  41 42 43 44 45 46 47 48 49 50 51 52 53 54 55 56 57 58 59 60
  61 62 63 64 65 66 67 68 69 70 71 72 73 74 75 76 77 78 79 80
  81 82 83 84 85 86 87 88 89 90 91 92 93 94 95
  971 972 973 974 976
)

total=${#DEPTS[@]}
i=0; ok=0; fail=0; skip=0
echo "START $(date '+%F %T') — ${total} départements, max_enrich=${MAX_ENRICH}" | tee -a "$LOG"

for DEPT in "${DEPTS[@]}"; do
  i=$((i+1))
  if [ -f "$DONE_DIR/$DEPT" ]; then
    skip=$((skip+1))
    echo "[$i/$total] $DEPT — déjà fait, skip" | tee -a "$LOG"
    continue
  fi
  CSV="/tmp/leads_${DEPT}_bp.csv"
  PLOG="/tmp/pipe_${DEPT}_bp.log"
  echo "[$i/$total] $DEPT — pipeline (enrich+verify)…" | tee -a "$LOG"
  if "$PY" pipeline/solarindex_pipeline.py --dept "$DEPT" --output "$CSV" \
        --enrich --max-enrich "$MAX_ENRICH" --verify > "$PLOG" 2>&1; then
    det=$(grep -oE "Détection PV : .*" "$PLOG" | head -1 || echo "")
    nb=$(grep -oE "parkings retenus.*" "$PLOG" | head -1 || echo "")
    if [ -f "$CSV" ]; then
      if DEFAULT_DEPT="$DEPT" node scripts/ingest_direct.mjs "$CSV" >> "$PLOG" 2>&1; then
        line=$(grep -oE "→ .*leads \| .*" "$PLOG" | tail -1 || echo "")
        touch "$DONE_DIR/$DEPT"; ok=$((ok+1))
        echo "[$i/$total] $DEPT — OK | ${nb} | ${det} | ingest: ${line}" | tee -a "$LOG"
      else
        fail=$((fail+1))
        echo "[$i/$total] $DEPT — INGEST KO" | tee -a "$LOG"; tail -3 "$PLOG" | sed 's/^/     /' | tee -a "$LOG"
      fi
    else
      touch "$DONE_DIR/$DEPT"; ok=$((ok+1))
      echo "[$i/$total] $DEPT — OK (0 parking)" | tee -a "$LOG"
    fi
  else
    fail=$((fail+1))
    echo "[$i/$total] $DEPT — PIPELINE KO" | tee -a "$LOG"; tail -3 "$PLOG" | sed 's/^/     /' | tee -a "$LOG"
  fi
  sleep 1
done

echo "DONE $(date '+%F %T') — ok:${ok} fail:${fail} skip:${skip}/${total}" | tee -a "$LOG"
